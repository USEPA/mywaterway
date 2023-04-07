import Graphic from '@arcgis/core/Graphic';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Point from '@arcgis/core/geometry/Point';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// contexts
import { useFetchedDataDispatch } from 'contexts/FetchedData';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// utils
import { fetchCheck } from 'utils/fetchUtils';
import {
  filterData,
  getExtentBoundingBox,
  getGeographicExtent,
  handleFetchError,
  useAllFeaturesLayers,
  useLocalData,
} from 'utils/hooks/boundariesToggleLayer';
import { getPopupContent, getPopupTitle } from 'utils/mapFunctions';
// config
import { usgsStaParameters } from 'config/usgsStaParameters';
// types
import type { FetchedDataAction, FetchState } from 'contexts/FetchedData';
import type { Dispatch } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type {
  ServicesData,
  ServicesState,
  StreamgageMeasurement,
  UsgsDailyAveragesData,
  UsgsPrecipitationData,
  UsgsStreamgageAttributes,
  UsgsStreamgagesData,
  FetchSuccessState,
} from 'types';
import type { SublayerType } from 'utils/hooks/boundariesToggleLayer';
// styles
import { colors } from 'styles';

/*
## Hooks
*/

export function useStreamgageLayers() {
  // Build the base feature layer
  const services = useServicesContext();
  const navigate = useNavigate();

  const buildBaseLayer = useCallback(
    (type: SublayerType) => {
      return buildLayer(navigate, services, type);
    },
    [navigate, services],
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
  const { huc12, mapView } = useContext(LocationSearchContext);
  const services = useServicesContext();

  const fetchedDataDispatch = useFetchedDataDispatch();

  const [hucData, setHucData] = useState<UsgsStreamgageAttributes[] | null>([]);
  useEffect(() => {
    const controller = new AbortController();

    if (!huc12) {
      setHucData([]);
      fetchedDataDispatch({
        type: 'success',
        id: localFetchedDataKey,
        payload: [],
      });
      return;
    }

    if (services.status !== 'success') return;

    const hucDvFilter = `huc=${huc12.substring(0, 8)}`;
    const hucThingsFilter = `$filter=properties/hydrologicUnit eq '${huc12}'`;

    fetchAndTransformData(
      [
        fetchDailyAverages(hucDvFilter, services.data, controller.signal),
        fetchPrecipitation(hucDvFilter, services.data, controller.signal),
        fetchStreamgages(hucThingsFilter, services.data, controller.signal),
      ],
      fetchedDataDispatch,
      localFetchedDataKey,
    ).then((data) => {
      setHucData(data);
    });

    return function cleanup() {
      controller.abort();
    };
  }, [fetchedDataDispatch, huc12, services]);

  const extentDvFilter = useRef<string | null>(null);
  const extentThingsFilter = useRef<string | null>(null);

  const updateSurroundingData = useCallback(
    async (abortSignal: AbortSignal) => {
      if (services.status !== 'success') return;

      const newExtentDvFilter = await getExtentDvFilter(mapView);
      const newExtentThingsFilter = await getExtentThingsFilter(mapView);

      // Could not create filters
      if (!newExtentDvFilter || !newExtentThingsFilter) return;

      // Same extent, no update necessary
      if (
        newExtentDvFilter === extentDvFilter.current ||
        newExtentThingsFilter === extentThingsFilter.current
      )
        return;
      extentDvFilter.current = newExtentDvFilter;
      extentThingsFilter.current = newExtentThingsFilter;

      await fetchAndTransformData(
        [
          fetchDailyAverages(
            extentDvFilter.current,
            services.data,
            abortSignal,
          ),
          fetchPrecipitation(
            extentDvFilter.current,
            services.data,
            abortSignal,
          ),
          fetchStreamgages(
            extentThingsFilter.current,
            services.data,
            abortSignal,
          ),
        ],
        fetchedDataDispatch,
        surroundingFetchedDataKey,
        hucData, // Filter out HUC data
      );
    },
    [fetchedDataDispatch, hucData, mapView, services],
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
  navigate: NavigateFunction,
  services: ServicesState,
  type: SublayerType,
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
      title: (feature: __esri.Feature) =>
        getPopupTitle(feature.graphic.attributes),
      content: (feature: __esri.Feature) =>
        getPopupContent({ feature: feature.graphic, navigate, services }),
    },
    visible: type === 'enclosed',
  });
}

async function fetchAndTransformData(
  promises: UsgsFetchPromises,
  dispatch: Dispatch<FetchedDataAction>,
  fetchedDataId: 'usgsStreamgages' | 'surroundingUsgsStreamgages',
  additionalData?: UsgsStreamgageAttributes[] | null,
) {
  dispatch({ type: 'pending', id: fetchedDataId });

  const responses = await Promise.all(promises);
  if (responses.every((res) => res.status === 'success')) {
    const usgsStreamgageAttributes = transformServiceData(
      ...(responses.map((res) => res.data) as UsgsServiceData),
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
  usgsDailyAverages: UsgsDailyAveragesData,
  usgsPrecipitation: UsgsPrecipitationData,
  usgsStreamgages: UsgsStreamgagesData,
) {
  const gages = usgsStreamgages.value.map((gage) => {
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
      uniqueId:
        `${gage.properties.monitoringLocationNumber}` +
        `-${gage.properties.agencyCode}`,
      // usgs streamgage specific properties:
      streamgageMeasurements,
    };
  });

  const streamgageSiteIds = gages.map((gage) => gage.siteId);

  // add precipitation data to each streamgage if it exists for the site
  if (usgsPrecipitation.value) {
    usgsPrecipitation.value?.timeSeries.forEach((site) => {
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
    usgsDailyAverages.allParamsMean?.value &&
    usgsDailyAverages.precipitationSum?.value
  ) {
    const usgsDailyTimeSeriesData = [
      ...(usgsDailyAverages.allParamsMean.value?.timeSeries || []),
      ...(usgsDailyAverages.precipitationSum.value?.timeSeries || []),
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
  servicesData: ServicesData,
  abortSignal: AbortSignal,
): Promise<FetchState<UsgsDailyAveragesData>> {
  // https://help.waterdata.usgs.gov/stat_code
  const meanValues = '00003';
  const sumValues = '00006';

  // https://help.waterdata.usgs.gov/codes-and-parameters/parameters
  const allParams = 'all';
  const precipitation = '00045'; // Precipitation, total, inches

  const url =
    servicesData.usgsDailyValues +
    `?format=json` +
    `&siteStatus=active` +
    `&period=P7D` +
    `&${boundariesFilter}`;

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

function fetchPrecipitation(
  boundariesFilter: string,
  servicesData: ServicesData,
  abortSignal: AbortSignal,
): Promise<FetchState<UsgsPrecipitationData>> {
  // https://help.waterdata.usgs.gov/stat_code
  const sumValues = '00006';

  // https://help.waterdata.usgs.gov/codes-and-parameters/parameters
  const precipitation = '00045'; // Precipitation, total, inches

  const url =
    servicesData.usgsDailyValues +
    `?format=json` +
    `&siteStatus=active` +
    `&statCd=${sumValues}` +
    `&parameterCd=${precipitation}` +
    `&${boundariesFilter}`;

  return fetchCheck(url, abortSignal)
    .then((res) => {
      return {
        status: 'success',
        data: res,
      } as FetchSuccessState<UsgsPrecipitationData>;
    })
    .catch(handleFetchError);
}

function fetchStreamgages(
  boundariesFilter: string,
  servicesData: ServicesData,
  abortSignal: AbortSignal,
): Promise<FetchState<UsgsStreamgagesData>> {
  const url =
    `${servicesData.usgsSensorThingsAPI}?` +
    `$select=name,properties/active,properties/agency,properties/agencyCode,properties/monitoringLocationUrl,properties/monitoringLocationName,properties/monitoringLocationType,properties/monitoringLocationNumber,properties/hydrologicUnit&` +
    `$expand=Locations($select=location),Datastreams($select=description,properties/ParameterCode,properties/WebDescription,unitOfMeasurement/name,unitOfMeasurement/symbol;` +
    `$expand=Observations($select=phenomenonTime,result;` +
    `$top=1;` +
    `$orderBy=phenomenonTime desc))` +
    `&${boundariesFilter}`;

  return fetchCheck(url, abortSignal)
    .then((res) => {
      return {
        status: 'success',
        data: res,
      } as FetchSuccessState<UsgsStreamgagesData>;
    })
    .catch(handleFetchError);
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
    ? `$filter=st_within(Locations/location,geography'POLYGON(${wkt})')`
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

const localFetchedDataKey = 'usgsStreamgages';
const surroundingFetchedDataKey = 'surroundingUsgsStreamgages';
const dataKeys = ['orgId', 'siteId'] as Array<keyof UsgsStreamgageAttributes>;

/*
## Types
*/
type UsgsFetchPromises = [
  ReturnType<typeof fetchDailyAverages>,
  ReturnType<typeof fetchPrecipitation>,
  ReturnType<typeof fetchStreamgages>,
];

type UsgsServiceData = [
  UsgsDailyAveragesData,
  UsgsPrecipitationData,
  UsgsStreamgagesData,
];
