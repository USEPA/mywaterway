// @flow

import React from 'react';
import type { Node } from 'react';
import styled from 'styled-components';
import StickyBox from 'react-sticky-box';
import { Map } from '@esri/react-arcgis';
// components
import MapLoadingSpinner from 'components/shared/MapLoadingSpinner';
import mapPin from 'components/pages/Community/images/pin.png';
import MapWidgets from 'components/shared/MapWidgets';
import MapMouseEvents from 'components/shared/MapMouseEvents';
import {
  createWaterbodySymbol,
  createUniqueValueInfos,
  getPopupContent,
  getPopupTitle,
  getWsioHealthIndexLayer,
} from 'components/pages/LocationMap/MapFunctions';
import { StyledErrorBox } from 'components/shared/MessageBoxes';
import MapErrorBoundary from 'components/shared/ErrorBoundary/MapErrorBoundary';
// contexts
import { EsriModulesContext } from 'contexts/EsriModules';
import { LocationSearchContext } from 'contexts/locationSearch';
// config
import { esriApiUrl } from 'config/esriConfig';
import {
  waterbodyService,
  locatorUrl,
  wbd,
  counties,
  mappedWater,
  // nonprofits,
} from 'config/mapServiceConfig';
import {
  waterQualityPortal,
  echoNPDES,
  grts,
  dwmaps,
  attains,
  fishingInformationService,
} from 'config/webServiceConfig';
// helpers
import { useWaterbodyHighlight } from 'utils/hooks';
import { fetchCheck } from 'utils/fetchUtils';
import { isHuc12, updateCanonicalLink, createJsonLD } from 'utils/utils';
// styles
import './mapStyles.css';
// errors
import {
  geocodeError,
  noDataAvailableError,
  watersgeoError,
} from 'config/errorMessages';

// turns an array into a string for the service queries
function createQueryString(array) {
  return `'${array.join("', '")}'`;
}

// --- styled components ---
const mapPadding = 20;

const Container = styled.div`
  display: flex;
  position: relative;
  border: 1px solid #aebac3;
  background-color: #fff;
`;

const ErrorBox = styled(StyledErrorBox)`
  margin-bottom: 1em;
`;

// --- components ---
type Props = {
  layout: 'narrow' | 'wide' | 'fullscreen',
  windowHeight: number,
  children?: Node,
};

function LocationMap({ layout = 'narrow', windowHeight, children }: Props) {
  const {
    FeatureLayer,
    GraphicsLayer,
    GroupLayer,
    MapImageLayer,
    Graphic,
    Locator,
    PictureMarkerSymbol,
    Point,
    Query,
    QueryTask,
    SpatialReference,
    Viewpoint,
  } = React.useContext(EsriModulesContext);

  const {
    searchText,
    lastSearchText,
    setLastSearchText,
    setCurrentExtent,
    //
    initialExtent,
    highlightOptions,
    boundariesLayer,
    searchIconLayer,
    waterbodyLayer,
    countyBoundaries,
    statesData,
    homeWidget,
    setHuc12,
    hucBoundaries,
    setAreasData,
    setLinesData,
    setPointsData,
    setAddress,
    setAttainsPlans,
    setCipSummary,
    setCountyBoundaries,
    setDrinkingWater,
    setStatesData,
    setGrts,
    setFishingInfo,
    setHucBoundaries,
    setAtHucBoundaries,
    setMapView,
    setMonitoringLocations,
    // setNonprofits,
    setPermittedDischargers,
    setWaterbodyLayer,
    setIssuesLayer,
    setMonitoringStationsLayer,
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
  } = React.useContext(LocationSearchContext);

  const [errorMessage, setErrorMessage] = React.useState('');
  const [view, setView] = React.useState(null);

  useWaterbodyHighlight();

  // Builds the layers that have no dependencies
  const [layersInitialized, setLayersInitialized] = React.useState(false);
  React.useEffect(() => {
    if (layersInitialized) return;

    if (layers.length > 0) return;

    // create the layers for the map
    const wsioHealthIndexLayer = new FeatureLayer(getWsioHealthIndexLayer());

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

    const monitoringStationsLayer = new GraphicsLayer({
      id: 'monitoringStationsLayer',
      title: 'Monitoring Stations',
      listMode: 'hide',
    });

    setMonitoringStationsLayer(monitoringStationsLayer);

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
      wsioHealthIndexLayer,
      mappedWaterLayer,
      countyLayer,
      watershedsLayer,
      providersLayer,
      boundariesLayer,
      monitoringStationsLayer,
      issuesLayer,
      dischargersLayer,
      nonprofitsLayer,
      searchIconLayer,
    ]);

    setLayersInitialized(true);
  }, [
    FeatureLayer,
    GraphicsLayer,
    MapImageLayer,
    layers,
    setBoundariesLayer,
    setDischargersLayer,
    setIssuesLayer,
    setLayers,
    setMonitoringStationsLayer,
    setNonprofitsLayer,
    setProvidersLayer,
    setSearchIconLayer,
    layersInitialized,
  ]);

  // popup template to be used for all waterbody sublayers
  const popupTemplate = {
    outFields: ['*'],
    title: (feature) => getPopupTitle(feature.graphic.attributes),
    content: (feature) => getPopupContent({ feature: feature.graphic }),
  };

  const handleMapServiceError = React.useCallback(
    (err) => {
      console.error(err);
      setCipSummary({
        data: [],
        status: 'failure',
      });
    },
    [setCipSummary],
  );

  // Gets the lines data and builds the associated feature layer
  const retrieveLines = React.useCallback(
    (filter) => {
      const query = new Query({
        returnGeometry: true,
        where: filter,
        outFields: ['*'],
      });

      new QueryTask({ url: waterbodyService.lines })
        .execute(query)
        .then((res) => {
          setLinesData(res);

          const linesRenderer = {
            type: 'unique-value',
            field: 'isassessed',
            field2: 'isimpaired',
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
            source: res.features,
            outFields: ['*'],
            renderer: linesRenderer,
            popupTemplate,
          });
          setLinesLayer(newLinesLayer);
          setMapLoading(true);
        })
        .catch((err) => {
          handleMapServiceError(err);
          setLinesLayer('error');
          setLinesData({ features: [] });
        });
    },
    [
      FeatureLayer,
      Query,
      QueryTask,
      handleMapServiceError,
      popupTemplate,
      setLinesData,
      setLinesLayer,
    ],
  );

  // Gets the areas data and builds the associated feature layer
  const retrieveAreas = React.useCallback(
    (filter) => {
      const query = new Query({
        returnGeometry: true,
        where: filter,
        outFields: ['*'],
      });

      new QueryTask({ url: waterbodyService.areas })
        .execute(query)
        .then((res) => {
          setAreasData(res);

          const areasRenderer = {
            type: 'unique-value',
            field: 'isassessed',
            field2: 'isimpaired',
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
            source: res.features,
            outFields: ['*'],
            renderer: areasRenderer,
            popupTemplate,
          });
          setAreasLayer(newAreasLayer);
          setMapLoading(true);
        })
        .catch((err) => {
          handleMapServiceError(err);
          setAreasLayer('error');
          setAreasData({ features: [] });
        });
    },
    [
      FeatureLayer,
      Query,
      QueryTask,
      handleMapServiceError,
      popupTemplate,
      setAreasData,
      setAreasLayer,
    ],
  );

  // Gets the points data and builds the associated feature layer
  const retrievePoints = React.useCallback(
    (filter) => {
      const query = new Query({
        returnGeometry: true,
        where: filter,
        outFields: ['*'],
      });

      new QueryTask({ url: waterbodyService.points })
        .execute(query)
        .then((res) => {
          setPointsData(res);

          const pointsRenderer = {
            type: 'unique-value',
            field: 'isassessed',
            field2: 'isimpaired',
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
          setMapLoading(true);
        })
        .catch((err) => {
          handleMapServiceError(err);
          setPointsLayer('error');
          setPointsData({ features: [] });
        });
    },
    [
      FeatureLayer,
      Query,
      QueryTask,
      handleMapServiceError,
      popupTemplate,
      setPointsData,
      setPointsLayer,
    ],
  );

  // if any service fails, consider all of them failed and do not show any waterbody data
  const mapServiceFailure =
    linesLayer === 'error' || areasLayer === 'error' || pointsLayer === 'error';

  // Builds the waterbody layer once data has been fetched for all sub layers
  React.useEffect(() => {
    if (mapServiceFailure) {
      setMapLoading(false);
      setCipSummary({
        data: [],
        status: 'failure',
      });
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
    GroupLayer,
    setWaterbodyLayer,
    setLayers,
    setCipSummary,
  ]);

  // query geocode server for every new search
  const [mapLoading, setMapLoading] = React.useState(true);

  const queryMonitoringLocationService = React.useCallback(
    (huc12) => {
      const url =
        `${waterQualityPortal.monitoringLocation}` +
        `search?mimeType=geojson&zip=no&huc=${huc12}`;

      fetchCheck(url)
        .then((res) => {
          setMonitoringLocations({
            data: res,
            status: 'success',
          });
        })
        .catch((err) => {
          console.error(err);
          setMonitoringLocations({
            data: [],
            status: 'failure',
          });
        });
    },
    [setMonitoringLocations],
  );

  const queryPermittedDischargersService = React.useCallback(
    (huc12) => {
      fetchCheck(echoNPDES.metadata)
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
            `${echoNPDES.getFacilities}?output=JSON&tablelist=Y&p_wbd=${huc12}` +
            `&p_act=Y&p_ptype=NPD&responseset=5000` +
            `&qcolumns=${columnIds.join(',')}`;

          fetchCheck(url)
            .then((res) => {
              setPermittedDischargers({
                data: res,
                status: 'success',
              });
            })
            .catch((err) => {
              console.error(err);
              setPermittedDischargers({
                data: [],
                status: 'failure',
              });
            });
        })
        .catch((err) => {
          console.error(err);
          setPermittedDischargers({
            data: [],
            status: 'failure',
          });
        });
    },
    [setPermittedDischargers],
  );

  const queryGrtsHuc12 = React.useCallback(
    (huc12) => {
      fetchCheck(`${grts.getGRTSHUC12}${huc12}`)
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
    [setGrts],
  );

  // Runs a query to get the plans for the selected huc.
  // Note: The actions page will attempt to look up the organization id.
  const queryAttainsPlans = React.useCallback(
    (huc12) => {
      // get the plans for the selected huc
      fetchCheck(`${attains.serviceUrl}plans?huc=${huc12}`, 120000)
        .then((res) => {
          setAttainsPlans({
            data: res,
            status: 'success',
          });
        })
        .catch((err) => {
          console.error(err);
          setAttainsPlans({
            data: [],
            status: 'failure',
          });
        });
    },
    [setAttainsPlans],
  );

  React.useEffect(() => {
    if (mapServiceFailure) setMapLoading(false);
  }, [mapServiceFailure]);

  const getFishingLinkData = React.useCallback(
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
        fishingInformationService.serviceUrl +
        fishingInformationService.queryStringFirstPart +
        stateQueryString +
        fishingInformationService.queryStringSecondPart;

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
    [setFishingInfo],
  );

  const handleMapServices = React.useCallback(
    (results) => {
      // sort the parameters by highest percent to lowest
      results.items[0].summaryByParameterImpairments = results.items[0].summaryByParameterImpairments.sort(
        (a, b) => (a.catchmentSizePercent < b.catchmentSizePercent ? 1 : -1),
      );
      setCipSummary({
        status: 'success',
        data: results,
      });

      const ids = results.items[0].assessmentUnits.map((item) => {
        return item.assessmentUnitId;
      });

      const filter = `assessmentunitidentifier in (${createQueryString(ids)})`;

      retrieveLines(filter);
      retrievePoints(filter);
      retrieveAreas(filter);
    },
    [retrieveAreas, retrieveLines, retrievePoints, setCipSummary],
  );

  const processBoundariesData = React.useCallback(
    (boundaries) => {
      let huc12 = boundaries.features[0].attributes.huc12;

      setHucBoundaries(boundaries);
      // queryNonprofits(boundaries); // re-add when EPA approves RiverNetwork service for HMW

      // boundaries data, also has attributes for watershed
      setWatershed(boundaries.features[0].attributes.name);

      // pass all of the states that the HUC12 is in
      getFishingLinkData(boundaries.features[0].attributes.states);

      // call states service for converting statecodes to state names
      // don't re-fetch the states service if it's already populated, it doesn't vary by location
      if (statesData.status !== 'success') {
        setStatesData({ status: 'fetching', data: [] });

        fetchCheck(`${attains.serviceUrl}states`)
          .then((res) => {
            setStatesData({ status: 'success', data: res.data });
          })
          .catch((err) => {
            console.error(err);
            setStatesData({ status: 'failure', data: [] });
          });
      }

      fetchCheck(`${attains.serviceUrl}huc12summary?huc=${huc12}`).then(
        handleMapServices,
        handleMapServiceError,
      );
    },
    [
      getFishingLinkData,
      handleMapServiceError,
      handleMapServices,
      setHucBoundaries,
      setStatesData,
      setWatershed,
      statesData.status,
    ],
  );

  const [hucResponse, setHucResponse] = React.useState(null);
  const handleHUC12 = React.useCallback(
    (response) => {
      setHucResponse(response);

      if (response.features.length > 0) {
        try {
          let huc12Result = response.features[0].attributes.huc12;
          setHuc12(huc12Result);
          processBoundariesData(response);
          queryMonitoringLocationService(huc12Result);
          queryPermittedDischargersService(huc12Result);
          queryGrtsHuc12(huc12Result);
          queryAttainsPlans(huc12Result);

          // create canonical link and JSON LD
          updateCanonicalLink(huc12Result);
          createJsonLD(huc12Result, response.features[0].attributes.name);
        } catch (err) {
          console.error(err);
          setNoDataAvailable();
          setErrorMessage(noDataAvailableError);
        }
      } else {
        setNoDataAvailable();
        setErrorMessage(noDataAvailableError);
      }
    },
    [
      processBoundariesData,
      queryAttainsPlans,
      queryGrtsHuc12,
      queryMonitoringLocationService,
      queryPermittedDischargersService,
      setHuc12,
      setNoDataAvailable,
    ],
  );

  const processGeocodeServerResults = React.useCallback(
    (searchText, hucRes = null) => {
      const renderMapAndZoomTo = (longitude, latitude, callback) => {
        const location = {
          type: 'point',
          longitude: longitude,
          latitude: latitude,
        };
        if (!searchIconLayer) return;

        searchIconLayer.graphics.removeAll();
        searchIconLayer.graphics.add(
          new Graphic({
            geometry: location,
            symbol: new PictureMarkerSymbol({
              url: mapPin,
              width: 44,
              height: 44,
              yoffset: 17, // this is a little lower to account for space below pin
            }),
            attributes: { name: 'map-marker' },
          }),
        );

        callback();
      };

      const locator = new Locator({ url: locatorUrl });
      locator.outSpatialReference = SpatialReference.WebMercator;

      const regex = /^(-?\d+(\.\d*)?)[\s,]+(-?\d+(\.\d*)?)$/;
      let point = null;
      if (regex.test(searchText)) {
        const found = searchText.match(regex);
        if (found.length >= 4 && found[1] && found[3]) {
          point = new Point({
            x: found[1],
            y: found[3],
          });
        }
      }

      let getCandidates;
      if (point === null) {
        // if the user searches for guam use guam's state code instead
        if (searchText.toLowerCase() === 'guam') searchText = 'GU';

        // If not coordinates, perform regular geolocation
        getCandidates = locator.addressToLocations({
          address: { SingleLine: searchText },
          countryCode: 'USA', // TODO: this doesn't have any effect but should according to the documentation
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
          for (let i = 0; i < candidates.length; i++) {
            if (candidates[i].score > highestCandidateScore) {
              location = candidates[i];
              highestCandidateScore = candidates[i].score;
            }
          }

          if (candidates.length === 0 || !location || !location.attributes) {
            setAddress(searchText); // preserve the user's search so it is displayed
            setNoDataAvailable();
            setMapLoading(false);
            setErrorMessage(noDataAvailableError);
            return;
          }

          // when dealing with us territories make sure to pick a candidate
          // that has a region value and skip over USA candidates, to avoid
          // things like Guam, Missouri
          if (location.attributes.Country !== 'USA') {
            const country = location.attributes.Country;
            // break out of loop after first candidate with region and same country
            for (let i = 0; i < candidates.length; i++) {
              let candidate = candidates[i];
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

            new QueryTask({ url: wbd })
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
                setAddress(searchText); // preserve the user's search so it is displayed
                setNoDataAvailable();
                setErrorMessage(watersgeoError);
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

          new QueryTask({ url: `${counties}/query` })
            .execute(countiesQuery)
            .then((countiesRes) => {
              // not all locations have a State and County code, check for it
              if (
                countiesRes.features &&
                countiesRes.features.length > 0 &&
                countiesRes.features[0].attributes
              ) {
                const stateCode = countiesRes.features[0].attributes.STFIPS;
                const countyCode = countiesRes.features[0].attributes.CTFIPS.substring(
                  2,
                  5,
                );
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
            setAddress(searchText); // preserve the user's search so it is displayed
            setNoDataAvailable();
            setErrorMessage(geocodeError);
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
      Graphic,
      Locator,
      PictureMarkerSymbol,
      Point,
      Query,
      QueryTask,
      SpatialReference.WebMercator,
      handleHUC12,
      searchIconLayer,
      setAddress,
      setCountyBoundaries,
      setDrinkingWater,
      setFIPS,
      setNoDataAvailable,
    ],
  );

  const queryGeocodeServer = React.useCallback(
    (searchText) => {
      searchText = searchText.trim();

      // Get whether HUC 12
      if (isHuc12(searchText)) {
        const query = new Query({
          returnGeometry: true,
          where: "HUC12 = '" + searchText + "'",
          outFields: ['*'],
        });

        new QueryTask({ url: wbd })
          .execute(query)
          .then((response) => {
            if (response.features.length === 0) {
              // flag no data available for no response
              setErrorMessage(noDataAvailableError);
              setNoDataAvailable();
            }

            // process the results
            else {
              const {
                centermass_x,
                centermass_y,
              } = response.features[0].attributes;

              processGeocodeServerResults(
                `${centermass_x}, ${centermass_y}`,
                response,
              );
            }
          })
          .catch((err) => {
            console.error(err);
            setErrorMessage(noDataAvailableError);
            setNoDataAvailable();
          });
      } else {
        // If not HUC12, get address first
        processGeocodeServerResults(searchText);
      }
    },
    [Query, QueryTask, processGeocodeServerResults, setNoDataAvailable],
  );

  React.useEffect(() => {
    if (layers.length === 0 || searchText === lastSearchText) return;

    resetData();
    setMapLoading(true);
    setHucResponse(null);
    setErrorMessage('');
    setLastSearchText(searchText);
    queryGeocodeServer(searchText);
  }, [
    searchText,
    lastSearchText,
    layers,
    resetData,
    setLastSearchText,
    queryGeocodeServer,
  ]);

  // reset map when searchText is cleared (when navigating away from '/community')
  React.useEffect(() => {
    if (!searchText) {
      setHuc12('');
      setMapLoading(false);
    }
  }, [searchText, setHuc12]);

  React.useEffect(() => {
    if (
      !view ||
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
        color: [204, 255, 255, 0.2],
        outline: {
          color: [102, 102, 102],
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
    view.popup.close();

    // zoom to the graphic, and update the home widget, and close any popups
    view.goTo(graphic).then(function () {
      setAtHucBoundaries(true);
    });
  }, [
    view,
    hucBoundaries,
    Graphic,
    boundariesLayer.graphics,
    Viewpoint,
    setCurrentExtent,
    setAtHucBoundaries,
    homeWidget,
  ]);

  const [location, setLocation] = React.useState(null);
  React.useEffect(() => {
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
        `${dwmaps.GetPWSWMHUC12FIPS}` +
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
  }, [FIPS, countyBoundaries, hucResponse, location, setDrinkingWater]);

  // const queryNonprofits = (boundaries) => {
  //   if (
  //     !boundariesLayer ||
  //     !boundaries.features ||
  //     boundaries.features.length === 0
  //   ) {
  //     setNonprofits({
  //       data: [],
  //       status: 'success',
  //     });
  //     return;
  //   }

  //   const query = new Query({
  //     geometry: boundaries.features[0].geometry,
  //     returnGeometry: true,
  //     spatialReference: 4326,
  //     outFields: ['*'],
  //   });

  //   new QueryTask({ url: nonprofits })
  //     .execute(query)
  //     .then((res) => {
  //       console.log('nonprofits data: ', res);
  //       setNonprofits({
  //         data: res,
  //         status: 'success'
  //       });
  //     })
  //     .catch((err) => {
  //       console.error(err);
  //       setNonprofits({
  //         data: [],
  //         status: 'failure'
  //       });
  //     });
  // };

  React.useEffect(() => {
    if (layout !== 'fullscreen') return;

    // scroll community content into view
    // get community content DOM node to scroll page when form is submitted
    const content = document.querySelector(`[data-content="locationmap"]`);
    if (content) {
      let pos = content.getBoundingClientRect();
      window.scrollTo(
        pos.left + window.pageXOffset,
        pos.top + window.pageYOffset,
      );
    }
  }, [layout, windowHeight]);

  // calculate height of div holding searchText
  const [searchTextHeight, setSearchTextHeight] = React.useState(0);
  const measuredRef = React.useCallback((node) => {
    if (!node) return;
    setSearchTextHeight(node.getBoundingClientRect().height);
  }, []);

  // jsx
  const mapContent = (
    <>
      {errorMessage && (
        <ErrorBox>
          <p>{errorMessage}</p>
        </ErrorBox>
      )}

      {/* for wide screens, LocationMap's children is searchText */}
      <div ref={measuredRef}>{children}</div>

      <Container
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
        <Map
          style={{ position: 'absolute' }}
          loaderOptions={{ url: esriApiUrl }}
          mapProperties={{ basemap: 'gray' }}
          viewProperties={{
            extent: initialExtent,
            highlightOptions,
          }}
          layers={layers}
          onLoad={(map, view) => {
            setView(view);
            setMapView(view);

            // display a loading spinner until the initial map completes
            view.watch('updating', (updating) => {
              if (!updating) setMapLoading(false); // turn off loading spinner
            });
          }}
          onFail={(err) => {
            console.error(err);
            setView(null);
            setMapView(null);
          }}
        >
          {/* manually passing map and view props to Map component's         */}
          {/* children to satisfy flow, but map and view props are auto      */}
          {/* passed from Map component to its children by react-arcgis      */}
          <MapWidgets
            map={null}
            view={null}
            layers={layers}
            scrollToComponent="locationmap"
            onHomeWidgetRendered={(homeWidget) => {}}
          />

          {/* manually passing map and view props to Map component's         */}
          {/* children to satisfy flow, but map and view props are auto      */}
          {/* passed from Map component to its children by react-arcgis      */}
          <MapMouseEvents map={null} view={null} />
        </Map>
        {view && mapLoading && <MapLoadingSpinner />}
      </Container>
    </>
  );

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
      <EsriModulesContext.Consumer>
        {(esriModules) => <LocationMap esriModules={esriModules} {...props} />}
      </EsriModulesContext.Consumer>
    </MapErrorBoundary>
  );
}
