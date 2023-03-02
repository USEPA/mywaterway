import Graphic from '@arcgis/core/Graphic';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';
// contexts
import { useFetchedDataState } from 'contexts/FetchedData';
import { useLayersDispatch, useLayersState } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
// utils
import { useAbort } from 'utils/hooks';
import { isAbort, toFixedFloat } from 'utils/utils';
// types
import type {
  EmptyFetchState,
  FetchedData,
  FetchedDataState,
} from 'contexts/FetchedData';
import type { BoundariesToggleLayerId } from 'contexts/Layers';

/*
## Hooks
*/

export function useLocalFeatures<E extends keyof FetchedDataState>(
  localFetchedDataKey: E,
  buildFeatures: (data: FetchedData[E]) => Graphic[],
) {
  const fetchedDataState = useFetchedDataState();
  const localFetchedDataState = fetchedDataState[localFetchedDataKey];

  const [features, setFeatures] = useState<__esri.Graphic[]>([]);
  useEffect(() => {
    if (localFetchedDataState.status !== 'success') return;

    setFeatures(buildFeatures(localFetchedDataState.data));
  }, [buildFeatures, localFetchedDataState]);

  return { features, status: localFetchedDataState.status };
}

export function useAllFeaturesLayer<
  E extends keyof FetchedDataState,
  S extends keyof FetchedDataState,
>(args: UseAllFeaturesLayerParams<E, S>) {
  return useBoundariesToggleLayer({
    ...args,
    updateLayer: updateFeatureLayer,
  });
}

function useBoundariesToggleLayer<
  T extends __esri.FeatureLayer | __esri.GraphicsLayer,
  E extends keyof FetchedDataState,
  S extends keyof FetchedDataState,
>({
  buildBaseLayer,
  buildFeatures,
  enclosedFetchedDataKey,
  layerId,
  minScale = defaultMinScale,
  surroundingFetchedDataKey,
  updateSurroundingData,
  updateLayer,
}: UseBoundariesToggleLayerParams<T, E, S>) {
  const { mapView, visibleLayers, setVisibleLayers } = useContext(
    LocationSearchContext,
  );

  const [enclosedLayer] = useState(buildBaseLayer(`${layerId}-enclosed`));
  const [surroundingLayer] = useState(
    buildBaseLayer(`${layerId}-surrounding`, false),
  );

  const [handleGroupKey] = useState(uuid());

  // Group layer that contains the base layer and its masks
  const parentLayer = useMemo(() => {
    return new GroupLayer({
      id: layerId,
      layers: [enclosedLayer, surroundingLayer],
      listMode: 'hide-children',
      title: enclosedLayer.title,
    });
  }, [enclosedLayer, layerId, surroundingLayer]);

  const { boundariesTogglesDisabled, surroundingsVisible } = useLayersState();
  const layersDispatch = useLayersDispatch();

  const { getSignal, abort } = useAbort();

  // Update data when the mapView updates
  useEffect(() => {
    if (parentLayer.hasHandles(handleGroupKey)) return;

    const stationaryHandle = reactiveUtils.when(
      () => mapView?.stationary === true,
      () => {
        if (
          mapView.scale >= minScale ||
          surroundingsVisible[layerId] === false ||
          visibleLayers[layerId] === false
        ) {
          return;
        }
        layersDispatch({
          type: 'surroundingsUpdating',
          id: layerId,
          payload: true,
        });
        updateSurroundingData(getSignal()).then(() =>
          layersDispatch({
            type: 'surroundingsUpdating',
            id: layerId,
            payload: false,
          }),
        );
      },
      { initial: true },
    );

    const movingHandle = reactiveUtils.when(
      () => mapView?.stationary === false,
      () => abort(),
    );

    parentLayer.addHandles([stationaryHandle, movingHandle], handleGroupKey);

    return function cleanup() {
      parentLayer?.removeHandles(handleGroupKey);
    };
  }, [
    abort,
    getSignal,
    handleGroupKey,
    layerId,
    layersDispatch,
    mapView,
    minScale,
    parentLayer,
    surroundingsVisible,
    updateSurroundingData,
    visibleLayers,
  ]);

  // Disable the toggles when the map scale is too large
  useEffect(() => {
    const mapScaleHandle = reactiveUtils.watch(
      () => mapView?.scale,
      () => {
        if (mapView?.scale >= minScale && !boundariesTogglesDisabled[layerId]) {
          surroundingLayer.visible = false;
          layersDispatch({
            type: 'boundariesToggleDisabled',
            id: layerId,
            payload: true,
          });
        } else if (
          mapView?.scale < minScale &&
          boundariesTogglesDisabled[layerId]
        ) {
          surroundingLayer.visible = surroundingsVisible[layerId];
          layersDispatch({
            type: 'boundariesToggleDisabled',
            id: layerId,
            payload: false,
          });
        }
      },
      {
        initial: true,
      },
    );

    return function cleanup() {
      mapScaleHandle.remove();
    };
  }, [
    boundariesTogglesDisabled,
    layerId,
    layersDispatch,
    mapView,
    minScale,
    surroundingLayer,
    surroundingsVisible,
  ]);

  const fetchedDataState = useFetchedDataState();
  const enclosedFetchedDataState = fetchedDataState[enclosedFetchedDataKey];
  const surroundingFetchedDataState =
    fetchedDataState[surroundingFetchedDataKey];

  // Update layer features when new data is available
  useEffect(() => {
    if (enclosedFetchedDataState.status !== 'success') return;
    updateLayer(enclosedLayer, buildFeatures(enclosedFetchedDataState.data));
  }, [buildFeatures, enclosedFetchedDataState, enclosedLayer, updateLayer]);

  useEffect(() => {
    if (surroundingFetchedDataState.status !== 'success') return;
    updateLayer(
      surroundingLayer,
      buildFeatures(surroundingFetchedDataState.data),
    );
  }, [
    buildFeatures,
    surroundingFetchedDataState,
    surroundingLayer,
    updateLayer,
  ]);

  // Add the layer to the Layers context
  useEffect(() => {
    layersDispatch({ type: 'layer', id: layerId, payload: parentLayer });
  }, [layerId, layersDispatch, parentLayer]);

  const [initialLayerVisibility, setInitialLayerVisibility] = useState<
    boolean | null
  >(visibleLayers[layerId] ?? null);

  // Manages the surrounding features visibility
  const toggleSurroundings = useCallback(
    (showSurroundings: boolean) => {
      const layerVisible = visibleLayers[layerId] ?? null;
      return function toggle() {
        setInitialLayerVisibility(layerVisible);
        // Key doesn't exist in `visibleLayers` so
        // the layer shouldn't be toggleable
        if (layerVisible === null) return;

        if (layerVisible && !showSurroundings) {
          setVisibleLayers({
            ...visibleLayers,
            [layerId]: initialLayerVisibility,
          });
        } else if (!layerVisible && showSurroundings) {
          setVisibleLayers({ ...visibleLayers, [layerId]: true });
        }

        surroundingLayer.visible = showSurroundings;

        layersDispatch({
          type: 'surroundingsVisible',
          id: layerId,
          payload: showSurroundings,
        });
      };
    },
    [
      initialLayerVisibility,
      layerId,
      layersDispatch,
      setVisibleLayers,
      surroundingLayer,
      visibleLayers,
    ],
  );

  // Add the surroundings toggle to the Layers context
  useEffect(() => {
    layersDispatch({
      type: 'boundariesToggle',
      id: layerId,
      payload: toggleSurroundings,
    });
  }, [layerId, layersDispatch, toggleSurroundings]);

  // Keep visibility statuses in sync across tabs
  useEffect(() => {
    if (
      visibleLayers[layerId] === false &&
      surroundingsVisible[layerId] === true
    ) {
      surroundingLayer.visible = false;
      layersDispatch({
        type: 'surroundingsVisible',
        id: layerId,
        payload: false,
      });
    }
  }, [
    layerId,
    layersDispatch,
    surroundingLayer,
    surroundingsVisible,
    visibleLayers,
  ]);

  // Resets the base layer's features and hides surrounding features
  const resetLayer = useCallback(async () => {
    surroundingLayer.visible = false;
    layersDispatch({
      type: 'surroundingsVisible',
      id: layerId,
      payload: false,
    });
    updateLayer(enclosedLayer);
    updateLayer(surroundingLayer);
  }, [enclosedLayer, layersDispatch, layerId, surroundingLayer, updateLayer]);

  // Add the layer reset function to the Layers context
  useEffect(() => {
    layersDispatch({ type: 'reset', id: layerId, payload: resetLayer });
  }, [layerId, layersDispatch, resetLayer]);

  return parentLayer;
}

/*
## Utils
*/

export function getEnclosedLayer(parentLayer: __esri.GroupLayer) {
  return (
    (parentLayer.findLayerById(
      `${parentLayer.id}-enclosed`,
    ) as __esri.FeatureLayer) ?? null
  );
}

function getExtentArea(extent: __esri.Extent) {
  return (
    Math.abs(extent.xmax - extent.xmin) * Math.abs(extent.ymax - extent.ymin)
  );
}

// Gets a string representation of the view's extent as a bounding box
export function getExtentBoundingBox(
  extent: __esri.Extent | null,
  maxArea = Infinity,
  truncate = false,
) {
  if (!extent) return null;
  if (getExtentArea(extent) > maxArea) return null;

  if (truncate) {
    return `${toFixedFloat(extent.xmin, 7)},${toFixedFloat(
      extent.ymin,
      7,
    )},${toFixedFloat(extent.xmax, 7)},${toFixedFloat(extent.ymax, 7)}`;
  }
  return `${extent.xmin},${extent.ymin},${extent.xmax},${extent.ymax}`;
}

// Converts the view's extent from a Web Mercator
// projection to geographic coordinates
export async function getGeographicExtent(mapView: __esri.MapView | '') {
  if (!mapView) return null;

  await reactiveUtils.whenOnce(() => mapView.stationary);

  const extentMercator = mapView.extent;
  return webMercatorUtils.webMercatorToGeographic(
    extentMercator,
  ) as __esri.Extent;
}

export function getSurroundingLayer(parentLayer: __esri.GroupLayer) {
  return (
    (parentLayer.findLayerById(
      `${parentLayer.id}-surrounding`,
    ) as __esri.FeatureLayer) ?? null
  );
}

export function handleFetchError(err: unknown): EmptyFetchState {
  if (isAbort(err)) {
    return { status: 'pending', data: null };
  }
  console.error(err);
  return { status: 'failure', data: null };
}

function matchKeys<T>(a: T, b: T, keys: Array<keyof T>) {
  return keys.every((key) => a[key] === b[key]);
}

export function filterData<T>(
  data: T[],
  dataToExclude: T[],
  keys: Array<keyof T>,
) {
  return data.filter((datum) => {
    return !dataToExclude.find((excluded) => matchKeys(datum, excluded, keys));
  });
}

export function removeDuplicateData<T>(data: T[], keys: Array<keyof T>) {
  return data.reduce<T[]>((unique, next) => {
    if (unique.find((datum) => matchKeys(datum, next, keys))) return unique;
    return [...unique, next];
  }, []);
}

async function updateFeatureLayer(
  layer: __esri.FeatureLayer | null,
  features?: __esri.Graphic[] | null,
) {
  if (!layer) return;

  const featureSet = await layer.queryFeatures();
  const edits: {
    addFeatures?: __esri.Graphic[];
    deleteFeatures: __esri.Graphic[];
  } = {
    deleteFeatures: featureSet.features,
  };
  if (features) edits.addFeatures = features;
  layer.applyEdits(edits);
}

/*
## Constants
*/

const defaultMinScale = 577791;

/*
## Types
*/

export type BoundariesFilterType = 'huc' | 'extent';

type UseBoundariesToggleLayerParams<
  T extends __esri.FeatureLayer | __esri.GraphicsLayer,
  E extends keyof FetchedDataState,
  S extends keyof FetchedDataState,
> = {
  buildBaseLayer: (layerId: string, initialVisibility?: boolean) => T;
  buildFeatures: (data: FetchedData[E] | FetchedData[S]) => Graphic[];
  enclosedFetchedDataKey: E;
  layerId: BoundariesToggleLayerId;
  minScale?: number;
  surroundingFetchedDataKey: S;
  updateSurroundingData: (abortSignal: AbortSignal) => Promise<void>;
  updateLayer: (layer: T | null, features?: __esri.Graphic[]) => Promise<void>;
};

type UseAllFeaturesLayerParams<
  E extends keyof FetchedDataState,
  S extends keyof FetchedDataState,
> = Omit<
  UseBoundariesToggleLayerParams<__esri.FeatureLayer, E, S>,
  'updateLayer'
>;
