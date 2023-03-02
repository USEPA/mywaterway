import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Point from '@arcgis/core/geometry/Point';
import * as query from '@arcgis/core/rest/query';
import SpatialReference from '@arcgis/core/geometry/SpatialReference';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';
// contexts
import { useFetchedDataDispatch } from 'contexts/FetchedData';
import { useMapHighlightState } from 'contexts/MapHighlight';
import { useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// config
import {
  monitoringClusterSettings,
  useLocalMonitoringLocations,
} from 'utils/hooks/monitoringLocations';
import { getPopupContent, graphicComparison } from 'utils/mapFunctions';
// utilities
import { useDynamicPopup } from 'utils/hooks';
// types
import type {
  MonitoringFeatureUpdate,
  MonitoringFeatureUpdates,
  ExtendedLayer,
} from 'types';

// --- types ---
interface ClickEvent {
  button: number;
  buttons: 0 | 1 | 2;
  mapPoint: Point;
  native: PointerEvent;
  stopPropagation: Function;
  type: 'click';
  timestamp: number;
  x: number;
  y: number;
}

interface PointerMoveEvent {
  button: number;
  buttons: number;
  eventId: number;
  native: PointerEvent;
  pointerId: number;
  pointerType: 'mouse' | 'touch';
  stopPropagation: Function;
  timestamp: number;
  type: 'pointer-move';
  x: number;
  y: number;
}

// --- helpers ---
function getGraphicsFromResponse(
  res: __esri.HitTestResult,
  additionalLayers: Array<string> = [],
) {
  if (!res.results || res.results.length === 0) return null;

  const matches = res.results.filter((result) => {
    if (result.type !== 'graphic') return null;

    const { attributes: attr } = result.graphic;
    const layer = result.graphic.layer as ExtendedLayer;
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
    if (attr?.name && excludedLayers.indexOf(attr.name) !== -1) return null;
    if (excludedLayers.indexOf(layer.id) !== -1) return null;
    if (
      layer.parent &&
      'id' in layer.parent &&
      excludedLayers.indexOf(layer.parent.id) !== -1
    ) {
      return null;
    }
    if (!result.graphic.popupTemplate && !('popupTemplate' in layer)) {
      return null;
    }

    // filter out graphics on basemap layers
    if (result.graphic.layer.type === 'vector-tile') return null;

    return result;
  }) as __esri.GraphicHit[];

  return matches.map((match) => match.graphic);
}

function getGraphicFromResponse(
  res: __esri.HitTestResult,
  additionalLayers: Array<string> = [],
) {
  const graphics = getGraphicsFromResponse(res, additionalLayers);
  return graphics?.length ? graphics[0] : null;
}

function prioritizePopup(graphics: __esri.Graphic[] | null) {
  graphics?.sort((a, b) => {
    if (a.attributes.assessmentunitname) return -1;
    else if (
      a.layer.id === 'monitoringLocationsLayer' ||
      a.layer.id === 'surroundingMonitoringLocationsLayer'
    ) {
      if (b.attributes.assessmentunitname) return 1;
      return -1;
    } else if (a.attributes.TRIBE_NAME) {
      if (
        b.attributes.assessmentunitname ||
        b.layer.id === 'monitoringLocationsLayer' ||
        b.layer.id === 'surroundingMonitoringLocationsLayer'
      )
        return 1;
      return -1;
    }
    return 1;
  });
}

function updateAttributes(
  graphic: __esri.Graphic,
  updates: MonitoringFeatureUpdates,
): __esri.Graphic | null {
  const graphicId = graphic?.attributes?.uniqueId;
  if (updates?.[graphicId]) {
    const stationUpdates = updates[graphicId];
    if (stationUpdates) {
      Object.keys(stationUpdates).forEach((attribute) => {
        graphic.setAttribute(
          attribute,
          stationUpdates[attribute as keyof MonitoringFeatureUpdate],
        );
      });
      return graphic;
    }
  }
  return null;
}

function updateGraphics(
  graphics: __esri.Graphic[] | null,
  updates: MonitoringFeatureUpdates | null,
) {
  if (!updates || !graphics) return;
  graphics.forEach((graphic) => {
    if (
      graphic.layer?.id === 'monitoringLocationsLayer-features' &&
      !graphic.isAggregate
    ) {
      updateAttributes(graphic, updates);
    }
  });
}

// --- components ---
type Props = {
  // map and view props auto passed from parent Map component by react-arcgis
  map: any;
  view: any;
};

function MapMouseEvents({ view }: Props) {
  const navigate = useNavigate();
  const fetchedDataDispatch = useFetchedDataDispatch();

  const services = useServicesContext();
  const { setHighlightedGraphic, setSelectedGraphic } = useMapHighlightState();

  const {
    getHucBoundaries,
    homeWidget,
    monitoringFeatureUpdates,
    protectedAreasLayer,
    resetData,
  } = useContext(LocationSearchContext);

  const { monitoringLocationsLayer } = useLayers();
  const { monitoringLocations, monitoringLocationsStatus } =
    useLocalMonitoringLocations();

  const getDynamicPopup = useDynamicPopup();
  const onTribePage = window.location.pathname.startsWith('/tribe/');
  const onMonitoringPanel = window.location.pathname.endsWith('/monitoring');
  if (onTribePage || onMonitoringPanel) view.popup.autoOpenEnabled = false;
  else view.popup.autoOpenEnabled = true;

  // reference to a dictionary of date-filtered updates
  // applicable to graphics visible on the map
  const updates = useRef(null);
  useEffect(() => {
    if (view?.popup.visible) view.popup.close();
    updates.current = monitoringFeatureUpdates;
  }, [monitoringFeatureUpdates, view.popup]);

  const handleMapClick = useCallback(
    (event, view) => {
      // get the point location of the user's click
      const point = new Point({
        x: event.mapPoint.longitude,
        y: event.mapPoint.latitude,
        spatialReference: SpatialReference.WGS84,
      });
      const location = webMercatorUtils.geographicToWebMercator(point) as Point;

      const onTribePage = window.location.pathname.startsWith('/tribe/');

      // perform a hittest on the click location
      view
        .hitTest(event)
        .then((res: __esri.HitTestResult) => {
          // get and update the selected graphic
          const extraLayersToIgnore = ['selectedTribeLayer'];
          const graphics = getGraphicsFromResponse(res, extraLayersToIgnore);
          const graphic = graphics?.length ? graphics[0] : null;

          if (graphic && graphic.attributes) {
            if (
              monitoringLocationsLayer &&
              graphic.layer.id === 'monitoringLocationsLayer-features' &&
              graphic.isAggregate
            ) {
              monitoringLocationsLayer.baseLayer.featureReduction = null;
              return;
            }

            updateGraphics(graphics, updates?.current);
            if (onTribePage) prioritizePopup(graphics);
            setSelectedGraphic(graphic);
            view.popup.open({ features: graphics, location: point });
          } else {
            setSelectedGraphic(null);
            view.popup.close();
          }

          // get the currently selected huc boundaries, if applicable
          const hucBoundaries = getHucBoundaries();
          // only look for huc boundaries if no graphics were clicked and the
          // user clicked outside of the selected huc boundaries
          if (
            !graphic &&
            !onTribePage &&
            (!hucBoundaries ||
              hucBoundaries.features.length === 0 ||
              !hucBoundaries.features[0].geometry.contains(location))
          ) {
            //get the huc boundaries of where the user clicked
            const queryParams = {
              returnGeometry: true,
              geometry: location,
              outFields: ['*'],
            };
            query
              .executeQueryJSON(services.data.wbd, queryParams)
              .then((boundaries) => {
                if (boundaries.features.length === 0) return;

                // Opens the change location popup
                function openChangeLocationPopup() {
                  const { attributes } = boundaries.features[0];
                  view.popup.close();
                  view.popup.open({
                    location: point,
                    title: 'Change to this location?',
                    content: getPopupContent({
                      navigate,
                      resetData: () => {
                        fetchedDataDispatch({ type: 'reset' });
                        resetData();
                      },
                      feature: {
                        attributes: {
                          changelocationpopup: 'changelocationpopup',
                        },
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
                  const url = `${services.data.protectedAreasDatabase}0`;
                  const queryPadUs = {
                    returnGeometry: false,
                    geometry: location,
                    outFields: ['*'],
                  };
                  query
                    .executeQueryJSON(url, queryPadUs)
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
        .catch((err: string) => console.error(err));
    },
    [
      fetchedDataDispatch,
      getHucBoundaries,
      monitoringLocationsLayer,
      navigate,
      protectedAreasLayer,
      resetData,
      services,
      setSelectedGraphic,
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
    let lastFeature: __esri.Graphic | null = null;
    let lastEventId = -1;

    const handleMapMouseOver = (
      event: PointerMoveEvent,
      view: __esri.MapView,
    ) => {
      view
        .hitTest(event)
        .then((res) => {
          // only use the latest event id to perform the highligh
          if (event.eventId < lastEventId) return;
          lastEventId = event.eventId;

          // get the graphic from the hittest
          const extraLayersToIgnore = [
            'allWaterbodiesLayer',
            'surroundingMonitoringLocationsLayer',
          ];
          let feature = getGraphicFromResponse(res, extraLayersToIgnore);

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
    view.on('click', (event: ClickEvent) => {
      handleMapClick(event, view);
    });

    view.on('pointer-move', (event: PointerMoveEvent) => {
      handleMapMouseOver(event, view);
    });

    // auto expands the popup when it is first opened
    view.popup.watch('visible', (_graphic: __esri.Graphic) => {
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

  // recalculates stored total location count on change of location
  const [locationCount, setLocationCount] = useState<number | null>(null);
  useEffect(() => {
    if (monitoringLocationsStatus !== 'success' || !monitoringLocations.length)
      return;
    setLocationCount(monitoringLocations.length);
    return function cleanup() {
      setLocationCount(null);
    };
  }, [monitoringLocations, monitoringLocationsStatus]);

  // restores cluster settings on change of location
  useEffect(() => {
    if (!locationCount || locationCount <= 20) return;
    if (
      !monitoringLocationsLayer ||
      monitoringLocationsLayer.baseLayer.featureReduction
    )
      return;
    monitoringLocationsLayer.baseLayer.featureReduction =
      monitoringClusterSettings;
  }, [locationCount, monitoringLocationsLayer]);

  // sets an event listener on the home widget, and
  // restores cluster settings if clicked
  const [homeClickHandler, setHomeClickHandler] = useState<IHandle | null>(
    null,
  );
  useEffect(() => {
    return function cleanup() {
      homeClickHandler?.remove();
    };
  }, [homeClickHandler]);

  useEffect(() => {
    if (!homeWidget) return;
    const handler: IHandle = homeWidget.on('go', (_ev: any) => {
      if (
        monitoringLocationsLayer &&
        !monitoringLocationsLayer.baseLayer.featureReduction &&
        locationCount &&
        locationCount > 20
      ) {
        monitoringLocationsLayer.baseLayer.featureReduction =
          monitoringClusterSettings;
      }
    });
    setHomeClickHandler(handler);
    return function cleanup() {
      setHomeClickHandler(null);
    };
  }, [homeWidget, locationCount, monitoringLocationsLayer]);

  return null;
}

export default MapMouseEvents;
