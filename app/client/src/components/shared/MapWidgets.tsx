import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { render } from 'react-dom';
import { Rnd } from 'react-rnd';
import { css } from 'styled-components/macro';
import Polygon from '@arcgis/core/geometry/Polygon';
import BasemapGallery from '@arcgis/core/widgets/BasemapGallery';
import Expand from '@arcgis/core/widgets/Expand';
import Graphic from '@arcgis/core/Graphic';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import Home from '@arcgis/core/widgets/Home';
import LayerList from '@arcgis/core/widgets/LayerList';
import Legend from '@arcgis/core/widgets/Legend';
import Point from '@arcgis/core/geometry/Point';
import PortalBasemapsSource from '@arcgis/core/widgets/BasemapGallery/support/PortalBasemapsSource';
import * as query from '@arcgis/core/rest/query';
import ScaleBar from '@arcgis/core/widgets/ScaleBar';
import SpatialReference from '@arcgis/core/geometry/SpatialReference';
import Viewpoint from '@arcgis/core/Viewpoint';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';
// components
import AddDataWidget from 'components/shared/AddDataWidget';
import MapLegend from 'components/shared/MapLegend';
// contexts
import { useAddDataWidgetState } from 'contexts/AddDataWidget';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useFullscreenState } from 'contexts/Fullscreen';
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import { fetchCheck } from 'utils/fetchUtils';
import {
  hasSublayers,
  isGroupLayer,
  isInScale,
  isPolygon,
  shallowCompare,
} from 'utils/mapFunctions';
import { isAbort } from 'utils/utils';
// helpers
import { useAbortSignal, useDynamicPopup } from 'utils/hooks';
// icons
import resizeIcon from 'images/resize.png';
// types
import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import type { Container } from 'react-dom';
import type { Feature, ExtendedLayer, ScaledLayer, ServicesState } from 'types';

const layersToAllowPopups = ['restore', 'protect'];

// workaround for React state variables not being updated inside of
// esri watch events
let displayEsriLegendNonState = false;
let additionalLegendInfoNonState = {
  status: 'fetching',
  data: {},
};

const basemapNames = [
  'Streets',
  'Imagery',
  'Imagery Hybrid',
  'Topographic',
  'Terrain with Labels',
  'Light Gray Canvas',
  'Dark Gray Canvas',
  // 'Navigation',
  // 'Streets (Night)',
  // 'Oceans',
  // 'National Geographic Style Map',
  // 'OpenStreetMap',
  // 'Charted Territory Map',
  // 'Community Map',
  // 'Navigation (Dark Mode)',
  // 'Newspaper Map',
  // 'Human Geography Map',
  // 'Human Geography Dark Map',
  // 'Modern Antique Map',
  // 'Mid-Century Map',
  // 'Nova Map',
  // 'Colored Pencil Map',
  // 'Firefly Imagery Hybrid',
  // 'USA Topo Maps',
];

const zoomDependentLayers = [
  'ejscreenLayer',
  'mappedWaterLayer',
  'stateBoundariesLayer',
  'watershedsLayer',
];

// used to order the layer legends, so the ordering is consistent no matter
// which layer legends are visible.
const orderedLayers = [
  'waterbodyLayer',
  'allWaterbodiesLayer',
  'monitoringLocationsLayer',
  'usgsStreamgagesLayer',
  'issuesLayer',
  'dischargersLayer',
  'nonprofitsLayer',
  'providersLayer',
  'upstreamWatershed',
  'currentLocationLayer',
  'actionsWaterbodies',
  'watershedsLayer',
  'countyLayer',
  'mappedWaterLayer',
  'stateBoundariesLayer',
  'congressionalLayer',
  'selectedTribeLayer',
  'tribalLayer',
  'tribalLayer-1',
  'tribalLayer-2',
  'tribalLayer-3',
  'tribalLayer-4',
  'tribalLayer-5',
  'wsioHealthIndexLayer',
  'wildScenicRiversLayer',
  'protectedAreasHighlightLayer',
  'protectedAreasLayer',
  'ejscreenLayer',
];

// function called whenever the map's zoom changes
function handleMapZoomChange(view: __esri.MapView) {
  // return early if zoom is not set to an integer
  if (view.zoom % 1 !== 0) return;
  // set listMode for each layer, when zoom changes (practically, this shows/
  // hides 'County' or 'Mapped Water (all)' layers, depending on zoom level)
  view.map.layers.forEach((layer) => {
    if (zoomDependentLayers.includes(layer.id)) {
      if (isInScale(layer, view.scale)) {
        layer.listMode = layer.hasOwnProperty('sublayers')
          ? 'hide-children'
          : 'show';
      } else {
        layer.listMode = 'hide';
      }
    }
  });
}

function updateVisibleLayers(
  view: __esri.MapView,
  displayEsriLegend: boolean,
  hmwLegendNode: Container,
  additionalLegendInfo: Object,
) {
  if (!view?.map?.layers) return;

  // build an array of layers that are visible based on the ordering above
  const visibleLayers: __esri.Layer[] = [];
  orderedLayers.forEach((layerId) => {
    // get the esri layer from the map view
    let layer = view.map.findLayerById(layerId);
    if (!layer) return;

    // Verify there is atleast one child layer visible before adding the layer
    // to the legend. Ignoring the waterbodyLayer is a workaround to the waterbodyLayer
    // not having any child layers when the layer is first created.
    if (layerId !== 'waterbodyLayer') {
      if (isGroupLayer(layer)) {
        let anyVisible = false;
        layer.layers.forEach((sublayer) => {
          if (sublayer.visible) anyVisible = true;
        });
        if (!anyVisible) return;
      }
      if (hasSublayers(layer)) {
        let anyVisible = false;
        layer.sublayers.forEach((sublayer) => {
          if ('visible' in sublayer && sublayer.visible) anyVisible = true;
        });
        if (!anyVisible) return;
      }
    }

    // add the layer if it is visible on the map. Actions &
    // waterbodies layers are handled separately here because it is always
    // hidden from the layer list widget, but still needs to be in the legend.
    // The boundaries layer is entirely hidden from the community home page.
    if (
      (layer.visible && layer.listMode !== 'hide') ||
      (layer.visible && layer.id === 'actionsWaterbodies') ||
      (layer.visible && layer.id === 'upstreamWatershed') ||
      (layer.visible && layer.id === 'allWaterbodiesLayer')
    ) {
      visibleLayers.push(layer);
    }
  });

  render(
    <MapLegend
      view={view}
      displayEsriLegend={displayEsriLegend}
      visibleLayers={visibleLayers}
      additionalLegendInfo={additionalLegendInfo}
    />,
    hmwLegendNode,
  );
}

const resizeHandleStyles = css`
  float: right;
  position: absolute;
  right: 0;
  bottom: 0;

  .fa-rotate-45 {
    transform: rotate(45deg);
  }

  .fa-rotate-315 {
    transform: rotate(315deg);
  }
`;

// --- components ---
type Props = {
  // map and view props auto passed from parent Map component by react-arcgis
  map: __esri.Map;
  view: __esri.MapView;
  layers: Array<__esri.Layer> | null;
  onHomeWidgetRendered?: (homeWidget: __esri.Home) => void;
};

function MapWidgets({
  map,
  view,
  layers,
  onHomeWidgetRendered = () => {},
}: Props) {
  const { addDataWidgetVisible, setAddDataWidgetVisible, widgetLayers } =
    useAddDataWidgetState();

  const abortSignal = useAbortSignal();
  const watchHandles = useMemo<IHandle[]>(() => [], []);
  const observers = useMemo<MutationObserver[]>(() => [], []);
  useEffect(() => {
    return function cleanup() {
      watchHandles.forEach((handle) => handle.remove());
      observers.forEach((observer) => observer.disconnect());
    };
  }, [observers, watchHandles]);

  const {
    homeWidget,
    setHomeWidget,
    upstreamWidget,
    upstreamWidgetDisabled,
    setUpstreamWidgetDisabled,
    getUpstreamWidgetDisabled,
    setUpstreamWidget,
    visibleLayers,
    setVisibleLayers,
    setBasemap,
    basemap,
    upstreamLayerVisible,
    setUpstreamLayerVisible,
    setUpstreamLayer,
    getUpstreamLayer,
    getCurrentExtent,
    getHuc12,
    huc12,
    getUpstreamExtent,
    setUpstreamExtent,
    setErrorMessage,
    getWatershed,
    allWaterbodiesLayer,
    allWaterbodiesWidgetDisabled,
    setAllWaterbodiesWidgetDisabled,
    getAllWaterbodiesWidgetDisabled,
    setMapView,
    getHucBoundaries,
  } = useContext(LocationSearchContext);

  const services = useServicesContext();

  const getDynamicPopup = useDynamicPopup();
  const { getTemplate } = getDynamicPopup();

  const {
    fullscreenActive,
    setFullscreenActive, //
  } = useFullscreenState();

  const [mapEventHandlersSet, setMapEventHandlersSet] = useState(false);

  const [popupWatcher, setPopupWatcher] = useState<__esri.WatchHandle | null>(
    null,
  );
  useEffect(() => {
    if (!view || popupWatcher) return;

    const watcher = reactiveUtils.watch(
      () => view.popup.features,
      () => {
        const features = view.popup.features;
        if (features.length === 0) return;

        const newFeatures: __esri.Graphic[] = [];
        const idsAdded: string[] = [];
        features.forEach((item) => {
          const id = item.attributes?.assessmentunitidentifier;
          const geometryType = item.geometry?.type;

          // exit early if the feature is not a waterbody
          if (!id || !geometryType) {
            newFeatures.push(item);
            return;
          }

          // get the point location of the user's click
          const point = new Point({
            x: view.popup.location.longitude,
            y: view.popup.location.latitude,
            spatialReference: SpatialReference.WGS84,
          });
          const location = webMercatorUtils.geographicToWebMercator(point);

          // determine if the user clicked inside of the selected huc
          const hucBoundaries = getHucBoundaries();
          const clickedInHuc =
            hucBoundaries &&
            hucBoundaries.features.length > 0 &&
            hucBoundaries.features[0].geometry.contains(location);

          // filter out popups for allWaterbodiesLayer inside of the huc
          const pathParts = window.location.pathname.split('/');
          const panelName = pathParts[pathParts.length - 1];
          const layerParent = (item.layer as ExtendedLayer)?.parent;
          const layerParentId =
            layerParent && 'id' in layerParent && layerParent.id;
          if (
            clickedInHuc &&
            layerParentId === 'allWaterbodiesLayer' &&
            !layersToAllowPopups.includes(panelName)
          ) {
            return;
          }

          // filter out duplicate popups
          const idType = `${id}-${geometryType}`;
          if (idsAdded.includes(idType)) return;

          newFeatures.push(item);
          idsAdded.push(idType);
        });

        if (newFeatures.length === 0) {
          view.popup.close();
        } else if (newFeatures.length !== view.popup.features.length) {
          view.popup.features = newFeatures;
        }
      },
    );

    setPopupWatcher(watcher);
  }, [getHucBoundaries, popupWatcher, view]);

  // add the layers to the map
  useEffect(() => {
    if (!layers || !map) return;

    map.removeAll();
    map.addMany(layers);
    map.addMany(widgetLayers);

    // gets a layer type value used for sorting
    function getLayerType(layer: __esri.Layer) {
      // if the layer is in orderedLayers, then classify it as an hmw
      // layer
      if (orderedLayers.indexOf(layer.id) > -1) return 'hmw';

      const imageryTypes = ['imagery', 'tile', 'vector-tile'];
      let type = 'other';

      let groupType = '';
      if (isGroupLayer(layer)) {
        const groupLayer = layer;
        groupLayer.layers.forEach((innerLayer, index) => {
          if (groupType === 'combo') return;

          if (index === 0) {
            groupType = innerLayer.type;
            return;
          }

          if (groupType !== innerLayer.type) {
            groupType = 'combo';
          }
        });
      }

      if (layer.type === 'graphics' || groupType === 'graphics') {
        type = 'graphics';
      } else if (layer.type === 'feature' || groupType === 'feature') {
        type = 'feature';
      } else if (
        imageryTypes.includes(type) ||
        imageryTypes.includes(groupType)
      ) {
        type = 'imagery';
      }

      return type;
    }

    // the layers are ordered as follows:
    // graphicsLayers (top)
    // featureLayers
    // otherLayers
    // imageryLayers (bottom)
    const sortBy = ['other', 'imagery', 'feature', 'graphics', 'hmw'];
    map.layers.sort((a: __esri.Layer, b: __esri.Layer) => {
      return sortBy.indexOf(getLayerType(a)) - sortBy.indexOf(getLayerType(b));
    });
  }, [layers, map, widgetLayers]);

  // put the home widget back on the ui after the window is resized
  useEffect(() => {
    if (homeWidget) {
      const newHomeWidget = new Home({ view, viewpoint: homeWidget.viewpoint });
      view.ui.add(newHomeWidget, { position: 'top-left', index: 1 });
      view.ui.move('zoom', 'top-left');
      setHomeWidget(newHomeWidget);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keeps the layer visiblity in sync with the layer list widget visibilities
  const [toggledLayer, setToggledLayer] = useState({
    layerId: '',
    visible: false,
  });
  const [lastToggledLayer, setLastToggledLayer] = useState({});
  useEffect(() => {
    // if the toggled layer didn't change exit early
    if (shallowCompare(toggledLayer, lastToggledLayer)) return;

    // update the last toggled layer
    setLastToggledLayer(toggledLayer);

    // exit early if the toggledLayer object is empty
    if (Object.keys(toggledLayer).length === 0) return;

    // make the update of the toggled layer if the visiblity changed
    if (
      visibleLayers.hasOwnProperty(toggledLayer.layerId) &&
      visibleLayers[toggledLayer.layerId] !== toggledLayer.visible
    ) {
      // make a copy of the visibleLayers variable
      const newVisibleLayers = { ...visibleLayers };
      newVisibleLayers[toggledLayer.layerId] = toggledLayer.visible;
      setVisibleLayers(newVisibleLayers);
    }
  }, [toggledLayer, lastToggledLayer, visibleLayers, setVisibleLayers]);

  // Creates and adds the home widget to the map
  useEffect(() => {
    if (!view || homeWidget) return;

    // create the home widget
    const newHomeWidget = new Home({ view });
    view.ui.add(newHomeWidget, { position: 'top-left', index: 1 });
    view.ui.move('zoom', 'top-left');
    // pass the home widget up to the consumer of this component,
    // so it can modify it as needed (e.g. update the viewpoint)
    onHomeWidgetRendered(newHomeWidget);
    setHomeWidget(newHomeWidget);
  }, [onHomeWidgetRendered, setHomeWidget, view, homeWidget]);

  // Creates and adds the scale bar widget to the map
  const [scaleBar, setScaleBar] = useState<__esri.ScaleBar | null>(null);
  useEffect(() => {
    if (!view || scaleBar) return;

    const newScaleBar = new ScaleBar({
      view: view,
      unit: 'dual',
    });
    view.ui.add(newScaleBar, { position: 'bottom-left', index: 0 });
    setScaleBar(newScaleBar);
  }, [view, scaleBar]);

  // manages which layers are visible in the legend
  const legendTemp = document.createElement('div');
  legendTemp.className = 'map-legend';
  const hmwLegendTemp = document.createElement('div');
  const esriLegendTemp = document.createElement('div');
  esriLegendTemp.id = 'esri-legend-container';
  esriLegendTemp.style.maxWidth = '240px';
  legendTemp.appendChild(hmwLegendTemp);
  legendTemp.appendChild(esriLegendTemp);
  const [hmwLegendNode] = useState(hmwLegendTemp);
  const [esriLegendNode] = useState(esriLegendTemp);
  const [legendNode] = useState(legendTemp);

  // Creates and adds the legend widget to the map
  const [legend, setLegend] = useState<__esri.Expand | null>(null);
  useEffect(() => {
    if (!view || legend) return;

    const newLegend = new Expand({
      content: legendNode,
      view,
      expanded: false,
      expandIconClass: 'esri-icon-legend',
      expandTooltip: 'Open Legend',
      collapseTooltip: 'Close Legend',
      autoCollapse: true,
      mode: 'floating',
    });
    view.ui.add(newLegend, { position: 'top-left', index: 0 });
    setLegend(newLegend);
  }, [view, legend, legendNode]);

  // Create the layer list toolbar widget
  const [esriLegend, setEsriLegend] = useState<__esri.Legend | null>(null);
  const [displayEsriLegend, setDisplayEsriLegend] = useState(false);
  useEffect(() => {
    if (!view || esriLegend) return;

    // create the layer list using the same styles and structure as the
    // esri version.
    const tempLegend = new Legend({
      view,
      container: esriLegendNode,
      layerInfos: [],
    });

    // Create an observer instance linked to the callback function
    const observer = new MutationObserver((_mutationsList, _observerParam) => {
      const esriMessages = esriLegendNode
        ? esriLegendNode.querySelectorAll('.esri-legend__message')
        : [];

      displayEsriLegendNonState = esriMessages.length === 0;
      setDisplayEsriLegend(displayEsriLegendNonState);
    });

    // Start observing the target node for configured mutations
    observer.observe(esriLegendNode, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    observers.push(observer);
    setEsriLegend(tempLegend);
  }, [view, esriLegend, esriLegendNode, observers]);

  // Creates and adds the legend widget to the map
  const rnd = useRef<Rnd | null>(null);
  const [addDataWidget, setAddDataWidget] = useState<HTMLDivElement | null>(
    null,
  );
  useEffect(() => {
    if (!view?.ui || addDataWidget) return;

    const node = document.createElement('div');
    view.ui.add(node, { position: 'top-right', index: 1 });

    render(
      <ShowAddDataWidget
        setAddDataWidgetVisibleParam={setAddDataWidgetVisible}
      />,
      node,
    );

    // Ensures the add data widget stays within the map div
    let width = window.innerWidth;
    function handleResize() {
      const difference = width - window.innerWidth;
      width = window.innerWidth;
      if (difference < 0 || !rnd?.current) return;

      let mapRect = document
        .getElementById('hmw-map-container')
        ?.getBoundingClientRect();
      let awdRect = document
        .getElementById('add-data-widget')
        ?.getBoundingClientRect();

      if (!mapRect || !awdRect) return;

      const maxLeft = mapRect.width - awdRect.width;
      const curLeft = awdRect.left - mapRect.left;

      // update the position of the add data widget
      const newPosition =
        curLeft > maxLeft
          ? maxLeft
          : awdRect.left - mapRect.left - difference / 2;
      rnd.current.updatePosition({
        x: newPosition < 0 ? 0 : newPosition,
        y: rnd.current.draggable.state.y,
      });
    }

    window.addEventListener('resize', handleResize);

    setAddDataWidget(node);
  }, [view, addDataWidget, addDataWidgetVisible, setAddDataWidgetVisible]);

  function ShowAddDataWidget({
    setAddDataWidgetVisibleParam,
  }: {
    setAddDataWidgetVisibleParam: Dispatch<SetStateAction<boolean>>;
  }) {
    const [hover, setHover] = useState(false);

    const widget = document.getElementById('add-data-widget');
    const widgetHidden = widget?.classList.contains('hidden');

    return (
      <div
        className="add-data-widget"
        title={widgetHidden ? 'Open Add Data Widget' : 'Close Add Data Widget'}
        style={hover ? divHoverStyle : divStyle}
        onMouseOver={() => setHover(true)}
        onMouseOut={() => setHover(false)}
        onClick={(_ev) => {
          if (!widget) return;
          if (widgetHidden) {
            widget.classList.remove('hidden');
            setAddDataWidgetVisibleParam(true);
          } else {
            widget.classList.add('hidden');
            setAddDataWidgetVisibleParam(false);
          }
        }}
      >
        <span
          className="esri-icon-add-attachment"
          style={hover ? buttonHoverStyle : buttonStyle}
        />
      </div>
    );
  }

  // Fetch additional legend information. Data is stored in a dictionary
  // where the key is the layer id.
  const [additionalLegendInitialized, setAdditionalLegendInitialized] =
    useState(false);
  const [additionalLegendInfo, setAdditionalLegendInfo] = useState({
    status: 'fetching',
    data: {},
  });
  useEffect(() => {
    if (additionalLegendInitialized) return;

    setAdditionalLegendInitialized(true);

    const requests = [];
    let url = `${services.data.protectedAreasDatabase}/legend?f=json`;
    requests.push(fetchCheck(url, abortSignal));
    url = `${services.data.ejscreen}legend?f=json`;
    requests.push(fetchCheck(url, abortSignal));
    url = `${services.data.mappedWater}/legend?f=json`;
    requests.push(fetchCheck(url, abortSignal));

    Promise.all(requests)
      .then((responses) => {
        additionalLegendInfoNonState = {
          status: 'success',
          data: {
            protectedAreasLayer: responses[0],
            ejscreen: responses[1],
            mappedWaterLayer: responses[2],
          },
        };
        setAdditionalLegendInfo(additionalLegendInfoNonState);
      })
      .catch((err) => {
        if (isAbort(err)) return;
        console.error(err);
        additionalLegendInfoNonState = {
          status: 'failure',
          data: {},
        };
        setAdditionalLegendInfo(additionalLegendInfoNonState);
      });
  }, [abortSignal, additionalLegendInitialized, services]);

  // Creates and adds the basemap/layer list widget to the map
  const [layerListWidget, setLayerListWidget] =
    useState<__esri.LayerList | null>(null);
  useEffect(() => {
    if (
      !view ||
      additionalLegendInfo.status === 'fetching' ||
      layerListWidget
    ) {
      return;
    }

    // create the basemap/layers widget
    const basemapsSource = new PortalBasemapsSource({
      filterFunction: function (basemap) {
        return basemapNames.indexOf(basemap.portalItem.title) !== -1;
      },
      updateBasemapsCallback: function (originalBasemaps) {
        // sort the basemaps based on the ordering of basemapNames
        return originalBasemaps.sort(
          (a, b) =>
            basemapNames.indexOf(a.portalItem.title) -
            basemapNames.indexOf(b.portalItem.title),
        );
      },
    });

    // basemaps
    const basemapContainer = document.createElement('div');
    basemapContainer.className = 'hmw-map-basemaps';

    const basemapWidget = new BasemapGallery({
      container: basemapContainer,
      view: view,
      source: basemapsSource,
    });

    // layers
    const layersContainer = document.createElement('div');
    layersContainer.className = 'hmw-map-layers';

    // Creates actions in the LayerList to monitor layer visibility
    const uniqueParentItems: string[] = [];
    function defineActions(event: { item: __esri.ListItem }) {
      const item = event.item;
      if (
        !item.parent ||
        item.parent.title === 'Demographic Indicators' ||
        item.parent.title === 'Current Location'
      ) {
        //only add the item if it has not been added before
        if (!uniqueParentItems.includes(item.title)) {
          uniqueParentItems.push(item.title);
          updateVisibleLayers(
            view,
            displayEsriLegendNonState,
            hmwLegendNode,
            additionalLegendInfoNonState,
          );

          watchHandles.push(
            item.watch('visible', function (_ev) {
              updateVisibleLayers(
                view,
                displayEsriLegendNonState,
                hmwLegendNode,
                additionalLegendInfoNonState,
              );
              const dict = {
                layerId: item.layer.id,
                visible: item.layer.visible,
              };
              setToggledLayer(dict);
            }),
          );
        }
      }
    }

    const layerlist = new LayerList({
      container: layersContainer,
      view: view,
      // executes for each ListItem in the LayerList
      listItemCreatedFunction: defineActions,
    });

    // container
    const container = document.createElement('div');
    container.className = 'hmw-map-toggle';

    const basemapHeader = document.createElement('h1');
    basemapHeader.innerHTML = 'Basemaps:';

    const layerListHeader = document.createElement('h1');
    layerListHeader.innerHTML = 'Layers:';

    container.appendChild(basemapHeader);
    if (basemapWidget.container instanceof HTMLElement)
      container.appendChild(basemapWidget.container);
    container.appendChild(document.createElement('hr'));
    container.appendChild(layerListHeader);
    if (layerlist.container instanceof HTMLElement)
      container.appendChild(layerlist.container);

    const expandWidget = new Expand({
      expandIconClass: 'esri-icon-layers',
      expandTooltip: 'Open Basemaps and Layers',
      collapseTooltip: 'Close Basemaps and Layers',
      view: view,
      mode: 'floating',
      autoCollapse: true,
      content: container,
    });

    view.ui.add(expandWidget, { position: 'top-right', index: 0 });
    setLayerListWidget(layerlist);
  }, [
    additionalLegendInfo,
    displayEsriLegend,
    hmwLegendNode,
    layerListWidget,
    view,
    watchHandles,
  ]);

  // Sets up the zoom event handler that is used for determining if layers
  // should be visible at the current zoom level.
  useEffect(() => {
    if (!view || mapEventHandlersSet) return;

    // setup map event handlers
    reactiveUtils.watch(
      () => view.zoom,
      () => {
        handleMapZoomChange(view);

        updateVisibleLayers(
          view,
          displayEsriLegendNonState,
          hmwLegendNode,
          additionalLegendInfoNonState,
        );
      },
    );

    // when basemap changes, update the basemap in context for persistent basemaps
    // across fullscreen and mobile/desktop layout changes
    view.map.allLayers.on('change', function (_ev) {
      if (map.basemap !== basemap) {
        setBasemap(map.basemap);
      }
    });

    setMapEventHandlersSet(true);
  }, [
    additionalLegendInfo,
    basemap,
    setBasemap,
    hmwLegendNode,
    map,
    mapEventHandlersSet,
    view,
  ]);

  useEffect(() => {
    if (!layers || layers.length === 0) return;

    //build a list of layers that we care about
    const layerList = [
      'dischargersLayer',
      'monitoringLocationsLayer',
      'usgsStreamgagesLayer',
      'nonprofitsLayer',
      'providersLayer',
      'waterbodyLayer',
      'issuesLayer',
      'actionsLayer',
      'wsioHealthIndexLayer',
      'wildScenicRiversLayer',
      'protectedAreasLayer',
    ];

    // hide/show layers based on the provided list of layers to show
    if (layers) {
      map.layers.forEach((layer) => {
        if (layerList.includes(layer.id)) {
          if (visibleLayers.hasOwnProperty(layer.id)) {
            layer.visible = visibleLayers[layer.id];
            layer.listMode = isGroupLayer(layer) ? 'hide-children' : 'show';
          } else {
            layer.visible = false;
            layer.listMode = 'hide';
          }
        } else if (layer.id === 'currentLocationLayer' && isGroupLayer(layer)) {
          if (visibleLayers.hasOwnProperty('boundariesLayer')) {
            const boundariesLayer = layer.findLayerById('boundariesLayer');
            if (boundariesLayer)
              boundariesLayer.visible = visibleLayers['boundariesLayer'];
          }
        }
      });
    }
  }, [layers, visibleLayers, map]);

  // This code removes any layers that still have a listMode of hide.
  // This is a workaround for an ESRI bug. The operational items are
  // updated automatically when the listModes for the layers are changed,
  // however ESRI always leaves one layer behind that has a listMode equal
  // to hide. The other part of this bug, is if you build a new collection
  // of operationalItems then the layer loading indicators no longer work.
  useEffect(() => {
    if (!layerListWidget) return;

    const numOperationalItems = layerListWidget.operationalItems.length;
    for (let i = numOperationalItems - 1; i >= 0; i--) {
      const item = layerListWidget.operationalItems.at(i);
      if (item.layer.listMode === 'hide') {
        layerListWidget.operationalItems.splice(i, 1);
      }
    }
  }, [layerListWidget, visibleLayers]);

  // create the home widget, layers widget, and setup map zoom change listener
  const [
    fullScreenWidgetCreated,
    setFullScreenWidgetCreated, //
  ] = useState(false);
  useEffect(() => {
    if (fullScreenWidgetCreated) return;

    // create the basemap/layers widget
    const node = document.createElement('div');
    view.ui.add(node, { position: 'bottom-right', index: 0 });
    render(
      <ExpandCollapse
        fullscreenActive={fullscreenActive}
        setFullscreenActive={setFullscreenActive}
        mapViewSetter={setMapView}
      />,
      node,
    );
    setFullScreenWidgetCreated(true);
  }, [
    fullscreenActive,
    setFullscreenActive,
    view,
    setMapView,
    fullScreenWidgetCreated,
  ]);

  // watch for location changes and disable/enable the upstream widget accordingly
  // widget should only be displayed on valid Community page location
  useEffect(() => {
    if (!upstreamWidget) return;

    if (!window.location.pathname.includes('/community')) {
      // hide upstream widget on other pages
      upstreamWidget.style.display = 'none';
      return;
    }

    if (!huc12 || window.location.pathname === '/community') {
      // disable upstream widget on community home or invalid searches
      setUpstreamWidgetDisabled(true);
      return;
    }

    // display and enable the upstream widget
    setUpstreamWidgetDisabled(false);
  }, [huc12, upstreamWidget, setUpstreamWidgetDisabled]);

  useEffect(() => {
    if (!upstreamWidget || !window.location.pathname.includes('/community')) {
      return;
    }

    if (upstreamWidgetDisabled) {
      upstreamWidget.style.opacity = '0.5';
      upstreamWidget.style.cursor = 'default';
    } else {
      upstreamWidget.style.opacity = '1';
      upstreamWidget.style.cursor = 'pointer';
    }
  }, [upstreamWidget, upstreamWidgetDisabled]);

  // create upstream widget
  const [
    upstreamWidgetCreated,
    setUpstreamWidgetCreated, //
  ] = useState(false);
  useEffect(() => {
    if (upstreamWidgetCreated || !view || !view.ui) return;

    const node = document.createElement('div');
    view.ui.add(node, { position: 'top-right', index: 2 });
    setUpstreamWidget(node); // store the widget in context so it can be shown or hidden later
    render(
      <ShowUpstreamWatershed
        abortSignal={abortSignal}
        getWatershedName={getWatershed}
        getHuc12={getHuc12}
        getCurrentExtent={getCurrentExtent}
        getTemplate={getTemplate}
        getUpstreamLayer={getUpstreamLayer}
        setUpstreamLayer={setUpstreamLayer}
        getUpstreamExtent={getUpstreamExtent}
        setUpstreamExtent={setUpstreamExtent}
        setErrorMessage={setErrorMessage}
        services={services}
        getUpstreamWidgetDisabled={getUpstreamWidgetDisabled}
        setUpstreamWidgetDisabled={setUpstreamWidgetDisabled}
        setUpstreamLayerVisible={setUpstreamLayerVisible}
        view={view}
      />,
      node,
    );
    setUpstreamWidgetCreated(true);
  }, [
    abortSignal,
    setUpstreamWidget,
    services,
    getTemplate,
    view,
    upstreamWidgetCreated,
    getWatershed,
    getHuc12,
    getCurrentExtent,
    setUpstreamLayer,
    getUpstreamLayer,
    getUpstreamExtent,
    setUpstreamExtent,
    setErrorMessage,
    getUpstreamWidgetDisabled,
    setUpstreamWidgetDisabled,
    setUpstreamLayerVisible,
  ]);

  const [allWaterbodiesWidget, setAllWaterbodiesWidget] =
    useState<HTMLDivElement | null>(null);
  const [allWaterbodiesLayerVisible, setAllWaterbodiesLayerVisible] =
    useState(true);

  // watch for location changes and disable/enable the all waterbodies widget
  // accordingly widget should only be displayed on valid Community page location
  useEffect(() => {
    if (!allWaterbodiesWidget) return;

    const pathname = window.location.pathname;
    if (!pathname.includes('/community') && !pathname.includes('/tribe')) {
      // hide all waterbodies widget on other pages
      allWaterbodiesWidget.style.display = 'none';
      allWaterbodiesLayer.visible = false;
      return;
    }

    if (!pathname.includes('/tribe') && (!huc12 || pathname === '/community')) {
      // disable all waterbodies widget on community home or invalid searches
      setAllWaterbodiesWidgetDisabled(true);
      allWaterbodiesLayer.visible = false;
      return;
    }

    // change the minScale of the waterbodies layer for the tribal page
    if (pathname.includes('/tribe')) {
      allWaterbodiesLayer.minScale = 4622350;
      allWaterbodiesLayer.layers.forEach((layer: ScaledLayer) => {
        layer.minScale = allWaterbodiesLayer.minScale;
      });

      // enable the all waterbodies widget but default visibility to off
      setAllWaterbodiesWidgetDisabled(false);
      setAllWaterbodiesLayerVisible(false);
      allWaterbodiesLayer.visible = false;
      return;
    }

    // display and enable the all waterbodies widget
    setAllWaterbodiesWidgetDisabled(false);
    allWaterbodiesLayer.visible = true;
  }, [
    huc12,
    allWaterbodiesLayer,
    allWaterbodiesWidget,
    setAllWaterbodiesWidgetDisabled,
  ]);

  // disable the all waterbodies widget if on the community home page
  useEffect(() => {
    const pathname = window.location.pathname;
    if (
      !allWaterbodiesWidget ||
      (!pathname.includes('/community') && !pathname.includes('/tribe'))
    ) {
      return;
    }

    if (allWaterbodiesWidgetDisabled) {
      allWaterbodiesWidget.style.opacity = '0.5';
      allWaterbodiesWidget.style.cursor = 'default';
    } else {
      allWaterbodiesWidget.style.opacity = '1';
      allWaterbodiesWidget.style.cursor = 'pointer';
    }
  }, [allWaterbodiesWidget, allWaterbodiesWidgetDisabled]);

  // watch for changes to all waterbodies layer visibility and update visible
  // layers accordingly
  useEffect(() => {
    updateVisibleLayers(
      view,
      displayEsriLegend,
      hmwLegendNode,
      additionalLegendInfo,
    );
  }, [
    additionalLegendInfo,
    allWaterbodiesLayerVisible,
    displayEsriLegend,
    hmwLegendNode,
    upstreamLayerVisible,
    view,
    visibleLayers,
  ]);

  // create all waterbodies widget
  const [
    allWaterbodiesWidgetCreated,
    setAllWaterbodiesWidgetCreated, //
  ] = useState(false);
  useEffect(() => {
    if (allWaterbodiesWidgetCreated || !view || !view.ui) return;

    const node = document.createElement('div');
    view.ui.add(node, { position: 'top-right', index: 2 });
    setAllWaterbodiesWidget(node); // store the widget in context so it can be shown or hidden later
    render(
      <ShowAllWaterbodies
        allWaterbodiesLayer={allWaterbodiesLayer}
        getDisabled={getAllWaterbodiesWidgetDisabled}
        mapView={view}
        setAllWaterbodiesLayerVisible={setAllWaterbodiesLayerVisible}
        setDisabled={setAllWaterbodiesWidgetDisabled}
      />,
      node,
    );
    setAllWaterbodiesWidgetCreated(true);
  }, [
    allWaterbodiesLayer,
    allWaterbodiesWidgetCreated,
    getAllWaterbodiesWidgetDisabled,
    setAllWaterbodiesWidget,
    setAllWaterbodiesWidgetDisabled,
    view,
  ]);

  if (!addDataWidget) return null;

  const mapWidth = document
    .getElementById('hmw-map-container')
    ?.getBoundingClientRect().width;
  if (!mapWidth) return null;

  const viewportWidth = window.innerWidth;

  return (
    <div
      style={{
        display: addDataWidgetVisible ? 'block' : 'none',
        position: 'absolute',
        top: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {viewportWidth < 960 ? (
        <div
          id="add-data-widget"
          className={addDataWidgetVisible ? '' : 'hidden'}
          style={{
            backgroundColor: 'white',
            pointerEvents: 'all',
            height: '410px',
            width: `${mapWidth}px`,
            position: 'absolute',
            bottom: 0,
          }}
        >
          <AddDataWidget />
        </div>
      ) : (
        <Rnd
          id="add-data-widget"
          className={addDataWidgetVisible ? '' : 'hidden'}
          style={{ backgroundColor: 'white', pointerEvents: 'all' }}
          ref={rnd}
          default={{
            x: (mapWidth - 400 - 60) / 2,
            y: 7.5,
            width: '400px',
            height: '410px',
          }}
          minWidth="275px"
          minHeight="410px"
          bounds="parent"
          enableResizing={{
            bottomRight: true,
          }}
          dragHandleClassName="drag-handle"
        >
          <AddDataWidget />
          <div css={resizeHandleStyles}>
            <img src={resizeIcon} alt="Resize Handle"></img>
          </div>
        </Rnd>
      )}
    </div>
  );
}

const buttonStyle: CSSProperties = {
  margin: '8.5px',
  fontSize: '15px',
  textAlign: 'center',
  verticalAlign: 'middle',

  backgroundColor: 'white',
  color: '#6E6E6E',
};

const buttonHoverStyle: CSSProperties = {
  margin: '8.5px',
  fontSize: '15px',
  textAlign: 'center',
  verticalAlign: 'middle',

  backgroundColor: '#F0F0F0',
  color: 'black',
  cursor: 'pointer',
};

const divStyle = {
  height: '32px',
  width: '32px',
  backgroundColor: 'white',
};

const divHoverStyle = {
  height: '32px',
  width: '32px',
  backgroundColor: '#F0F0F0',
  cursor: 'pointer',
};

type ExpandeCollapseProps = {
  fullscreenActive: boolean;
  setFullscreenActive: Function;
  mapViewSetter: Function;
};

function ExpandCollapse({
  fullscreenActive,
  setFullscreenActive,
  mapViewSetter,
}: ExpandeCollapseProps) {
  const [hover, setHover] = useState(false);

  return (
    <div
      title={
        fullscreenActive
          ? 'Exit Fullscreen Map View'
          : 'Enter Fullscreen Map View'
      }
      style={hover ? divHoverStyle : divStyle}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      onClick={(_ev) => {
        // Toggle scroll bars
        document.documentElement.style.overflow = fullscreenActive
          ? 'auto'
          : 'hidden';

        // Toggle fullscreen mode
        setFullscreenActive(!fullscreenActive);

        mapViewSetter(null);
      }}
    >
      <span
        className={
          fullscreenActive
            ? 'esri-icon esri-icon-zoom-in-fixed'
            : 'esri-icon esri-icon-zoom-out-fixed'
        }
        style={hover ? buttonHoverStyle : buttonStyle}
      />
    </div>
  );
}

type ShowAllWaterbodiesProps = {
  allWaterbodiesLayer: __esri.GroupLayer | '';
  getDisabled: () => boolean;
  mapView: __esri.MapView;
  setAllWaterbodiesLayerVisible: (visible: boolean) => void;
  setDisabled: (disabled: boolean) => void;
};

// Defines the show all waterbodies widget
function ShowAllWaterbodies({
  allWaterbodiesLayer,
  getDisabled,
  mapView,
  setAllWaterbodiesLayerVisible,
  setDisabled,
}: ShowAllWaterbodiesProps) {
  const [firstLoad, setFirstLoad] = useState(true);
  const [hover, setHover] = useState(false);

  // store loading state to Upstream Watershed map widget icon
  const [allWaterbodiesLoading, setAllWaterbodiesLoading] = useState(false);

  // create a watcher to control the loading spinner for the widget
  useEffect(() => {
    if (firstLoad) {
      setFirstLoad(false);

      reactiveUtils.watch(
        () => mapView.updating,
        () => {
          setAllWaterbodiesLoading(mapView.updating);
        },
      );

      reactiveUtils.watch(
        () => mapView.scale,
        () => {
          const newWidgetDisabledVal = allWaterbodiesLayer
            ? mapView.scale >= allWaterbodiesLayer.minScale
            : true;
          if (newWidgetDisabledVal !== getDisabled()) {
            setDisabled(newWidgetDisabledVal);
          }
        },
      );
    }
  }, [
    allWaterbodiesLayer,
    firstLoad,
    getDisabled,
    mapView.scale,
    mapView.updating,
    setDisabled,
  ]);

  const widgetDisabled = getDisabled();

  // get the layer from the mapView
  const layer = mapView.map.layers.find((l) => l.id === 'allWaterbodiesLayer');

  let title = 'View Surrounding Waterbodies';
  if (widgetDisabled) title = 'Surrounding Waterbodies Widget Not Available';
  else if (layer?.visible) title = 'Hide Surrounding Waterbodies';

  return (
    <div
      title={title}
      style={!widgetDisabled && hover ? divHoverStyle : divStyle}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      onClick={(_ev) => {
        // if widget is disabled do nothing
        if (widgetDisabled || !layer) return;

        layer.visible = !layer.visible;
        setAllWaterbodiesLayerVisible(layer.visible);
      }}
    >
      <span
        className={
          allWaterbodiesLoading && !widgetDisabled && layer?.visible
            ? 'esri-icon-loading-indicator esri-rotating'
            : 'esri-icon-maps'
        }
        style={!widgetDisabled && hover ? buttonHoverStyle : buttonStyle}
      />
    </div>
  );
}

type ShowUpstreamWatershedProps = {
  abortSignal: AbortSignal;
  getCurrentExtent: () => __esri.Viewpoint | null;
  getHuc12: () => string;
  getUpstreamExtent: () => __esri.Viewpoint | null;
  getUpstreamLayer: () => (__esri.GraphicsLayer & { error?: boolean }) | '';
  getUpstreamWidgetDisabled: () => boolean;
  getWatershedName: () => string;
  getTemplate: (graphic: Feature) => HTMLDivElement | null;
  services: ServicesState;
  setErrorMessage: (errorMessage: string) => void;
  setUpstreamExtent: (upstreamExtent: __esri.Viewpoint) => void;
  setUpstreamLayer: (
    upstreamLayer: __esri.GraphicsLayer & { error?: boolean },
  ) => void;
  setUpstreamLayerVisible: (upstreamLayerVisible: boolean) => void;
  setUpstreamWidgetDisabled: (upstreamWidgetDisabled: boolean) => void;
  view: __esri.MapView;
};

function ShowUpstreamWatershed({
  abortSignal,
  getWatershedName,
  getHuc12,
  getCurrentExtent,
  getTemplate,
  getUpstreamLayer,
  setUpstreamLayer,
  getUpstreamExtent,
  services,
  setUpstreamExtent,
  setErrorMessage,
  getUpstreamWidgetDisabled,
  setUpstreamWidgetDisabled,
  setUpstreamLayerVisible,
  view,
}: ShowUpstreamWatershedProps) {
  const [hover, setHover] = useState(false);
  const [lastHuc12, setLastHuc12] = useState('');

  // store loading state to Upstream Watershed map widget icon
  const [upstreamLoading, setUpstreamLoading] = useState(false);

  const currentHuc12 = getHuc12();

  const retrieveUpstreamWatershed = useCallback(
    (
      getWatershedName,
      currentHuc12,
      lastHuc12,
      setLastHuc12,
      getCurrentExtent,
      getUpstreamLayer,
      setUpstreamLayer,
      getUpstreamExtent,
      setUpstreamExtent,
      setErrorMessage,
      getUpstreamWidgetDisabled,
      setUpstreamWidgetDisabled,
      setUpstreamLoading,
      getTemplate,
      setUpstreamLayerVisible,
    ) => {
      // if widget is disabled do nothing
      if (getUpstreamWidgetDisabled()) return;
      const upstreamLayer = getUpstreamLayer();
      if (!upstreamLayer) return;

      // if location changed since last widget click, update lastHuc12 state
      if (currentHuc12 !== lastHuc12) {
        setLastHuc12(currentHuc12);
        upstreamLayer.error = false;
      }

      // already encountered an error for this location - don't retry
      if (upstreamLayer.error === true) {
        return;
      }

      // if location hasn't changed and upstream layer is displayed:
      // zoom to current location extent and hide the upstream layer
      if (
        currentHuc12 === lastHuc12 &&
        upstreamLayer.visible &&
        upstreamLayer.graphics.length > 0
      ) {
        view.goTo(getCurrentExtent());
        view.popup.close();
        upstreamLayer.visible = false;
        setUpstreamLayerVisible(false);
        setUpstreamLayer(upstreamLayer);
        return;
      }

      // if location hasn't changed and upstream layer is hidden:
      // zoom to full upstream extent and display the upstream layer
      if (
        currentHuc12 === lastHuc12 &&
        !upstreamLayer.visible &&
        upstreamLayer.graphics.length > 0
      ) {
        view.goTo(getUpstreamExtent());
        upstreamLayer.visible = true;
        setUpstreamLayerVisible(true);
        setUpstreamLayer(upstreamLayer);
        return;
      }

      // fetch the upstream catchment
      const filter = `xwalk_huc12='${currentHuc12}'`;

      setUpstreamLoading(true);

      if (services.status !== 'success') return;
      const url = services.data.upstreamWatershed;

      const queryParams = {
        returnGeometry: true,
        where: filter,
        outFields: ['*'],
        signal: abortSignal,
      };
      query
        .executeQueryJSON(url, queryParams)
        .then((res) => {
          setUpstreamLoading(false);
          const upstreamLayer = getUpstreamLayer();
          const watershed = getWatershedName() || 'Unknown Watershed';
          const upstreamTitle = `Upstream Watershed for Currently Selected Location: ${watershed} (${currentHuc12})`;

          if (!res || !res.features || res.features.length === 0) {
            upstreamLayer.error = true;
            upstreamLayer.graphics.removeAll();
            setUpstreamLayer(upstreamLayer);
            setUpstreamWidgetDisabled(true);
            setUpstreamLayerVisible(false);
            setErrorMessage(
              'Unable to get upstream watershed data for this location.',
            );
            return;
          }

          const geometry = res.features[0].geometry;
          if (isPolygon(geometry)) {
            upstreamLayer.graphics.add(
              new Graphic({
                geometry: new Polygon({
                  spatialReference: res.spatialReference,
                  rings: geometry.rings,
                }),
                symbol: new SimpleFillSymbol({
                  style: 'solid',
                  color: [31, 184, 255, 0.2],
                  outline: {
                    style: 'solid',
                    color: 'black',
                    width: 1,
                  },
                }),
                attributes: res.features[0].attributes,
                popupTemplate: {
                  title: upstreamTitle,
                  content: getTemplate,
                  outFields: ['*'],
                },
              }),
            );
          }

          const upstreamExtent = res.features[0].geometry.extent;

          const currentViewpoint = new Viewpoint({
            targetGeometry: upstreamExtent,
          });

          // store the current viewpoint in context
          setUpstreamExtent(currentViewpoint);

          upstreamLayer.visible = true;
          setUpstreamLayer(upstreamLayer);
          setUpstreamLayerVisible(true);

          // zoom out to full extent
          view.goTo(upstreamExtent);
        })
        .catch((err) => {
          if (isAbort(err)) return;
          setUpstreamLoading(false);
          setUpstreamWidgetDisabled(true);
          setErrorMessage(
            'Error fetching upstream watershed data for this location.',
          );
          upstreamLayer.error = true;
          upstreamLayer.visible = false;
          upstreamLayer.graphics.removeAll();
          setUpstreamLayerVisible(false);
          setUpstreamLayer(upstreamLayer);
        });
    },
    [abortSignal, view, services],
  );

  const upstreamWidgetDisabled = getUpstreamWidgetDisabled();
  const upstreamLayer = getUpstreamLayer();
  if (!upstreamLayer) return null;

  const title = upstreamWidgetDisabled
    ? 'Upstream Widget Not Available'
    : upstreamLayer.visible
    ? 'Hide Upstream Watershed'
    : 'View Upstream Watershed';

  return (
    <div
      title={title}
      style={!upstreamWidgetDisabled && hover ? divHoverStyle : divStyle}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      onClick={(_ev) => {
        retrieveUpstreamWatershed(
          getWatershedName,
          currentHuc12,
          lastHuc12,
          setLastHuc12,
          getCurrentExtent,
          getUpstreamLayer,
          setUpstreamLayer,
          getUpstreamExtent,
          setUpstreamExtent,
          setErrorMessage,
          getUpstreamWidgetDisabled,
          setUpstreamWidgetDisabled,
          setUpstreamLoading,
          getTemplate,
          setUpstreamLayerVisible,
        );
      }}
    >
      <span
        className={
          upstreamLoading
            ? 'esri-icon-loading-indicator esri-rotating'
            : 'esri-icon esri-icon-overview-arrow-top-left'
        }
        style={
          !upstreamWidgetDisabled && hover ? buttonHoverStyle : buttonStyle
        }
      />
    </div>
  );
}

export default MapWidgets;
