import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import { useCallback, useContext, useEffect } from 'react';
// contexts
import { useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
import {
  useSurroundingsDispatch,
  useSurroundingsState,
} from 'contexts/Surroundings';
// utils
import { isClick } from 'utils/utils';

export function useAllWaterbodiesLayer(minScale = 577791) {
  const { huc12, mapView } = useContext(LocationSearchContext);
  const { disabled, updating } = useSurroundingsState();
  const { allWaterbodiesLayer, updateVisibleLayers, visibleLayers } =
    useLayers();

  const surroundingsDispatch = useSurroundingsDispatch();

  // Set the minimum scale for the layer and its sublayers
  useEffect(() => {
    if (!allWaterbodiesLayer) return;
    allWaterbodiesLayer.minScale = minScale;
    allWaterbodiesLayer.layers.forEach((layer) => {
      (layer as __esri.FeatureLayer).minScale = minScale;
    });
  }, [minScale, allWaterbodiesLayer]);

  // Show the layer when a HUC is searched
  useEffect(() => {
    if (!huc12) return;
    updateVisibleLayers({ [layerId]: true });
  }, [huc12, surroundingsDispatch, updateVisibleLayers]);

  // Synchronize layer visibility in widget with actual layer visibility
  useEffect(() => {
    surroundingsDispatch({
      type: 'visible',
      id: layerId,
      payload: visibleLayers[layerId],
    });
  }, [surroundingsDispatch, visibleLayers]);

  // Mark the layer as updating, when necessary
  useEffect(() => {
    if (!allWaterbodiesLayer) return;
    const updatingHandle = reactiveUtils.watch(
      () => mapView?.navigating,
      () => {
        const isUpdating = mapView?.navigating ?? false;
        if (isUpdating === updating[layerId]) return;

        surroundingsDispatch({
          type: 'updating',
          id: layerId,
          payload: isUpdating,
        });
      },
      { initial: true },
    );

    return function cleanup() {
      updatingHandle?.remove();
    };
  }, [allWaterbodiesLayer, mapView, surroundingsDispatch, updating]);

  // Mark the layer as disabled when out of scale
  useEffect(() => {
    if (!allWaterbodiesLayer) return;
    const disabledHandle = reactiveUtils.watch(
      () => mapView?.scale,
      () => {
        if (!mapView) return;

        const isDisabled = allWaterbodiesLayer
          ? mapView.scale >= allWaterbodiesLayer.minScale
          : true;
        if (isDisabled !== disabled[layerId]) {
          surroundingsDispatch({
            type: 'disabled',
            id: layerId,
            payload: isDisabled,
          });
        }
      },
      { initial: true },
    );

    return function cleanup() {
      disabledHandle?.remove();
    };
  }, [disabled, mapView, surroundingsDispatch, allWaterbodiesLayer]);

  // Function for controlling layer visibility
  const toggleVisibility = useCallback(
    (showLayer: boolean) => {
      return function toggle(ev: React.KeyboardEvent | React.MouseEvent) {
        if (!isClick(ev)) return;
        updateVisibleLayers({ [layerId]: showLayer });
      };
    },
    [updateVisibleLayers],
  );

  useEffect(() => {
    surroundingsDispatch({
      type: 'togglers',
      id: layerId,
      payload: toggleVisibility,
    });
  }, [surroundingsDispatch, toggleVisibility]);
}

const layerId = 'allWaterbodiesLayer';
