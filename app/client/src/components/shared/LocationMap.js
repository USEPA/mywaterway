// @flow

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Node } from 'react';
import { css } from 'styled-components/macro';
import StickyBox from 'react-sticky-box';
import { useNavigate } from 'react-router-dom';
import Polygon from '@arcgis/core/geometry/Polygon';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import * as locator from '@arcgis/core/rest/locator';
import PictureMarkerSymbol from '@arcgis/core/symbols/PictureMarkerSymbol';
import * as query from '@arcgis/core/rest/query';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import SpatialReference from '@arcgis/core/geometry/SpatialReference';
import Viewpoint from '@arcgis/core/Viewpoint';
// components
import Map from 'components/shared/Map';
import MapLoadingSpinner from 'components/shared/MapLoadingSpinner';
import mapPin from 'images/pin.png';
import {
  createWaterbodySymbol,
  createUniqueValueInfos,
  getPointFromCoordinates,
  getPopupContent,
  getPopupTitle,
  getUniqueWaterbodies,
  splitSuggestedSearch,
} from 'utils/mapFunctions';
import MapErrorBoundary from 'components/shared/ErrorBoundary.MapErrorBoundary';
// contexts
import { useFetchedDataDispatch } from 'contexts/FetchedData';
import { useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
import {
  useOrganizationsContext,
  useServicesContext,
  useStateNationalUsesContext,
} from 'contexts/LookupFiles';
// data
import { impairmentFields } from 'config/attainsToHmwMapping';
import { parameterList } from 'config/attainsParameters';
// errors
import {
  geocodeError,
  noDataAvailableError,
  watersgeoError,
  esriMapLoadingFailure,
} from 'config/errorMessages';
// helpers
import {
  useAbort,
  useCyanWaterbodiesLayers,
  useDynamicPopup,
  useGeometryUtils,
  useSharedLayers,
  useWaterbodyHighlight,
  useWaterbodyFeatures,
  useDischargersLayers,
  useMonitoringLocationsLayers,
  useStreamgageLayers,
} from 'utils/hooks';
import { fetchCheck } from 'utils/fetchUtils';
import {
  chunkArrayCharLength,
  isAbort,
  isHuc12,
  updateCanonicalLink,
  createJsonLD,
  browserIsCompatibleWithArcGIS,
  resetCanonicalLink,
  removeJsonLD,
} from 'utils/utils';
// styled components
import { errorBoxStyles } from 'components/shared/MessageBoxes';
// styles
import { colors } from 'styles/index.js';
import 'styles/mapStyles.css';

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

type Props = {
  layout: 'narrow' | 'wide' | 'fullscreen',
  windowHeight: number,
  children?: Node,
};

function LocationMap({ layout = 'narrow', windowHeight, children }: Props) {
  const { getSignal } = useAbort();

  const fetchedDataDispatch = useFetchedDataDispatch();
  const organizations = useOrganizationsContext();
  const services = useServicesContext();
  const navigate = useNavigate();

  const {
    searchText,
    lastSearchText,
    setLastSearchText,
    setCurrentExtent,
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
    // setNonprofits,
    setWatershed,
    FIPS,
    setFIPS,
    setErrorMessage,
    setWsioHealthIndexData,
    setWildScenicRiversData,
    setProtectedAreasData,
    getAllFeatures,
    waterbodyCountMismatch,
    setWaterbodyCountMismatch,
    resetData,
    setNoDataAvailable,
  } = useContext(LocationSearchContext);

  const {
    boundariesLayer,
    erroredLayers,
    layersInitialized,
    orderedLayers: layers,
    providersLayer,
    resetLayers,
    searchIconLayer,
    setLayer,
    setLayersInitialized,
    setResetHandler,
    updateErroredLayers,
    updateVisibleLayers,
    waterbodyAreas,
    waterbodyLayer,
    waterbodyLines,
    waterbodyPoints,
  } = useLayers();

  useCyanWaterbodiesLayers();
  useDischargersLayers();
  useMonitoringLocationsLayers(huc12 ? `huc=${huc12}` : null);
  useStreamgageLayers();

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
    (resUnits, attainsDomainsData, missingAssessments) => {
      if (organizations.status !== 'success') return;

      const allAssessmentUnits = [];
      resUnits.forEach((item) =>
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
      resUnits.forEach((item) => {
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

        // chunk the requests by character count
        // the assessmentUnitIdentifier param supports a max of 1000 characters
        const chunkedUnitIds = chunkArrayCharLength(ids, 1000);

        chunkedUnitIds.forEach((chunk) => {
          const url =
            `${services.data.attains.serviceUrl}` +
            `assessments?organizationId=${orgId}&reportingCycle=${reportingCycle}&assessmentUnitIdentifier=${chunk}`;

          requests.push(fetchCheck(url));
        });
      });

      Promise.all(requests)
        .then((responses) => {
          if (!responses) {
            setOrphanFeatures({ features: [], status: 'error' });
            return;
          }

          let orphans = [];
          responses.forEach((response) => {
            if (!response?.items || response.items.length === 0) {
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

            // chunk the requests by character count
            // the assessmentUnitIdentifier param supports a max of 1000 characters
            const chunkedUnitIds = chunkArrayCharLength(orphanIDs, 1000);

            const requests = [];
            chunkedUnitIds.forEach((chunk) => {
              const url =
                `${services.data.attains.serviceUrl}` +
                `assessmentUnits?assessmentUnitIdentifier=${chunk}`;

              requests.push(fetchCheck(url));
            });

            Promise.all(requests)
              .then((responses) => {
                if (!responses) {
                  setOrphanFeatures({ features: [], status: 'error' });
                  return;
                }

                let resUnits = [];
                responses.forEach((response) => {
                  if (!response?.items || response.items.length === 0) {
                    setOrphanFeatures({ features: [], status: 'error' });
                    return;
                  }

                  resUnits = resUnits.concat(response.items);
                });

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

  const getSharedLayers = useSharedLayers();
  useWaterbodyHighlight();

  const { setDynamicPopupFields } = useDynamicPopup();

  // Builds the layers that have no dependencies
  useEffect(() => {
    if (!getSharedLayers || layersInitialized) return;

    // create the layers for the map
    const providersLayer = new GraphicsLayer({
      id: 'providersLayer',
      title: 'Who provides the drinking water here?',
      listMode: 'show',
    });
    setLayer('providersLayer', providersLayer);
    setResetHandler('providersLayer', () =>
      providersLayer.graphics.removeAll(),
    );

    const boundariesLayer = new GraphicsLayer({
      id: 'boundariesLayer',
      title: 'Boundaries',
      listMode: 'show',
    });
    setLayer('boundariesLayer', boundariesLayer);
    setResetHandler('boundariesLayer', () => {
      boundariesLayer.graphics.removeAll();
    });

    const searchIconLayer = new GraphicsLayer({
      id: 'searchIconLayer',
      title: 'Search Location',
      listMode: 'show',
    });
    setLayer('searchIconLayer', searchIconLayer);
    setResetHandler('searchIconLayer', () => {
      searchIconLayer.graphics.removeAll();
    });

    const upstreamLayer = new GraphicsLayer({
      id: 'upstreamLayer',
      title: 'Upstream Watershed',
      listMode: 'hide',
      visible: false,
    });
    setLayer('upstreamLayer', upstreamLayer);
    setResetHandler('upstreamLayer', () => {
      upstreamLayer.graphics.removeAll();
      updateVisibleLayers({ upstreamLayer: false });
    });

    const issuesLayer = new GraphicsLayer({
      id: 'issuesLayer',
      title: 'Identified Issues',
      listMode: 'hide',
    });
    setLayer('issuesLayer', issuesLayer);

    const nonprofitsLayer = new GraphicsLayer({
      id: 'nonprofitsLayer',
      title: 'Nonprofits',
      listMode: 'hide',
    });

    setLayer('nonprofitsLayer', nonprofitsLayer);
    setResetHandler('nonprofitsLayer', () =>
      nonprofitsLayer.graphics.removeAll(),
    );

    getSharedLayers();

    setLayersInitialized(true);
  }, [
    getSharedLayers,
    setLayer,
    setResetHandler,
    layersInitialized,
    services,
    setLayersInitialized,
    navigate,
    updateErroredLayers,
    updateVisibleLayers,
  ]);

  // popup template to be used for all waterbody sublayers
  const popupTemplate = useMemo(() => {
    return {
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
  }, [navigate, services, stateNationalUses]);

  const handleMapServiceError = useCallback(
    (err) => {
      if (isAbort(err)) return;
      setMapLoading(false);
      console.error(err);
      setCipSummary({ status: 'failure', data: {} });
      updateErroredLayers({ waterbodyLayer: true, issuesLayer: true });
    },
    [setCipSummary, updateErroredLayers],
  );

  const { cropGeometryToHuc } = useGeometryUtils();

  // Gets the lines data and builds the associated feature layer
  const retrieveLines = useCallback(
    (filter, boundaries) => {
      const url = services.data.waterbodyService.lines;
      const queryParams = {
        returnGeometry: true,
        where: filter,
        outFields: ['*'],
      };
      query
        .executeQueryJSON(url, queryParams)
        .then((res) => {
          // build a list of features that still has the original uncropped
          // geometry and set context
          let originalFeatures = [];
          res.features.forEach((item) => {
            item['originalGeometry'] = item.geometry;
            originalFeatures.push(item);
          });
          setLinesData({ features: originalFeatures });
          updateErroredLayers({ waterbodyLines: false });

          // crop the waterbodies geometry to within the huc
          cropGeometryToHuc(res.features, boundaries.features[0].geometry)
            .then((features) => {
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
                title: 'Waterbody Lines',
                geometryType: res.geometryType,
                spatialReference: res.spatialReference,
                fields: res.fields,
                source: features,
                outFields: ['*'],
                renderer: linesRenderer,
                popupTemplate,
              });
              setLayer('waterbodyLines', newLinesLayer);
              setResetHandler('waterbodyLines', () => {
                setLayer('waterbodyLines', null);
              });
            })
            .catch((err) => {
              handleMapServiceError(err);
              updateErroredLayers({ waterbodyLines: true });
              setLinesData({ features: [] });
            });
        })
        .catch((err) => {
          handleMapServiceError(err);
          updateErroredLayers({ waterbodyLines: true });
          setLinesData({ features: [] });
        });
    },
    [
      cropGeometryToHuc,
      handleMapServiceError,
      popupTemplate,
      services,
      setLayer,
      setLinesData,
      setResetHandler,
      updateErroredLayers,
    ],
  );

  // Gets the areas data and builds the associated feature layer
  const retrieveAreas = useCallback(
    (filter, boundaries) => {
      const url = services.data.waterbodyService.areas;
      const queryParams = {
        returnGeometry: true,
        where: filter,
        outFields: ['*'],
      };
      query
        .executeQueryJSON(url, queryParams)
        .then((res) => {
          // build a list of features that still has the original uncropped
          // geometry and set context
          let originalFeatures = [];
          res.features.forEach((item) => {
            item['originalGeometry'] = item.geometry;
            originalFeatures.push(item);
          });
          setAreasData({ features: originalFeatures });
          updateErroredLayers({ waterbodyAreas: false });

          // crop the waterbodies geometry to within the huc
          cropGeometryToHuc(res.features, boundaries.features[0].geometry)
            .then((features) => {
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
                title: 'Waterbody Areas',
                geometryType: res.geometryType,
                spatialReference: res.spatialReference,
                fields: res.fields,
                source: features,
                outFields: ['*'],
                renderer: areasRenderer,
                popupTemplate,
              });
              setLayer('waterbodyAreas', newAreasLayer);
              setResetHandler('waterbodyAreas', () => {
                setLayer('waterbodyAreas', null);
              });
            })
            .catch((err) => {
              handleMapServiceError(err);
              updateErroredLayers({ waterbodyAreas: true });
              setAreasData({ features: [] });
            });
        })
        .catch((err) => {
          handleMapServiceError(err);
          updateErroredLayers({ waterbodyAreas: true });
          setAreasData({ features: [] });
        });
    },
    [
      cropGeometryToHuc,
      handleMapServiceError,
      popupTemplate,
      services,
      setAreasData,
      setLayer,
      setResetHandler,
      updateErroredLayers,
    ],
  );

  // Gets the points data and builds the associated feature layer
  const retrievePoints = useCallback(
    (filter) => {
      const url = services.data.waterbodyService.points;
      const queryParams = {
        returnGeometry: true,
        where: filter,
        outFields: ['*'],
      };
      query
        .executeQueryJSON(url, queryParams)
        .then((res) => {
          setPointsData(res);
          updateErroredLayers({ waterbodyPoints: false });

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
            title: 'Waterbody Points',
            geometryType: res.geometryType,
            spatialReference: res.spatialReference,
            fields: res.fields,
            source: res.features,
            outFields: ['*'],
            renderer: pointsRenderer,
            popupTemplate,
          });
          setLayer('waterbodyPoints', newPointsLayer);
          setResetHandler('waterbodyPoints', () => {
            setLayer('waterbodyPoints', null);
          });
        })
        .catch((err) => {
          handleMapServiceError(err);
          updateErroredLayers({ waterbodyPoints: true });
          setPointsData({ features: [] });
        });
    },
    [
      handleMapServiceError,
      popupTemplate,
      services,
      setLayer,
      setPointsData,
      setResetHandler,
      updateErroredLayers,
    ],
  );

  // if any service fails, consider all of them failed and do not show any waterbody data
  const mapServiceFailure =
    erroredLayers.waterbodyLines ||
    erroredLayers.waterbodyAreas ||
    erroredLayers.waterbodyPoints ||
    orphanFeatures.status === 'error';

  // Builds the waterbody layer once data has been fetched for all sub layers
  useEffect(() => {
    if (mapServiceFailure) {
      setMapLoading(false);
      setCipSummary({ status: 'failure', data: {} });
      updateErroredLayers({ waterbodyLayer: true, issuesLayer: true });
      return;
    }

    if (
      waterbodyLayer ||
      !waterbodyAreas ||
      !waterbodyLines ||
      !waterbodyPoints
    ) {
      return;
    }

    // Make the waterbody layer into a single layer
    const newWaterbodyLayer = new GroupLayer({
      id: 'waterbodyLayer',
      title: 'Waterbodies',
      listMode: 'hide-children',
      visible: false,
      legendEnabled: false,
    });
    newWaterbodyLayer.addMany([
      waterbodyAreas,
      waterbodyLines,
      waterbodyPoints,
    ]);
    setLayer('waterbodyLayer', newWaterbodyLayer);
    setResetHandler('waterbodyLayer', () => {
      waterbodyLayer?.layers.removeAll();
      setLayer('waterbodyLayer', null);
    });
  }, [
    waterbodyLayer,
    waterbodyAreas,
    waterbodyLines,
    waterbodyPoints,
    mapServiceFailure,
    setLayer,
    setCipSummary,
    setResetHandler,
    updateErroredLayers,
  ]);

  // query geocode server for every new search
  const [mapLoading, setMapLoading] = useState(true);
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
        null,
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
          if (!res?.features || res.features.length <= 0) {
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
          if (!res?.features || res.features.length <= 0) {
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
      if (!boundaries?.features || boundaries.features.length === 0) {
        setWildScenicRiversData({
          data: [],
          status: 'success',
        });
        return;
      }

      setWildScenicRiversData({
        data: [],
        status: 'fetching',
      });

      const queryParams = {
        geometry: boundaries.features[0].geometry,
        returnGeometry: false,
        spatialReference: 102100,
        outFields: ['*'],
      };
      query
        .executeQueryJSON(services.data.wildScenicRivers, queryParams)
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
      if (!boundaries?.features || boundaries.features.length === 0) {
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
          setProtectedAreasData({
            data: [],
            fields: [],
            status: 'fetching',
          });

          const url = `${services.data.protectedAreasDatabase}0`;
          const queryParams = {
            geometry: boundaries.features[0].geometry,
            returnGeometry: false,
            spatialReference: 102100,
            outFields: ['*'],
          };
          query
            .executeQueryJSON(url, queryParams)
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
      updateErroredLayers({ waterbodyLayer: false, issuesLayer: false });
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
      updateErroredLayers,
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
        getSignal(),
      ).then(
        (res) => handleMapServices(res, boundaries),
        handleMapServiceError,
      );
    },
    [
      getFishingLinkData,
      getSignal,
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
      resetLayers();
      setMapLoading(false);
      setErrorMessage(errorMessage);
    },
    [navigate, resetLayers, setErrorMessage, setNoDataAvailable],
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
      setHuc12,
      processBoundariesData,
      queryGrtsHuc12,
      queryAttainsPlans,
      handleNoDataAvailable,
    ],
  );

  const processGeocodeServerResults = useCallback(
    (searchText, hucRes = null) => {
      const renderMapAndZoomTo = (
        longitude,
        latitude,
        searchText,
        hucRes,
        callback,
      ) => {
        const location = {
          type: 'point',
          longitude: longitude,
          latitude: latitude,
          spatialReference: {
            wkid: 102100,
          },
        };
        if (!searchIconLayer) return;

        const hucFeature = hucRes?.features?.[0];

        searchIconLayer.graphics.removeAll();
        searchIconLayer.graphics.add(
          new Graphic({
            geometry: location,
            symbol: new PictureMarkerSymbol({
              url: mapPin,
              width: 25,
              height: 25,
              yoffset: 9, // this is a little lower to account for space below pin
            }),
            attributes: {
              OBJECTID: 1,
              searchText,
              huc12: hucFeature ? hucFeature.attributes.huc12 : '',
              huc12Name: hucFeature ? hucFeature.attributes.name : '',
            },
          }),
        );

        callback();
      };

      // Parse the search text to see if it is from a non-esri search suggestion
      const { searchPart, coordinatesPart } = splitSuggestedSearch(searchText);

      // Check if the search text contains coordinates.
      // First see if coordinates are part of a non-esri suggestion and
      // then see if the full text is coordinates
      let point = coordinatesPart ?? getPointFromCoordinates(searchText);

      let getCandidates;
      const url = services.data.locatorUrl;
      if (point === null) {
        // if the user searches for guam use guam's state code instead
        if (searchText.toLowerCase() === 'guam') searchText = 'GU';

        // If not coordinates, perform regular geolocation
        getCandidates = locator.addressToLocations(
          url,
          {
            address: { SingleLine: searchText },
            countryCode: 'USA',
            outSpatialReference: SpatialReference.WebMercator,
            outFields: [
              'Loc_name',
              'City',
              'Place_addr',
              'Region',
              'RegionAbbr',
              'Country',
              'Addr_type',
            ],
          },
          { signal: getSignal() },
        );
      } else {
        // If coordinates, perform reverse geolocation
        getCandidates = locator.locationToAddress(
          url,
          {
            location: point,
            outSpatialReference: SpatialReference.WebMercator,
          },
          { signal: getSignal() },
        );
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
              location.address,
              hucRes,
              () => handleHUC12(hucRes),
            );
          } else {
            const hucQuery = {
              returnGeometry: true,
              geometry: location.location,
              outFields: ['*'],
              signal: getSignal(),
            };
            query
              .executeQueryJSON(services.data.wbd, hucQuery)
              .then((hucRes) => {
                renderMapAndZoomTo(
                  location.location.longitude,
                  location.location.latitude,
                  searchText,
                  hucRes,
                  () => handleHUC12(hucRes),
                );
              })
              .catch((err) => {
                if (isAbort(err)) return;
                console.error(err);
                const newAddress = coordinatesPart ? searchPart : searchText;
                setAddress(newAddress); // preserve the user's search so it is displayed
                handleNoDataAvailable(watersgeoError);
              });
          }

          setFIPS({
            stateCode: '',
            countyCode: '',
            status: 'fetching',
          });

          const url = `${services.data.counties}/query`;
          const countiesQuery = {
            returnGeometry: true,
            geometry: location.location.clone(),
            outFields: ['*'],
            signal: getSignal(),
          };
          query
            .executeQueryJSON(url, countiesQuery)
            .then((countiesRes) => {
              if (!providersLayer) return;

              // not all locations have a State and County code, check for it
              if (
                countiesRes.features &&
                countiesRes.features.length > 0 &&
                countiesRes.features[0].attributes
              ) {
                const feature = countiesRes.features[0];
                const stateCode = feature.attributes.STATE_FIPS;
                const countyCode = feature.attributes.FIPS.substring(2, 5);
                setFIPS({
                  stateCode: stateCode,
                  countyCode: countyCode,
                  status: 'success',
                });

                const graphic = new Graphic({
                  attributes: feature.attributes,
                  geometry: new Polygon({
                    spatialReference: countiesRes.spatialReference,
                    rings: feature.geometry.rings,
                  }),
                  symbol: new SimpleFillSymbol({
                    color: [0, 0, 0, 0.15],
                    outline: {
                      color: colors.yellow(),
                      width: 3,
                      style: 'solid',
                    },
                  }),
                });

                providersLayer.graphics.removeAll();
                providersLayer.graphics.add(graphic);
              } else {
                setFIPS({
                  stateCode: '',
                  countyCode: '',
                  status: 'failure',
                });
                providersLayer.graphics.removeAll();
              }

              setCountyBoundaries(countiesRes);
            })
            .catch((err) => {
              if (isAbort(err)) return;
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
          if (isAbort(err)) return;
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
          renderMapAndZoomTo(
            centermass_x,
            centermass_y,
            searchText,
            hucRes,
            () => handleHUC12(hucRes),
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
      getSignal,
      handleHUC12,
      searchIconLayer,
      setAddress,
      setCountyBoundaries,
      setDrinkingWater,
      setFIPS,
      handleNoDataAvailable,
      services,
      providersLayer,
    ],
  );

  const queryGeocodeServer = useCallback(
    (searchText) => {
      searchText = searchText.trim();

      // Get whether HUC 12
      if (isHuc12(searchText)) {
        const queryParams = {
          returnGeometry: true,
          where: "HUC12 = '" + searchText + "'",
          outFields: ['*'],
          signal: getSignal(),
        };
        query
          .executeQueryJSON(services.data.wbd, queryParams)
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
            if (isAbort(err)) return;
            console.error(err);
            handleNoDataAvailable(noDataAvailableError);
          });
      } else {
        // If not HUC12, get address first
        processGeocodeServerResults(searchText);
      }
    },
    [getSignal, processGeocodeServerResults, handleNoDataAvailable, services],
  );

  useEffect(() => {
    if (layers.length === 0 || searchText === lastSearchText) return;

    fetchedDataDispatch({ type: 'reset' });
    resetData();
    resetLayers();
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
    resetLayers,
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
      attributes: hucBoundaries.features[0].attributes,
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
    mapView.when(() => {
      mapView.goTo(graphic).then(() => {
        setAtHucBoundaries(true);
      });
    });
  }, [
    mapView,
    hucBoundaries,
    boundariesLayer,
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

    const queryParams = {
      geometry: boundaries.features[0].geometry,
      returnGeometry: true,
      spatialReference: 4326,
      outFields: ['*'],
    };
    query
      .executeQueryJSON(nonprofits, queryParams)
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

  // track Esri map load errors for older browsers and devices that do not support ArcGIS 4.x
  if (!browserIsCompatibleWithArcGIS()) {
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
