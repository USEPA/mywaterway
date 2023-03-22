import Graphic from '@arcgis/core/Graphic';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import FeatureReductionCluster from '@arcgis/core/layers/support/FeatureReductionCluster';
import Point from '@arcgis/core/geometry/Point';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { render } from 'react-dom';
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
  filterData,
  getExtentBoundingBox,
  getGeographicExtent,
  handleFetchError,
  useAllFeaturesLayers,
  useLocalData,
} from 'utils/hooks/boundariesToggleLayer';
import {
  getPopupContent,
  getPopupTitle,
  stringifyAttributes,
} from 'utils/mapFunctions';
import { parseAttributes } from 'utils/utils';
// config
import { characteristicGroupMappings } from 'config/characteristicGroupMappings';
// types
import type { FetchedDataAction, FetchState } from 'contexts/FetchedData';
import type { Dispatch } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type {
  MonitoringLocationAttributes,
  MonitoringLocationGroups,
  MonitoringLocationsData,
  ServicesData,
  ServicesState,
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
  // Build the base feature layer
  const services = useServicesContext();
  const navigate = useNavigate();

  const buildBaseLayer = useCallback(
    (type: SublayerType) => {
      return buildLayer(navigate, services, type);
    },
    [navigate, services],
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

  return monitoringGroups;
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
  const structuredProps = ['totalsByGroup', 'timeframe'];
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
  navigate: NavigateFunction,
  services: ServicesState,
  type: SublayerType,
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
    featureReduction: monitoringClusterSettings,
    popupTemplate: {
      outFields: ['*'],
      title: (feature: __esri.Feature) =>
        getPopupTitle(feature.graphic.attributes),
      content: (feature: __esri.Feature) => {
        // Parse non-scalar variables
        const structuredProps = ['totalsByGroup', 'timeframe'];
        feature.graphic.attributes = parseAttributes(
          structuredProps,
          feature.graphic.attributes,
        );
        return getPopupContent({
          feature: feature.graphic,
          services,
          navigate,
        });
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
      dataByYear: null,
      providerName: station.properties.ProviderName,
      totalSamples: parseInt(station.properties.activityCount),
      totalMeasurements: parseInt(station.properties.resultCount),
      // counts for each lower-tier characteristic group
      totalsByGroup: station.properties.characteristicGroupResultCount,
      totalsByLabel: null,
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

const localFetchedDataKey = 'monitoringLocations';
const surroundingFetchedDataKey = 'surroundingMonitoringLocations';
const dataKeys = ['siteId', 'orgId', 'stationProviderName'] as Array<
  keyof MonitoringLocationAttributes
>;
const minScale = 400_000;

export const monitoringClusterSettings = new FeatureReductionCluster({
  clusterRadius: '100px',
  clusterMinSize: '24px',
  clusterMaxSize: '60px',
  popupEnabled: true,
  popupTemplate: {
    title: 'Cluster summary',
    content: (feature: __esri.Feature) => {
      const content = (
        <div style={{ margin: '0.625em' }}>
          This cluster represents {feature.graphic.attributes.cluster_count}{' '}
          stations
        </div>
      );

      const contentContainer = document.createElement('div');
      render(content, contentContainer);

      // return an esri popup item
      return contentContainer;
    },
    fieldInfos: [
      {
        fieldName: 'cluster_count',
        format: {
          places: 0,
          digitSeparator: true,
        },
      },
    ],
  },
  labelingInfo: [
    {
      deconflictionStrategy: 'none',
      labelExpressionInfo: {
        expression: "Text($feature.cluster_count, '#,###')",
      },
      symbol: {
        type: 'text',
        color: '#000000',
        font: { size: 10, weight: 'bold' },
      },
      labelPlacement: 'center-center',
    },
  ],
});
