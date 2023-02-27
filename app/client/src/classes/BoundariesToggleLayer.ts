import {
  subclass,
  property,
} from '@arcgis/core/core/accessorSupport/decorators';
import GroupLayer from '@arcgis/core/layers/GroupLayer';

@subclass('esri.core.layers.BoundariesToggleLayer')
export class BoundariesToggleLayer extends GroupLayer {
  @property({ constructOnly: true })
  baseLayerType: BaseLayerType;

  @property({ constructOnly: true })
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
  @property()
  get baseLayer(): __esri.FeatureLayer {
    return this.findLayerById(`${this.id}-features`) as __esri.FeatureLayer;
  }

  constructor(properties: __esri.GroupLayerProperties) {
    super(properties, 'feature');
  }
}

@subclass('esri.core.layers.AllGraphicsLayer')
export class AllGraphicsLayer extends BoundariesToggleLayer {
  @property()
  get baseLayer(): __esri.GraphicsLayer {
    return this.findLayerById(`${this.id}-features`) as __esri.GraphicsLayer;
  }

  constructor(properties: __esri.GroupLayerProperties) {
    super(properties, 'graphics');
  }
}

type BaseLayerType = 'feature' | 'graphics';
