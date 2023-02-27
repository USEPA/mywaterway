import Color from '@arcgis/core/Color';
import Extent from '@arcgis/core/geometry/Extent';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import Polygon from '@arcgis/core/geometry/Polygon';
import Query from '@arcgis/core/rest/support/Query';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';
// components
import {
  AllFeaturesLayer,
  AllGraphicsLayer,
} from 'classes/BoundariesToggleLayer';
// contexts
import { useLayersDispatch, useLayersState } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
// utils
import { useAbort } from 'utils/hooks';
import { isFeatureLayer, isPolygon } from 'utils/mapFunctions';
import { isAbort, toFixedFloat } from 'utils/utils';
// types
import type { EmptyFetchState, FetchStatus } from 'contexts/FetchedData';
import type { BoundariesToggleLayerId } from 'contexts/Layers';

/*
## Hooks
*/

export function useLocalFeatures<A>(
  layer: AllFeaturesLayer | null,
  status: FetchStatus,
  filter?: (attributes: A) => boolean,
) {
  const { huc12, hucBoundaries, mapView } = useContext(LocationSearchContext);

  const [localFeatures, setLocalFeatures] = useState<__esri.Graphic[]>([]);
  const [localStatus, setLocalStatus] = useState<FetchStatus>('pending');

  const getLocalFeatures = useCallback(
    async (signal: AbortSignal) => {
      if (!layer) return;

      const hucPolygon = hucBoundaries?.features?.[0]?.geometry;
      if (!hucPolygon) return;

      const query = new Query({
        geometry: hucPolygon,
        outFields: ['*'],
        returnGeometry: true,
      });

      const featureSet = await layer.baseLayer.queryFeatures(query, { signal });
      setLocalFeatures(
        filter
          ? featureSet.features.filter((feature) => {
              return filter(feature.attributes);
            })
          : featureSet.features,
      );
      setLocalStatus('success');
    },
    [filter, hucBoundaries, layer],
  );

  // Mark local data for updates when HUC changes
  useEffect(() => {
    if (localStatus === 'success') return;
    if (status !== 'success') {
      if (status === 'failure') setLocalStatus(status);
      return;
    }

    const controller = new AbortController();

    reactiveUtils
      .whenOnce(() => !mapView.updating)
      .then(() => getLocalFeatures(controller.signal))
      .catch((err) => {
        if (isAbort(err)) return;
        console.error(err);
      });

    return function cleanup() {
      controller.abort();
    };
  }, [getLocalFeatures, mapView, localStatus, status]);

  useEffect(() => {
    if (huc12) return;

    setLocalStatus('pending');
  }, [huc12]);

  return {
    features: localFeatures,
    status: localStatus,
  };
}

export function useAllFeaturesLayer(args: UseAllFeaturesLayerParams) {
  return useBoundariesToggleLayer({ ...args, updateLayer: updateFeatureLayer });
}

function useBoundariesToggleLayer<
  T extends __esri.FeatureLayer | __esri.GraphicsLayer,
>({
  buildBaseLayer,
  features,
  layerId,
  updateData,
  updateLayer,
}: UseBoundariesToggleLayerParams<T>) {
  const { mapView, visibleLayers, setVisibleLayers } = useContext(
    LocationSearchContext,
  );

  const hucGraphic = useHucGraphic();
  const [baseLayer] = useState(buildBaseLayer(`${layerId}-features`));
  const [surroundingMask] = useState(getSurroundingMask());
  const [handleGroupKey] = useState(uuid());

  // Component layer that manages visibility of surrounding features
  const surroundingLayer = useMemo(() => {
    return new GraphicsLayer({
      graphics: [surroundingMask],
      id: `${layerId}-surrounding`,
      opacity: 0,
    });
  }, [layerId, surroundingMask]);

  // Component layer that ensures features within HUC remain visible
  const enclosedLayer = useMemo(() => {
    return new GraphicsLayer({
      id: `${layerId}-enclosed`,
      opacity: 1,
    });
  }, [layerId]);

  // Add the graphic that enables constant visibility within the HUC
  useEffect(() => {
    enclosedLayer.graphics.removeAll();
    if (hucGraphic) enclosedLayer.graphics.add(hucGraphic);
  }, [enclosedLayer, hucGraphic]);

  // Component layer that manages the always visible
  // HUC area and the toggleable surrounding area
  const maskLayer = useMemo(() => {
    return new GroupLayer({
      blendMode: 'destination-in',
      id: `${layerId}-mask`,
      layers: [surroundingLayer, enclosedLayer],
      opacity: 1,
    });
  }, [enclosedLayer, layerId, surroundingLayer]);

  // Group layer that contains the base layer and its masks
  const parentLayer = useMemo(() => {
    const layers = baseLayer ? [baseLayer, maskLayer] : [maskLayer];
    const properties: __esri.GroupLayerProperties = {
      id: layerId,
      layers,
      listMode: 'hide-children',
      title: baseLayer.title,
    };
    return isFeatureLayer(baseLayer)
      ? new AllFeaturesLayer(properties)
      : new AllGraphicsLayer(properties);
  }, [baseLayer, layerId, maskLayer]);

  const {
    boundariesTogglesDisabled,
    surroundingsVisibilities: surroundingsVisible,
  } = useLayersState();

  const { getSignal, abort } = useAbort();

  // Update data when the mapView updates
  useEffect(() => {
    if (parentLayer.hasHandles(handleGroupKey)) return;

    const stationaryHandle = reactiveUtils.when(
      () => mapView?.stationary === true,
      () => {
        if (mapView.scale >= minScale) {
          return updateData(getSignal(), true);
        } else if (
          surroundingsVisible[layerId] === false ||
          visibleLayers[layerId] === false
        ) {
          return;
        }
        updateData(getSignal());
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
    layerId,
    handleGroupKey,
    mapView,
    parentLayer,
    surroundingsVisible,
    updateData,
    visibleLayers,
  ]);

  const layersDispatch = useLayersDispatch();

  // Disable the toggles when the map scale is too large
  useEffect(() => {
    const mapScaleHandle = reactiveUtils.watch(
      () => mapView?.scale,
      () => {
        if (mapView?.scale >= minScale && !boundariesTogglesDisabled[layerId]) {
          layersDispatch({
            type: 'boundariesToggleDisabled',
            id: layerId,
            payload: true,
          });
        } else if (
          mapView?.scale < minScale &&
          boundariesTogglesDisabled[layerId]
        ) {
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
  }, [boundariesTogglesDisabled, layerId, layersDispatch, mapView]);

  // Update layer features when new data is available
  useEffect(() => {
    updateLayer(baseLayer, features);
  }, [baseLayer, features, updateLayer]);

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

        surroundingLayer.opacity = showSurroundings
          ? surroundingsVisibleOpacity
          : surroundingsHiddenOpacity;

        layersDispatch({
          type: 'surroundingsVibility',
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

  // Resets the base layer's features and hides surrounding features
  const resetLayer = useCallback(async () => {
    if (!baseLayer) return;

    if (parentLayer.resetHidesSurroundings) {
      surroundingLayer.opacity = surroundingsHiddenOpacity;
      layersDispatch({
        type: 'surroundingsVibility',
        id: layerId,
        payload: false,
      });
    }
    updateLayer(baseLayer);
  }, [
    baseLayer,
    layersDispatch,
    layerId,
    parentLayer,
    surroundingLayer,
    updateLayer,
  ]);

  // Add the layer reset function to the Layers context
  useEffect(() => {
    layersDispatch({ type: 'reset', id: layerId, payload: resetLayer });
  }, [layerId, layersDispatch, resetLayer]);

  return parentLayer;
}

function useHucGraphic() {
  const { hucBoundaries } = useContext(LocationSearchContext);

  const [hucGraphic, setHucGraphic] = useState(new Graphic());

  useEffect(() => {
    if (!hucBoundaries?.features?.length) return;
    const geometry = hucBoundaries.features[0].geometry;
    if (!isPolygon(geometry)) return;

    setHucGraphic(
      new Graphic({
        geometry: new Polygon({
          spatialReference: hucBoundaries.spatialReference,
          rings: geometry.rings,
        }),
        symbol: new SimpleFillSymbol({
          color: new Color({ r: 255, g: 255, b: 255, a: 1 }),
        }),
      }),
    );
  }, [hucBoundaries]);

  return hucGraphic;
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

function getSurroundingMask() {
  return new Graphic({
    geometry: new Extent({
      xmin: -180,
      xmax: 180,
      ymin: -90,
      ymax: 90,
    }),
    symbol: new SimpleFillSymbol({
      color: new Color('rgba(0, 0, 0, 1)'),
    }),
  });
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

export function removeDuplicateData<T>(attributes: T[], keys: Array<keyof T>) {
  return attributes.reduce<T[]>((unique, next) => {
    if (unique.find((attribute) => matchKeys(attribute, next, keys)))
      return unique;
    return [...unique, next];
  }, []);
}

async function updateFeatureLayer(
  layer: __esri.FeatureLayer | null,
  features?: __esri.Graphic[] | null,
) {
  if (!layer) return;

  const featureSet = await layer?.queryFeatures();
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

const surroundingsHiddenOpacity = 0;
const surroundingsVisibleOpacity = 0.8;
const minScale = 577791;

/*
## Types
*/

export type BoundariesFilterType = 'huc' | 'extent';

type UseBoundariesToggleLayerParams<
  T extends __esri.FeatureLayer | __esri.GraphicsLayer,
> = {
  buildBaseLayer: (baseLayerId: string) => T;
  features: __esri.Graphic[];
  layerId: BoundariesToggleLayerId;
  updateData: (abortSignal: AbortSignal, hucOnly?: boolean) => Promise<void>;
  updateLayer: (layer: T | null, features?: __esri.Graphic[]) => Promise<void>;
};

type UseAllFeaturesLayerParams = Omit<
  UseBoundariesToggleLayerParams<__esri.FeatureLayer>,
  'updateLayer'
>;
