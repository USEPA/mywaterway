import Graphic from '@arcgis/core/Graphic';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { v4 as uuid } from 'uuid';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';
// contexts
import {
  useFetchedDataDispatch,
  useFetchedDataState,
} from 'contexts/FetchedData';
import { useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
import {
  useSurroundingsDispatch,
  useSurroundingsState,
} from 'contexts/Surroundings';
// utils
import { useAbort } from 'utils/hooks';
import { isAbort, isClick, toFixedFloat } from 'utils/utils';
// types
import type { MutableRefObject } from 'react';
import type {
  EmptyFetchState,
  FetchedData,
  FetchedDataState,
} from 'contexts/FetchedData';
import type { LayerId } from 'contexts/Layers';
import type { SurroundingFeaturesLayerId } from 'contexts/Surroundings';

/*
## Hooks
*/

export function useLocalData<E extends keyof FetchedDataState>(
  localFetchedDataKey: E,
) {
  const fetchedDataState = useFetchedDataState();
  const localFetchedDataState = fetchedDataState[localFetchedDataKey];

  const localData = useMemo(() => {
    const status = localFetchedDataState.status;
    const data = status === 'success' ? localFetchedDataState.data : [];
    return { data, status };
  }, [localFetchedDataState]);

  return localData;
}

export function useAllFeaturesLayers<
  E extends keyof FetchedDataState,
  S extends keyof FetchedDataState,
>(args: UseAllFeaturesLayersParams<E, S>) {
  return useBoundariesToggleLayer({
    ...args,
    updateLayer: updateFeatureLayer,
  });
}

export function useBoundariesToggleLayer<
  T extends __esri.FeatureLayer | __esri.GraphicsLayer | __esri.GroupLayer,
  E extends keyof FetchedDataState,
  S extends keyof FetchedDataState,
>({
  buildBaseLayer,
  buildFeatures,
  enclosedFetchedDataKey,
  minScale = defaultMinScale,
  surroundingFetchedDataKey,
  updateSurroundingData,
  updateLayer,
}: UseBoundariesToggleLayerParams<T, E, S>) {
  const { mapView } = useContext(LocationSearchContext);

  const [enclosedLayer] = useState(buildBaseLayer('enclosed'));
  const [surroundingLayer] = useState(buildBaseLayer('surrounding'));
  const enclosedLayerId = enclosedLayer.id as LayerId;
  const surroundingLayerId = surroundingLayer.id as SurroundingFeaturesLayerId;

  const [handleGroupKey] = useState(uuid());

  const { disabled, visible } = useSurroundingsState();
  const surroundingsDispatch = useSurroundingsDispatch();
  const { setLayer, updateVisibleLayers } = useLayers();

  const { getSignal, abort } = useAbort();

  const surroundingsDisabled = disabled[surroundingLayerId];
  const surroundingsVisible = visible[surroundingLayerId];

  // Update data when the mapView updates
  useEffect(() => {
    if (surroundingLayer.hasHandles(handleGroupKey)) return;

    const stationaryHandle = reactiveUtils.when(
      () => mapView?.stationary === true,
      () => {
        if (surroundingsDisabled || !surroundingsVisible) {
          return;
        }

        surroundingsDispatch({
          type: 'updating',
          id: surroundingLayerId,
          payload: true,
        });
        updateSurroundingData(getSignal()).finally(() =>
          surroundingsDispatch({
            type: 'updating',
            id: surroundingLayerId,
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

    surroundingLayer.addHandles(
      [stationaryHandle, movingHandle],
      handleGroupKey,
    );

    return function cleanup() {
      surroundingLayer?.removeHandles(handleGroupKey);
    };
  }, [
    abort,
    getSignal,
    handleGroupKey,
    mapView,
    minScale,
    surroundingsDisabled,
    surroundingsDispatch,
    surroundingLayer,
    surroundingLayerId,
    surroundingsVisible,
    updateSurroundingData,
  ]);

  // Disable the toggles when the map scale is too large
  useEffect(() => {
    const mapScaleHandle = reactiveUtils.watch(
      () => mapView?.scale,
      () => {
        if (mapView?.scale >= minScale && !surroundingsDisabled) {
          updateVisibleLayers({ [surroundingLayerId]: false });
          surroundingsDispatch({
            type: 'disabled',
            id: surroundingLayerId,
            payload: true,
          });
        } else if (mapView?.scale < minScale && surroundingsDisabled) {
          updateVisibleLayers({ [surroundingLayerId]: surroundingsVisible });
          surroundingsDispatch({
            type: 'disabled',
            id: surroundingLayerId,
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
    mapView,
    minScale,
    surroundingLayer,
    surroundingLayerId,
    surroundingsDisabled,
    surroundingsDispatch,
    surroundingsVisible,
    updateVisibleLayers,
  ]);

  const fetchedDataState = useFetchedDataState();
  const enclosedFetchedDataState = fetchedDataState[enclosedFetchedDataKey];
  const surroundingFetchedDataState =
    fetchedDataState[surroundingFetchedDataKey];

  const enclosedUpdating = useRef(false);
  const enclosedQueue = useRef<UpdateQueue>([]);

  // Update layer features when new data is available
  useEffect(() => {
    if (!mapView || enclosedFetchedDataState.status !== 'success') return;
    updateLayer(
      enclosedLayer,
      mapView,
      buildFeatures(enclosedFetchedDataState.data),
      enclosedUpdating,
      enclosedQueue.current,
    );
  }, [
    buildFeatures,
    enclosedFetchedDataState,
    enclosedLayer,
    mapView,
    updateLayer,
  ]);

  const surroundingUpdating = useRef(false);
  const surroundingQueue = useRef<UpdateQueue>([]);

  useEffect(() => {
    if (!mapView || surroundingFetchedDataState.status !== 'success') return;
    updateLayer(
      surroundingLayer,
      mapView,
      buildFeatures(surroundingFetchedDataState.data),
      surroundingUpdating,
      surroundingQueue.current,
    );
  }, [
    buildFeatures,
    mapView,
    surroundingFetchedDataState,
    surroundingLayer,
    updateLayer,
  ]);

  // Add the layers to the Layers context
  useEffect(() => {
    setLayer(surroundingLayerId as LayerId, surroundingLayer);
  }, [setLayer, surroundingLayer, surroundingLayerId]);

  useEffect(() => {
    setLayer(enclosedLayerId, enclosedLayer);
  }, [enclosedLayer, enclosedLayerId, setLayer]);

  // Manages the surrounding features visibility
  const toggleSurroundings = useCallback(
    (showSurroundings: boolean) => {
      return function toggle(ev: React.KeyboardEvent | React.MouseEvent) {
        if (!isClick(ev)) return;
        updateVisibleLayers({ [surroundingLayerId]: showSurroundings });

        surroundingsDispatch({
          type: 'visible',
          id: surroundingLayerId,
          payload: showSurroundings,
        });
      };
    },
    [surroundingLayerId, surroundingsDispatch, updateVisibleLayers],
  );

  // Add the surroundings toggle to the Layers context
  useEffect(() => {
    surroundingsDispatch({
      type: 'togglers',
      id: surroundingLayer.id as SurroundingFeaturesLayerId,
      payload: toggleSurroundings,
    });
  }, [surroundingLayer, surroundingsDispatch, toggleSurroundings]);

  const fetchedDataDispatch = useFetchedDataDispatch();

  // Clean up the layer state and fetched data state when finished
  useEffect(() => {
    return function cleanup() {
      setLayer(surroundingLayerId, null);
      setLayer(enclosedLayerId, null);
      surroundingsDispatch({ type: 'reset', id: surroundingLayerId });
      fetchedDataDispatch({ type: 'pending', id: enclosedFetchedDataKey });
      fetchedDataDispatch({ type: 'pending', id: surroundingFetchedDataKey });
    };
  }, [
    enclosedFetchedDataKey,
    enclosedLayerId,
    fetchedDataDispatch,
    setLayer,
    surroundingFetchedDataKey,
    surroundingLayerId,
    surroundingsDispatch,
  ]);

  return { enclosedLayer, surroundingLayer };
}

/*
## Utils
*/

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

// Wrapper around a promise to capture the resolve/reject function.
function createDeferred<T>() {
  let resolve: null | ((value: T | PromiseLike<T>) => void) = null;
  let reject: null | ((reason?: any) => void) = null;

  const promise = new Promise<T>((success, error) => {
    resolve = success;
    reject = error;
  });

  return { promise, resolve: resolve!, reject: reject! };
}

export async function updateFeatureLayer(
  layer: __esri.FeatureLayer,
  mapView: __esri.MapView,
  features: __esri.Graphic[],
  lock: MutableRefObject<boolean>,
  queue: UpdateQueue,
) {
  if (lock.current) {
    const deferred = createDeferred<__esri.EditsResult>();
    queue.push([deferred, features]);
    return deferred.promise;
  }

  lock.current = true;
  const featureSet = await layer.queryFeatures();
  const editResults = await layer.applyEdits({
    addFeatures: features,
    deleteFeatures: featureSet.features,
  });
  const layerView = await mapView.whenLayerView(layer);
  await reactiveUtils.whenOnce(() => !layerView.updating);
  lock.current = false;

  const next = queue.shift();
  if (next) {
    const [deferred, nextFeatures] = next;
    const nextEditResults = await updateFeatureLayer(
      layer,
      mapView,
      nextFeatures,
      lock,
      queue,
    );
    deferred.resolve(nextEditResults);
  }

  return editResults;
}

/*
## Constants
*/

const defaultMinScale = 577791;

/*
## Types
*/
type Deferred<T> = ReturnType<typeof createDeferred<T>>;

export type SublayerType = 'enclosed' | 'surrounding';

export type UpdateQueue = Array<
  [Deferred<__esri.EditsResult>, __esri.Graphic[]]
>;

type UseBoundariesToggleLayerParams<
  T extends __esri.FeatureLayer | __esri.GraphicsLayer | __esri.GroupLayer,
  E extends keyof FetchedDataState,
  S extends keyof FetchedDataState,
> = {
  buildBaseLayer: (type: SublayerType) => T;
  buildFeatures: (data: FetchedData[E] | FetchedData[S]) => Graphic[];
  enclosedFetchedDataKey: E;
  minScale?: number;
  surroundingFetchedDataKey: S;
  updateSurroundingData: (abortSignal: AbortSignal) => Promise<void>;
  updateLayer: (
    layer: T,
    mapView: __esri.MapView,
    features: __esri.Graphic[],
    lock: MutableRefObject<boolean>,
    queue: UpdateQueue,
  ) => Promise<__esri.EditsResult | void>;
};

type UseAllFeaturesLayersParams<
  E extends keyof FetchedDataState,
  S extends keyof FetchedDataState,
> = Omit<
  UseBoundariesToggleLayerParams<__esri.FeatureLayer, E, S>,
  'updateLayer'
>;
