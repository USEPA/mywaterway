// @flow
/** @jsxImportSource @emotion/react */

import { useContext, useEffect, useRef, useState } from 'react';
import type { Node } from 'react';
import { css } from '@emotion/react';
import { useNavigate } from 'react-router-dom';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import Viewpoint from '@arcgis/core/Viewpoint';
// components
import Map from 'components/shared/Map';
import MapLoadingSpinner from 'components/shared/MapLoadingSpinner';
import {
  createWaterbodySymbol,
  createUniqueValueInfos,
  getPopupContent,
  getPopupTitle,
} from 'utils/mapFunctions';
import MapErrorBoundary from 'components/shared/ErrorBoundary.MapErrorBoundary';
// styled components
import { errorBoxStyles, infoBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import { useFetchedDataDispatch } from 'contexts/FetchedData';
import { useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useMapHighlightState } from 'contexts/MapHighlight';
import {
  useServicesContext,
  useStateNationalUsesContext,
} from 'contexts/LookupFiles';
// helpers
import {
  useCyanWaterbodiesLayers,
  useDischargersLayers,
  useMonitoringLocationsLayers,
  useSharedLayers,
  useStreamgageLayers,
  useWaterbodyHighlight,
} from 'utils/hooks';
import { browserIsCompatibleWithArcGIS } from 'utils/utils';
// errors
import {
  esriMapLoadingFailure,
  huc12SummaryError,
  stateNoGisDataError,
} from 'config/errorMessages';

let selectedGraphicGlobal = null;

const mapPadding = 20;

const containerStyles = css`
  display: flex;
  position: relative;
  border: 1px solid #aebac3;
  background-color: #fff;
  overflow: hidden;
`;

// --- components ---
type Props = {
  windowHeight: number,
  windowWidth: number,
  filter: string,
  activeState: Object,
  numberOfRecords: number,
  children?: Node,
};

function StateMap({
  windowHeight,
  windowWidth,
  filter,
  activeState,
  numberOfRecords,
  children,
}: Props) {
  const fetchedDataDispatch = useFetchedDataDispatch();
  const navigate = useNavigate();

  const services = useServicesContext();
  const stateNationalUses = useStateNationalUsesContext();

  const { selectedGraphic } = useMapHighlightState();

  const { homeWidget, mapView, resetData } = useContext(LocationSearchContext);

  const {
    resetLayers,
    setLayer,
    setResetHandler,
    updateVisibleLayers,
    waterbodyAreas,
    waterbodyLayer,
    waterbodyLines,
    waterbodyPoints,
  } = useLayers();

  const [layers, setLayers] = useState(null);

  const [noGisDataAvailable, setNoGisDataAvailable] = useState(false);
  const [stateMapLoadError, setStateMapLoadError] = useState(false);

  const { surroundingMonitoringLocationsLayer } =
    useMonitoringLocationsLayers();
  const { surroundingCyanLayer } = useCyanWaterbodiesLayers();
  const { surroundingUsgsStreamgagesLayer } = useStreamgageLayers();
  const { surroundingDischargersLayer } = useDischargersLayers();
  const getSharedLayers = useSharedLayers();
  useWaterbodyHighlight(false);

  // Initializes the layers
  const [layersInitialized, setLayersInitialized] = useState(false);
  useEffect(() => {
    if (!getSharedLayers || layersInitialized) return;

    const popupTemplate = {
      outFields: ['*'],
      title: (feature) => getPopupTitle(feature.graphic.attributes),
      content: (feature) =>
        getPopupContent({
          feature: feature.graphic,
          navigate,
          services,
          stateNationalUses,
        }),
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
    const waterbodyPoints = new FeatureLayer({
      url: services.data.waterbodyService.points,
      definitionExpression: 'objectid = 0', //hide everything at first
      outFields: ['*'],
      renderer: pointsRenderer,
      popupTemplate,
    });
    setLayer('waterbodyPoints', waterbodyPoints);
    setResetHandler('waterbodyPoints', () => {
      setLayer('waterbodyPoints', null);
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
      url: services.data.waterbodyService.lines,
      definitionExpression: 'objectid = 0', //hide everything at first
      outFields: ['*'],
      renderer: linesRenderer,
      popupTemplate,
    });
    setLayer('waterbodyLines', waterbodyLines);
    setResetHandler('waterbodyLines', () => {
      setLayer('waterbodyLines', null);
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
      url: services.data.waterbodyService.areas,
      definitionExpression: 'objectid = 0', //hide everything at first
      outFields: ['*'],
      renderer: areasRenderer,
      popupTemplate,
    });
    setLayer('waterbodyAreas', waterbodyAreas);
    setResetHandler('waterbodyAreas', () => {
      setLayer('waterbodyAreas', null);
    });

    // Make the waterbody layer into a single layer
    const waterbodyLayer = new GroupLayer({
      id: 'waterbodyLayer',
      title: 'Waterbodies',
      listMode: 'hide',
      visible: false,
      legendEnabled: false,
    });
    waterbodyLayer.addMany([waterbodyAreas, waterbodyLines, waterbodyPoints]);
    setLayer('waterbodyLayer', waterbodyLayer);
    setResetHandler('waterbodyLayer', () => {
      waterbodyLayer?.layers.removeAll();
      setLayer('waterbodyLayer', null);
    });

    setLayers([
      ...getSharedLayers(),
      surroundingCyanLayer,
      surroundingDischargersLayer,
      surroundingMonitoringLocationsLayer,
      surroundingUsgsStreamgagesLayer,
      waterbodyLayer,
    ]);

    updateVisibleLayers({ waterbodyLayer: true });

    setLayersInitialized(true);
  }, [
    getSharedLayers,
    setLayer,
    setResetHandler,
    layersInitialized,
    services,
    stateNationalUses,
    surroundingCyanLayer,
    surroundingDischargersLayer,
    surroundingMonitoringLocationsLayer,
    surroundingUsgsStreamgagesLayer,
    updateVisibleLayers,
    navigate,
  ]);

  // Keep track of when the component is unmounting for use elsewhere
  const unmounting = useRef(false);
  useEffect(() => {
    return function cleanup() {
      unmounting.current = true;
    };
  }, []);

  // Resets the LocationSearch context when the map is removed
  useEffect(() => {
    return function cleanup() {
      if (unmounting.current) {
        fetchedDataDispatch({ type: 'reset' });
        resetData();
        resetLayers();
      }
    };
  }, [fetchedDataDispatch, resetData, resetLayers]);

  const [lastFilter, setLastFilter] = useState('');

  // keep the selectedGraphicGlobal variable up to date
  useEffect(() => {
    selectedGraphicGlobal = selectedGraphic;
  }, [selectedGraphic]);

  // cDU
  // detect when user changes their search
  const [homeWidgetSet, setHomeWidgetSet] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  useEffect(() => {
    // query geocode server for every new search
    if (
      filter !== lastFilter &&
      mapView &&
      waterbodyPoints &&
      waterbodyLines &&
      waterbodyAreas &&
      homeWidget &&
      numberOfRecords
    ) {
      setLastFilter(filter);
      setNoGisDataAvailable(false);
      setStateMapLoadError(false);

      // change the where clause of the feature layers
      if (!filter) return;
      if (filter) {
        waterbodyPoints.definitionExpression = filter;
        waterbodyLines.definitionExpression = filter;
        waterbodyAreas.definitionExpression = filter;
      }

      function handleError(err) {
        console.error(err);
        setStateMapLoadError(true);
      }

      function queryExtent(layer) {
        return new Promise((resolve, reject) => {
          mapView
            .whenLayerView(layer)
            .then((layerView) => {
              reactiveUtils
                .whenOnce(() => !layerView.updating)
                .then(() => {
                  resolve(layer.queryExtent());
                })
                .catch((err) => reject(err));
            })
            .catch((err) => reject(err));
        });
      }

      // zoom and set the home widget viewpoint
      let fullExtent = null;
      // get the points layer extent
      queryExtent(waterbodyPoints)
        .then((pointsExtent) => {
          // set the extent if 1 or more features
          if (pointsExtent.count > 0) fullExtent = pointsExtent.extent;

          // get the lines layer extent
          queryExtent(waterbodyLines)
            .then((linesExtent) => {
              // set the extent or union the extent if 1 or more features
              if (linesExtent.count > 0) {
                if (fullExtent) fullExtent.union(linesExtent.extent);
                else fullExtent = linesExtent.extent;
              }

              // get the areas layer extent
              queryExtent(waterbodyAreas)
                .then((areasExtent) => {
                  // set the extent or union the extent if 1 or more features
                  if (areasExtent.count > 0) {
                    if (fullExtent) fullExtent.union(areasExtent.extent);
                    else fullExtent = areasExtent.extent;
                  }

                  // if there is an extent then zoom to it and set the home widget
                  if (fullExtent) {
                    let zoomParams = fullExtent;
                    let homeParams = { targetGeometry: fullExtent };
                    if (!selectedGraphicGlobal) {
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
                      setMapLoading(false);
                    }

                    // only set the home widget if the user selects a different state
                    if (!homeWidgetSet) {
                      homeWidget.viewpoint = new Viewpoint(homeParams);
                      setHomeWidgetSet(true);
                    }
                  } else {
                    setMapLoading(false);
                    setNoGisDataAvailable(true);
                  }
                })
                .catch(handleError);
            })
            .catch(handleError);
        })
        .catch(handleError);
    }
  }, [
    waterbodyAreas,
    filter,
    homeWidget,
    homeWidgetSet,
    lastFilter,
    waterbodyLines,
    mapView,
    numberOfRecords,
    waterbodyPoints,
    stateMapLoadError,
    waterbodyLayer,
  ]);

  // Used to tell if the homewidget has been set to the selected state.
  // This will reset the value when the user selects a different state.
  useEffect(() => {
    setHomeWidgetSet(false);
  }, [activeState]);

  useEffect(() => {
    // scroll community content into view
    // get community content DOM node to scroll page when form is submitted
    const mapInputs = document.querySelector(`[data-content="stateinputs"]`);

    if (mapInputs) {
      mapInputs.scrollIntoView();
    }
  }, [windowHeight, windowWidth]);

  // calculate height of div holding the footer content
  const mapInputs = document.querySelector(`[data-content="stateinputs"]`);
  const mapInputsHeight = mapInputs?.getBoundingClientRect().height;

  // jsx
  const mapContent = (
    <>
      <div
        data-content="statemap"
        css={css`
          ${containerStyles};
          height: ${windowHeight - mapInputsHeight - 3 * mapPadding}px;
        `}
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
        >
          {children}
        </Map>
        {mapView && mapLoading && <MapLoadingSpinner />}
      </div>
    </>
  );

  // track Esri map load errors for older browsers and devices that do not support ArcGIS 4.x
  if (!browserIsCompatibleWithArcGIS()) {
    return <div css={errorBoxStyles}>{esriMapLoadingFailure}</div>;
  }

  if (stateMapLoadError) {
    return <div css={errorBoxStyles}>{huc12SummaryError}</div>;
  }

  if (noGisDataAvailable) {
    return (
      <div css={infoBoxStyles}>{stateNoGisDataError(activeState.label)}</div>
    );
  }

  return mapContent;
}

export default function StateMapContainer({ ...props }: Props) {
  return (
    <MapErrorBoundary>
      <StateMap {...props} />
    </MapErrorBoundary>
  );
}
