import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import Graphic from '@arcgis/core/Graphic';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Point from '@arcgis/core/geometry/Point';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
// contexts
import { useConfigFilesState } from 'contexts/ConfigFiles';
import {
  useFetchedDataDispatch,
  useFetchedDataState,
} from 'contexts/FetchedData';
import {
  initialMonitoringGroups,
  LocationSearchContext,
} from 'contexts/locationSearch';
// utils
import { fetchCheck } from 'utils/fetchUtils';
import { GetTemplateType, useDynamicPopup } from 'utils/hooks';
import {
  filterData,
  getExtentBoundingBox,
  getGeographicExtentMapView,
  getGeographicExtentPolygon,
  handleFetchError,
  useAllFeaturesLayers,
  useLocalData,
} from 'utils/boundariesToggleLayer';
import { isPolygon, stringifyAttributes } from 'utils/mapFunctions';
import { parseAttributes } from 'utils/utils';
// types
import type { FetchedDataAction, FetchState } from 'contexts/FetchedData';
import type { Dispatch, SetStateAction } from 'react';
import type {
  CharacteristicGroupMappings,
  Feature,
  FetchStatus,
  MonitoringLocationAttributes,
  MonitoringLocationData,
  MonitoringLocationGroups,
  MonitoringLocationsData,
  MonitoringLocationsResponse,
  ServicesData,
} from 'types';
import type { MonitoringPeriodOfRecordData } from './periodOfRecord';
import type { SublayerType } from 'utils/boundariesToggleLayer';
// styles
import { colors } from 'styles';

/*
## Hooks
*/

export function useMonitoringLocationsLayers({
  includeAnnualData = true,
  filter = null,
}: {
  includeAnnualData?: boolean;
  filter?: string | __esri.Polygon | null;
} = {}) {
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
  const configFiles = useConfigFilesState();
  const {
    monitoringGroups,
    setMonitoringGroups,
  }: {
    monitoringGroups: MonitoringLocationGroups;
    setMonitoringGroups: Dispatch<SetStateAction<MonitoringLocationGroups>>;
  } = useContext(LocationSearchContext);
  const { monitoringLocations } = useFetchedDataState();

  useEffect(() => {
    if (monitoringLocations.status !== 'success') return;

    setMonitoringGroups(
      buildMonitoringGroups(
        monitoringLocations.data,
        configFiles.data.characteristicGroupMappings,
      ),
    );
  }, [configFiles, monitoringLocations, setMonitoringGroups]);

  useEffect(() => {
    return function cleanup() {
      setMonitoringGroups(
        initialMonitoringGroups(configFiles.data.characteristicGroupMappings),
      );
    };
  }, [configFiles, setMonitoringGroups]);

  return { monitoringGroups, setMonitoringGroups };
}

// Passes parsing of historical CSV data to a Web Worker,
// which itself utilizes an external service
function useMonitoringPeriodOfRecord(filter: MonitoringLocationAttributes[] | null, enabled: boolean) {
  const configFiles = useConfigFilesState();
  const {
    setMonitoringPeriodOfRecordStatus,
    setMonitoringYearsRange,
    setSelectedMonitoringYearsRange,
  } = useContext(LocationSearchContext);

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

  const recordsWorker = useRef<Worker | null>(null);

  useEffect(() => {
    if (!enabled || !filter || filter.length === 0) {
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
      new URL('./periodOfRecord', import.meta.url),
      { type: 'module' },
    );
    // Tell the worker to start the task
    recordsWorker.current.postMessage([
      `${configFiles.data.services.waterQualityPortal.monitoringLocation}search`,
      {
        mimeType: 'csv',
        dataProfile: 'periodOfRecord',
        summaryYears: 'all',
        siteid: filter.map((loc) => loc.siteId),
      },
      configFiles.data.characteristicGroupMappings,
    ]);
    // Handle the worker's response
    recordsWorker.current.onmessage = (message) => {
      if (message.data && typeof message.data === 'string') {
        const parsedData = JSON.parse(message.data);
        parsedData.data.minYear = parseInt(parsedData.data.minYear);
        parsedData.data.maxYear = parseInt(parsedData.data.maxYear);
        setMonitoringAnnualRecords(parsedData);
      }
    };
  }, [configFiles, enabled, filter]);

  useEffect(() => {
    return function cleanup() {
      recordsWorker.current?.terminate();
    };
  }, []);

  return monitoringAnnualRecords;
}

// Updates local data when the user chooses a new location,
// and returns a function for updating surrounding data.
function useUpdateData(localFilter: string | __esri.Polygon | null, includeAnnualData: boolean) {
  // Build the data update function
  const configFiles = useConfigFilesState();
  const { mapView } = useContext(LocationSearchContext);

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

    fetchAndTransformData(
      fetchMonitoringLocations(
        localFilter,
        configFiles.data.services,
        controller.signal,
      ),
      fetchedDataDispatch,
      localFetchedDataKey,
      configFiles.data.characteristicGroupMappings,
    ).then((data) => {
      setLocalData(data);
    });

    return function cleanup() {
      controller.abort();
    };
  }, [configFiles, fetchedDataDispatch, localFilter]);

  // Add annual characteristic data to the local data
  const annualData = useMonitoringPeriodOfRecord(
    localData,
    includeAnnualData,
  );
  useEffect(() => {
    if (!localData?.length) return;
    if (annualData.status !== 'success') return;

    addAnnualData(localData, annualData.data.sites);
  }, [localData, annualData, fetchedDataDispatch]);

  const extentFilter = useRef<string | null>(null);

  const updateSurroundingData = useCallback(
    async (abortSignal: AbortSignal) => {
      const extent = await getGeographicExtentMapView(mapView);
      const newExtentFilter = getExtentFilter(extent);

      // Could not create filter
      if (!newExtentFilter) return;

      // Same extent, no update necessary
      if (newExtentFilter === extentFilter.current) return;
      extentFilter.current = newExtentFilter;

      await fetchAndTransformData(
        fetchMonitoringLocations(
          extentFilter.current,
          configFiles.data.services,
          abortSignal,
        ),
        fetchedDataDispatch,
        surroundingFetchedDataKey,
        configFiles.data.characteristicGroupMappings,
        localData, // Filter out HUC data
      );
    },
    [configFiles, fetchedDataDispatch, localData, mapView],
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
  monitoringLocations.forEach((location) => {
    const id = location.uniqueId;
    if (id in annualData) {
      location.dataByYear = annualData[id];
      // Get all-time characteristics by group
      location.characteristicsByGroup = Object.values(annualData[id]).reduce(
        (groups, yearData) => {
          Object.entries(yearData.characteristicsByGroup).forEach(
            ([group, charcList]) => {
              groups[group] = Array.from(
                new Set(charcList.concat(groups[group] ?? [])),
              );
            },
          );
          return groups;
        },
        {} as { [group: string]: string[] },
      );
      // Tally characteristic counts
      location.totalsByCharacteristic = Object.values(annualData[id]).reduce(
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
      );
    }
  });
}

function buildFeatures(locations: MonitoringLocationAttributes[]) {
  return locations.map((location) => {
    const attributes = stringifyAttributes(complexProps, location);
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
  mappings: CharacteristicGroupMappings,
) {
  // build up monitoring stations, toggles, and groups
  let locationGroups: MonitoringLocationGroups =
    initialMonitoringGroups(mappings);

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
  getTemplate: GetTemplateType,
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
      { name: 'characteristicsByGroup', type: 'string' },
      { name: 'dataByYear', type: 'string' },
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
      { name: 'totalsByLabel', type: 'string' },
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
      label: 'Location',
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
        feature.graphic.attributes = parseAttributes(
          complexProps,
          feature.graphic.attributes,
        );
        return getTemplate(feature, type === 'surrounding');
      },
    },
    visible: type === 'enclosed',
  });
}

async function fetchAndTransformData(
  promise: ReturnType<typeof fetchMonitoringLocations>,
  dispatch: Dispatch<FetchedDataAction>,
  fetchedDataId: 'monitoringLocations' | 'surroundingMonitoringLocations',
  characteristicGroupMappings: CharacteristicGroupMappings,
  dataToExclude?: MonitoringLocationAttributes[] | null,
) {
  dispatch({ type: 'pending', id: fetchedDataId });

  const response = await promise;
  if (response.status === 'success') {
    const monitoringLocations =
      transformServiceData(response.data, characteristicGroupMappings) ?? [];
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
  boundariesFilter: string | __esri.Polygon,
  servicesData: ServicesData,
  abortSignal: AbortSignal,
): Promise<FetchState<MonitoringLocationsData>> {
  let filter: string | __esri.Polygon | __esri.Extent = boundariesFilter;
  if (typeof boundariesFilter !== 'string' && isPolygon(boundariesFilter) && boundariesFilter.extent) {
    const extent = await getGeographicExtentPolygon(boundariesFilter);
    filter = getExtentFilter(extent) ?? boundariesFilter;
  }

  const url =
    `${servicesData.waterQualityPortal.monitoringLocation}` +
    `search?mimeType=geojson&zip=no&${filter}`;

  try {
    const res = await fetchCheck(url, abortSignal) as MonitoringLocationsResponse;

    // filter data by boundaries
    const data: MonitoringLocationData[] = [];
    if (typeof boundariesFilter !== 'string' && isPolygon(boundariesFilter)) {
      res.features.forEach((feature) => {
        const geometry = new Point({
          longitude: feature.geometry.coordinates[0],
          latitude: feature.geometry.coordinates[1],
          spatialReference: {
            wkid: 102100,
          },
        });

        if (geometryEngine.contains(boundariesFilter, geometry)) {
          data.push(feature);
        }
      });
    } else {
      data.push(...res.features);
    }

    return { status: 'success', data };
  } catch (err) {
    return handleFetchError(err);
  }
}

function getExtentFilter(extent: __esri.Extent | null) {
  // Service requires that area of extent cannot exceed 25 degrees
  const bBox = getExtentBoundingBox(extent);
  return bBox ? `bBox=${bBox}` : null;
}

function parseStationLabelTotals(
  characteristicGroupMappings: CharacteristicGroupMappings,
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
  characteristicGroupMappings: CharacteristicGroupMappings,
): MonitoringLocationAttributes[] {
  // sort descending order so that smaller graphics show up on top
  const stationsSorted = [...data];
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
      characteristicsByGroup: {},
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
        characteristicGroupMappings,
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

export const complexProps = [
  'characteristicsByGroup',
  'dataByYear',
  'totalsByCharacteristic',
  'totalsByGroup',
  'totalsByLabel',
  'timeframe',
];

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

export { structurePeriodOfRecordData } from './periodOfRecord';
