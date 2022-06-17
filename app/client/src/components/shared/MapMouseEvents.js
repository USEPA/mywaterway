import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Point from '@arcgis/core/geometry/Point';
import Query from '@arcgis/core/rest/support/Query';
import QueryTask from '@arcgis/core/tasks/QueryTask';
import SpatialReference from '@arcgis/core/geometry/SpatialReference';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';
// contexts
import { useFetchedDataDispatch } from 'contexts/FetchedData';
import { MapHighlightContext } from 'contexts/MapHighlight';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// config
import { getPopupContent, graphicComparison } from 'utils/mapFunctions';
// utilities
import { useDynamicPopup } from 'utils/hooks';

// --- helpers ---
function updateAttributes(graphic, updates) {
  Object.keys(updates).forEach((attribute) => {
    graphic.setAttribute(attribute, updates[attribute]);
  });
}

// --- components ---
type Props = {
  // map and view props auto passed from parent Map component by react-arcgis
  map: any,
  view: any,
};

function MapMouseEvents({ map, view }: Props) {
  const navigate = useNavigate();
  const fetchedDataDispatch = useFetchedDataDispatch();

  const services = useServicesContext();
  const { setHighlightedGraphic, setSelectedGraphic } =
    useContext(MapHighlightContext);

  const {
    getHucBoundaries,
    monitoringFeatureUpdates,
    resetData,
    protectedAreasLayer,
  } = useContext(LocationSearchContext);

  const getDynamicPopup = useDynamicPopup();

  const handleMapClick = useCallback(
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

          if (graphic && graphic.attributes) {
            // if upstream watershed is clicked:
            // set the view highlight options to 0 fill opacity
            if (graphic.layer.id === 'upstreamWatershed') {
              view.highlightOptions.fillOpacity = 0;
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

                // Opens the change location popup
                function openChangeLocationPopup() {
                  const { attributes } = boundaries.features[0];
                  view.popup.close();
                  view.popup.open({
                    title: 'Change to this location?',
                    content: getPopupContent({
                      navigate,
                      resetData: () => {
                        fetchedDataDispatch({ type: 'RESET_FETCHED_DATA' });
                        resetData();
                      },
                      feature: {
                        attributes: {
                          changelocationpopup: 'changelocationpopup',
                        },
                        view: view,
                      },
                      getClickedHuc: Promise.resolve({
                        status: 'success',
                        data: {
                          huc12: attributes.huc12,
                          watershed: attributes.name,
                        },
                      }),
                    }),
                  });
                }

                // if the protectedAreasLayer is not visible just open the popup
                // like normal, otherwise query the protectedAreasLayer to see
                // if the user clicked on a protected area
                if (!protectedAreasLayer.visible) {
                  openChangeLocationPopup();
                } else {
                  // check if protected areas layer was clicked on
                  const queryPadUs = new Query({
                    returnGeometry: false,
                    geometry: location,
                    outFields: ['*'],
                  });
                  new QueryTask({
                    url: `${services.data.protectedAreasDatabase}0`,
                  })
                    .execute(queryPadUs)
                    .then((padRes) => {
                      if (padRes.features.length === 0) {
                        // user did not click on a protected area, open the popup
                        openChangeLocationPopup();
                      } else {
                        // do nothing, so the protected area popup opens
                      }
                    })
                    .catch((err) => console.error(err));
                }
              })
              .catch((err) => console.error(err));
          }
        })
        .catch((err) => console.error(err));
    },
    [
      fetchedDataDispatch,
      resetData,
      getHucBoundaries,
      setSelectedGraphic,
      services,
      protectedAreasLayer,
      navigate,
    ],
  );

  // Sets up the map mouse events when the component initializes
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
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
          const extraLayersToIgnore = ['allWaterbodiesLayer'];
          let feature = getGraphicFromResponse(res, extraLayersToIgnore);

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
      // set the view highlight options to 0 fill opacity if upstream watershed is selected
      if (graphic?.layer?.id === 'upstreamWatershed') {
        view.highlightOptions.fillOpacity = 0;
      } else {
        view.highlightOptions.fillOpacity = 1;
      }
    });

    // auto expands the popup when it is first opened
    view.popup.watch('visible', (graphic) => {
      if (view.popup.visible) view.popup.collapsed = false;
    });

    setInitialized(true);
  }, [
    getDynamicPopup,
    handleMapClick,
    initialized,
    services,
    setHighlightedGraphic,
    view,
  ]);

  const updates = useRef(null);
  useEffect(() => {
    if (!monitoringFeatureUpdates) return;
    updates.current = monitoringFeatureUpdates;
  }, [monitoringFeatureUpdates]);

  const [watchHandler, setWatchHandler] = useState(null);
  useEffect(() => {
    if (services.status === 'fetching') return;
    if (!watchHandler) {
      const handler = view.popup.watch('selectedFeature', (graphic) => {
        if (graphic?.layer?.id === 'monitoringLocationsLayer') {
          const graphicId = graphic?.attributes?.uniqueId;
          if (updates.current?.[graphicId]) {
            const stationUpdates = updates.current[graphicId];
            updateAttributes(graphic, stationUpdates);
          }
        }
      });
      setWatchHandler(handler);
    }
    return () => watchHandler?.remove();
  }, [services.status, updates, view, watchHandler]);

  function getGraphicFromResponse(
    res: Object,
    additionalLayers: Array<string> = [],
  ) {
    if (!res.results || res.results.length === 0) return null;

    const match = res.results.filter((result) => {
      const { attributes: attr, layer } = result.graphic;
      // ignore huc 12 boundaries, map-marker, highlight and provider graphics
      const excludedLayers = [
        'stateBoundariesLayer',
        'mappedWaterLayer',
        'watershedsLayer',
        'boundaries',
        'map-marker',
        'highlight',
        'providers',
        ...additionalLayers,
      ];
      if (!result.graphic.layer?.id) return null;
      if (attr.name && excludedLayers.indexOf(attr.name) !== -1) return null;
      if (excludedLayers.indexOf(layer.id) !== -1) return null;
      if (excludedLayers.indexOf(layer.parent.id) !== -1) return null;

      // filter out graphics on basemap layers
      if (result.graphic.layer.type === 'vector-tile') return null;

      return result;
    });

    return match[0] ? match[0].graphic : null;
  }

  return null;
}

export default MapMouseEvents;
