import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import { useCallback, useContext, useEffect } from 'react';
// contexts
import { useLayersState } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
import {
  useSurroundingsDispatch,
  useSurroundingsState,
} from 'contexts/Surroundings';

export function useAllWaterbodiesLayer(
  initialVisible = false,
  minScale = 577791,
) {
  const { mapView } = useContext(LocationSearchContext);
  const { disabled, updating } = useSurroundingsState();
  const { allWaterbodiesLayer } = useLayersState();

  const surroundingsDispatch = useSurroundingsDispatch();

  // Set the minimum scale for the layer and its sublayers
  useEffect(() => {
    if (!allWaterbodiesLayer) return;
    allWaterbodiesLayer.minScale = minScale;
    allWaterbodiesLayer.layers.forEach((layer) => {
      (layer as __esri.FeatureLayer).minScale = minScale;
    });
  }, [minScale, allWaterbodiesLayer]);

  // Externally control initial layer visibility
  useEffect(() => {
    if (!allWaterbodiesLayer) return;

    surroundingsDispatch({
      type: 'visible',
      id: layerId,
      payload: initialVisible,
    });
    allWaterbodiesLayer.visible = initialVisible;
  }, [initialVisible, surroundingsDispatch, allWaterbodiesLayer]);

  // Mark the layer as updating, when necessary
  useEffect(() => {
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
      updatingHandle.remove();
    };
  }, [mapView, surroundingsDispatch, updating]);

  // Mark the layer as disabled when out of scale
  useEffect(() => {
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
            payload: allWaterbodiesLayer
              ? mapView.scale >= allWaterbodiesLayer.minScale
              : true,
          });
        }
      },
    );

    return function cleanup() {
      disabledHandle.remove();
    };
  }, [disabled, mapView, surroundingsDispatch, allWaterbodiesLayer]);

  // Function for controlling layer visibility
  const toggleVisibility = useCallback(
    (showLayer: boolean) => {
      return function toggle() {
        if (!allWaterbodiesLayer) return;
        allWaterbodiesLayer.visible = showLayer;
        surroundingsDispatch({
          type: 'visible',
          id: layerId,
          payload: showLayer,
        });
      };
    },
    [surroundingsDispatch, allWaterbodiesLayer],
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
