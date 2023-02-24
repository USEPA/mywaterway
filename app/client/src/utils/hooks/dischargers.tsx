import Graphic from '@arcgis/core/Graphic';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Point from '@arcgis/core/geometry/Point';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import { useCallback, useContext, useEffect, useState } from 'react';
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
    buildBaseLayer,
    updateData,
    features,
  });
}

export function useLocalDischargers(
  filter?: (attributes: Facility) => boolean,
) {
  const { permittedDischargers } = useFetchedDataState();
  const { dischargersLayer } = useLayers();

  const { features: dischargers, status: dischargersStatus } = useLocalFeatures(
    dischargersLayer,
    permittedDischargers.status,
    filter,
  );

  return { dischargers, dischargersStatus };
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
    ).then((data) => setHucData(data));

    return function cleanup() {
      controller.abort();
    };
  }, [fetchedDataDispatch, huc12, services]);

  const [extentFilter, setExtentFilter] = useState<string | null>(null);

  const updateData = useCallback(
    async (abortSignal: AbortSignal, hucOnly = false) => {
      if (services.status !== 'success') return;

      if (hucOnly && hucData)
        return fetchedDataDispatch({
          type: 'success',
          id: 'permittedDischargers',
          payload: hucData,
        });

      const newExtentFilter = await getExtentFilter(mapView);
      // No updates necessary
      if (newExtentFilter === extentFilter) return;
      // Could not create filter
      if (!newExtentFilter) return;

      setExtentFilter(newExtentFilter);

      fetchAndTransformData(
        fetchPermittedDischargers(newExtentFilter, services.data, abortSignal),
        fetchedDataDispatch,
        hucData,
      );
    },
    [extentFilter, fetchedDataDispatch, hucData, mapView, services],
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
          // width units differ between FeatureLayers and GraphicsLayers
          width: 0.65,
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
  additionalData?: Facility[] | null,
) {
  dispatch({ type: 'pending', id: 'permittedDischargers' });

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
      id: 'permittedDischargers',
      payload,
    });
    return payload;
  } else {
    dispatch({ type: response.status, id: 'permittedDischargers' });
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
