import React, {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import { css } from 'styled-components/macro';
import { useNavigate } from 'react-router-dom';
import Basemap from '@arcgis/core/Basemap';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import Viewpoint from '@arcgis/core/Viewpoint';
// components
import {
  AccordionList,
  AccordionItem,
} from 'components/shared/AccordionMapHighlight';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import {
  keyMetricsStyles,
  keyMetricStyles,
  keyMetricNumberStyles,
  keyMetricLabelStyles,
} from 'components/shared/KeyMetrics';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import Map from 'components/shared/Map';
import MapLoadingSpinner from 'components/shared/MapLoadingSpinner';
import MapErrorBoundary from 'components/shared/ErrorBoundary.MapErrorBoundary';
import Switch from 'components/shared/Switch';
import ViewOnMapButton from 'components/shared/ViewOnMapButton';
import WaterbodyInfo from 'components/shared/WaterbodyInfo';
import WaterbodyList from 'components/shared/WaterbodyList';
// styled components
import { errorBoxStyles, infoBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import {
  LocationSearchContext,
  LocationSearchProvider,
} from 'contexts/locationSearch';
import {
  useReportStatusMappingContext,
  useServicesContext,
} from 'contexts/LookupFiles';
import {
  useMapHighlightState,
  MapHighlightProvider,
} from 'contexts/MapHighlight';
import { StateTribalTabsContext } from 'contexts/StateTribalTabs';
// helpers
import { fetchCheck } from 'utils/fetchUtils';
import {
  useMonitoringLocations,
  useSharedLayers,
  useWaterbodyHighlight,
} from 'utils/hooks';
import {
  createWaterbodySymbol,
  createUniqueValueInfos,
  getPopupTitle,
  getPopupContent,
} from 'utils/mapFunctions';
import { browserIsCompatibleWithArcGIS, parseAttributes } from 'utils/utils';
// config
import { monitoringClusterSettings } from 'components/shared/LocationMap';
// errors
import {
  esriMapLoadingFailure,
  huc12SummaryError,
  status303dError,
  status303dShortError,
  tribalBoundaryErrorMessage,
  zeroAssessedWaterbodies,
} from 'config/errorMessages';
// styles
import { colors } from 'styles/index.js';
import { tabsStyles } from 'components/shared/ContentTabs';

const mapPadding = 20;

const accordionContentStyles = css`
  padding: 0.4375em 0.875em 0.875em;
`;

const buttonStyles = css`
  margin-bottom: 0;
  font-size: 0.9375em;
  &.active {
    background-color: #0071bc !important;
  }
`;

const containerStyles = css`
  display: flex;
  position: relative;
  border: 1px solid #aebac3;
  background-color: #fff;
  z-index: 1;
`;

const inputStyles = css`
  display: flex;
  justify-content: flex-end;
  width: 100%;
  margin-bottom: 0.75em;
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles}
  margin-bottom: 0.75em;
`;

const modifiedTabStyles = (height) => {
  return css`
    ${tabsStyles}
    height: ${height}px;
    width: 100%;
    overflow: auto;
  `;
};

const mapFooterStyles = css`
  width: 100%;
  /* match ESRI map footer text */
  padding: 3px 5px;
  border: 1px solid #aebac3;
  border-top: none;
  font-size: 0.75em;
  background-color: whitesmoke;
`;

const mapFooterMessageStyles = css`
  margin-bottom: 5px;
`;

const mapFooterStatusStyles = css`
  display: flex;
  align-items: center;

  svg {
    margin: 0 -0.875rem;
    height: 0.6875rem;
  }
`;

const switchContainerStyles = css`
  margin-top: 0.5em;
`;

type Layout = 'narrow' | 'wide' | 'fullscreen';

type Props = {
  activeState: Object,
  layout: Layout,
  windowHeight: number,
  windowWidth: number,
};

function TribalMapList({
  activeState,
  layout,
  windowHeight,
  windowWidth,
}: Props) {
  const { currentReportingCycle, organizationData } = useContext(
    StateTribalTabsContext,
  );
  const {
    areasLayer,
    errorMessage,
    linesLayer,
    mapView,
    setMonitoringGroups,
    monitoringLocations,
    setMonitoringLocations,
    monitoringLocationsLayer,
    pointsLayer,
    visibleLayers,
    setVisibleLayers,
    waterbodyLayer,
  } = useContext(LocationSearchContext);

  const [waterbodiesDisplayed, setWaterbodiesDisplayed] = useState(true);
  const [monitoringLocationsDisplayed, setMonitoringLocationsDisplayed] =
    useState(true);

  const reportStatusMapping = useReportStatusMappingContext();
  const services = useServicesContext();

  // switch the base map to
  useEffect(() => {
    if (!mapView) return;

    const newBasemap = new Basemap({
      portalItem: {
        id: '1536abe5e5504e5db380ccfaa9b6fd8d',
      },
    });
    mapView.map.basemap = newBasemap;

    return function cleanup() {
      mapView.map.basemap = 'gray-vector';
    };
  }, [mapView]);

  // get gis data for selected tribe
  const [tribalBoundaryError, setTribalBoundaryError] = useState(false);

  // set the filter on each waterbody layer
  const [filter, setFilter] = useState('');
  useEffect(() => {
    if (!activeState?.attainsId || !pointsLayer || !linesLayer || !areasLayer)
      return;

    // change the where clause of the feature layers
    const filter = `organizationid = '${activeState.attainsId}'`;
    if (filter) {
      pointsLayer.definitionExpression = filter;
      linesLayer.definitionExpression = filter;
      areasLayer.definitionExpression = filter;
    }

    setFilter(filter);
    setTribalBoundaryError(false);
    setWaterbodies({ status: 'pending', data: [] });
  }, [activeState, areasLayer, linesLayer, pointsLayer]);

  // get the full list of waterbodies across the points, lines, and areas layers
  const [waterbodies, setWaterbodies] = useState({ status: 'idle', data: [] });
  useEffect(() => {
    if (!filter || !mapView || !pointsLayer || !linesLayer || !areasLayer) {
      return;
    }

    function handelQueryError(error) {
      console.error(error);
      setWaterbodies({ status: 'failure', data: [] });
    }

    const features = [];
    // get the waterbodies from the points layer
    const pointsQuery = pointsLayer.createQuery();
    pointsQuery.outSpatialReference = { wkid: 3857 };
    pointsLayer
      .queryFeatures(pointsQuery)
      .then((pointFeatures) => {
        features.push(...pointFeatures.features);

        // get the waterbodies from the lines layer
        const linesQuery = linesLayer.createQuery();
        linesQuery.outSpatialReference = { wkid: 3857 };
        linesLayer
          .queryFeatures(linesQuery)
          .then((lineFeatures) => {
            features.push(...lineFeatures.features);

            // get the waterbodies from the areas layer
            const areasQuery = areasLayer.createQuery();
            areasQuery.outSpatialReference = { wkid: 3857 };
            areasLayer
              .queryFeatures(areasQuery)
              .then((areaFeatures) => {
                features.push(...areaFeatures.features);
                setWaterbodies({ status: 'success', data: features });
              })
              .catch(handelQueryError);
          })
          .catch(handelQueryError);
      })
      .catch(handelQueryError);
  }, [pointsLayer, linesLayer, areasLayer, mapView, filter]);

  // get the wqx monitoring locations associated with the selected tribe
  useEffect(() => {
    if (!activeState?.wqxIds) return;

    const url =
      `${services.data.waterQualityPortal.monitoringLocation}` +
      `search?mimeType=geojson&zip=no&organization=${activeState.wqxIds.join(
        '&organization=',
      )}`;

    fetchCheck(url)
      .then((res) => {
        setMonitoringLocations({
          status: 'success',
          data: res,
        });
        setMonitoringGroups(null);
      })
      .catch((err) => {
        console.error(err);
        setMonitoringLocations({ status: 'failure', data: {} });
      });
  }, [activeState, services, setMonitoringGroups, setMonitoringLocations]);

  // scroll to the tribe map when the user switches to full screen mode
  useEffect(() => {
    if (layout === 'fullscreen') {
      const mapContent = document.querySelector(`[aria-label="Tribal Map"]`);

      if (mapContent) {
        let pos = mapContent.getBoundingClientRect();
        window.scrollTo(pos.left + window.scrollX, pos.top + window.scrollY);
      }
    }
  }, [layout, windowHeight, windowWidth]);

  // Makes the view on map button work for the state page
  // (i.e. switches and scrolls to the map when the selected graphic changes)
  const [displayMode, setDisplayMode] = useState('map');
  const { selectedGraphic } = useMapHighlightState();
  useEffect(() => {
    if (!selectedGraphic) return;

    setDisplayMode('map');
  }, [selectedGraphic]);

  // Updates the visible layers. This function also takes into account whether
  // or not the underlying webservices failed.
  const updateVisibleLayers = useCallback(
    ({ key = null, value = null, useCurrentValue = false }) => {
      const layers = {};

      if (waterbodyLayer) {
        layers.waterbodyLayer =
          !waterbodyLayer || useCurrentValue
            ? visibleLayers.waterbodyLayer
            : waterbodiesDisplayed;
      }

      if (monitoringLocations.status !== 'failure') {
        layers.monitoringLocationsLayer =
          !monitoringLocationsLayer || useCurrentValue
            ? visibleLayers.monitoringLocationsLayer
            : monitoringLocationsDisplayed;
      }

      if (key && layers.hasOwnProperty(key)) {
        layers[key] = value;
      }

      // set the visible layers if something changed
      if (JSON.stringify(visibleLayers) !== JSON.stringify(layers)) {
        setVisibleLayers(layers);
      }
    },
    [
      monitoringLocations,
      waterbodyLayer,
      monitoringLocationsLayer,
      waterbodiesDisplayed,
      monitoringLocationsDisplayed,
      visibleLayers,
      setVisibleLayers,
    ],
  );

  // calculate height of div holding the view mode buttons
  const [viewModeHeight, setViewModeHeight] = useState(0);
  const viewModeRef = useCallback((node) => {
    if (!node) return;
    setViewModeHeight(node.getBoundingClientRect().height);
  }, []);

  // calculate height of div holding the layer toggles
  const [layerTogglesHeight, setLayerTogglesHeight] = useState(0);
  const layerTogglesRef = useCallback((node) => {
    if (!node) return;
    setLayerTogglesHeight(node.getBoundingClientRect().height);
  }, []);

  // calculate height of div holding the footer content
  const [footerHeight, setFooterHeight] = useState(0);
  const footerRef = useCallback((node) => {
    if (!node) return;
    setFooterHeight(node.getBoundingClientRect().height);
  }, []);

  // track Esri map load errors for older browsers and devices that do not support ArcGIS 4.x
  if (!browserIsCompatibleWithArcGIS()) {
    return <div css={errorBoxStyles}>{esriMapLoadingFailure}</div>;
  }

  const mapListHeight =
    windowHeight - viewModeHeight - layerTogglesHeight - 3 * mapPadding;

  return (
    <div>
      <div css={inputStyles} ref={viewModeRef}>
        <div className="btn-group" role="group">
          <button
            css={buttonStyles}
            type="button"
            className={`btn btn-secondary${
              displayMode === 'map' ? ' active' : ''
            }`}
            onClick={(_ev) => setDisplayMode('map')}
          >
            <i className="fas fa-map-marked-alt" aria-hidden="true" />
            &nbsp;&nbsp;Map
          </button>
          <button
            css={buttonStyles}
            type="button"
            className={`btn btn-secondary${
              displayMode === 'list' ? ' active' : ''
            }`}
            onClick={(_ev) => setDisplayMode('list')}
          >
            <i className="fas fa-list" aria-hidden="true" />
            &nbsp;&nbsp;List
          </button>
          <button
            css={buttonStyles}
            type="button"
            className={`btn btn-secondary${
              displayMode === 'none' ? ' active' : ''
            }`}
            onClick={(_ev) => setDisplayMode('none')}
          >
            <i className="far fa-eye-slash" aria-hidden="true" />
            &nbsp;&nbsp;Hidden
          </button>
        </div>
      </div>

      {tribalBoundaryError && (
        <div css={modifiedErrorBoxStyles}>
          <p>{tribalBoundaryErrorMessage}</p>
        </div>
      )}

      {displayMode !== 'none' && (
        <div css={keyMetricsStyles} ref={layerTogglesRef}>
          <div css={keyMetricStyles}>
            {waterbodies.status === 'pending' && <LoadingSpinner />}
            {(waterbodies.status === 'success' ||
              waterbodies.status === 'failure') && (
              <Fragment>
                <span css={keyMetricNumberStyles}>
                  {Boolean(waterbodies.data.length) &&
                  waterbodies.status === 'success'
                    ? waterbodies.data.length.toLocaleString()
                    : 'N/A'}
                </span>
                <p css={keyMetricLabelStyles}>Waterbodies</p>
                <div css={switchContainerStyles}>
                  <Switch
                    checked={
                      Boolean(waterbodies.data.length) && waterbodiesDisplayed
                    }
                    onChange={(_checked) => {
                      if (!waterbodyLayer) return;
                      setWaterbodiesDisplayed(!waterbodiesDisplayed);
                      updateVisibleLayers({
                        key: 'waterbodyLayer',
                        value: !waterbodiesDisplayed,
                      });
                    }}
                    disabled={!Boolean(waterbodies.data.length)}
                    ariaLabel="Waterbodies"
                  />
                </div>
              </Fragment>
            )}
          </div>

          <div css={keyMetricStyles}>
            {!monitoringLocationsLayer ||
            monitoringLocations.status === 'fetching' ? (
              <LoadingSpinner />
            ) : (
              <>
                <span css={keyMetricNumberStyles}>
                  {Boolean(monitoringLocations.data?.features?.length)
                    ? monitoringLocations.data.features.length
                    : 'N/A'}
                </span>
                <p css={keyMetricLabelStyles}>Monitoring Locations</p>
                <div css={switchContainerStyles}>
                  <Switch
                    checked={
                      Boolean(monitoringLocations.data?.features?.length) &&
                      monitoringLocationsDisplayed
                    }
                    onChange={(_checked) => {
                      if (!monitoringLocationsLayer) return;
                      setMonitoringLocationsDisplayed(
                        !monitoringLocationsDisplayed,
                      );
                      setMonitoringLocationsDisplayed(
                        !monitoringLocationsDisplayed,
                      );
                      setVisibleLayers({
                        monitoringLocationsLayer: !monitoringLocationsDisplayed,
                        // NOTE: no change for the following layers:
                        waterbodyLayer: waterbodiesDisplayed,
                      });
                    }}
                    disabled={
                      !Boolean(monitoringLocations.data?.features?.length)
                    }
                    ariaLabel="Monitoring Stations"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {errorMessage && (
        <div css={modifiedErrorBoxStyles}>
          <p>{errorMessage}</p>
        </div>
      )}

      <div
        aria-label="Tribal Map"
        css={containerStyles}
        style={
          layout === 'fullscreen'
            ? {
                height: windowHeight - footerHeight,
                width: windowWidth,
              }
            : {
                height: mapListHeight - footerHeight,
                width: '100%',
                display: displayMode === 'map' ? 'block' : 'none',
              }
        }
      >
        <TribalMap
          activeState={activeState}
          filter={filter}
          setTribalBoundaryError={setTribalBoundaryError}
        />
      </div>
      {displayMode === 'map' && (
        <div ref={footerRef}>
          <div
            css={mapFooterStyles}
            style={{ width: layout === 'fullscreen' ? windowWidth : '100%' }}
          >
            {reportStatusMapping.status === 'failure' && (
              <div css={mapFooterMessageStyles}>{status303dError}</div>
            )}
            <div css={mapFooterStatusStyles}>
              <strong>
                <GlossaryTerm term="303(d) listed impaired waters (Category 5)">
                  303(d) List Status
                </GlossaryTerm>{' '}
                / Year Last Reported:
              </strong>
              &nbsp;&nbsp;
              {organizationData.status === 'fetching' && <LoadingSpinner />}
              {organizationData.status === 'failure' && (
                <>{status303dShortError}</>
              )}
              {organizationData.status === 'success' && (
                <>
                  {reportStatusMapping.status === 'fetching' && (
                    <LoadingSpinner />
                  )}
                  {reportStatusMapping.status === 'failure' && (
                    <>{organizationData.data.reportStatusCode}</>
                  )}
                  {reportStatusMapping.status === 'success' && (
                    <>
                      {reportStatusMapping.data.hasOwnProperty(
                        organizationData.data.reportStatusCode,
                      )
                        ? reportStatusMapping.data[
                            organizationData.data.reportStatusCode
                          ]
                        : organizationData.data.reportStatusCode}
                    </>
                  )}
                </>
              )}
              <> / </>
              {currentReportingCycle.status === 'fetching' && (
                <LoadingSpinner />
              )}
              {currentReportingCycle.status === 'success' && (
                <>{currentReportingCycle.reportingCycle}</>
              )}
            </div>
          </div>
        </div>
      )}

      {displayMode === 'list' && (
        <div css={modifiedTabStyles(mapListHeight)}>
          <Tabs>
            <TabList>
              <Tab>Waterbodies</Tab>
              <Tab>MonitoringLocations</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                {waterbodies.status === 'pending' && <LoadingSpinner />}
                {waterbodies.status === 'failure' && (
                  <div css={errorBoxStyles}>{huc12SummaryError}</div>
                )}
                {waterbodies.status === 'success' && (
                  <Fragment>
                    {waterbodies.data.length > 0 ? (
                      <WaterbodyList
                        waterbodies={waterbodies.data}
                        title="Waterbodies"
                      />
                    ) : (
                      <div css={infoBoxStyles}>
                        <p>
                          {zeroAssessedWaterbodies(
                            activeState.name,
                            'tribal area',
                          )}
                        </p>
                      </div>
                    )}
                  </Fragment>
                )}
              </TabPanel>
              <TabPanel>
                <MonitoringTab activeState={activeState} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </div>
      )}
    </div>
  );
}

type TribalMapProps = {
  activeState: Object,
  filter: string,
  setTribalBoundaryError: Function,
};

function TribalMap({
  activeState,
  filter,
  setTribalBoundaryError,
}: TribalMapProps) {
  const {
    areasLayer,
    setAreasLayer,
    homeWidget,
    linesLayer,
    setLinesLayer,
    mapView,
    setMonitoringLocationsLayer,
    pointsLayer,
    setPointsLayer,
    setVisibleLayers,
    waterbodyLayer,
    setWaterbodyLayer,
    setUpstreamLayer,
  } = useContext(LocationSearchContext);

  const navigate = useNavigate();
  const services = useServicesContext();
  useWaterbodyHighlight();

  // updates the features on the monitoringStationsLayer
  // and the monitoring groups
  useMonitoringLocations();

  const getSharedLayers = useSharedLayers();
  const [layers, setLayers] = useState(null);

  // reset the home widget
  const [homeWidgetSet, setHomeWidgetSet] = useState(false);
  useEffect(() => {
    setHomeWidgetSet(false);
  }, [filter]);

  // Initially sets up the layers
  const [layersInitialized, setLayersInitialized] = useState(false);
  const [selectedTribeLayer, setSelectedTribeLayer] = useState(null);
  useEffect(() => {
    if (!activeState?.attainsId || !getSharedLayers || layersInitialized) {
      return;
    }

    const popupTemplate = {
      outFields: ['*'],
      title: (feature) => getPopupTitle(feature.graphic.attributes),
      content: (feature) =>
        getPopupContent({ feature: feature.graphic, navigate }),
    };

    // Build the feature layers that will make up the waterbody layer
    const pointsRenderer = {
      type: 'unique-value',
      field: 'overallstatus',
      fieldDelimiter: ', ',
      defaultSymbol: createWaterbodySymbol({
        condition: 'unassessed',
        selected: false,
        geometryType: 'point',
      }),
      uniqueValueInfos: createUniqueValueInfos('point'),
    };
    const pointsLayer = new FeatureLayer({
      url: services.data.waterbodyService.points,
      definitionExpression: `organizationid = '${activeState.attainsId}'`,
      outFields: ['*'],
      renderer: pointsRenderer,
      popupTemplate,
    });
    setPointsLayer(pointsLayer);

    const linesRenderer = {
      type: 'unique-value',
      field: 'overallstatus',
      fieldDelimiter: ', ',
      defaultSymbol: createWaterbodySymbol({
        condition: 'unassessed',
        selected: false,
        geometryType: 'polyline',
      }),
      uniqueValueInfos: createUniqueValueInfos('polyline'),
    };
    const linesLayer = new FeatureLayer({
      url: services.data.waterbodyService.lines,
      definitionExpression: `organizationid = '${activeState.attainsId}'`,
      outFields: ['*'],
      renderer: linesRenderer,
      popupTemplate,
    });
    setLinesLayer(linesLayer);

    const areasRenderer = {
      type: 'unique-value',
      field: 'overallstatus',
      fieldDelimiter: ', ',
      defaultSymbol: createWaterbodySymbol({
        condition: 'unassessed',
        selected: false,
        geometryType: 'polygon',
      }),
      uniqueValueInfos: createUniqueValueInfos('polygon'),
    };
    const areasLayer = new FeatureLayer({
      url: services.data.waterbodyService.areas,
      definitionExpression: `organizationid = '${activeState.attainsId}'`,
      outFields: ['*'],
      renderer: areasRenderer,
      popupTemplate,
    });
    setAreasLayer(areasLayer);

    // Make the waterbody layer into a single layer
    const waterbodyLayer = new GroupLayer({
      id: 'waterbodyLayer',
      title: 'Waterbodies',
      listMode: 'hide-children',
      visible: true,
      legendEnabled: false,
    });
    waterbodyLayer.addMany([areasLayer, linesLayer, pointsLayer]);
    setWaterbodyLayer(waterbodyLayer);

    const selectedTribeLayer = new GraphicsLayer({
      id: 'selectedTribeLayer',
      title: 'Selected Tribe',
      listMode: 'hide',
      visible: 'true',
      legendEnabled: false,
    });
    setSelectedTribeLayer(selectedTribeLayer);

    const monitoringLocationsLayer = new FeatureLayer({
      id: 'monitoringLocationsLayer',
      title: 'Past Water Conditions',
      listMode: 'hide-children',
      visible: true,
      legendEnabled: true,
      fields: [
        { name: 'OBJECTID', type: 'oid' },
        { name: 'monitoringType', type: 'string' },
        { name: 'siteId', type: 'string' },
        { name: 'orgId', type: 'string' },
        { name: 'orgName', type: 'string' },
        { name: 'locationLongitude', type: 'double' },
        { name: 'locationLatitude', type: 'double' },
        { name: 'locationName', type: 'string' },
        { name: 'locationType', type: 'string' },
        { name: 'locationUrl', type: 'string' },
        { name: 'stationProviderName', type: 'string' },
        { name: 'stationTotalSamples', type: 'integer' },
        { name: 'stationTotalsByGroup', type: 'string' },
        { name: 'stationTotalMeasurements', type: 'integer' },
        { name: 'timeframe', type: 'string' },
        { name: 'uniqueId', type: 'string' },
      ],
      objectIdField: 'OBJECTID',
      outFields: ['*'],
      // NOTE: initial graphic below will be replaced with UGSG streamgages
      source: [
        new Graphic({
          geometry: { type: 'point', longitude: -98.5795, latitude: 39.8283 },
          attributes: { OBJECTID: 1 },
        }),
      ],
      renderer: {
        type: 'simple',
        symbol: {
          type: 'simple-marker',
          style: 'circle',
          color: colors.lightPurple(0.5),
          outline: {
            width: 0.75,
          },
        },
      },
      featureReduction: monitoringClusterSettings,
      popupTemplate: {
        outFields: ['*'],
        title: (feature) => getPopupTitle(feature.graphic.attributes),
        content: (feature) => {
          // Parse non-scalar variables
          const structuredProps = ['stationTotalsByGroup', 'timeframe'];
          feature.graphic.attributes = parseAttributes(
            structuredProps,
            feature.graphic.attributes,
          );
          return getPopupContent({
            feature: feature.graphic,
            services,
            navigate,
          });
        },
      },
    });
    setMonitoringLocationsLayer(monitoringLocationsLayer);

    const upstreamLayer = new GraphicsLayer({
      id: 'upstreamWatershed',
      title: 'Upstream Watershed',
      listMode: 'hide',
      visible: false,
    });

    setUpstreamLayer(upstreamLayer);

    // add the shared layers to the map
    const sharedLayers = getSharedLayers();

    setLayers([
      ...sharedLayers,
      upstreamLayer,
      selectedTribeLayer,
      monitoringLocationsLayer,
      waterbodyLayer,
    ]);

    setVisibleLayers({ waterbodyLayer: true, monitoringLocationsLayer: true });

    setLayersInitialized(true);
  }, [
    activeState,
    getSharedLayers,
    layersInitialized,
    navigate,
    services,
    setAreasLayer,
    setLinesLayer,
    setMonitoringLocationsLayer,
    setPointsLayer,
    setUpstreamLayer,
    setVisibleLayers,
    setWaterbodyLayer,
  ]);

  // get the tribalLayer from the mapView
  const [tribalLayer, setTribalLayer] = useState(null);
  useEffect(() => {
    if (!mapView) return;

    // find the tribal layer
    const tempTribalLayer = mapView.map.layers.find(
      (layer) => layer.id === 'tribalLayer',
    );
    setTribalLayer(tempTribalLayer);
  }, [mapView]);

  // get gis data for selected tribe
  useEffect(() => {
    if (!selectedTribeLayer || !tribalLayer) return;

    selectedTribeLayer.graphics.removeAll();

    // query the tribal layer service to get those associated with
    // the selected tribe
    const requests = [];
    tribalLayer.layers.forEach((subLayer) => {
      // build the query
      const query = subLayer.createQuery();
      query.where = `EPA_ID = ${activeState.epaId}`;
      query.returnGeometry = true;
      query.outFields = subLayer.outFields;
      query.outSpatialReference = { wkid: 3857 };

      const request = subLayer.queryFeatures(query);
      requests.push(request);
    });

    // add the selected tribe graphic to the map
    Promise.all(requests)
      .then((responses) => {
        const graphics = [];
        responses.forEach((response, index) => {
          const layer = tribalLayer.layers.items[index];
          const symbol = layer.renderer.symbol;

          response.features.forEach((feature) => {
            const graphic = new Graphic({
              attributes: feature.attributes,
              geometry: feature.geometry,
              symbol:
                response.geometryType !== 'polygon'
                  ? symbol
                  : {
                      type: 'simple-fill', // autocasts as new SimpleFillSymbol()
                      color: [204, 255, 255, 0.5],
                      outline: {
                        color: [0, 0, 0],
                        width: 2,
                        style: 'solid',
                      },
                    },
            });

            graphics.push(graphic);
          });
        });

        selectedTribeLayer.graphics.addMany(graphics);
      })
      .catch((error) => {
        console.error(error);
        setTribalBoundaryError(true);
      });
  }, [
    activeState,
    mapView,
    selectedTribeLayer,
    setTribalBoundaryError,
    tribalLayer,
  ]);

  // zoom to graphics on the map, and update the home widget's extent
  const [mapLoading, setMapLoading] = useState(true);
  useEffect(() => {
    if (
      !filter ||
      !mapView ||
      !pointsLayer ||
      !linesLayer ||
      !areasLayer ||
      !selectedTribeLayer ||
      !homeWidget
    ) {
      return;
    }

    // zoom and set the home widget viewpoint
    let fullExtent = null;
    // get the points layer extent
    pointsLayer.queryExtent().then((pointsExtent) => {
      // set the extent if 1 or more features
      if (pointsExtent.count > 0) fullExtent = pointsExtent.extent;

      // get the lines layer extent
      linesLayer.queryExtent().then((linesExtent) => {
        // set the extent or union the extent if 1 or more features
        if (linesExtent.count > 0) {
          if (fullExtent) fullExtent.union(linesExtent.extent);
          else fullExtent = linesExtent.extent;
        }

        // get the areas layer extent
        areasLayer.queryExtent().then((areasExtent) => {
          // set the extent or union the extent if 1 or more features
          if (areasExtent.count > 0) {
            if (fullExtent) fullExtent.union(areasExtent.extent);
            else fullExtent = areasExtent.extent;
          }

          // get the extent of the selected tribes layer graphics
          selectedTribeLayer.graphics.forEach((graphic) => {
            if (fullExtent) fullExtent.union(graphic.geometry.extent);
            else fullExtent = graphic.geometry.extent;
          });

          // if there is an extent then zoom to it and set the home widget
          if (fullExtent) {
            let zoomParams = fullExtent;
            let homeParams = { targetGeometry: fullExtent };

            if (pointsExtent.count === 1) {
              zoomParams = { target: fullExtent, zoom: 15 };
              homeParams = {
                targetGeometry: fullExtent,
                scale: 18056, // same as zoom 15, viewpoint only takes scale
              };
            }

            mapView.goTo(zoomParams).then(() => {
              setMapLoading(false);
            });

            // only set the home widget if the user selects a different state
            if (!homeWidgetSet) {
              homeWidget.viewpoint = new Viewpoint(homeParams);
              setHomeWidgetSet(true);
            }
          } else {
            setMapLoading(false);
          }
        });
      });
    });
  }, [
    areasLayer,
    filter,
    homeWidget,
    homeWidgetSet,
    linesLayer,
    mapView,
    pointsLayer,
    selectedTribeLayer,
    waterbodyLayer,
  ]);

  return (
    <Fragment>
      <Map layers={layers} />
      {mapView && mapLoading && <MapLoadingSpinner />}
    </Fragment>
  );
}

type MonitoringTabProps = {
  activeState: Object,
};

function MonitoringTab({ activeState }: MonitoringTabProps) {
  const { monitoringGroups, monitoringLocationsLayer } = useContext(
    LocationSearchContext,
  );
  const services = useServicesContext();

  // get the monitoring locations from the monitoringGroups variable
  const [normalizedMonitoringLocations, setNormalizedMonitoringLocations] =
    useState([]);
  useEffect(() => {
    if (!monitoringGroups) return;
    setNormalizedMonitoringLocations([...monitoringGroups.All.stations]);
    monitoringLocationsLayer.definitionExpression = '';
  }, [monitoringGroups, monitoringLocationsLayer]);

  // sort the monitoring locations
  const [monitoringLocationsSortedBy, setMonitoringLocationsSortedBy] =
    useState('locationName');
  const sortedMonitoringAndSensors = [...normalizedMonitoringLocations].sort(
    (a, b) => {
      if (monitoringLocationsSortedBy === 'stationTotalMeasurements') {
        return (
          (b.stationTotalMeasurements || 0) - (a.stationTotalMeasurements || 0)
        );
      }

      if (monitoringLocationsSortedBy === 'siteId') {
        return a.siteId.localeCompare(b.siteId);
      }

      return a[monitoringLocationsSortedBy].localeCompare(
        b[monitoringLocationsSortedBy],
      );
    },
  );

  const [expandedRows, setExpandedRows] = useState([]);

  return (
    <AccordionList
      title={
        <>
          <strong>{sortedMonitoringAndSensors.length}</strong> locations with
          data in the <em>{activeState.label}</em> watershed.
        </>
      }
      onSortChange={({ value }) => setMonitoringLocationsSortedBy(value)}
      onExpandCollapse={(allExpanded) => {
        if (allExpanded) {
          setExpandedRows([...Array(sortedMonitoringAndSensors.length).keys()]);
        } else {
          setExpandedRows([]);
        }
      }}
      sortOptions={[
        {
          label: 'Location Name',
          value: 'locationName',
        },
        {
          label: 'Organization Name',
          value: 'orgName',
        },
        {
          label: 'Water Type',
          value: 'locationType',
        },
        {
          label: 'Monitoring Measurements',
          value: 'stationTotalMeasurements',
        },
      ]}
    >
      {sortedMonitoringAndSensors.map((item, index) => {
        const feature = {
          geometry: {
            type: 'point',
            longitude: item.locationLongitude,
            latitude: item.locationLatitude,
          },
          attributes: item,
        };

        return (
          <AccordionItem
            key={index}
            index={index}
            title={<strong>{item.locationName || 'Unknown'}</strong>}
            subTitle={
              <>
                <em>Monitoring Type:</em>&nbsp;&nbsp;
                {item.monitoringType}
                <br />
                <em>Organization Name:</em>&nbsp;&nbsp;
                {item.orgName}
                <br />
                <em>Water Type:</em>&nbsp;&nbsp;
                {item.locationType}
                {item.monitoringType === 'Past Water Conditions' && (
                  <>
                    <br />
                    <em>Monitoring Measurements:</em>
                    &nbsp;&nbsp;
                    {item.stationTotalMeasurements}
                  </>
                )}
              </>
            }
            feature={feature}
            idKey="siteId"
            allExpanded={expandedRows.includes(index)}
            onChange={() => {
              // add the item to the expandedRows array so the accordion item
              // will stay expanded when the user scrolls or highlights map items
              if (expandedRows.includes(index)) {
                setExpandedRows(expandedRows.filter((item) => item !== index));
              } else setExpandedRows(expandedRows.concat(index));
            }}
          >
            <div css={accordionContentStyles}>
              <WaterbodyInfo
                type="Past Water Conditions"
                feature={feature}
                services={services}
              />
              <ViewOnMapButton feature={feature} />
            </div>
          </AccordionItem>
        );
      })}
    </AccordionList>
  );
}

export default function TribalMapListContainer({ ...props }: Props) {
  return (
    <MapHighlightProvider>
      <MapErrorBoundary>
        <LocationSearchProvider>
          <TribalMapList {...props} />
        </LocationSearchProvider>
      </MapErrorBoundary>
    </MapHighlightProvider>
  );
}
