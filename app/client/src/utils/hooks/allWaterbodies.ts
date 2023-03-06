import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import { useCallback, useContext, useEffect } from 'react';
// contexts
import { useLayersDispatch, useLayersState } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';

export function useAllWaterbodiesLayer(
  initialVisible = false,
  minScale = 577791,
) {
  const { mapView } = useContext(LocationSearchContext);

  const layersDispatch = useLayersDispatch();
  const {
    boundariesTogglesDisabled,
    layers,
    surroundingsUpdating,
    surroundingsVisible,
  } = useLayersState();
  const { waterbodyLayer } = layers;

  // Set the minimum scale for the layer and its sublayers
  useEffect(() => {
    if (!waterbodyLayer) return;
    waterbodyLayer.minScale = minScale;
    waterbodyLayer.layers.forEach((layer) => {
      (layer as __esri.FeatureLayer).minScale = minScale;
    });
  }, [minScale, waterbodyLayer]);

  // Externally control initial layer visibility
  useEffect(() => {
    if (!waterbodyLayer) return;

    layersDispatch({
      type: 'surroundingsVisible',
      id: layerId,
      payload: initialVisible,
    });
    waterbodyLayer.visible = initialVisible;
  }, [initialVisible, layersDispatch, waterbodyLayer]);

  // Mark the layer as updating, when necessary
  useEffect(() => {
    const updatingHandle = reactiveUtils.watch(
      () => mapView?.updating,
      () => {
        const updating = mapView?.updating ?? false;
        if (
          boundariesTogglesDisabled[layerId] ||
          !surroundingsVisible[layerId] ||
          updating === surroundingsUpdating[layerId]
        ) {
          return;
        }

        layersDispatch({
          type: 'surroundingsUpdating',
          id: layerId,
          payload: mapView?.updating ?? false,
        });
      },
    );

    return function cleanup() {
      updatingHandle.remove();
    };
  }, [
    boundariesTogglesDisabled,
    layersDispatch,
    mapView,
    surroundingsUpdating,
    surroundingsVisible,
  ]);

  // Mark the layer as disabled when out of scale
  useEffect(() => {
    const disabledHandle = reactiveUtils.watch(
      () => mapView?.scale,
      () => {
        if (!mapView) return;

        const disabled = waterbodyLayer
          ? mapView.scale >= waterbodyLayer.minScale
          : true;
        if (disabled !== boundariesTogglesDisabled[layerId]) {
          layersDispatch({
            type: 'boundariesToggleDisabled',
            id: layerId,
            payload: waterbodyLayer
              ? mapView.scale >= waterbodyLayer.minScale
              : true,
          });
        }
      },
    );

    return function cleanup() {
      disabledHandle.remove();
    };
  }, [boundariesTogglesDisabled, layersDispatch, mapView, waterbodyLayer]);

  // Function for controlling layer visibility
  const toggleVisibility = useCallback(
    (showLayer: boolean) => {
      return function toggle() {
        if (!waterbodyLayer) return;
        waterbodyLayer.visible = showLayer;
        layersDispatch({
          type: 'surroundingsVisible',
          id: layerId,
          payload: showLayer,
        });
      };
    },
    [layersDispatch, waterbodyLayer],
  );

  useEffect(() => {
    layersDispatch({
      type: 'boundariesToggle',
      id: layerId,
      payload: toggleVisibility,
    });
  }, [layersDispatch, toggleVisibility]);
}

const layerId = 'waterbodyLayer';
