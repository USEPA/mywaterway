import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal, render } from 'react-dom';
import { saveAs } from 'file-saver';
import { Rnd } from 'react-rnd';
import Select from 'react-select';
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
import PrintTemplate from '@arcgis/core/rest/support/PrintTemplate';
import PrintVM from '@arcgis/core/widgets/Print/PrintViewModel';
import PortalBasemapsSource from '@arcgis/core/widgets/BasemapGallery/support/PortalBasemapsSource';
import * as query from '@arcgis/core/rest/query';
import ScaleBar from '@arcgis/core/widgets/ScaleBar';
import SpatialReference from '@arcgis/core/geometry/SpatialReference';
import Viewpoint from '@arcgis/core/Viewpoint';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';
// components
import { AccordionList, AccordionItem } from 'components/shared/Accordion';
import AddSaveDataWidget from 'components/shared/AddSaveDataWidget';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import MapLegend from 'components/shared/MapLegend';
import {
  errorBoxStyles,
  successBoxStyles,
} from 'components/shared/MessageBoxes';
import { useSurroundingsWidget } from 'components/shared/SurroundingsWidget';
// contexts
import { useAddSaveDataWidgetState } from 'contexts/AddSaveDataWidget';
import { LocationSearchContext, Status } from 'contexts/locationSearch';
import { useFullscreenState } from 'contexts/Fullscreen';
import { useLayers } from 'contexts/Layers';
import { useServicesContext } from 'contexts/LookupFiles';
import { useSurroundingsState } from 'contexts/Surroundings';
// utilities
import { fetchCheck } from 'utils/fetchUtils';
import {
  hasSublayers,
  isGroupLayer,
  isPolygon,
  shallowCompare,
} from 'utils/mapFunctions';
import { isAbort, isClick } from 'utils/utils';
// helpers
import { useAbort, useDynamicPopup } from 'utils/hooks';
// icons
import resizeIcon from 'images/resize.png';
// types
import type { LayersState } from 'contexts/Layers';
import type {
  CSSProperties,
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from 'react';
import type { Container } from 'react-dom';
import type { Feature, ServicesState } from 'types';
// styles
import { fonts } from 'styles';

/*
## Styles
*/

const instructionContainerStyles = (isVisible: boolean) => css`
  display: ${isVisible ? 'flex' : 'none'};
  flex-direction: column;
  height: 100%;
  justify-content: flex-start;
  pointer-events: none;
  position: absolute;
  width: 100%;
  z-index: 1;

  @media (min-width: 560px) {
    flex-direction: row;
    height: auto;
    justify-content: flex-end;
  }
`;

const instructionStyles = css`
  background-color: white;
  box-shadow: 0 1px 4px rgb(0 0 0 / 80%);
  pointer-events: auto;

  div {
    padding: 0.4em;
  }

  header {
    background-color: #0674ba;
    display: flex;
    justify-content: flex-end;
    padding: 0.2em;
    width: 100%;

    i {
      color: white;
      cursor: pointer;
      padding: 0.2em;

      &:hover {
        background-color: #f3f3f3;
        border-radius: 2px;
        color: #2e2e2e;
      }
    }
  }

  p {
    font-size: 0.8rem;
    font-weight: bold;

    &:first-of-type {
      padding-bottom: 0.5em;
    }

    &:last-of-type {
      padding-bottom: 0;
    }
  }

  @media (min-width: 560px) {
    position: relative;
    right: 62px;
    top: 99px;
    width: 250px;
  }
`;

/*
## Utilities
*/

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

// used to order the layer legends, so the ordering is consistent no matter
// which layer legends are visible.
const orderedLayers = [
  'waterbodyLayer',
  'allWaterbodiesLayer',
  'monitoringLocationsLayer',
  'surroundingMonitoringLocationsLayer',
  'usgsStreamgagesLayer',
  'surroundingUsgsStreamgagesLayer',
  'issuesLayer',
  'dischargersLayer',
  'surroundingDischargersLayer',
  'cyanLayer',
  'surroundingCyanLayer',
  'nonprofitsLayer',
  'providersLayer',
  'upstreamLayer',
  'boundariesLayer',
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
  'landCoverLayer',
  'searchIconLayer',
];

function updateLegend(
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
        layer.sublayers?.forEach((sublayer) => {
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
      (layer.visible && layer.id === 'upstreamLayer') ||
      (layer.visible && layer.id === 'allWaterbodiesLayer') ||
      (layer.visible && layer.id === 'surroundingDischargersLayer') ||
      (layer.visible && layer.id === 'surroundingUsgsStreamgagesLayer') ||
      (layer.visible && layer.id === 'surroundingMonitoringLocationsLayer') ||
      (layer.visible && layer.id === 'surroundingCyanLayer')
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

/*
## Components
*/
type Props = {
  // map and view props auto passed from parent Map component by react-arcgis
  map: __esri.Map;
  mapRef: MutableRefObject<HTMLDivElement | null>;
  view: __esri.MapView;
  layers: Array<__esri.Layer> | null;
  onHomeWidgetRendered?: (homeWidget: __esri.Home) => void;
};

function MapWidgets({
  map,
  mapRef,
  view,
  layers,
  onHomeWidgetRendered = () => {},
}: Props) {
  const {
    addSaveDataWidgetVisible,
    setActiveTabIndex,
    setAddSaveDataWidgetVisible,
    setSaveAsName,
    setSaveDescription,
    widgetLayers,
  } = useAddSaveDataWidgetState();

  const pathname = window.location.pathname;
  const { getSignal } = useAbort();
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
    setBasemap,
    basemap,
    setUpstreamWatershedResponse,
    getCurrentExtent,
    setCurrentExtent,
    getHuc12,
    huc12,
    getUpstreamExtent,
    setUpstreamExtent,
    setErrorMessage,
    getWatershed,
    setMapView,
    getHucBoundaries,
  } = useContext(LocationSearchContext);

  const {
    erroredLayers,
    updateErroredLayers,
    updateVisibleLayers,
    upstreamLayer,
    visibleLayers,
  } = useLayers();

  const services = useServicesContext();

  const { getTemplate } = useDynamicPopup();

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
    map.addMany(widgetLayers.map((layer) => layer.layer));

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

    updateVisibleLayers({ [toggledLayer.layerId]: toggledLayer.visible });
  }, [toggledLayer, lastToggledLayer, updateVisibleLayers]);

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

  const surroundingsWidget = useSurroundingsWidget();
  useEffect(() => {
    if (!view?.ui) return;

    view.ui.add({
      component: surroundingsWidget,
      position: 'top-right',
      index: 1,
    });

    return function cleanup() {
      view?.ui.remove(surroundingsWidget);
    };
  }, [surroundingsWidget, view]);

  // Creates and adds the add/save data widget to the map
  const rnd = useRef<Rnd | null>(null);

  // Ensures the add data widget stays within the map div
  const width = useRef(window.innerWidth);
  const handleResize = useCallback(() => {
    const difference = width.current - window.innerWidth;
    width.current = window.innerWidth;
    if (difference < 0 || !rnd?.current) return;

    let mapRect = document
      .getElementById('hmw-map-container')
      ?.getBoundingClientRect();
    let awdRect = document
      .getElementById('add-save-data-widget')
      ?.getBoundingClientRect();

    if (!mapRect || !awdRect) return;

    const maxLeft = mapRect.width - awdRect.width;
    const curLeft = awdRect.left - mapRect.left;

    // update the position of the add save data widget
    const newPosition =
      curLeft > maxLeft
        ? maxLeft
        : awdRect.left - mapRect.left - difference / 2;
    rnd.current.updatePosition({
      x: newPosition < 0 ? 0 : newPosition,
      y: rnd.current.draggable.state.y,
    });
  }, []);

  const [addSaveDataWidget, setAddSaveDataWidget] =
    useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!view?.ui) return;

    const node = document.createElement('div');
    view.ui.add(node, { position: 'top-right', index: 2 });

    render(
      <ShowAddSaveDataWidget
        addSaveDataWidgetVisible={addSaveDataWidgetVisible}
        setAddSaveDataWidgetVisible={setAddSaveDataWidgetVisible}
      />,
      node,
    );

    window.addEventListener('resize', handleResize);

    setAddSaveDataWidget(node);

    return function cleanup() {
      view?.ui.remove(node);
      window.removeEventListener('resize', handleResize);
    };
  }, [
    view,
    addSaveDataWidgetVisible,
    setAddSaveDataWidgetVisible,
    handleResize,
  ]);

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
    requests.push(fetchCheck(url, getSignal()));
    url = `${services.data.ejscreen}legend?f=json`;
    requests.push(fetchCheck(url, getSignal()));
    url = `${services.data.mappedWater}/legend?f=json`;
    requests.push(fetchCheck(url, getSignal()));

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
  }, [additionalLegendInitialized, getSignal, services]);

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
      if (!item.parent || item.parent.title === 'Demographic Indicators') {
        //only add the item if it has not been added before
        if (!uniqueParentItems.includes(item.title)) {
          uniqueParentItems.push(item.title);
          updateLegend(
            view,
            displayEsriLegendNonState,
            hmwLegendNode,
            additionalLegendInfoNonState,
          );

          watchHandles.push(
            item.watch('visible', function (_ev) {
              updateLegend(
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
        updateLegend(
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

  // create the download widget
  useEffect(() => {
    if (!view || services.status !== 'success') return;

    const container = document.createElement('div');
    render(<DownloadWidget services={services} view={view} />, container);

    const downloadWidget = new Expand({
      expandIconClass: 'esri-icon-download',
      expandTooltip: 'Open Printable Map Widget',
      collapseTooltip: 'Close Printable Map Widget',
      view,
      mode: 'floating',
      autoCollapse: true,
      content: container,
    });

    view?.ui.add(downloadWidget, { position: 'top-right', index: 3 });

    return function cleanup() {
      if (downloadWidget) view?.ui.remove(downloadWidget);
    };
  }, [services, view]);

  // watch for location changes and disable/enable the upstream widget accordingly
  // widget should only be displayed on Tribal page or valid Community page location
  useEffect(() => {
    if (!upstreamWidget) return;

    if (
      pathname === '/community' ||
      (pathname.includes('/community') && !huc12)
    ) {
      // disable upstream widget on community home or invalid searches
      setUpstreamWidgetDisabled(true);
      return;
    }

    // display and enable the upstream widget
    setUpstreamWidgetDisabled(false);
  }, [huc12, upstreamWidget, setUpstreamWidgetDisabled, pathname]);

  useEffect(() => {
    if (!upstreamWidget) {
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

  const setUpstreamLayerErrored = useCallback(
    (isErrored: boolean) => {
      updateErroredLayers({ upstreamLayer: isErrored });
    },
    [updateErroredLayers],
  );

  const { upstreamLayer: upstreamLayerErrored } = erroredLayers;

  // create upstream widget
  useEffect(() => {
    if (!pathname.includes('/community') && !pathname.includes('/tribe'))
      return;
    if (!map || !view?.ui) return;

    const node = document.createElement('div');

    const widget = pathname.includes('/community') ? (
      <ShowCurrentUpstreamWatershed
        abortSignal={getSignal()}
        getCurrentExtent={getCurrentExtent}
        getHuc12={getHuc12}
        getTemplate={getTemplate}
        getUpstreamExtent={getUpstreamExtent}
        getUpstreamWidgetDisabled={getUpstreamWidgetDisabled}
        getWatershed={getWatershed}
        services={services}
        setErrorMessage={setErrorMessage}
        setUpstreamExtent={setUpstreamExtent}
        setUpstreamLayerErrored={setUpstreamLayerErrored}
        setUpstreamWatershedResponse={setUpstreamWatershedResponse}
        setUpstreamWidgetDisabled={setUpstreamWidgetDisabled}
        updateVisibleLayers={updateVisibleLayers}
        upstreamLayer={upstreamLayer}
        upstreamLayerErrored={upstreamLayerErrored}
        view={view}
      />
    ) : (
      <ShowSelectedUpstreamWatershed
        abortSignal={getSignal()}
        getCurrentExtent={getCurrentExtent}
        getHuc12={getHuc12}
        getTemplate={getTemplate}
        getUpstreamExtent={getUpstreamExtent}
        getUpstreamWidgetDisabled={getUpstreamWidgetDisabled}
        getWatershed={getWatershed}
        map={map}
        mapRef={mapRef}
        services={services}
        setErrorMessage={setErrorMessage}
        setUpstreamExtent={setUpstreamExtent}
        setUpstreamLayerErrored={setUpstreamLayerErrored}
        setUpstreamWatershedResponse={setUpstreamWatershedResponse}
        setUpstreamWidgetDisabled={setUpstreamWidgetDisabled}
        setCurrentExtent={setCurrentExtent}
        updateVisibleLayers={updateVisibleLayers}
        upstreamLayer={upstreamLayer}
        upstreamLayerErrored={upstreamLayerErrored}
        upstreamWidget={node}
        view={view}
      />
    );

    render(widget, node);
    setUpstreamWidget(node); // store the widget in context so it can be shown or hidden later
    view.ui.add(node, { position: 'top-right', index: 4 });

    return function cleanup() {
      view?.ui.remove(node);
    };
  }, [
    getCurrentExtent,
    getHuc12,
    getSignal,
    getTemplate,
    getUpstreamExtent,
    getUpstreamWidgetDisabled,
    getWatershed,
    map,
    mapRef,
    pathname,
    services,
    setCurrentExtent,
    setErrorMessage,
    setUpstreamExtent,
    setUpstreamLayerErrored,
    setUpstreamWatershedResponse,
    setUpstreamWidget,
    setUpstreamWidgetDisabled,
    updateVisibleLayers,
    upstreamLayer,
    upstreamLayerErrored,
    view,
  ]);

  const { visible: surroundingsVisible } = useSurroundingsState();

  // watch for changes to all waterbodies layer visibility and update visible
  // layers accordingly
  useEffect(() => {
    updateLegend(view, displayEsriLegend, hmwLegendNode, additionalLegendInfo);
  }, [
    additionalLegendInfo,
    surroundingsVisible,
    displayEsriLegend,
    hmwLegendNode,
    view,
    visibleLayers,
  ]);

  // Focus on the add/save data widget when it is first opened
  useEffect(() => {
    if (!addSaveDataWidgetVisible) return;
    document.getElementById('add-save-data-widget')?.focus();
  }, [addSaveDataWidgetVisible]);

  // Reset the add/save data widget values when users change pages
  useEffect(() => {
    setActiveTabIndex(0);
    setAddSaveDataWidgetVisible(false);
    setSaveAsName('');
    setSaveDescription('');
  }, [
    setActiveTabIndex,
    setAddSaveDataWidgetVisible,
    setSaveAsName,
    setSaveDescription,
  ]);

  if (!addSaveDataWidget) return null;

  const mapWidth = document
    .getElementById('hmw-map-container')
    ?.getBoundingClientRect().width;
  if (!mapWidth) return null;

  const viewportWidth = window.innerWidth;

  return (
    <div
      style={{
        display: addSaveDataWidgetVisible ? 'block' : 'none',
        position: 'absolute',
        top: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {viewportWidth < 960 ? (
        <div
          id="add-save-data-widget"
          className={addSaveDataWidgetVisible ? '' : 'hidden'}
          role="region"
          style={{
            backgroundColor: 'white',
            pointerEvents: 'all',
            height: '410px',
            width: `${mapWidth}px`,
            position: 'absolute',
            bottom: 0,
          }}
          tabIndex={0}
        >
          <AddSaveDataWidget />
        </div>
      ) : (
        <Rnd
          id="add-save-data-widget"
          className={addSaveDataWidgetVisible ? '' : 'hidden'}
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
          role="region"
          tabIndex={0}
        >
          <AddSaveDataWidget />
          <div css={resizeHandleStyles}>
            <img src={resizeIcon} alt="Resize Handle"></img>
          </div>
        </Rnd>
      )}
    </div>
  );
}

function ShowAddSaveDataWidget({
  addSaveDataWidgetVisible,
  setAddSaveDataWidgetVisible,
}: {
  addSaveDataWidgetVisible: boolean;
  setAddSaveDataWidgetVisible: Dispatch<SetStateAction<boolean>>;
}) {
  const [hover, setHover] = useState(false);

  const clickHandler = useCallback(
    (ev: React.MouseEvent | React.KeyboardEvent) => {
      if (!isClick(ev)) return;
      const widget = document.getElementById('add-save-data-widget');
      if (!widget) return;

      const widgetHidden = widget.classList.contains('hidden');
      if (widgetHidden) {
        widget.classList.remove('hidden');
        setAddSaveDataWidgetVisible(true);
      } else {
        widget.classList.add('hidden');
        setAddSaveDataWidgetVisible(false);
      }
    },
    [setAddSaveDataWidgetVisible],
  );

  return (
    <div
      className="add-save-data-widget"
      title={
        !addSaveDataWidgetVisible
          ? 'Open Add & Save Data Widget'
          : 'Close Add & Save Data Widget'
      }
      style={hover ? divHoverStyle : divStyle}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      onClick={clickHandler}
      onKeyDown={clickHandler}
      role="button"
      tabIndex={0}
    >
      <span
        aria-hidden="true"
        className={
          addSaveDataWidgetVisible
            ? 'esri-icon-collapse'
            : 'esri-icon-add-attachment'
        }
        style={hover ? buttonHoverStyle : buttonStyle}
      />
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

  const clickHandler = useCallback(
    (ev: React.KeyboardEvent | React.MouseEvent) => {
      if (!isClick(ev)) return;
      // Toggle scroll bars
      document.documentElement.style.overflow = fullscreenActive
        ? 'auto'
        : 'hidden';

      // Toggle fullscreen mode
      setFullscreenActive(!fullscreenActive);

      mapViewSetter(null);
    },
    [fullscreenActive, mapViewSetter, setFullscreenActive],
  );

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
      onClick={clickHandler}
      onKeyDown={clickHandler}
      role="button"
      tabIndex={0}
    >
      <span
        aria-hidden="true"
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

function retrieveUpstreamWatershed(
  abortSignal: AbortSignal,
  getCurrentExtent: () => __esri.Extent,
  getHuc12: () => string,
  getTemplate: (graphic: Feature) => HTMLDivElement | null,
  getUpstreamExtent: () => __esri.Extent,
  upstreamLayer: __esri.GraphicsLayer | null,
  getUpstreamWidgetDisabled: () => boolean,
  getWatershed: () => string,
  lastHuc12: string,
  services: ServicesState,
  setErrorMessage: Dispatch<SetStateAction<string>>,
  setLastHuc12: Dispatch<SetStateAction<string>>,
  setUpstreamExtent: Dispatch<SetStateAction<__esri.Viewpoint>>,
  setUpstreamLayerErrored: (isErrored: boolean) => void,
  updateVisibleLayers: (
    updates?: Partial<LayersState['visible']>,
    merge?: boolean,
  ) => void,
  setUpstreamWatershedResponse: Dispatch<
    SetStateAction<{ status: Status; data: __esri.FeatureSet | null }>
  >,
  setUpstreamWidgetDisabled: Dispatch<SetStateAction<boolean>>,
  view: __esri.MapView | null,
  setUpstreamLoading: Dispatch<SetStateAction<boolean>>,
  upstreamLayerErrored: boolean,
  huc12 = null,
  canDisable = true,
) {
  // if widget is disabled do nothing
  if (getUpstreamWidgetDisabled()) return;
  if (!upstreamLayer) return;

  const currentHuc12 = huc12 ?? getHuc12();
  // if location changed since last widget click, update lastHuc12 state
  if (currentHuc12 !== lastHuc12) {
    setLastHuc12(currentHuc12);
    setErrorMessage('');
    setUpstreamLayerErrored(false);
  }

  // already encountered an error for this location - don't retry
  if (upstreamLayerErrored) return;

  // if upstream layer is displayed, zoom to
  // current location extent and hide the upstream layer
  if (
    currentHuc12 === lastHuc12 &&
    upstreamLayer.visible &&
    upstreamLayer.graphics.length > 0
  ) {
    const currentExtent = getCurrentExtent();
    currentExtent && view?.goTo(currentExtent);
    view?.popup.close();
    upstreamLayer.visible = false;
    updateVisibleLayers({ upstreamLayer: false });
    return;
  }

  // if upstream layer is hidden, zoom to full
  // upstream extent and display the upstream layer
  if (
    currentHuc12 === lastHuc12 &&
    !upstreamLayer.visible &&
    upstreamLayer.graphics.length > 0
  ) {
    view?.goTo(getUpstreamExtent());
    upstreamLayer.visible = true;
    updateVisibleLayers({ upstreamLayer: true });
    return;
  }

  // fetch the upstream catchment
  const filter = `xwalk_huc12='${currentHuc12}'`;

  setUpstreamLoading(true);
  setUpstreamWatershedResponse({ status: 'fetching', data: null });

  if (services.status !== 'success') return;
  const url = services.data.upstreamWatershed;

  const queryParams = {
    returnGeometry: true,
    where: filter,
    outFields: ['*'],
    signal: abortSignal,
  };
  return query
    .executeQueryJSON(url, queryParams)
    .then((res) => {
      setUpstreamLoading(false);
      setUpstreamWatershedResponse({ status: 'success', data: res });
      const watershed = getWatershed() || 'Unknown Watershed';
      const upstreamTitle = `Upstream Watershed for Currently Selected Location: ${watershed} (${currentHuc12})`;

      if (!res?.features?.length) {
        setUpstreamLayerErrored(true);
        upstreamLayer.graphics.removeAll();
        canDisable && setUpstreamWidgetDisabled(true);
        updateVisibleLayers({ upstreamLayer: false });
        setErrorMessage(
          `No upstream watershed data available for ${
            huc12 ? 'the selected' : 'this'
          } location.`,
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
      updateVisibleLayers({ upstreamLayer: true });

      // zoom out to full extent
      view?.goTo(upstreamExtent);

      return res.features[0];
    })
    .catch((err) => {
      if (isAbort(err)) return;
      setUpstreamLoading(false);
      setUpstreamWatershedResponse({ status: 'failure', data: null });
      canDisable && setUpstreamWidgetDisabled(true);
      setUpstreamLayerErrored(true);
      upstreamLayer.visible = false;
      upstreamLayer.graphics.removeAll();
      updateVisibleLayers({ upstreamLayer: false });
      console.error(err);
      setErrorMessage(
        `Error fetching upstream watershed data for ${
          huc12 ? 'the selected' : 'this'
        } location.`,
      );
    });
}

interface ShowUpstreamWatershedProps {
  getUpstreamWidgetDisabled: () => boolean;
  onClick: (ev: React.MouseEvent | React.KeyboardEvent) => void;
  selectionActive?: boolean;
  upstreamLayer: __esri.GraphicsLayer | null;
  upstreamLoading: boolean;
}

function ShowUpstreamWatershed({
  getUpstreamWidgetDisabled,
  onClick,
  selectionActive = false,
  upstreamLayer,
  upstreamLoading,
}: ShowUpstreamWatershedProps) {
  const [hover, setHover] = useState(false);

  const upstreamWidgetDisabled = getUpstreamWidgetDisabled();

  // This useEffect/watcher is here to ensure the correct title and icon
  // are being shown. Without this the icon/title don't change until
  // the user moves the mouse off of the button.
  const [watcher, setWatcher] = useState<IHandle | null>(null);
  const [upstreamVisible, setUpstreamVisible] = useState(false);
  useEffect(() => {
    if (!upstreamLayer || watcher) return;

    setWatcher(
      reactiveUtils.watch(
        () => upstreamLayer.visible,
        () => setUpstreamVisible(upstreamLayer.visible),
      ),
    );
  }, [upstreamLayer, watcher]);

  if (!upstreamLayer) return null;

  let title = 'View Upstream Watershed';
  if (upstreamWidgetDisabled) title = 'Upstream Widget Not Available';
  else if (upstreamVisible) title = 'Hide Upstream Watershed';
  else if (selectionActive) title = 'Cancel Watershed Selection';

  let iconClass = 'esri-icon esri-icon-overview-arrow-top-left';
  if (upstreamVisible) iconClass = 'esri-icon-collapse';
  if (upstreamLoading) iconClass = 'esri-icon-loading-indicator esri-rotating';

  return (
    <div
      title={title}
      style={!upstreamWidgetDisabled && hover ? divHoverStyle : divStyle}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      onClick={onClick}
      onKeyDown={onClick}
      role="button"
      tabIndex={0}
    >
      <span
        aria-hidden="true"
        className={iconClass}
        style={
          !upstreamWidgetDisabled && hover ? buttonHoverStyle : buttonStyle
        }
      />
    </div>
  );
}

type ShowCurrentUpstreamWatershedProps = Omit<
  ShowUpstreamWatershedProps,
  'onClick' | 'selectionActive' | 'upstreamLoading'
> & {
  abortSignal: AbortSignal;
  getCurrentExtent: () => __esri.Extent;
  getHuc12: () => string;
  getTemplate: (graphic: Feature) => HTMLDivElement | null;
  getUpstreamExtent: () => __esri.Extent;
  upstreamLayer: __esri.GraphicsLayer | null;
  getUpstreamWidgetDisabled: () => boolean;
  getWatershed: () => string;
  services: ServicesState;
  setErrorMessage: Dispatch<SetStateAction<string>>;
  setUpstreamExtent: Dispatch<SetStateAction<__esri.Viewpoint>>;
  setUpstreamLayerErrored: (isErrored: boolean) => void;
  setUpstreamWatershedResponse: Dispatch<
    SetStateAction<{ status: Status; data: __esri.FeatureSet | null }>
  >;
  setUpstreamWidgetDisabled: Dispatch<SetStateAction<boolean>>;
  updateVisibleLayers: (
    updates?: Partial<LayersState['visible']>,
    merge?: boolean,
  ) => void;
  upstreamLayerErrored: boolean;
  view: __esri.MapView | null;
};

function ShowCurrentUpstreamWatershed({
  abortSignal,
  getCurrentExtent,
  getHuc12,
  getTemplate,
  getUpstreamExtent,
  upstreamLayer,
  getUpstreamWidgetDisabled,
  getWatershed,
  services,
  setErrorMessage,
  setUpstreamExtent,
  setUpstreamLayerErrored,
  updateVisibleLayers,
  setUpstreamWatershedResponse,
  setUpstreamWidgetDisabled,
  upstreamLayerErrored,
  view,
}: ShowCurrentUpstreamWatershedProps) {
  const [lastHuc12, setLastHuc12] = useState<string>('');
  const [upstreamLoading, setUpstreamLoading] = useState(false);

  const handleClick = useCallback(
    (ev: React.MouseEvent | React.KeyboardEvent) => {
      if (!isClick(ev)) return;

      retrieveUpstreamWatershed(
        abortSignal,
        getCurrentExtent,
        getHuc12,
        getTemplate,
        getUpstreamExtent,
        upstreamLayer,
        getUpstreamWidgetDisabled,
        getWatershed,
        lastHuc12,
        services,
        setErrorMessage,
        setLastHuc12,
        setUpstreamExtent,
        setUpstreamLayerErrored,
        updateVisibleLayers,
        setUpstreamWatershedResponse,
        setUpstreamWidgetDisabled,
        view,
        setUpstreamLoading,
        upstreamLayerErrored,
      );
    },
    [
      abortSignal,
      getCurrentExtent,
      getHuc12,
      getTemplate,
      getUpstreamExtent,
      getUpstreamWidgetDisabled,
      getWatershed,
      lastHuc12,
      services,
      setErrorMessage,
      setUpstreamExtent,
      setUpstreamLayerErrored,
      setUpstreamWatershedResponse,
      setUpstreamWidgetDisabled,
      updateVisibleLayers,
      upstreamLayer,
      upstreamLayerErrored,
      view,
    ],
  );
  return (
    <ShowUpstreamWatershed
      getUpstreamWidgetDisabled={getUpstreamWidgetDisabled}
      onClick={handleClick}
      upstreamLayer={upstreamLayer}
      upstreamLoading={upstreamLoading}
    />
  );
}

type ShowSelectedUpstreamWatershedProps = ShowCurrentUpstreamWatershedProps & {
  map: __esri.Map;
  mapRef: MutableRefObject<HTMLDivElement | null>;
  setCurrentExtent: Dispatch<SetStateAction<__esri.Extent>>;
  upstreamWidget: HTMLDivElement;
};

function ShowSelectedUpstreamWatershed({
  abortSignal,
  getCurrentExtent,
  getHuc12,
  getTemplate,
  getUpstreamExtent,
  getUpstreamWidgetDisabled,
  getWatershed,
  services,
  setErrorMessage,
  setUpstreamExtent,
  setUpstreamLayerErrored,
  setUpstreamWatershedResponse,
  setUpstreamWidgetDisabled,
  updateVisibleLayers,
  upstreamLayer,
  view,
  map,
  mapRef,
  setCurrentExtent,
  upstreamLayerErrored,
  upstreamWidget,
}: ShowSelectedUpstreamWatershedProps) {
  // Record visibility state of watersheds layer to restore later
  const [watershedsVisible, setWatershedsVisible] = useState(false);

  // Store the watersheds layer instance for later access
  const [watershedsLayer, setWatershedsLayer] = useState<__esri.Layer | null>(
    null,
  );

  useEffect(() => {
    if (!map) return;

    const newWatershedsLayer = map.findLayerById('watershedsLayer');
    setWatershedsLayer(newWatershedsLayer);
    newWatershedsLayer && setWatershedsVisible(newWatershedsLayer.visible);
  }, [map]);

  const [selectionActive, setSelectionActive] = useState(false);
  const [instructionsVisible, setInstructionsVisible] = useState(false);

  // Show/hide instruction dialogue when watershed selection activity changes
  useEffect(() => {
    setInstructionsVisible(selectionActive);
    upstreamWidget.style.filter = selectionActive
      ? 'invert(0.8) brightness(1.5) contrast(1.5)'
      : 'none';
  }, [selectionActive, upstreamWidget]);

  // Disable "selection mode" and/or restore the
  // initial visibility of the watersheds layer
  const cancelSelection = useCallback(() => {
    if (watershedsLayer) watershedsLayer.visible = watershedsVisible;
    setSelectionActive(false);
  }, [watershedsLayer, watershedsVisible]);

  // Get the selected watershed, search for
  // its upstream watershed, and draw it
  const [lastHuc12, setLastHuc12] = useState<string>('');
  const [upstreamLoading, setUpstreamLoading] = useState(false);

  const handleHucSelection = useCallback(
    (ev) => {
      setSelectionActive(false);

      if (!view) return;
      if (services.status !== 'success') return;

      // Get the point location of the user's click
      const point = new Point({
        x: ev.mapPoint.longitude,
        y: ev.mapPoint.latitude,
        spatialReference: SpatialReference.WGS84,
      });

      const location = webMercatorUtils.geographicToWebMercator(point) as Point;

      const queryParams = {
        returnGeometry: true,
        geometry: location,
        outFields: ['*'],
      };

      // Get the huc12 associated with the map point
      return query
        .executeQueryJSON(services.data.wbd, queryParams)
        .then((boundaries) => {
          if (boundaries.features.length === 0) {
            setErrorMessage(
              'No watershed data available for the selected location.',
            );
            return;
          }

          setCurrentExtent(view.extent);

          const { attributes } = boundaries.features[0];
          return retrieveUpstreamWatershed(
            abortSignal,
            getCurrentExtent,
            getHuc12,
            getTemplate,
            getUpstreamExtent,
            upstreamLayer,
            getUpstreamWidgetDisabled,
            getWatershed,
            lastHuc12,
            services,
            setErrorMessage,
            setLastHuc12,
            setUpstreamExtent,
            setUpstreamLayerErrored,
            updateVisibleLayers,
            setUpstreamWatershedResponse,
            setUpstreamWidgetDisabled,
            view,
            setUpstreamLoading,
            upstreamLayerErrored,
            attributes.huc12,
            false,
          );
        })
        .catch((err) => {
          console.error(err);
          setErrorMessage(
            'Error fetching watershed data for the selected location.',
          );
        });
    },
    [
      abortSignal,
      getCurrentExtent,
      getHuc12,
      getTemplate,
      getUpstreamExtent,
      getUpstreamWidgetDisabled,
      getWatershed,
      lastHuc12,
      services,
      setCurrentExtent,
      setErrorMessage,
      setUpstreamExtent,
      setUpstreamLayerErrored,
      setUpstreamWatershedResponse,
      setUpstreamWidgetDisabled,
      updateVisibleLayers,
      upstreamLayer,
      upstreamLayerErrored,
      view,
    ],
  );

  // Create the map click listener, which only
  // triggers if "selection mode" is enabled
  useEffect(() => {
    if (!view) return;
    const mapClickHandler = view.on('click', async (ev) => {
      if (!selectionActive) return;
      let res;
      try {
        res = await handleHucSelection(ev);
      } catch (err) {
        console.error(err);
      }
      if (!res) cancelSelection();
    });

    return function cleanup() {
      mapClickHandler.remove();
    };
  }, [cancelSelection, handleHucSelection, selectionActive, view]);

  // Create a global click listener to stop "selection mode"
  // clicks if the user clicks away from the map
  useEffect(() => {
    const handleClick = (ev: MouseEvent) => {
      if (selectionActive && !mapRef.current?.contains(ev.target as Node)) {
        cancelSelection();
      }
    };
    window.addEventListener('click', handleClick);

    return function cleanup() {
      window.removeEventListener('click', handleClick);
    };
  }, [cancelSelection, mapRef, selectionActive]);

  // Enable triggering of the map click handler if the upstream
  // watershed is not visible, otherwise hide the upstream watershed
  const selectUpstream = useCallback(
    (_ev) => {
      if (!upstreamLayer) return;

      if (upstreamLayer.visible) {
        const currentExtent = getCurrentExtent();
        currentExtent && view?.goTo(currentExtent);

        setInstructionsVisible(false);

        upstreamLayer.visible = false;
        upstreamLayer.graphics.removeAll();
        updateVisibleLayers({ upstreamLayer: false });

        if (watershedsLayer) watershedsLayer.visible = watershedsVisible;
        return;
      }

      if (watershedsLayer) {
        setWatershedsVisible(watershedsLayer.visible);
        watershedsLayer.visible = true;
      }

      setSelectionActive(true);
    },
    [
      getCurrentExtent,
      updateVisibleLayers,
      upstreamLayer,
      view,
      watershedsLayer,
      watershedsVisible,
    ],
  );

  return (
    <>
      {mapRef.current &&
        createPortal(
          <div css={instructionContainerStyles(instructionsVisible)}>
            <div css={instructionStyles}>
              <header>
                <i
                  className="esri-icon-close"
                  onClick={(_ev) => setInstructionsVisible(false)}
                />
              </header>
              <div>
                <p>
                  Click a location on the map to view its upstream watershed.
                </p>
              </div>
            </div>
          </div>,
          mapRef.current,
        )}
      <ShowUpstreamWatershed
        getUpstreamWidgetDisabled={getUpstreamWidgetDisabled}
        onClick={selectionActive ? cancelSelection : selectUpstream}
        selectionActive={selectionActive}
        upstreamLayer={upstreamLayer}
        upstreamLoading={upstreamLoading}
      />
    </>
  );
}

const advanceContainerStyles = css`
  padding: 10px;
`;

const checkboxStyles = css`
  display: flex;
  gap: 0.25rem;
`;

const downloadButtonStyles = css`
  margin-top: 10px;
  width: 100%;
`;

const downloadWidgetContainerStyles = css`
  padding: 12px 10px 0;

  h1 {
    font-family: ${fonts.primary};
    font-size: 1.25em;
    font-weight: 500;
    line-height: 1.2;
    margin: 0 0 12px 0;
    padding: 0;
  }

  label {
    width: 100%;
    font-size: 16px;
    margin-bottom: 0.5rem;
  }
`;

const inputStyles = css`
  width: 100%;
  height: 36px;
  padding: 2px 8px;
  border-width: 1px;
  border-style: solid;
  border-radius: 4px;
  border-color: hsl(0, 0%, 80%);
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles};
  text-align: center;
  margin-top: 0.625rem;
`;

const modifiedSuccessBoxStyles = css`
  ${successBoxStyles};
  text-align: center;
  margin-top: 0.625rem;
`;

const scaleContainerStyles = css`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;

  button {
    width: 36px;
    height: 36px;
  }
`;

const sizeContainerStyles = css`
  display: flex;
  align-items: center;
  justify-content: space-between;

  button {
    background-color: #f0f6f9;
  }

  div {
    flex: 0 0 43%;
  }
`;

type FormatOptionType =
  | { value: 'pdf'; label: 'PDF'; extension: 'pdf' }
  | { value: 'png32'; label: 'PNG'; extension: 'png' }
  | { value: 'jpg'; label: 'JPG'; extension: 'jpg' }
  | { value: 'gif'; label: 'GIF'; extension: 'gif' }
  | { value: 'svg'; label: 'SVG'; extension: 'svg' };

type LayoutOptionType =
  | { value: 'a3-landscape'; label: 'A3 Landscape' }
  | { value: 'a3-portrait'; label: 'A3 Portrait' }
  | { value: 'a4-landscape'; label: 'A4 Landscape' }
  | { value: 'a4-portrait'; label: 'A4 Portrait' }
  | { value: 'letter-ansi-a-landscape'; label: 'Letter ANSI A Landscape' }
  | { value: 'letter-ansi-a-portrait'; label: 'Letter ANSI A Portrait' }
  | { value: 'tabloid-ansi-b-landscape'; label: 'Tabloid ANSI B Landscape' }
  | { value: 'tabloid-ansi-b-portrait'; label: 'Tabloid ANSI B Portrait' };

type DownloadWidgetProps = {
  services: ServicesState;
  view: __esri.MapView;
};

function DownloadWidget({ services, view }: DownloadWidgetProps) {
  const formatOptions: FormatOptionType[] = [
    { value: 'pdf', label: 'PDF', extension: 'pdf' },
    { value: 'png32', label: 'PNG', extension: 'png' },
    { value: 'jpg', label: 'JPG', extension: 'jpg' },
    { value: 'gif', label: 'GIF', extension: 'gif' },
    { value: 'svg', label: 'SVG', extension: 'svg' },
  ];

  const layoutOptions: LayoutOptionType[] = [
    { value: 'a3-landscape', label: 'A3 Landscape' },
    { value: 'a3-portrait', label: 'A3 Portrait' },
    { value: 'a4-landscape', label: 'A4 Landscape' },
    { value: 'a4-portrait', label: 'A4 Portrait' },
    { value: 'letter-ansi-a-landscape', label: 'Letter ANSI A Landscape' },
    { value: 'letter-ansi-a-portrait', label: 'Letter ANSI A Portrait' },
    { value: 'tabloid-ansi-b-landscape', label: 'Tabloid ANSI B Landscape' },
    { value: 'tabloid-ansi-b-portrait', label: 'Tabloid ANSI B Portrait' },
  ];

  const [attributionVisible, setAttributionVisible] = useState(true);
  const [author, setAuthor] = useState('');
  const [copyright, setCopyright] = useState('');
  const [dpi, setDpi] = useState(96);
  const [enableScale, setEnableScale] = useState(false);
  const [scale, setScale] = useState(0);
  const [format, setFormat] = useState<FormatOptionType>(formatOptions[0]);
  const [includeLegend, setIncludeLegend] = useState(true);
  const [layout, setLayout] = useState<LayoutOptionType>(
    layoutOptions.find((o) => o.value === 'letter-ansi-a-landscape') ??
      layoutOptions[0],
  );
  const [northArrowVisible, setNorthArrowVisible] = useState(false);
  const [status, setStatus] = useState<
    'idle' | 'fetching' | 'success' | 'failure'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [title, setTitle] = useState('');
  const [height, setHeight] = useState(1100);
  const [width, setWidth] = useState(800);

  // Initializes a watcher to sync the view's scale.
  useEffect(() => {
    const scaleHandle = reactiveUtils.watch(
      () => view.scale,
      () => {
        if (!enableScale) setScale(view.scale);
      },
      { initial: true },
    );
    return function cleanup() {
      scaleHandle.remove();
    };
  }, [enableScale, view]);

  return (
    <div
      className="esri-widget esri-widget--panel-height-only"
      css={downloadWidgetContainerStyles}
    >
      <h1>Download Printable Map</h1>
      <div>
        <label>
          Title
          <input
            css={inputStyles}
            type="text"
            value={title}
            onChange={(ev) => setTitle(ev.target.value)}
          />
        </label>
      </div>
      <div>
        <label>
          File Format
          <Select
            menuPosition="fixed"
            inputId="url-type-select"
            isSearchable={false}
            value={format}
            onChange={(ev) => {
              setFormat(ev as FormatOptionType);
            }}
            options={formatOptions}
          />
        </label>
      </div>
      <div>
        <label css={checkboxStyles}>
          <input
            type="checkbox"
            checked={includeLegend}
            onChange={() => setIncludeLegend(!includeLegend)}
          />
          Include Legend
        </label>
      </div>
      {includeLegend && (
        <div>
          <label>
            Page setup
            <Select
              menuPosition="fixed"
              isSearchable={false}
              value={layout}
              onChange={(ev) => {
                setLayout(ev as LayoutOptionType);
              }}
              options={layoutOptions}
            />
          </label>
        </div>
      )}
      <AccordionList expandDisabled={true}>
        <AccordionItem status={'highlighted'} title="Advanced">
          <div css={advanceContainerStyles}>
            {!includeLegend && (
              <div css={sizeContainerStyles}>
                <div>
                  <label>
                    Width:
                    <input
                      css={inputStyles}
                      type="number"
                      value={width}
                      onChange={(ev) => setWidth(ev.target.valueAsNumber)}
                    />
                  </label>
                </div>
                <div>
                  <label>
                    Height:
                    <input
                      css={inputStyles}
                      type="number"
                      value={height}
                      onChange={(ev) => setHeight(ev.target.valueAsNumber)}
                    />
                  </label>
                </div>
                <button
                  className="esri-widget--button esri-print__swap-button esri-icon-swap"
                  aria-label="swap"
                  onClick={() => {
                    const newWidth = height;
                    const newHeight = width;
                    setWidth(newWidth);
                    setHeight(newHeight);
                  }}
                />
              </div>
            )}
            <div>
              <label css={checkboxStyles}>
                <input
                  type="checkbox"
                  checked={enableScale}
                  onChange={() => setEnableScale(!enableScale)}
                />
                Set scale
              </label>
            </div>
            <div css={scaleContainerStyles}>
              <input
                css={inputStyles}
                type="number"
                aria-label="scale"
                disabled={!enableScale}
                value={scale}
                onChange={(ev) => setScale(ev.target.valueAsNumber)}
              />
              <button
                aria-label="reset scale"
                className="esri-widget--button esri-print__refresh-button esri-icon-refresh"
                onClick={() => {
                  setScale(view.scale);
                }}
              />
            </div>
            {includeLegend && (
              <>
                <div>
                  <label>
                    Author
                    <input
                      css={inputStyles}
                      type="text"
                      value={author}
                      onChange={(ev) => setAuthor(ev.target.value)}
                    />
                  </label>
                </div>
                <div>
                  <label>
                    Copyright
                    <input
                      css={inputStyles}
                      type="text"
                      value={copyright}
                      onChange={(ev) => setCopyright(ev.target.value)}
                    />
                  </label>
                </div>
              </>
            )}
            <div>
              <label>
                DPI
                <input
                  css={inputStyles}
                  type="number"
                  value={dpi}
                  onChange={(ev) => setDpi(ev.target.valueAsNumber)}
                />
              </label>
            </div>
            <div>
              {includeLegend ? (
                <label css={checkboxStyles}>
                  <input
                    type="checkbox"
                    checked={northArrowVisible}
                    onChange={() => setNorthArrowVisible(!northArrowVisible)}
                  />
                  Include north arrow
                </label>
              ) : (
                <label css={checkboxStyles}>
                  <input
                    type="checkbox"
                    checked={attributionVisible}
                    onChange={() => setAttributionVisible(!attributionVisible)}
                  />
                  Include attribution
                </label>
              )}
            </div>
          </div>
        </AccordionItem>
      </AccordionList>

      {status === 'fetching' && <LoadingSpinner />}

      {status === 'success' && (
        <div css={modifiedSuccessBoxStyles}>
          <p>Download succeeded. Please check your destination folder.</p>
        </div>
      )}
      {status === 'failure' && (
        <div css={modifiedErrorBoxStyles}>
          <p>{errorMessage}</p>
        </div>
      )}

      <button
        css={downloadButtonStyles}
        disabled={status === 'fetching'}
        onClick={() => {
          if (!view || services.status !== 'success') return;

          if (!title) {
            setStatus('failure');
            setErrorMessage('Please provide a title and try again.');
            return;
          }

          setStatus('fetching');

          const template = new PrintTemplate({
            attributionVisible,
            exportOptions: {
              width,
              height,
              dpi,
            },
            format: format.value,
            layout: includeLegend ? layout.value : 'map-only',
            layoutOptions: {
              titleText: title,
              authorText: author,
              copyrightText: copyright,
              elementOverrides: {
                'North Arrow': {
                  visible: northArrowVisible,
                },
              },
            },
            outScale: scale,
          });

          const printVm = new PrintVM({
            printServiceUrl: services.data.printService,
            view,
          });

          function download(retryCount: number = 0) {
            printVm
              .print(template)
              .then((res) => {
                saveAs(res.url, `${title}.${format.extension}`);
                setStatus('success');
              })
              .catch((err) => {
                console.error(err);

                // set failure when retry is exceeded
                if (retryCount === 3) {
                  setStatus('failure');
                  if (err.message) {
                    setErrorMessage(err.message);
                  } else {
                    setErrorMessage(
                      'Unknown error. Check developer tools console.',
                    );
                  }
                } else {
                  // recursive retry (1 second between retries)
                  console.log(
                    `Failed to download. Retrying (${retryCount + 1} of 3)...`,
                  );
                  setTimeout(() => download(retryCount + 1), 1000);
                }
              });
          }

          download();
        }}
      >
        Download Printable Map
      </button>
    </div>
  );
}

export default MapWidgets;
