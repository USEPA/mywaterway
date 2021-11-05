// @flow

import React from 'react';
import type { Node } from 'react';
import styled from 'styled-components';
import StickyBox from 'react-sticky-box';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import Viewpoint from '@arcgis/core/Viewpoint';
// components
import Map from 'components/shared/Map';
import MapLoadingSpinner from 'components/shared/MapLoadingSpinner';
import {
  createWaterbodySymbol,
  createUniqueValueInfos,
  getPopupContent,
  getPopupTitle,
} from 'components/pages/LocationMap/MapFunctions';
import MapErrorBoundary from 'components/shared/ErrorBoundary/MapErrorBoundary';
// styled components
import { StyledErrorBox } from 'components/shared/MessageBoxes';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
import { MapHighlightContext } from 'contexts/MapHighlight';
import { useServicesContext } from 'contexts/LookupFiles';
// helpers
import { useSharedLayers, useWaterbodyHighlight } from 'utils/hooks';
import { browserIsCompatibleWithArcGIS } from 'utils/utils';
// styles
import 'components/pages/LocationMap/mapStyles.css';
// errors
import { esriMapLoadingFailure } from 'config/errorMessages';

// --- styled components ---
const mapPadding = 20;

const Container = styled.div`
  display: flex;
  position: relative;
  border: 1px solid #aebac3;
  background-color: #fff;
`;

// --- components ---
type Props = {
  layout: 'narrow' | 'wide',
  windowHeight: number,
  windowWidth: number,
  filter: string,
  activeState: Object,
  numberOfRecords: number,
  children?: Node,
};

function StateMap({
  layout = 'narrow',
  windowHeight,
  windowWidth,
  filter,
  activeState,
  numberOfRecords,
  children,
}: Props) {
  const services = useServicesContext();

  const { selectedGraphic } = React.useContext(MapHighlightContext);

  const {
    mapView,
    setWaterbodyLayer,
    setVisibleLayers,

    waterbodyLayer,
    pointsLayer,
    linesLayer,
    areasLayer,
    setPointsLayer,
    setLinesLayer,
    setAreasLayer,

    homeWidget,
    resetData,
  } = React.useContext(LocationSearchContext);

  const [layers, setLayers] = React.useState(null);

  // track Esri map load errors for older browsers and devices that do not support ArcGIS 4.x
  const [stateMapLoadError, setStateMapLoadError] = React.useState(false);

  const getSharedLayers = useSharedLayers();
  useWaterbodyHighlight(false);

  // Initializes the layers
  const [layersInitialized, setLayersInitialized] = React.useState(false);
  React.useEffect(() => {
    if (!getSharedLayers || layersInitialized) return;

    const popupTemplate = {
      outFields: ['*'],
      title: (feature) => getPopupTitle(feature.graphic.attributes),
      content: (feature) => getPopupContent({ feature: feature.graphic }),
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
      definitionExpression: 'objectid = 0', //hide everything at first
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
      definitionExpression: 'objectid = 0', //hide everything at first
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
      definitionExpression: 'objectid = 0', //hide everything at first
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
    });
    waterbodyLayer.addMany([areasLayer, linesLayer, pointsLayer]);
    setWaterbodyLayer(waterbodyLayer);

    setLayers([...getSharedLayers(), waterbodyLayer]);

    setVisibleLayers({ waterbodyLayer: true });

    setLayersInitialized(true);
  }, [
    getSharedLayers,
    setAreasLayer,
    setLinesLayer,
    setPointsLayer,
    setVisibleLayers,
    setWaterbodyLayer,
    layersInitialized,
    services,
  ]);

  // Function for resetting the LocationSearch context when the map is removed
  React.useEffect(() => {
    return function cleanup() {
      resetData();
    };
  }, [resetData]);

  const [lastFilter, setLastFilter] = React.useState('');

  // cDU
  // detect when user changes their search
  const [homeWidgetSet, setHomeWidgetSet] = React.useState(false);
  const [mapLoading, setMapLoading] = React.useState(true);
  React.useEffect(() => {
    // query geocode server for every new search
    if (
      filter !== lastFilter &&
      mapView &&
      pointsLayer &&
      linesLayer &&
      areasLayer &&
      homeWidget &&
      numberOfRecords
    ) {
      setLastFilter(filter);

      // change the where clause of the feature layers
      if (!filter) return;
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
                if (numberOfRecords === 1 && pointsExtent.count === 1) {
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
            }
          });
        });
      });
    }
  }, [
    filter,
    lastFilter,
    pointsLayer,
    linesLayer,
    areasLayer,
    mapView,
    homeWidget,
    homeWidgetSet,
    selectedGraphic,
    waterbodyLayer,
    numberOfRecords,
  ]);

  // Used to tell if the homewidget has been set to the selected state.
  // This will reset the value when the user selects a different state.
  React.useEffect(() => {
    setHomeWidgetSet(false);
  }, [activeState]);

  React.useEffect(() => {
    // scroll community content into view
    // get community content DOM node to scroll page when form is submitted

    // if in fullscreen, scroll to top of map

    if (layout === 'fullscreen') {
      const mapContent = document.querySelector(`[data-content="statemap"]`);

      if (mapContent) {
        let pos = mapContent.getBoundingClientRect();
        window.scrollTo(
          pos.left + window.pageXOffset,
          pos.top + window.pageYOffset,
        );
      }
    }
    // if in normal layout, display the inputs above the map
    else {
      const mapInputs = document.querySelector(`[data-content="stateinputs"]`);

      if (mapInputs) {
        mapInputs.scrollIntoView();
      }
    }
  }, [layout, windowHeight, windowWidth]);

  // calculate height of div holding the footer content
  const [footerHeight, setFooterHeight] = React.useState(0);
  const measuredRef = React.useCallback((node) => {
    if (!node) return;
    setFooterHeight(node.getBoundingClientRect().height);
  }, []);

  const mapInputs = document.querySelector(`[data-content="stateinputs"]`);
  const mapInputsHeight = mapInputs && mapInputs.getBoundingClientRect().height;

  // check for browser compatibility with map
  if (!browserIsCompatibleWithArcGIS() && !stateMapLoadError) {
    setStateMapLoadError(true);
  }

  // jsx
  const mapContent = (
    <div
      style={
        layout === 'fullscreen' && windowWidth < 400
          ? { marginLeft: '-1.75em' }
          : {}
      }
    >
      <Container
        data-content="statemap"
        style={
          layout === 'fullscreen'
            ? {
                height: windowHeight - footerHeight,
                width: windowWidth,
              }
            : {
                height:
                  windowHeight -
                  footerHeight -
                  mapInputsHeight -
                  3 * mapPadding,
              }
        }
      >
        <Map
          startingExtent={{
            xmin: -13873570.722124241,
            ymin: 2886242.8013031036,
            xmax: -7474874.210317273,
            ymax: 6271485.909996087,
            spatialReference: { wkid: 102100 },
          }}
          layers={layers}
        />
        {mapView && mapLoading && <MapLoadingSpinner />}
      </Container>

      {/* The StateMap's children is a footer */}
      <div ref={measuredRef}>{children}</div>
    </div>
  );

  if (stateMapLoadError) {
    return <StyledErrorBox>{esriMapLoadingFailure}</StyledErrorBox>;
  }

  if (layout === 'wide') {
    return (
      <StickyBox offsetTop={mapPadding} offsetBottom={mapPadding}>
        {mapContent}
      </StickyBox>
    );
  }

  // layout defaults to 'narrow'
  return mapContent;
}

export default function StateMapContainer({ ...props }: Props) {
  return (
    <MapErrorBoundary>
      <StateMap {...props} />
    </MapErrorBoundary>
  );
}
