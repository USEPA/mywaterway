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
  openPopup,
  graphicComparison,
  shallowCompare,
} from 'components/pages/LocationMap/MapFunctions';

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
  React.useEffect(
    () => {
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
        setFeatures([]);
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
    },
    [
      linesData,
      areasData,
      pointsData,
      linesLayer,
      areasLayer,
      pointsLayer,
      features,
      huc12,
      lastHuc12,
    ],
  );

  return features;
}

// custom hook that combines lines, area, and points features from context,
// and returns the combined features
function useWaterbodyFeaturesState() {
  const { waterbodyData } = React.useContext(LocationSearchContext);

  const [features, setFeatures] = React.useState(null);

  React.useEffect(
    () => {
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
    },
    [features, waterbodyData],
  );

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

  React.useEffect(
    () => {
      if (!pointsLayer || pointsLayer === 'error') return;
      setRenderer(pointsLayer, 'point', attributeName);
    },
    [pointsLayer, attributeName, setRenderer],
  );

  React.useEffect(
    () => {
      if (!linesLayer || linesLayer === 'error') return;
      setRenderer(linesLayer, 'polyline', attributeName);
    },
    [linesLayer, attributeName, setRenderer],
  );

  React.useEffect(
    () => {
      if (!areasLayer || areasLayer === 'error') return;
      setRenderer(areasLayer, 'polygon', attributeName);
    },
    [areasLayer, attributeName, setRenderer],
  );
}

// custom hook that is used to highlight based on context. If the findOthers
// parameter is true, this will also attempt to highlight waterbodies on
// other layers that have the same organization id and assessment unit id.
function useWaterbodyHighlight(findOthers: boolean = true) {
  const { Point, Query } = React.useContext(EsriModulesContext);
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
  } = React.useContext(LocationSearchContext);

  const {
    highlightedGraphic,
    selectedGraphic, //
  } = React.useContext(MapHighlightContext);

  React.useEffect(
    () => {
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
    },
    [Point, mapView, selectedGraphic],
  );

  // Remove any old highlights
  const [highlight, setHighlight] = React.useState(null);
  const [nextHighlight, setNextHighlight] = React.useState(null);
  React.useEffect(
    () => {
      // Check the high level equality of the highlight objects
      if (highlight === nextHighlight) return;

      // Check the equality of the highlight arrays
      if (
        highlight &&
        nextHighlight &&
        highlight.length === nextHighlight.length
      ) {
        for (let i = 0; i < highlight.length; i++) {
          for (let j = 0; j < nextHighlight.length; j++) {
            // Check the equality of the functions in the highlight objects
            if (highlight[i].toString() !== nextHighlight[j].toString()) return;
          }
        }
      }

      // Remove any previous highlights
      if (highlight && highlight.length > 0) {
        highlight.forEach((item) => {
          item.remove();
        });
      }

      // Update the current highlight storage
      setHighlight(nextHighlight);
    },
    [highlight, nextHighlight],
  );

  const [highlightState, setHighlightState] = React.useState({
    currentHighlight: null,
    currentSelection: null,
    cachedHighlights: {},
  });
  // do the highlighting
  React.useEffect(
    () => {
      if (!mapView) return;

      // use selected if there is not a highlighted graphic
      let graphic;
      if (highlightedGraphic) graphic = highlightedGraphic;
      else if (selectedGraphic) graphic = selectedGraphic;

      // save the state into separate variables for now
      let highlight = null;
      let {
        currentHighlight,
        currentSelection,
        cachedHighlights,
      } = highlightState;

      // verify that we have a graphic before continuing
      if (!graphic || !graphic.attributes) {
        setNextHighlight(null); // remove any highlights

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
          if (
            shallowCompare(graphic.attributes, graphicToHighlight.attributes)
          ) {
            graphicToHighlight = graphic;
            break;
          }
        }

        mapView.whenLayerView(layer).then((layerView) => {
          const highlightObject = layerView.highlight(graphicToHighlight);
          highlight = [highlightObject];
          currentHighlight = graphic;
          setNextHighlight(highlight);
          setHighlightState({
            currentHighlight,
            currentSelection,
            cachedHighlights,
          });
        });
      } else if (
        layer.type === 'feature' &&
        (findOthers ||
          (graphicOrgId === selectedGraphicOrgId &&
            graphicAuId === selectedGraphicAuId))
      ) {
        const key = `${graphicOrgId} - ${graphicAuId}`;

        if (cachedHighlights[key]) {
          const highlights = [];
          cachedHighlights[key].forEach((feature) => {
            mapView.whenLayerView(feature.layer).then((layerView) => {
              highlights.push(layerView.highlight(feature));
            });
          });

          highlight = highlights;
          currentHighlight = graphic;
          setNextHighlight(highlight);
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
            const highlights = [];
            const featuresToCache = [];
            responses.forEach((response) => {
              if (!response || !response.features) return;

              response.features.forEach((feature) => {
                featuresToCache.push(feature);
                mapView.whenLayerView(feature.layer).then((layerView) => {
                  highlights.push(layerView.highlight(feature));
                });
              });

              // build the new cachedHighlights object
              const keyToSet = {};
              keyToSet[key] = featuresToCache;
              cachedHighlights = { ...cachedHighlights, ...keyToSet };

              highlight = highlights;
              currentHighlight = graphic;
              setNextHighlight(highlight);
              setHighlightState({
                currentHighlight,
                currentSelection,
                cachedHighlights,
              });
            });
          });
        }
      } else {
        mapView.whenLayerView(layer).then((layerView) => {
          const highlightObject = layerView.highlight(graphicToHighlight);
          highlight = [highlightObject];
          currentHighlight = graphic;
          setNextHighlight(highlight);
          setHighlightState({
            currentHighlight,
            currentSelection,
            cachedHighlights,
          });
        });
      }
    },
    [
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
    ],
  );

  // Closes the popup and clears highlights whenever the tab changes
  const { visibleLayers } = React.useContext(LocationSearchContext);
  const {
    setHighlightedGraphic,
    setSelectedGraphic, //
  } = React.useContext(MapHighlightContext);
  React.useEffect(
    () => {
      closePopup({ mapView, setHighlightedGraphic, setSelectedGraphic });
    },
    [mapView, setHighlightedGraphic, setSelectedGraphic, visibleLayers],
  );
}

export {
  useWaterbodyFeatures,
  useWaterbodyFeaturesState,
  useWaterbodyOnMap,
  useWaterbodyHighlight,
};
