import Graphic from '@arcgis/core/Graphic';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Point from '@arcgis/core/geometry/Point';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
// contexts
import { ConfigFiles, useConfigFilesState } from 'contexts/ConfigFiles';
import { useFetchedDataDispatch } from 'contexts/FetchedData';
import { LocationSearchContext } from 'contexts/locationSearch';
// utils
import { fetchCheck, fetchPost } from 'utils/fetchUtils';
import { GetTemplateType, useDynamicPopup } from 'utils/hooks';
import {
  filterData,
  getExtentBoundingBox,
  getGeographicExtent,
  getGeographicExtentMapView,
  handleFetchError,
  useAllFeaturesLayers,
  useLocalData,
} from 'utils/boundariesToggleLayer';
// types
import type { FetchedDataAction, FetchState } from 'contexts/FetchedData';
import type { Dispatch } from 'react';
import type {
  Feature,
  FetchSuccessState,
  ServicesData,
  StreamgageMeasurement,
  UsgsDailyAveragesData,
  UsgsDailyData,
  UsgsLatestContinuousData,
  UsgsMonitoringLocationData,
  UsgsStaParameter,
  UsgsStreamgageAttributes,
} from 'types';
import type { SublayerType } from 'utils/boundariesToggleLayer';
// styles
import { colors } from 'styles';

/*
## Hooks
*/

export function useStreamgageLayers() {
  const { getTemplate, getTitle } = useDynamicPopup();

  // Build the base feature layer
  const buildBaseLayer = useCallback(
    (type: SublayerType) => {
      return buildLayer(type, getTitle, getTemplate);
    },
    [getTemplate, getTitle],
  );

  const updateSurroundingData = useUpdateData();

  // Build a group layer with toggleable boundaries
  const { enclosedLayer, surroundingLayer } = useAllFeaturesLayers({
    buildFeatures,
    enclosedFetchedDataKey: localFetchedDataKey,
    buildBaseLayer,
    surroundingFetchedDataKey,
    updateSurroundingData,
  });

  return {
    usgsStreamgagesLayer: enclosedLayer,
    surroundingUsgsStreamgagesLayer: surroundingLayer,
  };
}

export function useStreamgages() {
  const { data, status } = useLocalData(localFetchedDataKey);

  return { streamgages: data, streamgagesStatus: status };
}

function useUpdateData() {
  // Build the data update function
  const { huc12, hucBoundaries, mapView } = useContext(LocationSearchContext);
  const configFiles = useConfigFilesState();
  const services = configFiles.data.services;
  const usgsParameterCodes = configFiles.data.usgsParameterCodes;
  const usgsSiteTypes = configFiles.data.usgsSiteTypes;
  const usgsStaParameters = configFiles.data.usgsStaParameters;

  const fetchedDataDispatch = useFetchedDataDispatch();

  const [hucData, setHucData] = useState<UsgsStreamgageAttributes[] | null>([]);
  useEffect(() => {
    const controller = new AbortController();

    if (!huc12 || !hucBoundaries?.geometry) {
      setHucData([]);
      fetchedDataDispatch({
        type: 'success',
        id: localFetchedDataKey,
        payload: [],
      });
      return;
    }

    // get bounding box of huc pass that and huc to next step 
    // huc will be used to further filter monitoring-locations call
    const extent = getGeographicExtent(hucBoundaries.geometry.extent ?? null);
    const bbox = getExtentBoundingBox(extent, 25, true);
    if (!bbox) {
      setHucData([]);
      fetchedDataDispatch({
        type: 'success',
        id: localFetchedDataKey,
        payload: [],
      });
      return;
    }

    fetchAndTransformData(
      `bbox=${bbox}`,
      services,
      fetchedDataDispatch,
      localFetchedDataKey,
      usgsParameterCodes,
      usgsSiteTypes,
      usgsStaParameters,
      controller.signal,
      huc12,
    ).then((data) => {
      setHucData(data);
    });

    return function cleanup() {
      controller.abort();
    };
  }, [fetchedDataDispatch, huc12, hucBoundaries, services, usgsParameterCodes, usgsSiteTypes, usgsStaParameters]);

  const extentDvFilter = useRef<string | null>(null);

  const updateSurroundingData = useCallback(
    async (abortSignal: AbortSignal) => {
      const newExtentDvFilter = await getExtentDvFilter(mapView);

      // Could not create filters
      if (!newExtentDvFilter) return;

      // Same extent, no update necessary
      if (newExtentDvFilter === extentDvFilter.current) return;
      extentDvFilter.current = newExtentDvFilter;

      await fetchAndTransformData(
        extentDvFilter.current,
        services,
        fetchedDataDispatch,
        surroundingFetchedDataKey,
        usgsParameterCodes,
        usgsSiteTypes,
        usgsStaParameters,
        abortSignal,
        null,
        hucData, // Filter out HUC data
      );
    },
    [fetchedDataDispatch, hucData, mapView, services, usgsParameterCodes, usgsSiteTypes, usgsStaParameters],
  );

  return updateSurroundingData;
}

/*
## Utils
*/

// Builds features from streamgage data
function buildFeatures(data: UsgsStreamgageAttributes[]) {
  return data.map((datum) => {
    return new Graphic({
      geometry: new Point({
        longitude: datum.locationLongitude,
        latitude: datum.locationLatitude,
        spatialReference: {
          wkid: 102100,
        },
      }),
      attributes: datum,
    });
  });
}

// Builds the base feature layer
function buildLayer(
  type: SublayerType,
  getTitle: (graphic: Feature) => string,
  getTemplate: GetTemplateType,
) {
  return new FeatureLayer({
    id:
      type === 'enclosed'
        ? `${localFetchedDataKey}Layer`
        : `${surroundingFetchedDataKey}Layer`,
    title: `${type === 'surrounding' ? 'Surrounding ' : ''}USGS Sensors`,
    listMode: type === 'enclosed' ? 'show' : 'hide',
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
      { name: 'uniqueId', type: 'string' },
    ],
    objectIdField: 'OBJECTID',
    outFields: ['*'],
    spatialReference: {
      wkid: 102100,
    },
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
        color: colors.yellow(type === 'enclosed' ? 0.9 : 0.5),
        outline: {
          width: 0.75,
          color: colors.black(type === 'enclosed' ? 1.0 : 0.5),
        },
      }),
    }),
    popupTemplate: {
      outFields: ['*'],
      title: getTitle,
      content: getTemplate,
    },
    visible: type === 'enclosed',
  });
}

async function fetchAndTransformData(
  boundariesFilter: string,
  services: ServicesData,
  dispatch: Dispatch<FetchedDataAction>,
  fetchedDataId: 'usgsStreamgages' | 'surroundingUsgsStreamgages',
  usgsParameterCodes: ConfigFiles['usgsParameterCodes'],
  usgsSiteTypes: ConfigFiles['usgsSiteTypes'],
  usgsStaParameters: UsgsStaParameter[],
  abortSignal: AbortSignal,
  huc12: string | null = null,
  additionalData?: UsgsStreamgageAttributes[] | null,
) {
  dispatch({ type: 'pending', id: fetchedDataId });

  const latestContinuous = await fetchLatestContinuous(boundariesFilter, services, abortSignal);
  if (latestContinuous.status !== 'success') {
    dispatch({
      type: 'failure',
      id: fetchedDataId,
    });
    return null;
  }

  const monLocIdSet = new Set<string>();
  latestContinuous.data?.features?.forEach((row) => {
    monLocIdSet.add(row.properties.monitoring_location_id);
  });

  const responses = await Promise.all([
    fetchMonitoringLocations(monLocIdSet, services, abortSignal, huc12),
    fetchDaily(monLocIdSet, services, abortSignal),
    fetchPrecipitation(monLocIdSet, services, abortSignal),
  ]);

  if (responses.every((res) => res.status === 'success')) {
    const usgsStreamgageAttributes = transformServiceData(
      ...(responses.map((res) => res.data) as UsgsServiceData),
      latestContinuous.data,
      usgsParameterCodes,
      usgsSiteTypes,
      usgsStaParameters,
    );
    const payload = additionalData
      ? filterData(usgsStreamgageAttributes, additionalData, dataKeys)
      : usgsStreamgageAttributes;
    dispatch({
      type: 'success',
      id: fetchedDataId,
      payload,
    });
    return usgsStreamgageAttributes;
  } else if (responses.some((res) => res.status === 'failure')) {
    dispatch({
      type: 'failure',
      id: fetchedDataId,
    });
  } else {
    dispatch({
      type: 'idle',
      id: fetchedDataId,
    });
  }
  return null;
}

function transformServiceData(
  usgsMonitoringLocations: UsgsMonitoringLocationData,
  usgsDailyAverages: UsgsDailyAveragesData,
  usgsPrecipitation: UsgsDailyData,
  usgsLatestContinuous: UsgsLatestContinuousData,
  usgsParameterCodes: ConfigFiles['usgsParameterCodes'],
  usgsSiteTypes: ConfigFiles['usgsSiteTypes'],
  usgsStaParameters: UsgsStaParameter[],
) {
  const gages = usgsMonitoringLocations.features.map((gage) => {
    const streamgageMeasurements: {
      primary: StreamgageMeasurement[];
      secondary: StreamgageMeasurement[];
    } = { primary: [], secondary: [] };

    const fullSiteId = `${gage.properties.agency_code}-${gage.properties.monitoring_location_number}`;
    const gageLatestMeasurements = usgsLatestContinuous.features
      .filter((f) => f.properties.monitoring_location_id === fullSiteId);

    gageLatestMeasurements.forEach((item) => {
      let measurement = parseFloat(item.properties.value) || null;
      const parameterCode = item.properties.parameter_code;
      const parameterDesc = usgsParameterCodes[parameterCode];
      const parameterUnit = item.properties.unit_of_measure;

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
        parameterCategory: matchedParam?.hmwCategory ?? 'exclude',
        parameterOrder: matchedParam?.hmwOrder ?? 0,
        parameterName: matchedParam?.hmwName ?? parameterDesc,
        parameterUsgsName: matchedParam?.staDescription ?? parameterDesc,
        parameterCode,
        measurement,
        datetime: new Date(item.properties.time).toLocaleString(),
        dailyAverages: [], // NOTE: will be set below
        unitAbbr: matchedParam?.hmwUnits ?? parameterUnit,
      };

      if (data.parameterCategory === 'primary') {
        streamgageMeasurements.primary.push(data);
      }

      if (data.parameterCategory === 'secondary') {
        streamgageMeasurements.secondary.push(data);
      }
    });

    const orgId = gage.properties.agency_code;
    const siteId = gage.properties.monitoring_location_number;
    const siteTypeCode = gage.properties.site_type_code;
    const siteType = gage.properties.site_type || usgsSiteTypes[siteTypeCode];
    return {
      monitoringType: 'USGS Sensors' as const,
      siteId,
      orgId,
      orgName: orgId,
      locationLongitude: gage.geometry.coordinates[0],
      locationLatitude: gage.geometry.coordinates[1],
      locationName: gage.properties.monitoring_location_name,
      locationType: siteType,
      locationUrl: `https://waterdata.usgs.gov/monitoring-location/${orgId}-${siteId}`,
      uniqueId: `${siteId}-${orgId}`,
      // usgs streamgage specific properties:
      streamgageMeasurements,
    };
  });

  const streamgageSiteIds = gages.map((gage) => `${gage.orgId}-${gage.siteId}`);

  // add precipitation data to each streamgage if it exists for the site
  usgsPrecipitation.features.forEach((site) => {
    const siteId = site.properties.monitoring_location_id;
    const measurement = site.properties.value;

    if (streamgageSiteIds.includes(siteId)) {
      const streamgage = gages.find((gage) => `${gage.orgId}-${gage.siteId}` === siteId);

      streamgage?.streamgageMeasurements.primary.push({
        parameterCategory: 'primary',
        parameterOrder: 5,
        parameterName: 'Total Daily Rainfall',
        parameterUsgsName: 'Precipitation (USGS Daily Value)',
        parameterCode: '00045',
        measurement: parseFloat(measurement) || null,
        datetime: new Date(site.properties.time).toLocaleDateString(),
        dailyAverages: [], // NOTE: will be set below
        unitAbbr: 'in',
      });
    }
  });

  // add daily average measurements to each streamgage if it exists for the site
  const usgsDailyTimeSeriesData = [
    ...(usgsDailyAverages.allParamsMean.features),
    ...(usgsDailyAverages.precipitationSum.features),
  ];

  usgsDailyTimeSeriesData.forEach((site) => {
    const paramCode = site.properties.parameter_code;
    const siteId = site.properties.monitoring_location_id;
    const streamgage = gages.find((gage) => `${gage.orgId}-${gage.siteId}` === siteId);

    let measurement = parseFloat(site.properties.value);
    // convert measurements recorded in celsius to fahrenheit
    if (['00010', '00020', '85583'].includes(paramCode)) {
      measurement = measurement * (9 / 5) + 32;

      // round to 1 decimal place
      measurement = Math.round(measurement * 10) / 10;
    }

    const observation = { measurement, date: new Date(site.properties.time + 'T00:00:00') };

    const measurements = streamgage?.streamgageMeasurements;
    if (!measurements) return;
    // NOTE: 'type' is either 'primary' or 'secondary' – loop over both
    Object.values(measurements).forEach((measurementType) => {
      measurementType.forEach((measurement) => {
        if (measurement.parameterCode === paramCode.toString()) {
          measurement.dailyAverages.push(observation);
        }
      });
    });
  });

  return gages as UsgsStreamgageAttributes[];
}

function fetchPrecipitation(
  monitoringLocations: Set<string>,
  servicesData: ServicesData,
  abortSignal: AbortSignal,
): Promise<FetchState<UsgsDailyData>> {
  // https://help.waterdata.usgs.gov/stat_code
  const sumValues = '00006';

  // https://help.waterdata.usgs.gov/codes-and-parameters/parameters
  const precipitation = '00045'; // Precipitation, total, inches

  const url =
    servicesData.usgs.daily +
    `?f=json` +
    `&limit=10000` +
    `&time=P1D` +
    `&sortby=time` +
    `&statistic_id=${sumValues}` +
    `&parameter_code=${precipitation}` +
    `&skipGeometry=true` +
    `&properties=monitoring_location_id,parameter_code,time,value`;

  return fetchPost(`${url}&statistic_id=${sumValues}&parameter_code=${precipitation}`, {
      op: 'in',
      args: [
        { property: 'monitoring_location_id' },
        [...monitoringLocations],
      ]
    }, abortSignal)
    .then((res) => {
      return {
        status: 'success',
        data: res,
      } as FetchSuccessState<UsgsDailyData>;
    })
    .catch(handleFetchError);
}

function fetchLatestContinuous(
  boundariesFilter: string,
  servicesData: ServicesData,
  abortSignal: AbortSignal,
): Promise<FetchState<UsgsLatestContinuousData>> {
  const url =
    servicesData.usgs.latestContinuous +
    `?f=json` +
    `&limit=10000` +
    `&sortby=time` +
    `&time=P7D` +
    `&skipGeometry=true` +
    `&properties=monitoring_location_id,parameter_code,time,value,unit_of_measure` +
    `&${boundariesFilter}`;

  return fetchCheck(url, abortSignal)
    .then((res) => {
      return {
        status: 'success',
        data: res,
      } as FetchSuccessState<UsgsLatestContinuousData>;
    })
    .catch(handleFetchError);
}

function fetchMonitoringLocations(
  monitoringLocations: Set<string>,
  servicesData: ServicesData,
  abortSignal: AbortSignal,
  huc12: string | null = null,
): Promise<FetchState<UsgsMonitoringLocationData>> {
  let url =
    servicesData.usgs.monitoringLocations +
    `?f=json` +
    `&limit=10000` +
    `&properties=agency_code,monitoring_location_number,monitoring_location_name,site_type,site_type_code`;
  
  if (huc12) url += `&hydrologic_unit_code=${huc12}`;

  return fetchPost(url, {
    op: 'in',
    args: [
      { property: 'monitoring_location_number' },
      [...monitoringLocations].map((l) => l.replace('USGS-', '')),
    ]
  }, abortSignal)
    .then((res) => {
      return {
        status: 'success',
        data: res,
      } as FetchSuccessState<UsgsMonitoringLocationData>;
    })
    .catch(handleFetchError);
}

function fetchDaily(
  monitoringLocations: Set<string>,
  servicesData: ServicesData,
  abortSignal: AbortSignal,
): Promise<FetchState<UsgsDailyAveragesData>> {
    // https://help.waterdata.usgs.gov/stat_code
  const meanValues = '00003';
  const sumValues = '00006';

  // https://help.waterdata.usgs.gov/codes-and-parameters/parameters
  const precipitation = '00045'; // Precipitation, total, inches

  const url =
    servicesData.usgs.daily +
    `?f=json` +
    `&limit=10000` +
    `&time=P7D` +
    `&skipGeometry=true` +
    `&sortby=time` +
    `&properties=monitoring_location_id,parameter_code,time,value`;

  return Promise.all([
    fetchPost(`${url}&statistic_id=${meanValues}`, {
      op: 'in',
      args: [
        { property: 'monitoring_location_id' },
        [...monitoringLocations],
      ]
    }, abortSignal),
    fetchPost(`${url}&statistic_id=${sumValues}&parameter_code=${precipitation}`, {
      op: 'in',
      args: [
        { property: 'monitoring_location_id' },
        [...monitoringLocations],
      ]
    }, abortSignal),
  ])
    .then(([allParamsRes, precipitationRes]) => {
      return {
        status: 'success',
        data: {
          allParamsMean: allParamsRes,
          precipitationSum: precipitationRes,
        },
      } as FetchSuccessState<UsgsDailyAveragesData>;
    })
    .catch(handleFetchError);
}

async function getExtentDvFilter(mapView: __esri.MapView | '') {
  const extent = await getGeographicExtentMapView(mapView);
  // Service requires that area of extent cannot exceed 25 degrees
  const bBox = getExtentBoundingBox(extent, 25, true);
  return bBox ? `bbox=${bBox}` : null;
}

/*
## Constants
*/

const localFetchedDataKey = 'usgsStreamgages';
const surroundingFetchedDataKey = 'surroundingUsgsStreamgages';
const dataKeys = ['orgId', 'siteId'] as Array<keyof UsgsStreamgageAttributes>;

/*
## Types
*/
type UsgsServiceData = [
  UsgsMonitoringLocationData,
  UsgsDailyAveragesData,
  UsgsDailyData,  
];
