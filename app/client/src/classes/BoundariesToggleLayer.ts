import {
  subclass,
  property,
} from '@arcgis/core/core/accessorSupport/decorators';
import GroupLayer from '@arcgis/core/layers/GroupLayer';

@subclass('esri.core.layers.BoundariesToggleLayer')
export class BoundariesToggleLayer extends GroupLayer {
  @property()
  baseLayerType: BaseLayerType;

  constructor(
    properties: __esri.GroupLayerProperties,
    baseLayerType: BaseLayerType,
  ) {
    super(properties);
    this.baseLayerType = baseLayerType;
  }
}

@subclass('esri.core.layers.AllFeaturesLayer')
export class AllFeaturesLayer extends BoundariesToggleLayer {
  constructor(properties: __esri.GroupLayerProperties) {
    super(properties, 'feature');
  }
}

@subclass('esri.core.layers.AllGraphicsLayer')
export class AllGraphicsLayer extends BoundariesToggleLayer {
  constructor(properties: __esri.GroupLayerProperties) {
    super(properties, 'graphic');
  }
}

export function getBaseLayer(layer: AllFeaturesLayer | AllGraphicsLayer) {
  return layer.findLayerById(`${layer.id}-features`);
}

export type BaseLayerType = 'feature' | 'graphic';
