import Graphic from '@arcgis/core/Graphic';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Point from '@arcgis/core/geometry/Point';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';
import { useContext, useEffect, useState } from 'react';
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
import { getPopupContent, getPopupTitle } from 'utils/mapFunctions';
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

export function useStreamgages() {
  const fetchedDataDispatch = useFetchedDataDispatch();
  const { usgsStreamgages, usgsPrecipitation, usgsDailyAverages } =
    useFetchedDataState();
  const { huc12, mapView, setUsgsStreamgagesLayer, usgsStreamgagesLayer } =
    useContext(LocationSearchContext);
  const { services } = useServicesContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (usgsStreamgagesLayer) return;
    setUsgsStreamgagesLayer(buildUsgsStreamgagesLayer(navigate, services));
  }, [navigate, services, setUsgsStreamgagesLayer, usgsStreamgagesLayer]);

  const streamgageData = useStreamgageData(
    usgsStreamgages,
    usgsPrecipitation,
    usgsDailyAverages,
  );

  const normalizedUsgsStreamgages = useStreamgageFeatures(streamgageData);

  useEffect(() => {
    if (!usgsStreamgagesLayer || !normalizedUsgsStreamgages.length) return;

    const graphics = normalizedUsgsStreamgages.map((gage) => {
      return new Graphic({
        geometry: new Point({
          longitude: gage.attributes.locationLongitude,
          latitude: gage.attributes.locationLatitude,
        }),
        attributes: gage,
      });
    });

    return usgsStreamgagesLayer
      .queryFeatures()
      .then((featureSet: __esri.FeatureSet) => {
        return usgsStreamgagesLayer.applyEdits({
          deleteFeatures: featureSet.features,
          addFeatures: graphics,
        });
      });
  }, [normalizedUsgsStreamgages, usgsStreamgagesLayer]);
}

/** Normalizes USGS streamgage data with monitoring stations data. */
export function useStreamgageData(
  usgsStreamgages: FetchState<UsgsStreamgagesData>,
  usgsPrecipitation: FetchState<UsgsPrecipitationData>,
  usgsDailyAverages: FetchState<UsgsDailyAveragesData>,
) {
  const [normalizedStreamgages, setNormalizedStreamgages] = useState<
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

    setNormalizedStreamgages(gages);
  }, [usgsStreamgages, usgsPrecipitation, usgsDailyAverages]);

  return normalizedStreamgages;
}

function useStreamgageFeatures(streamgageData: UsgsStreamgageAttributes[]) {
  return streamgageData.map((streamgage) => {
    return {
      geometry: {
        type: 'point',
        longitude: streamgage.locationLongitude,
        latitude: streamgage.locationLatitude,
      },
      attributes: streamgage,
    };
  });
}

/*
## Utils
*/
function buildUsgsStreamgagesLayer(
  navigate: NavigateFunction,
  services: ServicesState,
) {
  return new FeatureLayer({
    id: 'usgsStreamgagesLayer',
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
  huc12: string,
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
    `&huc=${huc12.substring(0, 8)}`;

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
  huc12: string,
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
    `&huc=${huc12.substring(0, 8)}`;

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

async function fetchUsgsStreamgageIds(
  mapView: __esri.MapView | '',
  services: ServicesState,
) {
  if (services.status !== 'success') return null;
  if (!mapView) return null;

  await reactiveUtils.whenOnce(() => mapView.stationary);
  if (mapView.zoom <= 8) return null;

  const extentMercator = mapView.extent;
  const extent = webMercatorUtils.webMercatorToGeographic(
    extentMercator,
  ) as __esri.Extent;

  const url =
    `${services.data.usgsSites}?` +
    `format=mapper` +
    `&siteStatus=active` +
    `&hasDataTypeCd=dv` +
    `&bBox=${toFixedFloat(extent.xmin, 7)},${toFixedFloat(
      extent.ymin,
      7,
    )},${toFixedFloat(extent.xmax, 7)},${toFixedFloat(extent.ymax, 7)}`;

  return fetch(url)
    .then((res) => res.text())
    .then((text) => new window.DOMParser().parseFromString(text, 'text/xml'))
    .then((data) => {
      const sitesNode = data.querySelector('sites');
      if (sitesNode) {
        return [...sitesNode.children].map((site) => {
          return `${site.getAttribute('agc')}-${site.getAttribute('sno')}`;
        });
      }
      return null;
    })
    .catch(() => null);
}

async function fetchUsgsStreamgages(
  huc12: string,
  services: ServicesState,
  dispatch: Dispatch<FetchedDataAction>,
  sites: string[] | null,
) {
  if (services.status !== 'success') return;

  const filter = sites
    ? sites.map((site) => `name eq '${site}'`).join(' or ')
    : `properties/hydrologicUnit eq '${huc12}'`;

  const url =
    `${services.data.usgsSensorThingsAPI}?` +
    `$select=name,properties/active,properties/agency,properties/agencyCode,properties/monitoringLocationUrl,properties/monitoringLocationName,properties/monitoringLocationType,properties/monitoringLocationNumber,properties/hydrologicUnit&` +
    `$expand=Locations($select=location),Datastreams($select=description,properties/ParameterCode,properties/WebDescription,unitOfMeasurement/name,unitOfMeasurement/symbol;` +
    `$expand=Observations($select=phenomenonTime,result;` +
    `$top=1;` +
    `$orderBy=phenomenonTime desc))&` +
    `$filter=${filter}`;

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
