import GroupLayer from '@arcgis/core/layers/GroupLayer';

export class BoundariesToggleLayer extends GroupLayer {
  baseLayerType: BaseLayerType;

  constructor(
    properties: __esri.GroupLayerProperties,
    baseLayerType: BaseLayerType,
  ) {
    super(properties);
    this.baseLayerType = baseLayerType;
  }
}

export class AllFeaturesLayer extends BoundariesToggleLayer {
  constructor(properties: __esri.GroupLayerProperties) {
    super(properties, 'feature');
  }
}

export class AllGraphicsLayer extends BoundariesToggleLayer {
  constructor(properties: __esri.GroupLayerProperties) {
    super(properties, 'graphic');
  }
}

export type BaseLayerType = 'feature' | 'graphic';
