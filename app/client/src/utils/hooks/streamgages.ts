import Graphic from '@arcgis/core/Graphic';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Point from '@arcgis/core/geometry/Point';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// contexts
import {
  useFetchedDataDispatch,
  useFetchedDataState,
} from 'contexts/FetchedData';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useLayersActions } from 'contexts/Layers';
import { useServicesContext } from 'contexts/LookupFiles';
// utils
import { fetchCheck } from 'utils/fetchUtils';
import { useAllFeaturesLayer } from 'utils/hooks';
import {
  getPopupContent,
  getPopupTitle,
  isFeatureLayer,
} from 'utils/mapFunctions';
import { toFixedFloat } from 'utils/utils';
// config
import { usgsStaParameters } from 'config/usgsStaParameters';
// types
import type { FetchedDataAction } from 'contexts/FetchedData';
import type { Dispatch } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type {
  FetchState,
  ServicesState,
  StreamgageMeasurement,
  UsgsDailyAveragesData,
  UsgsPrecipitationData,
  UsgsStreamgageAttributes,
  UsgsStreamgagesData,
} from 'types';

/*
## Hooks
*/

export function useStreamgages() {
  const fetchedDataDispatch = useFetchedDataDispatch();

  const { usgsStreamgages, usgsPrecipitation, usgsDailyAverages } =
    useFetchedDataState();

  const { huc12, mapView } = useContext(LocationSearchContext);

  const {
    setUsgsStreamgagesLayer,
    setUsgsStreamgagesLayerReset,
    setUsgsStreamgagesLayerSurroundingsToggle,
  } = useLayersActions();

  const { services } = useServicesContext();

  const navigate = useNavigate();

  // Build the group layer
  const buildBaseLayer = useCallback(() => {
    return buildUsgsStreamgagesLayer(navigate, services);
  }, [navigate, services]);

  const { layer, toggleSurroundings } = useAllFeaturesLayer(
    layerId,
    buildBaseLayer,
  );

  useEffect(() => {
    setUsgsStreamgagesLayer(layer);
  }, [layer, setUsgsStreamgagesLayer]);

  useEffect(() => {
    setUsgsStreamgagesLayerSurroundingsToggle(toggleSurroundings);
  }, [setUsgsStreamgagesLayerSurroundingsToggle, toggleSurroundings]);

  const [featureLayer, setFeatureLayer] = useState<__esri.FeatureLayer | null>(
    null,
  );

  useEffect(() => {
    if (!layer) return;

    const newFeatureLayer = layer.findLayerById(`${layer.id}-features`);
    isFeatureLayer(newFeatureLayer) && setFeatureLayer(newFeatureLayer);
  }, [layer]);

  const resetLayer = useCallback(async () => {
    if (!featureLayer) return;

    toggleSurroundings(false);
    updateLayer(featureLayer);
  }, [featureLayer, toggleSurroundings]);

  useEffect(() => {
    setUsgsStreamgagesLayerReset(resetLayer);
  }, [resetLayer, setUsgsStreamgagesLayerReset]);

  // Fetch new data when the extent changes
  const getDvFilter = useCallback(
    async (type: 'huc' | 'bBox' = 'bBox') => {
      if (type === 'bBox') {
        const extent = await getGeographicExtent(mapView);
        const bBox = getExtentBoundingBox(extent);
        if (bBox) return `bBox=${bBox}`;
      }
      return `huc=${huc12.substring(0, 8)}`;
    },
    [huc12, mapView],
  );

  const getThingsFilter = useCallback(
    async (type: 'huc' | 'bBox' = 'bBox') => {
      if (type === 'bBox') {
        const extent = await getGeographicExtent(mapView);
        const wkt = getExtentWkt(extent);
        if (wkt)
          return `$filter=st_within(Location/location,geography'POLYGON(${wkt})')`;
      }
      return `$filter=properties/hydrologicUnit eq '${huc12}'`;
    },
    [huc12, mapView],
  );

  useEffect(() => {
    if (!layer) return;
    if (layer.hasHandles(handleGroupKey)) return;

    const handle = reactiveUtils.when(
      () => mapView?.stationary,
      async () => {
        if (!layer.visible) return;
        const dvFilter = await getDvFilter();
        const thingsFilter = await getThingsFilter();
        fetchUsgsStreamgages(thingsFilter, services, fetchedDataDispatch);
        fetchUsgsPrecipitation(dvFilter, services, fetchedDataDispatch);
        fetchUsgsDailyAverages(dvFilter, services, fetchedDataDispatch);
      },
    );

    layer.addHandles(handle, handleGroupKey);

    return function cleanup() {
      layer.removeHandles(handleGroupKey);
    };
  }, [
    fetchedDataDispatch,
    getDvFilter,
    getThingsFilter,
    layer,
    mapView,
    services,
  ]);

  // Get the streamgage data and add features
  const [streamgageData, localStreamgageData] = useStreamgageData(
    usgsStreamgages,
    usgsPrecipitation,
    usgsDailyAverages,
  );

  const streamgageFeatures = useMemo(() => {
    return buildStreamgageFeatures(streamgageData);
  }, [streamgageData]);

  const localStreamgageFeatures = useMemo(() => {
    return buildStreamgageFeatures(localStreamgageData);
  }, [localStreamgageData]);

  useEffect(() => {
    if (!featureLayer) return;

    updateLayer(featureLayer, streamgageFeatures);
  }, [featureLayer, streamgageFeatures]);

  return {
    streamgageData,
    streamgageFeatures,
    localStreamgageData,
    localStreamgageFeatures,
  };
}

// Normalizes USGS streamgage data with monitoring stations data.
function useStreamgageData(
  usgsStreamgages: FetchState<UsgsStreamgagesData>,
  usgsPrecipitation: FetchState<UsgsPrecipitationData>,
  usgsDailyAverages: FetchState<UsgsDailyAveragesData>,
) {
  const { hucBoundaries } = useContext(LocationSearchContext);

  const [normalizedData, setNormalizedData] = useState<
    UsgsStreamgageAttributes[]
  >([]);
  const [localNormalizedData, setLocalNormalizedData] = useState<
    UsgsStreamgageAttributes[]
  >([]);

  useEffect(() => {
    if (
      usgsStreamgages.status !== 'success' ||
      usgsPrecipitation.status !== 'success' ||
      usgsDailyAverages.status !== 'success'
    ) {
      return;
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

    setLocalNormalizedData(
      gages.filter((gage) => {
        return hucBoundaries?.features[0]?.geometry.contains(
          new Point({
            latitude: gage.locationLatitude,
            longitude: gage.locationLongitude,
          }),
        );
      }),
    );
    setNormalizedData(gages);
  }, [hucBoundaries, usgsStreamgages, usgsPrecipitation, usgsDailyAverages]);

  return [normalizedData, localNormalizedData];
}

/*
## Utils
*/

// Builds features from streamgage data
function buildStreamgageFeatures(streamgageData: UsgsStreamgageAttributes[]) {
  return streamgageData.map((gage) => {
    return new Graphic({
      geometry: new Point({
        longitude: gage.locationLongitude,
        latitude: gage.locationLatitude,
      }),
      attributes: gage,
    });
  });
}

// Builds the base feature layer
function buildUsgsStreamgagesLayer(
  navigate: NavigateFunction,
  services: ServicesState,
) {
  return new FeatureLayer({
    id: `${layerId}-features`,
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

function fetchUsgsDailyAverages(
  locationFilter: string,
  services: ServicesState,
  dispatch: Dispatch<FetchedDataAction>,
) {
  if (services.status !== 'success') return;

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
    `&${locationFilter}`;

  dispatch({ type: 'USGS_DAILY_AVERAGES/FETCH_REQUEST' });

  Promise.all([
    fetchCheck(`${url}&statCd=${meanValues}&parameterCd=${allParams}`),
    fetchCheck(`${url}&statCd=${sumValues}&parameterCd=${precipitation}`),
  ])
    .then(([allParamsRes, precipitationRes]) => {
      dispatch({
        type: 'USGS_DAILY_AVERAGES/FETCH_SUCCESS',
        payload: {
          allParamsMean: allParamsRes,
          precipitationSum: precipitationRes,
        },
      });
    })
    .catch((err) => {
      console.error(err);
      dispatch({ type: 'USGS_DAILY_AVERAGES/FETCH_FAILURE' });
    });
}

function fetchUsgsPrecipitation(
  locationFilter: string,
  services: ServicesState,
  dispatch: Dispatch<FetchedDataAction>,
) {
  if (services.status !== 'success') return;
  //
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
    `&${locationFilter}`;

  dispatch({ type: 'USGS_PRECIPITATION/FETCH_REQUEST' });

  fetchCheck(url)
    .then((res) => {
      dispatch({
        type: 'USGS_PRECIPITATION/FETCH_SUCCESS',
        payload: res,
      });
    })
    .catch((err) => {
      console.error(err);
      dispatch({ type: 'USGS_PRECIPITATION/FETCH_FAILURE' });
    });
}

function fetchUsgsStreamgages(
  locationFilter: string,
  services: ServicesState,
  dispatch: Dispatch<FetchedDataAction>,
) {
  if (services.status !== 'success') return;

  const url =
    `${services.data.usgsSensorThingsAPI}?` +
    `$select=name,properties/active,properties/agency,properties/agencyCode,properties/monitoringLocationUrl,properties/monitoringLocationName,properties/monitoringLocationType,properties/monitoringLocationNumber,properties/hydrologicUnit&` +
    `$expand=Locations($select=location),Datastreams($select=description,properties/ParameterCode,properties/WebDescription,unitOfMeasurement/name,unitOfMeasurement/symbol;` +
    `$expand=Observations($select=phenomenonTime,result;` +
    `$top=1;` +
    `$orderBy=phenomenonTime desc))` +
    `&${locationFilter}`;

  dispatch({ type: 'USGS_STREAMGAGES/FETCH_REQUEST' });

  fetchCheck(url)
    .then((res) => {
      dispatch({
        type: 'USGS_STREAMGAGES/FETCH_SUCCESS',
        payload: res,
      });
    })
    .catch((err) => {
      console.error(err);
      dispatch({ type: 'USGS_STREAMGAGES/FETCH_FAILURE' });
    });
}

// Gets a string representation of the view's extent as a bounding box
function getExtentBoundingBox(extent: __esri.Extent | null) {
  if (!extent) return null;

  return `${toFixedFloat(extent.xmin, 7)},${toFixedFloat(
    extent.ymin,
    7,
  )},${toFixedFloat(extent.xmax, 7)},${toFixedFloat(extent.ymax, 7)}`;
}

// Gets a string representation of the view's extent as Well-Known Text
function getExtentWkt(extent: __esri.Extent | null) {
  if (!extent) return null;

  return `(${extent.xmax} ${extent.ymin}, ${extent.xmax} ${extent.ymax}, ${extent.xmin} ${extent.ymax}, ${extent.xmin} ${extent.ymin}, ${extent.xmax} ${extent.ymin})`;
}

// Converts the view's extent from a Web Mercator
// projection to geographic coordinates
async function getGeographicExtent(mapView: __esri.MapView | '') {
  if (!mapView) return null;

  await reactiveUtils.whenOnce(() => mapView.stationary);
  if (mapView.zoom <= 8) return null;

  const extentMercator = mapView.extent;
  return webMercatorUtils.webMercatorToGeographic(
    extentMercator,
  ) as __esri.Extent;
}

async function updateLayer(
  layer: __esri.FeatureLayer | null,
  features?: __esri.Graphic[],
) {
  if (!layer) return;

  const featureSet = await layer?.queryFeatures();
  const edits: {
    addFeatures?: __esri.Graphic[];
    deleteFeatures: __esri.Graphic[];
  } = {
    deleteFeatures: featureSet.features,
  };
  if (features) edits.addFeatures = features;
  layer.applyEdits(edits);
}
/*
## Constants
*/

const layerId = 'usgsStreamgagesLayer';
const handleGroupKey = 'view-stationary-updates';
