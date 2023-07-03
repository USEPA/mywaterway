import Color from '@arcgis/core/Color';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Graphic from '@arcgis/core/Graphic';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import MediaLayer from '@arcgis/core/layers/MediaLayer';
import Polygon from '@arcgis/core/geometry/Polygon';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// contexts
import {
  useFetchedDataDispatch,
  useFetchedDataState,
} from 'contexts/FetchedData';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// utils
import { fetchCheck, fetchPostForm } from 'utils/fetchUtils';
import {
  filterData,
  handleFetchError,
} from 'utils/hooks/boundariesToggleLayer';
import { getPopupContent, getPopupTitle } from 'utils/mapFunctions';
// types
import type { FetchedDataAction, FetchState } from 'contexts/FetchedData';
import type { Dispatch } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type {
  CyanWaterbodyAttributes,
  CyanWaterbodiesData,
  ServicesData,
  ServicesState,
} from 'types';
import type { SublayerType } from 'utils/hooks/boundariesToggleLayer';
// styles
import { colors } from 'styles';

/*
## Hooks
*/

export function useCyanWaterbodiesLayers() {
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
}

function useUpdateData() {
  // Build the data update function
  const { hucBoundaries, mapView } = useContext(LocationSearchContext);
  const services = useServicesContext();
  const fetchedDataDispatch = useFetchedDataDispatch();

  const [hucData, setHucData] = useState<CyanWaterbodyAttributes[] | null>([]);
  useEffect(() => {
    const controller = new AbortController();

    if (!hucBoundaries) {
      setHucData([]);
      fetchedDataDispatch({
        type: 'success',
        id: localFetchedDataKey,
        payload: [],
      });
      return;
    }

    if (services.status !== 'success') return;

    const fetchPromise = fetchCyanWaterbodies(
      hucBoundaries,
      services.data,
      controller.signal,
    );
  }, []);
}

/*
## Utils
*/

function buildLayer(
  navigate: NavigateFunction,
  services: ServicesState,
  type: SublayerType,
) {
  const cyanWaterbodies = new FeatureLayer({
    id:
      type === 'enclosed'
        ? `${localFetchedDataKey}`
        : `${surroundingFetchedDataKey}`,
    fields: [
      { name: 'AREASQKM', type: 'double' },
      { name: 'FDATE', type: 'string' },
      { name: 'FID', type: 'integer' },
      { name: 'GNIS_ID', type: 'string' },
      { name: 'GNIS_NAME', type: 'string' },
      { name: 'c_lat', type: 'double' },
      { name: 'c_lng', type: 'double' },
      { name: 'ELEVATION', type: 'double' },
      { name: 'locationName', type: 'string' },
      { name: 'monitoringType', type: 'string', defaultValue: 'CyAN' },
      { name: 'OBJECTID', type: 'oid' },
      { name: 'oid', type: 'integer' },
      {
        name: 'orgName',
        type: 'string',
        defaultValue: 'Cyanobacteria Assessment Network (CyAN)',
      },
      { name: 'PERMANENT_', type: 'string' },
      { name: 'RESOLUTION', type: 'integer' },
      { name: 'x_max', type: 'double' },
      { name: 'x_min', type: 'double' },
      { name: 'y_max', type: 'double' },
      { name: 'y_min', type: 'double' },
    ],
    legendEnabled: false,
    objectIdField: 'OBJECTID',
    outFields: ['*'],
    spatialReference: {
      wkid: 102100,
    },
    popupTemplate: {
      title: (feature: __esri.Feature) =>
        getPopupTitle(feature.graphic.attributes),
      content: (feature: __esri.Feature) =>
        getPopupContent({ feature: feature.graphic, navigate, services }),
      outFields: ['*'],
    },
    renderer: new SimpleRenderer({
      symbol: new SimpleFillSymbol({
        style: 'solid',
        color: new Color([108, 149, 206, 0.4]),
        outline: {
          color: colors.black(type === 'enclosed' ? 1.0 : 0.5),
          width: 0.75,
          style: 'solid',
        },
      }),
    }),
    // NOTE: initial graphic below will be replaced
    source: [
      new Graphic({
        geometry: new Polygon(),
        attributes: { OBJECTID: 1 },
      }),
    ],
    title: `${type === 'surrounding' ? 'Surrounding ' : ''}CyAN Waterbodies`,
  });

  const cyanImages = new MediaLayer({
    blendMode: 'color-burn',
    copyright: 'CyAN, EPA',
    effect: 'saturate(150%) contrast(150%)',
    id: type === 'enclosed' ? `cyanImages` : `surroundingCyanImages`,
    opacity: 1,
    spatialReference: {
      wkid: 102100,
    },
    title: `${type === 'surrounding' ? 'Surrounding ' : ''}CyAN Images`,
  });

  const newCyanLayer = new GroupLayer({
    id: type === 'enclosed' ? `cyanLayer` : `surroundingCyanLayer`,
    title: `${type === 'surrounding' ? 'Surrounding ' : ''}CyAN Waterbodies`,
    listMode: type === 'enclosed' ? 'hide-children' : 'hide',
    visible: type === 'enclosed',
  });
  newCyanLayer.add(cyanWaterbodies);
  newCyanLayer.add(cyanImages);
}

async function fetchAndTransformData(
  promise: ReturnType<typeof fetchCyanWaterbodies>,
  dispatch: Dispatch<FetchedDataAction>,
  fetchedDataId: typeof localFetchedDataKey | typeof surroundingFetchedDataKey,
  dataToExclude?: CyanWaterbodyAttributes[] | null,
) {
  dispatch({ type: 'pending', id: fetchedDataId });

  const response = await promise;
  if (response.status === 'success') {
    const transformedData = transformServiceData(response.data) ?? [];

    const payload = dataToExclude
      ? filterData(transformedData, dataToExclude, dataKeys)
      : transformedData;

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

async function fetchCyanWaterbodies(
  boundaries: __esri.Polygon,
  servicesData: ServicesData,
  abortSignal: AbortSignal,
): Promise<FetchState<CyanWaterbodiesData>> {
  const url = servicesData.cyan.waterbodies + '/query';
  const data = {
    outFields: '*',
    geometry: {
      rings: boundaries.rings,
    },
    geometryType: 'esriGeometryPolygon',
    f: 'json',
    spatialRel: 'esriSpatialRelIntersects',
  };
  try {
    const res = await fetchPostForm(url, data, abortSignal);
    return { status: 'success', data: res };
  } catch (err) {
    return handleFetchError(err);
  }
}

function transformServiceData(
  serviceData: CyanWaterbodiesData,
): CyanWaterbodyAttributes[] {
  return serviceData.features.map((feature) => ({
    AREASQKM: feature.attributes.AREASQKM,
    FID: feature.attributes.FID,
    GNIS_NAME: feature.attributes.GNIS_NAME,
    geometry: feature.geometry,
    locationName: feature.attributes.GNIS_NAME,
    monitoringType: 'CyAN',
    oid: feature.attributes.OBJECTID,
    orgName: 'Cyanobacteria Assessment Network (CyAN)',
  }));
}

/*
## Constants
*/

const localFetchedDataKey = 'cyanWaterbodies';
const surroundingFetchedDataKey = 'surroundingCyanWaterbodies';
const dataKeys = ['FID'] as Array<keyof CyanWaterbodyAttributes>;
