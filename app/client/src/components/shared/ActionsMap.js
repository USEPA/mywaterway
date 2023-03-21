import React, { useCallback, useContext, useEffect, useState } from 'react';
import { css } from 'styled-components/macro';
import { useNavigate } from 'react-router-dom';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import * as query from '@arcgis/core/rest/query';
import Viewpoint from '@arcgis/core/Viewpoint';
// components
import Map from 'components/shared/Map';
import MapLoadingSpinner from 'components/shared/MapLoadingSpinner';
import MapErrorBoundary from 'components/shared/ErrorBoundary.MapErrorBoundary';
// styled components
import { errorBoxStyles, infoBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import { useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// helpers
import { fetchCheck } from 'utils/fetchUtils';
import {
  useSharedLayers,
  useMonitoringLocationsLayers,
  useWaterbodyHighlight,
} from 'utils/hooks';
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

const containerStyles = css`
  display: flex;
  position: relative;
  border: 1px solid #aebac3;
  height: 100%;
`;

const imageContainerStyles = css`
  padding: 1rem;
`;

const imageStyles = css`
  width: 100%;
  height: auto;
`;

// --- components ---
type Props = {
  layout: 'narrow' | 'wide' | 'fullscreen',
  unitIds: Array<string>,
  onLoad: ?Function,
  includePhoto?: boolean,
};

function ActionsMap({ layout, unitIds, onLoad, includePhoto }: Props) {
  const navigate = useNavigate();

  const { homeWidget, mapView } = useContext(LocationSearchContext);

  const { actionsWaterbodies, setLayer, updateVisibleLayers } = useLayers();

  const [layers, setLayers] = useState(null);

  const services = useServicesContext();
  const getSharedLayers = useSharedLayers();
  useWaterbodyHighlight();

  const { monitoringLocationsLayer, surroundingMonitoringLocationsLayer } =
    useMonitoringLocationsLayers();

  // Initially sets up the layers
  const [layersInitialized, setLayersInitialized] = useState(false);
  useEffect(() => {
    if (!getSharedLayers || layersInitialized) return;

    let localActionsLayer = actionsWaterbodies;
    if (!actionsWaterbodies) {
      localActionsLayer = new GraphicsLayer({
        id: 'actionsWaterbodies',
        title: 'Waterbodies',
        listMode: 'hide',
        visible: true,
        legendEnabled: false,
      });
      setLayer('actionsWaterbodies', localActionsLayer);
    }

    setLayers([
      ...getSharedLayers(),
      localActionsLayer,
      monitoringLocationsLayer,
      surroundingMonitoringLocationsLayer,
    ]);
    updateVisibleLayers({
      actionsWaterbodies: true,
    });
    setLayersInitialized(true);
  }, [
    actionsWaterbodies,
    getSharedLayers,
    layersInitialized,
    monitoringLocationsLayer,
    setLayer,
    surroundingMonitoringLocationsLayer,
    updateVisibleLayers,
  ]);

  const [fetchStatus, setFetchStatus] = useState('');

  // Queries the Gis service and plots the waterbodies on the map
  const [noMapData, setNoMapData] = useState(null);

  const getPhotoLink = useCallback(
    async (orgId, auId) => {
      if (!auId || !orgId) return null;
      if (services.status !== 'success') return null;
      const url =
        services.data.attains.serviceUrl +
        `assessmentUnits?organizationId=${orgId}` +
        `&assessmentUnitIdentifier=${auId}`;
      const results = await fetchCheck(url);
      if (!results.items?.length) return null;
      const documents = results.items[0]?.assessmentUnits[0]?.documents;
      const allowedTypes = [
        'apng',
        'bmp',
        'gif',
        'jpeg',
        'png',
        'svg+xml',
        'tiff',
        'x-tiff',
        'x-windows-bmp',
      ].map((imageType) => `image/${imageType}`);
      const photo =
        documents &&
        documents.find((document) =>
          allowedTypes.includes(document.documentFileType),
        );
      return photo ? photo.documentURL : null;
    },
    [services],
  );

  // Plots the assessments. Also re-plots if the layout changes
  useEffect(() => {
    if (!unitIds || !actionsWaterbodies) return;
    if (fetchStatus) return; // only do a fetch if there is no status

    function plotAssessments(unitIds: Array<string>) {
      setFetchStatus('fetching');
      actionsWaterbodies.graphics.removeAll();

      // set up ESRI Queries for ATTAINS lines, area, and points web services
      const linesUrl = services.data.waterbodyService.lines;
      const areasUrl = services.data.waterbodyService.areas;
      const pointsUrl = services.data.waterbodyService.points;

      const auIds = Object.keys(unitIds).join("','");
      const queryParams = {
        returnGeometry: true,
        outFields: ['*'],
        where: `assessmentunitidentifier in ('${auIds}')`,
      };

      const linePromise = query.executeQueryJSON(linesUrl, queryParams);
      const areaPromise = query.executeQueryJSON(areasUrl, queryParams);
      const pointPromise = query.executeQueryJSON(pointsUrl, queryParams);

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
              onLoad({ status: 'no-data', layer: actionsWaterbodies });
            }

            return;
          }

          function getWaterbodySymbol(feature: Object, type: string) {
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

          async function createGraphic(feature: Object, type: string) {
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
                navigate,
              });
            } else if (includePhoto) {
              const photoLink = await getPhotoLink(
                feature.attributes.organizationid,
                feature.attributes.assessmentunitidentifier,
              );

              const extraContent = photoLink && (
                <div css={imageContainerStyles}>
                  <img
                    css={imageStyles}
                    src={photoLink}
                    alt={feature.attributes.assessmentunitname}
                  />
                </div>
              );
              content = getPopupContent({
                feature,
                extraContent,
                navigate,
              });
            } else {
              // when no content is provided just display the normal community
              // waterbody content
              content = getPopupContent({ feature, navigate });
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

          function addGraphics(areaFeatures, lineFeatures, pointFeatures) {
            // add graphics to graphicsLayer based on feature type
            const areaPromises = areaFeatures.map((feature) => {
              return createGraphic(feature, 'polygon');
            });

            const linePromises = lineFeatures.map((feature) => {
              return createGraphic(feature, 'polyline');
            });

            const pointPromises = pointFeatures.map((feature) => {
              return createGraphic(feature, 'point');
            });

            return Promise.all([
              ...areaPromises,
              ...linePromises,
              ...pointPromises,
            ]);
          }

          addGraphics(
            areaResponse.features,
            lineResponse.features,
            pointResponse.features,
          ).then((graphics) => {
            graphics.forEach((graphic) =>
              actionsWaterbodies.graphics.add(graphic),
            );

            setFetchStatus('success');

            // pass the layer back up to the parent
            if (typeof onLoad === 'function') {
              onLoad({ status: 'success', layer: actionsWaterbodies });
            }
          });
        })
        .catch((err) => {
          console.error(err);
          setFetchStatus('failure');

          // pass the layer back up to the parent
          if (typeof onLoad === 'function') {
            onLoad({ status: 'failure', layer: actionsWaterbodies });
          }
        });
    }

    if (Object.keys(unitIds).length > 0) plotAssessments(unitIds);
  }, [
    actionsWaterbodies,
    fetchStatus,
    getPhotoLink,
    navigate,
    onLoad,
    includePhoto,
    services,
    unitIds,
  ]);

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
      !actionsWaterbodies ||
      !homeWidget ||
      fetchStatus === 'fetching'
    ) {
      return;
    }

    let zoomParams = actionsWaterbodies.graphics;
    if (
      actionsWaterbodies.graphics.length === 1 &&
      (actionsWaterbodies.graphics.items[0].geometry.type === 'point' ||
        actionsWaterbodies.graphics.items[0].geometry.type === 'multipoint')
    ) {
      // handle zooming to a single point graphic
      zoomParams = {
        target: actionsWaterbodies.graphics,
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
  }, [fetchStatus, mapView, actionsWaterbodies, homeWidget]);

  // track Esri map load errors for older browsers and devices that do not support ArcGIS 4.x
  if (!browserIsCompatibleWithArcGIS()) {
    return <div css={errorBoxStyles}>{esriMapLoadingFailure}</div>;
  }

  if (fetchStatus === 'failure') {
    return (
      <div css={errorBoxStyles}>
        <p>{actionMapError}</p>
      </div>
    );
  }

  if (noMapData) {
    return (
      <div css={infoBoxStyles}>
        <p>{actionMapNoData}</p>
      </div>
    );
  }

  return (
    <div css={containerStyles} data-testid="hmw-actions-map">
      <Map layers={layers} />
      {mapView && mapLoading && <MapLoadingSpinner />}
    </div>
  );
}

export default function ActionsMapContainer({ ...props }: Props) {
  return (
    <MapErrorBoundary>
      <ActionsMap {...props} />
    </MapErrorBoundary>
  );
}
