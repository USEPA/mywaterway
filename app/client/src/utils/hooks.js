// @flow

import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import Handles from '@arcgis/core/core/Handles';
import MapImageLayer from '@arcgis/core/layers/MapImageLayer';
import Point from '@arcgis/core/geometry/Point';
import Polygon from '@arcgis/core/geometry/Polygon';
import Query from '@arcgis/core/rest/support/Query';
import QueryTask from '@arcgis/core/tasks/QueryTask';
import * as watchUtils from '@arcgis/core/core/watchUtils';
// config
import { characteristicGroupMappings } from 'config/characteristicGroupMappings';
import { monitoringClusterSettings } from 'components/shared/LocationMap';
import { usgsStaParameters } from 'config/usgsStaParameters';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
import { useMapHighlightState } from 'contexts/MapHighlight';
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import {
  createWaterbodySymbol,
  createUniqueValueInfos,
  createUniqueValueInfosRestore,
  getPopupContent,
  getPopupTitle,
  getHighlightSymbol,
  graphicComparison,
  openPopup,
  shallowCompare,
} from 'utils/mapFunctions';

let dynamicPopupFields = [];

const allWaterbodiesAlpha = {
  base: 1,
  poly: 0.4,
  outline: 1,
};

function buildStations(locations, layer) {
  if (!layer) return;
  if (!locations.data.features || locations.status !== 'success') {
    return;
  }

  // sort descending order so that smaller graphics show up on top
  const stationsSorted = [...locations.data.features];
  stationsSorted.sort((a, b) => {
    return (
      parseInt(b.properties.resultCount) - parseInt(a.properties.resultCount)
    );
  });

  // attributes common to both the layer and the context object
  return stationsSorted.map((station) => {
    return {
      monitoringType: 'Past Water Conditions',
      siteId: station.properties.MonitoringLocationIdentifier,
      orgId: station.properties.OrganizationIdentifier,
      orgName: station.properties.OrganizationFormalName,
      locationLongitude: station.geometry.coordinates[0],
      locationLatitude: station.geometry.coordinates[1],
      locationName: station.properties.MonitoringLocationName,
      locationType: station.properties.MonitoringLocationTypeName,
      // TODO: explore if the built up locationUrl below is ever different from
      // `station.properties.siteUrl`. from a quick test, they seem the same
      locationUrl:
        `/station/` +
        `${station.properties.ProviderName}/` +
        `${station.properties.OrganizationIdentifier}/` +
        `${station.properties.MonitoringLocationIdentifier}/`,
      // monitoring station specific properties:
      stationDataByYear: null,
      stationProviderName: station.properties.ProviderName,
      stationTotalSamples: parseInt(station.properties.activityCount),
      stationTotalMeasurements: parseInt(station.properties.resultCount),
      // counts for each lower-tier characteristic group
      stationTotalsByGroup: station.properties.characteristicGroupResultCount,
      stationTotalsByLabel: null,
      timeframe: null,
      // create a unique id, so we can check if the monitoring station has
      // already been added to the display (since a monitoring station id
      // isn't universally unique)
      uniqueId:
        `${station.properties.MonitoringLocationIdentifier}-` +
        `${station.properties.ProviderName}-` +
        `${station.properties.OrganizationIdentifier}`,
    };
  });
}

/*
 * Helpers for passing data to the map layers
 */
function updateMonitoringLocationsLayer(stations, layer) {
  const structuredProps = ['stationTotalsByGroup', 'timeframe'];
  const graphics = stations.map((station) => {
    const attributes = stringifyAttributes(structuredProps, station);
    return new Graphic({
      geometry: {
        type: 'point',
        longitude: attributes.locationLongitude,
        latitude: attributes.locationLatitude,
      },
      attributes: {
        ...attributes,
      },
    });
  });
  editLayer(layer, graphics);

  // turn off clustering if there are 20 or less stations
  layer.featureReduction =
    graphics.length > 20 ? monitoringClusterSettings : null;
}

function updateMonitoringGroups(stations, mappings) {
  // build up monitoring stations, toggles, and groups
  let locationGroups = {
    All: { label: 'All', stations: [], toggled: true },
  };

  stations.forEach((station) => {
    // add properties that aren't necessary for the layer
    station.stationDataByYear = {};
    // counts for each top-tier characteristic group
    station.stationTotalsByLabel = {};
    // build up the monitoringLocationToggles and monitoringLocationGroups
    const subGroupsAdded = new Set();
    mappings
      .filter((mapping) => mapping.label !== 'All')
      .forEach((mapping) => {
        station.stationTotalsByLabel[mapping.label] = 0;
        for (const subGroup in station.stationTotalsByGroup) {
          // if characteristic group exists in switch config object
          if (!mapping.groupNames.includes(subGroup)) continue;
          subGroupsAdded.add(subGroup);
          if (!locationGroups[mapping.label]) {
            // create the group (w/ label key) and add the station
            locationGroups[mapping.label] = {
              characteristicGroups: [subGroup],
              label: mapping.label,
              stations: [station],
              toggled: true,
            };
          } else {
            // switch group (w/ label key) already exists, add the stations to it
            locationGroups[mapping.label].stations.push(station);
            locationGroups[mapping.label].characteristicGroups.push(subGroup);
          }
          // add the lower-tier group counts to the corresponding top-tier group counts
          station.stationTotalsByLabel[mapping.label] +=
            station.stationTotalsByGroup[subGroup];
        }
      });

    locationGroups['All'].stations.push(station);

    // add any leftover lower-tier group counts to the 'Other' top-tier group
    for (const subGroup in station.stationTotalsByGroup) {
      if (subGroupsAdded.has(subGroup)) continue;
      if (!locationGroups['Other']) {
        locationGroups['Other'] = {
          label: 'Other',
          stations: [station],
          toggled: true,
          characteristicGroups: [subGroup],
        };
      } else {
        locationGroups['Other'].stations.push(station);
        locationGroups['Other'].characteristicGroups.push(subGroup);
      }
      station.stationTotalsByLabel['Other'] +=
        station.stationTotalsByGroup[subGroup];
    }
  });
  Object.keys(locationGroups).forEach((label) => {
    locationGroups[label].characteristicGroups = [
      ...new Set(locationGroups[label].characteristicGroups),
    ];
  });
  return locationGroups;
}

const editLayer = async (layer, graphics) => {
  const featureSet = await layer.queryFeatures();
  const edits = {
    deleteFeatures: featureSet.features,
    addFeatures: graphics,
  };
  return layer.applyEdits(edits);
};

function stringifyAttributes(structuredAttributes, attributes) {
  const stringified = {};
  for (const property of structuredAttributes) {
    try {
      stringified[property] = JSON.stringify(attributes[property]);
    } catch {
      stringified[property] = attributes[property];
    }
  }
  return { ...attributes, ...stringified };
}

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

// Gets all features in the layer that match the provided organizationid and
// assessmentunitidentifier. Any features found are added to the provided
// features array.
function getMatchingFeatures(
  features,
  layerData,
  organizationid,
  assessmentunitidentifier,
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
function highlightFeature({
  mapView,
  features,
  highlightOptions,
  handles,
  group,
  layer = null,
  callback = null,
}) {
  features.forEach((feature) => {
    if (feature.originalGeometry) {
      mapView.graphics.add({
        ...feature,
        geometry: feature.originalGeometry,
        symbol: getHighlightSymbol(
          feature.originalGeometry,
          highlightOptions.color,
        ),
      });
    } else {
      mapView
        .whenLayerView(layer ?? feature.layer)
        .then((layerView) => {
          const highlightObject = layerView.highlight(feature);
          handles.add(highlightObject, group);
          if (callback) callback(feature);
        })
        .catch((err) => console.error(err));
    }
  });
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
    waterbodyCountMismatch,
    orphanFeatures,
  } = useContext(LocationSearchContext);

  const [features, setFeatures] = useState(null);

  const [lastHuc12, setLastHuc12] = useState(null);
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
      linesLayer === 'error' ||
      areasLayer === 'error' ||
      pointsLayer === 'error' ||
      orphanFeatures.status === 'error'
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
    pointsData,
    linesLayer,
    areasLayer,
    pointsLayer,
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

  const [features, setFeatures] = useState(null);

  useEffect(() => {
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
  allWaterbodiesAttribute: string = '',
  defaultCondition: string = 'hidden',
) {
  const {
    setHighlightedGraphic,
    setSelectedGraphic, //
  } = useMapHighlightState();
  const { allWaterbodiesLayer, pointsLayer, linesLayer, areasLayer, mapView } =
    useContext(LocationSearchContext);

  const setRenderer = useCallback(
    (layer, geometryType, attribute, alpha = null) => {
      const renderer = {
        type: 'unique-value',
        field: attribute ? attribute : 'overallstatus',
        fieldDelimiter: ', ',
        defaultSymbol: createWaterbodySymbol({
          condition: defaultCondition,
          selected: false,
          geometryType,
          alpha,
        }),
        uniqueValueInfos: createUniqueValueInfos(geometryType, alpha),
      };

      // for the restore tab use 3 fields for the unique value renderer
      if (attribute === 'restoreTab') {
        renderer.field = 'hasalternativeplan';
        renderer.field2 = 'hastmdl';
        renderer.field3 = 'has4bplan';
        renderer.uniqueValueInfos = createUniqueValueInfosRestore(
          geometryType,
          alpha,
        );
      }

      layer.renderer = renderer;

      // close popup and clear highlights when the renderer changes
      closePopup({ mapView, setHighlightedGraphic, setSelectedGraphic });
    },
    [defaultCondition, mapView, setHighlightedGraphic, setSelectedGraphic],
  );

  useEffect(() => {
    if (!pointsLayer || pointsLayer === 'error') return;
    setRenderer(pointsLayer, 'point', attributeName);
  }, [attributeName, pointsLayer, setRenderer]);

  useEffect(() => {
    if (!linesLayer || linesLayer === 'error') return;
    setRenderer(linesLayer, 'polyline', attributeName);
  }, [attributeName, linesLayer, setRenderer]);

  useEffect(() => {
    if (!areasLayer || areasLayer === 'error') return;
    setRenderer(areasLayer, 'polygon', attributeName);
  }, [attributeName, areasLayer, setRenderer]);

  useEffect(() => {
    if (!allWaterbodiesLayer || allWaterbodiesLayer === 'error') return;

    const layers = allWaterbodiesLayer.layers;
    const attribute = allWaterbodiesAttribute
      ? allWaterbodiesAttribute
      : attributeName;

    setRenderer(layers.items[2], 'point', attribute, allWaterbodiesAlpha);
    setRenderer(layers.items[1], 'polyline', attribute, allWaterbodiesAlpha);
    setRenderer(layers.items[0], 'polygon', attribute, allWaterbodiesAlpha);
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
  const {
    highlightedGraphic,
    selectedGraphic, //
  } = useMapHighlightState();
  const {
    mapView,
    pointsLayer, //part of waterbody group layer
    linesLayer, //part of waterbody group layer
    areasLayer, //part of waterbody group layer
    issuesLayer,
    monitoringLocationsLayer,
    usgsStreamgagesLayer,
    dischargersLayer,
    nonprofitsLayer,
    upstreamLayer,
    actionsLayer,
    huc12,
    wildScenicRiversLayer,
    protectedAreasLayer,
    protectedAreasHighlightLayer,
    highlightOptions,
    pointsData,
    linesData,
    areasData,
  } = useContext(LocationSearchContext);
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
  const [handles, setHandles] = useState(null);
  useEffect(() => {
    if (handles) return;

    setHandles(new Handles());
  }, [handles]);

  // Clears the cache when users change searches. This is to fix issues
  // with layer mismatch in ArcGIS API 4.14+
  const [highlightState, setHighlightState] = useState({
    currentHighlight: null,
    currentSelection: null,
    cachedHighlights: {},
  });

  useEffect(() => {
    setHighlightState({
      currentHighlight: null,
      currentSelection: null,
      cachedHighlights: {},
    });
  }, [huc12]);

  // do the highlighting
  useEffect(() => {
    if (!mapView || !handles) return;

    // use selected if there is not a highlighted graphic
    let graphic;
    const group = 'highlights-group';
    if (highlightedGraphic) graphic = highlightedGraphic;
    else if (selectedGraphic) graphic = selectedGraphic;

    // save the state into separate variables for now
    let { currentHighlight, currentSelection, cachedHighlights } =
      highlightState;

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
    } else if (attributes.monitoringType === 'Current Water Conditions') {
      layer = usgsStreamgagesLayer;
    } else if (attributes.type === 'nonprofit') {
      layer = nonprofitsLayer;
    } else if (attributes.xwalk_huc12) {
      layer = upstreamLayer;
    }

    if (!layer) return;
    if (graphic.layer?.parent?.id === 'allWaterbodiesLayer') return;

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
        cachedHighlights,
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
    }
    //
    else if (
      window.location.pathname.includes('community') &&
      featureLayerType === 'waterbodyLayer' &&
      layer.type === 'feature' &&
      (findOthers ||
        (graphicOrgId === selectedGraphicOrgId &&
          graphicAuId === selectedGraphicAuId))
    ) {
      // get features across all layers that have the same organizationid and assessmentunitid
      const features = [];
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
    }
    //
    else if (
      layer.type === 'feature' &&
      (findOthers ||
        (graphicOrgId === selectedGraphicOrgId &&
          graphicAuId === selectedGraphicAuId))
    ) {
      let key = '';
      let where = '';

      if (featureLayerType === 'waterbodyLayer') {
        key = `${graphicOrgId} - ${graphicAuId}`;
        where = `organizationid = '${graphicOrgId}' And assessmentunitidentifier = '${graphicAuId}'`;
      }

      if (featureLayerType === 'wildScenicRivers') {
        key = attributes.GlobalID;
        where = `GlobalID = '${key}'`;
      }

      if (
        layer === monitoringLocationsLayer ||
        layer === usgsStreamgagesLayer
      ) {
        const orgId = graphic?.attributes?.orgId || '';
        const siteId = graphic?.attributes?.siteId || '';
        key = `${orgId} - ${siteId}`;
        where = `orgId = '${orgId}' And siteId = '${siteId}'`;
      }

      if (cachedHighlights[key]) {
        highlightFeature({
          mapView,
          features: cachedHighlights[key],
          highlightOptions,
          handles,
          group,
        });

        currentHighlight = graphic;

        setHighlightState({
          currentHighlight,
          currentSelection,
          cachedHighlights,
        });
      }

      if (!cachedHighlights[key]) {
        if (!key || !where) return;

        const query = new Query({
          returnGeometry: false,
          where,
          outFields: ['*'],
        });

        const requests = [];

        if (featureLayerType === 'waterbodyLayer') {
          if (areasLayer && areasLayer !== 'error')
            requests.push(areasLayer.queryFeatures(query));

          if (linesLayer && linesLayer !== 'error')
            requests.push(linesLayer.queryFeatures(query));

          if (pointsLayer && pointsLayer !== 'error')
            requests.push(pointsLayer.queryFeatures(query));
        } else {
          requests.push(layer.queryFeatures(query));
        }

        Promise.all(requests).then((responses) => {
          const featuresToCache = [];
          responses.forEach((response) => {
            if (!response || !response.features) return;

            highlightFeature({
              mapView,
              features: response.features,
              highlightOptions,
              handles,
              group,
              callback: (feature) => featuresToCache.push(feature),
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
    }
    //
    else {
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

  const setDynamicPopupFields = (fields) => {
    dynamicPopupFields = fields;
  };

  return function getDynamicPopup() {
    var hucInfo = {
      status: 'none',
      data: null,
    };

    if (!resetData || services.status === 'fetching') return null;

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

        new QueryTask({ url: services.data.wbd })
          .execute(query)
          .then((boundaries) => {
            if (boundaries.features.length === 0) {
              resolve({
                status: 'no-data',
                data: null,
              });
              return;
            }

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

    // Wrapper function for getting the content of the popup
    function getTemplate(graphic) {
      // get the currently selected huc boundaries, if applicable
      const hucBoundaries = getHucBoundaries();
      const mapView = getMapView();
      const location = mapView?.popup?.location;
      const fields = dynamicPopupFields;
      // only look for huc boundaries if no graphics were clicked and the
      // user clicked outside of the selected huc boundaries
      if (
        !location ||
        (hucBoundaries &&
          hucBoundaries.features.length > 0 &&
          hucBoundaries.features[0].geometry.contains(location))
      ) {
        return getPopupContent({
          feature: graphic.graphic,
          fields,
          services,
          navigate,
        });
      }

      return getPopupContent({
        feature: graphic.graphic,
        fields,
        getClickedHuc: getClickedHuc(location),
        resetData,
        services,
        navigate,
      });
    }

    // Wrapper function for getting the title of the popup
    function getTitle(graphic) {
      return getPopupTitle(graphic.graphic.attributes);
    }

    return { getTitle, getTemplate, setDynamicPopupFields };
  };
}

function useSharedLayers() {
  const services = useServicesContext();
  const {
    setAllWaterbodiesLayer,
    setProtectedAreasLayer,
    setProtectedAreasHighlightLayer,
    setWsioHealthIndexLayer,
    setWildScenicRiversLayer,
  } = useContext(LocationSearchContext);

  const getDynamicPopup = useDynamicPopup();
  const { getTitle, getTemplate } = getDynamicPopup();

  function getWsioLayer() {
    // shared symbol settings
    const symbol = {
      type: 'simple-fill',
      style: 'solid',
      outline: { color: [0, 0, 0, 0.5], width: 1 },
    };

    // define the color ramp renderer
    const wsioHealthIndexRenderer = {
      type: 'class-breaks',
      field: 'PHWA_HEALTH_NDX_ST',
      classBreakInfos: [
        {
          minValue: 0,
          maxValue: 0.11,
          symbol: {
            ...symbol,
            color: { r: 180, g: 238, b: 239 },
          },
        },
        {
          minValue: 0.11,
          maxValue: 0.21,
          symbol: {
            ...symbol,
            color: { r: 154, g: 209, b: 238 },
          },
        },
        {
          minValue: 0.21,
          maxValue: 0.31,
          symbol: {
            ...symbol,
            color: { r: 124, g: 187, b: 234 },
          },
        },
        {
          minValue: 0.31,
          maxValue: 0.41,
          symbol: {
            ...symbol,
            color: { r: 90, g: 162, b: 227 },
          },
        },
        {
          minValue: 0.41,
          maxValue: 0.51,
          symbol: {
            ...symbol,
            color: { r: 54, g: 140, b: 225 },
          },
        },
        {
          minValue: 0.51,
          maxValue: 0.61,
          symbol: {
            ...symbol,
            color: { r: 32, g: 118, b: 217 },
          },
        },
        {
          minValue: 0.61,
          maxValue: 0.71,
          symbol: {
            ...symbol,
            color: { r: 35, g: 88, b: 198 },
          },
        },
        {
          minValue: 0.71,
          maxValue: 0.81,
          symbol: {
            ...symbol,
            color: { r: 30, g: 61, b: 181 },
          },
        },
        {
          minValue: 0.81,
          maxValue: 0.91,
          symbol: {
            ...symbol,
            color: { r: 23, g: 38, b: 163 },
          },
        },
        {
          minValue: 0.91,
          maxValue: 1.01,
          symbol: {
            ...symbol,
            color: { r: 10, g: 8, b: 145 },
          },
        },
      ],
    };

    // return the layer properties object
    const wsioHealthIndexLayer = new FeatureLayer({
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

    setWsioHealthIndexLayer(wsioHealthIndexLayer);

    // Toggles the shading of the watershed graphic based on
    // whether or not the wsio layer is on or off
    watchUtils.watch(
      wsioHealthIndexLayer,
      'visible',
      (newVal, oldVal, propName, target) => {
        // find the boundaries layer
        wsioHealthIndexLayer.parent.layers.items.forEach((layer) => {
          if (layer.id !== 'boundariesLayer') return;

          // remove shading when wsio layer is on and add
          // shading back in when wsio layer is off
          const newGraphics = layer.graphics.clone();
          newGraphics.forEach((graphic) => {
            graphic.symbol.color.a = newVal ? 0 : 0.5;
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

    setProtectedAreasLayer(protectedAreasLayer);

    return protectedAreasLayer;
  }

  function getProtectedAreasHighlightLayer() {
    const protectedAreasHighlightLayer = new GraphicsLayer({
      id: 'protectedAreasHighlightLayer',
      title: 'Protected Areas Highlight Layer',
      listMode: 'hide',
      legendEnabled: false,
    });

    setProtectedAreasHighlightLayer(protectedAreasHighlightLayer);

    return protectedAreasHighlightLayer;
  }

  function getWildScenicRiversLayer() {
    const wildScenicRiversRenderer = {
      type: 'simple',
      symbol: {
        type: 'simple-line',
        color: [0, 123, 255],
        width: 3,
      },
    };

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

    setWildScenicRiversLayer(wildScenicRiversLayer);

    return wildScenicRiversLayer;
  }

  function getTribalLayer() {
    // redefining the renderer for the alaska native villages and other tribes
    // layers so the default size value is used
    let renderer = {
      type: 'simple',
      symbol: {
        type: 'simple-marker',
        style: 'circle',
        color: [158, 0, 124, 1],
        outline: {
          style: 'solid',
          color: [0, 0, 0, 1],
          width: 0.75,
        },
      },
    };

    const alaskaNativeVillageOutFields = ['NAME', 'TRIBE_NAME'];
    const alaskaNativeVillages = new FeatureLayer({
      id: 'tribalLayer-1',
      url: `${services.data.tribal}/1`,
      title: 'Alaska Native Villages',
      outFields: alaskaNativeVillageOutFields,
      listMode: 'hide',
      visible: true,
      labelsVisible: false,
      renderer,
      popupTemplate: {
        title: getTitle,
        content: getTemplate,
        outFields: alaskaNativeVillageOutFields,
      },
    });

    renderer.symbol.color = [168, 112, 0, 1];
    const lower48TribalOutFields = ['TRIBE_NAME'];
    const otherTribes = new FeatureLayer({
      id: 'tribalLayer-5',
      url: `${services.data.tribal}/5`,
      title: 'Virginia Federally Recognized Tribes',
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

    renderer = {
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
    const americanIndianReservations = new FeatureLayer({
      id: 'tribalLayer-2',
      url: `${services.data.tribal}/2`,
      title: 'American Indian Reservations',
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

    const americanIndianOffReservations = new FeatureLayer({
      id: 'tribalLayer-3',
      url: `${services.data.tribal}/3`,
      title: 'American Indian Off-Reservation Trust Lands',
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

    const oklahomaStatisticalAreas = new FeatureLayer({
      id: 'tribalLayer-4',
      url: `${services.data.tribal}/4`,
      title: 'American Indian Oklahoma Statistical Areas',
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

    return new GroupLayer({
      id: 'tribalLayer',
      title: 'Tribal Areas',
      listMode: 'show',
      visible: false,
      legendEnabled: false,
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
    return new FeatureLayer({
      id: 'countyLayer',
      url: services.data.counties,
      title: 'County',
      listMode: 'show',
      visible: false,
      legendEnabled: false,
      renderer: {
        type: 'simple',
        symbol: {
          type: 'simple-fill',
          style: 'none',
          outline: {
            color: [251, 164, 93, 255],
            width: 0.75,
            style: 'solid',
          },
        },
      },
      popupTemplate: {
        title: getTitle,
        content: getTemplate,
        outFields: ['NAME', 'CNTY_FIPS', 'STATE_NAME'],
      },
    });
  }

  function getStateBoundariesLayer() {
    return new MapImageLayer({
      id: 'stateBoundariesLayer',
      url: services.data.stateBoundaries,
      title: 'State',
      sublayers: [{ id: 0 }],
      listMode: 'hide',
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
      id: 0,
      url: `${services.data.ejscreen}0`,
      title: 'Demographic Index',
      outFields: ejOutFields,
      visible: true,
      popupTemplate: ejscreenPopupTemplate,
    });

    const ejUnderAge5 = new FeatureLayer({
      id: 1,
      url: `${services.data.ejscreen}1`,
      title: 'Individuals under age 5',
      outFields: ejOutFields,
      visible: false,
      popupTemplate: ejscreenPopupTemplate,
    });

    const ejOverAge64 = new FeatureLayer({
      id: 2,
      url: `${services.data.ejscreen}2`,
      title: 'Individuals over age 64',
      outFields: ejOutFields,
      visible: false,
      popupTemplate: ejscreenPopupTemplate,
    });

    const ejLowIncome = new FeatureLayer({
      id: 3,
      url: `${services.data.ejscreen}3`,
      title: 'Percent Low-Income',
      outFields: ejOutFields,
      visible: false,
      popupTemplate: ejscreenPopupTemplate,
    });

    const ejLinguistIsolated = new FeatureLayer({
      id: 4,
      url: `${services.data.ejscreen}4`,
      title: 'Linguistic Isolation',
      outFields: ejOutFields,
      visible: false,
      popupTemplate: ejscreenPopupTemplate,
    });

    const ejMinority = new FeatureLayer({
      id: 5,
      url: `${services.data.ejscreen}5`,
      title: 'Percent People of Color',
      outFields: ejOutFields,
      visible: false,
      popupTemplate: ejscreenPopupTemplate,
    });

    const ejLessThanHS = new FeatureLayer({
      id: 6,
      url: `${services.data.ejscreen}6`,
      title: 'Less than High School Education',
      outFields: ejOutFields,
      visible: false,
      popupTemplate: ejscreenPopupTemplate,
    });

    return new GroupLayer({
      id: 'ejscreenLayer',
      title: 'Demographic Indicators',
      listMode: 'show',
      visible: false,
      legendEnabled: false,
      layers: [
        ejLessThanHS,
        ejMinority,
        ejLinguistIsolated,
        ejLowIncome,
        ejOverAge64,
        ejUnderAge5,
        ejDemographicIndex,
      ],
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
    const pointsRenderer = {
      type: 'unique-value',
      field: 'overallstatus',
      fieldDelimiter: ', ',
      defaultSymbol: createWaterbodySymbol({
        condition: 'unassessed',
        selected: false,
        geometryType: 'point',
        alpha: allWaterbodiesAlpha,
      }),
      uniqueValueInfos: createUniqueValueInfos('point', allWaterbodiesAlpha),
    };
    const pointsLayer = new FeatureLayer({
      url: services.data.waterbodyService.points,
      outFields: ['*'],
      renderer: pointsRenderer,
      popupTemplate,
      minScale,
    });

    const linesRenderer = {
      type: 'unique-value',
      field: 'overallstatus',
      fieldDelimiter: ', ',
      defaultSymbol: createWaterbodySymbol({
        condition: 'unassessed',
        selected: false,
        geometryType: 'polyline',
        alpha: allWaterbodiesAlpha,
      }),
      uniqueValueInfos: createUniqueValueInfos('polyline', allWaterbodiesAlpha),
    };
    const linesLayer = new FeatureLayer({
      url: services.data.waterbodyService.lines,
      outFields: ['*'],
      renderer: linesRenderer,
      popupTemplate,
      minScale,
    });

    const areasRenderer = {
      type: 'unique-value',
      field: 'overallstatus',
      fieldDelimiter: ', ',
      defaultSymbol: createWaterbodySymbol({
        condition: 'unassessed',
        selected: false,
        geometryType: 'polygon',
        alpha: allWaterbodiesAlpha,
      }),
      uniqueValueInfos: createUniqueValueInfos('polygon', allWaterbodiesAlpha),
    };
    const areasLayer = new FeatureLayer({
      url: services.data.waterbodyService.areas,
      outFields: ['*'],
      renderer: areasRenderer,
      popupTemplate,
      minScale,
    });

    // Make the waterbody layer into a single layer
    const allWaterbodiesLayer = new GroupLayer({
      id: 'allWaterbodiesLayer',
      title: 'All Waterbodies',
      listMode: 'hide',
      visible: true,
      legendEnabled: false,
      minScale,
      opacity: 0.3,
    });
    allWaterbodiesLayer.addMany([areasLayer, linesLayer, pointsLayer]);
    setAllWaterbodiesLayer(allWaterbodiesLayer);

    return allWaterbodiesLayer;
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

    return [
      ejscreen,
      wsioHealthIndexLayer,
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

/** Normalizes USGS streamgage data with monitoring stations data. */
function useStreamgageData(
  usgsStreamgages,
  usgsPrecipitation,
  usgsDailyAverages,
) {
  const [normalizedStreamgages, setNormalizedStreamgages] = useState([]);

  useEffect(() => {
    if (
      usgsStreamgages.status !== 'success' ||
      usgsPrecipitation.status !== 'success' ||
      usgsDailyAverages.status !== 'success'
    ) {
      return;
    }

    const gages = usgsStreamgages.data.value.map((gage) => {
      const streamgageMeasurements = { primary: [], secondary: [] };

      [...gage.Datastreams]
        .filter((item) => item.Observations.length > 0)
        .forEach((item) => {
          const observation = item.Observations[0];
          const parameterCode = item.properties.ParameterCode;
          const parameterDesc = item.description.split(' / USGS-')[0];
          const parameterUnit = item.unitOfMeasurement;

          let measurement = observation.result;
          // convert measurements recorded in celsius to fahrenheit
          if (['00010', '00020', '85583'].includes(parameterCode)) {
            measurement = measurement * (9 / 5) + 32;

            // round to 1 decimal place
            measurement = Math.round(measurement * 10) / 10;
          }

          const matchedParam = usgsStaParameters.find((p) => {
            return p.staParameterCode === parameterCode;
          });

          const data = {
            parameterCategory: matchedParam?.hmwCategory || 'exclude',
            parameterOrder: matchedParam?.hmwOrder || 0,
            parameterName: matchedParam?.hmwName || parameterDesc,
            parameterUsgsName: matchedParam?.staDescription || parameterDesc,
            parameterCode,
            measurement,
            datetime: new Date(observation.phenomenonTime).toLocaleString(),
            dailyAverages: [], // NOTE: will be set below
            unitAbbr: matchedParam?.hmwUnits || parameterUnit.symbol,
            unitName: parameterUnit.name,
          };

          if (data.parameterCategory === 'primary') {
            streamgageMeasurements.primary.push(data);
          }

          if (data.parameterCategory === 'secondary') {
            streamgageMeasurements.secondary.push(data);
          }
        });

      return {
        monitoringType: 'Current Water Conditions',
        siteId: gage.properties.monitoringLocationNumber,
        orgId: gage.properties.agencyCode,
        orgName: gage.properties.agency,
        locationLongitude: gage.Locations[0].location.coordinates[0],
        locationLatitude: gage.Locations[0].location.coordinates[1],
        locationName: gage.properties.monitoringLocationName,
        locationType: gage.properties.monitoringLocationType,
        locationUrl: gage.properties.monitoringLocationUrl,
        // usgs streamgage specific properties:
        streamgageMeasurements,
      };
    });

    const streamgageSiteIds = gages.map((gage) => gage.siteId);

    // add precipitation data to each streamgage if it exists for the site
    if (usgsPrecipitation.data?.value) {
      usgsPrecipitation.data.value?.timeSeries.forEach((site) => {
        const siteId = site.sourceInfo.siteCode[0].value;
        const observation = site.values[0].value[0];

        if (streamgageSiteIds.includes(siteId)) {
          const streamgage = gages.find((gage) => gage.siteId === siteId);

          streamgage?.streamgageMeasurements.primary.push({
            parameterCategory: 'primary',
            parameterOrder: 5,
            parameterName: 'Total Daily Rainfall',
            parameterUsgsName: 'Precipitation (USGS Daily Value)',
            parameterCode: '00045',
            measurement: observation.value,
            datetime: new Date(observation.dateTime).toLocaleDateString(),
            dailyAverages: [], // NOTE: will be set below
            unitAbbr: 'in',
            unitName: 'inches',
          });
        }
      });
    }

    // add daily average measurements to each streamgage if it exists for the site
    if (
      usgsDailyAverages.data?.allParamsMean?.value &&
      usgsDailyAverages.data?.precipitationSum?.value
    ) {
      const usgsDailyTimeSeriesData = [
        ...(usgsDailyAverages.data.allParamsMean.value?.timeSeries || []),
        ...(usgsDailyAverages.data.precipitationSum.value?.timeSeries || []),
      ];

      usgsDailyTimeSeriesData.forEach((site) => {
        const siteId = site.sourceInfo.siteCode[0].value;
        const sitesHasObservations = site.values[0].value.length > 0;

        if (streamgageSiteIds.includes(siteId) && sitesHasObservations) {
          const streamgage = gages.find((gage) => gage.siteId === siteId);

          const paramCode = site.variable.variableCode[0].value;
          const observations = site.values[0].value.map((observation) => {
            let measurement = observation.value;
            // convert measurements recorded in celsius to fahrenheit
            if (['00010', '00020', '85583'].includes(paramCode)) {
              measurement = measurement * (9 / 5) + 32;

              // round to 1 decimal place
              measurement = Math.round(measurement * 10) / 10;
            }

            return { measurement, date: new Date(observation.dateTime) };
          });

          // NOTE: 'type' is either 'primary' or 'secondary' – loop over both
          for (const type in streamgage?.streamgageMeasurements) {
            streamgage.streamgageMeasurements[type].forEach((measurement) => {
              if (measurement.parameterCode === paramCode.toString()) {
                measurement.dailyAverages = observations;
              }
            });
          }
        }
      });
    }

    setNormalizedStreamgages(gages);
  }, [usgsStreamgages, usgsPrecipitation, usgsDailyAverages]);

  return normalizedStreamgages;
}

// Custom hook that is used for handling key presses. This can be used for
// navigating lists with a keyboard.
function useKeyPress(targetKey: string, ref: Object) {
  const [keyPressed, setKeyPressed] = useState(false);

  function downHandler({ key }: { key: string }) {
    if (key === targetKey) {
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
  const cropGeometryToHuc = function (resFeatures, hucGeometry) {
    // start by getting the extend of the huc boundaries
    let extent = hucGeometry.extent;

    // add the extent of all of the waterbodies
    const features = [];
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
        subtractor,
      );

      feature.geometry = newGeometry;
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
function useOnScreen(ref) {
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setIntersecting(entry.isIntersecting),
    );

    observer.observe(ref.current);
    // Remove the observer as soon as the component is unmounted
    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return isIntersecting;
}

// hook that centralizes initialization of the `monitoringLocationsLayer`
// and the `monitoringGroups` context objects
function useMonitoringLocations() {
  const services = useServicesContext();
  const {
    monitoringGroups,
    monitoringLocations,
    monitoringLocationsLayer,
    setMonitoringGroups,
  } = useContext(LocationSearchContext);

  useEffect(() => {
    if (!monitoringGroups) {
      const stations = buildStations(
        monitoringLocations,
        monitoringLocationsLayer,
      );
      if (!stations) return;

      updateMonitoringLocationsLayer(stations, monitoringLocationsLayer);

      const locationGroups = updateMonitoringGroups(
        stations,
        characteristicGroupMappings,
      );
      setMonitoringGroups(locationGroups);
    }
  }, [
    monitoringGroups,
    monitoringLocations,
    monitoringLocationsLayer,
    services,
    setMonitoringGroups,
  ]);
}

export {
  useDynamicPopup,
  useGeometryUtils,
  useKeyPress,
  useMonitoringLocations,
  useOnScreen,
  useSharedLayers,
  useStreamgageData,
  useWaterbodyFeatures,
  useWaterbodyFeaturesState,
  useWaterbodyOnMap,
  useWaterbodyHighlight,
};
