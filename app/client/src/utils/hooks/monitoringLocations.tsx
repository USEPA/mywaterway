import Graphic from '@arcgis/core/Graphic';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Point from '@arcgis/core/geometry/Point';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
// contexts
import {
  useFetchedDataDispatch,
  useFetchedDataState,
} from 'contexts/FetchedData';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// utils
import { fetchCheck } from 'utils/fetchUtils';
import { useDynamicPopup } from 'utils/hooks';
import {
  filterData,
  getExtentBoundingBox,
  getGeographicExtent,
  handleFetchError,
  useAllFeaturesLayers,
  useLocalData,
} from 'utils/hooks/boundariesToggleLayer';
import { stringifyAttributes } from 'utils/mapFunctions';
import { parseAttributes } from 'utils/utils';
// config
import { characteristicGroupMappings } from 'config/characteristicGroupMappings';
// types
import type { FetchedDataAction, FetchState } from 'contexts/FetchedData';
import type { Dispatch } from 'react';
import type {
  Feature,
  FetchStatus,
  MonitoringLocationAttributes,
  MonitoringLocationGroups,
  MonitoringLocationsData,
  MonitoringWorkerData,
  ServicesData,
} from 'types';
import type { SublayerType } from 'utils/hooks/boundariesToggleLayer';
// styles
import { colors } from 'styles';

/*
## Hooks
*/

export function useMonitoringLocationsLayers(
  localFilter: string | null = null,
) {
  const { getTemplate, getTitle } = useDynamicPopup();

  // Build the base feature layer
  const buildBaseLayer = useCallback(
    (type: SublayerType) => {
      return buildLayer(type, getTitle, getTemplate);
    },
    [getTemplate, getTitle],
  );

  const updateSurroundingData = useUpdateData(localFilter);

  // Build a group layer with toggleable boundaries
  const { enclosedLayer, surroundingLayer } = useAllFeaturesLayers({
    buildBaseLayer,
    buildFeatures,
    enclosedFetchedDataKey: localFetchedDataKey,
    minScale,
    surroundingFetchedDataKey,
    updateSurroundingData,
  });

  return {
    monitoringLocationsLayer: enclosedLayer,
    surroundingMonitoringLocationsLayer: surroundingLayer,
  };
}

export function useMonitoringLocations() {
  const { data, status } = useLocalData(localFetchedDataKey);

  return {
    monitoringLocations: data,
    monitoringLocationsStatus: status,
  };
}

export function useMonitoringGroups(
  param?: 'huc12' | 'siteId',
  filter?: string,
) {
  const { monitoringGroups, setMonitoringGroups } = useContext(
    LocationSearchContext,
  );
  const { monitoringLocations } = useFetchedDataState();

  const monitoringAnnualRecords = usePeriodOfRecordData(param, filter);

  // Add the stations historical data to the `dataByYear` property,
  const addAnnualData = useCallback(
    (newMonitoringGroups: MonitoringLocationGroups) => {
      if (monitoringAnnualRecords.status !== 'success')
        return newMonitoringGroups;
      const annualRecords: MonitoringWorkerData['sites'] =
        monitoringAnnualRecords.data.sites;
      for (const label in newMonitoringGroups) {
        for (const station of newMonitoringGroups[label].stations) {
          const id = station.uniqueId;
          if (id in annualRecords) {
            station.dataByYear = annualRecords[id];
            // Tally characteristic counts
            station.totalsByCharacteristic = Object.values(
              annualRecords[id],
            ).reduce((totals, yearData) => {
              Object.entries(yearData.totalsByCharacteristic).forEach(
                ([charc, count]) => {
                  if (count <= 0) return;
                  if (charc in totals) totals[charc] += count;
                  else totals[charc] = count;
                },
              );
              return totals;
            }, {} as { [characteristic: string]: number });
          }
        }
      }

      return newMonitoringGroups;
    },
    [monitoringAnnualRecords],
  );

  useEffect(() => {
    if (monitoringLocations.status !== 'success') return;

    setMonitoringGroups(
      addAnnualData(
        buildMonitoringGroups(
          monitoringLocations.data,
          characteristicGroupMappings,
        ),
      ),
    );
  }, [addAnnualData, monitoringLocations, setMonitoringGroups]);

  return monitoringGroups;
}

// Passes parsing of historical CSV data to a Web Worker,
// which itself utilizes an external service
function usePeriodOfRecordData(param?: 'huc12' | 'siteId', filter?: string) {
  const {
    setMonitoringCharacteristicsStatus,
    setMonitoringYearsRange,
    setSelectedMonitoringYearsRange,
  } = useContext(LocationSearchContext);
  const services = useServicesContext();

  const [monitoringAnnualRecords, setMonitoringAnnualRecords] = useState<{
    status: FetchStatus;
    data: MonitoringWorkerData;
  }>({
    status: 'idle',
    data: initialWorkerData,
  });

  useEffect(() => {
    const { minYear, maxYear } = monitoringAnnualRecords.data;
    setMonitoringYearsRange([minYear, maxYear]);
    setSelectedMonitoringYearsRange([minYear, maxYear]);
    setMonitoringCharacteristicsStatus(monitoringAnnualRecords.status);
  }, [
    monitoringAnnualRecords,
    setMonitoringCharacteristicsStatus,
    setMonitoringYearsRange,
    setSelectedMonitoringYearsRange,
  ]);

  // Craft the URL
  let url: string | null = null;
  if (
    services.status === 'success' &&
    filter &&
    (param === 'huc12' || param === 'siteId')
  ) {
    url =
      `${services.data.waterQualityPortal.monitoringLocation}search?` +
      `&mimeType=csv&dataProfile=periodOfRecord&summaryYears=all`;
    url += param === 'huc12' ? `&huc=${filter}` : `&siteid=${filter}`;
  }

  const recordsWorker = useRef<Worker | null>(null);
  const [prevUrl, setPrevUrl] = useState<string | null>(null);
  if (url !== prevUrl) {
    setPrevUrl(url);
    setMonitoringAnnualRecords({ status: 'idle', data: initialWorkerData });
  }

  useEffect(() => {
    if (!url || monitoringAnnualRecords.status !== 'idle') return;
    if (!window.Worker) {
      throw new Error("Your browser doesn't support web workers");
    }
    setMonitoringAnnualRecords({
      status: 'pending',
      data: initialWorkerData,
    });

    // Create the worker and assign it a job, then listen for a response
    if (recordsWorker.current) recordsWorker.current.terminate();
    const origin = window.location.origin;
    recordsWorker.current = new Worker(`${origin}/periodOfRecordWorker.js`);
    recordsWorker.current.postMessage([
      url,
      origin,
      characteristicGroupMappings,
    ]);
    recordsWorker.current.onmessage = (message) => {
      if (message.data && typeof message.data === 'string') {
        const parsedData = JSON.parse(message.data);
        parsedData.data.minYear = parseInt(parsedData.data.minYear);
        parsedData.data.maxYear = parseInt(parsedData.data.maxYear);
        setMonitoringAnnualRecords(parsedData);
      }
    };
  }, [monitoringAnnualRecords.status, url]);

  useEffect(() => {
    return function cleanup() {
      recordsWorker.current?.terminate();
    };
  }, [setMonitoringAnnualRecords, setMonitoringYearsRange, url]);

  return monitoringAnnualRecords;
}

function useUpdateData(localFilter: string | null) {
  // Build the data update function
  const { mapView } = useContext(LocationSearchContext);
  const services = useServicesContext();

  const fetchedDataDispatch = useFetchedDataDispatch();

  const [localData, setLocalData] = useState<
    MonitoringLocationAttributes[] | null
  >([]);
  useEffect(() => {
    const controller = new AbortController();

    if (!localFilter) {
      fetchedDataDispatch({
        type: 'success',
        id: localFetchedDataKey,
        payload: [],
      });
      setLocalData([]);
      return;
    }

    if (services.status !== 'success') return;

    fetchAndTransformData(
      fetchMonitoringLocations(localFilter, services.data, controller.signal),
      fetchedDataDispatch,
      localFetchedDataKey,
    ).then((data) => {
      setLocalData(data);
    });

    return function cleanup() {
      controller.abort();
    };
  }, [fetchedDataDispatch, localFilter, services]);

  const extentFilter = useRef<string | null>(null);

  const updateSurroundingData = useCallback(
    async (abortSignal: AbortSignal) => {
      if (services.status !== 'success') return;

      const newExtentFilter = await getExtentFilter(mapView);

      // Could not create filter
      if (!newExtentFilter) return;

      // Same extent, no update necessary
      if (newExtentFilter === extentFilter.current) return;
      extentFilter.current = newExtentFilter;

      await fetchAndTransformData(
        fetchMonitoringLocations(
          extentFilter.current,
          services.data,
          abortSignal,
        ),
        fetchedDataDispatch,
        surroundingFetchedDataKey,
        localData, // Filter out HUC data
      );
    },
    [fetchedDataDispatch, localData, mapView, services],
  );

  return updateSurroundingData;
}

/*
## Utils
*/

function buildFeatures(locations: MonitoringLocationAttributes[]) {
  const structuredProps = [
    'totalsByCharacteristic',
    'totalsByGroup',
    'timeframe',
  ];
  return locations.map((location) => {
    const attributes = stringifyAttributes(structuredProps, location);
    return new Graphic({
      geometry: new Point({
        longitude: attributes.locationLongitude,
        latitude: attributes.locationLatitude,
        spatialReference: {
          wkid: 102100,
        },
      }),
      attributes,
    });
  });
}

function buildMonitoringGroups(
  stations: MonitoringLocationAttributes[],
  mappings: typeof characteristicGroupMappings,
) {
  // build up monitoring stations, toggles, and groups
  let locationGroups: MonitoringLocationGroups = {
    All: {
      characteristicGroups: [],
      label: 'All',
      stations: [],
      toggled: true,
    },
  };

  stations.forEach((station) => {
    // add properties that aren't necessary for the layer
    station.dataByYear = {};
    // counts for each top-tier characteristic group
    station.totalsByLabel = {};
    // build up the monitoringLocationToggles and monitoringLocationGroups
    const subGroupsAdded = new Set();
    mappings
      .filter((mapping) => mapping.label !== 'All')
      .forEach((mapping) => {
        station.totalsByLabel![mapping.label] = 0;
        for (const subGroup in station.totalsByGroup) {
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
          station.totalsByLabel![mapping.label] +=
            station.totalsByGroup[subGroup];
        }
      });

    locationGroups['All'].stations.push(station);

    // add any leftover lower-tier group counts to the 'Other' top-tier group
    for (const subGroup in station.totalsByGroup) {
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
      station.totalsByLabel['Other'] += station.totalsByGroup[subGroup];
    }
  });
  Object.keys(locationGroups).forEach((label) => {
    locationGroups[label].characteristicGroups = [
      ...new Set(locationGroups[label].characteristicGroups),
    ];
  });
  return locationGroups;
}

function buildLayer(
  type: SublayerType,
  getTitle: (graphic: Feature) => string,
  getTemplate: (graphic: Feature) => HTMLDivElement | null,
) {
  return new FeatureLayer({
    id:
      type === 'enclosed'
        ? `${localFetchedDataKey}Layer`
        : `${surroundingFetchedDataKey}Layer`,
    title: `${
      type === 'surrounding' ? 'Surrounding ' : ''
    }Past Water Conditions`,
    listMode: type === 'enclosed' ? 'show' : 'hide',
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
      { name: 'locationUrlPartial', type: 'string' },
      { name: 'providerName', type: 'string' },
      { name: 'totalSamples', type: 'integer' },
      { name: 'totalsByCharacteristic', type: 'string' },
      { name: 'totalsByGroup', type: 'string' },
      { name: 'totalMeasurements', type: 'integer' },
      { name: 'timeframe', type: 'string' },
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
        geometry: new Point({ longitude: -98.5795, latitude: 39.8283 }),
        attributes: { OBJECTID: 1 },
      }),
    ],
    renderer: new SimpleRenderer({
      symbol: new SimpleMarkerSymbol({
        style: 'circle',
        color: colors.lightPurple(type === 'enclosed' ? 0.5 : 0.3),
        outline: {
          width: 0.75,
          color: colors.black(type === 'enclosed' ? 1.0 : 0.5),
        },
      }),
    }),
    popupTemplate: {
      outFields: ['*'],
      title: getTitle,
      content: (feature: Feature) => {
        // Parse non-scalar variables
        const structuredProps = ['totalsByGroup', 'timeframe'];
        feature.graphic.attributes = parseAttributes(
          structuredProps,
          feature.graphic.attributes,
        );
        return getTemplate(feature);
      },
    },
    visible: type === 'enclosed',
  });
}

async function fetchAndTransformData(
  promise: ReturnType<typeof fetchMonitoringLocations>,
  dispatch: Dispatch<FetchedDataAction>,
  fetchedDataId: 'monitoringLocations' | 'surroundingMonitoringLocations',
  dataToExclude?: MonitoringLocationAttributes[] | null,
) {
  dispatch({ type: 'pending', id: fetchedDataId });

  const response = await promise;
  if (response.status === 'success') {
    const monitoringLocations = transformServiceData(response.data) ?? [];
    const payload = dataToExclude
      ? filterData(monitoringLocations, dataToExclude, dataKeys)
      : monitoringLocations;
    dispatch({
      type: 'success',
      id: fetchedDataId,
      payload,
    });
    return payload;
  } else {
    dispatch({ type: response.status, id: fetchedDataId });
    return null;
  }
}

async function fetchMonitoringLocations(
  boundariesFilter: string,
  servicesData: ServicesData,
  abortSignal: AbortSignal,
): Promise<FetchState<MonitoringLocationsData>> {
  const url =
    `${servicesData.waterQualityPortal.monitoringLocation}` +
    `search?mimeType=geojson&zip=no&${boundariesFilter}`;

  try {
    const data = await fetchCheck(url, abortSignal);
    return { status: 'success', data };
  } catch (err) {
    return handleFetchError(err);
  }
}

async function getExtentFilter(mapView: __esri.MapView | '') {
  const extent = await getGeographicExtent(mapView);
  // Service requires that area of extent cannot exceed 25 degrees
  const bBox = getExtentBoundingBox(extent);
  return bBox ? `bBox=${bBox}` : null;
}

function transformServiceData(
  data: MonitoringLocationsData,
): MonitoringLocationAttributes[] {
  // sort descending order so that smaller graphics show up on top
  const stationsSorted = [...data.features];
  stationsSorted.sort((a, b) => {
    return (
      parseInt(b.properties.resultCount) - parseInt(a.properties.resultCount)
    );
  });

  // attributes common to both the layer and the context object
  return stationsSorted.map((station) => {
    const locationUrlPartial =
      `/monitoring-report/` +
      `${station.properties.ProviderName}/` +
      `${encodeURIComponent(station.properties.OrganizationIdentifier)}/` +
      `${encodeURIComponent(station.properties.MonitoringLocationIdentifier)}/`;
    return {
      county: station.properties.CountyName,
      monitoringType: 'Past Water Conditions' as const,
      siteId: station.properties.MonitoringLocationIdentifier,
      orgId: station.properties.OrganizationIdentifier,
      orgName: station.properties.OrganizationFormalName,
      locationLongitude: station.geometry.coordinates[0],
      locationLatitude: station.geometry.coordinates[1],
      locationName: station.properties.MonitoringLocationName,
      locationType: station.properties.MonitoringLocationTypeName,
      locationUrl: `https://mywaterway.epa.gov${locationUrlPartial}`,
      locationUrlPartial,
      // monitoring station specific properties:
      state: station.properties.StateName,
      dataByYear: {},
      providerName: station.properties.ProviderName,
      totalSamples: parseInt(station.properties.activityCount),
      totalMeasurements: parseInt(station.properties.resultCount),
      totalsByCharacteristic: {},
      // counts for each lower-tier characteristic group
      totalsByGroup: station.properties.characteristicGroupResultCount,
      totalsByLabel: {},
      timeframe: null,
      // create a unique id, so we can check if the monitoring station has
      // already been added to the display (since a monitoring station id
      // isn't universally unique)
      uniqueId:
        `${station.properties.MonitoringLocationIdentifier}` +
        `-${station.properties.ProviderName}` +
        `-${station.properties.OrganizationIdentifier}`,
    };
  });
}

/*
## Constants
*/

const initialWorkerData = {
  minYear: 0,
  maxYear: 0,
  sites: {},
};

const localFetchedDataKey = 'monitoringLocations';
const surroundingFetchedDataKey = 'surroundingMonitoringLocations';
const dataKeys = ['siteId', 'orgId', 'stationProviderName'] as Array<
  keyof MonitoringLocationAttributes
>;
const minScale = 400_000;
