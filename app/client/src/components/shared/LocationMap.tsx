/** @jsxImportSource @emotion/react */

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Node } from 'react';
import { css } from '@emotion/react';
import StickyBox from 'react-sticky-box';
import { useNavigate } from 'react-router-dom';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Field from '@arcgis/core/layers/support/Field';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import * as locator from '@arcgis/core/rest/locator';
import PictureMarkerSymbol from '@arcgis/core/symbols/PictureMarkerSymbol';
import Point from '@arcgis/core/geometry/Point';
import Polygon from '@arcgis/core/geometry/Polygon';
import * as query from '@arcgis/core/rest/query';
import SpatialReference from '@arcgis/core/geometry/SpatialReference';
import UniqueValueRenderer from '@arcgis/core/renderers/UniqueValueRenderer';
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
  getCountySymbol,
} from 'utils/mapFunctions';
import MapErrorBoundary from 'components/shared/ErrorBoundary.MapErrorBoundary';
// contexts
import { useConfigFilesState } from 'contexts/ConfigFiles';
import {
  useFetchedDataDispatch,
  useOrganizationsData,
} from 'contexts/FetchedData';
import { useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
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
  layout: 'narrow' | 'wide';
  windowHeight: number;
  children?: Node;
};

function LocationMap({ layout = 'narrow', windowHeight, children }: Props) {
  const { getSignal } = useAbort();

  const configFiles = useConfigFilesState();
  const fetchedDataDispatch = useFetchedDataDispatch();
  const navigate = useNavigate();
  const organizations = useOrganizationsData();

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
    atHucBoundaries,
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
    setGrtsStories,
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
  useMonitoringLocationsLayers({ filter: huc12 ? `huc=${huc12}` : null });
  useStreamgageLayers();

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
        if (!stateCode) return null;

        if (!useAttainments || useAttainments.length === 0) return null;

        const relatedUses = [];
        useAttainments.forEach((useAttainment) => {
          const foundUse = configFiles.data.stateNationalUses.find(
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
              configFiles.data.impairmentFields,
              attainsDomainsData,
            );
          });
          return tempObject;
        }
        const parametersObject = createParametersObject(
          configFiles.data.parameters,
        );

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
    [configFiles],
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
        window.logErrorToGa(
          `The Assessment Units service did not return data for the following assessment IDs ${idsNotInAssessmentUnitService.join(
            ', ',
          )}`,
        );
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
        const organization = organizations.data.find(
          (org) => org.organizationid === orgId,
        );
        const reportingCycle = organization?.reportingcycle;
        if (!reportingCycle) return;

        // chunk the requests by character count
        // the assessmentUnitIdentifier param supports a max of 1000 characters
        const chunkedUnitIds = chunkArrayCharLength(ids, 1000);

        chunkedUnitIds.forEach((chunk) => {
          const url =
            `${configFiles.data.services.attains.serviceUrl}` +
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
    [
      configFiles,
      createDetailedOrphanFeatures,
      organizations,
      setOrphanFeatures,
    ],
  );

  // Check if the Huc12Summary service contains any Assessment IDs that are not included in the GIS (points/lines/areas) results.
  // If so, query the individual missing assessment IDs using the ATTAINS assessments and assessmentUnits service
  // to build a complete feature that can be displayed in the Community section,
  // These features are marked by a custom attribute {... limited: true ...} and they lack spatial representation on the map.
  const [assessmentUnitCount, setAssessmentUnitCount] = useState(0);
  const [checkedForOrphans, setCheckedForOrphans] = useState(false);
  useEffect(() => {
    if (organizations.status === 'pending') return;

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

        window.logErrorToGa(
          `huc12Summary service contained ${assessmentUnitCount} Assessment Unit IDs but the GIS service contained ${
            uniqueWaterbodies.length
          } features for HUC ${huc12}. Assessment Unit IDs not found in GIS service: (${orphanIDs.join(
            ', ',
          )})`,
        );

        setOrphanFeatures({ features: [], status: 'fetching' });

        // fetch the ATTAINS Domains service Parameter Names so we can populate the Waterbody Parameters later on
        fetchCheck(
          `${configFiles.data.services.attains.serviceUrl}domains?domainName=ParameterName`,
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
                `${configFiles.data.services.attains.serviceUrl}` +
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
    configFiles,
    getAllFeatures,
    handleOrphanedFeatures,
    huc12,
    linesData,
    organizations,
    pointsData,
    setOrphanFeatures,
    waterbodyCountMismatch,
    setWaterbodyCountMismatch,
  ]);

  const getSharedLayers = useSharedLayers();
  useWaterbodyHighlight();

  const { getTemplate, getTitle, setDynamicPopupFields } = useDynamicPopup();

  // Builds the layers that have no dependencies
  useEffect(() => {
    if (!getSharedLayers || layersInitialized) return;

    // create the layers for the map
    const providersLayer = new GraphicsLayer({
      id: 'providersLayer',
      title: 'Providers',
      listMode: 'show',
    });
    setLayer('providersLayer', providersLayer);
    setResetHandler('providersLayer', () =>
      providersLayer.graphics.removeAll(),
    );

    const boundariesLayer = new GraphicsLayer({
      id: 'boundariesLayer',
      title: 'Selected Watershed',
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
    configFiles,
    getSharedLayers,
    setLayer,
    setResetHandler,
    layersInitialized,
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
          configFiles: configFiles.data,
          feature: feature.graphic,
          navigate,
        }),
    };
  }, [configFiles, navigate]);

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

  // Gets the attains gis data and builds the associated feature layer
  const retrieveData = useCallback(
    ({
      boundaries,
      filter,
      geometryType,
      setter,
      url,
    }: {
      boundaries: any;
      filter: string;
      geometryType: 'point' | 'polyline' | 'polygon';
      setter: Function;
      url: string;
    }) => {
      async function queryData() {
        let layerId: 'waterbodyPoints' | 'waterbodyLines' | 'waterbodyAreas' =
          'waterbodyPoints';
        let layerTitle = 'Waterbody Points';
        if (geometryType === 'polyline') {
          layerId = 'waterbodyLines';
          layerTitle = 'Waterbody Lines';
        }
        if (geometryType === 'polygon') {
          layerId = 'waterbodyAreas';
          layerTitle = 'Waterbody Areas';
        }

        try {
          // query for metadata
          const metadata: any = await fetchCheck(`${url}?f=json`);

          const spatialReference = new SpatialReference({ wkid: 102100 });
          const queryParams = {
            outFields: ['*'],
            returnGeometry: true,
            spatialReference,
            where: filter,
          };
          const res = await query.executeQueryJSON(url, queryParams);

          // build a list of features that still has the original uncropped
          // geometry and set context
          let originalFeatures = [];
          res.features.forEach((item) => {
            item['originalGeometry'] = item.geometry;
            originalFeatures.push(item);
          });
          setter(
            geometryType === 'point' ? res : { features: originalFeatures },
          );
          updateErroredLayers({ [layerId]: false });

          // crop the waterbodies geometry to within the huc
          const features =
            geometryType === 'point'
              ? res.features
              : await cropGeometryToHuc(
                  res.features,
                  boundaries.features[0].geometry,
                );
          const renderer = new UniqueValueRenderer({
            field: 'overallstatus',
            fieldDelimiter: ', ',
            defaultSymbol: createWaterbodySymbol({
              condition: 'unassessed',
              selected: false,
              geometryType: geometryType,
            }),
            uniqueValueInfos: createUniqueValueInfos(geometryType),
          });
          const newLayer = new FeatureLayer({
            id: layerId,
            title: layerTitle,
            geometryType: metadata.geometryType
              .replace('esriGeometry', '')
              .toLowerCase(),
            spatialReference,
            fields: metadata.fields.map((field: any) => Field.fromJSON(field)),
            source: features,
            outFields: ['*'],
            renderer,
            popupTemplate,
          });
          setLayer(layerId, newLayer);
          setResetHandler(layerId, () => {
            setLayer(layerId, null);
          });
        } catch (err) {
          handleMapServiceError(err);
          updateErroredLayers({ [layerId]: true });
          setter({ features: [] });
        }
      }

      queryData();
    },
    [
      cropGeometryToHuc,
      handleMapServiceError,
      setLayer,
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
      fetchCheck(`${configFiles.data.services.grts.getGRTSHUC12}${huc12Param}`)
        .then((res) => {
          setGrts({
            data: res,
            status: 'success',
          });
        })
        .catch((err) => {
          console.error(err);
          setGrts({
            data: {},
            status: 'failure',
          });
        });
    },
    [configFiles, setGrts],
  );

  const queryGrtsHuc12Stories = useCallback(
    (huc12Param) => {
      fetchCheck(
        `${configFiles.data.services.grts.getSSByHUC12}?huc12=${huc12Param}`,
      )
        .then((res) => {
          setGrtsStories({
            data: res,
            status: 'success',
          });
        })
        .catch((err) => {
          console.error(err);
          setGrtsStories({
            data: {},
            status: 'failure',
          });
        });
    },
    [configFiles, setGrtsStories],
  );

  // Runs a query to get the plans for the selected huc.
  // Note: The actions page will attempt to look up the organization id.
  const queryAttainsPlans = useCallback(
    (huc12Param) => {
      // get the plans for the selected huc
      fetchCheck(
        `${configFiles.data.services.attains.serviceUrl}plans?huc=${huc12Param}&summarize=Y`,
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
    [configFiles, setAttainsPlans],
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

      const { queryStringFirstPart, queryStringSecondPart, serviceUrl } =
        configFiles.data.services.fishingInformationService;
      const url =
        serviceUrl +
        queryStringFirstPart +
        stateQueryString +
        queryStringSecondPart;

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
    [configFiles, setFishingInfo],
  );

  const getWsioHealthIndexData = useCallback(
    (huc12Param) => {
      const url =
        `${configFiles.data.services.wsio}/query?where=HUC12_TEXT%3D%27${huc12Param}%27` +
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
    [configFiles, setWsioHealthIndexData],
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
        .executeQueryJSON(
          configFiles.data.services.wildScenicRivers,
          queryParams,
        )
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
    [configFiles, setWildScenicRiversData],
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

      fetchCheck(`${configFiles.data.services.protectedAreasDatabase}?f=json`)
        .then((layerInfo) => {
          setProtectedAreasData({
            data: [],
            fields: [],
            status: 'fetching',
          });

          const url = `${configFiles.data.services.protectedAreasDatabase}`;
          const queryParams = {
            geometry: boundaries.features[0].geometry,
            returnGeometry: true,
            spatialReference: 102100,
            outFields: ['*'],
          };
          query
            .executeQueryJSON(url, queryParams)
            .then((res) => {
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
    [configFiles, setProtectedAreasData, setDynamicPopupFields],
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
      retrieveData({
        boundaries,
        filter,
        geometryType: 'polyline',
        setter: setLinesData,
        url: configFiles.data.services.waterbodyService.lines,
      });
      retrieveData({
        boundaries,
        filter,
        geometryType: 'point',
        setter: setPointsData,
        url: configFiles.data.services.waterbodyService.points,
      });
      retrieveData({
        boundaries,
        filter,
        geometryType: 'polygon',
        setter: setAreasData,
        url: configFiles.data.services.waterbodyService.areas,
      });
    },
    [retrieveData, setAssessmentUnitIDs, setCipSummary, updateErroredLayers],
  );

  const processBoundariesData = useCallback(
    (boundaries) => {
      let huc12Param = boundaries.features[0].attributes.huc12;

      const graphic = new Graphic({
        geometry: {
          type: 'polygon',
          spatialReference: boundaries.spatialReference,
          rings: boundaries.features[0].geometry.rings,
        },
        popupTemplate: {
          title: getTitle,
          content: getTemplate,
          outFields: ['areasqkm'],
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
        attributes: boundaries.features[0].attributes,
      });

      // clear previously set graphic (from a previous search), and add graphic
      boundariesLayer.graphics.removeAll();
      boundariesLayer.graphics.add(graphic);
      setHucBoundaries(graphic);
      setAtHucBoundaries(false);

      // queryNonprofits(boundaries); // re-add when EPA approves RiverNetwork service for HMW

      // boundaries data, also has attributes for watershed
      setWatershed(boundaries.features[0].attributes);

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

        fetchCheck(`${configFiles.data.services.attains.serviceUrl}states`)
          .then((res) => {
            setStatesData({ status: 'success', data: res.data });
          })
          .catch((err) => {
            console.error(err);
            setStatesData({ status: 'failure', data: [] });
          });
      }

      fetchCheck(
        `${configFiles.data.services.attains.serviceUrl}huc12summary?huc=${huc12Param}`,
        getSignal(),
      ).then(
        (res) => handleMapServices(res, boundaries),
        handleMapServiceError,
      );
    },
    [
      boundariesLayer,
      configFiles,
      getFishingLinkData,
      getProtectedAreas,
      getSignal,
      getTemplate,
      getTitle,
      getWsioHealthIndexData,
      getWildScenicRivers,
      handleMapServiceError,
      handleMapServices,
      setAtHucBoundaries,
      setHucBoundaries,
      setStatesData,
      setWatershed,
      statesData.status,
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
          queryGrtsHuc12Stories(huc12);
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
      queryGrtsHuc12Stories,
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

        getCounties(longitude, latitude, hucRes);

        callback();
      };

      const getCounties = (longitude, latitude, hucRes) => {
        const location = new Point({
          longitude: longitude,
          latitude: latitude,
          spatialReference: {
            wkid: 102100,
          },
        });
        const queryGeometry =
          hucRes.features.length > 0 ? hucRes.features[0].geometry : location;

        const url = `${configFiles.data.services.counties}/query`;
        const countiesQuery = {
          returnGeometry: true,
          geometry: queryGeometry.clone(),
          outFields: ['*'],
          signal: getSignal(),
        };
        query
          .executeQueryJSON(url, countiesQuery)
          .then((countiesRes) => {
            if (!providersLayer) return;

            // not all locations have a State and County code, check for it
            const graphicsToAdd = [];
            let newCountyBoundaries = null;
            countiesRes.features.forEach((feature) => {
              // check if location intersects
              let visible = false;
              if (
                geometryEngine.intersects(location, feature.geometry) &&
                feature.attributes
              ) {
                const stateCode = feature.attributes.STATE_FIPS;
                const countyCode = feature.attributes.COUNTY_FIPS;
                visible = true;
                setFIPS({
                  stateCode: stateCode,
                  countyCode: countyCode,
                  status: 'success',
                });
                newCountyBoundaries = feature;
              }

              graphicsToAdd.push(
                new Graphic({
                  attributes: feature.attributes,
                  visible,
                  geometry: new Polygon({
                    spatialReference: countiesRes.spatialReference,
                    rings: feature.geometry.rings,
                  }),
                  symbol: getCountySymbol(),
                }),
              );
            });
            providersLayer.graphics.removeAll();
            providersLayer.graphics.addMany(graphicsToAdd);
            setCountyBoundaries(newCountyBoundaries);
          })
          .catch((err) => {
            if (isAbort(err)) return;
            console.error(err);
            setCountyBoundaries(null);
            setMapLoading(false);
            setDrinkingWater({
              data: {},
              status: 'failure',
            });
            setFIPS({
              stateCode: '',
              countyCode: '',
              status: 'failure',
            });
          });
      };

      // Parse the search text to see if it is from a non-esri search suggestion
      const { searchPart, coordinatesPart } = splitSuggestedSearch(searchText);

      // Check if the search text contains coordinates.
      // First see if coordinates are part of a non-esri suggestion and
      // then see if the full text is coordinates
      let point = coordinatesPart ?? getPointFromCoordinates(searchText);

      let getCandidates;
      const url = configFiles.data.services.locatorUrl;
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

          if (candidates.length === 0 || !location?.attributes) {
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
              .executeQueryJSON(configFiles.data.services.wbd, hucQuery)
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
            data: {},
            status: 'success',
          });
        });
    },
    [
      configFiles,
      getSignal,
      handleHUC12,
      searchIconLayer,
      setAddress,
      setCountyBoundaries,
      setDrinkingWater,
      setFIPS,
      handleNoDataAvailable,
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
          .executeQueryJSON(configFiles.data.services.wbd, queryParams)
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
    [
      configFiles,
      getSignal,
      processGeocodeServerResults,
      handleNoDataAvailable,
    ],
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
    if (!mapView || !hucBoundaries || atHucBoundaries) {
      return;
    }

    const currentViewpoint = new Viewpoint({
      targetGeometry: hucBoundaries.geometry.extent,
    });

    // store the current viewpoint in context
    setCurrentExtent(currentViewpoint);

    homeWidget.viewpoint = currentViewpoint;
    mapView.closePopup();

    // zoom to the graphic, and update the home widget, and close any popups
    if (!window.location.pathname.includes('/extreme-weather')) {
      mapView.when(() => {
        mapView.goTo(hucBoundaries).then(() => {
          setAtHucBoundaries(true);
        });
      });
    }
  }, [
    atHucBoundaries,
    getTemplate,
    getTitle,
    homeWidget,
    hucBoundaries,
    mapView,
    setAtHucBoundaries,
    setCurrentExtent,
  ]);

  const [location, setLocation] = useState(null);
  useEffect(() => {
    if (!countyBoundaries || !hucResponse || !location) return;

    if (hucResponse.features.length === 0) {
      setDrinkingWater({
        data: {},
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
          data: {},
          status: 'failure',
        });
        return;
      }

      const promises = [];

      // cloning to ensure order is preserved
      const countyGraphics = providersLayer.graphics.clone().toArray();
      countyGraphics.forEach((graphic) => {
        const drinkingWaterUrl =
          `${configFiles.data.services.dwmaps.GetPWSWMHUC12FIPS}` +
          `${hucResponse.features[0].attributes.huc12}/` +
          `${graphic.attributes.STATE_FIPS}/` +
          `${graphic.attributes.COUNTY_FIPS}`;

        promises.push(fetchCheck(drinkingWaterUrl));
      });

      Promise.all(promises)
        .then((responses) => {
          const newData = {};
          responses.forEach((res, index) => {
            const fips = countyGraphics[index].attributes.FIPS;
            newData[fips] = res.items;
          });

          setDrinkingWater({
            data: newData,
            status: 'success',
          });
        })
        .catch((err) => {
          console.error(err);
          setDrinkingWater({
            data: {},
            status: 'failure',
          });
        });
    }
  }, [
    configFiles,
    countyBoundaries,
    FIPS,
    hucResponse,
    location,
    providersLayer,
    setDrinkingWater,
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
        data-testid="hmw-community-map"
        style={{
          marginTop: layout === 'wide' ? '1.25em' : '0',
          height: windowHeight - searchTextHeight - 3 * mapPadding,
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
