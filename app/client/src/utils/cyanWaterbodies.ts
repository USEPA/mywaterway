import Color from '@arcgis/core/Color';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Graphic from '@arcgis/core/Graphic';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import MediaLayer from '@arcgis/core/layers/MediaLayer';
import Polygon from '@arcgis/core/geometry/Polygon';
import * as query from '@arcgis/core/rest/query';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
// contexts
import { useFetchedDataDispatch } from 'contexts/FetchedData';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// utils
import { useDynamicPopup } from 'utils/hooks';
import {
  filterData,
  handleFetchError,
  updateFeatureLayer,
  useBoundariesToggleLayer,
  useLocalData,
} from 'utils/boundariesToggleLayer';
import { colors } from 'styles';
// types
import type { FetchedDataAction, FetchState } from 'contexts/FetchedData';
import type { Dispatch } from 'react';
import type { CyanWaterbodyAttributes, Feature, ServicesData } from 'types';
import type { SublayerType } from 'utils/boundariesToggleLayer';

/*
## Hooks
*/

export function useCyanWaterbodies() {
  const { data, status } = useLocalData(localFetchedDataKey);

  return { cyanWaterbodies: data, cyanWaterbodiesStatus: status };
}

export function useCyanWaterbodiesLayers() {
  const { getTemplate, getTitle } = useDynamicPopup();

  // Build the base feature layer
  const buildBaseLayer = useCallback(
    (type: SublayerType) => {
      return buildLayer(type, getTitle, getTemplate);
    },
    [getTemplate, getTitle],
  );

  const updateSurroundingData = useUpdateData();

  // Build a group layer with toggleable boundaries
  const { enclosedLayer, surroundingLayer } = useBoundariesToggleLayer({
    buildBaseLayer,
    buildFeatures,
    enclosedFetchedDataKey: localFetchedDataKey,
    surroundingFetchedDataKey,
    updateLayer: updateCyanFeatureLayer,
    updateSurroundingData,
  });

  return {
    cyanLayer: enclosedLayer,
    surroundingCyanLayer: surroundingLayer,
  };
}

function useUpdateData() {
  // Build the data update function
  const { hucBoundaries, mapView } = useContext(LocationSearchContext);
  const services = useServicesContext();
  const fetchedDataDispatch = useFetchedDataDispatch();

  const [hucData, setHucData] = useState<CyanWaterbodyAttributes[] | null>([]);
  useEffect(() => {
    const controller = new AbortController();

    if (!hucBoundaries?.features?.length) {
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
      hucBoundaries.features[0].geometry,
      services.data,
      controller.signal,
    );

    fetchAndTransformData(
      fetchPromise,
      fetchedDataDispatch,
      'cyanWaterbodies',
    ).then((data) => setHucData(data));

    return function cleanup() {
      controller.abort();
    };
  }, [fetchedDataDispatch, hucBoundaries, services]);

  const extent = useRef<__esri.Polygon | null>(null);

  const updateSurroundingData = useCallback(
    async (abortSignal: AbortSignal) => {
      if (services.status !== 'success') return;

      if (!mapView) return;

      // Same extent, no update necessary
      if (mapView.extent === extent.current) return;
      extent.current = mapView.extent;

      await fetchAndTransformData(
        fetchCyanWaterbodies(
          Polygon.fromExtent(mapView.extent),
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

function buildFeatures(data: CyanWaterbodyAttributes[]) {
  return data.map((datum) => {
    return new Graphic({
      attributes: datum,
      geometry: datum.geometry,
    });
  });
}

function buildLayer(
  type: SublayerType,
  getTitle: (graphic: Feature) => string,
  getTemplate: (graphic: Feature) => HTMLDivElement | null,
) {
  const cyanWaterbodies = new FeatureLayer({
    id:
      type === 'enclosed'
        ? `${localFetchedDataKey}`
        : `${surroundingFetchedDataKey}`,
    fields: [
      { name: 'AREASQKM', type: 'double' },
      { name: 'FID', type: 'integer' },
      { name: 'GNIS_NAME', type: 'string' },
      { name: 'locationName', type: 'string' },
      {
        name: 'monitoringType',
        type: 'string',
        defaultValue: 'Blue-Green Algae',
      },
      { name: 'OBJECTID', type: 'oid' },
      { name: 'oid', type: 'integer' },
      {
        name: 'orgName',
        type: 'string',
        defaultValue: 'Cyanobacteria Assessment Network (CyAN)',
      },
    ],
    legendEnabled: false,
    objectIdField: 'OBJECTID',
    outFields: ['*'],
    spatialReference: {
      wkid: 102100,
    },
    popupTemplate: {
      title: getTitle,
      content: getTemplate,
      outFields: ['*'],
    },
    renderer: new SimpleRenderer({
      symbol: new SimpleFillSymbol({
        style: 'solid',
        color: new Color(colors.darkCyan(0.4)),
        outline: {
          color: [0, 0, 0, 0],
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
    title: `${
      type === 'surrounding' ? 'Surrounding ' : ''
    }Potential Harmful Algal Blooms (HABs)`,
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
    title: `${
      type === 'surrounding' ? 'Surrounding ' : ''
    }Potential Harmful Algal Bloom Images`,
  });

  const newCyanLayer = new GroupLayer({
    id: type === 'enclosed' ? `cyanLayer` : `surroundingCyanLayer`,
    title: `${
      type === 'surrounding' ? 'Surrounding ' : ''
    }Potential Harmful Algal Blooms (HABs)`,
    listMode: type === 'enclosed' ? 'hide-children' : 'hide',
    visible: type === 'enclosed',
  });
  newCyanLayer.add(cyanWaterbodies);
  newCyanLayer.add(cyanImages);

  return newCyanLayer;
}

async function fetchAndTransformData(
  promise: ReturnType<typeof fetchCyanWaterbodies>,
  dispatch: Dispatch<FetchedDataAction>,
  fetchedDataId: typeof localFetchedDataKey | typeof surroundingFetchedDataKey,
  dataToExclude: CyanWaterbodyAttributes[] | null = null,
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
): Promise<FetchState<__esri.FeatureSet>> {
  const url = servicesData.cyan.waterbodies;
  const queryParams = {
    outFields: ['*'],
    geometry: boundaries,
    outSpatialReference: {
      wkid: 102100,
    },
    returnGeometry: true,
  };
  try {
    const res = await query.executeQueryJSON(url, queryParams, {
      signal: abortSignal,
    });
    return { status: 'success', data: res };
  } catch (err) {
    return handleFetchError(err);
  }
}

function transformServiceData(
  serviceData: __esri.FeatureSet,
): CyanWaterbodyAttributes[] {
  return serviceData.features.map((feature) => ({
    AREASQKM: feature.attributes.AREASQKM,
    FID: feature.attributes.FID,
    GNIS_NAME: feature.attributes.GNIS_NAME,
    geometry: feature.geometry as __esri.Polygon,
    locationName: feature.attributes.GNIS_NAME,
    monitoringType: 'Blue-Green Algae',
    oid: feature.attributes.OBJECTID,
    orgName: 'Cyanobacteria Assessment Network (CyAN)',
  }));
}

async function updateCyanFeatureLayer(
  layer: __esri.GroupLayer | null,
  features?: __esri.Graphic[] | null,
) {
  if (!layer) return;

  const featureLayer = (layer.layers.find((l) => l.type === 'feature') ??
    null) as __esri.FeatureLayer | null;
  return await updateFeatureLayer(featureLayer, features);
}

/*
## Constants
*/

const localFetchedDataKey = 'cyanWaterbodies';
const surroundingFetchedDataKey = 'surroundingCyanWaterbodies';
const dataKeys = ['FID'] as Array<keyof CyanWaterbodyAttributes>;
