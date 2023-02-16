import Graphic from '@arcgis/core/Graphic';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Point from '@arcgis/core/geometry/Point';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import { useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// contexts
import {
  useFetchedDataDispatch,
  useFetchedDataState,
} from 'contexts/FetchedData';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// utils
import { fetchCheck } from 'utils/fetchUtils';
import {
  getExtentBoundingBox,
  getGeographicExtent,
  useAllFeatures,
  useLocalFeatures,
  useAllFeaturesLayer,
} from 'utils/hooks/boundariesToggleLayer';
import { getPopupContent, getPopupTitle } from 'utils/mapFunctions';
import { isAbort } from 'utils/utils';
// config
import { usgsStaParameters } from 'config/usgsStaParameters';
// types
import type { FetchedDataAction } from 'contexts/FetchedData';
import type { Dispatch } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type {
  ServicesState,
  StreamgageMeasurement,
  UsgsDailyAveragesData,
  UsgsPrecipitationData,
  UsgsStreamgageAttributes,
  UsgsStreamgagesData,
  FetchState,
} from 'types';
import type { BoundariesFilterType } from 'utils/hooks';

/*
## Hooks
*/

export function useStreamgageLayer() {
  // Build the base feature layer
  const services = useServicesContext();

  const navigate = useNavigate();

  const buildBaseLayer = useCallback(
    (baseLayerId: string) => {
      return buildLayer(baseLayerId, navigate, services);
    },
    [navigate, services],
  );

  const { transformData, updateData } = useDataUtils();

  const { features } = useAllFeatures<UsgsStreamgageAttributes>({
    transformData,
    buildFeatures,
  });

  // Build a group layer with toggleable boundaries
  return useAllFeaturesLayer({
    layerId,
    buildBaseLayer,
    updateData,
    features,
  });
}

export function useLocalStreamgageFeatures() {
  const { serviceFailure, transformData } = useDataUtils();

  const { features, featuresDirty } = useLocalFeatures({
    transformData,
    buildFeatures,
  });

  return {
    streamgageFeatures: features,
    streamgageFeaturesDirty: featuresDirty,
    streamgageServiceFailure: serviceFailure,
  };
}

function useDataUtils() {
  // Build the data update function
  const { huc12, mapView } = useContext(LocationSearchContext);
  const services = useServicesContext();

  const fetchedDataDispatch = useFetchedDataDispatch();

  const hucData = useMemo(async () => {
    if (!huc12) return null;
    if (services.status !== 'success') return;

    const hucDvFilter = `huc=${huc12.substring(0, 8)}`;
    const hucThingsFilter = `$filter=properties/hydrologicUnit eq '${huc12}'`;
  }, []);

  const [extentDvFilter, setExtentDvFilter] = useState<string | null>(null);
  const [extentThingsFilter, setExtentThingsFilter] = useState<string | null>(
    null,
  );

  const getExtentData = useCallback(async () => {
    const newExtentDvFilter = await getExtentDvFilter(mapView);
    const newExtentThingsFilter = await getExtentThingsFilter(mapView);
    // No updates necessary, return success
    if (
      newExtentDvFilter === extentDvFilter &&
      newExtentThingsFilter === extentThingsFilter
    )
      return true;
    // Could not create filters, return failure
    if (!newExtentDvFilter || !newExtentThingsFilter) return false;

    setExtentDvFilter(newExtentDvFilter);
    setExtentThingsFilter(newExtentThingsFilter);

    const updateStatuses = await Promise.all([
      fetchStreamgages(newExtentThingsFilter, services, abortSignal),
      fetchPrecipitation(newExtentDvFilter, services, abortSignal),
      fetchDailyAverages(newExtentDvFilter, services, abortSignal),
    ]);

    return updateStatuses.every((status) => status === true);
  }, []);

  const updateData = useCallback(
    async (abortSignal) => {},
    [dvFilter, fetchedDataDispatch, huc12, mapView, services, thingsFilter],
  );

  // Create the data normalization function
  const { usgsStreamgages, usgsPrecipitation, usgsDailyAverages } =
    useFetchedDataState();

  const transformData = useCallback(() => {
    return transformServiceData(
      usgsDailyAverages,
      usgsPrecipitation,
      usgsStreamgages,
    );
  }, [usgsDailyAverages, usgsPrecipitation, usgsStreamgages]);

  const serviceFailure = useMemo(() => {
    return (
      usgsStreamgages.status === 'failure' ||
      usgsPrecipitation.status === 'failure' ||
      usgsDailyAverages.status === 'failure'
    );
  }, [usgsDailyAverages, usgsPrecipitation, usgsStreamgages]);

  return { serviceFailure, updateData, transformData };
}

/*
## Utils
*/

// Builds features from streamgage data
function buildFeatures(transformedData: UsgsStreamgageAttributes[]) {
  return transformedData.map((datum) => {
    return new Graphic({
      geometry: new Point({
        longitude: datum.locationLongitude,
        latitude: datum.locationLatitude,
      }),
      attributes: datum,
    });
  });
}

// Builds the base feature layer
function buildLayer(
  baseLayerId: string,
  navigate: NavigateFunction,
  services: ServicesState,
) {
  return new FeatureLayer({
    id: baseLayerId,
    title: 'USGS Sensors',
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
        geometry: new Point({
          longitude: -98.5795,
          latitude: 39.8283,
        }),
        attributes: { OBJECTID: 1 },
      }),
    ],
    renderer: new SimpleRenderer({
      symbol: new SimpleMarkerSymbol({
        style: 'square',
        color: '#fffe00', // '#989fa2'
        outline: {
          width: 0.75,
        },
      }),
    }),
    popupTemplate: {
      outFields: ['*'],
      title: (feature: __esri.Feature) =>
        getPopupTitle(feature.graphic.attributes),
      content: (feature: __esri.Feature) =>
        getPopupContent({ feature: feature.graphic, navigate, services }),
    },
  });
}

function transformServiceData(
  usgsDailyAverages: UsgsDailyAveragesData | null,
  usgsPrecipitation: UsgsPrecipitationData | null,
  usgsStreamgages: UsgsStreamgagesData | null,
) {
  if (
    usgsStreamgages.status !== 'success' ||
    usgsPrecipitation.status !== 'success' ||
    usgsDailyAverages.status !== 'success'
  ) {
    return null;
  }

  const gages = usgsStreamgages.data.value.map((gage) => {
    const streamgageMeasurements: {
      primary: StreamgageMeasurement[];
      secondary: StreamgageMeasurement[];
    } = { primary: [], secondary: [] };

    [...gage.Datastreams]
      .filter((item) => item.Observations.length > 0)
      .forEach((item) => {
        const observation = item.Observations[0];
        const parameterCode = item.properties.ParameterCode;
        const parameterDesc = item.description.split(' / USGS-')[0];
        const parameterUnit = item.unitOfMeasurement;

        let measurement = parseFloat(observation.result) || null;
        // convert measurements recorded in celsius to fahrenheit
        if (
          measurement &&
          ['00010', '00020', '85583'].includes(parameterCode)
        ) {
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
      monitoringType: 'USGS Sensors' as const,
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
          measurement: parseFloat(observation.value) || null,
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
        const observations = site.values[0].value
          .filter((observation) => observation.value !== null)
          .map((observation) => {
            let measurement = parseFloat(observation.value);
            // convert measurements recorded in celsius to fahrenheit
            if (['00010', '00020', '85583'].includes(paramCode)) {
              measurement = measurement * (9 / 5) + 32;

              // round to 1 decimal place
              measurement = Math.round(measurement * 10) / 10;
            }

            return { measurement, date: new Date(observation.dateTime) };
          });

        const measurements = streamgage?.streamgageMeasurements;
        if (!measurements) return;
        // NOTE: 'type' is either 'primary' or 'secondary' – loop over both
        Object.values(measurements).forEach((measurementType) => {
          measurementType.forEach((measurement) => {
            if (measurement.parameterCode === paramCode.toString()) {
              measurement.dailyAverages = observations;
            }
          });
        });
      }
    });
  }

  return gages as UsgsStreamgageAttributes[];
}

function fetchDailyAverages(
  boundariesFilter: string,
  services: ServicesState,
  dispatch: Dispatch<FetchedDataAction>,
  abortSignal: AbortSignal,
) {
  if (services.status !== 'success') return false;

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
    `&${boundariesFilter}`;

  dispatch({ type: 'pending', id: 'usgsDailyAverages' });

  return Promise.all([
    fetchCheck(
      `${url}&statCd=${meanValues}&parameterCd=${allParams}`,
      abortSignal,
    ),
    fetchCheck(
      `${url}&statCd=${sumValues}&parameterCd=${precipitation}`,
      abortSignal,
    ),
  ])
    .then(([allParamsRes, precipitationRes]) => {
      dispatch({
        type: 'success',
        id: 'usgsDailyAverages',
        payload: {
          allParamsMean: allParamsRes,
          precipitationSum: precipitationRes,
        },
      });
      return true;
    })
    .catch((err) => {
      if (isAbort(err)) {
        dispatch({ type: 'idle', id: 'usgsDailyAverages' });
        return true;
      }
      console.error(err);
      dispatch({ type: 'failure', id: 'usgsDailyAverages' });
      return false;
    });
}

function fetchPrecipitation(
  boundariesFilter: string,
  services: ServicesState,
  dispatch: Dispatch<FetchedDataAction>,
  abortSignal: AbortSignal,
) {
  if (services.status !== 'success') return false;

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
    `&${boundariesFilter}`;

  dispatch({ type: 'pending', id: 'usgsPrecipitation' });

  return fetchCheck(url, abortSignal)
    .then((res) => {
      dispatch({
        type: 'success',
        id: 'usgsPrecipitation',
        payload: res,
      });
      return true;
    })
    .catch((err) => {
      if (isAbort(err)) {
        dispatch({ type: 'idle', id: 'usgsPrecipitation' });
        return true;
      }
      console.error(err);
      dispatch({ type: 'failure', id: 'usgsPrecipitation' });
      return false;
    });
}

function fetchStreamgages(
  boundariesFilter: string,
  services: ServicesState,
  dispatch: Dispatch<FetchedDataAction>,
  abortSignal: AbortSignal,
) {
  if (services.status !== 'success') return false;

  const url =
    `${services.data.usgsSensorThingsAPI}?` +
    `$select=name,properties/active,properties/agency,properties/agencyCode,properties/monitoringLocationUrl,properties/monitoringLocationName,properties/monitoringLocationType,properties/monitoringLocationNumber,properties/hydrologicUnit&` +
    `$expand=Locations($select=location),Datastreams($select=description,properties/ParameterCode,properties/WebDescription,unitOfMeasurement/name,unitOfMeasurement/symbol;` +
    `$expand=Observations($select=phenomenonTime,result;` +
    `$top=1;` +
    `$orderBy=phenomenonTime desc))` +
    `&${boundariesFilter}`;

  dispatch({ type: 'pending', id: 'usgsStreamgages' });

  return fetchCheck(url, abortSignal)
    .then((res) => {
      dispatch({
        type: 'success',
        id: 'usgsStreamgages',
        payload: res,
      });
      return true;
    })
    .catch((err) => {
      if (isAbort(err)) {
        dispatch({ type: 'idle', id: 'usgsStreamgages' });
        return true;
      }
      console.error(err);
      dispatch({ type: 'failure', id: 'usgsStreamgages' });
      return false;
    });
}

async function getExtentDvFilter(mapView: __esri.MapView | '') {
  const extent = await getGeographicExtent(mapView);
  // Service requires that area of extent cannot exceed 25 degrees
  const bBox = getExtentBoundingBox(extent, 25, true);
  return bBox ? `bBox=${bBox}` : null;
}

async function getExtentThingsFilter(mapView: __esri.MapView | '') {
  const extent = await getGeographicExtent(mapView);
  const wkt = getExtentWkt(extent);
  return wkt
    ? `$filter=st_within(Location/location,geography'POLYGON(${wkt})')`
    : null;
}

// Gets a string representation of the view's extent as Well-Known Text
function getExtentWkt(extent: __esri.Extent | null) {
  if (!extent) return null;

  return `(${extent.xmax} ${extent.ymin}, ${extent.xmax} ${extent.ymax}, ${extent.xmin} ${extent.ymax}, ${extent.xmin} ${extent.ymin}, ${extent.xmax} ${extent.ymin})`;
}

/*
## Constants
*/

const layerId = 'usgsStreamgagesLayer';
