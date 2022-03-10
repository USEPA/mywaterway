import React, { useContext, useEffect, useState } from 'react';
import styled from 'styled-components';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Query from '@arcgis/core/rest/support/Query';
import QueryTask from '@arcgis/core/tasks/QueryTask';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import Viewpoint from '@arcgis/core/Viewpoint';
// components
import Map from 'components/shared/Map';
import MapLoadingSpinner from 'components/shared/MapLoadingSpinner';
import MapErrorBoundary from 'components/shared/ErrorBoundary.MapErrorBoundary';
// styled components
import { StyledErrorBox, StyledInfoBox } from 'components/shared/MessageBoxes';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// helpers
import { useSharedLayers, useWaterbodyHighlight } from 'utils/hooks';
import { browserIsCompatibleWithArcGIS } from 'utils/utils';
import {
  createWaterbodySymbol,
  getPopupTitle,
  getPopupContent,
  getWaterbodyCondition,
} from 'utils/mapFunctions';
// errors
import {
  actionMapError,
  actionMapNoData,
  esriMapLoadingFailure,
} from 'config/errorMessages';

// --- styled components ---
const Container = styled.div`
  display: flex;
  position: relative;
  border: 1px solid #aebac3;
  height: 100%;
`;

// --- components ---
type Props = {
  layout: 'narrow' | 'wide' | 'fullscreen',
  unitIds: Array<string>,
  onLoad: ?Function,
};

function ActionsMap({ layout, unitIds, onLoad }: Props) {
  const { actionsLayer, homeWidget, mapView, setActionsLayer } = useContext(
    LocationSearchContext,
  );

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

    let localActionsLayer = actionsLayer;
    if (!actionsLayer) {
      localActionsLayer = new GraphicsLayer({
        id: 'actionsWaterbodies',
        title: 'Waterbodies',
        listMode: 'hide',
        visible: true,
        legendEnabled: false,
      });
      setActionsLayer(localActionsLayer);
    }

    setLayers([...getSharedLayers(), localActionsLayer]);

    setLayersInitialized(true);
  }, [actionsLayer, setActionsLayer, getSharedLayers, layersInitialized]);

  const [fetchStatus, setFetchStatus] = useState('');

  // Queries the Gis service and plots the waterbodies on the map
  const [noMapData, setNoMapData] = useState(null);

  // Plots the assessments. Also re-plots if the layout changes
  useEffect(() => {
    if (!unitIds || !actionsLayer) return;
    if (fetchStatus) return; // only do a fetch if there is no status

    function plotAssessments(unitIds: Array<string>) {
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

          function getWaterbodySymbol(feature: Object, type: string) {
            // handle Actions page
            if (window.location.pathname.includes('/plan-summary')) {
              let color = { r: 0, g: 123, b: 255 };
              if (type === 'polygon') color.a = 0.75;

              let planSummarySymbol;
              if (type === 'point') {
                planSummarySymbol = new SimpleMarkerSymbol({
                  color,
                  style: 'circle',
                });
              }
              if (type === 'polyline') {
                planSummarySymbol = new SimpleLineSymbol({
                  color,
                  style: 'solid',
                  width: '2',
                });
              }
              if (type === 'polygon') {
                planSummarySymbol = new SimpleFillSymbol({
                  color,
                  style: 'solid',
                });
              }

              return planSummarySymbol;
            }

            // handle Waterbody Report page
            const condition = getWaterbodyCondition(
              feature.attributes,
            ).condition;

            return createWaterbodySymbol({
              condition: condition,
              selected: false,
              geometryType: type,
            });
          }

          function createGraphic(feature: Object, type: string) {
            const symbol = getWaterbodySymbol(feature, type);

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
            actionsLayer.graphics.add(createGraphic(feature, 'polygon'));
          });

          lineResponse.features.forEach((feature) => {
            actionsLayer.graphics.add(createGraphic(feature, 'polyline'));
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
  }, [unitIds, actionsLayer, fetchStatus, onLoad, services]);

  // Scrolls to the map when switching layouts
  useEffect(() => {
    // scroll container or actions map content into view
    // get container or actions map content DOM node to scroll page
    // the layout changes
    const itemName = layout === 'fullscreen' ? 'actionsmap' : 'container';
    const content = document.querySelector(`[data-content="${itemName}"]`);
    if (content) {
      let pos = content.getBoundingClientRect();

      window.scrollTo(pos.left + window.scrollX, pos.top + window.scrollY);
    }
  }, [layout]);

  // Zooms to the waterbodies after they are drawn on the map
  const [mapLoading, setMapLoading] = useState(true);
  useEffect(() => {
    if (
      !fetchStatus ||
      !mapView ||
      !actionsLayer ||
      !homeWidget ||
      fetchStatus === 'fetching'
    ) {
      return;
    }

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
  }, [fetchStatus, mapView, actionsLayer, homeWidget]);

  // check for browser compatibility with map
  if (!browserIsCompatibleWithArcGIS() && !actionsMapLoadError) {
    setActionsMapLoadError(true);
  }

  if (actionsMapLoadError) {
    return <StyledErrorBox>{esriMapLoadingFailure}</StyledErrorBox>;
  }

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
      <Map layers={layers} />
      {mapView && mapLoading && <MapLoadingSpinner />}
    </Container>
  );
}

export default function ActionsMapContainer({ ...props }: Props) {
  return (
    <MapErrorBoundary>
      <ActionsMap {...props} />
    </MapErrorBoundary>
  );
}
