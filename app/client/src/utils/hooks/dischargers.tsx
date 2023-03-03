import Graphic from '@arcgis/core/Graphic';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Point from '@arcgis/core/geometry/Point';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
  getGeographicExtent,
  handleFetchError,
  removeDuplicateData,
  useAllFeaturesLayer,
  useLocalFeatures,
} from 'utils/hooks/boundariesToggleLayer';
import { getPopupContent, getPopupTitle } from 'utils/mapFunctions';
// config
// types
import type { FetchedDataAction, FetchState } from 'contexts/FetchedData';
import type { Dispatch } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type {
  Facility,
  PermittedDischargersData,
  ServicesData,
  ServicesState,
} from 'types';
// styles
import { colors } from 'styles';

/*
## Hooks
*/

export function useDischargersLayer() {
  // Build the base feature layer
  const services = useServicesContext();
  const navigate = useNavigate();
  const { permittedDischargers } = useFetchedDataState();

  const buildBaseLayer = useCallback(
    (baseLayerId: string) => {
      return buildLayer(baseLayerId, navigate, services);
    },
    [navigate, services],
  );

  const updateData = useUpdateData();

  const [features, setFeatures] = useState<__esri.Graphic[]>([]);
  useEffect(() => {
    if (permittedDischargers.status !== 'success') return;
    setFeatures(buildFeatures(permittedDischargers.data));
  }, [permittedDischargers]);

  // Build a group layer with toggleable boundaries
  return useAllFeaturesLayer({
    layerId,
    fetchedDataKey,
    buildBaseLayer,
    updateData,
    features,
  });
}

export function useLocalDischargers(
  filter?: (attributes: Facility) => boolean,
) {
  const { features, status } = useLocalFeatures(
    localFetchedDataKey,
    buildFeatures,
  );

  const filteredFeatures = useMemo(() => {
    return filter
      ? features.filter((feature) => filter(feature.attributes))
      : features;
  }, [features, filter]);

  return { dischargers: filteredFeatures, dischargersStatus: status };
}

function useUpdateData() {
  // Build the data update function
  const { huc12, mapView } = useContext(LocationSearchContext);
  const services = useServicesContext();

  const fetchedDataDispatch = useFetchedDataDispatch();

  const [hucData, setHucData] = useState<Facility[] | null>([]);
  useEffect(() => {
    const controller = new AbortController();

    if (!huc12) return;
    if (services.status !== 'success') return;

    fetchAndTransformData(
      fetchPermittedDischargers(
        `p_wbd=${huc12}`,
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

  const updateData = useCallback(
    async (abortSignal: AbortSignal, hucOnly = false) => {
      if (services.status !== 'success') return;

      if (hucOnly && hucData)
        return fetchedDataDispatch({
          type: 'success',
          id: 'permittedDischargers',
          payload: hucData,
        });

      const extentFilter = await getExtentFilter(mapView);

      // Could not create filter
      if (!extentFilter) return;

      fetchAndTransformData(
        fetchPermittedDischargers(extentFilter, services.data, abortSignal),
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

// Builds features from dischargers data
function buildFeatures(data: Facility[]) {
  return data.map((datum) => {
    return new Graphic({
      attributes: {
        ...datum,
        uniqueIdKey: 'SourceID',
      },
      geometry: new Point({
        spatialReference: {
          wkid: 102100,
        },
        latitude: parseFloat(datum['FacLat']),
        longitude: parseFloat(datum['FacLong']),
      }),
    });
  });
}

// Builds the base feature layer
function buildLayer(
  baseLayerId: string,
  navigate: NavigateFunction,
  services: ServicesState,
) {
  return new FeatureLayer({
    id: baseLayerId,
    title: 'Dischargers',
    listMode: 'hide',
    legendEnabled: false,
    fields: [
      { name: 'OBJECTID', type: 'oid' },
      { name: 'CWPFormalEaCnt', type: 'string' },
      { name: 'CWPInspectionCount', type: 'string' },
      { name: 'CWPName', type: 'string' },
      { name: 'CWPPermitStatusDesc', type: 'string' },
      { name: 'CWPSNCStatus', type: 'string' },
      { name: 'CWPStatus', type: 'string' },
      { name: 'FacLat', type: 'string' },
      { name: 'FacLong', type: 'string' },
      { name: 'RegistryID', type: 'string' },
      { name: 'SourceID', type: 'string' },
      { name: 'uniqueIdKey', type: 'string' },
    ],
    objectIdField: 'OBJECTID',
    outFields: ['*'],
    spatialReference: {
      wkid: 102100,
    },
    // NOTE: initial graphic below will be replaced with dischargers
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
        color: colors.orange,
        style: 'diamond',
        size: 15,
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

async function fetchAndTransformData(
  promise: ReturnType<typeof fetchPermittedDischargers>,
  dispatch: Dispatch<FetchedDataAction>,
  fetchedDataId: 'permittedDischargers' | 'localPermittedDischargers',
  additionalData?: Facility[] | null,
) {
  dispatch({ type: 'pending', id: fetchedDataId });

  const response = await promise;
  if (response.status === 'success') {
    const permittedDischargers = transformServiceData(response.data) ?? [];
    const payload = additionalData
      ? removeDuplicateData(
          [...permittedDischargers, ...additionalData],
          dataKeys,
        )
      : permittedDischargers;
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

function transformServiceData(
  permittedDischargers: PermittedDischargersData,
): Facility[] {
  return 'Error' in permittedDischargers.Results
    ? []
    : permittedDischargers.Results.Facilities;
}

async function fetchPermittedDischargers(
  boundariesFilter: string,
  servicesData: ServicesData,
  abortSignal: AbortSignal,
): Promise<FetchState<PermittedDischargersData>> {
  let response: EchoMetadata;
  try {
    response = await fetchCheck(servicesData.echoNPDES.metadata, abortSignal);
  } catch (err) {
    return handleFetchError(err);
  }

  // Columns to return from Echo
  const facilityColumns = [
    'CWPFormalEaCnt',
    'CWPInspectionCount',
    'CWPName',
    'CWPPermitStatusDesc',
    'CWPSNCStatus',
    'CWPStatus',
    'FacLong',
    'FacLat',
    'RegistryID',
    'SourceID',
  ];
  // Loop through the metadata and find the ids of the columns we want
  const columnIds: string[] = [];
  response.Results.ResultColumns.forEach((column: ResultColumn) => {
    if (facilityColumns.indexOf(column.ObjectName) !== -1) {
      columnIds.push(column.ColumnID);
    }
  });

  const url =
    `${servicesData.echoNPDES.getFacilities}?output=JSON&tablelist=Y` +
    `&p_act=Y&p_ptype=NPD&responseset=5000` +
    `&qcolumns=${columnIds.join(',')}&${boundariesFilter}`;

  try {
    const data = await fetchCheck(url, abortSignal);
    if (!('Results' in data)) {
      return { status: 'idle', data: null };
    }
    return { status: 'success', data };
  } catch (err) {
    return handleFetchError(err);
  }
}

async function getExtentFilter(mapView: __esri.MapView | '') {
  const extent = await getGeographicExtent(mapView);
  if (!extent) return null;
  return `p_c1lat=${extent.ymin}&p_c1lon=${extent.xmin}&p_c2lat=${extent.ymax}&p_c2lon=${extent.xmax}`;
}

/*
## Constants
*/

const localFetchedDataKey = 'localPermittedDischargers';
const fetchedDataKey = 'permittedDischargers';
const layerId = 'dischargersLayer';
const dataKeys = ['SourceID'] as Array<keyof Facility>;

/*
## Types
*/

type EchoMetadata = {
  Results: {
    Message: 'Success';
    ResultColumns: ResultColumn[];
  };
};

type ResultColumn = {
  ColumnName: string;
  DataType: string;
  DataLength: string;
  ColumnID: string;
  ObjectName: string;
  Description: string;
};
