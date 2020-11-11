import React from 'react';
import { Map } from '@esri/react-arcgis';
import styled from 'styled-components';
// components
import MapLoadingSpinner from 'components/shared/MapLoadingSpinner';
import MapWidgets from 'components/shared/MapWidgets';
import MapMouseEvents from 'components/shared/MapMouseEvents';
import MapErrorBoundary from 'components/shared/ErrorBoundary/MapErrorBoundary';
// styled components
import { StyledErrorBox, StyledInfoBox } from 'components/shared/MessageBoxes';
// contexts
import { EsriModulesContext } from 'contexts/EsriModules';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// config
import { esriApiUrl } from 'config/esriConfig';
// helpers
import { useSharedLayers, useWaterbodyHighlight } from 'utils/hooks';
import {
  getPopupTitle,
  getPopupContent,
} from 'components/pages/LocationMap/MapFunctions';
// errors
import { actionMapError, actionMapNoData } from 'config/errorMessages';

// --- styled components ---
const Container = styled.div`
  display: flex;
  position: relative;
  border: 1px solid #aebac3;
  height: 100%;
`;

// --- components ---
type Props = {
  esriModules: Object, // passed from EsriModulesContext.Consumer
  layout: 'narrow' | 'wide' | 'fullscreen',
  unitIds: Array<string>,
  onLoad: ?Function,
};

function ActionsMap({ esriModules, layout, unitIds, onLoad }: Props) {
  const {
    initialExtent,
    highlightOptions,
    actionsLayer,
    homeWidget,
    mapView,
    setActionsLayer,
    setMapView,
    getBasemap,
  } = React.useContext(LocationSearchContext);

  const [layers, setLayers] = React.useState(null);

  const services = useServicesContext();
  const getSharedLayers = useSharedLayers();
  useWaterbodyHighlight();

  // Initially sets up the layers
  const [layersInitialized, setLayersInitialized] = React.useState(false);
  React.useEffect(() => {
    if (!getSharedLayers || layersInitialized) return;

    const { GraphicsLayer } = esriModules;

    let localActionsLayer = actionsLayer;
    if (!actionsLayer) {
      localActionsLayer = new GraphicsLayer({
        id: 'actionsWaterbodies',
        title: 'Waterbodies',
        listMode: 'hide',
        visible: true,
      });
      setActionsLayer(localActionsLayer);
    }

    setLayers([...getSharedLayers(), localActionsLayer]);

    setLayersInitialized(true);
  }, [
    esriModules,
    actionsLayer,
    setActionsLayer,
    getSharedLayers,
    layersInitialized,
  ]);

  const [fetchStatus, setFetchStatus] = React.useState('');

  // Queries the Gis service and plots the waterbodies on the map
  const [noMapData, setNoMapData] = React.useState(null);

  // Plots the assessments. Also re-plots if the layout changes
  React.useEffect(() => {
    if (!unitIds || !actionsLayer) return;
    if (fetchStatus) return; // only do a fetch if there is no status

    function plotAssessments(unitIds: Array<string>) {
      const {
        QueryTask,
        Query,
        SimpleLineSymbol,
        SimpleFillSymbol,
        SimpleMarkerSymbol,
        Graphic,
      } = esriModules;

      setFetchStatus('fetching');
      actionsLayer.graphics.removeAll();

      // set up ESRI Queries for ATTAINS lines, area, and points web services
      const lineQuery = new Query();
      const areaQuery = new Query();
      const pointQuery = new Query();

      [lineQuery, areaQuery, pointQuery].forEach((query) => {
        const auIds = Object.keys(unitIds).join("','");
        query.returnGeometry = true;
        query.outFields = ['*'];
        query.where = `assessmentunitidentifier in ('${auIds}')`;
      });

      const lineQueryTask = new QueryTask({
        url: services.data.waterbodyService.lines,
      });
      const areaQueryTask = new QueryTask({
        url: services.data.waterbodyService.areas,
      });
      const pointQueryTask = new QueryTask({
        url: services.data.waterbodyService.points,
      });

      const linePromise = lineQueryTask.execute(lineQuery);
      const areaPromise = areaQueryTask.execute(areaQuery);
      const pointPromise = pointQueryTask.execute(pointQuery);

      Promise.all([linePromise, areaPromise, pointPromise])
        .then(([lineResponse, areaResponse, pointResponse]) => {
          if (!lineResponse.hasOwnProperty('features')) {
            console.error('ATTAINS line query failed.');
          }
          if (!areaResponse.hasOwnProperty('features')) {
            console.error('ATTAINS area query failed.');
          }
          if (!pointResponse.hasOwnProperty('features')) {
            console.error('ATTAINS point query failed.');
          }

          // handle when queries return no features for the map
          if (
            lineResponse.features.length === 0 &&
            areaResponse.features.length === 0 &&
            pointResponse.features.length === 0
          ) {
            setFetchStatus('success');
            setNoMapData(true);

            // pass the layer back up to the parent
            if (typeof onLoad === 'function') {
              onLoad({ status: 'no-data', layer: actionsLayer });
            }

            return;
          }

          function getWaterbodyColor(feature: Object, type: string) {
            // handle Actions page
            if (window.location.pathname.includes('/plan-summary')) {
              if (type === 'area') return [0, 123, 255, 0.75];
              return [0, 123, 255];
            }

            // handle Waterbody Report page
            const overallStatus = feature?.attributes?.overallstatus;
            const condition =
              overallStatus === 'Not Supporting' || overallStatus === 'Cause'
                ? 'Impaired'
                : overallStatus === 'Fully Supporting' ||
                  overallStatus === 'Meeting Criteria'
                ? 'Good'
                : 'Condition Unknown'; // catch all

            const formattedCondition =
              condition === 'Good'
                ? 'good'
                : condition === 'Impaired'
                ? 'polluted'
                : 'unassessed';

            let color = { r: 107, g: 65, b: 149 }; // purple
            if (formattedCondition === 'good') {
              color = { r: 32, g: 128, b: 12 }; // green
            }
            if (formattedCondition === 'polluted') {
              color = { r: 203, g: 34, b: 62 }; // red
            }

            // add transparency for area features
            if (type === 'area') color.a = 0.75;

            return color;
          }

          function createGraphic(feature: Object, type: string) {
            const color = getWaterbodyColor(feature, type);

            let symbol;
            if (type === 'point') {
              symbol = new SimpleMarkerSymbol({
                color,
                style: 'circle',
              });
            }
            if (type === 'line') {
              symbol = new SimpleLineSymbol({
                color,
                style: 'solid',
                width: '2',
              });
            }
            if (type === 'area') {
              symbol = new SimpleFillSymbol({
                color,
                style: 'solid',
              });
            }

            const auId = feature.attributes.assessmentunitidentifier;
            const reportingCycle = feature.attributes.reportingcycle;
            let content;

            // add additional attributes
            if (unitIds[auId]) {
              feature.attributes = {
                ...feature.attributes,
                layerType: 'actions',
                fieldName: 'hmw-extra-content',
              };

              content = getPopupContent({
                feature,
                extraContent: unitIds[auId](reportingCycle, true),
              });
            } else {
              // when no content is provided just display the normal community
              // waterbody content
              content = getPopupContent({ feature });
            }

            return new Graphic({
              geometry: feature.geometry,
              symbol,
              attributes: feature.attributes,
              popupTemplate: {
                title: getPopupTitle(feature.attributes),
                content,
              },
            });
          }

          // add graphics to graphicsLayer based on feature type
          areaResponse.features.forEach((feature) => {
            actionsLayer.graphics.add(createGraphic(feature, 'area'));
          });

          lineResponse.features.forEach((feature) => {
            actionsLayer.graphics.add(createGraphic(feature, 'line'));
          });

          pointResponse.features.forEach((feature) => {
            actionsLayer.graphics.add(createGraphic(feature, 'point'));
          });

          setFetchStatus('success');

          // pass the layer back up to the parent
          if (typeof onLoad === 'function') {
            onLoad({ status: 'success', layer: actionsLayer });
          }
        })
        .catch((err) => {
          console.error(err);
          setFetchStatus('failure');

          // pass the layer back up to the parent
          if (typeof onLoad === 'function') {
            onLoad({ status: 'failure', layer: actionsLayer });
          }
        });
    }

    if (Object.keys(unitIds).length > 0) plotAssessments(unitIds);
  }, [unitIds, actionsLayer, fetchStatus, esriModules, onLoad, services]);

  // Scrolls to the map when switching layouts
  React.useEffect(() => {
    // scroll container or actions map content into view
    // get container or actions map content DOM node to scroll page
    // the layout changes
    const itemName = layout === 'fullscreen' ? 'actionsmap' : 'container';
    const content = document.querySelector(`[data-content="${itemName}"]`);
    if (content) {
      let pos = content.getBoundingClientRect();

      window.scrollTo(
        pos.left + window.pageXOffset,
        pos.top + window.pageYOffset,
      );
    }
  }, [layout]);

  // Zooms to the waterbodies after they are drawn on the map
  const [mapLoading, setMapLoading] = React.useState(true);
  React.useEffect(() => {
    if (
      !fetchStatus ||
      !mapView ||
      !actionsLayer ||
      !homeWidget ||
      fetchStatus === 'fetching'
    ) {
      return;
    }

    const { Viewpoint } = esriModules;

    let zoomParams = actionsLayer.graphics;
    if (
      actionsLayer.graphics.length === 1 &&
      (actionsLayer.graphics.items[0].geometry.type === 'point' ||
        actionsLayer.graphics.items[0].geometry.type === 'multipoint')
    ) {
      // handle zooming to a single point graphic
      zoomParams = {
        target: actionsLayer.graphics,
        zoom: 16, // set zoom 1 higher since it gets decremented later
      };
    }

    mapView.goTo(zoomParams).then(() => {
      // set map zoom and home widget's viewpoint
      mapView.zoom = mapView.zoom - 1;
      homeWidget.viewpoint = new Viewpoint({
        targetGeometry: mapView.extent,
      });
    });

    setMapLoading(false);
  }, [fetchStatus, mapView, actionsLayer, esriModules, homeWidget]);

  if (fetchStatus === 'failure') {
    return (
      <StyledErrorBox>
        <p>{actionMapError}</p>
      </StyledErrorBox>
    );
  }

  if (noMapData) {
    return (
      <StyledInfoBox>
        <p>{actionMapNoData}</p>
      </StyledInfoBox>
    );
  }

  return (
    <Container data-testid="hmw-actions-map">
      <Map
        style={{ position: 'absolute' }}
        loaderOptions={{ url: esriApiUrl }}
        mapProperties={{ basemap: getBasemap() }}
        viewProperties={{ extent: initialExtent, highlightOptions }}
        onLoad={(map: Any, view: Any) => {
          setMapView(view);
        }}
        onFail={(err: Any) => console.error(err)}
      >
        {/* manually passing map and view props to Map component's     */}
        {/* children to satisfy flow, but map and view props are auto  */}
        {/* passed from Map component to its children by react-arcgis  */}
        <MapWidgets
          map={null}
          view={null}
          layers={layers}
          onHomeWidgetRendered={(homeWidget) => {}}
        />

        {/* manually passing map and view props to Map component's         */}
        {/* children to satisfy flow, but map and view props are auto      */}
        {/* passed from Map component to its children by react-arcgis      */}
        <MapMouseEvents map={null} view={null} />
      </Map>
      {mapView && mapLoading && <MapLoadingSpinner />}
    </Container>
  );
}

export default function ActionsMapContainer({ ...props }: Props) {
  return (
    <MapErrorBoundary>
      <EsriModulesContext.Consumer>
        {(esriModules) => <ActionsMap esriModules={esriModules} {...props} />}
      </EsriModulesContext.Consumer>
    </MapErrorBoundary>
  );
}
