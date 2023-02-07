import Color from '@arcgis/core/Color';
import Extent from '@arcgis/core/geometry/Extent';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import Polygon from '@arcgis/core/geometry/Polygon';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
// utils
import { isPolygon } from 'utils/mapFunctions';
// types
import type { ChangeEvent } from 'react';
import { LocationSearchContext } from 'contexts/locationSearch';

/*
## Hooks
*/

export function useAllFeaturesLayer(
  layerId: string,
  baseLayerBuilder: () => __esri.Layer,
) {
  const hucGraphic = useHucGraphic();
  const [baseLayer] = useState(baseLayerBuilder());
  const [surroundingMask] = useState(getSurroundingMask());

  const surroundingLayer = useMemo(() => {
    return new GraphicsLayer({
      graphics: [surroundingMask],
      id: `${layerId}-surrounding`,
      opacity: 0,
    });
  }, [layerId, surroundingMask]);

  const enclosedLayer = useMemo(() => {
    return new GraphicsLayer({
      id: `${layerId}-enclosed`,
      opacity: 1,
    });
  }, [layerId]);

  useEffect(() => {
    enclosedLayer.graphics.removeAll();
    if (hucGraphic) enclosedLayer.graphics.add(hucGraphic);
  }, [enclosedLayer, hucGraphic]);

  const maskLayer = useMemo(() => {
    return new GroupLayer({
      blendMode: 'destination-in',
      id: `${layerId}-mask`,
      layers: [surroundingLayer, enclosedLayer],
      opacity: 1,
    });
  }, [enclosedLayer, layerId, surroundingLayer]);

  const allFeaturesLayer = useMemo(() => {
    const layers = baseLayer ? [baseLayer, maskLayer] : [maskLayer];
    return new GroupLayer({
      id: layerId,
      layers,
      listMode: 'hide-children',
      title: baseLayer.title,
    });
  }, [baseLayer, layerId, maskLayer]);

  const toggleSurroundings = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => {
      surroundingLayer.opacity = ev.target.checked
        ? surroundingLayerVisibleOpacity
        : 0;
    },
    [surroundingLayer],
  );

  return { layer: allFeaturesLayer, toggleSurroundings };
}

function useHucGraphic() {
  const { hucBoundaries } = useContext(LocationSearchContext);

  const [hucGraphic, setHucGraphic] = useState(new Graphic());

  useEffect(() => {
    if (!hucBoundaries.features.length) return;
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

/*
## Constants
*/

const surroundingLayerVisibleOpacity = 0.8;
