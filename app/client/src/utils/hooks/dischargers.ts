import Graphic from '@arcgis/core/Graphic';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Point from '@arcgis/core/geometry/Point';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// contexts
import { useFetchedDataDispatch } from 'contexts/FetchedData';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// utils
import { fetchCheck } from 'utils/fetchUtils';
import {
  getGeographicExtent,
  filterData,
  handleFetchError,
  useAllFeaturesLayers,
  useLocalData,
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
import type { SublayerType } from 'utils/hooks/boundariesToggleLayer';
// styles
import { colors } from 'styles';

/*
## Hooks
*/

export function useDischargersLayers() {
  // Build the base feature layer
  const services = useServicesContext();
  const navigate = useNavigate();

  const buildBaseLayer = useCallback(
    (type: SublayerType) => {
      return buildLayer(navigate, services, type);
    },
    [navigate, services],
  );

  const updateSurroundingData = useUpdateData();

  // Build a group layer with toggleable boundaries
  const { enclosedLayer, surroundingLayer } = useAllFeaturesLayers({
    buildBaseLayer,
    buildFeatures,
    enclosedFetchedDataKey: localFetchedDataKey,
    surroundingFetchedDataKey,
    updateSurroundingData,
  });

  return {
    dischargersLayer: enclosedLayer,
    surroundingDischargersLayer: surroundingLayer,
  };
}

export function useDischargers() {
  const { data, status } = useLocalData(localFetchedDataKey);

  return { dischargers: data, dischargersStatus: status };
}

function useUpdateData() {
  // Build the data update function
  const { huc12, mapView, violatingDischargersOnly } = useContext(
    LocationSearchContext,
  );
  const services = useServicesContext();

  const fetchedDataDispatch = useFetchedDataDispatch();

  const [hucData, setHucData] = useState<Facility[] | null>([]);
  useEffect(() => {
    const controller = new AbortController();

    if (!huc12) {
      setHucData([]);
      fetchedDataDispatch({
        type: 'success',
        id: localFetchedDataKey,
        payload: [],
      });
      return;
    }

    if (services.status !== 'success') return;

    const fetchPromise = fetchPermittedDischargers(
      `p_wbd=${huc12}`,
      services.data,
      controller.signal,
    );

    fetchAndTransformData(
      fetchPromise,
      fetchedDataDispatch,
      localFetchedDataKey,
      null,
      violatingDischargersOnly,
    ).then((data) => {
      setHucData(data);
    });

    return function cleanup() {
      controller.abort();
    };
  }, [fetchedDataDispatch, huc12, services, violatingDischargersOnly]);

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
        fetchPermittedDischargers(
          extentFilter.current,
          services.data,
          abortSignal,
        ),
        fetchedDataDispatch,
        surroundingFetchedDataKey,
        hucData, // Filter out HUC data
      );
    },
    [fetchedDataDispatch, hucData, mapView, services],
  );

  return updateSurroundingData;
}

/*
## Utils
*/

// Builds features from dischargers data
function buildFeatures(data: Facility[]) {
  return data.map((datum) => {
    return new Graphic({
      attributes: datum,
      geometry: new Point({
        latitude: parseFloat(datum['FacLat']),
        longitude: parseFloat(datum['FacLong']),
        spatialReference: {
          wkid: 102100,
        },
      }),
    });
  });
}

// Builds the base feature layer
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
    title: `${type === 'surrounding' ? 'Surrounding ' : ''}Dischargers`,
    listMode: type === 'enclosed' ? 'show' : 'hide',
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
      { name: 'uniqueId', type: 'string' },
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
        color: colors.orange(type === 'enclosed' ? 0.9 : 0.5),
        style: 'diamond',
        size: 15,
        outline: {
          width: 0.75,
          color: colors.black(type === 'enclosed' ? 1.0 : 0.5),
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
    visible: type === 'enclosed',
  });
}

async function fetchAndTransformData(
  promise: ReturnType<typeof fetchPermittedDischargers>,
  dispatch: Dispatch<FetchedDataAction>,
  fetchedDataId: 'dischargers' | 'surroundingDischargers',
  dataToExclude?: Facility[] | null,
  violatingOnly = false,
) {
  dispatch({ type: 'pending', id: fetchedDataId });

  const response = await promise;
  if (response.status === 'success') {
    const permittedDischargers = transformServiceData(response.data) ?? [];

    const includedData = dataToExclude
      ? filterData(permittedDischargers, dataToExclude, dataKeys)
      : permittedDischargers;

    const payload = violatingOnly
      ? filterViolatingFacilities(includedData)
      : includedData;

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
    : permittedDischargers.Results.Facilities.map((facility) => {
        return { ...facility, uniqueId: facility.SourceID };
      });
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

function filterViolatingFacilities(facilities: Facility[]) {
  return facilities.filter(
    (facility) =>
      facility['CWPSNCStatus'] !== null &&
      facility['CWPSNCStatus']?.toLowerCase().indexOf('effluent') !== -1,
  );
}

async function getExtentFilter(mapView: __esri.MapView | '') {
  const extent = await getGeographicExtent(mapView);
  if (!extent) return null;
  return `p_c1lat=${extent.ymin}&p_c1lon=${extent.xmin}&p_c2lat=${extent.ymax}&p_c2lon=${extent.xmax}`;
}

/*
## Constants
*/

const localFetchedDataKey = 'dischargers';
const surroundingFetchedDataKey = 'surroundingDischargers';
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
