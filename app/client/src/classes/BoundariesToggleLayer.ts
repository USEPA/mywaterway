import {
  subclass,
  property,
} from '@arcgis/core/core/accessorSupport/decorators';
import GroupLayer from '@arcgis/core/layers/GroupLayer';

@subclass('esri.core.layers.BoundariesToggleLayer')
export class BoundariesToggleLayer extends GroupLayer {
  @property()
  baseLayerType: BaseLayerType;

  @property()
  resetHidesSurroundings: boolean;

  constructor(
    properties: __esri.GroupLayerProperties,
    baseLayerType: BaseLayerType,
    resetHidesSurroundings?: boolean,
  ) {
    super(properties);
    this.baseLayerType = baseLayerType;
    this.resetHidesSurroundings = resetHidesSurroundings ?? false;
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
    super(properties, 'graphics');
  }
}

export function getBaseLayer(layer: AllFeaturesLayer | AllGraphicsLayer) {
  return layer.findLayerById(`${layer.id}-features`);
}

type BaseLayerType = 'feature' | 'graphics';
