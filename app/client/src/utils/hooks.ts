import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ClassBreaksRenderer from '@arcgis/core/renderers/ClassBreaksRenderer';
import Color from '@arcgis/core/Color';
import ColorVariable from '@arcgis/core/renderers/visualVariables/ColorVariable';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Layer from '@arcgis/core/layers/Layer';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import * as geometryEngineAsync from '@arcgis/core/geometry/geometryEngineAsync';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import Handles from '@arcgis/core/core/Handles';
import ImageryTileLayer from '@arcgis/core/layers/ImageryTileLayer';
import MapImageLayer from '@arcgis/core/layers/MapImageLayer';
import Map from '@arcgis/core/Map';
import Point from '@arcgis/core/geometry/Point';
import Polygon from '@arcgis/core/geometry/Polygon';
import PopupTemplate from '@arcgis/core/PopupTemplate';
import PortalItem from '@arcgis/core/portal/PortalItem';
import * as query from '@arcgis/core/rest/query';
import Query from '@arcgis/core/rest/support/Query';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import * as rendererJsonUtils from '@arcgis/core/renderers/support/jsonUtils';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import UniqueValueInfo from '@arcgis/core/renderers/support/UniqueValueInfo';
import UniqueValueRenderer from '@arcgis/core/renderers/UniqueValueRenderer';
import WMSLayer from '@arcgis/core/layers/WMSLayer';
// contexts
import { useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useMapHighlightState } from 'contexts/MapHighlight';
import {
  useAttainsImpairmentFieldsContext,
  useAttainsUseFieldsContext,
  useServicesContext,
  useStateNationalUsesContext,
} from 'contexts/LookupFiles';
// utilities
import { useAllWaterbodiesLayer } from './allWaterbodies';
import { fetchCheck } from 'utils/fetchUtils';
import {
  createWaterbodySymbol,
  createUniqueValueInfos,
  createUniqueValueInfosIssues,
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
  hideShowGraphicsFill,
} from 'utils/mapFunctions';
// types
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type {
  ClickedHucState,
  ExtendedGraphic,
  Feature,
  WaterbodyCondition,
  WatershedAttributes,
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
  if (mapView) mapView.closePopup();
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
  highlightOptions: __esri.HighlightOptions;
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
      erroredLayers.waterbodyAreas ||
      erroredLayers.waterbodyLines ||
      erroredLayers.waterbodyPoints ||
      orphanFeatures.status === 'error'
    ) {
      if (!features || features.length !== 0) setFeatures([]);
      return;
    }
    if (huc12 === lastHuc12) return;

    setLastHuc12(huc12);

    // combine lines, area, and points features
    let featuresArray: Array<__esri.Graphic> = [];
    if (linesData.features?.length > 0) {
      featuresArray = featuresArray.concat(linesData.features);
    }
    if (areasData.features?.length > 0) {
      featuresArray = featuresArray.concat(areasData.features);
    }
    if (pointsData.features?.length > 0) {
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
function useWaterbodyOnMap(
  attributeName: string = '',
  allWaterbodiesAttribute: string = '',
  defaultCondition: WaterbodyCondition = 'hidden',
  filterCondition: WaterbodyCondition | null = null,
) {
  const { setHighlightedGraphic, setSelectedGraphic } = useMapHighlightState();
  const { mapView } = useContext(LocationSearchContext);
  const {
    allWaterbodiesLayer,
    waterbodyAreas,
    erroredLayers,
    waterbodyLines,
    waterbodyPoints,
  } = useLayers();

  const setRenderer = useCallback(
    (
      layer: FeatureLayer,
      geometryType: 'point' | 'polygon' | 'polyline',
      attribute: string,
      alpha: {
        base: number;
        poly: number;
        outline: number;
      } | null = null,
    ) => {
      const renderer = new UniqueValueRenderer({
        defaultSymbol: createWaterbodySymbol({
          condition: defaultCondition,
          selected: false,
          geometryType,
          alpha,
        }),
        field: attribute || 'overallstatus',
        fieldDelimiter: ', ',
        uniqueValueInfos: createUniqueValueInfos(
          geometryType,
          alpha,
          filterCondition,
        ).map((info) => new UniqueValueInfo(info)),
      });

      if (attribute === 'isimpaired') {
        renderer.field = 'isimpaired';
        renderer.uniqueValueInfos = createUniqueValueInfosIssues(
          geometryType,
          alpha,
        ).map((info) => new UniqueValueInfo(info));
      }

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
    [
      defaultCondition,
      filterCondition,
      mapView,
      setHighlightedGraphic,
      setSelectedGraphic,
    ],
  );

  useEffect(() => {
    if (!waterbodyPoints || erroredLayers.waterbodyPoints) return;
    setRenderer(waterbodyPoints, 'point', attributeName);
  }, [attributeName, erroredLayers, waterbodyPoints, setRenderer]);

  useEffect(() => {
    if (!waterbodyLines || erroredLayers.waterbodyLines) return;
    setRenderer(waterbodyLines, 'polyline', attributeName);
  }, [attributeName, erroredLayers, waterbodyLines, setRenderer]);

  useEffect(() => {
    if (!waterbodyAreas || erroredLayers.waterbodyAreas) return;
    setRenderer(waterbodyAreas, 'polygon', attributeName);
  }, [attributeName, waterbodyAreas, erroredLayers, setRenderer]);

  useEffect(() => {
    if (!allWaterbodiesLayer) return;

    const layers =
      allWaterbodiesLayer.layers as __esri.Collection<__esri.FeatureLayer>;
    const attribute = allWaterbodiesAttribute || attributeName;

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
    waterbodyAreas, //part of waterbody group layer
    actionsWaterbodies,
    dischargersLayer,
    erroredLayers,
    issuesLayer,
    waterbodyLines, //part of waterbody group layer
    monitoringLocationsLayer,
    nonprofitsLayer,
    waterbodyPoints, //part of waterbody group layer
    protectedAreasLayer,
    protectedAreasHighlightLayer,
    upstreamLayer,
    usgsStreamgagesLayer,
    wildScenicRiversLayer,
  } = useLayers();

  const attainsImpairmentFields = useAttainsImpairmentFieldsContext();
  const attainsUseFields = useAttainsUseFieldsContext();
  const services = useServicesContext();
  const stateNationalUses = useStateNationalUsesContext();
  const navigate = useNavigate();

  // Handles zooming to a selected graphic when "View on Map" is clicked.
  useEffect(() => {
    if (
      !mapView ||
      !selectedGraphic?.attributes?.zoom ||
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
        {
          attainsImpairmentFields,
          attainsUseFields,
          services,
          stateNationalUses,
        },
        navigate,
      );
    });
  }, [
    attainsImpairmentFields,
    attainsUseFields,
    mapView,
    navigate,
    selectedGraphic,
    services,
    stateNationalUses,
  ]);

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
    if (!graphic?.attributes) {
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
      layer = actionsWaterbodies;
    } else if (attributes.WSR_RIVER_NAME) {
      layer = wildScenicRiversLayer;
      featureLayerType = 'wildScenicRivers';
    } else if (attributes.xwalk_huc12) {
      layer = upstreamLayer;
    } else if (attributes.Shape_Length && attributes.Shape_Area) {
      layer = waterbodyAreas;
      featureLayerType = 'waterbodyLayer';
    } else if (attributes.Shape_Length) {
      layer = waterbodyLines;
      featureLayerType = 'waterbodyLayer';
    } else if (attributes.assessmentunitidentifier) {
      layer = waterbodyPoints;
      featureLayerType = 'waterbodyLayer';
    } else if (attributes.CWPName) {
      layer = dischargersLayer;
    } else if (attributes.monitoringType === 'Past Water Conditions') {
      layer = monitoringLocationsLayer;
    } else if (attributes.monitoringType === 'USGS Sensors') {
      layer = usgsStreamgagesLayer;
    } else if (attributes.monitoringType === 'Blue-Green Algae') {
      layer = mapView.map.findLayerById('cyanWaterbodies');
      featureLayerType = 'cyanWaterbodies';
    } else if (attributes.type === 'nonprofit') {
      layer = nonprofitsLayer;
    }

    if (!layer) return;

    const parent = graphic.layer?.parent;
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
        where = `OBJECTID = ${attributes.OBJECTID}`;
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
        if (waterbodyAreas && !erroredLayers.waterbodyAreas)
          requests.push(waterbodyAreas.queryFeatures(query));

        if (waterbodyLines && !erroredLayers.waterbodyLines)
          requests.push(waterbodyLines.queryFeatures(query));

        if (waterbodyPoints && !erroredLayers.waterbodyPoints)
          requests.push(waterbodyPoints.queryFeatures(query));
      } else {
        requests.push(layer.queryFeatures(query));
      }

      Promise.all(requests).then((responses) => {
        responses.forEach((response) => {
          if (!response?.features) return;

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
    waterbodyAreas,
    waterbodyLines,
    waterbodyPoints,
    dischargersLayer,
    monitoringLocationsLayer,
    usgsStreamgagesLayer,
    nonprofitsLayer,
    upstreamLayer,
    issuesLayer,
    actionsWaterbodies,
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
  const attainsImpairmentFields = useAttainsImpairmentFieldsContext();
  const attainsUseFields = useAttainsUseFieldsContext();
  const navigate = useNavigate();
  const services = useServicesContext();
  const stateNationalUses = useStateNationalUsesContext();
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

  const getClickedHuc = useCallback(
    (location: __esri.Point) => {
      if (services.status !== 'success') return null;
      return new Promise<ClickedHucState>((resolve, reject) => {
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

            resolve({
              status: 'success',
              data: boundaries.features[0].attributes as WatershedAttributes,
            });
          })
          .catch((err) => {
            console.error(err);
            reject(err);
          });
      });
    },
    [services],
  );

  // Wrapper function for getting the content of the popup
  const getTemplate = useCallback(
    (graphic: Feature, checkHuc = true) => {
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
        hucBoundaries?.geometry.contains(location)
      ) {
        return getPopupContent({
          feature: graphic.graphic,
          fields,
          lookupFiles: {
            attainsImpairmentFields,
            attainsUseFields,
            services,
            stateNationalUses,
          },
          mapView,
          navigate,
        });
      }

      return getPopupContent({
        feature: graphic.graphic,
        fields,
        getClickedHuc: checkHuc ? getClickedHuc(location) : null,
        mapView,
        resetData: reset,
        lookupFiles: {
          attainsImpairmentFields,
          attainsUseFields,
          services,
          stateNationalUses,
        },
        navigate,
      });
    },
    [
      attainsImpairmentFields,
      attainsUseFields,
      getClickedHuc,
      getHucBoundaries,
      getMapView,
      navigate,
      reset,
      services,
      stateNationalUses,
    ],
  );

  // Wrapper function for getting the title of the popup
  const getTitle = useCallback((graphic: Feature) => {
    return getPopupTitle(graphic.graphic.attributes);
  }, []);

  return { getTitle, getTemplate, setDynamicPopupFields };
}

function useSharedLayers({
  overrides,
}: {
  overrides?: {
    [layerId: string]: {
      minScale?: number;
    };
  };
} = {}) {
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

    // Toggles the shading of the watershed graphic based on
    // whether or not the wsio layer is on or off
    reactiveUtils.watch(
      () => wsioHealthIndexLayer.visible,
      () => {
        const parent = wsioHealthIndexLayer.parent as
          | __esri.GroupLayer
          | __esri.Map;
        if (!parent || (!(parent instanceof Map) && !isGroupLayer(parent)))
          return;

        // find the layer
        const layer = parent.layers.find((l) => l.id === 'boundariesLayer');
        if (!layer || !isGraphicsLayer(layer)) return;

        // remove shading when wsio layer is on and add
        // shading back in when wsio layer is off
        hideShowGraphicsFill(layer, !wsioHealthIndexLayer.visible);
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
      listMode: 'show',
      visible: false,
      legendEnabled: false,
      popupTemplate: {
        title: getTitle,
        content: getTemplate,
        outFields: ['*'],
      },
    });
    setLayer('wildScenicRiversLayer', wildScenicRiversLayer);

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

    const tribalLayer = new GroupLayer({
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
    setLayer('tribalLayer', tribalLayer);
    return tribalLayer;
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

    const congressionalLayer = new FeatureLayer({
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
    setLayer('congressionalLayer', congressionalLayer);
    return congressionalLayer;
  }

  function getMappedWaterLayer() {
    const mappedWaterLayer = new MapImageLayer({
      id: 'mappedWaterLayer',
      // sublayers have minScale of 288896,
      // but this doesn't match the actual behavior
      minScale: 144448,
      url: services.data.mappedWater,
      title: 'All Mapped Water (NHD)',
      sublayers: [{ id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
      legendEnabled: false,
      listMode: 'hide-children',
      visible: false,
    });
    setLayer('mappedWaterLayer', mappedWaterLayer);
    return mappedWaterLayer;
  }

  function getCountyLayer() {
    const countyLayerOutFields = ['CNTY_FIPS', 'FIPS', 'NAME', 'STATE_NAME'];
    const countyLayer = new FeatureLayer({
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
    setLayer('countyLayer', countyLayer);
    return countyLayer;
  }

  function getStateBoundariesLayer() {
    const stateBoundariesLayer = new MapImageLayer({
      id: 'stateBoundariesLayer',
      url: services.data.stateBoundaries,
      title: 'State',
      sublayers: [{ id: 0 }],
      listMode: 'hide-children',
      visible: false,
      legendEnabled: false,
    });
    setLayer('stateBoundariesLayer', stateBoundariesLayer);
    return stateBoundariesLayer;
  }

  function getWatershedsLayer() {
    const watershedsLayer = new FeatureLayer({
      id: 'watershedsLayer',
      url: services.data.wbd,
      title: 'Watersheds',
      listMode: 'show',
      visible: false,
      outFields: ['*'],
    });
    setLayer('watershedsLayer', watershedsLayer);
    return watershedsLayer;
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

    const ejscreenLayer = new GroupLayer({
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
    setLayer('ejscreenLayer', ejscreenLayer);
    return ejscreenLayer;
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
    const waterbodyPoints = new FeatureLayer({
      id: 'allWaterbodyPoints',
      title: 'Surrounding Waterbodies Points',
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
    const waterbodyLines = new FeatureLayer({
      id: 'allWaterbodyLines',
      title: 'Surrounding Waterbodies Lines',
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
    const waterbodyAreas = new FeatureLayer({
      id: 'allWaterbodyAreas',
      title: 'Surrounding Waterbodies Areas',
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
      title: 'Surrounding Waterbodies',
      listMode: 'hide',
      visible: false,
      minScale,
      opacity: 0.3,
    });
    allWaterbodiesLayer.addMany([
      waterbodyAreas,
      waterbodyLines,
      waterbodyPoints,
    ]);
    setLayer('allWaterbodiesLayer', allWaterbodiesLayer);
    return allWaterbodiesLayer;
  }

  useAllWaterbodiesLayer(overrides?.allWaterbodiesLayer?.minScale);

  function getLandCoverLayer() {
    const landCoverLayer = new WMSLayer({
      id: 'landCoverLayer',
      legendEnabled: true,
      listMode: 'hide-children',
      title: 'Land Cover',
      visible: false,
      url: services.data.landCover,
    });
    setLayer('landCoverLayer', landCoverLayer);
    return landCoverLayer;
  }

  function getStorageTanksLayer() {
    const outFields = [
      'Closed_USTs',
      'Facility_ID',
      'Name',
      'Open_USTs',
      'TOS_USTs',
    ];

    const storageTanksLayer = new FeatureLayer({
      id: 'storageTanksLayer',
      url: services.data.undergroundStorageTanks,
      title: 'Pollutant Storage Tanks',
      listMode: 'hide-children',
      visible: false,
      renderer: new SimpleRenderer({
        symbol: new SimpleMarkerSymbol({
          style: 'triangle',
          color: '#93AD34',
          outline: {
            style: 'solid',
            color: '#000',
            width: 1,
          },
        }),
      }),
      outFields,
      popupTemplate: {
        title: getTitle,
        content: getTemplate,
        outFields,
      },
    });
    setLayer('storageTanksLayer', storageTanksLayer);
    return storageTanksLayer;
  }

  function getSewerOverflowsLayer() {
    const outFields = ['facility_name', 'npdes_id', 'dmr_tracking'];

    const sewerOverflowsLayer = new FeatureLayer({
      id: 'sewerOverflowsLayer',
      url: services.data.combinedSewerOverflows,
      title: 'Combined Sewer Overflows',
      listMode: 'hide-children',
      visible: false,
      renderer: new SimpleRenderer({
        symbol: new SimpleMarkerSymbol({
          style: 'circle',
          color: '#833599',
          size: 4,
          outline: {
            style: 'solid',
            color: '#000',
            width: 0.7,
          },
        }),
      }),
      outFields,
      popupTemplate: {
        title: getTitle,
        content: getTemplate,
        outFields,
      },
    });
    setLayer('sewerOverflowsLayer', sewerOverflowsLayer);
    return sewerOverflowsLayer;
  }

  async function getDamsLayer() {
    const damsLayer = (await Layer.fromPortalItem({
      portalItem: new PortalItem({
        id: services.data.dams.portalId,
      }),
    })) as __esri.FeatureLayer;
    damsLayer.id = 'damsLayer';
    damsLayer.listMode = 'hide-children';
    damsLayer.title = 'Dams';
    damsLayer.visible = false;
    damsLayer.popupTemplate = new PopupTemplate({
      content: [
        {
          type: 'text',
          text: '<p style="text-align:center;"><span><strong>{expression/expr0}</strong></span><br><span>({NIDID})</span></p><p><span><strong>Owner Type:</strong> {expression/expr60}</span><br><span><strong>Designed for:</strong> {expression/expr16}</span><br><span><strong>Year completed:</strong> {expression/expr59}</span><br><span><strong>City:</strong> {expression/expr5}</span><br><span><strong>State:</strong> {STATE}</span><br><span><strong>Condition Assessment:</strong> {CONDITION_ASSESSMENT}</span><br><span><strong>Recent Assessment Date:</strong> {CONDITION_ASSESS_DATE}</span></p><p style="text-align:center;"><span><strong>Specifics</strong></span></p><p><span><strong>Type:</strong>&nbsp;{expression/expr13}</span><br><span><strong>Core:</strong>&nbsp;{expression/expr14}</span><br><span><strong>Foundation:</strong> {expression/expr15}</span><br><span style="font-size:14px;"><strong>Dam length:</strong> {expression/expr38} ft</span><br><span style="font-size:14px;"><strong>Dam height:</strong> {expression/expr39} ft</span></p>',
        },
      ],
      expressionInfos: [
        {
          name: 'expr0',
          title: 'Dam Name',
          expression:
            '//expression to remove blank attributes and display proper case.\n\nvar c = Proper($feature["NAME"], \'everyword\')\n\niif(c == "", "Unknown", c)',
          returnType: 'string',
        },
        {
          name: 'expr5',
          title: 'City',
          expression:
            '//expression to remove blank attributes and display proper case.\n\nvar c = Proper($feature.CITY, \'everyword\')\n\niif(c == "", "Unknown", c)',
          returnType: 'string',
        },
        {
          name: 'expr13',
          title: 'Dam Type',
          expression:
            '//expression to remove blank attributes.\n\nvar c = $feature.PRIMARY_DAM_TYPE\n\nDefaultValue(c, "Unknown")',
          returnType: 'string',
        },
        {
          name: 'expr14',
          title: 'Core Type',
          expression:
            '//expression to remove blank attributes.\n\nvar c = $feature.CORE_TYPES\n\nDefaultValue(c, "Unknown")',
          returnType: 'string',
        },
        {
          name: 'expr15',
          title: 'Foundation',
          expression:
            '//expression to remove blank attributes.\n\nvar c = $feature.FOUNDATIONS\n\nDefaultValue(c, "Unknown")',
          returnType: 'string',
        },
        {
          name: 'expr16',
          title: 'Purposes',
          expression:
            "//expression to remove empty attributes from the field.\n\nDefaultValue($feature.PURPOSES, 'Unknown')",
          returnType: 'string',
        },
        {
          name: 'expr38',
          title: 'Dam Length (feet)',
          expression:
            '//expression to populate blank fields.\n\nvar d = IsEmpty($feature["DAM_LENGTH"])\nvar l = Number($feature["DAM_LENGTH"])\n\nIIf(d == true, -99999, l)',
          returnType: 'number',
        },
        {
          name: 'expr39',
          title: 'Dam Height (feet)',
          expression:
            '//expression to populate blank fields.\n\nvar d = IsEmpty($feature["DAM_HEIGHT"])\nvar h = Number($feature["DAM_HEIGHT"])\n\nIIf(d == true, -99999, h)',
          returnType: 'number',
        },
        {
          name: 'expr59',
          title: 'Year Completed',
          expression:
            '//expression to make blanks "Unknown" and return a date as text.\n\nvar d = Text($feature["YEAR_COMPLETED"])\nvar e = IsEmpty($feature["YEAR_COMPLETED"])\n\nWhen(\ne == true, "Unknown",\nd)',
          returnType: 'string',
        },
        {
          name: 'expr60',
          title: 'Owner Type',
          expression:
            "//expression to remove empty attributes from the field.\n\nDefaultValue($feature.OWNER_TYPES, 'Unknown')",
          returnType: 'string',
        },
      ],
      fieldInfos: [
        {
          fieldName: 'NIDID',
          isEditable: true,
          label: 'National Inventory of Dams ID (NID ID)',
          tooltip: '',
          visible: true,
        },
        {
          fieldName: 'CITY',
          isEditable: true,
          label: 'City',
          tooltip: '',
          visible: true,
        },
        {
          fieldName: 'STATE',
          isEditable: true,
          label: 'State',
          tooltip: '',
          visible: true,
        },
        {
          fieldName: 'PURPOSES',
          isEditable: true,
          label: 'Purposes',
          tooltip: '',
          visible: true,
        },
        {
          fieldName: 'YEAR_COMPLETED',
          format: {
            digitSeparator: false,
            places: 0,
          },
          isEditable: true,
          label: 'Year Completed',
          tooltip: '',
          visible: true,
        },
        {
          fieldName: 'DAM_LENGTH',
          format: {
            digitSeparator: true,
            places: 0,
          },
          isEditable: true,
          label: 'Dam Length (feet)',
          tooltip: '',
          visible: true,
        },
        {
          fieldName: 'DAM_HEIGHT',
          format: {
            digitSeparator: true,
            places: 2,
          },
          isEditable: true,
          label: 'Dam Height (feet)',
          tooltip: '',
          visible: true,
        },
        {
          fieldName: 'NAME',
          isEditable: true,
          label: 'Dam Name',
          visible: false,
        },
        {
          fieldName: 'OWNER_TYPES',
          isEditable: true,
          label: 'Owner Types',
          visible: false,
        },
        {
          fieldName: 'PRIMARY_DAM_TYPE',
          isEditable: true,
          label: 'Primary Dam Type',
          visible: false,
        },
        {
          fieldName: 'CORE_TYPES',
          isEditable: true,
          label: 'Core Types',
          visible: false,
        },
        {
          fieldName: 'FOUNDATIONS',
          isEditable: true,
          label: 'The material upon which dam is founded',
          visible: false,
        },
        {
          fieldName: 'CONDITION_ASSESSMENT',
          isEditable: true,
          label: 'Dam Condition Assessment',
          visible: false,
        },
        {
          fieldName: 'CONDITION_ASSESS_DATE',
          isEditable: true,
          label: 'Recent Dam Assessment Date',
          visible: false,
        },
        {
          fieldName: 'expression/expr0',
          isEditable: true,
          visible: true,
        },
        {
          fieldName: 'expression/expr5',
          isEditable: true,
          visible: true,
        },
        {
          fieldName: 'expression/expr13',
          isEditable: true,
          visible: true,
        },
        {
          fieldName: 'expression/expr14',
          isEditable: true,
          visible: true,
        },
        {
          fieldName: 'expression/expr15',
          isEditable: true,
          visible: true,
        },
        {
          fieldName: 'expression/expr16',
          isEditable: true,
          visible: true,
        },
        {
          fieldName: 'expression/expr38',
          format: {
            digitSeparator: true,
            places: 0,
          },
          isEditable: true,
          visible: true,
        },
        {
          fieldName: 'expression/expr39',
          format: {
            digitSeparator: true,
            places: 0,
          },
          isEditable: true,
          visible: true,
        },
        {
          fieldName: 'expression/expr59',
          isEditable: true,
          visible: true,
        },
        {
          fieldName: 'expression/expr60',
          isEditable: true,
          visible: false,
        },
      ],
      outFields: [
        'CITY',
        'CONDITION_ASSESSMENT',
        'CONDITION_ASSESS_DATE',
        'CORE_TYPES',
        'DAM_HEIGHT',
        'DAM_LENGTH',
        'FOUNDATIONS',
        'NAME',
        'NIDID',
        'OWNER_TYPES',
        'PRIMARY_DAM_TYPE',
        'PURPOSES',
        'STATE',
        'YEAR_COMPLETED',
      ],
      title: '',
    });

    damsLayer.when(() => {
      if (!damsLayer.renderer) return;

      const renderer = damsLayer.renderer as UniqueValueRenderer;
      if (renderer.uniqueValueGroups.length === 0) return;
      renderer.uniqueValueGroups[0].heading = 'Hazard Potential Classification';
    });

    setLayer('damsLayer', damsLayer);
    return damsLayer;
  }

  async function getWildfiresLayer() {
    const wildfiresLayer = (await Layer.fromPortalItem({
      portalItem: new PortalItem({
        id: services.data.wildfires.portalId,
      }),
    })) as __esri.GroupLayer;
    wildfiresLayer.id = 'wildfiresLayer';
    wildfiresLayer.listMode = 'hide-children';
    wildfiresLayer.title = 'USA Wildfires';
    wildfiresLayer.visible = false;
    setLayer('wildfiresLayer', wildfiresLayer);
    return wildfiresLayer;
  }

  async function getWellsLayer() {
    const outFields = ['Wells_2020', 'Wells_Density_2020'];

    const wellsLayer = new FeatureLayer({
      id: 'wellsLayer',
      url: services.data.wells,
      title: 'Wells',
      listMode: 'hide-children',
      minScale: 0,
      maxScale: 0,
      visible: false,
      renderer: new SimpleRenderer({
        symbol: new SimpleFillSymbol({
          color: '#F2F0F7',
          outline: {
            style: 'solid',
            color: '#828282',
            width: 0.2,
          },
        }),
        visualVariables: [
          new ColorVariable({
            valueExpression: '$feature.Wells_Density_2020',
            valueExpressionTitle: '2020 Well Density (Wells / Sq. Km.)',
            legendOptions: {},
            stops: [
              {
                color: [242, 240, 247, 255],
                value: 0.1,
              },
              {
                color: [203, 201, 226, 255],
                value: 3.8,
              },
              {
                color: [158, 154, 200, 255],
                value: 7.5,
              },
              {
                color: [117, 107, 177, 255],
                value: 11.2,
              },
              {
                color: [84, 39, 143, 255],
                value: 15,
              },
            ],
          }),
        ],
      }),
      outFields,
      popupTemplate: {
        title: getTitle,
        content: getTemplate,
        outFields,
      },
    });
    setLayer('wellsLayer', wellsLayer);
    return wellsLayer;
  }

  function getCmraScreeningLayer() {
    const cmraScreeningLayer = new FeatureLayer({
      id: 'cmraScreeningLayer',
      title: 'CMRA Screening',
      legendEnabled: false,
      listMode: 'hide',
      url: services.data.cmraScreeningData,
      visible: false,
      outFields: [
        'GEOID',
        'CountyName',
        'HISTORIC_MEAN_CONSECDD',
        'RCP85EARLY_MEAN_CONSECDD',
        'RCP85MID_MEAN_CONSECDD',
        'RCP85LATE_MEAN_CONSECDD',
        'HISTORIC_MEAN_PRLT0IN',
        'RCP85EARLY_MEAN_PRLT0IN',
        'RCP85MID_MEAN_PRLT0IN',
        'RCP85LATE_MEAN_PRLT0IN',
        'HISTORIC_MEAN_CONSECWD',
        'RCP85EARLY_MEAN_CONSECWD',
        'RCP85MID_MEAN_CONSECWD',
        'RCP85LATE_MEAN_CONSECWD',
        'HISTORIC_MEAN_SLR',
        'RCP85EARLY_MEAN_SLR',
        'RCP85MID_MEAN_SLR',
        'RCP85LATE_MEAN_SLR',
        'HISTORIC_MEAN_TMAX90F',
        'RCP85EARLY_MEAN_TMAX90F',
        'RCP85MID_MEAN_TMAX90F',
        'RCP85LATE_MEAN_TMAX90F',
        'HISTORIC_MEAN_PR_ANNUAL',
        'RCP85EARLY_MEAN_PR_ANNUAL',
        'RCP85MID_MEAN_PR_ANNUAL',
        'RCP85LATE_MEAN_PR_ANNUAL',
      ],
    });
    setLayer('cmraScreeningLayer', cmraScreeningLayer);
    return cmraScreeningLayer;
  }

  async function getDroughtRealtimeLayer() {
    const layer = (await Layer.fromPortalItem({
      portalItem: new PortalItem({
        id: services.data.droughtRealtime.portalId,
      }),
    })) as __esri.FeatureLayer;
    layer.id = 'droughtRealtimeLayer';
    layer.listMode = 'show';
    layer.title = 'Drought Real-Time';
    layer.visible = false;
    setLayer('droughtRealtimeLayer', layer);
    return layer;
  }

  function getInlandFloodingRealtimeLayer() {
    const layer = new GroupLayer({
      id: 'inlandFloodingRealtimeLayer',
      title: 'Inland Flooding Real-Time',
      visible: false,
    });
    getSubLayerDefinitions(
      services.data.inlandFloodingRealtime.portalId,
      layer,
    );
    setLayer('inlandFloodingRealtimeLayer', layer);
    return layer;
  }

  function getCoastalFloodingRealtimeLayer() {
    const layer = new GroupLayer({
      id: 'coastalFloodingRealtimeLayer',
      title: 'Coastal Flooding Real-Time',
      visible: false,
    });
    getSubLayerDefinitions(
      services.data.coastalFloodingRealtime.portalId,
      layer,
    );
    setLayer('coastalFloodingRealtimeLayer', layer);
    return layer;
  }

  function getExtremeHeatRealtimeLayer() {
    const layer = new GroupLayer({
      id: 'extremeHeatRealtimeLayer',
      title: 'Extreme Heat Real-Time',
      visible: false,
    });
    getSubLayerDefinitions(services.data.extremeHeatRealtime.portalId, layer);
    setLayer('extremeHeatRealtimeLayer', layer);
    return layer;
  }

  function getExtremeColdRealtimeLayer() {
    const layer = new GroupLayer({
      id: 'extremeColdRealtimeLayer',
      title: 'Extreme Cold Real-Time',
      visible: false,
    });
    getSubLayerDefinitions(services.data.extremeColdRealtime.portalId, layer);
    setLayer('extremeColdRealtimeLayer', layer);
    return layer;
  }

  function getCoastalFloodingLayer() {
    const centuryEnum = {
      early: 2035,
      mid: 2050,
      late: 2090,
    };
    const renderer = new UniqueValueRenderer({
      field: 'Value',
      uniqueValueInfos: [
        {
          label: 'Sea Level Rise',
          value: 1,
          symbol: new SimpleFillSymbol({
            color: [61, 143, 246, 255],
            outline: {
              color: [0, 0, 0, 0],
              width: 0,
              style: 'solid',
            },
            style: 'solid',
          }),
        },
      ],
    });

    const getSeaLevelLayer = (century: 'early' | 'mid' | 'late') => {
      return new ImageryTileLayer({
        url: services.data.seaLevelRise[century],
        title: `Sea Level Rise ${century[0].toUpperCase() + century.slice(1)} Century`,
        blendMode: 'multiply',
        renderer,
        visible: false,
        popupEnabled: true,
        popupTemplate: {
          title: '',
          content: [
            {
              type: 'text',
              text: `<div style="-webkit-text-stroke-width:0px;background-color:rgb(255, 255, 255);box-sizing:inherit;color:rgb(50, 50, 50);font-family:&quot;Avenir Next&quot;, &quot;Helvetica Neue&quot;, Helvetica, Arial, sans-serif;font-size:14px;font-style:normal;font-variant-caps:normal;font-variant-ligatures:normal;font-weight:400;letter-spacing:normal;margin-bottom:24px;orphans:2;padding:0px 7px;text-align:start;text-decoration-color:initial;text-decoration-style:initial;text-decoration-thickness:initial;text-indent:0px;text-transform:none;white-space:normal;widows:2;word-spacing:0px;"><div style="box-sizing:inherit;"><div style="box-sizing:inherit;"><div style="box-sizing:inherit;text-align:center;"><p style="box-sizing:inherit;font-size:14px;line-height:normal;margin:0px 0px 1.2em;"><span style="font-size:medium;">this area will be</span>&nbsp;<br><span style="font-size:large;"><font style="box-sizing:inherit;"><strong>Below Sea Level</strong></font></span><br><br><span style="font-size:medium;"><font style="box-sizing:inherit;">based on&nbsp;<strong>Intermediate-High</strong>&nbsp;scenario in year&nbsp;<strong>${centuryEnum[century]}</strong></font></span></p><p style="box-sizing:inherit;font-size:14px;line-height:normal;margin:0px 0px 1.2em;">&nbsp;</p><div style="box-sizing:inherit;text-align:left;"><span style="font-size:small;">Source: Global Sea Level Rise Scenarios for the United States (by William Sweet et al., 2022)</span></div></div></div></div></div><div style="-webkit-text-stroke-width:0px;background-color:rgb(255, 255, 255);box-sizing:inherit;color:rgb(50, 50, 50);font-family:&quot;Avenir Next&quot;, &quot;Helvetica Neue&quot;, Helvetica, Arial, sans-serif;font-size:14px;font-style:normal;font-variant-caps:normal;font-variant-ligatures:normal;font-weight:400;letter-spacing:normal;margin-bottom:0px;orphans:2;padding:0px 7px;text-align:start;text-decoration-color:initial;text-decoration-style:initial;text-decoration-thickness:initial;text-indent:0px;text-transform:none;white-space:normal;widows:2;word-spacing:0px;"><div style="box-sizing:inherit;"><div style="box-sizing:inherit;"><p style="box-sizing:inherit;font-size:14px;line-height:normal;margin:0px 0px 1.2em;"><span style="font-size:10px;"><font style="box-sizing:inherit;"><i>(Intermediate-High = 1.5 meters of Global Sea Level Rise by Year &nbsp;2100)</i></font></span></p></div></div></div>`,
            },
          ],
        },
      });
    };

    const leveeLayer = new ImageryTileLayer({
      url: services.data.seaLevelRise.levees,
      title: 'Leveed Areas',
      blendMode: 'multiply',
      popupEnabled: true,
      visible: true,
      renderer: new UniqueValueRenderer({
        field: 'value',
        uniqueValueInfos: [
          {
            label: 'Levee Protected Areas',
            value: 1,
            symbol: new SimpleFillSymbol({
              color: [92, 92, 92, 255],
              outline: {
                color: [0, 0, 0, 0],
                width: 0,
                style: 'solid',
              },
              style: 'solid',
            }),
          },
        ],
      }),
      popupTemplate: {
        title: '',
        outFields: ['value'],
        content: [
          {
            type: 'text',
            text: 'value: {$feature.value} <p><span style="background-color:rgb(255,255,255);color:rgb(0,0,0);font-family:Calibri, sans-serif;font-size:14.6667px;">This&nbsp;</span><span style="background-color:white;color:rgb(36,36,36);font-family:&quot;Segoe UI&quot;, sans-serif;font-size:10.5pt;">area is below Sea Level and protected by a levee.</span></p>',
          },
        ],
      },
    });

    const layer = new GroupLayer({
      id: 'coastalFloodingLayer',
      title: 'Coastal Flooding',
      visible: false,
      listMode: 'hide',
      layers: [
        leveeLayer,
        getSeaLevelLayer('early'),
        getSeaLevelLayer('mid'),
        getSeaLevelLayer('late'),
      ],
    });
    setLayer('coastalFloodingLayer', layer);
    return layer;
  }

  // loads sublayers from a webmap portalid
  async function getSubLayerDefinitions(
    portalId: string,
    groupLayer: __esri.GroupLayer,
  ) {
    const layers: __esri.Layer[] = [];
    try {
      // get webmap definition
      const webMapDef = await fetchCheck(
        `${services.data.esriWebMapBase}/${portalId}/data?f=json`,
      );
      for (const layer of webMapDef.operationalLayers) {
        const layerIndex = layer.url.split('/').pop();

        // get layer definition
        const webMapLayerRes = await fetchCheck(
          `${services.data.esriWebMapBase}/${layer.itemId}/data?f=json`,
        );
        const webMapLayerDef = webMapLayerRes.layers.find(
          (l: any) => l.id === parseInt(layerIndex),
        );

        // use jsonUtils to convert the REST API renderer to an ArcGIS JS renderer
        let renderer: __esri.Renderer | undefined = undefined;
        if (webMapLayerDef?.layerDefinition?.drawingInfo?.renderer) {
          renderer = rendererJsonUtils.fromJSON(
            webMapLayerDef.layerDefinition.drawingInfo.renderer,
          );
        }
        if (layer.layerDefinition?.drawingInfo?.renderer) {
          renderer = rendererJsonUtils.fromJSON(
            layer.layerDefinition.drawingInfo.renderer,
          );
        }

        let popupTemplate: __esri.PopupTemplate | undefined = undefined;
        if (webMapLayerDef?.popupInfo) {
          popupTemplate = PopupTemplate.fromJSON(webMapLayerDef.popupInfo);
        }
        if (layer.popupInfo) {
          popupTemplate = PopupTemplate.fromJSON(layer.popupInfo);
        }

        const layerProperties = {
          ...layer,
          ...webMapLayerDef?.layerDefinition,
          ...layer.layerDefinition,
          renderer,
          popupTemplate,
        };

        if (layerProperties.orderBy) {
          layerProperties.orderBy = layerProperties.orderBy.map((o: any) => {
            let order = 'descending';
            if (o.order.includes('asc')) order = 'ascending';
            return {
              ...o,
              order,
            };
          });
        }

        layers.push(new FeatureLayer(layerProperties));
      }

      groupLayer.layers.addMany(layers);
    } catch (ex) {
      console.error('ERROR pulling in layer: ', ex);
    }
  }

  async function getDisadvantagedCommunitiesLayer() {
    const disadvantagedCommunitiesLayer = (await Layer.fromPortalItem({
      portalItem: new PortalItem({
        id: services.data.disadvantagedCommunities.portalId,
      }),
    })) as __esri.FeatureLayer;
    disadvantagedCommunitiesLayer.id = 'disadvantagedCommunitiesLayer';
    disadvantagedCommunitiesLayer.listMode = 'hide-children';
    disadvantagedCommunitiesLayer.title =
      'Overburdened, Underserved, and Disadvantaged Communities';
    disadvantagedCommunitiesLayer.visible = false;
    setLayer('disadvantagedCommunitiesLayer', disadvantagedCommunitiesLayer);
    return disadvantagedCommunitiesLayer;
  }

  // Gets the settings for the WSIO Health Index layer.
  return async function getSharedLayers() {
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

    const wildfiresLayer = await getWildfiresLayer();

    const cmraScreeningLayer = getCmraScreeningLayer();

    const droughtRealtimeLayer = await getDroughtRealtimeLayer();

    const inlandFloodingRealtimeLayer = getInlandFloodingRealtimeLayer();

    const coastalFloodingRealtimeLayer = getCoastalFloodingRealtimeLayer();

    const extremeHeatRealtimeLayer = getExtremeHeatRealtimeLayer();

    const extremeColdRealtimeLayer = getExtremeColdRealtimeLayer();

    const coastalFloodingLayer = getCoastalFloodingLayer();

    const storageTanksLayer = getStorageTanksLayer();

    const sewerOverflowsLayer = getSewerOverflowsLayer();

    const damsLayer = await getDamsLayer();

    const wellsLayer = await getWellsLayer();

    const disadvantagedCommunitiesLayer =
      await getDisadvantagedCommunitiesLayer();

    return [
      ejscreen,
      wsioHealthIndexLayer,
      wellsLayer,
      disadvantagedCommunitiesLayer,
      cmraScreeningLayer,
      landCover,
      inlandFloodingRealtimeLayer,
      droughtRealtimeLayer,
      extremeHeatRealtimeLayer,
      extremeColdRealtimeLayer,
      coastalFloodingRealtimeLayer,
      coastalFloodingLayer,
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
      storageTanksLayer,
      damsLayer,
      wildfiresLayer,
      sewerOverflowsLayer,
    ].filter((layer) => layer !== null);
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
    return new Promise<any>((resolve, reject) => {
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
      const requests: Promise<__esri.Geometry>[] = [];
      resFeatures.forEach((feature, index) => {
        // crop the waterbodies that extend outside of the huc
        requests.push(
          geometryEngineAsync.difference(
            feature.geometry,
            Array.isArray(subtractor) ? subtractor[0] : subtractor,
          ),
        );
      });

      Promise.all(requests)
        .then((responses) => {
          responses.forEach((newGeometry, index) => {
            const feature = resFeatures[index];
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

          resolve(features);
        })
        .catch((err) => {
          console.error(err);
          reject(err);
        });
    });
  };

  return { cropGeometryToHuc };
}

// Custom hook that is used to determine if the provided ref is
// visible on the screen.
function useOnScreen(node: HTMLDivElement | null) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) =>
      setIsIntersecting(entry.isIntersecting),
    );

    observer.observe(node);
    // Remove the observer as soon as the component is unmounted
    return () => {
      observer.disconnect();
    };
  }, [node]);

  return isIntersecting;
}

export type GetTemplateType = (
  graphic: Feature,
  checkHuc?: boolean,
) => HTMLElement | undefined;

export {
  useAbort,
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

export { useAllWaterbodiesLayer } from './allWaterbodies';
export {
  useCyanWaterbodies,
  useCyanWaterbodiesLayers,
} from './cyanWaterbodies';
export { useDischargers, useDischargersLayers } from './dischargers';
export {
  useMonitoringGroups,
  useMonitoringLocations,
  useMonitoringLocationsLayers,
} from './monitoringLocations';
export { useStreamgages, useStreamgageLayers } from './streamgages';
