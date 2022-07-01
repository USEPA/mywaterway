// @flow

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Node } from 'react';
import { render } from 'react-dom';
import { css } from 'styled-components/macro';
import StickyBox from 'react-sticky-box';
import { useNavigate } from 'react-router-dom';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import Locator from '@arcgis/core/tasks/Locator';
import PictureMarkerSymbol from '@arcgis/core/symbols/PictureMarkerSymbol';
import Query from '@arcgis/core/rest/support/Query';
import QueryTask from '@arcgis/core/tasks/QueryTask';
import SpatialReference from '@arcgis/core/geometry/SpatialReference';
import Viewpoint from '@arcgis/core/Viewpoint';
// components
import Map from 'components/shared/Map';
import MapLoadingSpinner from 'components/shared/MapLoadingSpinner';
import mapPin from 'images/pin.png';
import {
  createWaterbodySymbol,
  createUniqueValueInfos,
  getPopupContent,
  getPopupTitle,
  getUniqueWaterbodies,
} from 'utils/mapFunctions';
import MapErrorBoundary from 'components/shared/ErrorBoundary.MapErrorBoundary';
// contexts
import {
  useFetchedDataDispatch,
  useFetchedDataState,
} from 'contexts/FetchedData';
import { LocationSearchContext } from 'contexts/locationSearch';
import {
  useOrganizationsContext,
  useServicesContext,
  useStateNationalUsesContext,
} from 'contexts/LookupFiles';
// data
import { impairmentFields } from 'config/attainsToHmwMapping';
import { parameterList } from 'config/attainsParameters';
import { characteristicGroupMappings } from 'config/characteristicGroupMappings';
// errors
import {
  geocodeError,
  noDataAvailableError,
  watersgeoError,
  esriMapLoadingFailure,
} from 'config/errorMessages';
// helpers
import {
  useDynamicPopup,
  useGeometryUtils,
  useSharedLayers,
  useStreamgageData,
  useWaterbodyHighlight,
  useWaterbodyFeatures,
} from 'utils/hooks';
import { fetchCheck } from 'utils/fetchUtils';
import {
  isHuc12,
  updateCanonicalLink,
  createJsonLD,
  getPointFromCoordinates,
  splitSuggestedSearch,
  browserIsCompatibleWithArcGIS,
  resetCanonicalLink,
  removeJsonLD,
} from 'utils/utils';
// styled components
import { errorBoxStyles } from 'components/shared/MessageBoxes';
// styles
import 'styles/mapStyles.css';
import { colors } from 'styles/index.js';

// turns an array into a string for the service queries
function createQueryString(array) {
  return `'${array.join("', '")}'`;
}

const mapPadding = 20;

const containerStyles = css`
  display: flex;
  position: relative;
  border: 1px solid #aebac3;
  background-color: #fff;
`;

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
}

function updateMonitoringGroups(stations, mappings) {
  // build up monitoring stations, toggles, and groups
  let locationGroups = {
    All: { label: 'All', stations: [], toggled: true },
    Other: {
      label: 'Other',
      stations: [],
      toggled: true,
      characteristicGroups: [],
    },
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
      locationGroups['Other'].stations.push(station);
      station.stationTotalsByLabel['Other'] +=
        station.stationTotalsByGroup[subGroup];
      locationGroups['Other'].characteristicGroups.push(subGroup);
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

function parseAttributes(structuredAttributes, attributes) {
  const parsed = {};
  for (const property of structuredAttributes) {
    try {
      parsed[property] = JSON.parse(attributes[property]);
    } catch {
      parsed[property] = attributes[property];
    }
  }
  return { ...attributes, ...parsed };
}

function buildStations(locations, layer, services) {
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

  // Attributes common to both the layer and the context object
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
        `${services.data.waterQualityPortal.monitoringLocationDetails}` +
        `${station.properties.ProviderName}/` +
        `${station.properties.OrganizationIdentifier}/` +
        `${station.properties.MonitoringLocationIdentifier}/`,
      // monitoring station specific properties:
      stationProviderName: station.properties.ProviderName,
      stationTotalSamples: parseInt(station.properties.activityCount),
      stationTotalMeasurements: parseInt(station.properties.resultCount),
      // counts for each lower-tier characteristic group
      stationTotalsByGroup: station.properties.characteristicGroupResultCount,
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

// Hook that centralizes updates to the `monitoringLocationsLayer`
// and the `monitoringGroups` context object
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
        services,
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

// --- components ---
type Props = {
  layout: 'narrow' | 'wide' | 'fullscreen',
  windowHeight: number,
  children?: Node,
};

function LocationMap({ layout = 'narrow', windowHeight, children }: Props) {
  const fetchedDataDispatch = useFetchedDataDispatch();
  const { usgsStreamgages, usgsPrecipitation, usgsDailyAverages } =
    useFetchedDataState();

  const organizations = useOrganizationsContext();
  const services = useServicesContext();
  const navigate = useNavigate();

  const {
    searchText,
    lastSearchText,
    setLastSearchText,
    setCurrentExtent,
    boundariesLayer,
    searchIconLayer,
    waterbodyLayer,
    countyBoundaries,
    statesData,
    homeWidget,
    huc12,
    setHuc12,
    assessmentUnitIDs,
    setAssessmentUnitIDs,
    orphanFeatures,
    setOrphanFeatures,
    hucBoundaries,
    areasData,
    linesData,
    pointsData,
    setAreasData,
    setLinesData,
    setPointsData,
    setAddress,
    setAttainsPlans,
    cipSummary,
    setCipSummary,
    setCountyBoundaries,
    setDrinkingWater,
    setStatesData,
    setGrts,
    setFishingInfo,
    setHucBoundaries,
    setAtHucBoundaries,
    mapView,
    setMonitoringLocations,
    // setNonprofits,
    setPermittedDischargers,
    setWaterbodyLayer,
    setIssuesLayer,
    setMonitoringLocationsLayer,
    setUsgsStreamgagesLayer,
    setUpstreamLayer,
    setDischargersLayer,
    setNonprofitsLayer,
    setProvidersLayer,
    setBoundariesLayer,
    setSearchIconLayer,
    setWatershed,
    resetData,
    setNoDataAvailable,
    FIPS,
    setFIPS,
    layers,
    setLayers,
    pointsLayer,
    linesLayer,
    areasLayer,
    setPointsLayer,
    setLinesLayer,
    setAreasLayer,
    setErrorMessage,
    setWsioHealthIndexData,
    setWildScenicRiversData,
    setProtectedAreasData,
    getAllFeatures,
    waterbodyCountMismatch,
    setWaterbodyCountMismatch,
    usgsStreamgagesLayer,
  } = useContext(LocationSearchContext);

  const stateNationalUses = useStateNationalUsesContext();

  function matchStateCodeToAssessment(
    assessmentUnitIdentifier,
    allAssessmentUnits,
  ) {
    const matchedAssessment = allAssessmentUnits.find(
      (assessment) =>
        assessment.assessmentUnitIdentifier === assessmentUnitIdentifier,
    );
    if (!matchedAssessment) return null;
    if (matchedAssessment?.stateCode) return matchedAssessment.stateCode;
  }

  function matchAssessmentUnitName(
    assessmentUnitIdentifier,
    allAssessmentUnits,
  ) {
    const matchedAssessment = allAssessmentUnits.find(
      (unit) => unit.assessmentUnitIdentifier === assessmentUnitIdentifier,
    );

    if (!matchedAssessment) return 'Unknown';
    if (matchedAssessment?.assessmentUnitName)
      return matchedAssessment.assessmentUnitName;
  }

  // create a feature using data from ATTAINS Domains, Assessment Units, and Assessments services
  const createDetailedOrphanFeatures = useCallback(
    (res, allAssessmentUnits, attainsDomainsData) => {
      // function that checks if any uses in an array of uses have a status that matches the 2nd paremeter
      function checkStatus(uses, status) {
        return uses.some((e) => e.status === status);
      }

      function getUseStatus(category, stateCode, useAttainments) {
        if (stateNationalUses.status !== 'success') return null;
        if (!stateCode) return null;

        if (!useAttainments || useAttainments.length === 0) return null;

        const relatedUses = [];
        useAttainments.forEach((useAttainment) => {
          const foundUse = stateNationalUses.data.find(
            (use) =>
              category === use.category &&
              stateCode === use.state &&
              useAttainment.useName === use.name,
          );
          if (!foundUse) return null;

          foundUse.status = useAttainment.useAttainmentCodeName;
          if (foundUse) relatedUses.push(foundUse);
        });

        if (relatedUses.length === 0) return null;

        if (
          checkStatus(relatedUses, 'Not Supporting') ||
          checkStatus(relatedUses, 'Cause')
        )
          return 'Not Supporting';

        if (
          checkStatus(relatedUses, 'Fully Supporting') ||
          checkStatus(relatedUses, 'Meeting Criteria')
        )
          return 'Fully Supporting';

        return 'Insufficient Information';
      }

      function checkParameterStatus(
        parameterName,
        parameters,
        impairmentFields,
        attainsDomainsData,
      ) {
        const hasCause = parameters.some((parameter) => {
          const relevantDomainMapping = attainsDomainsData.find(
            (domain) => domain.name === parameter.parameterName,
          );

          const relevantAttainsMapping = impairmentFields.find(
            (impairment) => impairment.value === parameterName,
          );

          if (!relevantAttainsMapping || !relevantDomainMapping) {
            return null;
          }

          return (
            relevantAttainsMapping.parameterGroup ===
              relevantDomainMapping.context &&
            parameter.parameterStatusName === 'Cause' &&
            relevantAttainsMapping.value === parameterName
          );
        });
        return hasCause ? 'Cause' : null;
      }

      const orgId = res[0].organizationIdentifier;
      const orgType = res[0].organizationTypeText;
      const organizationName = res[0].organizationName;
      const cycleYear = res[0].reportingCycleText;

      return res[0].assessments.map((assessment) => {
        const assessmentUnitName = matchAssessmentUnitName(
          assessment.assessmentUnitIdentifier,
          allAssessmentUnits,
        );

        const stateCode = matchStateCodeToAssessment(
          assessment.assessmentUnitIdentifier,
          allAssessmentUnits,
        );

        function createParametersObject(parameterList) {
          const tempObject = {};
          parameterList.forEach((parameter) => {
            tempObject[parameter] = checkParameterStatus(
              parameter,
              assessment.parameters,
              impairmentFields,
              attainsDomainsData,
            );
          });
          return tempObject;
        }
        const parametersObject = createParametersObject(parameterList);

        return {
          limited: true,
          attributes: {
            organizationid: orgId,
            assessmentunitidentifier: assessment.assessmentUnitIdentifier,
            reportingcycle: cycleYear,
            assessmentunitname: assessmentUnitName,
            overallstatus: assessment.overallStatus,
            orgtype: orgType,
            organizationname: organizationName,
            drinkingwater_use: getUseStatus(
              'Drinking Water',
              stateCode,
              assessment.useAttainments,
            ),
            fishconsumption_use: getUseStatus(
              'Fish and Shellfish Consumption',
              stateCode,
              assessment.useAttainments,
            ),
            ecological_use: getUseStatus(
              'Ecological Life',
              stateCode,
              assessment.useAttainments,
            ),
            recreation_use: getUseStatus(
              'Recreation', // Recreation in Attains = Swimming and Boating in HMW
              stateCode,
              assessment.useAttainments,
            ),
            ...parametersObject, // contains all parameters and their statuses
          },
        };
      });
    },
    [stateNationalUses],
  );

  const handleOrphanedFeatures = useCallback(
    (res, attainsDomainsData, missingAssessments) => {
      if (organizations.status !== 'success') return;

      const allAssessmentUnits = [];
      res.items.forEach((item) =>
        item.assessmentUnits.forEach((assessmentUnit) => {
          allAssessmentUnits.push(assessmentUnit);
        }),
      );

      // track how many of the missing assessments are in the Assessment Unit Service. if any are not in the service results, log the event
      const allIdsInAssessmentUnitService = [];
      allAssessmentUnits.forEach((item) => {
        allIdsInAssessmentUnitService.push(item.assessmentUnitIdentifier);
      });

      const idsNotInAssessmentUnitService = missingAssessments.filter(
        (id) => !allIdsInAssessmentUnitService.includes(id),
      );

      if (
        idsNotInAssessmentUnitService &&
        idsNotInAssessmentUnitService.length > 0
      ) {
        window.logToGa('send', 'exception', {
          exDescription: `The Assessment Units service did not return data for the following assessment IDs ${idsNotInAssessmentUnitService.join(
            ', ',
          )}`,
          exFatal: false,
        });
      }

      const requests = [];
      res.items.forEach((item) => {
        const orgId = item.organizationIdentifier;
        const ids = item.assessmentUnits.map(
          (assessment) => assessment.assessmentUnitIdentifier,
        );

        // if no IDs are found in the Assessment Units service, do not call the Assessments service.
        // the Assessments service will return ALL assessments in the organization if none are passed in
        if (!ids || ids.length === 0) {
          return;
        }

        // get organization
        const organization = organizations.data.features.find(
          (org) => org.attributes.organizationid === orgId,
        );
        const reportingCycle = organization?.attributes?.reportingcycle;
        if (!reportingCycle) return;

        const url =
          `${services.data.attains.serviceUrl}` +
          `assessments?organizationId=${orgId}&reportingCycle=${reportingCycle}&assessmentUnitIdentifier=${ids.join(
            ',',
          )}`;

        requests.push(fetchCheck(url));
      });

      Promise.all(requests)
        .then((responses) => {
          if (!responses) {
            setOrphanFeatures({ features: [], status: 'error' });
            return;
          }

          let orphans = [];
          responses.forEach((response) => {
            if (!response || !response.items || response.items.length === 0) {
              setOrphanFeatures({ features: [], status: 'error' });
              return;
            }

            const detailedFeatures = createDetailedOrphanFeatures(
              response.items,
              allAssessmentUnits,
              attainsDomainsData,
            );
            orphans = orphans.concat(detailedFeatures);
          });

          setOrphanFeatures({
            features: orphans,
            status: 'success',
          });
        })
        .catch((err) => {
          console.error(err);
          setOrphanFeatures({ features: [], status: 'error' });
        });
    },
    [createDetailedOrphanFeatures, organizations, services, setOrphanFeatures],
  );

  // Check if the Huc12Summary service contains any Assessment IDs that are not included in the GIS (points/lines/areas) results.
  // If so, query the individual missing assessment IDs using the ATTAINS assessments and assessmentUnits service
  // to build a complete feature that can be displayed in the Community section,
  // These features are marked by a custom attribute {... limited: true ...} and they lack spatial representation on the map.
  const [assessmentUnitCount, setAssessmentUnitCount] = useState(0);
  const [checkedForOrphans, setCheckedForOrphans] = useState(false);
  useEffect(() => {
    if (
      organizations.status === 'fetching' ||
      stateNationalUses.status === 'fetching'
    ) {
      return;
    }

    if (!checkedForOrphans && areasData && linesData && pointsData) {
      setCheckedForOrphans(true);
      const allFeatures = getAllFeatures();

      const uniqueWaterbodies = allFeatures
        ? getUniqueWaterbodies(allFeatures)
        : [];

      if (uniqueWaterbodies.length < assessmentUnitCount) {
        if (waterbodyCountMismatch) return;
        if (assessmentUnitIDs.length === 0) return;

        const gisIDs = uniqueWaterbodies.map(
          (feature) => feature.attributes.assessmentunitidentifier,
        );

        const orphanIDs = assessmentUnitIDs.filter(
          (id) => !gisIDs.includes(id),
        );

        if (orphanIDs.length === 0) return;
        setWaterbodyCountMismatch(true);

        window.logToGa('send', 'exception', {
          exDescription: `huc12Summary service contained ${assessmentUnitCount} Assessment Unit IDs but the GIS service contained ${
            uniqueWaterbodies.length
          } features for HUC ${huc12}. Assessment Unit IDs not found in GIS service: (${orphanIDs.join(
            ', ',
          )})`,
          exFatal: false,
        });

        setOrphanFeatures({ features: [], status: 'fetching' });

        // fetch the ATTAINS Domains service Parameter Names so we can populate the Waterbody Parameters later on
        fetchCheck(
          `${services.data.attains.serviceUrl}domains?domainName=ParameterName`,
        )
          .then((res) => {
            if (!res || res.length === 0) {
              setOrphanFeatures({ features: [], status: 'error' });
              return;
            }

            const attainsDomainsData = res;

            const url =
              `${services.data.attains.serviceUrl}` +
              `assessmentUnits?assessmentUnitIdentifier=${orphanIDs.join(',')}`;

            fetchCheck(url)
              .then((resUnits) => {
                if (
                  !resUnits ||
                  !resUnits.items ||
                  resUnits.items.length === 0
                ) {
                  setOrphanFeatures({ features: [], status: 'error' });
                  return;
                }
                handleOrphanedFeatures(resUnits, attainsDomainsData, orphanIDs);
              })
              .catch((err) => {
                console.error(err);
                setOrphanFeatures({ features: [], status: 'error' });
              });
          })
          .catch((err) => {
            console.error(err);
            setOrphanFeatures({ features: [], status: 'error' });
          });
      } else {
        setWaterbodyCountMismatch(false);
      }
    }
  }, [
    areasData,
    assessmentUnitCount,
    assessmentUnitIDs,
    checkedForOrphans,
    getAllFeatures,
    handleOrphanedFeatures,
    huc12,
    linesData,
    organizations,
    pointsData,
    services,
    setOrphanFeatures,
    stateNationalUses,
    waterbodyCountMismatch,
    setWaterbodyCountMismatch,
  ]);

  // track Esri map load errors for older browsers and devices that do not support ArcGIS 4.x
  const [communityMapLoadError, setCommunityMapLoadError] = useState(false);

  const getSharedLayers = useSharedLayers();
  useWaterbodyHighlight();

  const getDynamicPopup = useDynamicPopup();
  const { getTitle, getTemplate, setDynamicPopupFields } = getDynamicPopup();

  // Builds the layers that have no dependencies
  const [layersInitialized, setLayersInitialized] = useState(false);
  useEffect(() => {
    if (!getSharedLayers || layersInitialized) return;

    if (layers.length > 0) return;

    // create the layers for the map
    const providersLayer = new GraphicsLayer({
      id: 'providersLayer',
      title: 'Who provides the drinking water here?',
      listMode: 'hide',
    });

    setProvidersLayer(providersLayer);

    const boundariesLayer = new GraphicsLayer({
      id: 'boundariesLayer',
      title: 'Boundaries',
      listMode: 'hide',
    });

    setBoundariesLayer(boundariesLayer);

    const searchIconLayer = new GraphicsLayer({
      id: 'searchIconLayer',
      title: 'Search Location',
      listMode: 'hide',
    });

    setSearchIconLayer(searchIconLayer);

    const upstreamLayer = new GraphicsLayer({
      id: 'upstreamWatershed',
      title: 'Upstream Watershed',
      listMode: 'hide',
      visible: false,
    });

    setUpstreamLayer(upstreamLayer);

    const monitoringLocationsLayer = new FeatureLayer({
      id: 'monitoringLocationsLayer',
      title: 'Past Water Conditions',
      listMode: 'hide',
      legendEnabled: true,
      fields: [
        { name: 'OBJECTID', type: 'oid' },
        { name: 'monitoringType', type: 'string' },
        { name: 'siteId', type: 'string' },
        { name: 'orgId', type: 'string' },
        { name: 'orgName', type: 'string' },
        { name: 'locationLongitude', type: 'double' },
        { name: 'locationLatitude', type: 'double' },
        { name: 'locationName', type: 'string' },
        { name: 'locationType', type: 'string' },
        { name: 'locationUrl', type: 'string' },
        { name: 'stationProviderName', type: 'string' },
        { name: 'stationTotalSamples', type: 'integer' },
        { name: 'stationTotalsByGroup', type: 'string' },
        { name: 'stationTotalMeasurements', type: 'integer' },
        { name: 'timeframe', type: 'string' },
        { name: 'uniqueId', type: 'string' },
      ],
      objectIdField: 'OBJECTID',
      outFields: ['*'],
      // NOTE: initial graphic below will be replaced with UGSG streamgages
      source: [
        new Graphic({
          geometry: { type: 'point', longitude: -98.5795, latitude: 39.8283 },
          attributes: { OBJECTID: 1 },
        }),
      ],
      renderer: {
        type: 'simple',
        symbol: {
          type: 'simple-marker',
          style: 'circle',
          color: colors.lightPurple(0.5),
        },
      },
      featureReduction: {
        type: 'cluster',
        clusterRadius: '100px',
        clusterMinSize: '24px',
        clusterMaxSize: '60px',
        popupEnabled: true,
        popupTemplate: {
          title: 'Cluster summary',
          content: (feature) => {
            const content = (
              <div style={{ margin: '0.625em' }}>
                This cluster represents{' '}
                {feature.graphic.attributes.cluster_count} stations
              </div>
            );

            const contentContainer = document.createElement('div');
            render(content, contentContainer);

            // return an esri popup item
            return contentContainer;
          },
          fieldInfos: [
            {
              fieldName: 'cluster_count',
              format: {
                places: 0,
                digitSeparator: true,
              },
            },
          ],
        },
        labelingInfo: [
          {
            deconflictionStrategy: 'none',
            labelExpressionInfo: {
              expression: "Text($feature.cluster_count, '#,###')",
            },
            symbol: {
              type: 'text',
              color: '#000000',
              font: { size: 10, weight: 'bold' },
            },
            labelPlacement: 'center-center',
          },
        ],
      },
      popupTemplate: {
        outFields: ['*'],
        title: (feature) => getPopupTitle(feature.graphic.attributes),
        content: (feature) => {
          // Parse non-scalar variables
          const structuredProps = ['stationTotalsByGroup', 'timeframe'];
          feature.graphic.attributes = parseAttributes(
            structuredProps,
            feature.graphic.attributes,
          );
          return getPopupContent({
            feature: feature.graphic,
            services,
            navigate,
          });
        },
      },
    });

    setMonitoringLocationsLayer(monitoringLocationsLayer);

    const usgsStreamgagesLayer = new FeatureLayer({
      id: 'usgsStreamgagesLayer',
      title: 'Current Water Conditions',
      listMode: 'hide',
      legendEnabled: false,
      fields: [
        { name: 'OBJECTID', type: 'oid' },
        { name: 'monitoringType', type: 'string' },
        { name: 'siteId', type: 'string' },
        { name: 'orgId', type: 'string' },
        { name: 'orgName', type: 'string' },
        { name: 'locationLongitude', type: 'single' },
        { name: 'locationLatitude', type: 'single' },
        { name: 'locationName', type: 'string' },
        { name: 'locationType', type: 'string' },
        { name: 'locationUrl', type: 'string' },
        { name: 'streamgageMeasurements', type: 'blob' },
      ],
      objectIdField: 'OBJECTID',
      outFields: ['*'],
      // NOTE: initial graphic below will be replaced with UGSG streamgages
      source: [
        new Graphic({
          geometry: { type: 'point', longitude: -98.5795, latitude: 39.8283 },
          attributes: { OBJECTID: 1 },
        }),
      ],
      renderer: {
        type: 'simple',
        symbol: {
          type: 'simple-marker',
          style: 'square',
          color: '#fffe00', // '#989fa2'
        },
      },
      popupTemplate: {
        outFields: ['*'],
        title: (feature) => getPopupTitle(feature.graphic.attributes),
        content: (feature) =>
          getPopupContent({ feature: feature.graphic, navigate }),
      },
    });

    setUsgsStreamgagesLayer(usgsStreamgagesLayer);

    const issuesLayer = new GraphicsLayer({
      id: 'issuesLayer',
      title: 'Identified Issues',
      listMode: 'hide',
    });

    setIssuesLayer(issuesLayer);

    const dischargersLayer = new GraphicsLayer({
      id: 'dischargersLayer',
      title: 'Dischargers',
      listMode: 'hide',
    });

    setDischargersLayer(dischargersLayer);

    const nonprofitsLayer = new GraphicsLayer({
      id: 'nonprofitsLayer',
      title: 'Nonprofits',
      listMode: 'hide',
    });

    setNonprofitsLayer(nonprofitsLayer);

    setLayers([
      ...getSharedLayers(),
      providersLayer,
      boundariesLayer,
      upstreamLayer,
      monitoringLocationsLayer,
      usgsStreamgagesLayer,
      issuesLayer,
      dischargersLayer,
      nonprofitsLayer,
      searchIconLayer,
    ]);

    setLayersInitialized(true);
  }, [
    getSharedLayers,
    getTemplate,
    getTitle,
    layers,
    setBoundariesLayer,
    setDischargersLayer,
    setIssuesLayer,
    setLayers,
    setMonitoringLocationsLayer,
    setUsgsStreamgagesLayer,
    setUpstreamLayer,
    setNonprofitsLayer,
    setProvidersLayer,
    setSearchIconLayer,
    layersInitialized,
    services,
    navigate,
  ]);

  // popup template to be used for all waterbody sublayers
  const popupTemplate = useMemo(() => {
    return {
      outFields: ['*'],
      title: (feature) => getPopupTitle(feature.graphic.attributes),
      content: (feature) =>
        getPopupContent({ feature: feature.graphic, services, navigate }),
    };
  }, [services, navigate]);

  const handleMapServiceError = useCallback(
    (err) => {
      setMapLoading(false);
      console.error(err);
      setCipSummary({ status: 'failure', data: {} });
    },
    [setCipSummary],
  );

  const { cropGeometryToHuc } = useGeometryUtils();

  // Gets the lines data and builds the associated feature layer
  const retrieveLines = useCallback(
    (filter, boundaries) => {
      const query = new Query({
        returnGeometry: true,
        where: filter,
        outFields: ['*'],
      });

      new QueryTask({ url: services.data.waterbodyService.lines })
        .execute(query)
        .then((res) => {
          // build a list of features that still has the original uncropped
          // geometry and set context
          let originalFeatures = [];
          res.features.forEach((item) => {
            item['originalGeometry'] = item.geometry;
            originalFeatures.push(item);
          });
          setLinesData({ features: originalFeatures });

          // crop the waterbodies geometry to within the huc
          const features = cropGeometryToHuc(
            res.features,
            boundaries.features[0].geometry,
          );

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
          const newLinesLayer = new FeatureLayer({
            id: 'waterbodyLines',
            name: 'Lines',
            geometryType: res.geometryType,
            spatialReference: res.spatialReference,
            fields: res.fields,
            source: features,
            outFields: ['*'],
            renderer: linesRenderer,
            popupTemplate,
          });
          setLinesLayer(newLinesLayer);
        })
        .catch((err) => {
          handleMapServiceError(err);
          setLinesLayer('error');
          setLinesData({ features: [] });
        });
    },
    [
      cropGeometryToHuc,
      handleMapServiceError,
      popupTemplate,
      setLinesData,
      setLinesLayer,
      services,
    ],
  );

  // Gets the areas data and builds the associated feature layer
  const retrieveAreas = useCallback(
    (filter, boundaries) => {
      const query = new Query({
        returnGeometry: true,
        where: filter,
        outFields: ['*'],
      });

      new QueryTask({ url: services.data.waterbodyService.areas })
        .execute(query)
        .then((res) => {
          // build a list of features that still has the original uncropped
          // geometry and set context
          let originalFeatures = [];
          res.features.forEach((item) => {
            item['originalGeometry'] = item.geometry;
            originalFeatures.push(item);
          });
          setAreasData({ features: originalFeatures });

          // crop the waterbodies geometry to within the huc
          const features = cropGeometryToHuc(
            res.features,
            boundaries.features[0].geometry,
          );

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
          const newAreasLayer = new FeatureLayer({
            id: 'waterbodyAreas',
            name: 'Areas',
            geometryType: res.geometryType,
            spatialReference: res.spatialReference,
            fields: res.fields,
            source: features,
            outFields: ['*'],
            renderer: areasRenderer,
            popupTemplate,
          });
          setAreasLayer(newAreasLayer);
        })
        .catch((err) => {
          handleMapServiceError(err);
          setAreasLayer('error');
          setAreasData({ features: [] });
        });
    },
    [
      cropGeometryToHuc,
      handleMapServiceError,
      popupTemplate,
      setAreasData,
      setAreasLayer,
      services,
    ],
  );

  // Gets the points data and builds the associated feature layer
  const retrievePoints = useCallback(
    (filter) => {
      const query = new Query({
        returnGeometry: true,
        where: filter,
        outFields: ['*'],
      });

      new QueryTask({ url: services.data.waterbodyService.points })
        .execute(query)
        .then((res) => {
          setPointsData(res);

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

          const newPointsLayer = new FeatureLayer({
            id: 'waterbodyPoints',
            name: 'Points',
            geometryType: res.geometryType,
            spatialReference: res.spatialReference,
            fields: res.fields,
            source: res.features,
            outFields: ['*'],
            renderer: pointsRenderer,
            popupTemplate,
          });
          setPointsLayer(newPointsLayer);
        })
        .catch((err) => {
          handleMapServiceError(err);
          setPointsLayer('error');
          setPointsData({ features: [] });
        });
    },
    [
      handleMapServiceError,
      popupTemplate,
      setPointsData,
      setPointsLayer,
      services,
    ],
  );

  // if any service fails, consider all of them failed and do not show any waterbody data
  const mapServiceFailure =
    linesLayer === 'error' ||
    areasLayer === 'error' ||
    pointsLayer === 'error' ||
    orphanFeatures.status === 'error';

  // Builds the waterbody layer once data has been fetched for all sub layers
  useEffect(() => {
    if (mapServiceFailure) {
      setMapLoading(false);
      setCipSummary({ status: 'failure', data: {} });
      return;
    }

    if (
      waterbodyLayer ||
      layers.length === 0 ||
      !areasLayer ||
      !linesLayer ||
      !pointsLayer
    ) {
      return;
    }

    // Make the waterbody layer into a single layer
    const newWaterbodyLayer = new GroupLayer({
      id: 'waterbodyLayer',
      title: 'Waterbodies',
      listMode: 'hide',
      visible: false,
      legendEnabled: false,
    });
    newWaterbodyLayer.addMany([areasLayer, linesLayer, pointsLayer]);
    setWaterbodyLayer(newWaterbodyLayer);

    // Build the new set of layers with the waterbody layer at the correct position
    const newLayers = [];
    layers.forEach((layer) => {
      newLayers.push(layer);
      if (layer.id === 'boundariesLayer') {
        newLayers.push(newWaterbodyLayer);
      }
    });
    setLayers(newLayers);
  }, [
    layers,
    waterbodyLayer,
    areasLayer,
    linesLayer,
    pointsLayer,
    mapServiceFailure,
    setWaterbodyLayer,
    setLayers,
    setCipSummary,
  ]);

  // query geocode server for every new search
  const [mapLoading, setMapLoading] = useState(true);

  const queryMonitoringStationService = useCallback(
    (huc12Param) => {
      const url =
        `${services.data.waterQualityPortal.monitoringLocation}` +
        `search?mimeType=geojson&zip=no&huc=${huc12Param}`;

      fetchCheck(url)
        .then((res) => {
          setMonitoringLocations({
            status: 'success',
            data: res,
          });
        })
        .catch((err) => {
          console.error(err);
          setMonitoringLocations({ status: 'failure', data: {} });
        });
    },
    [setMonitoringLocations, services],
  );

  // updates the features on the monitoringStationsLayer
  // and the monitoring groups
  useMonitoringLocations();

  const fetchUsgsStreamgages = useCallback(
    (huc12) => {
      const url =
        `${services.data.usgsSensorThingsAPI}?` +
        /**/ `$select=name,` +
        /*  */ `properties/active,` +
        /*  */ `properties/agency,` +
        /*  */ `properties/agencyCode,` +
        /*  */ `properties/monitoringLocationUrl,` +
        /*  */ `properties/monitoringLocationName,` +
        /*  */ `properties/monitoringLocationType,` +
        /*  */ `properties/monitoringLocationNumber,` +
        /*  */ `properties/hydrologicUnit&` +
        /**/ `$expand=` +
        /*  */ `Locations($select=location),` +
        /*  */ `Datastreams(` +
        /*    */ `$select=description,` +
        /*      */ `properties/ParameterCode,` +
        /*      */ `properties/WebDescription,` +
        /*      */ `unitOfMeasurement/name,` +
        /*      */ `unitOfMeasurement/symbol;` +
        /*    */ `$expand=` +
        /*      */ `Observations(` +
        /*        */ `$select=phenomenonTime,result;` +
        /*        */ `$top=1;` +
        /*        */ `$orderBy=phenomenonTime desc` +
        /*      */ `)` +
        /*  */ `)&` +
        /**/ `$filter=properties/hydrologicUnit eq '${huc12}'`;

      fetchedDataDispatch({ type: 'USGS_STREAMGAGES/FETCH_REQUEST' });

      fetchCheck(url)
        .then((res) => {
          fetchedDataDispatch({
            type: 'USGS_STREAMGAGES/FETCH_SUCCESS',
            payload: res,
          });
        })
        .catch((err) => {
          console.error(err);
          fetchedDataDispatch({ type: 'USGS_STREAMGAGES/FETCH_FAILURE' });
        });
    },
    [services, fetchedDataDispatch],
  );

  const fetchUsgsPrecipitation = useCallback(
    (huc12) => {
      // https://help.waterdata.usgs.gov/stat_code
      const sumValues = '00006';

      // https://help.waterdata.usgs.gov/codes-and-parameters/parameters
      const precipitation = '00045'; // Precipitation, total, inches

      const url =
        services.data.usgsDailyValues +
        `?format=json` +
        `&siteStatus=active` +
        `&statCd=${sumValues}` +
        `&parameterCd=${precipitation}` +
        `&huc=${huc12.substring(0, 8)}`;

      fetchedDataDispatch({ type: 'USGS_PRECIPITATION/FETCH_REQUEST' });

      fetchCheck(url)
        .then((res) => {
          fetchedDataDispatch({
            type: 'USGS_PRECIPITATION/FETCH_SUCCESS',
            payload: res,
          });
        })
        .catch((err) => {
          console.error(err);
          fetchedDataDispatch({ type: 'USGS_PRECIPITATION/FETCH_FAILURE' });
        });
    },
    [services, fetchedDataDispatch],
  );

  const fetchUsgsDailyAverages = useCallback(
    (huc12) => {
      // https://help.waterdata.usgs.gov/stat_code
      const meanValues = '00003';
      const sumValues = '00006';

      // https://help.waterdata.usgs.gov/codes-and-parameters/parameters
      const allParams = 'all';
      const precipitation = '00045'; // Precipitation, total, inches

      const url =
        services.data.usgsDailyValues +
        `?format=json` +
        `&siteStatus=active` +
        `&period=P7D` +
        `&huc=${huc12.substring(0, 8)}`;

      fetchedDataDispatch({ type: 'USGS_DAILY_AVERAGES/FETCH_REQUEST' });

      Promise.all([
        fetchCheck(`${url}&statCd=${meanValues}&parameterCd=${allParams}`),
        fetchCheck(`${url}&statCd=${sumValues}&parameterCd=${precipitation}`),
      ])
        .then(([allParamsRes, precipitationRes]) => {
          fetchedDataDispatch({
            type: 'USGS_DAILY_AVERAGES/FETCH_SUCCESS',
            payload: {
              allParamsMean: allParamsRes,
              precipitationSum: precipitationRes,
            },
          });
        })
        .catch((err) => {
          console.error(err);
          fetchedDataDispatch({ type: 'USGS_DAILY_AVERAGES/FETCH_FAILURE' });
        });
    },
    [services, fetchedDataDispatch],
  );

  const normalizedUsgsStreamgages = useStreamgageData(
    usgsStreamgages,
    usgsPrecipitation,
    usgsDailyAverages,
  );

  useEffect(() => {
    if (!usgsStreamgagesLayer || !normalizedUsgsStreamgages.length) return;

    const graphics = normalizedUsgsStreamgages.map((gage) => {
      return new Graphic({
        geometry: {
          type: 'point',
          longitude: gage.locationLongitude,
          latitude: gage.locationLatitude,
        },
        attributes: gage,
      });
    });

    return usgsStreamgagesLayer.queryFeatures().then((featureSet) => {
      return usgsStreamgagesLayer.applyEdits({
        deleteFeatures: featureSet.features,
        addFeatures: graphics,
      });
    });
  }, [normalizedUsgsStreamgages, usgsStreamgagesLayer]);

  const queryPermittedDischargersService = useCallback(
    (huc12Param) => {
      fetchCheck(services.data.echoNPDES.metadata)
        .then((res) => {
          // Columns to return from Echo
          const facilityColumns = [
            'CWPName',
            'CWPStatus',
            'CWPViolStatus',
            'CWPSNCStatus',
            'CWPPermitStatusDesc',
            'CWPQtrsWithNC',
            'CWPInspectionCount',
            'CWPFormalEaCnt',
            'RegistryID',
            'FacLong',
            'FacLat',
          ];

          // Loop through the metadata and find the ids of the columns we want
          const columnIds = [];
          res.Results.ResultColumns.forEach((column) => {
            if (facilityColumns.indexOf(column.ObjectName) !== -1) {
              columnIds.push(column.ColumnID);
            }
          });

          const url =
            `${services.data.echoNPDES.getFacilities}?output=JSON&tablelist=Y&p_wbd=${huc12Param}` +
            `&p_act=Y&p_ptype=NPD&responseset=5000` +
            `&qcolumns=${columnIds.join(',')}`;

          fetchCheck(url)
            .then((res) => {
              setPermittedDischargers({ status: 'success', data: res });
            })
            .catch((err) => {
              console.error(err);
              setPermittedDischargers({ status: 'failure', data: {} });
            });
        })
        .catch((err) => {
          console.error(err);
          setPermittedDischargers({ status: 'failure', data: {} });
        });
    },
    [setPermittedDischargers, services],
  );

  const queryGrtsHuc12 = useCallback(
    (huc12Param) => {
      fetchCheck(`${services.data.grts.getGRTSHUC12}${huc12Param}`)
        .then((res) => {
          setGrts({
            data: res,
            status: 'success',
          });
        })
        .catch((err) => {
          console.error(err);
          setGrts({
            data: [],
            status: 'failure',
          });
        });
    },
    [setGrts, services],
  );

  // Runs a query to get the plans for the selected huc.
  // Note: The actions page will attempt to look up the organization id.
  const queryAttainsPlans = useCallback(
    (huc12Param) => {
      // get the plans for the selected huc
      fetchCheck(
        `${services.data.attains.serviceUrl}plans?huc=${huc12Param}&summarize=Y`,
        120000,
      )
        .then((res) => {
          setAttainsPlans({
            data: res,
            status: 'success',
          });
        })
        .catch((err) => {
          console.error(err);
          setAttainsPlans({
            data: {},
            status: 'failure',
          });
        });
    },
    [setAttainsPlans, services],
  );

  useEffect(() => {
    if (mapServiceFailure) {
      setMapLoading(false);
    }
  }, [mapServiceFailure]);

  const getFishingLinkData = useCallback(
    (states) => {
      setFishingInfo({ status: 'fetching', data: [] });

      // Turn the returned string "VA,MA,AL" into an array [VA, MA, AL]
      const statesList = states.split(',');

      // Map the array to a format for querying and join it as a string 'VA','MA','AL'
      // Service returns lowercase state codes for some locations so .toUpperCase() them
      const stateQueryString = statesList
        .map((stateCode) => `'${stateCode.toUpperCase()}'`)
        .join();

      const url =
        services.data.fishingInformationService.serviceUrl +
        services.data.fishingInformationService.queryStringFirstPart +
        stateQueryString +
        services.data.fishingInformationService.queryStringSecondPart;

      fetchCheck(url)
        .then((res) => {
          if (!res || !res.features || res.features.length <= 0) {
            setFishingInfo({ status: 'success', data: [] });
            return;
          }

          const fishingInfo = res.features.map((feature) => ({
            url: feature.attributes.STATEURL,
            stateCode: feature.attributes.STATE,
          }));

          setFishingInfo({ status: 'success', data: fishingInfo });
        })
        .catch((err) => {
          console.error(err);
          setFishingInfo({ status: 'failure', data: [] });
        });
    },
    [setFishingInfo, services],
  );

  const getWsioHealthIndexData = useCallback(
    (huc12Param) => {
      const url =
        `${services.data.wsio}/query?where=HUC12_TEXT%3D%27${huc12Param}%27` +
        '&outFields=HUC12_TEXT%2CSTATES_ALL%2CPHWA_HEALTH_NDX_ST&returnGeometry=false&f=json';

      setWsioHealthIndexData({
        data: [],
        status: 'fetching',
      });

      fetchCheck(url)
        .then((res) => {
          if (!res || !res.features || res.features.length <= 0) {
            setWsioHealthIndexData({ status: 'success', data: [] });
            return;
          }

          const healthIndexData = res.features.map((feature) => ({
            states: feature.attributes.STATES_ALL,
            phwaHealthNdxSt: feature.attributes.PHWA_HEALTH_NDX_ST,
          }));

          setWsioHealthIndexData({
            status: 'success',
            data: healthIndexData,
          });
        })
        .catch((err) => {
          console.error(err);
          setWsioHealthIndexData({ status: 'failure', data: [] });
        });
    },
    [setWsioHealthIndexData, services],
  );

  const getWildScenicRivers = useCallback(
    (boundaries) => {
      if (
        !boundaries ||
        !boundaries.features ||
        boundaries.features.length === 0
      ) {
        setWildScenicRiversData({
          data: [],
          status: 'success',
        });
        return;
      }

      const query = new Query({
        geometry: boundaries.features[0].geometry,
        returnGeometry: false,
        spatialReference: 102100,
        outFields: ['*'],
      });

      setWildScenicRiversData({
        data: [],
        status: 'fetching',
      });

      new QueryTask({
        url: services.data.wildScenicRivers,
      })
        .execute(query)
        .then((res) => {
          setWildScenicRiversData({
            data: res.features,
            status: 'success',
          });
        })
        .catch((err) => {
          console.error(err);
          setWildScenicRiversData({
            data: [],
            status: 'failure',
          });
        });
    },
    [services, setWildScenicRiversData],
  );

  const getProtectedAreas = useCallback(
    (boundaries) => {
      if (
        !boundaries ||
        !boundaries.features ||
        boundaries.features.length === 0
      ) {
        setProtectedAreasData({
          data: [],
          fields: [],
          status: 'success',
        });
        return;
      }

      function onError(error) {
        console.error(error);
        setProtectedAreasData({
          data: [],
          fields: [],
          status: 'failure',
        });
      }

      fetchCheck(`${services.data.protectedAreasDatabase}0?f=json`)
        .then((layerInfo) => {
          const query = new Query({
            geometry: boundaries.features[0].geometry,
            returnGeometry: false,
            spatialReference: 102100,
            outFields: ['*'],
          });

          setProtectedAreasData({
            data: [],
            fields: [],
            status: 'fetching',
          });

          new QueryTask({
            url: `${services.data.protectedAreasDatabase}0`,
          })
            .execute(query)
            .then((res) => {
              // build/set the filter
              let filter = '';
              res.features.forEach((feature) => {
                if (filter) filter += ' Or ';
                filter += `OBJECTID = ${feature.attributes.OBJECTID}`;
              });

              setDynamicPopupFields(layerInfo.fields);
              setProtectedAreasData({
                data: res.features,
                fields: layerInfo.fields,
                status: 'success',
              });
            })
            .catch(onError);
        })
        .catch(onError);
    },
    [services, setProtectedAreasData, setDynamicPopupFields],
  );

  const handleMapServices = useCallback(
    (results, boundaries) => {
      // sort the parameters by highest percent to lowest
      results.items[0].summaryByParameterImpairments =
        results.items[0].summaryByParameterImpairments.sort((a, b) =>
          a.catchmentSizePercent < b.catchmentSizePercent ? 1 : -1,
        );
      setCipSummary({ status: 'success', data: results });
      setAssessmentUnitCount(results.items[0].assessmentUnits.length);

      const ids = results.items[0].assessmentUnits.map((item) => {
        return item.assessmentUnitId;
      });

      setAssessmentUnitIDs(ids);

      const filter = `assessmentunitidentifier in (${createQueryString(ids)})`;

      setCheckedForOrphans(false);
      retrieveLines(filter, boundaries);
      retrievePoints(filter);
      retrieveAreas(filter, boundaries);
    },
    [
      retrieveAreas,
      retrieveLines,
      retrievePoints,
      setAssessmentUnitIDs,
      setCipSummary,
    ],
  );

  const processBoundariesData = useCallback(
    (boundaries) => {
      let huc12Param = boundaries.features[0].attributes.huc12;

      setHucBoundaries(boundaries);
      // queryNonprofits(boundaries); // re-add when EPA approves RiverNetwork service for HMW

      // boundaries data, also has attributes for watershed
      setWatershed(boundaries.features[0].attributes.name);

      // pass all of the states that the HUC12 is in
      getFishingLinkData(boundaries.features[0].attributes.states);

      // get wsio health index data for the current huc
      getWsioHealthIndexData(huc12Param);

      // get Scenic River data for current huc boundaries
      getWildScenicRivers(boundaries);

      // get Protected Areas data for current huc boundaries
      getProtectedAreas(boundaries);

      // call states service for converting statecodes to state names
      // don't re-fetch the states service if it's already populated, it doesn't vary by location
      if (statesData.status !== 'success') {
        setStatesData({ status: 'fetching', data: [] });

        fetchCheck(`${services.data.attains.serviceUrl}states`)
          .then((res) => {
            setStatesData({ status: 'success', data: res.data });
          })
          .catch((err) => {
            console.error(err);
            setStatesData({ status: 'failure', data: [] });
          });
      }

      fetchCheck(
        `${services.data.attains.serviceUrl}huc12summary?huc=${huc12Param}`,
      ).then(
        (res) => handleMapServices(res, boundaries),
        handleMapServiceError,
      );
    },
    [
      getFishingLinkData,
      getWsioHealthIndexData,
      getWildScenicRivers,
      getProtectedAreas,
      handleMapServiceError,
      handleMapServices,
      setHucBoundaries,
      setStatesData,
      setWatershed,
      statesData.status,
      services,
    ],
  );

  // Clears state and navigates back to the community home page
  // when there is no data available.
  const handleNoDataAvailable = useCallback(
    (errorMessage) => {
      // reset canonical geoconnex PID link
      resetCanonicalLink();

      // remove JSON LD context script
      removeJsonLD();

      navigate('/community');
      setNoDataAvailable();
      setMapLoading(false);
      setErrorMessage(errorMessage);
    },
    [navigate, setErrorMessage, setNoDataAvailable],
  );

  const [hucResponse, setHucResponse] = useState(null);
  const handleHUC12 = useCallback(
    (response) => {
      setHucResponse(response);

      if (response.features.length > 0) {
        try {
          const { huc12 } = response.features[0].attributes;

          setHuc12(huc12);
          processBoundariesData(response);
          queryMonitoringStationService(huc12);
          fetchUsgsStreamgages(huc12);
          fetchUsgsPrecipitation(huc12);
          fetchUsgsDailyAverages(huc12);
          queryPermittedDischargersService(huc12);
          queryGrtsHuc12(huc12);
          queryAttainsPlans(huc12);

          // create canonical link and JSON LD
          updateCanonicalLink(huc12);
          createJsonLD(huc12, response.features[0].attributes.name);
        } catch (err) {
          console.error(err);
          handleNoDataAvailable(noDataAvailableError);
        }
      } else {
        handleNoDataAvailable(noDataAvailableError);
      }
    },
    [
      processBoundariesData,
      queryAttainsPlans,
      queryGrtsHuc12,
      queryMonitoringStationService,
      fetchUsgsStreamgages,
      fetchUsgsPrecipitation,
      fetchUsgsDailyAverages,
      queryPermittedDischargersService,
      setHuc12,
      handleNoDataAvailable,
    ],
  );

  const processGeocodeServerResults = useCallback(
    (searchText, hucRes = null) => {
      const renderMapAndZoomTo = (longitude, latitude, callback) => {
        const location = {
          type: 'point',
          longitude: longitude,
          latitude: latitude,
        };
        if (!searchIconLayer) return;

        searchIconLayer.graphics.removeAll();
        searchIconLayer.visible = true;
        searchIconLayer.graphics.add(
          new Graphic({
            geometry: location,
            symbol: new PictureMarkerSymbol({
              url: mapPin,
              width: 25,
              height: 25,
              yoffset: 9, // this is a little lower to account for space below pin
            }),
            attributes: { name: 'map-marker' },
          }),
        );

        callback();
      };

      const locator = new Locator({ url: services.data.locatorUrl });
      locator.outSpatialReference = SpatialReference.WebMercator;

      // Parse the search text to see if it is from a non-esri search suggestion
      const { searchPart, coordinatesPart } = splitSuggestedSearch(searchText);

      // Check if the search text contains coordinates.
      // First see if coordinates are part of a non-esri suggestion and
      // then see if the full text is coordinates
      let point = coordinatesPart
        ? coordinatesPart
        : getPointFromCoordinates(searchText);

      let getCandidates;
      if (point === null) {
        // if the user searches for guam use guam's state code instead
        if (searchText.toLowerCase() === 'guam') searchText = 'GU';

        // If not coordinates, perform regular geolocation
        getCandidates = locator.addressToLocations({
          address: { SingleLine: searchText },
          countryCode: 'USA',
          outFields: [
            'Loc_name',
            'City',
            'Place_addr',
            'Region',
            'RegionAbbr',
            'Country',
            'Addr_type',
          ],
        });
      } else {
        // If coordinates, perform reverse geolocation
        getCandidates = locator.locationToAddress({ location: point });
      }

      getCandidates
        .then((candidates) => {
          candidates = Array.isArray(candidates) ? candidates : [candidates];

          // find the location with the highest score in the candidate list
          // if multiple candidates have the same highhest value the first one is chosen
          let location;
          let highestCandidateScore = -1;
          for (const candidate of candidates) {
            if (candidate.score > highestCandidateScore) {
              location = candidate;
              highestCandidateScore = candidate.score;
            }
          }

          if (candidates.length === 0 || !location || !location.attributes) {
            const newAddress = coordinatesPart ? searchPart : searchText;
            setAddress(newAddress); // preserve the user's search so it is displayed
            handleNoDataAvailable(noDataAvailableError);
            return;
          }

          // when dealing with us territories make sure to pick a candidate
          // that has a region value and skip over USA candidates, to avoid
          // things like Guam, Missouri
          if (location.attributes.Country !== 'USA') {
            const country = location.attributes.Country;
            // break out of loop after first candidate with region and same country
            for (const candidate of candidates) {
              let candidateAttr = candidate.attributes;
              if (candidateAttr.Country === country && candidateAttr.Region) {
                location = candidate;
                break;
              }
            }
          }

          setAddress(location.address);
          setLocation(location);

          if (hucRes) {
            renderMapAndZoomTo(
              location.location.longitude,
              location.location.latitude,
              () => handleHUC12(hucRes),
            );
          } else {
            const hucQuery = new Query({
              returnGeometry: true,
              geometry: location.location,
              outFields: ['*'],
            });

            new QueryTask({ url: services.data.wbd })
              .execute(hucQuery)
              .then((hucRes) => {
                renderMapAndZoomTo(
                  location.location.longitude,
                  location.location.latitude,
                  () => handleHUC12(hucRes),
                );
              })
              .catch((err) => {
                console.error(err);
                const newAddress = coordinatesPart ? searchPart : searchText;
                setAddress(newAddress); // preserve the user's search so it is displayed
                handleNoDataAvailable(watersgeoError);
              });
          }

          const countiesQuery = new Query({
            returnGeometry: true,
            geometry: location.location.clone(),
            outFields: ['*'],
          });

          setFIPS({
            stateCode: '',
            countyCode: '',
            status: 'fetching',
          });

          new QueryTask({ url: `${services.data.counties}/query` })
            .execute(countiesQuery)
            .then((countiesRes) => {
              // not all locations have a State and County code, check for it
              if (
                countiesRes.features &&
                countiesRes.features.length > 0 &&
                countiesRes.features[0].attributes
              ) {
                const stateCode = countiesRes.features[0].attributes.STATE_FIPS;
                const countyCode =
                  countiesRes.features[0].attributes.FIPS.substring(2, 5);
                setFIPS({
                  stateCode: stateCode,
                  countyCode: countyCode,
                  status: 'success',
                });
              } else {
                setFIPS({
                  stateCode: '',
                  countyCode: '',
                  status: 'failure',
                });
              }

              setCountyBoundaries(countiesRes);
            })
            .catch((err) => {
              console.error(err);
              setCountyBoundaries(null);
              setMapLoading(false);
              setDrinkingWater({
                data: [],
                status: 'failure',
              });
              setFIPS({
                stateCode: '',
                countyCode: '',
                status: 'failure',
              });
            });
        })
        .catch((err) => {
          if (!hucRes) {
            console.error(err);
            const newAddress = coordinatesPart ? searchPart : searchText;
            setAddress(newAddress); // preserve the user's search so it is displayed
            handleNoDataAvailable(geocodeError);
            return;
          }

          // get the coordinates, round them and display as search text
          const coords = searchText.split(', ');
          const digits = 6;
          setAddress(
            parseFloat(coords[0]).toFixed(digits) +
              ', ' +
              parseFloat(coords[1]).toFixed(digits),
          );

          // Note: that since the geocoder failed, the lat/long will be displayed
          //   where the address would normally be.
          // Go ahead and zoom to the center of the huc
          const { centermass_x, centermass_y } = hucRes.features[0].attributes;
          renderMapAndZoomTo(centermass_x, centermass_y, () =>
            handleHUC12(hucRes),
          );

          // set drinkingWater to an empty array, since we don't have
          // the necessary parameters for the GetPWSWMHUC12 call
          setDrinkingWater({
            data: [],
            status: 'success',
          });
        });
    },
    [
      handleHUC12,
      searchIconLayer,
      setAddress,
      setCountyBoundaries,
      setDrinkingWater,
      setFIPS,
      handleNoDataAvailable,
      services,
    ],
  );

  const queryGeocodeServer = useCallback(
    (searchText) => {
      searchText = searchText.trim();

      // Get whether HUC 12
      if (isHuc12(searchText)) {
        const query = new Query({
          returnGeometry: true,
          where: "HUC12 = '" + searchText + "'",
          outFields: ['*'],
        });

        new QueryTask({ url: services.data.wbd })
          .execute(query)
          .then((response) => {
            if (response.features.length === 0) {
              // flag no data available for no response
              handleNoDataAvailable(noDataAvailableError);
            }

            // process the results
            else {
              const { centermass_x, centermass_y } =
                response.features[0].attributes;

              processGeocodeServerResults(
                `${centermass_x}, ${centermass_y}`,
                response,
              );
            }
          })
          .catch((err) => {
            console.error(err);
            handleNoDataAvailable(noDataAvailableError);
          });
      } else {
        // If not HUC12, get address first
        processGeocodeServerResults(searchText);
      }
    },
    [processGeocodeServerResults, handleNoDataAvailable, services],
  );

  useEffect(() => {
    if (layers.length === 0 || searchText === lastSearchText) return;

    fetchedDataDispatch({ type: 'RESET_FETCHED_DATA' });
    resetData();
    setMapLoading(true);
    setHucResponse(null);
    setErrorMessage('');
    setLastSearchText(searchText);
    queryGeocodeServer(searchText);
  }, [
    fetchedDataDispatch,
    searchText,
    lastSearchText,
    layers,
    resetData,
    setLastSearchText,
    queryGeocodeServer,
    setErrorMessage,
  ]);

  // reset map when searchText is cleared (when navigating away from '/community')
  useEffect(() => {
    if (!searchText) {
      setHuc12('');
      setMapLoading(false);
    }
  }, [searchText, setHuc12]);

  useEffect(() => {
    if (
      !mapView ||
      !hucBoundaries ||
      !hucBoundaries.features ||
      !hucBoundaries.features[0]
    ) {
      return;
    }

    const graphic = new Graphic({
      geometry: {
        type: 'polygon',
        spatialReference: hucBoundaries.spatialReference,
        rings: hucBoundaries.features[0].geometry.rings,
      },
      symbol: {
        type: 'simple-fill', // autocasts as new SimpleFillSymbol()
        color: [204, 255, 255, 0.5],
        outline: {
          color: [0, 0, 0],
          width: 2,
          style: 'dash',
        },
      },
      attributes: { name: 'boundaries' },
    });

    // clear previously set graphic (from a previous search), and add graphic
    boundariesLayer.graphics.removeAll();
    boundariesLayer.graphics.add(graphic);

    const currentViewpoint = new Viewpoint({
      targetGeometry: graphic.geometry.extent,
    });

    // store the current viewpoint in context
    setCurrentExtent(currentViewpoint);

    homeWidget.viewpoint = currentViewpoint;
    mapView.popup.close();

    // zoom to the graphic, and update the home widget, and close any popups
    mapView.goTo(graphic).then(function () {
      setAtHucBoundaries(true);
    });
  }, [
    mapView,
    hucBoundaries,
    boundariesLayer.graphics,
    setCurrentExtent,
    setAtHucBoundaries,
    homeWidget,
  ]);

  const [location, setLocation] = useState(null);
  useEffect(() => {
    if (!countyBoundaries || !hucResponse || !location) return;

    if (
      countyBoundaries.features.length === 0 ||
      hucResponse.features.length === 0
    ) {
      setDrinkingWater({
        data: [],
        status: 'success',
      });
    } else {
      // if FIPS codes do not exist we cannot query the drinking water service
      if (
        FIPS.status === 'failure' ||
        FIPS.stateCode === '' ||
        FIPS.countyCode === ''
      ) {
        setDrinkingWater({
          data: [],
          status: 'failure',
        });
        return;
      }

      const drinkingWaterUrl =
        `${services.data.dwmaps.GetPWSWMHUC12FIPS}` +
        `${hucResponse.features[0].attributes.huc12}/` +
        `${FIPS.stateCode}/` +
        `${FIPS.countyCode}`;

      fetchCheck(drinkingWaterUrl)
        .then((drinkingWaterRes) => {
          setDrinkingWater({
            data: drinkingWaterRes.items,
            status: 'success',
          });
        })
        .catch((err) => {
          console.error(err);
          setDrinkingWater({
            data: [],
            status: 'failure',
          });
        });
    }
  }, [
    FIPS,
    countyBoundaries,
    hucResponse,
    location,
    setDrinkingWater,
    services,
  ]);

  /* TODO - Add this code back in when EPA decides to bring back Nonprofits data
  const queryNonprofits = (boundaries) => {
    if (
      !boundariesLayer ||
      !boundaries.features ||
      boundaries.features.length === 0
    ) {
      setNonprofits({
        data: [],
        status: 'success',
      });
      return;
    }

    const query = new Query({
      geometry: boundaries.features[0].geometry,
      returnGeometry: true,
      spatialReference: 4326,
      outFields: ['*'],
    });

    new QueryTask({ url: nonprofits })
      .execute(query)
      .then((res) => {
        console.log('nonprofits data: ', res);
        setNonprofits({
          data: res,
          status: 'success'
        });
      })
      .catch((err) => {
        console.error(err);
        setNonprofits({
          data: [],
          status: 'failure'
        });
      });
  };
  */

  useEffect(() => {
    if (layout !== 'fullscreen') return;

    // scroll community content into view
    // get community content DOM node to scroll page when form is submitted
    const content = document.querySelector(`[data-content="locationmap"]`);
    if (content) {
      let pos = content.getBoundingClientRect();
      window.scrollTo(pos.left + window.scrollX, pos.top + window.scrollY);
    }
  }, [layout, windowHeight]);

  // calculate height of div holding searchText
  const [searchTextHeight, setSearchTextHeight] = useState(0);
  const measuredRef = useCallback((node) => {
    if (!node) return;
    setSearchTextHeight(node.getBoundingClientRect().height);
  }, []);

  // Used for shutting off the loading spinner after the waterbodyLayer is
  // added to the map and the view stops updating.
  const waterbodyFeatures = useWaterbodyFeatures();
  useEffect(() => {
    if (
      (!waterbodyLayer || waterbodyFeatures === null) &&
      cipSummary.status !== 'failure'
    ) {
      return;
    }

    setMapLoading(false);
  }, [waterbodyLayer, cipSummary, waterbodyFeatures]);

  // check for browser compatibility with map
  if (!browserIsCompatibleWithArcGIS() && !communityMapLoadError) {
    setCommunityMapLoadError(true);
  }

  // jsx
  const mapContent = (
    <>
      {/* for wide screens, LocationMap's children is searchText */}
      <div ref={measuredRef}>{children}</div>

      <div
        css={containerStyles}
        data-content="locationmap"
        data-testid="hmw-community-map"
        style={{
          marginTop: layout === 'wide' ? '1.25em' : '0',
          height:
            layout === 'fullscreen'
              ? windowHeight
              : windowHeight - searchTextHeight - 3 * mapPadding,
        }}
      >
        <Map layers={layers} />
        {mapView && mapLoading && <MapLoadingSpinner />}
      </div>
    </>
  );

  if (communityMapLoadError) {
    return <div css={errorBoxStyles}>{esriMapLoadingFailure}</div>;
  }

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

export default function LocationMapContainer({ ...props }: Props) {
  return (
    <MapErrorBoundary>
      <LocationMap {...props} />
    </MapErrorBoundary>
  );
}
