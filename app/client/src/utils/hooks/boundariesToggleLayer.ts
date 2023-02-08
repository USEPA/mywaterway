import Color from '@arcgis/core/Color';
import Extent from '@arcgis/core/geometry/Extent';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import Polygon from '@arcgis/core/geometry/Polygon';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
// components
import {
  AllFeaturesLayer,
  AllGraphicsLayer,
} from 'classes/BoundariesToggleLayer';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
// utils
import { isPolygon } from 'utils/mapFunctions';
// types
import type { BaseLayerType } from 'classes/BoundariesToggleLayer';

/*
## Hooks
*/

function useBoundariesToggleLayer<
  T extends __esri.FeatureLayer | __esri.GraphicsLayer,
>({
  baseLayerBuilder,
  baseLayerType,
  features,
  layerId,
  updateData,
  updateLayer,
}: UseBoundariesToggleLayerParams<T>) {
  const { mapView } = useContext(LocationSearchContext);

  const hucGraphic = useHucGraphic();
  const [baseLayer] = useState(baseLayerBuilder(`${layerId}-features`));
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
  // HUC area and the togglable surrounding area
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
    return baseLayerType === 'feature'
      ? new AllFeaturesLayer(properties)
      : new AllGraphicsLayer(properties);
  }, [baseLayer, baseLayerType, layerId, maskLayer]);

  // Manages the surrounding features visibility
  const toggleSurroundings = useCallback(
    (visible: boolean) => {
      surroundingLayer.opacity = visible ? surroundingLayerVisibleOpacity : 0;
    },
    [surroundingLayer],
  );

  // Update data when the mapView updates
  useEffect(() => {
    if (parentLayer.hasHandles(handleGroupKey)) return;

    const handle = reactiveUtils.when(
      () => mapView?.stationary === true,
      () => {
        if (mapView.scale >= minScale) {
          updateData('huc');
        } else updateData('bBox');
      },
    );

    parentLayer.addHandles(handle, handleGroupKey);

    return function cleanup() {
      parentLayer?.removeHandles(handleGroupKey);
    };
  }, [parentLayer, mapView, updateData, handleGroupKey]);

  // Resets the base layer's features and hides surrounding features
  const resetLayer = useCallback(async () => {
    if (!baseLayer) return;

    toggleSurroundings(false);
    updateLayer(baseLayer);
  }, [baseLayer, toggleSurroundings, updateLayer]);

  // Update layer features when new data is available
  useEffect(() => {
    updateLayer(baseLayer, features);
  }, [baseLayer, features, updateLayer]);

  return { layer: parentLayer, resetLayer, toggleSurroundings };
}

export function useAllFeaturesLayer(
  layerId: string,
  baseLayerBuilder: (baseLayerId: string) => __esri.FeatureLayer,
  updateData: (filterType: BoundariesFilterType) => Promise<void>,
  features: __esri.Graphic[],
) {
  return useBoundariesToggleLayer({
    baseLayerBuilder,
    baseLayerType: 'feature',
    features,
    layerId,
    updateData,
    updateLayer: updateFeatureLayer,
  });
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

async function updateFeatureLayer(
  layer: __esri.FeatureLayer | null,
  features?: __esri.Graphic[],
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

const surroundingLayerVisibleOpacity = 0.8;
const minScale = 577791;

/*
## Types
*/
export type BoundariesFilterType = 'huc' | 'bBox';

type UseBoundariesToggleLayerParams<
  T extends __esri.FeatureLayer | __esri.GraphicsLayer,
> = {
  baseLayerBuilder: (baseLayerId: string) => T;
  baseLayerType: BaseLayerType;
  features: __esri.Graphic[];
  layerId: string;
  updateData: (filterType: BoundariesFilterType) => Promise<void>;
  updateLayer: (layer: T | null, features?: __esri.Graphic[]) => Promise<void>;
};
