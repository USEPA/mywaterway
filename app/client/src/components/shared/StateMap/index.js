// @flow

import React from 'react';
import type { Node } from 'react';
import styled from 'styled-components';
import StickyBox from 'react-sticky-box';
import { Map } from '@esri/react-arcgis';
// components
import MapLoadingSpinner from 'components/shared/MapLoadingSpinner';
import MapWidgets from 'components/shared/MapWidgets';
import MapMouseEvents from 'components/shared/MapMouseEvents';
import {
  createWaterbodySymbol,
  createUniqueValueInfos,
  getPopupContent,
  getPopupTitle,
  getSharedLayers,
} from 'components/pages/LocationMap/MapFunctions';
import MapErrorBoundary from 'components/shared/ErrorBoundary/MapErrorBoundary';
// contexts
import { EsriModulesContext } from 'contexts/EsriModules';
import { LocationSearchContext } from 'contexts/locationSearch';
import { MapHighlightContext } from 'contexts/MapHighlight';
// config
import { esriApiUrl } from 'config/esriConfig';
import { waterbodyService } from 'config/mapServiceConfig';
// helpers
import { useWaterbodyHighlight } from 'utils/hooks';
// styles
import 'components/pages/LocationMap/mapStyles.css';

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
  const [view, setView] = React.useState(null);

  const { selectedGraphic } = React.useContext(MapHighlightContext);

  const {
    FeatureLayer,
    GroupLayer,
    MapImageLayer,
    Viewpoint,
  } = React.useContext(EsriModulesContext);

  const {
    highlightOptions,
    setMapView,
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
    getBasemap,
  } = React.useContext(LocationSearchContext);

  const [layers, setLayers] = React.useState(null);

  useWaterbodyHighlight(false);

  // Initializes the layers
  const [layersInitialized, setLayersInitialized] = React.useState(false);
  React.useEffect(() => {
    if (layersInitialized) return;

    const popupTemplate = {
      outFields: ['*'],
      title: (feature) => getPopupTitle(feature.graphic.attributes),
      content: (feature) => getPopupContent({ feature: feature.graphic }),
    };

    // Build the feature layers that will make up the waterbody layer
    const pointsRenderer = {
      type: 'unique-value',
      field: 'isassessed',
      field2: 'isimpaired',
      fieldDelimiter: ', ',
      defaultSymbol: createWaterbodySymbol({
        condition: 'unassessed',
        selected: false,
        geometryType: 'point',
      }),
      uniqueValueInfos: createUniqueValueInfos('point'),
    };
    const pointsLayer = new FeatureLayer({
      url: waterbodyService.points,
      definitionExpression: 'objectid = 0', //hide everything at first
      outFields: ['*'],
      renderer: pointsRenderer,
      popupTemplate,
    });
    setPointsLayer(pointsLayer);

    const linesRenderer = {
      type: 'unique-value',
      field: 'isassessed',
      field2: 'isimpaired',
      fieldDelimiter: ', ',
      defaultSymbol: createWaterbodySymbol({
        condition: 'unassessed',
        selected: false,
        geometryType: 'polyline',
      }),
      uniqueValueInfos: createUniqueValueInfos('polyline'),
    };
    const linesLayer = new FeatureLayer({
      url: waterbodyService.lines,
      definitionExpression: 'objectid = 0', //hide everything at first
      outFields: ['*'],
      renderer: linesRenderer,
      popupTemplate,
    });
    setLinesLayer(linesLayer);

    const areasRenderer = {
      type: 'unique-value',
      field: 'isassessed',
      field2: 'isimpaired',
      fieldDelimiter: ', ',
      defaultSymbol: createWaterbodySymbol({
        condition: 'unassessed',
        selected: false,
        geometryType: 'polygon',
      }),
      uniqueValueInfos: createUniqueValueInfos('polygon'),
    };
    const areasLayer = new FeatureLayer({
      url: waterbodyService.areas,
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

    setLayers([
      ...getSharedLayers(FeatureLayer, MapImageLayer),
      waterbodyLayer,
    ]);

    setVisibleLayers({ waterbodyLayer: true });

    setLayersInitialized(true);
  }, [
    FeatureLayer,
    GroupLayer,
    MapImageLayer,
    setAreasLayer,
    setLinesLayer,
    setPointsLayer,
    setVisibleLayers,
    setWaterbodyLayer,
    layersInitialized,
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
  React.useEffect(() => {
    // query geocode server for every new search
    if (
      filter !== lastFilter &&
      view &&
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

                view.goTo(zoomParams).then(() => {
                  // only show the waterbody layer after everything has loaded to
                  // cut down on unnecessary service calls
                  waterbodyLayer.listMode = 'hide-children';
                  waterbodyLayer.visible = true;
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
    Viewpoint,
    filter,
    lastFilter,
    pointsLayer,
    linesLayer,
    areasLayer,
    view,
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

  // jsx
  const [mapLoading, setMapLoading] = React.useState(true);
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
          style={{ position: 'absolute' }}
          loaderOptions={{ url: esriApiUrl }}
          mapProperties={{ basemap: getBasemap() }}
          viewProperties={{
            extent: {
              xmin: -13873570.722124241,
              ymin: 2886242.8013031036,
              xmax: -7474874.210317273,
              ymax: 6271485.909996087,
              spatialReference: { wkid: 102100 },
            },
            highlightOptions,
          }}
          layers={layers}
          onLoad={(map, view) => {
            setView(view);
            setMapView(view);

            // display a loading spinner until the initial map completes
            view.watch('rendering', (rendering) => {
              if (!view.interacting) setMapLoading(rendering); // turn off loading spinner
            });
          }}
          onFail={(err) => {
            console.error(err);
            setView(null);
            setMapView(null);
          }}
        >
          {/* manually passing map and view props to Map component's         */}
          {/* children to satisfy flow, but map and view props are auto      */}
          {/* passed from Map component to its children by react-arcgis      */}
          <MapWidgets
            map={null}
            view={null}
            layers={layers}
            scrollToComponent="statemap"
            onHomeWidgetRendered={(homeWidget) => {}}
          />

          {/* manually passing map and view props to Map component's         */}
          {/* children to satisfy flow, but map and view props are auto      */}
          {/* passed from Map component to its children by react-arcgis      */}
          <MapMouseEvents map={null} view={null} />
        </Map>
        {view && mapLoading && <MapLoadingSpinner />}
      </Container>

      {/* The StateMap's children is a footer */}
      <div ref={measuredRef}>{children}</div>
    </div>
  );

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
      <EsriModulesContext.Consumer>
        {(esriModules) => <StateMap esriModules={esriModules} {...props} />}
      </EsriModulesContext.Consumer>
    </MapErrorBoundary>
  );
}
