import React, { useContext, useEffect, useState } from 'react';
import { css } from 'styled-components/macro';
import { useNavigate } from 'react-router-dom';
import Basemap from '@arcgis/core/Basemap';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import Viewpoint from '@arcgis/core/Viewpoint';
// components
import Map from 'components/shared/Map';
import MapLoadingSpinner from 'components/shared/MapLoadingSpinner';
import MapErrorBoundary from 'components/shared/ErrorBoundary.MapErrorBoundary';
import WaterbodyList from 'components/shared/WaterbodyList';
// styled components
import { errorBoxStyles, infoBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import {
  LocationSearchContext,
  LocationSearchProvider,
} from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
import { MapHighlightProvider } from 'contexts/MapHighlight';
// helpers
import { useSharedLayers, useWaterbodyHighlight } from 'utils/hooks';
import { browserIsCompatibleWithArcGIS } from 'utils/utils';
import {
  createWaterbodySymbol,
  createUniqueValueInfos,
  getPopupTitle,
  getPopupContent,
} from 'utils/mapFunctions';
// errors
import {
  esriMapLoadingFailure,
  tribalBoundaryErrorMessage,
  zeroAssessedWaterbodies,
} from 'config/errorMessages';

const mapListHeight = '70vh';

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

const buttonStyles = css`
  margin-bottom: 0;
  font-size: 0.9375em;
  &.active {
    background-color: #0071bc !important;
  }
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles}
  margin-bottom: 0.75em;
`;

type Props = {
  layout: 'narrow' | 'wide' | 'fullscreen',
  windowHeight: number,
  windowWidth: number,
  activeState: Object,
};

function TribesMap({ layout, windowHeight, windowWidth, activeState }: Props) {
  const navigate = useNavigate();

  const {
    homeWidget,
    mapView,
    areasLayer,
    setAreasLayer,
    linesLayer,
    setLinesLayer,
    pointsLayer,
    setPointsLayer,
    setVisibleLayers,
    waterbodyLayer,
    setWaterbodyLayer,
  } = useContext(LocationSearchContext);

  const [layers, setLayers] = useState(null);

  // track Esri map load errors for older browsers and devices that do not support ArcGIS 4.x
  const [actionsMapLoadError, setActionsMapLoadError] = useState(false);

  const services = useServicesContext();
  const getSharedLayers = useSharedLayers();
  useWaterbodyHighlight();

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
      listMode: 'hide',
      visible: false,
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

    // add the shared layers to the map and set the tribal layer visible
    const sharedLayers = getSharedLayers();

    // // TODO: Decide if we want to show the full tribal layer or not.
    // sharedLayers.forEach((layer) => {
    //   if (layer.id !== 'tribalLayer') return;

    //   layer.visible = true;
    // });

    setLayers([...sharedLayers, selectedTribeLayer, waterbodyLayer]);

    setVisibleLayers({ waterbodyLayer: true });

    setLayersInitialized(true);
  }, [
    activeState,
    getSharedLayers,
    layersInitialized,
    navigate,
    services,
    setAreasLayer,
    setLinesLayer,
    setPointsLayer,
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
  const [tribalBoundaryError, setTribalBoundaryError] = useState(false);
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
  }, [activeState, mapView, navigate, selectedTribeLayer, tribalLayer]);

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
  }, [activeState, areasLayer, linesLayer, pointsLayer]);

  // zoom to graphics on the map, and update the home widget's extent
  const [homeWidgetSet, setHomeWidgetSet] = useState(false);
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
              // only show the waterbody layer after everything has loaded to
              // cut down on unnecessary service calls
              waterbodyLayer.listMode = 'hide-children';
              waterbodyLayer.visible = true;

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

  // get the full list of waterbodies across the points, lines, and areas layers
  const [waterbodies, setWaterbodies] = useState([]);
  useEffect(() => {
    if (!filter || !mapView || !pointsLayer || !linesLayer || !areasLayer) {
      return;
    }

    const features = [];
    // get the waterbodies from the points layer
    pointsLayer.queryFeatures().then((pointFeatures) => {
      features.push(...pointFeatures.features);

      // get the waterbodies from the lines layer
      linesLayer.queryFeatures().then((lineFeatures) => {
        features.push(...lineFeatures.features);

        // get the waterbodies from the areas layer
        areasLayer.queryFeatures().then((areaFeatures) => {
          features.push(...areaFeatures.features);
          setWaterbodies(features);
        });
      });
    });
  }, [pointsLayer, linesLayer, areasLayer, mapView, filter]);

  useEffect(() => {
    if (layout === 'fullscreen') {
      const mapContent = document.querySelector(`[aria-label="Tribal Map"]`);

      if (mapContent) {
        let pos = mapContent.getBoundingClientRect();
        window.scrollTo(pos.left + window.scrollX, pos.top + window.scrollY);
      }
    }
  }, [layout, windowHeight, windowWidth]);

  // check for browser compatibility with map
  if (!browserIsCompatibleWithArcGIS() && !actionsMapLoadError) {
    setActionsMapLoadError(true);
  }

  const [displayMode, setDisplayMode] = useState('map');

  if (actionsMapLoadError) {
    return <div css={errorBoxStyles}>{esriMapLoadingFailure}</div>;
  }

  return (
    <div>
      <div css={inputStyles}>
        <div className="btn-group" role="group">
          <button
            css={buttonStyles}
            type="button"
            className={`btn btn-secondary${
              displayMode === 'map' ? ' active' : ''
            }`}
            onClick={(ev) => setDisplayMode('map')}
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
            onClick={(ev) => setDisplayMode('list')}
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
            onClick={(ev) => setDisplayMode('none')}
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
      <div
        aria-label="Tribal Map"
        css={containerStyles}
        style={
          layout === 'fullscreen'
            ? {
                height: windowHeight,
                width: windowWidth,
              }
            : {
                height: mapListHeight,
                minHeight: '400px',
                width: '100%',
                display: displayMode === 'map' ? 'block' : 'none',
              }
        }
      >
        <Map layers={layers} />
        {mapView && mapLoading && <MapLoadingSpinner />}
      </div>
      {displayMode === 'list' && (
        <div
          style={{
            maxHeight: mapListHeight,
            width: '100%',
            overflow: 'auto',
          }}
        >
          {waterbodies.length > 0 ? (
            <WaterbodyList waterbodies={waterbodies} title="Waterbodies" />
          ) : (
            <div css={infoBoxStyles}>
              <p>{zeroAssessedWaterbodies(activeState.name, 'tribal area')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TribesMapContainer({ ...props }: Props) {
  return (
    <MapHighlightProvider>
      <MapErrorBoundary>
        <LocationSearchProvider>
          <TribesMap {...props} />
        </LocationSearchProvider>
      </MapErrorBoundary>
    </MapHighlightProvider>
  );
}
