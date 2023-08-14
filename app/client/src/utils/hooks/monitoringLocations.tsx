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
import {
  initialMonitoringGroups,
  LocationSearchContext,
} from 'contexts/locationSearch';
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
  MonitoringPeriodOfRecordData,
  ServicesData,
} from 'types';
import type { SublayerType } from 'utils/hooks/boundariesToggleLayer';
// styles
import { colors } from 'styles';

/*
## Hooks
*/

export function useMonitoringLocationsLayers({
  includeAnnualData = true,
  filter = null,
}: {
  includeAnnualData: boolean;
  filter: string | null;
}) {
  const { getTemplate, getTitle } = useDynamicPopup();

  // Build the base feature layer
  const buildBaseLayer = useCallback(
    (type: SublayerType) => {
      return buildLayer(type, getTitle, getTemplate);
    },
    [getTemplate, getTitle],
  );

  const updateSurroundingData = useUpdateData(filter, includeAnnualData);

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

export function useMonitoringGroups() {
  const { monitoringGroups, setMonitoringGroups } = useContext(
    LocationSearchContext,
  );
  const { monitoringLocations } = useFetchedDataState();

  useEffect(() => {
    if (monitoringLocations.status !== 'success') return;

    setMonitoringGroups(
      buildMonitoringGroups(
        monitoringLocations.data,
        characteristicGroupMappings,
      ),
    );
  }, [monitoringLocations, setMonitoringGroups]);

  return { monitoringGroups, setMonitoringGroups };
}

// Passes parsing of historical CSV data to a Web Worker,
// which itself utilizes an external service
export function useMonitoringPeriodOfRecord(
  filter: string | null,
  enabled: boolean,
) {
  const {
    setMonitoringPeriodOfRecordStatus,
    setMonitoringYearsRange,
    setSelectedMonitoringYearsRange,
  } = useContext(LocationSearchContext);
  const services = useServicesContext();

  const [monitoringAnnualRecords, setMonitoringAnnualRecords] = useState<{
    status: FetchStatus;
    data: MonitoringPeriodOfRecordData;
  }>({
    status: 'idle',
    data: initialWorkerData(),
  });

  useEffect(() => {
    const { minYear, maxYear } = monitoringAnnualRecords.data;
    setMonitoringYearsRange([minYear, maxYear]);
    setSelectedMonitoringYearsRange([minYear, maxYear]);
    setMonitoringPeriodOfRecordStatus(monitoringAnnualRecords.status); // Share the status
  }, [
    monitoringAnnualRecords,
    setMonitoringPeriodOfRecordStatus,
    setMonitoringYearsRange,
    setSelectedMonitoringYearsRange,
  ]);

  // Craft the URL
  let url: string | null = null;
  if (services.status === 'success' && filter) {
    url =
      `${services.data.waterQualityPortal.monitoringLocation}search?` +
      `&mimeType=csv&dataProfile=periodOfRecord&summaryYears=all&${filter}`;
  }

  const recordsWorker = useRef<Worker | null>(null);

  useEffect(() => {
    if (!enabled || !url) {
      setMonitoringAnnualRecords({ status: 'idle', data: initialWorkerData() });
      return;
    }
    if (!window.Worker) {
      throw new Error("Your browser doesn't support web workers");
    }
    setMonitoringAnnualRecords({
      status: 'pending',
      data: initialWorkerData(),
    });

    // Create the worker and assign it a job, then listen for a response
    if (recordsWorker.current) recordsWorker.current.terminate();
    recordsWorker.current = new Worker(
      new URL('../tasks/periodOfRecordWorker', import.meta.url),
    );
    // Tell the worker to start the task
    recordsWorker.current.postMessage([url, characteristicGroupMappings]);
    // Handle the worker's response
    recordsWorker.current.onmessage = (message) => {
      if (message.data && typeof message.data === 'string') {
        const parsedData = JSON.parse(message.data);
        parsedData.data.minYear = parseInt(parsedData.data.minYear);
        parsedData.data.maxYear = parseInt(parsedData.data.maxYear);
        setMonitoringAnnualRecords(parsedData);
      }
    };
  }, [enabled, url]);

  useEffect(() => {
    return function cleanup() {
      recordsWorker.current?.terminate();
    };
  }, []);

  return monitoringAnnualRecords;
}

// Updates local data when the user chooses a new location,
// and returns a function for updating surrounding data.
function useUpdateData(localFilter: string | null, includeAnnualData: boolean) {
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

  // Add annual characteristic data to the local data
  const annualData = useMonitoringPeriodOfRecord(
    localFilter,
    includeAnnualData,
  );
  useEffect(() => {
    if (!localData?.length) return;
    if (annualData.status !== 'success') return;

    fetchedDataDispatch({
      type: 'success',
      id: localFetchedDataKey,
      payload: addAnnualData(localData, annualData.data.sites),
    });
  }, [localData, annualData, fetchedDataDispatch]);

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

// Add the stations' historical data to the `dataByYear` property,
export function addAnnualData(
  monitoringLocations: MonitoringLocationAttributes[],
  annualData: MonitoringPeriodOfRecordData['sites'],
) {
  return monitoringLocations.map((location) => {
    const id = location.uniqueId;
    if (id in annualData) {
      return {
        ...location,
        dataByYear: annualData[id],
        // Tally characteristic counts
        totalsByCharacteristic: Object.values(annualData[id]).reduce(
          (totals, yearData) => {
            Object.entries(yearData.totalsByCharacteristic).forEach(
              ([charc, count]) => {
                if (count <= 0) return;
                if (charc in totals) totals[charc] += count;
                else totals[charc] = count;
              },
            );
            return totals;
          },
          {} as { [characteristic: string]: number },
        ),
      };
    } else {
      return location;
    }
  });
}

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
  let locationGroups: MonitoringLocationGroups = initialMonitoringGroups();

  stations.forEach((station) => {
    // build up the monitoringLocationToggles and monitoringLocationGroups
    const subGroupsAdded = new Set();
    mappings
      .filter((mapping) => mapping.label !== 'All')
      .forEach((mapping) => {
        for (const subGroup in station.totalsByGroup) {
          // if characteristic group exists in switch config object
          if (!mapping.groupNames.includes(subGroup)) continue;
          subGroupsAdded.add(subGroup);
          // switch group (w/ label key) already exists, add the stations to it
          locationGroups[mapping.label].stations.push(station);
          locationGroups[mapping.label].characteristicGroups.push(subGroup);
        }
      });

    locationGroups['All'].stations.push(station);

    // add any leftover lower-tier group counts to the 'Other' top-tier group
    for (const subGroup in station.totalsByGroup) {
      if (subGroupsAdded.has(subGroup)) continue;
      locationGroups['Other'].stations.push(station);
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
        const structuredProps = [
          'totalsByCharacteristic',
          'totalsByGroup',
          'timeframe',
        ];
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

function parseStationLabelTotals(
  totalsByGroup: MonitoringLocationAttributes['totalsByGroup'],
) {
  const subGroupsAdded = new Set();
  const totalsByLabel: MonitoringLocationAttributes['totalsByLabel'] = {};
  characteristicGroupMappings
    .filter((mapping) => mapping.label !== 'All')
    .forEach((mapping) => {
      totalsByLabel[mapping.label] = 0;
      for (const subGroup in totalsByGroup) {
        // if characteristic group exists in switch config object
        if (!mapping.groupNames.includes(subGroup)) continue;
        subGroupsAdded.add(subGroup);
        // add the lower-tier group counts to the corresponding top-tier group counts
        totalsByLabel[mapping.label] += totalsByGroup[subGroup];
      }
    });

  // add any leftover lower-tier group counts to the 'Other' top-tier group
  for (const subGroup in totalsByGroup) {
    if (subGroupsAdded.has(subGroup)) continue;
    totalsByLabel['Other'] += totalsByGroup[subGroup];
  }

  return totalsByLabel;
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
      // counts for each top-tier characteristic group
      totalsByLabel: parseStationLabelTotals(
        station.properties.characteristicGroupResultCount,
      ),
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

const initialWorkerData = () => ({
  minYear: 0,
  maxYear: 0,
  sites: {},
});

const localFetchedDataKey = 'monitoringLocations';
const surroundingFetchedDataKey = 'surroundingMonitoringLocations';
const dataKeys = ['siteId', 'orgId', 'stationProviderName'] as Array<
  keyof MonitoringLocationAttributes
>;
const minScale = 400_000;
