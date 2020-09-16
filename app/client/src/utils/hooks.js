// @flow

import React from 'react';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
import { MapHighlightContext } from 'contexts/MapHighlight';
import { EsriModulesContext } from 'contexts/EsriModules';
// utilities
import {
  createWaterbodySymbol,
  createUniqueValueInfos,
  getPopupContent,
  getPopupTitle,
  graphicComparison,
  openPopup,
  shallowCompare,
} from 'components/pages/LocationMap/MapFunctions';
// config
import {
  counties,
  mappedWater,
  tribal,
  wbd,
  // wsio,
  congressional,
} from 'config/mapServiceConfig';

// Closes the map popup and clears highlights whenever the user changes
// tabs. This function is called from the useWaterbodyHighlight hook (handles
// tab changes) and from the use useWaterbodyOnMap hook (handles sub tab changes
// and the "Display By" dropdown on the state page).
function closePopup({ mapView, setHighlightedGraphic, setSelectedGraphic }) {
  // remove highlights
  setHighlightedGraphic(null);
  setSelectedGraphic(null);

  // close the popup
  if (mapView) mapView.popup.close();
}

// custom hook that combines lines, area, and points features from context,
// and returns the combined features
function useWaterbodyFeatures() {
  const {
    linesData,
    linesLayer,
    areasData,
    areasLayer,
    pointsData,
    pointsLayer,

    huc12,
  } = React.useContext(LocationSearchContext);

  const [features, setFeatures] = React.useState(null);

  const [lastHuc12, setLastHuc12] = React.useState(null);
  React.useEffect(() => {
    // Ensure the lastHuc12 is reset when huc12 is reset.
    // This is to prevent issues of searching for the same huc
    // causing the waterbodies data to never load in.
    if (huc12 === '' && lastHuc12 !== '') setLastHuc12(huc12);

    // wait until waterbodies data is set in context
    if (!linesData || !areasData || !pointsData) {
      if (features) setFeatures(null);
      return;
    }

    if (
      linesLayer === 'error' ||
      areasLayer === 'error' ||
      pointsLayer === 'error'
    ) {
      if (!features || features.length !== 0) setFeatures([]);
      return;
    }
    if (huc12 === lastHuc12) return;

    setLastHuc12(huc12);

    // combine lines, area, and points features
    let featuresArray: Array<any> = [];
    if (linesData.features && linesData.features.length > 0) {
      featuresArray = featuresArray.concat(linesData.features);
    }
    if (areasData.features && areasData.features.length > 0) {
      featuresArray = featuresArray.concat(areasData.features);
    }
    if (pointsData.features && pointsData.features.length > 0) {
      featuresArray = featuresArray.concat(pointsData.features);
    }
    setFeatures(featuresArray);
  }, [
    linesData,
    areasData,
    pointsData,
    linesLayer,
    areasLayer,
    pointsLayer,
    features,
    huc12,
    lastHuc12,
  ]);

  return features;
}

// custom hook that combines lines, area, and points features from context,
// and returns the combined features
function useWaterbodyFeaturesState() {
  const { waterbodyData } = React.useContext(LocationSearchContext);

  const [features, setFeatures] = React.useState(null);

  React.useEffect(() => {
    // if features has already been set, don't set again
    if (waterbodyData && features) return;

    // wait until waterbodies data is set in context
    if (!waterbodyData) {
      if (features) setFeatures(null);
      return;
    }

    // combine lines, area, and points features
    let featuresArray: Array<any> = [];
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
  defaultCondition: string = 'hidden',
) {
  const {
    setHighlightedGraphic,
    setSelectedGraphic, //
  } = React.useContext(MapHighlightContext);
  const {
    pointsLayer,
    linesLayer,
    areasLayer,
    mapView, //
  } = React.useContext(LocationSearchContext);

  const setRenderer = React.useCallback(
    (layer, geometryType, attributeName) => {
      const renderer = {
        type: 'unique-value',
        fieldDelimiter: ', ',
        defaultSymbol: createWaterbodySymbol({
          condition: defaultCondition,
          selected: false,
          geometryType,
        }),
        uniqueValueInfos: createUniqueValueInfos(geometryType, attributeName),
      };

      if (attributeName) {
        renderer.field = attributeName;
      } else {
        renderer.field = 'isassessed';
        renderer.field2 = 'isimpaired';
      }

      layer.renderer = renderer;

      // close popup and clear highlights when the renderer changes
      closePopup({ mapView, setHighlightedGraphic, setSelectedGraphic });
    },
    [defaultCondition, mapView, setHighlightedGraphic, setSelectedGraphic],
  );

  React.useEffect(() => {
    if (!pointsLayer || pointsLayer === 'error') return;
    setRenderer(pointsLayer, 'point', attributeName);
  }, [pointsLayer, attributeName, setRenderer]);

  React.useEffect(() => {
    if (!linesLayer || linesLayer === 'error') return;
    setRenderer(linesLayer, 'polyline', attributeName);
  }, [linesLayer, attributeName, setRenderer]);

  React.useEffect(() => {
    if (!areasLayer || areasLayer === 'error') return;
    setRenderer(areasLayer, 'polygon', attributeName);
  }, [areasLayer, attributeName, setRenderer]);
}

// custom hook that is used to highlight based on context. If the findOthers
// parameter is true, this will also attempt to highlight waterbodies on
// other layers that have the same organization id and assessment unit id.
function useWaterbodyHighlight(findOthers: boolean = true) {
  const { Handles, Point, Query } = React.useContext(EsriModulesContext);
  const {
    highlightedGraphic,
    selectedGraphic, //
  } = React.useContext(MapHighlightContext);
  const {
    mapView,
    pointsLayer, //part of waterbody group layer
    linesLayer, //part of waterbody group layer
    areasLayer, //part of waterbody group layer
    issuesLayer,
    monitoringStationsLayer,
    dischargersLayer,
    nonprofitsLayer,
    actionsLayer,
    huc12,
  } = React.useContext(LocationSearchContext);

  // Handles zooming to a selected graphic when "View on Map" is clicked.
  React.useEffect(() => {
    if (
      !mapView ||
      !selectedGraphic ||
      !selectedGraphic.attributes ||
      !selectedGraphic.attributes.zoom
    ) {
      return;
    }

    // get the parameters for the zoom call
    const geometry = selectedGraphic.geometry;
    let params = geometry;
    if (!geometry.extent && geometry.longitude && geometry.latitude) {
      params = {
        target: new Point({
          latitude: geometry.latitude,
          longitude: geometry.longitude,
          type: 'point',
        }),
        zoom: 18, // need to set the zoom level for points
      };
    }

    // perform the zoom and return the Promise
    mapView.goTo(params).then(() => {
      openPopup(mapView, selectedGraphic);
    });
  }, [Point, mapView, selectedGraphic]);

  // Initializes a handles object for more efficient handling of highlight handlers
  const [handles, setHandles] = React.useState(null);
  React.useEffect(() => {
    if (handles) return;

    setHandles(new Handles());
  }, [handles, Handles]);

  // Clears the cache when users change searches. This is to fix issues
  // with layer mismatch in ArcGIS API 4.14+
  const [highlightState, setHighlightState] = React.useState({
    currentHighlight: null,
    currentSelection: null,
    cachedHighlights: {},
  });
  React.useEffect(() => {
    setHighlightState({
      currentHighlight: null,
      currentSelection: null,
      cachedHighlights: {},
    });
  }, [huc12]);

  // do the highlighting
  React.useEffect(() => {
    if (!mapView || !handles) return;

    // use selected if there is not a highlighted graphic
    let graphic;
    const group = 'highlights-group';
    if (highlightedGraphic) graphic = highlightedGraphic;
    else if (selectedGraphic) graphic = selectedGraphic;

    // save the state into separate variables for now
    let {
      currentHighlight,
      currentSelection,
      cachedHighlights,
    } = highlightState;

    // verify that we have a graphic before continuing
    if (!graphic || !graphic.attributes) {
      handles.remove(group);

      // remove the currentHighlight and currentSelection if either exist
      if (currentHighlight || currentSelection) {
        currentHighlight = null;
        currentSelection = null;
        setHighlightState({
          currentHighlight,
          currentSelection,
          cachedHighlights,
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

    const attributes = graphic.attributes;

    // figure out what layer we the graphic belongs to
    let layer = null;
    if (attributes.layerType === 'issues') {
      layer = issuesLayer;
    } else if (attributes.layerType === 'actions') {
      layer = actionsLayer;
    } else if (attributes.Shape_Length && attributes.Shape_Area) {
      layer = areasLayer;
    } else if (attributes.Shape_Length) layer = linesLayer;
    else if (attributes.assessmentunitidentifier) {
      layer = pointsLayer;
    } else if (attributes.CWPName) {
      layer = dischargersLayer;
    } else if (attributes.MonitoringLocationIdentifier) {
      layer = monitoringStationsLayer;
    } else if (attributes.type === 'nonprofit') {
      layer = nonprofitsLayer;
    }

    if (!layer) return;

    // remove the highlights
    handles.remove(group);

    // get organizationid and assessmentunitidentifier to figure out if the
    // selected waterbody changed.
    const graphicOrgId =
      graphic && graphic.attributes && graphic.attributes.organizationid;
    const graphicAuId =
      graphic &&
      graphic.attributes &&
      graphic.attributes.assessmentunitidentifier;
    const selectedGraphicOrgId =
      selectedGraphic &&
      selectedGraphic.attributes &&
      selectedGraphic.attributes.organizationid;
    const selectedGraphicAuId =
      selectedGraphic &&
      selectedGraphic.attributes &&
      selectedGraphic.attributes.assessmentunitidentifier;

    // get the graphic from the layer so that we have geometry
    let graphicToHighlight = graphic;
    // find the actual graphic on the layer
    if (layer.type === 'graphics') {
      for (let i = 0; i < layer.graphics.items.length; i++) {
        let graphic = layer.graphics.items[i];
        if (shallowCompare(graphic.attributes, graphicToHighlight.attributes)) {
          graphicToHighlight = graphic;
          break;
        }
      }

      mapView
        .whenLayerView(layer)
        .then((layerView) => {
          const highlightObject = layerView.highlight(graphicToHighlight);
          handles.add(highlightObject, group);
          currentHighlight = graphic;
          setHighlightState({
            currentHighlight,
            currentSelection,
            cachedHighlights,
          });
        })
        .catch((err) => console.error(err));
    } else if (
      layer.type === 'feature' &&
      (findOthers ||
        (graphicOrgId === selectedGraphicOrgId &&
          graphicAuId === selectedGraphicAuId))
    ) {
      const key = `${graphicOrgId} - ${graphicAuId}`;

      if (cachedHighlights[key]) {
        cachedHighlights[key].forEach((feature) => {
          mapView
            .whenLayerView(feature.layer)
            .then((layerView) => {
              const highlightObject = layerView.highlight(feature);
              handles.add(highlightObject, group);
            })
            .catch((err) => console.error(err));
        });

        currentHighlight = graphic;
        setHighlightState({
          currentHighlight,
          currentSelection,
          cachedHighlights,
        });
      } else {
        const query = new Query({
          returnGeometry: false,
          where: `organizationid = '${graphicOrgId}' And assessmentunitidentifier = '${graphicAuId}'`,
          outFields: ['*'],
        });

        const requests = [];
        areasLayer !== 'error' &&
          requests.push(areasLayer.queryFeatures(query));
        linesLayer !== 'error' &&
          requests.push(linesLayer.queryFeatures(query));
        pointsLayer !== 'error' &&
          requests.push(pointsLayer.queryFeatures(query));
        Promise.all(requests).then((responses) => {
          const featuresToCache = [];
          responses.forEach((response) => {
            if (!response || !response.features) return;

            response.features.forEach((feature) => {
              featuresToCache.push(feature);
              mapView
                .whenLayerView(feature.layer)
                .then((layerView) => {
                  const highlightObject = layerView.highlight(feature);
                  handles.add(highlightObject, group);
                })
                .catch((err) => console.error(err));
            });

            // build the new cachedHighlights object
            const keyToSet = {};
            keyToSet[key] = featuresToCache;
            cachedHighlights = { ...cachedHighlights, ...keyToSet };

            currentHighlight = graphic;
            setHighlightState({
              currentHighlight,
              currentSelection,
              cachedHighlights,
            });
          });
        });
      }
    } else {
      mapView
        .whenLayerView(layer)
        .then((layerView) => {
          const highlightObject = layerView.highlight(graphicToHighlight);
          handles.add(highlightObject, group);
          currentHighlight = graphic;
          setHighlightState({
            currentHighlight,
            currentSelection,
            cachedHighlights,
          });
        })
        .catch((err) => console.error(err));
    }
  }, [
    mapView,
    highlightedGraphic,
    selectedGraphic,
    highlightState,
    areasLayer,
    linesLayer,
    pointsLayer,
    dischargersLayer,
    monitoringStationsLayer,
    nonprofitsLayer,
    issuesLayer,
    actionsLayer,
    findOthers,
    Query,
    handles,
  ]);

  // Closes the popup and clears highlights whenever the tab changes
  const { visibleLayers } = React.useContext(LocationSearchContext);
  const {
    setHighlightedGraphic,
    setSelectedGraphic, //
  } = React.useContext(MapHighlightContext);
  React.useEffect(() => {
    closePopup({ mapView, setHighlightedGraphic, setSelectedGraphic });
  }, [mapView, setHighlightedGraphic, setSelectedGraphic, visibleLayers]);
}

function useSharedLayers() {
  const {
    FeatureLayer,
    GroupLayer,
    MapImageLayer,
    Query,
    QueryTask,
  } = React.useContext(EsriModulesContext);
  const { getHucBoundaries, getMapView, resetData } = React.useContext(
    LocationSearchContext,
  );
  var hucInfo = {
    status: 'none',
    data: null,
  };

  var lastLocation = null;
  function getClickedHuc(location) {
    return new Promise((resolve, reject) => {
      const testLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
      };

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
        function poll(timeout: number) {
          if (['none', 'fetching'].includes(hucInfo.status)) {
            setTimeout(poll, timeout);
          } else {
            resolve(hucInfo);
          }
        }

        poll(1000);

        return;
      }

      lastLocation = testLocation;
      hucInfo = {
        status: 'fetching',
        data: null,
      };

      //get the huc boundaries of where the user clicked
      const query = new Query({
        returnGeometry: true,
        geometry: location,
        outFields: ['*'],
      });

      new QueryTask({ url: wbd })
        .execute(query)
        .then((boundaries) => {
          if (boundaries.features.length === 0) return;

          const { attributes } = boundaries.features[0];
          hucInfo = {
            status: 'success',
            data: {
              huc12: attributes.huc12,
              watershed: attributes.name,
            },
          };
          resolve(hucInfo);
        })
        .catch((err) => {
          console.error(err);
          reject(err);
        });
    });
  }

  if (!resetData) return null;

  // Wrapper function for getting the content of the popup
  function getTemplate(graphic) {
    // get the currently selected huc boundaries, if applicable
    const hucBoundaries = getHucBoundaries();
    const mapView = getMapView();
    const location = mapView?.popup?.location;
    // only look for huc boundaries if no graphics were clicked and the
    // user clicked outside of the selected huc boundaries
    if (
      !location ||
      (hucBoundaries &&
        hucBoundaries.features.length > 0 &&
        hucBoundaries.features[0].geometry.contains(location))
    ) {
      return getPopupContent({ feature: graphic.graphic });
    }

    return getPopupContent({
      feature: graphic.graphic,
      getClickedHuc: getClickedHuc(location),
      resetData,
    });
  }

  // Wrapper function for getting the title of the popup
  function getTitle(graphic) {
    return getPopupTitle(graphic.graphic.attributes);
  }

  // Gets the settings for the WSIO Health Index layer.
  return function getSharedLayers() {
    // shared symbol settings
    // const symbol = {
    //   type: 'simple-fill',
    //   style: 'solid',
    //   outline: { color: [0, 0, 0, 0.5], width: 1 },
    // };

    // define the color ramp renderer
    // const wsioHealthIndexRenderer = {
    //   type: 'class-breaks',
    //   field: 'phwa_health_ndx_st_2016',
    //   classBreakInfos: [
    //     {
    //       minValue: 0,
    //       maxValue: 0.11,
    //       symbol: {
    //         ...symbol,
    //         color: { r: 180, g: 238, b: 239 },
    //       },
    //     },
    //     {
    //       minValue: 0.11,
    //       maxValue: 0.21,
    //       symbol: {
    //         ...symbol,
    //         color: { r: 154, g: 209, b: 238 },
    //       },
    //     },
    //     {
    //       minValue: 0.21,
    //       maxValue: 0.31,
    //       symbol: {
    //         ...symbol,
    //         color: { r: 124, g: 187, b: 234 },
    //       },
    //     },
    //     {
    //       minValue: 0.31,
    //       maxValue: 0.41,
    //       symbol: {
    //         ...symbol,
    //         color: { r: 90, g: 162, b: 227 },
    //       },
    //     },
    //     {
    //       minValue: 0.41,
    //       maxValue: 0.51,
    //       symbol: {
    //         ...symbol,
    //         color: { r: 54, g: 140, b: 225 },
    //       },
    //     },
    //     {
    //       minValue: 0.51,
    //       maxValue: 0.61,
    //       symbol: {
    //         ...symbol,
    //         color: { r: 32, g: 118, b: 217 },
    //       },
    //     },
    //     {
    //       minValue: 0.61,
    //       maxValue: 0.71,
    //       symbol: {
    //         ...symbol,
    //         color: { r: 35, g: 88, b: 198 },
    //       },
    //     },
    //     {
    //       minValue: 0.71,
    //       maxValue: 0.81,
    //       symbol: {
    //         ...symbol,
    //         color: { r: 30, g: 61, b: 181 },
    //       },
    //     },
    //     {
    //       minValue: 0.81,
    //       maxValue: 0.91,
    //       symbol: {
    //         ...symbol,
    //         color: { r: 23, g: 38, b: 163 },
    //       },
    //     },
    //     {
    //       minValue: 0.91,
    //       maxValue: 1.01,
    //       symbol: {
    //         ...symbol,
    //         color: { r: 10, g: 8, b: 145 },
    //       },
    //     },
    //   ],
    // };

    // return the layer properties object
    // const wsioHealthIndexLayer = new FeatureLayer({
    //   id: 'wsioHealthIndexLayer',
    //   url: wsio,
    //   title: 'State Watershed Health Index',
    //   outFields: ['phwa_health_ndx_st_2016'],
    //   renderer: wsioHealthIndexRenderer,
    //   listMode: 'show',
    //   visible: false,
    // });

    // START - Tribal layers
    const renderer = {
      type: 'simple',
      symbol: {
        type: 'simple-fill',
        style: 'solid',
        color: [154, 154, 154, 0.75],
        outline: {
          style: 'solid',
          color: [110, 110, 110, 0.75],
          width: 1,
        },
      },
    };

    const alaskaNativeVillageOutFields = ['NAME', 'TRIBE_NAME'];
    const alaskaNativeVillages = new FeatureLayer({
      id: 'tribalLayer-1',
      url: `${tribal}/1`,
      title: 'Alaska Native Villages',
      outFields: alaskaNativeVillageOutFields,
      listMode: 'hide',
      visible: true,
      labelsVisible: false,
      popupTemplate: {
        title: getTitle,
        content: getTemplate,
        outFields: alaskaNativeVillageOutFields,
      },
    });

    const alaskaReservationOutFields = ['TRIBE_NAME'];
    const alaskaReservations = new FeatureLayer({
      id: 'tribalLayer-2',
      url: `${tribal}/2`,
      title: 'Alaska Reservations',
      outFields: alaskaReservationOutFields,
      listMode: 'hide',
      visible: true,
      labelsVisible: false,
      renderer,
      popupTemplate: {
        title: getTitle,
        content: getTemplate,
        outFields: alaskaReservationOutFields,
      },
    });

    const lower48TribalOutFields = ['TRIBE_NAME'];
    const lower48Tribal = new FeatureLayer({
      id: 'tribalLayer-4',
      url: `${tribal}/4`,
      title: 'Lower 48 States',
      outFields: lower48TribalOutFields,
      listMode: 'hide',
      visible: true,
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
      layers: [alaskaNativeVillages, alaskaReservations, lower48Tribal],
    });

    // END - Tribal layers

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
      url: congressional,
      title: 'Congressional Districts',
      listMode: 'hide-children',
      visible: false,
      renderer: {
        type: 'simple',
        symbol: {
          type: 'simple-fill',
          style: 'none',
          outline: {
            style: 'solid',
            color: '#FF00C5',
            width: 2,
          },
        },
      },
      outFields: congressionalLayerOutFields,
      popupTemplate: {
        title: getTitle,
        content: getTemplate,
        outFields: congressionalLayerOutFields,
      },
    });

    const mappedWaterLayer = new MapImageLayer({
      id: 'mappedWaterLayer',
      url: mappedWater,
      title: 'Mapped Water (all)',
      sublayers: [{ id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
      listMode: 'hide-children',
      visible: false,
    });

    const countyLayer = new FeatureLayer({
      id: 'countyLayer',
      url: counties,
      title: 'County',
      listMode: 'show',
      visible: false,
    });

    const watershedsLayer = new FeatureLayer({
      id: 'watershedsLayer',
      url: wbd,
      title: 'Watersheds',
      listMode: 'show',
      visible: false,
    });

    return [
      // wsioHealthIndexLayer,
      tribalLayer,
      congressionalLayer,
      mappedWaterLayer,
      countyLayer,
      watershedsLayer,
    ];
  };
}

export {
  useSharedLayers,
  useWaterbodyFeatures,
  useWaterbodyFeaturesState,
  useWaterbodyOnMap,
  useWaterbodyHighlight,
};
