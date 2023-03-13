import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Color from '@arcgis/core/Color';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import Handles from '@arcgis/core/core/Handles';
import MapImageLayer from '@arcgis/core/layers/MapImageLayer';
import Map from '@arcgis/core/Map';
import Point from '@arcgis/core/geometry/Point';
import Polygon from '@arcgis/core/geometry/Polygon';
import ClassBreaksRenderer from '@arcgis/core/renderers/ClassBreaksRenderer';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import UniqueValueRenderer from '@arcgis/core/renderers/UniqueValueRenderer';
import UniqueValueInfo from '@arcgis/core/renderers/support/UniqueValueInfo';
import * as query from '@arcgis/core/rest/query';
import Query from '@arcgis/core/rest/support/Query';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import WMSLayer from '@arcgis/core/layers/WMSLayer';
// contexts
import { useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useMapHighlightState } from 'contexts/MapHighlight';
import { useServicesContext } from 'contexts/LookupFiles';
import { isBoundariesToggleLayerId } from 'contexts/Surroundings';
// utilities
import { getEnclosedLayer } from './boundariesToggleLayer';
import {
  createWaterbodySymbol,
  createUniqueValueInfos,
  createUniqueValueInfosRestore,
  getPopupContent,
  getPopupTitle,
  getHighlightSymbol,
  graphicComparison,
  isGraphicsLayer,
  isGroupLayer,
  isHighlightLayerView,
  isPoint,
  openPopup,
  shallowCompare,
} from 'utils/mapFunctions';
// types
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type {
  ClickedHucState,
  ExtendedGraphic,
  ExtendedLayer,
  Feature,
} from 'types';

let dynamicPopupFields: __esri.Field[] = [];

const allWaterbodiesAlpha = {
  base: 1,
  poly: 0.4,
  outline: 1,
};

// Closes the map popup and clears highlights whenever the user changes
// tabs. This function is called from the useWaterbodyHighlight hook (handles
// tab changes) and from the use useWaterbodyOnMap hook (handles sub tab changes
// and the "Display By" dropdown on the state page).
interface ClosePopupParams {
  mapView: __esri.MapView;
  setHighlightedGraphic: Dispatch<SetStateAction<__esri.Graphic | null>>;
  setSelectedGraphic: Dispatch<SetStateAction<__esri.Graphic | null>>;
}

function closePopup({
  mapView,
  setHighlightedGraphic,
  setSelectedGraphic,
}: ClosePopupParams) {
  // remove highlights
  setHighlightedGraphic(null);
  setSelectedGraphic(null);

  // close the popup
  if (mapView) mapView.popup.close();
}

// Gets all features in the layer that match the provided organizationid and
// assessmentunitidentifier. Any features found are added to the provided
// features array.
function getMatchingFeatures(
  features: ExtendedGraphic[],
  layerData: { features: ExtendedGraphic[] } | null,
  organizationid: string,
  assessmentunitidentifier: string,
) {
  layerData?.features?.forEach((feature) => {
    if (
      feature.attributes.organizationid === organizationid &&
      feature.attributes.assessmentunitidentifier === assessmentunitidentifier
    ) {
      features.push(feature);
    }
  });
}

// Highlights the feature either by adding a graphic to the view.graphics
// collection or by using the layerView.highlight function. The view.graphics
// method is used if the feature has an "originalGeometry" attribute, which
// indicates that this feature has been clipped and the highlighting should
// use the full original feature.
interface HighlightFeatureParams {
  mapView: __esri.MapView;
  features: Array<ExtendedGraphic>;
  highlightOptions: __esri.MapViewHighlightOptions;
  handles: Handles;
  group: string;
  layer?: __esri.Layer | null;
  callback?: ((feature: __esri.Graphic) => void) | null;
}

function highlightFeature({
  mapView,
  features,
  highlightOptions,
  handles,
  group,
  layer = null,
  callback = null,
}: HighlightFeatureParams) {
  features.forEach((feature) => {
    if (feature.originalGeometry) {
      const symbol = getHighlightSymbol(
        feature.originalGeometry,
        highlightOptions,
      );
      if (!symbol) return;
      mapView.graphics.add(
        new Graphic({
          ...feature,
          geometry: feature.originalGeometry,
          symbol,
        }),
      );
    } else {
      mapView
        .whenLayerView(layer ?? feature.layer)
        .then((layerView) => {
          if (!isHighlightLayerView(layerView)) return;
          const highlightObject = layerView.highlight(feature);
          handles.add(highlightObject, group);
          if (callback) callback(feature);
        })
        .catch((err) => console.error(err));
    }
  });
}

// TODO: Migrate to this hook, the other doesn't properly reset
function useAbort() {
  const abortController = useRef(new AbortController());
  const getAbortController = useCallback(() => {
    if (abortController.current.signal.aborted) {
      abortController.current = new AbortController();
    }
    return abortController.current;
  }, []);

  const abort = useCallback(() => {
    getAbortController().abort();
  }, [getAbortController]);

  useEffect(() => {
    return function cleanup() {
      abortController.current.abort();
    };
  }, [getAbortController]);

  const getSignal = useCallback(
    () => getAbortController().signal,
    [getAbortController],
  );

  return { abort, getSignal };
}

function useAbortSignal() {
  const abortController = useRef(new AbortController());

  useEffect(() => {
    if (abortController.current.signal.aborted) {
      abortController.current = new AbortController();
    }
  }, [abortController.current.signal.aborted]);

  useEffect(() => {
    return function abort() {
      abortController.current.abort();
    };
  }, []);

  return abortController.current.signal;
}

// custom hook that combines lines, area, and points features from context,
// and returns the combined features
function useWaterbodyFeatures() {
  const {
    linesData,
    areasData,
    pointsData,
    huc12,
    waterbodyCountMismatch,
    orphanFeatures,
  } = useContext(LocationSearchContext);
  const { erroredLayers } = useLayers();

  const [features, setFeatures] = useState<__esri.Graphic[] | null>(null);

  const [lastHuc12, setLastHuc12] = useState<string | null>(null);
  useEffect(() => {
    // Ensure the lastHuc12 is reset when huc12 is reset.
    // This is to prevent issues of searching for the same huc
    // causing the waterbodies data to never load in.
    if (huc12 === '' && lastHuc12 !== '') setLastHuc12(huc12);

    // wait until waterbodies data is set in context
    if (
      !linesData ||
      !areasData ||
      !pointsData ||
      waterbodyCountMismatch === null ||
      (waterbodyCountMismatch === true &&
        orphanFeatures &&
        orphanFeatures.status === 'fetching')
    ) {
      if (features) setFeatures(null);
      return;
    }

    if (
      erroredLayers.areasLayer ||
      erroredLayers.linesLayer ||
      erroredLayers.pointsLayer ||
      orphanFeatures.status === 'error'
    ) {
      if (!features || features.length !== 0) setFeatures([]);
      return;
    }
    if (huc12 === lastHuc12) return;

    setLastHuc12(huc12);

    // combine lines, area, and points features
    let featuresArray: Array<__esri.Graphic> = [];
    if (linesData.features && linesData.features.length > 0) {
      featuresArray = featuresArray.concat(linesData.features);
    }
    if (areasData.features && areasData.features.length > 0) {
      featuresArray = featuresArray.concat(areasData.features);
    }
    if (pointsData.features && pointsData.features.length > 0) {
      featuresArray = featuresArray.concat(pointsData.features);
    }
    if (
      orphanFeatures.status === 'success' &&
      orphanFeatures.features.length > 0
    ) {
      featuresArray = featuresArray.concat(orphanFeatures.features);
    }
    setFeatures(featuresArray);
  }, [
    linesData,
    areasData,
    erroredLayers,
    pointsData,
    features,
    huc12,
    lastHuc12,
    waterbodyCountMismatch,
    orphanFeatures,
  ]);

  return features;
}

// custom hook that combines lines, area, and points features from context,
// and returns the combined features
function useWaterbodyFeaturesState() {
  const { waterbodyData } = useContext(LocationSearchContext);

  const [features, setFeatures] = useState<__esri.Graphic[] | null>(null);

  useEffect(() => {
    // if features has already been set, don't set again
    if (waterbodyData && features) return;

    // wait until waterbodies data is set in context
    if (!waterbodyData) {
      if (features) setFeatures(null);
      return;
    }

    // combine lines, area, and points features
    let featuresArray: Array<__esri.Graphic> = [];
    if (waterbodyData.features && waterbodyData.features.length > 0) {
      featuresArray = featuresArray.concat(waterbodyData.features);
    }
    setFeatures(featuresArray);
  }, [features, waterbodyData]);

  return features;
}

// custom hook that when given an (optional) waterbody attribute name,
// draws waterbodies on the map
type WaterbodyCondition =
  | 'hidden'
  | 'unassessed'
  | 'good'
  | 'polluted'
  | 'nostatus';

function useWaterbodyOnMap(
  attributeName: string = '',
  allWaterbodiesAttribute: string = '',
  defaultCondition: WaterbodyCondition = 'hidden',
) {
  const { setHighlightedGraphic, setSelectedGraphic } = useMapHighlightState();
  const { mapView } = useContext(LocationSearchContext);
  const {
    allWaterbodiesLayer,
    areasLayer,
    erroredLayers,
    linesLayer,
    pointsLayer,
  } = useLayers();

  const setRenderer = useCallback(
    (layer, geometryType, attribute, alpha = null) => {
      const renderer = new UniqueValueRenderer({
        defaultSymbol: createWaterbodySymbol({
          condition: defaultCondition,
          selected: false,
          geometryType,
          alpha,
        }),
        field: attribute ? attribute : 'overallstatus',
        fieldDelimiter: ', ',
        uniqueValueInfos: createUniqueValueInfos(geometryType, alpha).map(
          (info) => new UniqueValueInfo(info),
        ),
      });

      // for the restore tab use 3 fields for the unique value renderer
      if (attribute === 'restoreTab') {
        renderer.field = 'hasalternativeplan';
        renderer.field2 = 'hastmdl';
        renderer.field3 = 'has4bplan';
        renderer.uniqueValueInfos = createUniqueValueInfosRestore(
          geometryType,
          alpha,
        ).map((info) => new UniqueValueInfo(info));
      }

      layer.renderer = renderer;

      // close popup and clear highlights when the renderer changes
      closePopup({ mapView, setHighlightedGraphic, setSelectedGraphic });
    },
    [defaultCondition, mapView, setHighlightedGraphic, setSelectedGraphic],
  );

  useEffect(() => {
    if (!pointsLayer || erroredLayers.pointsLayer) return;
    setRenderer(pointsLayer, 'point', attributeName);
  }, [attributeName, erroredLayers, pointsLayer, setRenderer]);

  useEffect(() => {
    if (!linesLayer || erroredLayers.linesLayer) return;
    setRenderer(linesLayer, 'polyline', attributeName);
  }, [attributeName, erroredLayers, linesLayer, setRenderer]);

  useEffect(() => {
    if (!areasLayer || erroredLayers.areasLayer) return;
    setRenderer(areasLayer, 'polygon', attributeName);
  }, [attributeName, areasLayer, erroredLayers, setRenderer]);

  useEffect(() => {
    if (!allWaterbodiesLayer) return;

    const layers = allWaterbodiesLayer.layers;
    const attribute = allWaterbodiesAttribute
      ? allWaterbodiesAttribute
      : attributeName;

    setRenderer(layers.at(2), 'point', attribute, allWaterbodiesAlpha);
    setRenderer(layers.at(1), 'polyline', attribute, allWaterbodiesAlpha);
    setRenderer(layers.at(0), 'polygon', attribute, allWaterbodiesAlpha);
  }, [
    allWaterbodiesAttribute,
    attributeName,
    allWaterbodiesLayer,
    setRenderer,
  ]);
}

// custom hook that is used to highlight based on context. If the findOthers
// parameter is true, this will also attempt to highlight waterbodies on
// other layers that have the same organization id and assessment unit id.
function useWaterbodyHighlight(findOthers: boolean = true) {
  const { highlightedGraphic, selectedGraphic } = useMapHighlightState();
  const { mapView, huc12, highlightOptions, pointsData, linesData, areasData } =
    useContext(LocationSearchContext);

  const {
    areasLayer, //part of waterbody group layer
    actionsLayer,
    dischargersLayer,
    erroredLayers,
    issuesLayer,
    linesLayer, //part of waterbody group layer
    monitoringLocationsLayer,
    nonprofitsLayer,
    pointsLayer, //part of waterbody group layer
    protectedAreasLayer,
    protectedAreasHighlightLayer,
    upstreamLayer,
    usgsStreamgagesLayer,
    wildScenicRiversLayer,
  } = useLayers();

  const services = useServicesContext();
  const navigate = useNavigate();

  // Handles zooming to a selected graphic when "View on Map" is clicked.
  useEffect(() => {
    if (
      !mapView ||
      !selectedGraphic ||
      !selectedGraphic.attributes ||
      !selectedGraphic.attributes.zoom ||
      services.status === 'fetching'
    ) {
      return;
    }

    // get the parameters for the zoom call
    const geometry =
      selectedGraphic.originalGeometry ?? selectedGraphic.geometry;
    if (!geometry) return;

    let params: __esri.Geometry | { target: __esri.Geometry; zoom: number } =
      geometry;
    if (isPoint(geometry)) {
      params = {
        target: new Point({
          latitude: geometry.latitude,
          longitude: geometry.longitude,
        }),
        zoom: 18, // need to set the zoom level for points
      };
    }

    // perform the zoom and return the Promise
    mapView.goTo(params).then(() => {
      openPopup(
        mapView,
        selectedGraphic,
        dynamicPopupFields,
        services,
        navigate,
      );
    });
  }, [mapView, selectedGraphic, services, navigate]);

  // Initializes a handles object for more efficient handling of highlight handlers
  const [handles, setHandles] = useState<Handles | null>(null);
  useEffect(() => {
    if (handles) return;

    setHandles(new Handles());
  }, [handles]);

  type HighlightState = {
    currentHighlight: ExtendedGraphic | null;
    currentSelection: ExtendedGraphic | null;
  };
  const [highlightState, setHighlightState] = useState<HighlightState>({
    currentHighlight: null,
    currentSelection: null,
  });

  useEffect(() => {
    setHighlightState({
      currentHighlight: null,
      currentSelection: null,
    });
  }, [huc12]);

  // do the highlighting
  useEffect(() => {
    if (!mapView || !handles) return;

    // use selected if there is not a highlighted graphic
    let graphic: ExtendedGraphic | null = null;
    const group = 'highlights-group';
    if (highlightedGraphic) graphic = highlightedGraphic;
    else if (selectedGraphic) graphic = selectedGraphic;

    // save the state into separate variables for now
    let { currentHighlight, currentSelection } = highlightState;

    // verify that we have a graphic before continuing
    if (!graphic || !graphic.attributes) {
      handles.remove(group);
      mapView.graphics.removeAll();

      if (protectedAreasHighlightLayer) {
        protectedAreasHighlightLayer.removeAll();
      }

      // remove the currentHighlight and currentSelection if either exist
      if (currentHighlight || currentSelection) {
        currentHighlight = null;
        currentSelection = null;
        setHighlightState({
          currentHighlight,
          currentSelection,
        });
      }

      return;
    }

    // check if the graphic is the same as the currently highlighted graphic
    // remove the highlight if the graphic is different
    let equal = graphicComparison(graphic, currentHighlight);
    let selectionEqual = graphicComparison(selectedGraphic, currentSelection);
    if (equal && selectionEqual) return;

    // set the currentSelection if it changed
    if (!selectionEqual) currentSelection = selectedGraphic;

    const { attributes } = graphic;

    // figure out what layer we the graphic belongs to
    let layer = null;
    let featureLayerType = '';
    if (attributes.layerType === 'issues') {
      layer = issuesLayer;
    } else if (attributes.layerType === 'actions') {
      layer = actionsLayer;
    } else if (attributes.WSR_RIVER_NAME) {
      layer = wildScenicRiversLayer;
      featureLayerType = 'wildScenicRivers';
    } else if (attributes.xwalk_huc12) {
      layer = upstreamLayer;
    } else if (attributes.Shape_Length && attributes.Shape_Area) {
      layer = areasLayer;
      featureLayerType = 'waterbodyLayer';
    } else if (attributes.Shape_Length) {
      layer = linesLayer;
      featureLayerType = 'waterbodyLayer';
    } else if (attributes.assessmentunitidentifier) {
      layer = pointsLayer;
      featureLayerType = 'waterbodyLayer';
    } else if (attributes.CWPName) {
      layer = dischargersLayer;
    } else if (attributes.monitoringType === 'Past Water Conditions') {
      layer = monitoringLocationsLayer;
    } else if (attributes.monitoringType === 'USGS Sensors') {
      layer = usgsStreamgagesLayer;
    } else if (attributes.monitoringType === 'CyAN') {
      layer = mapView.map.findLayerById('cyanWaterbodies');
      featureLayerType = 'cyanWaterbodies';
    } else if (attributes.type === 'nonprofit') {
      layer = nonprofitsLayer;
    }

    if (!layer) return;

    if (isBoundariesToggleLayerId(layer.id)) {
      layer = getEnclosedLayer(layer);
    }

    const parent = (graphic.layer as ExtendedLayer)?.parent;
    if (parent && 'id' in parent && parent.id === 'allWaterbodiesLayer') return;

    // remove the highlights
    handles.remove(group);
    mapView.graphics.removeAll();
    if (protectedAreasHighlightLayer) {
      protectedAreasHighlightLayer.removeAll();
    }

    // get organizationid and assessmentunitidentifier to figure out if the
    // selected waterbody changed.
    const graphicOrgId = graphic?.attributes?.organizationid;
    const graphicAuId = graphic?.attributes?.assessmentunitidentifier;

    const selectedGraphicOrgId = selectedGraphic?.attributes?.organizationid;
    const selectedGraphicAuId =
      selectedGraphic?.attributes?.assessmentunitidentifier;

    // get the graphic from the layer so that we have geometry
    let graphicToHighlight = graphic;

    // define the callback used for setting the highlight state cache
    function highlightStateCallback() {
      currentHighlight = graphic;
      setHighlightState({
        currentHighlight,
        currentSelection,
      });
    }

    // find the actual graphic on the layer
    if (layer.type === 'graphics') {
      for (const tempGraphic of layer.graphics.items) {
        if (
          shallowCompare(tempGraphic.attributes, graphicToHighlight.attributes)
        ) {
          graphicToHighlight = tempGraphic;
          break;
        }
      }

      highlightFeature({
        mapView,
        layer,
        features: [graphicToHighlight],
        highlightOptions,
        handles,
        group,
        callback: highlightStateCallback,
      });
    } else if (
      window.location.pathname.includes('community') &&
      featureLayerType === 'waterbodyLayer' &&
      layer.type === 'feature' &&
      (findOthers ||
        (graphicOrgId === selectedGraphicOrgId &&
          graphicAuId === selectedGraphicAuId))
    ) {
      // get features across all layers that have the same organizationid and assessmentunitid
      const features: ExtendedGraphic[] = [];
      getMatchingFeatures(features, areasData, graphicOrgId, graphicAuId);
      getMatchingFeatures(features, linesData, graphicOrgId, graphicAuId);
      getMatchingFeatures(features, pointsData, graphicOrgId, graphicAuId);

      highlightFeature({
        mapView,
        features,
        highlightOptions,
        handles,
        group,
      });
    } else if (
      layer.type === 'feature' &&
      (findOthers ||
        (graphicOrgId === selectedGraphicOrgId &&
          graphicAuId === selectedGraphicAuId))
    ) {
      let where = '';

      if (featureLayerType === 'waterbodyLayer') {
        where = `organizationid = '${graphicOrgId}' And assessmentunitidentifier = '${graphicAuId}'`;
      } else if (featureLayerType === 'wildScenicRivers') {
        where = `GlobalID = '${attributes.GlobalID}'`;
      } else if (featureLayerType === 'cyanWaterbodies') {
        where = `FID = ${attributes.FID}`;
      } else if ('uniqueId' in attributes) {
        where = `uniqueId = '${attributes.uniqueId}'`;
      } else {
        return;
      }

      const query = new Query({
        returnGeometry: false,
        where,
        outFields: ['*'],
      });

      const requests = [];

      if (featureLayerType === 'waterbodyLayer') {
        if (areasLayer && !erroredLayers.areasLayer)
          requests.push(areasLayer.queryFeatures(query));

        if (linesLayer && !erroredLayers.linesLayer)
          requests.push(linesLayer.queryFeatures(query));

        if (pointsLayer && !erroredLayers.pointsLayer)
          requests.push(pointsLayer.queryFeatures(query));
      } else {
        requests.push(layer.queryFeatures(query));
      }

      Promise.all(requests).then((responses) => {
        responses.forEach((response) => {
          if (!response || !response.features) return;

          highlightFeature({
            mapView,
            features: response.features,
            highlightOptions,
            handles,
            group,
          });

          currentHighlight = graphic;

          setHighlightState({
            currentHighlight,
            currentSelection,
          });
        });
      });
    } else {
      highlightFeature({
        mapView,
        layer,
        features: [graphicToHighlight],
        highlightOptions,
        handles,
        group,
        callback: highlightStateCallback,
      });
    }
  }, [
    erroredLayers,
    mapView,
    highlightedGraphic,
    selectedGraphic,
    highlightOptions,
    highlightState,
    areasLayer,
    linesLayer,
    pointsLayer,
    dischargersLayer,
    monitoringLocationsLayer,
    usgsStreamgagesLayer,
    nonprofitsLayer,
    upstreamLayer,
    issuesLayer,
    actionsLayer,
    findOthers,
    handles,
    wildScenicRiversLayer,
    protectedAreasLayer,
    protectedAreasHighlightLayer,
    pointsData,
    linesData,
    areasData,
  ]);

  // Closes the popup and clears highlights whenever the tab changes
  const { visibleLayers } = useContext(LocationSearchContext);
  const {
    setHighlightedGraphic,
    setSelectedGraphic, //
  } = useMapHighlightState();
  useEffect(() => {
    closePopup({ mapView, setHighlightedGraphic, setSelectedGraphic });
  }, [mapView, setHighlightedGraphic, setSelectedGraphic, visibleLayers]);
}

function useDynamicPopup() {
  const navigate = useNavigate();
  const services = useServicesContext();
  const { getHucBoundaries, getMapView, resetData } = useContext(
    LocationSearchContext,
  );
  const { resetLayers } = useLayers();

  const reset = useCallback(() => {
    resetData();
    resetLayers();
  }, [resetData, resetLayers]);

  const setDynamicPopupFields = (fields: __esri.Field[]) => {
    dynamicPopupFields = fields;
  };

  const [hucInfo, setHucInfo] = useState<ClickedHucState>({
    status: 'none',
    data: null,
  });

  const [lastLocation, setLastLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  /* if (!resetData || services.status === 'fetching') return {
    getClickedHuc: (_location: __esri.Point) => null,
    getTemplate: (_graphic: Feature) => null,
    getTitle: (_graphic: Feature) => null,
  }; */

  const getClickedHuc = useCallback(
    (location: __esri.Point) => {
      if (services.status !== 'success') return null;
      return new Promise<ClickedHucState>((resolve, reject) => {
        const testLocation = {
          latitude: location.latitude,
          longitude: location.longitude,
        };

        function poll(timeout: number) {
          if (['none', 'fetching'].includes(hucInfo.status)) {
            setTimeout(poll, timeout);
          } else {
            resolve(hucInfo);
          }
        }
        // check if the location changed
        if (
          testLocation &&
          lastLocation &&
          testLocation.latitude === lastLocation.latitude &&
          testLocation.longitude === lastLocation.longitude
        ) {
          // polls the dom, based on provided timeout, until the esri search input
          // is added. Once the input is added this sets the id attribute and stops
          // the polling.
          poll(1000);

          return;
        }

        setLastLocation(testLocation);
        setHucInfo({
          status: 'fetching',
          data: null,
        });

        //get the huc boundaries of where the user clicked
        const queryParams = {
          returnGeometry: true,
          geometry: location,
          outFields: ['*'],
        };
        query
          .executeQueryJSON(services.data.wbd, queryParams)
          .then((boundaries) => {
            if (boundaries.features.length === 0) {
              resolve({
                status: 'no-data',
                data: null,
              });
              return;
            }

            const { attributes } = boundaries.features[0];
            setHucInfo({
              status: 'success',
              data: {
                huc12: attributes.huc12,
                watershed: attributes.name,
              },
            });
            resolve(hucInfo);
          })
          .catch((err) => {
            console.error(err);
            reject(err);
          });
      });
    },
    [hucInfo, lastLocation, services],
  );

  // Wrapper function for getting the content of the popup
  const getTemplate = useCallback(
    (graphic: Feature) => {
      // get the currently selected huc boundaries, if applicable
      const hucBoundaries = getHucBoundaries();
      const mapView = getMapView();
      const location = mapView?.popup?.location;
      const fields = dynamicPopupFields;
      const onTribePage = window.location.pathname.startsWith('/tribe/');
      // only look for huc boundaries if no graphics were clicked and the
      // user clicked outside of the selected huc boundaries
      if (
        !location ||
        onTribePage ||
        (hucBoundaries &&
          hucBoundaries.features.length > 0 &&
          hucBoundaries.features[0].geometry.contains(location))
      ) {
        return getPopupContent({
          feature: graphic.graphic,
          fields,
          mapView,
          services,
          navigate,
        });
      }

      return getPopupContent({
        feature: graphic.graphic,
        fields,
        getClickedHuc: getClickedHuc(location),
        mapView,
        resetData: reset,
        services,
        navigate,
      });
    },
    [getClickedHuc, getHucBoundaries, getMapView, navigate, reset, services],
  );

  // Wrapper function for getting the title of the popup
  const getTitle = useCallback((graphic: Feature) => {
    return getPopupTitle(graphic.graphic.attributes);
  }, []);

  return { getTitle, getTemplate, setDynamicPopupFields };
}

function useSharedLayers() {
  const services = useServicesContext();
  const { setLayer, setResetHandler } = useLayers();

  const { getTitle, getTemplate } = useDynamicPopup();

  function getWsioLayer() {
    // shared symbol settings
    const symbol = {
      type: 'simple-fill',
      style: 'solid',
      outline: { color: [0, 0, 0, 0.5], width: 1 },
    };

    // define the color ramp renderer
    const wsioHealthIndexRenderer = new ClassBreaksRenderer({
      field: 'PHWA_HEALTH_NDX_ST',
      classBreakInfos: [
        {
          minValue: 0,
          maxValue: 0.11,
          symbol: {
            ...symbol,
            color: new Color({ r: 180, g: 238, b: 239 }),
          },
        },
        {
          minValue: 0.11,
          maxValue: 0.21,
          symbol: {
            ...symbol,
            color: new Color({ r: 154, g: 209, b: 238 }),
          },
        },
        {
          minValue: 0.21,
          maxValue: 0.31,
          symbol: {
            ...symbol,
            color: new Color({ r: 124, g: 187, b: 234 }),
          },
        },
        {
          minValue: 0.31,
          maxValue: 0.41,
          symbol: {
            ...symbol,
            color: new Color({ r: 90, g: 162, b: 227 }),
          },
        },
        {
          minValue: 0.41,
          maxValue: 0.51,
          symbol: {
            ...symbol,
            color: new Color({ r: 54, g: 140, b: 225 }),
          },
        },
        {
          minValue: 0.51,
          maxValue: 0.61,
          symbol: {
            ...symbol,
            color: new Color({ r: 32, g: 118, b: 217 }),
          },
        },
        {
          minValue: 0.61,
          maxValue: 0.71,
          symbol: {
            ...symbol,
            color: new Color({ r: 35, g: 88, b: 198 }),
          },
        },
        {
          minValue: 0.71,
          maxValue: 0.81,
          symbol: {
            ...symbol,
            color: new Color({ r: 30, g: 61, b: 181 }),
          },
        },
        {
          minValue: 0.81,
          maxValue: 0.91,
          symbol: {
            ...symbol,
            color: new Color({ r: 23, g: 38, b: 163 }),
          },
        },
        {
          minValue: 0.91,
          maxValue: 1.01,
          symbol: {
            ...symbol,
            color: new Color({ r: 10, g: 8, b: 145 }),
          },
        },
      ],
    });

    // return the layer properties object
    const wsioHealthIndexLayer: __esri.FeatureLayer = new FeatureLayer({
      id: 'wsioHealthIndexLayer',
      url: services.data.wsio,
      title: 'State Watershed Health Index',
      outFields: ['HUC12_TEXT', 'STATES_ALL', 'PHWA_HEALTH_NDX_ST'],
      renderer: wsioHealthIndexRenderer,
      listMode: 'show',
      visible: false,
      legendEnabled: false,
      popupTemplate: {
        title: getTitle,
        content: getTemplate,
        outFields: [
          'PHWA_HEALTH_NDX_ST',
          'HUC12_TEXT',
          'NAME_HUC12',
          'STATES_ALL',
        ],
      },
    });

    setLayer('wsioHealthIndexLayer', wsioHealthIndexLayer);
    setResetHandler('wsioHealthIndexLayer', () => {
      wsioHealthIndexLayer.visible = false;
      wsioHealthIndexLayer.listMode = 'hide';
    });

    // Toggles the shading of the watershed graphic based on
    // whether or not the wsio layer is on or off
    reactiveUtils.watch(
      () => wsioHealthIndexLayer.visible,
      () => {
        const parent = (
          wsioHealthIndexLayer as __esri.FeatureLayer & ExtendedLayer
        ).parent;
        if (!parent || (!(parent instanceof Map) && !isGroupLayer(parent)))
          return;
        // find the boundaries layer
        parent.layers.forEach((layer) => {
          if (layer.id !== 'boundariesLayer' || !isGraphicsLayer(layer)) return;

          // remove shading when wsio layer is on and add
          // shading back in when wsio layer is off
          const newGraphics = layer.graphics.clone();
          newGraphics.forEach((graphic) => {
            graphic.symbol.color.a = wsioHealthIndexLayer.visible ? 0 : 0.5;
          });

          // re-draw the graphics
          layer.graphics = newGraphics;
        });
      },
    );

    return wsioHealthIndexLayer;
  }

  function getProtectedAreasLayer() {
    const protectedAreasLayer = new MapImageLayer({
      id: 'protectedAreasLayer',
      title: 'Protected Areas',
      url: services.data.protectedAreasDatabase,
      legendEnabled: false,
      listMode: 'hide-children',
      sublayers: [
        {
          id: 0,
          popupTemplate: {
            title: getTitle,
            content: getTemplate,
            outFields: ['*'],
          },
        },
      ],
    });

    setLayer('protectedAreasLayer', protectedAreasLayer);
    setResetHandler('protectedAreasLayer', () => {
      protectedAreasLayer.visible = false;
      protectedAreasLayer.listMode = 'hide';
    });

    return protectedAreasLayer;
  }

  function getProtectedAreasHighlightLayer() {
    const protectedAreasHighlightLayer = new GraphicsLayer({
      id: 'protectedAreasHighlightLayer',
      title: 'Protected Areas Highlight Layer',
      listMode: 'hide',
    });

    setLayer('protectedAreasHighlightLayer', protectedAreasHighlightLayer);
    setResetHandler('protectedAreasHighlightLayer', () => {
      protectedAreasHighlightLayer.graphics.removeAll();
    });

    return protectedAreasHighlightLayer;
  }

  function getWildScenicRiversLayer() {
    const wildScenicRiversRenderer = new SimpleRenderer({
      symbol: new SimpleLineSymbol({
        color: new Color([0, 123, 255]),
        width: 3,
      }),
    });

    const wildScenicRiversLayer = new FeatureLayer({
      id: 'wildScenicRiversLayer',
      url: services.data.wildScenicRivers,
      title: 'Wild and Scenic Rivers',
      outFields: ['*'],
      renderer: wildScenicRiversRenderer,
      listMode: 'hide',
      visible: false,
      legendEnabled: false,
      popupTemplate: {
        title: getTitle,
        content: getTemplate,
        outFields: ['*'],
      },
    });
    setLayer('wildScenicRiversLayer', wildScenicRiversLayer);
    setResetHandler('wildScenicRiversLayer', () => {
      setTimeout(() => {
        wildScenicRiversLayer.visible = false;
        wildScenicRiversLayer.listMode = 'hide';
      }, 100);
    });

    return wildScenicRiversLayer;
  }

  function getTribalLayer() {
    // redefining the renderer for the alaska native villages and other tribes
    // layers so the default size value is used
    let renderer = new SimpleRenderer({
      symbol: new SimpleMarkerSymbol({
        style: 'circle',
        color: [158, 0, 124, 1],
        outline: {
          style: 'solid',
          color: [0, 0, 0, 1],
          width: 0.75,
        },
      }),
    });

    const alaskaNativeVillageOutFields = ['NAME', 'TRIBE_NAME'];
    const alaskaNativeVillages = new FeatureLayer({
      id: 'tribalLayer-1',
      url: `${services.data.tribal}/1`,
      title: 'Alaska Native Villages',
      outFields: alaskaNativeVillageOutFields,
      listMode: 'hide',
      visible: true,
      labelsVisible: false,
      legendEnabled: false,
      renderer,
      popupTemplate: {
        title: getTitle,
        content: getTemplate,
        outFields: alaskaNativeVillageOutFields,
      },
    });

    renderer.symbol.color = new Color([168, 112, 0, 1]);
    const lower48TribalOutFields = ['TRIBE_NAME'];
    const otherTribes = new FeatureLayer({
      id: 'tribalLayer-5',
      url: `${services.data.tribal}/5`,
      title: 'Virginia Federally Recognized Tribes',
      outFields: lower48TribalOutFields,
      listMode: 'hide',
      visible: true,
      legendEnabled: false,
      labelsVisible: false,
      renderer,
      popupTemplate: {
        title: getTitle,
        content: getTemplate,
        outFields: lower48TribalOutFields,
      },
    });

    renderer = new SimpleRenderer({
      symbol: new SimpleFillSymbol({
        style: 'solid',
        color: new Color([154, 154, 154, 0.75]),
        outline: {
          style: 'solid',
          color: [110, 110, 110, 0.75],
          width: 1,
        },
      }),
    });
    const americanIndianReservations = new FeatureLayer({
      id: 'tribalLayer-2',
      url: `${services.data.tribal}/2`,
      title: 'American Indian Reservations',
      outFields: lower48TribalOutFields,
      listMode: 'hide',
      visible: true,
      labelsVisible: false,
      legendEnabled: false,
      renderer,
      popupTemplate: {
        title: getTitle,
        content: getTemplate,
        outFields: lower48TribalOutFields,
      },
    });

    const americanIndianOffReservations = new FeatureLayer({
      id: 'tribalLayer-3',
      url: `${services.data.tribal}/3`,
      title: 'American Indian Off-Reservation Trust Lands',
      outFields: lower48TribalOutFields,
      listMode: 'hide',
      visible: true,
      labelsVisible: false,
      legendEnabled: false,
      renderer,
      popupTemplate: {
        title: getTitle,
        content: getTemplate,
        outFields: lower48TribalOutFields,
      },
    });

    const oklahomaStatisticalAreas = new FeatureLayer({
      id: 'tribalLayer-4',
      url: `${services.data.tribal}/4`,
      title: 'American Indian Oklahoma Statistical Areas',
      outFields: lower48TribalOutFields,
      listMode: 'hide',
      visible: true,
      legendEnabled: false,
      labelsVisible: false,
      renderer,
      popupTemplate: {
        title: getTitle,
        content: getTemplate,
        outFields: lower48TribalOutFields,
      },
    });

    return new GroupLayer({
      id: 'tribalLayer',
      title: 'Tribal Areas',
      listMode: 'show',
      visible: false,
      layers: [
        alaskaNativeVillages,
        americanIndianReservations,
        americanIndianOffReservations,
        oklahomaStatisticalAreas,
        otherTribes,
      ],
    });
  }

  function getCongressionalLayer() {
    const congressionalLayerOutFields = [
      'DISTRICTID',
      'STFIPS',
      'CDFIPS',
      'STATE_ABBR',
      'NAME',
      'LAST_NAME',
      'PARTY',
      'SQMI',
    ];

    return new FeatureLayer({
      id: 'congressionalLayer',
      url: services.data.congressional,
      title: 'Congressional Districts',
      listMode: 'hide-children',
      visible: false,
      legendEnabled: false,
      renderer: new SimpleRenderer({
        symbol: new SimpleFillSymbol({
          style: 'none',
          outline: {
            style: 'solid',
            color: '#FF00C5',
            width: 2,
          },
        }),
      }),
      outFields: congressionalLayerOutFields,
      popupTemplate: {
        title: getTitle,
        content: getTemplate,
        outFields: congressionalLayerOutFields,
      },
    });
  }

  function getMappedWaterLayer() {
    return new MapImageLayer({
      id: 'mappedWaterLayer',
      url: services.data.mappedWater,
      title: 'Mapped Water (all)',
      sublayers: [{ id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
      legendEnabled: false,
      listMode: 'hide-children',
      visible: false,
    });
  }

  function getCountyLayer() {
    const countyLayerOutFields = ['NAME', 'CNTY_FIPS', 'STATE_NAME'];
    return new FeatureLayer({
      id: 'countyLayer',
      url: services.data.counties,
      title: 'County',
      listMode: 'show',
      visible: false,
      legendEnabled: false,
      outFields: countyLayerOutFields,
      renderer: new SimpleRenderer({
        symbol: new SimpleFillSymbol({
          style: 'none',
          outline: {
            color: [251, 164, 93, 255],
            width: 0.75,
            style: 'solid',
          },
        }),
      }),
      popupTemplate: {
        title: getTitle,
        content: getTemplate,
        outFields: countyLayerOutFields,
      },
    });
  }

  function getStateBoundariesLayer() {
    return new MapImageLayer({
      id: 'stateBoundariesLayer',
      url: services.data.stateBoundaries,
      title: 'State',
      sublayers: [{ id: 0 }],
      listMode: 'show',
      visible: false,
      legendEnabled: false,
    });
  }

  function getWatershedsLayer() {
    return new FeatureLayer({
      id: 'watershedsLayer',
      url: services.data.wbd,
      title: 'Watersheds',
      listMode: 'show',
      visible: false,
      outFields: ['*'],
    });
  }

  function getEjscreen() {
    const ejOutFields = [
      'T_MINORPCT',
      'T_LWINCPCT',
      'T_LESHSPCT',
      'T_LNGISPCT',
      'T_UNDR5PCT',
      'T_OVR64PCT',
      'T_VULEOPCT',
    ];

    const ejscreenPopupTemplate = {
      title: getTitle,
      content: getTemplate,
      outFields: ejOutFields,
    };

    const ejDemographicIndex = new FeatureLayer({
      id: '0',
      url: `${services.data.ejscreen}0`,
      title: 'Demographic Index',
      outFields: ejOutFields,
      visible: true,
      legendEnabled: false,
      popupTemplate: ejscreenPopupTemplate,
    });

    const ejUnderAge5 = new FeatureLayer({
      id: '1',
      url: `${services.data.ejscreen}1`,
      title: 'Individuals under age 5',
      outFields: ejOutFields,
      visible: false,
      legendEnabled: false,
      popupTemplate: ejscreenPopupTemplate,
    });

    const ejOverAge64 = new FeatureLayer({
      id: '2',
      url: `${services.data.ejscreen}2`,
      title: 'Individuals over age 64',
      outFields: ejOutFields,
      visible: false,
      legendEnabled: false,
      popupTemplate: ejscreenPopupTemplate,
    });

    const ejLowIncome = new FeatureLayer({
      id: '3',
      url: `${services.data.ejscreen}3`,
      title: 'Percent Low-Income',
      outFields: ejOutFields,
      visible: false,
      legendEnabled: false,
      popupTemplate: ejscreenPopupTemplate,
    });

    const ejLinguistIsolated = new FeatureLayer({
      id: '4',
      url: `${services.data.ejscreen}4`,
      title: 'Linguistic Isolation',
      outFields: ejOutFields,
      visible: false,
      legendEnabled: false,
      popupTemplate: ejscreenPopupTemplate,
    });

    const ejMinority = new FeatureLayer({
      id: '5',
      url: `${services.data.ejscreen}5`,
      title: 'Percent People of Color',
      outFields: ejOutFields,
      visible: false,
      legendEnabled: false,
      popupTemplate: ejscreenPopupTemplate,
    });

    const ejLessThanHS = new FeatureLayer({
      id: '6',
      url: `${services.data.ejscreen}6`,
      title: 'Less than High School Education',
      outFields: ejOutFields,
      visible: false,
      legendEnabled: false,
      popupTemplate: ejscreenPopupTemplate,
    });

    return new GroupLayer({
      id: 'ejscreenLayer',
      title: 'Demographic Indicators',
      listMode: 'show',
      visible: false,
      layers: [
        ejLessThanHS,
        ejMinority,
        ejLinguistIsolated,
        ejLowIncome,
        ejOverAge64,
        ejUnderAge5,
        ejDemographicIndex,
      ],
      minScale: 577791,
    });
  }

  function getAllWaterbodiesLayer() {
    const popupTemplate = {
      title: getTitle,
      content: getTemplate,
      outFields: ['*'],
    };

    const minScale = 577791;

    // Build the feature layers that will make up the waterbody layer
    const pointsRenderer = new UniqueValueRenderer({
      field: 'overallstatus',
      fieldDelimiter: ', ',
      defaultSymbol: createWaterbodySymbol({
        condition: 'unassessed',
        selected: false,
        geometryType: 'point',
        alpha: allWaterbodiesAlpha,
      }),
      uniqueValueInfos: createUniqueValueInfos('point', allWaterbodiesAlpha),
    });
    const pointsLayer = new FeatureLayer({
      url: services.data.waterbodyService.points,
      outFields: ['*'],
      renderer: pointsRenderer,
      legendEnabled: false,
      popupTemplate,
      minScale,
    });

    const linesRenderer = new UniqueValueRenderer({
      field: 'overallstatus',
      fieldDelimiter: ', ',
      defaultSymbol: createWaterbodySymbol({
        condition: 'unassessed',
        selected: false,
        geometryType: 'polyline',
        alpha: allWaterbodiesAlpha,
      }),
      uniqueValueInfos: createUniqueValueInfos('polyline', allWaterbodiesAlpha),
    });
    const linesLayer = new FeatureLayer({
      url: services.data.waterbodyService.lines,
      outFields: ['*'],
      renderer: linesRenderer,
      legendEnabled: false,
      popupTemplate,
      minScale,
    });

    const areasRenderer = new UniqueValueRenderer({
      field: 'overallstatus',
      fieldDelimiter: ', ',
      defaultSymbol: createWaterbodySymbol({
        condition: 'unassessed',
        selected: false,
        geometryType: 'polygon',
        alpha: allWaterbodiesAlpha,
      }),
      uniqueValueInfos: createUniqueValueInfos('polygon', allWaterbodiesAlpha),
    });
    const areasLayer = new FeatureLayer({
      url: services.data.waterbodyService.areas,
      outFields: ['*'],
      renderer: areasRenderer,
      legendEnabled: false,
      popupTemplate,
      minScale,
    });

    // Make the waterbody layer into a single layer
    const allWaterbodiesLayer = new GroupLayer({
      id: 'allWaterbodiesLayer',
      title: 'All Waterbodies',
      listMode: 'hide',
      visible: false,
      minScale,
      opacity: 0.3,
    });
    allWaterbodiesLayer.addMany([areasLayer, linesLayer, pointsLayer]);
    setLayer('allWaterbodiesLayer', allWaterbodiesLayer);

    return allWaterbodiesLayer;
  }

  function getLandCoverLayer() {
    return new WMSLayer({
      id: 'landCoverLayer',
      legendEnabled: true,
      listMode: 'hide-children',
      title: 'Land Cover',
      visible: false,
      url: services.data.landCover,
    });
  }

  // Gets the settings for the WSIO Health Index layer.
  return function getSharedLayers() {
    const wsioHealthIndexLayer = getWsioLayer();

    const protectedAreasLayer = getProtectedAreasLayer();

    const protectedAreasHighlightLayer = getProtectedAreasHighlightLayer();

    const wildScenicRiversLayer = getWildScenicRiversLayer();

    const tribalLayer = getTribalLayer();

    const congressionalLayer = getCongressionalLayer();

    const mappedWaterLayer = getMappedWaterLayer();

    const countyLayer = getCountyLayer();

    const stateBoundariesLayer = getStateBoundariesLayer();

    const watershedsLayer = getWatershedsLayer();

    const ejscreen = getEjscreen();

    const allWaterbodiesLayer = getAllWaterbodiesLayer();

    const landCover = getLandCoverLayer();

    return [
      ejscreen,
      wsioHealthIndexLayer,
      landCover,
      protectedAreasLayer,
      protectedAreasHighlightLayer,
      wildScenicRiversLayer,
      tribalLayer,
      congressionalLayer,
      stateBoundariesLayer,
      mappedWaterLayer,
      countyLayer,
      watershedsLayer,
      allWaterbodiesLayer,
    ];
  };
}

// Custom hook that is used for handling key presses. This can be used for
// navigating lists with a keyboard.
function useKeyPress(
  targetKey: string,
  ref: MutableRefObject<HTMLElement | null>,
) {
  const [keyPressed, setKeyPressed] = useState(false);

  function downHandler(ev: KeyboardEvent) {
    if (ev.key === targetKey) {
      ev.preventDefault();
      setKeyPressed(true);
    }
  }

  const upHandler = ({ key }: { key: string }) => {
    if (key === targetKey) {
      setKeyPressed(false);
    }
  };

  useEffect(() => {
    if (!ref?.current?.addEventListener) return;
    const tempRef = ref.current;

    ref.current.addEventListener('keydown', downHandler);
    ref.current.addEventListener('keyup', upHandler);

    return function cleanup() {
      tempRef.removeEventListener('keydown', downHandler);
      tempRef.removeEventListener('keyup', upHandler);
    };
  });

  return keyPressed;
}

// Custom hook that is used for performing GIS geometry functions, such as
// cropping geometry.
function useGeometryUtils() {
  // This results in no waterbodies extending outside of the hucGeometry.
  // The arcgis difference function removes the parts of the waterbody that
  // are inside of the huc12, which is opposite of what we need. To work around
  // this we first draw a box around the extent of the huc and all waterbodies,
  // then subtract the huc from this box. This results in a large box that has
  // a hole in it that is in the shape of the huc. Finally we subtract this
  // box from the waterbodies graphics.
  const cropGeometryToHuc = function (
    resFeatures: __esri.Graphic[],
    hucGeometry: __esri.Geometry,
  ) {
    // start by getting the extend of the huc boundaries
    let extent = hucGeometry.extent;

    // add the extent of all of the waterbodies
    const features: __esri.Graphic[] = [];
    resFeatures.forEach((feature) => {
      extent.union(feature.geometry.extent);
    });

    // build geometry from the extent
    const extentGeometry = new Polygon({
      spatialReference: hucGeometry.spatialReference,
      centroid: extent.center,
      rings: [
        [
          [extent.xmin, extent.ymin],
          [extent.xmin, extent.ymax],
          [extent.xmax, extent.ymax],
          [extent.xmax, extent.ymin],
          [extent.xmin, extent.ymin],
        ],
      ],
    });

    // subtract the huc from the full extent
    const subtractor = geometryEngine.difference(extentGeometry, hucGeometry);

    // crop any geometry that extends beyond the huc 12
    resFeatures.forEach((feature) => {
      // crop the waterbodies that extend outside of the huc
      const newGeometry = geometryEngine.difference(
        feature.geometry,
        Array.isArray(subtractor) ? subtractor[0] : subtractor,
      );

      feature.geometry = Array.isArray(newGeometry)
        ? newGeometry[0]
        : newGeometry;
      features.push(feature);
    });

    // order the features by overall status
    const sortBy = [
      'Cause',
      'Not Supporting',
      'Insufficient Information',
      'Not Assessed',
      'Meeting Criteria',
      'Fully Supporting',
    ];
    features.sort((a, b) => {
      return (
        sortBy.indexOf(a.attributes.overallstatus) -
        sortBy.indexOf(b.attributes.overallstatus)
      );
    });

    return features;
  };

  return { cropGeometryToHuc };
}

// Custom hook that is used to determine if the provided ref is
// visible on the screen.
function useOnScreen(node: HTMLDivElement | null) {
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) =>
      setIntersecting(entry.isIntersecting),
    );

    observer.observe(node);
    // Remove the observer as soon as the component is unmounted
    return () => {
      observer.disconnect();
    };
  }, [node]);

  return isIntersecting;
}

export {
  useAbort,
  useAbortSignal,
  useDynamicPopup,
  useGeometryUtils,
  useKeyPress,
  useOnScreen,
  useSharedLayers,
  useWaterbodyFeatures,
  useWaterbodyFeaturesState,
  useWaterbodyOnMap,
  useWaterbodyHighlight,
};

export * from './allWaterbodies';
export * from './boundariesToggleLayer';
export * from './dischargers';
export * from './monitoringLocations';
export * from './streamgages';
