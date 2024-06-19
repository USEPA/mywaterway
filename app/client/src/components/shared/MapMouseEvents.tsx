import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Point from '@arcgis/core/geometry/Point';
import Graphic from '@arcgis/core/Graphic.js';
import * as query from '@arcgis/core/rest/query';
import SpatialReference from '@arcgis/core/geometry/SpatialReference';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';
import Popup from '@arcgis/core/widgets/Popup';
// contexts
import { useFetchedDataDispatch } from 'contexts/FetchedData';
import { useMapHighlightState } from 'contexts/MapHighlight';
import { useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// config
import { getPopupContent, graphicComparison } from 'utils/mapFunctions';
// types
import type {
  MonitoringFeatureUpdate,
  MonitoringFeatureUpdates,
  WatershedAttributes,
} from 'types';
// utils
import { isInScale } from 'utils/mapFunctions';

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

    const layer = result.graphic.layer;
    // ignore huc 12 boundaries, map-marker, highlight and provider graphics
    const excludedLayers = [
      'stateBoundariesLayer',
      'mappedWaterLayer',
      'searchIconLayer',
      'providersLayer',
      'watershedsLayer',
      ...additionalLayers,
    ];
    if (!result.graphic.layer?.id) return null;
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

function prioritizePopup(
  graphics: __esri.Graphic[] | null,
  onTribePage = false,
) {
  // Show waterbodies ahead of monitoring locations on the Tribe page.
  if (onTribePage) {
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
  // Show boundaries at the end of the list always.
  graphics?.sort((a, _b) => {
    if (a.layer.id === 'boundariesLayer') return 1;
    return -1;
  });
}

// Query the PAD-US database for features at the clicked location.
async function queryPadUsFeatures(
  location: __esri.Point,
  scale: number,
  protectedAreasLayer: __esri.MapImageLayer | null,
  services: any,
) {
  if (!protectedAreasLayer?.visible || !isInScale(protectedAreasLayer, scale))
    return [];

  // check if protected areas layer was clicked on
  const url = `${services.data.protectedAreasDatabase}0`;
  const queryPadUs = {
    returnGeometry: false,
    geometry: location,
    outFields: ['*'],
  };
  const mapContainer = document.getElementById('hmw-map-container');
  if (mapContainer) mapContainer.style.cursor = 'wait';
  const padRes = await query.executeQueryJSON(url, queryPadUs).catch((err) => {
    console.error(err);
    return { features: [] };
  });
  if (mapContainer) mapContainer.style.cursor = 'default';
  return padRes.features.map((feature) => {
    return new Graphic({
      attributes: feature.attributes,
      layer: protectedAreasLayer,
      popupTemplate: protectedAreasLayer.findSublayerById(0).popupTemplate,
    });
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
    if (graphic.layer?.id === 'monitoringLocationsLayer') {
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

  const { getHucBoundaries, monitoringFeatureUpdates, resetData } = useContext(
    LocationSearchContext,
  );

  const { protectedAreasLayer, resetLayers } = useLayers();

  // Opens the change location popup
  const openChangeLocationPopup = useCallback(
    (point: __esri.Point, boundaries: __esri.FeatureSet) => {
      view.closePopup();
      view.popup = new Popup({
        location: point,
        title: 'Change to this location?',
        visible: true,
        visibleElements: {
          collapseButton: false,
        },
        content: getPopupContent({
          navigate,
          resetData: () => {
            fetchedDataDispatch({ type: 'reset' });
            resetData();
            resetLayers();
          },
          feature: {
            attributes: {
              changelocationpopup: 'changelocationpopup',
            },
          },
          getClickedHuc: Promise.resolve({
            status: 'success',
            data: boundaries.features[0].attributes as WatershedAttributes,
          }),
        }),
      });
    },
    [fetchedDataDispatch, navigate, resetData, resetLayers, view],
  );

  // Reference to a dictionary of date-filtered updates applicable to graphics visible on the map.
  const updates = useRef(null);

  useEffect(() => {
    if (view?.popup.visible) view.closePopup();
    updates.current = monitoringFeatureUpdates;
  }, [monitoringFeatureUpdates, view]);

  const handleMapClick = useCallback(
    (event: ClickEvent, view: __esri.MapView) => {
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
          queryPadUsFeatures(
            location,
            view.scale,
            protectedAreasLayer,
            services,
          )
            .then((padUsGraphics) => {
              const graphics = [
                ...padUsGraphics,
                ...(getGraphicsFromResponse(res, extraLayersToIgnore) ?? []),
              ];
              const graphic = graphics.length ? graphics[0] : null;

              if (graphic?.attributes) {
                updateGraphics(graphics, updates?.current);
                prioritizePopup(graphics, onTribePage);
                setSelectedGraphic(graphic);
                view.popup = new Popup({
                  features: graphics,
                  location: point,
                  visible: true,
                  visibleElements: {
                    collapseButton: false,
                  },
                });
              } else {
                setSelectedGraphic(null);
                view.closePopup();
              }

              // get the currently selected huc boundaries, if applicable
              const hucBoundaries = getHucBoundaries();
              // only look for huc boundaries if no graphics were clicked and the
              // user clicked outside of the selected huc boundaries
              if (
                !graphic &&
                !onTribePage &&
                !hucBoundaries?.geometry.contains(location)
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

                    openChangeLocationPopup(point, boundaries);
                  });
              }
            })
            .catch((err) => console.error(err));
        })
        .catch((err) => console.error(err));
    },
    [
      getHucBoundaries,
      openChangeLocationPopup,
      protectedAreasLayer,
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

    setInitialized(true);
  }, [handleMapClick, initialized, services, setHighlightedGraphic, view]);

  return null;
}

export default MapMouseEvents;
