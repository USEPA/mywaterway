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
import { useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// utils
import { fetchCheck } from 'utils/fetchUtils';
import {
  getExtentBoundingBox,
  getGeographicExtent,
  handleFetchError,
  removeDuplicateData,
  useAllFeaturesLayer,
  useLocalFeatures,
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
// styles
import { colors } from 'styles';

/*
## Hooks
*/

export function useMonitoringLocationsLayer() {
  // Build the base feature layer
  const services = useServicesContext();
  const navigate = useNavigate();
  const { monitoringLocations } = useFetchedDataState();

  const buildBaseLayer = useCallback(
    (baseLayerId: string) => {
      return buildLayer(baseLayerId, navigate, services);
    },
    [navigate, services],
  );

  const updateData = useUpdateData();

  const [features, setFeatures] = useState<__esri.Graphic[]>([]);
  useEffect(() => {
    if (monitoringLocations.status !== 'success') return;
    setFeatures(buildFeatures(monitoringLocations.data));
  }, [monitoringLocations]);

  // Build a group layer with toggleable boundaries
  return useAllFeaturesLayer({
    layerId,
    fetchedDataKey,
    buildBaseLayer,
    updateData,
    features,
    minScale,
  });
}

export function useLocalMonitoringLocations() {
  const { monitoringLocationsLayer } = useLayers();

  const { features, status } = useLocalFeatures(
    localFetchedDataKey,
    buildFeatures,
  );

  useEffect(() => {
    if (!monitoringLocationsLayer) return;

    monitoringLocationsLayer.baseLayer.featureReduction =
      features.length > 20 ? monitoringClusterSettings : null;
  }, [monitoringLocationsLayer, features]);

  return { monitoringLocations: features, monitoringLocationsStatus: status };
}

export function useMonitoringGroups() {
  const { monitoringGroups, setMonitoringGroups } = useContext(
    LocationSearchContext,
  );
  const { localMonitoringLocations } = useFetchedDataState();

  useEffect(() => {
    if (localMonitoringLocations.status !== 'success') return;

    setMonitoringGroups(
      buildMonitoringGroups(
        localMonitoringLocations.data,
        characteristicGroupMappings,
      ),
    );
  }, [localMonitoringLocations, setMonitoringGroups]);

  return monitoringGroups;
}

function useUpdateData() {
  // Build the data update function
  const { huc12, mapView } = useContext(LocationSearchContext);
  const services = useServicesContext();

  const fetchedDataDispatch = useFetchedDataDispatch();

  const [hucData, setHucData] = useState<MonitoringLocationAttributes[] | null>(
    [],
  );
  useEffect(() => {
    const controller = new AbortController();

    if (!huc12) return;
    if (services.status !== 'success') return;

    fetchAndTransformData(
      fetchMonitoringLocations(
        `huc=${huc12}`,
        services.data,
        controller.signal,
      ),
      fetchedDataDispatch,
      localFetchedDataKey,
    ).then((data) => {
      setHucData(data);
      if (data) {
        // Initially update complete dataset with local data
        fetchedDataDispatch({
          type: 'success',
          id: fetchedDataKey,
          payload: data,
        });
      }
    });

    return function cleanup() {
      controller.abort();
    };
  }, [fetchedDataDispatch, huc12, services]);

  const extentFilter = useRef<string | null>(null);

  const updateData = useCallback(
    async (abortSignal: AbortSignal, hucOnly = false) => {
      if (services.status !== 'success') return;

      if (hucOnly && hucData)
        return fetchedDataDispatch({
          type: 'success',
          id: fetchedDataKey,
          payload: hucData,
        });

      const newExtentFilter = await getExtentFilter(mapView);

      // Could not create filter
      if (!newExtentFilter) return;

      // Same extent, no update necessary
      if (newExtentFilter === extentFilter.current) return;
      extentFilter.current = newExtentFilter;

      fetchAndTransformData(
        fetchMonitoringLocations(
          extentFilter.current,
          services.data,
          abortSignal,
        ),
        fetchedDataDispatch,
        fetchedDataKey,
        hucData, // Always include HUC data
      );
    },
    [fetchedDataDispatch, hucData, mapView, services],
  );

  return updateData;
}

/*
## Utils
*/

function buildFeatures(locations: MonitoringLocationAttributes[]) {
  const structuredProps = ['stationTotalsByGroup', 'timeframe'];
  return locations.map((location) => {
    const attributes = stringifyAttributes(structuredProps, location);
    return new Graphic({
      geometry: new Point({
        longitude: attributes.locationLongitude,
        latitude: attributes.locationLatitude,
      }),
      attributes: {
        ...attributes,
        uniqueIdKey: 'uniqueId',
      },
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
    station.stationDataByYear = {};
    // counts for each top-tier characteristic group
    station.stationTotalsByLabel = {};
    // build up the monitoringLocationToggles and monitoringLocationGroups
    const subGroupsAdded = new Set();
    mappings
      .filter((mapping) => mapping.label !== 'All')
      .forEach((mapping) => {
        station.stationTotalsByLabel![mapping.label] = 0;
        for (const subGroup in station.stationTotalsByGroup) {
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
          station.stationTotalsByLabel![mapping.label] +=
            station.stationTotalsByGroup[subGroup];
        }
      });

    locationGroups['All'].stations.push(station);

    // add any leftover lower-tier group counts to the 'Other' top-tier group
    for (const subGroup in station.stationTotalsByGroup) {
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
      station.stationTotalsByLabel['Other'] +=
        station.stationTotalsByGroup[subGroup];
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
  baseLayerId: string,
  navigate: NavigateFunction,
  services: ServicesState,
) {
  return new FeatureLayer({
    id: baseLayerId,
    title: 'Past Water Conditions',
    listMode: 'hide',
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
      { name: 'stationProviderName', type: 'string' },
      { name: 'stationTotalSamples', type: 'integer' },
      { name: 'stationTotalsByGroup', type: 'string' },
      { name: 'stationTotalMeasurements', type: 'integer' },
      { name: 'timeframe', type: 'string' },
      { name: 'uniqueId', type: 'string' },
      { name: 'uniqueIdKey', type: 'string' },
    ],
    objectIdField: 'OBJECTID',
    outFields: ['*'],
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
        color: colors.lightPurple(0.5),
        outline: {
          width: 0.75,
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
        const structuredProps = ['stationTotalsByGroup', 'timeframe'];
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
  });
}

async function fetchAndTransformData(
  promise: ReturnType<typeof fetchMonitoringLocations>,
  dispatch: Dispatch<FetchedDataAction>,
  fetchedDataId: 'monitoringLocations' | 'localMonitoringLocations',
  additionalData?: MonitoringLocationAttributes[] | null,
) {
  dispatch({ type: 'pending', id: fetchedDataId });

  const response = await promise;
  if (response.status === 'success') {
    const monitoringLocations = transformServiceData(response.data) ?? [];
    const payload = additionalData
      ? removeDuplicateData(
          [...monitoringLocations, ...additionalData],
          dataKeys,
        )
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
    return {
      monitoringType: 'Past Water Conditions' as const,
      siteId: station.properties.MonitoringLocationIdentifier,
      orgId: station.properties.OrganizationIdentifier,
      orgName: station.properties.OrganizationFormalName,
      locationLongitude: station.geometry.coordinates[0],
      locationLatitude: station.geometry.coordinates[1],
      locationName: station.properties.MonitoringLocationName,
      locationType: station.properties.MonitoringLocationTypeName,
      locationUrl:
        `/monitoring-report/` +
        `${station.properties.ProviderName}/` +
        `${encodeURIComponent(station.properties.OrganizationIdentifier)}/` +
        `${encodeURIComponent(
          station.properties.MonitoringLocationIdentifier,
        )}/`,
      // monitoring station specific properties:
      stationDataByYear: null,
      stationProviderName: station.properties.ProviderName,
      stationTotalSamples: parseInt(station.properties.activityCount),
      stationTotalMeasurements: parseInt(station.properties.resultCount),
      // counts for each lower-tier characteristic group
      stationTotalsByGroup: station.properties.characteristicGroupResultCount,
      stationTotalsByLabel: null,
      timeframe: null,
      // create a unique id, so we can check if the monitoring station has
      // already been added to the display (since a monitoring station id
      // isn't universally unique)
      uniqueId:
        `${station.properties.MonitoringLocationIdentifier}-` +
        `${station.properties.ProviderName}-` +
        `${station.properties.OrganizationIdentifier}`,
    };
  });
}

/*
## Constants
*/

const localFetchedDataKey = 'localMonitoringLocations';
const fetchedDataKey = 'monitoringLocations';
const layerId = 'monitoringLocationsLayer';
const dataKeys = ['uniqueId'] as Array<keyof MonitoringLocationAttributes>;
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
