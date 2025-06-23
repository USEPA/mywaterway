/** @jsxImportSource @emotion/react */

import { Fragment, useCallback, useContext, useEffect, useState } from 'react';
import { useWindowSize } from '@reach/window-size';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import { css } from '@emotion/react';
import { useNavigate } from 'react-router';
import Basemap from '@arcgis/core/Basemap';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
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
import CharacteristicsSelect from 'components/shared/CharacteristicsSelect';
import {
  keyMetricsStyles,
  keyMetricStyles,
  keyMetricNumberStyles,
  keyMetricLabelStyles,
} from 'components/shared/KeyMetrics';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import Map from 'components/shared/Map';
import MapErrorBoundary from 'components/shared/ErrorBoundary.MapErrorBoundary';
import MapLoadingSpinner from 'components/shared/MapLoadingSpinner';
import MapVisibilityButton from 'components/shared/MapVisibilityButton';
import PastWaterConditionsFilters from 'components/shared/PastWaterConditionsFilters';
import Switch from 'components/shared/Switch';
import ViewOnMapButton from 'components/shared/ViewOnMapButton';
import WaterbodyInfo from 'components/shared/WaterbodyInfo';
import WaterbodyList from 'components/shared/WaterbodyList';
// styled components
import { largeTabStyles } from 'components/shared/ContentTabs.LargeTab.js';
import { errorBoxStyles, infoBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import { useConfigFilesState } from 'contexts/ConfigFiles';
import {
  LocationSearchContext,
  LocationSearchProvider,
} from 'contexts/locationSearch';
import { LayersProvider, useLayers } from 'contexts/Layers';
import {
  useMapHighlightState,
  MapHighlightProvider,
} from 'contexts/MapHighlight';
import { StateTribalTabsContext } from 'contexts/StateTribalTabs';
// helpers
import {
  useCyanWaterbodiesLayers,
  useDischargersLayers,
  useMonitoringLocations,
  useMonitoringLocationsLayers,
  useSharedLayers,
  useStreamgageLayers,
  useWaterbodyHighlight,
} from 'utils/hooks';
import {
  basemapFromPortalItem,
  createWaterbodySymbol,
  createUniqueValueInfos,
  getPopupTitle,
  getPopupContent,
} from 'utils/mapFunctions';
import {
  browserIsCompatibleWithArcGIS,
  countOrNotAvailable,
} from 'utils/utils';
// errors
import {
  esriMapLoadingFailure,
  huc12SummaryError,
  tribalBoundaryErrorMessage,
  yearLastReportedShortError,
  zeroAssessedWaterbodies,
} from 'config/errorMessages';
// styles
import { tabsStyles } from 'components/shared/ContentTabs';
// types
import type { ReactNode } from 'react';
import type { Option } from 'types';

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
`;

const inputStyles = (smallScreen: boolean) => css`
  display: flex;
  justify-content: flex-end;
  width: 100%;
  margin-bottom: ${smallScreen ? 0 : '0.75em'};
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
  border-top: 1px solid #aebac3;
  font-size: 0.75em;
  background-color: whitesmoke;
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

type Props = {
  activeState: Object;
  windowHeight: number;
};

function TribalMapList({ activeState, windowHeight }: Props) {
  const { currentReportingCycle } = useContext(StateTribalTabsContext);
  const { errorMessage, mapView } = useContext(LocationSearchContext);
  const services = useConfigFilesState().data.services;

  const {
    waterbodyAreas,
    waterbodyLines,
    monitoringLocationsLayer,
    waterbodyPoints,
    updateVisibleLayers,
    waterbodyLayer,
  } = useLayers();

  const { monitoringLocations, monitoringLocationsStatus } =
    useMonitoringLocations();

  const [waterbodiesDisplayed, setWaterbodiesDisplayed] = useState(true);
  const [monitoringLocationsDisplayed, setMonitoringLocationsDisplayed] =
    useState(true);

  // switch the base map to
  useEffect(() => {
    if (!mapView) return;

    const newBasemap = new Basemap({
      portalItem: {
        id: services.basemaps.terrainWithLabels,
      },
    });
    mapView.map.basemap = newBasemap;

    return function cleanup() {
      mapView.map.basemap = basemapFromPortalItem(services.basemaps.default);
    };
  }, [mapView]);

  // get gis data for selected tribe
  const [tribalBoundaryError, setTribalBoundaryError] = useState(false);

  // set the filter on each waterbody layer
  const [filter, setFilter] = useState('');
  useEffect(() => {
    if (!activeState || !waterbodyPoints || !waterbodyLines || !waterbodyAreas)
      return;

    // change the where clause of the feature layers
    const filter = activeState?.attainsId
      ? `organizationid = '${activeState.attainsId}'`
      : '1=0';
    waterbodyPoints.definitionExpression = filter;
    waterbodyLines.definitionExpression = filter;
    waterbodyAreas.definitionExpression = filter;

    setFilter(filter);
    setTribalBoundaryError(false);
    setWaterbodies({ status: 'pending', data: [] });
  }, [activeState, waterbodyAreas, waterbodyLines, waterbodyPoints]);

  // get the full list of waterbodies across the points, lines, and areas layers
  const [waterbodies, setWaterbodies] = useState({ status: 'idle', data: [] });
  useEffect(() => {
    if (
      !activeState ||
      !filter ||
      !mapView ||
      !waterbodyPoints ||
      !waterbodyLines ||
      !waterbodyAreas
    ) {
      return;
    }

    if (!activeState.attainsId) {
      setWaterbodies({ status: 'success', data: [] });
    }

    function handelQueryError(error) {
      console.error(error);
      setWaterbodies({ status: 'failure', data: [] });
    }

    const features = [];
    // get the waterbodies from the points layer
    const pointsQuery = waterbodyPoints.createQuery();
    pointsQuery.outSpatialReference = { wkid: 3857 };
    waterbodyPoints
      .queryFeatures(pointsQuery)
      .then((pointFeatures) => {
        features.push(...pointFeatures.features);

        // get the waterbodies from the lines layer
        const linesQuery = waterbodyLines.createQuery();
        linesQuery.outSpatialReference = { wkid: 3857 };
        waterbodyLines
          .queryFeatures(linesQuery)
          .then((lineFeatures) => {
            features.push(...lineFeatures.features);

            // get the waterbodies from the areas layer
            const areasQuery = waterbodyAreas.createQuery();
            areasQuery.outSpatialReference = { wkid: 3857 };
            waterbodyAreas
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
  }, [
    activeState,
    waterbodyPoints,
    waterbodyLines,
    waterbodyAreas,
    mapView,
    filter,
  ]);

  // Makes the view on map button work for the state page
  // (i.e. switches and scrolls to the map when the selected graphic changes)
  const [displayMode, setDisplayMode] = useState('map');
  const { selectedGraphic } = useMapHighlightState();
  useEffect(() => {
    if (!selectedGraphic) return;

    setDisplayMode('map');
  }, [selectedGraphic]);

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

  const { width } = useWindowSize();

  const [mapShown, setMapShown] = useState(true);
  const [listShown, setListShown] = useState(true);

  // show the map/list if the user makes their screen large enough
  useEffect(() => {
    if (width < 960) return;
    setMapShown(true);
    setListShown(true);
  }, [width]);

  const [selectedCharacteristicOptions, setSelectedCharacteristicOptions] =
    useState<Readonly<Option[]>>([]);
  const selectedCharacteristics = selectedCharacteristicOptions.map(
    (opt) => opt.value,
  );

  // Reset data if the user switches locations
  const [prevState, setPrevState] = useState(activeState);
  if (activeState !== prevState) {
    setPrevState(activeState);
    setSelectedCharacteristicOptions([]);
    if (monitoringLocationsLayer) {
      monitoringLocationsLayer.definitionExpression = '';
    }
  }

  const [selectedTab, setSelectedTab] = useState(0);

  const [
    monitoringLocationsFilteredByCharcGroupAndTime,
    setMonitoringLocationsFilteredByCharcGroupAndTime,
  ] = useState([]);

  // Filter the displayed locations by selected characteristics
  const filteredMonitoringLocations =
    monitoringLocationsFilteredByCharcGroupAndTime.filter((location) => {
      if (!selectedCharacteristics.length) return true;
      for (let characteristic of Object.keys(location.totalsByCharacteristic)) {
        if (selectedCharacteristics.includes(characteristic)) return true;
      }
      return false;
    });

  // Update the filters on the layer
  const locationIds = filteredMonitoringLocations.map(
    (location) => location.uniqueId,
  );
  let definitionExpression = '';
  if (locationIds.length === 0) definitionExpression = '1=0';
  else if (locationIds.length !== monitoringLocations.length) {
    definitionExpression = `uniqueId IN ('${locationIds.join("','")}')`;
  }
  if (
    monitoringLocationsLayer &&
    definitionExpression !== monitoringLocationsLayer.definitionExpression
  ) {
    monitoringLocationsLayer.definitionExpression = definitionExpression;
  }

  // track Esri map load errors for older browsers and devices that do not support ArcGIS 4.x
  if (!browserIsCompatibleWithArcGIS()) {
    return <div css={errorBoxStyles}>{esriMapLoadingFailure}</div>;
  }

  const mapListHeight =
    windowHeight - viewModeHeight - layerTogglesHeight - 3 * mapPadding;

  return (
    <div>
      <div css={keyMetricsStyles} ref={layerTogglesRef}>
        {activeState.attainsId && (
          <div css={keyMetricStyles}>
            {waterbodies.status === 'pending' && <LoadingSpinner />}
            {(waterbodies.status === 'success' ||
              waterbodies.status === 'failure') && (
              <Fragment>
                <span css={keyMetricNumberStyles}>
                  {countOrNotAvailable(waterbodies.data, waterbodies.status)}
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
                        waterbodyLayer: !waterbodiesDisplayed,
                      });
                    }}
                    disabled={!waterbodies.data.length}
                    ariaLabel="Waterbodies"
                  />
                </div>
              </Fragment>
            )}
          </div>
        )}

        <div css={keyMetricStyles}>
          {!monitoringLocationsLayer ||
          monitoringLocationsStatus === 'pending' ? (
            <LoadingSpinner />
          ) : (
            <>
              <span css={keyMetricNumberStyles}>
                {countOrNotAvailable(
                  monitoringLocations,
                  monitoringLocationsStatus,
                )}
              </span>
              <p css={keyMetricLabelStyles}>Water Monitoring Locations</p>
              <div css={switchContainerStyles}>
                <Switch
                  checked={
                    Boolean(monitoringLocations.length) &&
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
                    updateVisibleLayers({
                      monitoringLocationsLayer: !monitoringLocationsDisplayed,
                    });
                  }}
                  disabled={!monitoringLocations.length}
                  ariaLabel="Water Monitoring Stations"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {tribalBoundaryError && (
        <div css={modifiedErrorBoxStyles}>
          <p>{tribalBoundaryErrorMessage}</p>
        </div>
      )}

      <div css={inputStyles(width < 960)} ref={viewModeRef}>
        <div className="btn-group" role="group">
          <button
            css={buttonStyles}
            type="button"
            className={`btn btn-secondary${
              displayMode === 'map' ? ' active' : ''
            }`}
            onClick={(_ev) => {
              setDisplayMode('map');
              setMapShown(true);
            }}
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
            onClick={(_ev) => {
              setDisplayMode('list');
              setListShown(true);
            }}
          >
            <i className="fas fa-list" aria-hidden="true" />
            &nbsp;&nbsp;List
          </button>
        </div>
      </div>

      {width < 960 && (
        <div>
          {displayMode === 'map' && (
            <MapVisibilityButton
              value={mapShown}
              callback={(visible) => {
                setMapShown(visible);
              }}
            />
          )}
          {displayMode === 'list' && (
            <MapVisibilityButton
              text="List"
              value={listShown}
              callback={(visible) => {
                setListShown(visible);
              }}
            />
          )}
        </div>
      )}

      {errorMessage && (
        <div css={modifiedErrorBoxStyles}>
          <p>{errorMessage}</p>
        </div>
      )}

      <div
        aria-label="Tribal Map"
        css={css`
          ${containerStyles};
          height: ${mapListHeight}px;
          width: 100%;
          display: ${displayMode === 'map' && mapShown ? 'block' : 'none'};
        `}
      >
        <TribalMap
          activeState={activeState}
          filter={filter}
          setTribalBoundaryError={setTribalBoundaryError}
        >
          {activeState.attainsId && (
            <div css={mapFooterStyles}>
              <div css={mapFooterStatusStyles}>
                <strong>Year Last Reported:</strong>
                &nbsp;&nbsp;
                {currentReportingCycle.status === 'fetching' && (
                  <LoadingSpinner />
                )}
                {currentReportingCycle.status === 'failure' && (
                  <>{yearLastReportedShortError}</>
                )}
                {currentReportingCycle.status === 'success' && (
                  <>{currentReportingCycle.reportingCycle}</>
                )}
              </div>
            </div>
          )}
        </TribalMap>
      </div>

      {displayMode === 'list' && listShown && (
        <div css={modifiedTabStyles(mapListHeight)}>
          <Tabs onChange={setSelectedTab} defaultIndex={selectedTab}>
            <TabList>
              {activeState.attainsId && (
                <Tab css={largeTabStyles}>Waterbodies</Tab>
              )}
              <Tab css={largeTabStyles}>Water Monitoring Locations</Tab>
            </TabList>
            <TabPanels>
              {activeState.attainsId && (
                <TabPanel>
                  {waterbodies.status === 'pending' && <LoadingSpinner />}
                  {waterbodies.status === 'failure' && (
                    <div css={errorBoxStyles}>{huc12SummaryError}</div>
                  )}
                  {waterbodies.status === 'success' && (
                    <Fragment>
                      {waterbodies.data.length > 0 ? (
                        <WaterbodyList waterbodies={waterbodies.data} />
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
              )}
              <TabPanel>
                <MonitoringTab
                  activeState={activeState}
                  monitoringLocations={filteredMonitoringLocations}
                  selectedCharacteristicOptions={selectedCharacteristicOptions}
                  setSelectedCharacteristicOptions={
                    setSelectedCharacteristicOptions
                  }
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </div>
      )}

      <PastWaterConditionsFilters
        key={activeState.epaId}
        filteredLocations={monitoringLocationsFilteredByCharcGroupAndTime}
        locationName={activeState.name}
        locationType="tribe"
        setFilteredLocations={setMonitoringLocationsFilteredByCharcGroupAndTime}
        setMonitoringDisplayed={setMonitoringLocationsDisplayed}
        wqxIds={activeState.wqxIds}
      />
    </div>
  );
}

type TribalMapProps = {
  activeState: Object;
  children: ReactNode;
  filter: string;
  setTribalBoundaryError: Function;
};

function TribalMap({
  activeState,
  children,
  filter,
  setTribalBoundaryError,
}: TribalMapProps) {
  const { homeWidget, mapView } = useContext(LocationSearchContext);

  const {
    waterbodyAreas,
    waterbodyLines,
    waterbodyPoints,
    setLayer,
    setResetHandler,
    updateVisibleLayers,
    waterbodyLayer,
  } = useLayers();

  const [monitoringLocationsFilter, setMonitoringLocationsFilter] =
    useState(null);
  // get the wqx monitoring locations associated with the selected tribe
  useEffect(() => {
    if (!activeState?.wqxIds) return;

    setMonitoringLocationsFilter(
      `organization=${activeState.wqxIds.join('&organization=')}`,
    );
  }, [activeState]);

  const { monitoringLocationsLayer, surroundingMonitoringLocationsLayer } =
    useMonitoringLocationsLayers({ filter: monitoringLocationsFilter });

  const { surroundingUsgsStreamgagesLayer } = useStreamgageLayers();
  const { surroundingDischargersLayer } = useDischargersLayers();
  const { surroundingCyanLayer } = useCyanWaterbodiesLayers();

  const configFiles = useConfigFilesState();
  const navigate = useNavigate();
  useWaterbodyHighlight();

  const getSharedLayers = useSharedLayers({
    overrides: {
      allWaterbodiesLayer: {
        minScale: 4622350,
      },
    },
  });
  const [layers, setLayers] = useState(null);

  // Initially sets up the layers
  const [layersInitialized, setLayersInitialized] = useState(false);
  const [selectedTribeLayer, setSelectedTribeLayer] = useState(null);
  useEffect(() => {
    if (!activeState || !getSharedLayers || layersInitialized) {
      return;
    }

    const popupTemplate = {
      outFields: ['*'],
      title: (feature) => getPopupTitle(feature.graphic.attributes),
      content: (feature) =>
        getPopupContent({
          configFiles: configFiles.data,
          feature: feature.graphic,
          navigate,
        }),
    };

    const { attainsId } = activeState;

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
    const waterbodyPoints = new FeatureLayer({
      url: configFiles.data.services.waterbodyService.points,
      definitionExpression: attainsId
        ? `organizationid = '${attainsId}'`
        : '1=0',
      outFields: ['*'],
      renderer: pointsRenderer,
      popupTemplate,
    });

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
    const waterbodyLines = new FeatureLayer({
      url: configFiles.data.services.waterbodyService.lines,
      definitionExpression: attainsId
        ? `organizationid = '${attainsId}'`
        : '1=0',
      outFields: ['*'],
      renderer: linesRenderer,
      popupTemplate,
    });

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
    const waterbodyAreas = new FeatureLayer({
      url: configFiles.data.services.waterbodyService.areas,
      definitionExpression: attainsId
        ? `organizationid = '${attainsId}'`
        : '1=0',
      outFields: ['*'],
      renderer: areasRenderer,
      popupTemplate,
    });

    // Make the waterbody layer into a single layer
    const waterbodyLayer = new GroupLayer({
      id: 'waterbodyLayer',
      title: 'Waterbodies',
      listMode: 'hide-children',
      visible: true,
      legendEnabled: false,
    });
    waterbodyLayer.addMany([waterbodyAreas, waterbodyLines, waterbodyPoints]);

    const selectedTribeLayer = new GraphicsLayer({
      id: 'selectedTribeLayer',
      title: 'Selected Tribe',
      listMode: 'hide',
      visible: 'true',
      legendEnabled: false,
    });

    const upstreamLayer = new GraphicsLayer({
      id: 'upstreamLayer',
      title: 'Upstream Watershed',
      listMode: 'hide',
      visible: false,
    });

    // add the shared layers to the map
    getSharedLayers().then((sharedLayers) => {
      setLayers([
        ...sharedLayers,
        upstreamLayer,
        selectedTribeLayer,
        surroundingCyanLayer,
        surroundingDischargersLayer,
        surroundingUsgsStreamgagesLayer,
        monitoringLocationsLayer,
        surroundingMonitoringLocationsLayer,
        waterbodyLayer,
      ]);
      setLayer('waterbodyPoints', waterbodyPoints);
      setLayer('waterbodyLines', waterbodyLines);
      setLayer('waterbodyAreas', waterbodyAreas);
      setLayer('waterbodyLayer', waterbodyLayer);
      setResetHandler('waterbodyLayer', () => {
        waterbodyLayer.layers.removeAll();
        setLayer('waterbodyLayer', null);
      });
      setSelectedTribeLayer(selectedTribeLayer);
      setLayer('upstreamLayer', upstreamLayer);

      updateVisibleLayers({
        selectedTribeLayer: true,
        waterbodyLayer: true,
        monitoringLocationsLayer: true,
      });
    });
    setLayersInitialized(true);
  }, [
    activeState,
    configFiles,
    getSharedLayers,
    layersInitialized,
    monitoringLocationsLayer,
    navigate,
    setLayer,
    setResetHandler,
    surroundingCyanLayer,
    surroundingDischargersLayer,
    surroundingMonitoringLocationsLayer,
    surroundingUsgsStreamgagesLayer,
    updateVisibleLayers,
  ]);

  // get gis data for selected tribe
  const [selectedTribeGraphicsReady, setSelectedTribeGraphicsReady] =
    useState(false);
  useEffect(() => {
    // get the tribalLayer from the mapView
    const tribalLayer = mapView?.map?.findLayerById('tribalLayer');

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

        selectedTribeLayer.addMany(graphics);
        reactiveUtils
          .whenOnce(() => !mapView.updating)
          .then(() => {
            setSelectedTribeGraphicsReady(true);
          });
      })
      .catch((error) => {
        console.error(error);
        setTribalBoundaryError(true);
      });
  }, [activeState, mapView, selectedTribeLayer, setTribalBoundaryError]);

  // zoom to graphics on the map, and update the home widget's extent
  const [mapLoading, setMapLoading] = useState(true);
  useEffect(() => {
    if (
      !mapLoading ||
      !filter ||
      !selectedTribeLayer ||
      !selectedTribeGraphicsReady ||
      !mapView ||
      !homeWidget ||
      !waterbodyAreas ||
      !waterbodyLines ||
      !waterbodyPoints
    ) {
      return;
    }

    async function queryExtent() {
      let fullExtent = null;

      // Get the waterbody layers' extents.
      (
        await Promise.all(
          [waterbodyPoints, waterbodyLines, waterbodyAreas].map((layer) =>
            layer.queryExtent(),
          ),
        )
      ).forEach((extent) => {
        if (extent.count) {
          if (fullExtent) fullExtent.union(extent.extent);
          else fullExtent = extent.extent;
        }
      });

      // Get the extent of the selected tribes layer graphics.
      selectedTribeLayer.graphics.forEach((graphic) => {
        if (fullExtent) fullExtent.union(graphic.geometry.extent);
        else fullExtent = graphic.geometry.extent;
      });

      return fullExtent;
    }

    // zoom and set the home widget viewpoint
    queryExtent().then((fullExtent) => {
      // if there is an extent then zoom to it and set the home widget
      if (fullExtent) {
        mapView.when(() => {
          mapView.goTo(fullExtent).then(() => {
            setMapLoading(false);
            // only set the home widget if the user selects a different state
            homeWidget.viewpoint = new Viewpoint({
              targetGeometry: mapView.extent,
            });
          });
        });
      } else {
        setMapLoading(false);
      }
    });
  }, [
    activeState,
    filter,
    homeWidget,
    mapLoading,
    mapView,
    selectedTribeGraphicsReady,
    selectedTribeLayer,
    waterbodyAreas,
    waterbodyLayer,
    waterbodyLines,
    waterbodyPoints,
  ]);

  // reset the loading status when the selected tribe changes
  const [prevActiveState, setPrevActiveState] = useState(activeState);
  if (prevActiveState.value !== activeState.value) {
    setPrevActiveState(activeState);
    setMapLoading(true);
    setSelectedTribeGraphicsReady(false);
  }

  return (
    <Fragment>
      <Map layers={layers}>{children}</Map>
      {mapView && mapLoading && <MapLoadingSpinner />}
    </Fragment>
  );
}

type MonitoringTabProps = {
  activeState: Object;
  monitoringLocations: Object[];
  selectedCharacteristicOptions: Readonly<Option[]>;
  setSelectedCharacteristicOptions: (selected: Readonly<Option[]>) => void;
};

function MonitoringTab({
  activeState,
  monitoringLocations,
  selectedCharacteristicOptions,
  setSelectedCharacteristicOptions,
}: MonitoringTabProps) {
  const configFiles = useConfigFilesState();

  // sort the monitoring locations
  const [monitoringLocationsSortedBy, setMonitoringLocationsSortedBy] =
    useState('locationName');

  const sortedMonitoringAndSensors = [...monitoringLocations].sort((a, b) => {
    if (monitoringLocationsSortedBy === 'totalMeasurements') {
      return (b.totalMeasurements || 0) - (a.totalMeasurements || 0);
    }

    if (monitoringLocationsSortedBy === 'siteId') {
      return a.siteId.localeCompare(b.siteId);
    }

    return a[monitoringLocationsSortedBy].localeCompare(
      b[monitoringLocationsSortedBy],
    );
  });

  const [expandedRows, setExpandedRows] = useState([]);

  return (
    <AccordionList
      title={
        <>
          <strong>{sortedMonitoringAndSensors.length}</strong> of{' '}
          <strong>{monitoringLocations.length}</strong> locations with{' '}
          {selectedCharacteristicOptions.length > 0
            ? 'the selected characteristic'
            : 'data'}
          {selectedCharacteristicOptions.length > 1 && 's'} in the{' '}
          <em>{activeState.label}</em> watershed.
        </>
      }
      extraListHeaderContent={
        <CharacteristicsSelect
          selected={selectedCharacteristicOptions}
          onChange={setSelectedCharacteristicOptions}
        />
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
          value: 'totalMeasurements',
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
            key={item.uniqueId}
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
                    {item.totalMeasurements}
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
                configFiles={configFiles.data}
                feature={feature}
                type="Past Water Conditions"
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
    <LayersProvider>
      <MapHighlightProvider>
        <MapErrorBoundary>
          <LocationSearchProvider>
            <TribalMapList {...props} />
          </LocationSearchProvider>
        </MapErrorBoundary>
      </MapHighlightProvider>
    </LayersProvider>
  );
}
