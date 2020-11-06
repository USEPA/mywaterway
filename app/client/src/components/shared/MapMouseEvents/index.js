import React from 'react';
// contexts
import { MapHighlightContext } from 'contexts/MapHighlight';
import { EsriModulesContext } from 'contexts/EsriModules';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// config
import {
  getPopupContent,
  getPopupTitle,
  graphicComparison,
} from 'components/pages/LocationMap/MapFunctions';

// --- components ---
type Props = {
  // map and view props auto passed from parent Map component by react-arcgis
  map: any,
  view: any,
};

function MapMouseEvents({ map, view }: Props) {
  const services = useServicesContext();
  const {
    setHighlightedGraphic,
    setSelectedGraphic, //
  } = React.useContext(MapHighlightContext);

  const { getHucBoundaries, resetData } = React.useContext(
    LocationSearchContext,
  );

  const {
    SpatialReference,
    Point,
    webMercatorUtils,
    Query,
    QueryTask,
  } = React.useContext(EsriModulesContext);

  const handleMapClick = React.useCallback(
    (event, view) => {
      // get the point location of the user's click
      const point = new Point({
        x: event.mapPoint.longitude,
        y: event.mapPoint.latitude,
        spatialReference: SpatialReference.WQGS84,
      });
      const location = webMercatorUtils.geographicToWebMercator(point);

      // perform a hittest on the click location
      view
        .hitTest(event)
        .then((res) => {
          // get and update the selected graphic
          const graphic = getGraphicFromResponse(res);

          // if upstream watershed is clicked:
          // set the view highlight options to 0 fill opacity
          if (graphic && graphic.attributes) {
            if (graphic.layer.id === 'upstreamWatershed') {
              view.highlightOptions.fillOpacity = 0;
              console.log('setting upstream selected to true');
            } else {
              view.highlightOptions.fillOpacity = 1;
            }

            setSelectedGraphic(graphic);
          } else {
            setSelectedGraphic('');
          }

          // get the currently selected huc boundaries, if applicable
          const hucBoundaries = getHucBoundaries();
          // only look for huc boundaries if no graphics were clicked and the
          // user clicked outside of the selected huc boundaries
          if (
            !graphic &&
            (!hucBoundaries ||
              hucBoundaries.features.length === 0 ||
              !hucBoundaries.features[0].geometry.contains(location))
          ) {
            //get the huc boundaries of where the user clicked
            const query = new Query({
              returnGeometry: true,
              geometry: location,
              outFields: ['*'],
            });

            new QueryTask({ url: services.data.wbd })
              .execute(query)
              .then((boundaries) => {
                if (boundaries.features.length === 0) return;

                const { attributes } = boundaries.features[0];

                view.popup.close();
                view.popup.open({
                  title: 'Change to this location?',
                  content: getPopupContent({
                    resetData,
                    feature: {
                      attributes: {
                        changelocationpopup: 'changelocationpopup',
                      },
                      view: view,
                    },
                    getClickedHuc: new Promise((resolve, reject) => {
                      resolve({
                        status: 'success',
                        data: {
                          huc12: attributes.huc12,
                          watershed: attributes.name,
                        },
                      });
                    }),
                  }),
                });
              })
              .catch((err) => console.error(err));
          }
        })
        .catch((err) => console.error(err));
    },
    [
      Point,
      Query,
      QueryTask,
      resetData,
      SpatialReference.WQGS84,
      getHucBoundaries,
      setSelectedGraphic,
      webMercatorUtils,
      services,
    ],
  );

  // Sets up the map mouse events when the component initializes
  const [initialized, setInitialized] = React.useState(false);
  React.useEffect(() => {
    if (initialized || services.status === 'fetching') return;

    // These global scoped variables are used to prevent flickering that is caused
    // by the hitTest async events occurring out of order. The global scoped variables
    // are needed because the esri hit test event won't be able to read react state
    // variables.
    var lastFeature = null;
    var lastEventId = -1;

    const handleMapMouseOver = (event, view) => {
      view
        .hitTest(event)
        .then((res) => {
          // only use the latest event id to perform the highligh
          if (event.eventId < lastEventId) return;
          lastEventId = event.eventId;

          // get the graphic from the hittest
          let feature = getGraphicFromResponse(res);

          // if any feature besides the upstream watershed is moused over:
          // set the view's highlight fill opacity back to 1
          if (
            feature?.layer?.id !== 'upstreamWatershed' &&
            view.highlightOptions.fillOpacity !== 1 &&
            !view.popup.visible // if popup is not visible then the upstream layer isn't currently selected
          ) {
            view.highlightOptions.fillOpacity = 1;
          }

          // ensure the graphic actually changed prior to setting the context variable
          const equal = graphicComparison(feature, lastFeature);
          if (!equal) {
            setHighlightedGraphic(feature);
            lastFeature = feature;
          }
        })
        .catch((err) => console.error(err));
    };

    // setup the mouse click and mouse over events
    view.on('click', (event) => {
      handleMapClick(event, view);
    });

    view.on('pointer-move', (event) => {
      handleMapMouseOver(event, view);
    });

    view.popup.watch('selectedFeature', (graphic) => {
      // check if monitoring station is clicked, load the popup and call the waterqualitydata service
      if (
        graphic &&
        graphic.layer &&
        graphic.layer.id === 'monitoringStationsLayer' &&
        graphic.attributes &&
        graphic.attributes.fullPopup === false
      ) {
        loadMonitoringLocation(graphic, services);
      }
    });

    // auto expands the popup when it is first opened
    view.popup.watch('visible', (graphic) => {
      if (view.popup.visible) view.popup.collapsed = false;
    });

    setInitialized(true);
  }, [view, handleMapClick, setHighlightedGraphic, initialized, services]);

  function getGraphicFromResponse(res: Object) {
    if (!res.results || res.results.length === 0) return null;

    const match = res.results.filter((result) => {
      const { attributes: attr } = result.graphic;
      // ignore huc 12 boundaries, map-marker, highlight and provider graphics
      const excludedLayers = [
        'stateBoundariesLayer',
        'mappedWaterLayer',
        'countyLayer',
        'watershedsLayer',
        'wsioHealthIndexLayer',
        'boundaries',
        'map-marker',
        'highlight',
        'providers',
      ];
      if (attr.name && excludedLayers.indexOf(attr.name) !== -1) return null;
      if (excludedLayers.indexOf(result.graphic.layer.id) !== -1) return null;

      // filter out graphics on basemap layers
      if (result.graphic.layer.type === 'vector-tile') return null;

      return result;
    });

    return match[0] ? match[0].graphic : null;
  }

  const loadMonitoringLocation = (graphic, services) => {
    // tell the getPopupContent function to use the full popup version that includes the service call
    graphic.attributes.fullPopup = true;
    graphic.popupTemplate = {
      title: getPopupTitle(graphic.attributes),
      content: getPopupContent({ feature: graphic, services }),
    };
  };

  return null;
}

export default MapMouseEvents;
