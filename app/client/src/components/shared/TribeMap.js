import React, { useContext, useEffect, useState } from 'react';
import { css } from 'styled-components/macro';
import { useNavigate } from 'react-router-dom';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import Viewpoint from '@arcgis/core/Viewpoint';
// components
import Map from 'components/shared/Map';
import MapLoadingSpinner from 'components/shared/MapLoadingSpinner';
import MapErrorBoundary from 'components/shared/ErrorBoundary.MapErrorBoundary';
// styled components
import { errorBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
import {
  MapHighlightProvider,
  MapHighlightContext,
} from 'contexts/MapHighlight';
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
import { esriMapLoadingFailure } from 'config/errorMessages';

const containerStyles = css`
  display: flex;
  position: relative;
  border: 1px solid #aebac3;
  background-color: #fff;
`;

// --- components ---
type Props = {
  layout: 'narrow' | 'wide' | 'fullscreen',
  windowHeight: number,
  windowWidth: number,
  orgId: string,
};

function TribesMap({ layout, windowHeight, windowWidth, orgId }: Props) {
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

  const { selectedGraphic } = useContext(MapHighlightContext);

  const [layers, setLayers] = useState(null);

  // track Esri map load errors for older browsers and devices that do not support ArcGIS 4.x
  const [actionsMapLoadError, setActionsMapLoadError] = useState(false);

  const services = useServicesContext();
  const getSharedLayers = useSharedLayers();
  useWaterbodyHighlight();

  // Initially sets up the layers
  const [layersInitialized, setLayersInitialized] = useState(false);
  useEffect(() => {
    if (!getSharedLayers || layersInitialized) return;

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
      definitionExpression: `organizationid = '${orgId}'`,
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
      definitionExpression: `organizationid = '${orgId}'`,
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
      definitionExpression: `organizationid = '${orgId}'`,
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

    // add the shared layers to the map and set the tribal layer visible
    const sharedLayers = getSharedLayers();
    sharedLayers.forEach((layer) => {
      if (layer.id !== 'tribalLayer') return;

      layer.visible = true;
    });

    setLayers([...sharedLayers, waterbodyLayer]);

    setVisibleLayers({ waterbodyLayer: true });

    setLayersInitialized(true);
  }, [
    getSharedLayers,
    layersInitialized,
    navigate,
    orgId,
    services,
    setAreasLayer,
    setLinesLayer,
    setPointsLayer,
    setVisibleLayers,
    setWaterbodyLayer,
  ]);

  // detect when user changes their search, zoom to graphics on the map, and
  // update the home widget's extent
  const [homeWidgetSet, setHomeWidgetSet] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  useEffect(() => {
    // query geocode server for every new search
    if (
      orgId &&
      mapView &&
      pointsLayer &&
      linesLayer &&
      areasLayer &&
      homeWidget
    ) {
      // change the where clause of the feature layers
      const filter = `organizationid = '${orgId}'`;
      if (filter) {
        pointsLayer.definitionExpression = filter;
        linesLayer.definitionExpression = filter;
        areasLayer.definitionExpression = filter;
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

            // if there is an extent then zoom to it and set the home widget
            if (fullExtent) {
              let zoomParams = fullExtent;
              let homeParams = { targetGeometry: fullExtent };
              if (!selectedGraphic) {
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
              } else {
                waterbodyLayer.listMode = 'hide-children';
                waterbodyLayer.visible = true;
              }

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
    }
  }, [
    pointsLayer,
    linesLayer,
    areasLayer,
    mapView,
    homeWidget,
    homeWidgetSet,
    selectedGraphic,
    waterbodyLayer,
    orgId,
  ]);

  // scroll the map into view when switching to full screen mode
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

  if (actionsMapLoadError) {
    return <div css={errorBoxStyles}>{esriMapLoadingFailure}</div>;
  }

  return (
    <div
      css={containerStyles}
      aria-label="Tribal Map"
      style={
        layout === 'fullscreen'
          ? {
              height: windowHeight,
              width: windowWidth,
            }
          : {
              height: '70vh',
              minHeight: '400px',
            }
      }
    >
      <Map layers={layers} />
      {mapView && mapLoading && <MapLoadingSpinner />}
    </div>
  );
}

export default function TribesMapContainer({ ...props }: Props) {
  return (
    <MapHighlightProvider>
      <MapErrorBoundary>
        <TribesMap {...props} />
      </MapErrorBoundary>
    </MapHighlightProvider>
  );
}
