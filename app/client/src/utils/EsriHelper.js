import { loadModules } from 'esri-loader';
// config
import { esriApiUrl } from 'config/esriConfig';

class EsriHelper {
  hasLoaded = false;
  modules = {};

  constructor() {
    if (!this.hasLoaded) {
      // Generate utils
      loadModules(
        [
          'esri/Graphic',
          'esri/Viewpoint',

          'esri/widgets/BasemapGallery',
          'esri/widgets/BasemapGallery/support/PortalBasemapsSource',
          'esri/widgets/Expand',
          'esri/widgets/Home',
          'esri/widgets/LayerList',
          'esri/widgets/LayerList/ListItem',
          'esri/widgets/ScaleBar',

          'esri/tasks/Locator',
          'esri/tasks/QueryTask',
          'esri/tasks/support/Query',

          'esri/geometry/Point',
          'esri/geometry/Polygon',
          'esri/geometry/Polyline',
          'esri/geometry/SpatialReference',

          'esri/layers/GraphicsLayer',
          'esri/layers/FeatureLayer',
          'esri/layers/MapImageLayer',
          'esri/layers/GroupLayer',

          'esri/symbols/PictureMarkerSymbol',
          'esri/symbols/SimpleFillSymbol',
          'esri/symbols/SimpleLineSymbol',
          'esri/symbols/SimpleMarkerSymbol',

          'esri/core/Collection',

          'esri/core/urlUtils',
          'esri/core/watchUtils',
          'esri/geometry/support/webMercatorUtils',
        ],
        { url: esriApiUrl },
      ).then(
        ([
          Graphic,
          Viewpoint,

          BasemapGallery,
          PortalBasemapsSource,
          Expand,
          Home,
          LayerList,
          ListItem,
          ScaleBar,

          Locator,
          QueryTask,
          Query,

          Point,
          Polygon,
          Polyline,
          SpatialReference,

          GraphicsLayer,
          FeatureLayer,
          MapImageLayer,
          GroupLayer,

          PictureMarkerSymbol,
          SimpleFillSymbol,
          SimpleLineSymbol,
          SimpleMarkerSymbol,

          Collection,

          urlUtils,
          watchUtils,
          webMercatorUtils,
        ]) => {
          this.modules.Graphic = Graphic;
          this.modules.Viewpoint = Viewpoint;

          this.modules.BasemapGallery = BasemapGallery;
          this.modules.PortalBasemapsSource = PortalBasemapsSource;
          this.modules.Expand = Expand;
          this.modules.Home = Home;
          this.modules.LayerList = LayerList;
          this.modules.ListItem = ListItem;
          this.modules.ScaleBar = ScaleBar;

          this.modules.Locator = Locator;
          this.modules.QueryTask = QueryTask;
          this.modules.Query = Query;

          this.modules.Point = Point;
          this.modules.Polygon = Polygon;
          this.modules.Polyline = Polyline;
          this.modules.SpatialReference = SpatialReference;

          this.modules.GraphicsLayer = GraphicsLayer;
          this.modules.FeatureLayer = FeatureLayer;
          this.modules.MapImageLayer = MapImageLayer;
          this.modules.GroupLayer = GroupLayer;

          this.modules.PictureMarkerSymbol = PictureMarkerSymbol;
          this.modules.SimpleFillSymbol = SimpleFillSymbol;
          this.modules.SimpleLineSymbol = SimpleLineSymbol;
          this.modules.SimpleMarkerSymbol = SimpleMarkerSymbol;

          this.modules.Collection = Collection;

          this.modules.urlUtils = urlUtils;
          this.modules.watchUtils = watchUtils;
          this.modules.webMercatorUtils = webMercatorUtils;

          this.hasLoaded = true;
        },
      );
    }
  }
}

export default EsriHelper;
