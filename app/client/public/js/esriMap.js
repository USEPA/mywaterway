define([
  'esri/Map',
  'esri/views/MapView',
  'esri/Graphic',
  'esri/geometry/Point',
], function (EsriMap, MapView, Graphic, Point) {
  let map = null;
  let view = null;

  function init() {
    // Create the Map with an initial basemap
    map = new EsriMap({
      basemap: 'topo-vector',
    });
    // Create the MapView and reference the Map in the instance
    view = new MapView({
      container: 'viewDiv',
      map: map,
      zoom: 4,
      center: ['-97.922211', '39.381266'],
    });

    view.on('click', function (evt) {
      view.graphics.removeAll();
      // hide error message
      document.getElementById('errorMessage').style.display = 'none';
      // hide results container
      document.getElementById('eContainer').style.display = 'none';
      // hide location search error message
      document.getElementById('location-error').style.display = 'none';

      const markerSymbol = {
        type: 'simple-marker', // autocasts as new SimpleMarkerSymbol()
        color: [226, 119, 40],
        outline: {
          // autocasts as new SimpleLineSymbol()
          color: [255, 255, 255],
          width: 2,
        },
      };

      // Create a graphic and add the geometry and symbol to it
      const pointGraphic = new Graphic({
        geometry: evt.mapPoint,
        symbol: markerSymbol,
      });
      window.lew_latitude = evt.mapPoint.latitude;
      window.lew_longitude = evt.mapPoint.longitude;
      document.getElementById('location').value =
        window.lew_longitude + ' , ' + window.lew_latitude;

      // Add the graphics to the view's graphics layer
      view.graphics.addMany([pointGraphic]);
    });
  }

  // add a point to the map
  function addPoint(latitude, longitude) {
    view.graphics.removeAll();
    window.lew_latitude = latitude;
    window.lew_longitude = longitude;
    const point = new Point({ x: longitude, y: latitude });

    // Create a symbol for drawing the point
    const markerSymbol = {
      type: 'simple-marker', // autocasts as new SimpleMarkerSymbol()
      color: [226, 119, 40],
      outline: {
        // autocasts as new SimpleLineSymbol()
        color: [255, 255, 255],
        width: 2,
      },
    };

    const graphic = new Graphic({
      geometry: point,
      symbol: markerSymbol,
    });

    // add graphic to the view
    view.graphics.addMany([graphic]);

    view.center = point;
    view.zoom = 8;
  }

  return {
    init: init,
    addPoint: addPoint,
  };
});
