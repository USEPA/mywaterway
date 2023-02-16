import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import { useCallback, useContext, useMemo, useState, useEffect } from 'react';
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
import { isAbort } from 'utils/utils';
import {
  getExtentBoundingBox,
  getGeographicExtent,
  useAllFeatures,
  useLocalFeatures,
  useAllFeaturesLayer,
} from 'utils/hooks/boundariesToggleLayer';
import {
  getPopupContent,
  getPopupTitle,
  stringifyAttributes,
} from 'utils/mapFunctions';
import { parseAttributes } from 'utils/utils';
// config
import { monitoringClusterSettings } from 'components/shared/LocationMap';
// styles
import { colors } from 'styles';
// types
import type { FetchedDataAction } from 'contexts/FetchedData';
import type { Dispatch } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type {
  FetchState,
  MonitoringLocationAttributes,
  MonitoringLocationsData,
  ServicesState,
} from 'types';
import type { BoundariesFilterType } from 'utils/hooks';

/*
## Hooks
*/

export function useMonitoringLocationsLayer() {
  const services = useServicesContext();
  const navigate = useNavigate();

  // Build the base feature layer
  const buildBaseLayer = useCallback(
    (baseLayerId: string) => {
      return buildLayer(baseLayerId, navigate, services);
    },
    [navigate, services],
  );

  const { serviceFailure, transformData, updateData } = useUtils();

  const { features } = useAllFeatures<MonitoringLocationAttributes>({
    transformData,
    buildFeatures,
    serviceFailure,
  });

  // Build a group layer with toggleable boundaries
  return useAllFeaturesLayer({
    layerId,
    buildBaseLayer,
    updateData,
    features,
  });
}

export function useLocalMonitoringLocationFeatures() {
  const { serviceFailure, transformData } = useUtils();

  const { features, featuresDirty } = useLocalFeatures({
    transformData,
    buildFeatures,
    serviceFailure,
  });

  return {
    monitoringLocationFeatures: features,
    monitoringLocationFeaturesDirty: featuresDirty,
    monitoringLocationServiceFailure: serviceFailure,
  };
}

function useUtils() {
  const { huc12, mapView } = useContext(LocationSearchContext);
  const services = useServicesContext();
  const fetchedDataDispatch = useFetchedDataDispatch();

  const [filter, setFilter] = useState<string | null>(null);

  const updateData = useCallback(
    async (filterType: BoundariesFilterType, abortSignal: AbortSignal) => {
      const newFilter = await getFilter(filterType, huc12, mapView);
      if (newFilter === filter) return true;
      if (!newFilter) return false;

      setFilter(newFilter);

      return await fetchMonitoringLocations(
        newFilter,
        services,
        fetchedDataDispatch,
        abortSignal,
      );
    },
    [fetchedDataDispatch, filter, huc12, mapView, services],
  );

  // Create the data normalization function
  const { monitoringLocations } = useFetchedDataState();

  const transformData = useCallback(() => {
    return transformServiceData(monitoringLocations);
  }, [monitoringLocations]);

  const serviceFailure = useMemo(() => {
    return monitoringLocations.status === 'failure';
  }, [monitoringLocations]);

  return { serviceFailure, updateData, transformData };
}

/*
## Utils
*/

function buildFeatures(transformedData: MonitoringLocationAttributes[]) {
  const structuredProps = ['stationTotalsByGroup', 'timeframe'];
  return transformedData.map((datum) => {
    const attributes = stringifyAttributes(structuredProps, datum);
    return new Graphic({
      geometry: new Point({
        longitude: attributes.locationLongitude,
        latitude: attributes.locationLatitude,
      }),
      attributes: {
        ...attributes,
      },
    });
  });
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

async function fetchMonitoringLocations(
  boundariesFilter: string,
  services: ServicesState,
  dispatch: Dispatch<FetchedDataAction>,
  abortSignal: AbortSignal,
) {
  if (services.status !== 'success') return false;

  const url =
    `${services.data.waterQualityPortal.monitoringLocation}` +
    `search?mimeType=geojson&zip=no&${boundariesFilter}`;

  dispatch({ type: 'pending', id: 'monitoringLocations' });

  const newMonitoringLocations = await fetchCheck(url, abortSignal).catch(
    (err) => {
      if (isAbort(err)) {
        dispatch({ type: 'idle', id: 'monitoringLocations' });
        return true;
      }
      console.error(err);
      dispatch({ type: 'failure', id: 'monitoringLocations' });
      return false;
    },
  );

  dispatch({
    type: 'success',
    id: 'monitoringLocations',
    payload: newMonitoringLocations,
  });
  return true;
}

async function getFilter(
  filterType: BoundariesFilterType = 'bBox',
  huc12: string,
  mapView: __esri.MapView | '',
) {
  const hucFilter = `huc=${huc12}` ?? null;
  switch (filterType) {
    case 'huc': {
      return hucFilter;
    }
    case 'bBox': {
      const extent = await getGeographicExtent(mapView);
      const bBox = getExtentBoundingBox(extent);
      if (bBox) return `bBox=${bBox}`;
      else return hucFilter;
    }
    default:
      return null;
  }
}

function transformServiceData(
  monitoringLocations: FetchState<MonitoringLocationsData>,
) {
  if (monitoringLocations.status !== 'success') return null;

  // sort descending order so that smaller graphics show up on top
  const stationsSorted = [...monitoringLocations.data.features].sort((a, b) => {
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
      // TODO: explore if the built up locationUrl below is ever different from
      // `station.properties.siteUrl`. from a quick test, they seem the same
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
  }) as MonitoringLocationAttributes[];
}

/*
## Constants
*/

const layerId = 'monitoringLocationsLayer';
