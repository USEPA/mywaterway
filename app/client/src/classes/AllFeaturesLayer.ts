import Collection from '@arcgis/core/core/Collection';
import Color from '@arcgis/core/Color';
import {
  aliasOf,
  subclass,
  property,
} from '@arcgis/core/core/accessorSupport/decorators';
import Extent from '@arcgis/core/geometry/Extent';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import Polygon from '@arcgis/core/geometry/Polygon';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';

@subclass('esri.core.layers.AllFeaturesLayer')
export default class AllFeaturesLayer extends GroupLayer {
  constructor(
    properties: __esri.FeatureLayerProperties,
    boundaries?: __esri.Polygon,
  ) {
    super();

    this.featureLayer = new FeatureLayer(properties);

    this.id = `surrounding${this.featureLayer.id}`;
    this.title = properties.title ?? 'allFeaturesLayer';
    this.visibilityMode = 'inherited';
    this.layers = new Collection<__esri.Layer>().addMany([
      this.featureLayer,
      buildMaskLayer(this.surroundingLayer, this.enclosedLayer),
    ]);
    this.listMode = 'hide-children';

    this.setBoundaries(boundaries);
  }

  @property()
  private enclosedLayer = new GraphicsLayer();

  @property()
  surroundingsVisible: boolean = false;

  @property()
  private featureLayer: __esri.FeatureLayer;

  @aliasOf('featureLayer.featureReduction')
  featureReduction?:
    | __esri.FeatureReductionBinning
    | __esri.FeatureReductionCluster
    | __esri.FeatureReductionSelection;

  @property()
  private surroundingLayer = buildSurroundingLayer(buildSurroundingMask());

  applyEdits(
    edits: __esri.FeatureLayerApplyEditsEdits,
    options?: __esri.FeatureLayerApplyEditsOptions,
  ) {
    return this.featureLayer.applyEdits(edits, options);
  }

  queryFeatures(
    query?: __esri.Query | __esri.QueryProperties,
    options?: __esri.FeatureLayerQueryFeaturesOptions,
  ) {
    return this.featureLayer.queryFeatures(query, options);
  }

  setBoundaries(boundaries?: __esri.Polygon) {
    this.enclosedLayer.graphics.removeAll();
    this.enclosedLayer.graphics.add(buildBoundariesGraphic(boundaries));
  }

  toggleSurroundingFeatures() {
    this.surroundingsVisible = !this.surroundingsVisible;
    this.surroundingLayer.opacity = this.surroundingsVisible
      ? surroundingLayerVisibleOpacity
      : 0;
  }
}

/*
## Utils
*/

function buildBoundariesGraphic(boundaries?: __esri.Polygon) {
  if (!boundaries) return new Graphic();
  return new Graphic({
    geometry: new Polygon({
      spatialReference: boundaries.spatialReference,
      rings: boundaries.rings,
    }),
    symbol: new SimpleFillSymbol({
      color: 'white',
    }),
  });
}

function buildMaskLayer(
  surroundingLayer: __esri.GraphicsLayer,
  enclosedLayer: __esri.GraphicsLayer,
) {
  return new GroupLayer({
    blendMode: 'destination-in',
    layers: [surroundingLayer, enclosedLayer],
  });
}

function buildSurroundingLayer(surroundingMask: __esri.Graphic) {
  return new GraphicsLayer({
    graphics: [surroundingMask],
    opacity: 0,
  });
}

function buildSurroundingMask() {
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
