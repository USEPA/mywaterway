/** @jsxImportSource @emotion/react */

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
import { CalciteIcon } from '@esri/calcite-components-react';
import { css } from '@emotion/react';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Root, createRoot } from 'react-dom/client';
import { Rnd } from 'react-rnd';
import Select from 'react-select';
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
import { useConfigFilesState } from 'contexts/ConfigFiles';
import { LocationSearchContext, Status } from 'contexts/locationSearch';
import { useFullscreenState } from 'contexts/Fullscreen';
import { useLayers } from 'contexts/Layers';
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
import { GetTemplateType, useAbort, useDynamicPopup } from 'utils/hooks';
// icons
import resizeIcon from 'images/resize.png';
// types
import type PrintTemplateType from '@arcgis/core/rest/support/PrintTemplate';
import type PrintVMType from '@arcgis/core/widgets/Print/PrintViewModel';
import type { LayersState } from 'contexts/Layers';
import type {
  LayoutBounds,
  MultilineTextLayout,
  PDFDocument as PDFDocumentType,
  PDFFont,
  PDFPage,
} from 'pdf-lib';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type {
  RndDraggableState,
  ServicesData,
  WatershedAttributes,
} from 'types';
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
  top: 0;
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
    top: 183px;
    width: 250px;
  }
`;

/*
## Utilities
*/

// workaround for React state variables not being updated inside of
// esri watch events
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
  'sewerOverflowsLayer',
  'damsLayer',
  'storageTanksLayer',
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
  'wildfiresLayer',
  'wildScenicRiversLayer',
  'protectedAreasHighlightLayer',
  'protectedAreasLayer',
  'disadvantagedCommunitiesLayer',
  'wellsLayer',
  'cmraScreeningLayer',
  'ejscreenLayer',
  'landCoverLayer',
  'searchIconLayer',
];

function updateLegend(
  view: __esri.MapView,
  displayEsriLegend: boolean,
  hmwLegendRoot: Root | null,
  additionalLegendInfo: Object,
) {
  if (!hmwLegendRoot) return;
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

  hmwLegendRoot.render(
    <MapLegend
      view={view}
      displayEsriLegend={displayEsriLegend}
      visibleLayers={visibleLayers}
      additionalLegendInfo={additionalLegendInfo}
    />,
  );
}

// colors the popup pointer according to position and number of features
function updatePopupPointerStyles(
  features: Graphic[],
  currentAlignment: CurrentAlignment,
) {
  const pointers = document.getElementsByClassName(
    'esri-popup__pointer-direction',
  );

  for (let pointer of pointers) {
    let isPointerTop = [
      'bottom-center',
      'bottom-left',
      'bottom-right',
    ].includes(currentAlignment);

    if (features.length <= 1 && !isPointerTop)
      pointer.classList.remove('blue-popup-pointer');
    else pointer.classList.add('blue-popup-pointer');
  }
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
type CurrentAlignment =
  | 'bottom-center'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'top-left'
  | 'top-right';
interface PopupExt extends __esri.Popup {
  currentAlignment: CurrentAlignment;
  featureMenuOpen: boolean;
}

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
}: Readonly<Props>) {
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

  const services = useConfigFilesState().data.services;

  const { getTemplate } = useDynamicPopup();

  const {
    fullscreenActive,
    setFullscreenActive, //
  } = useFullscreenState();

  useEffect(() => {
    if (!view?.popup) return;
    // adjust popup pointer styles according to
    const popupAlignementWatcher = reactiveUtils.watch(
      () => (view.popup as PopupExt).currentAlignment,
      () => {
        updatePopupPointerStyles(
          view.popup.features,
          (view.popup as PopupExt).currentAlignment,
        );
      },
    );

    // revert calcite styles when feature list menu is opened
    const popupFeatureMenuWatcher = reactiveUtils.watch(
      () => (view.popup as PopupExt).featureMenuOpen,
      () => {
        const id = 'overridePopupStyles';
        if ((view.popup as PopupExt).featureMenuOpen) {
          const styles = document.createElement('style');
          styles.id = id;
          styles.innerHTML = `
            .esri-popup__main-container calcite-flow {
              --calcite-color-border-3: white;
              --calcite-color-foreground-1: white;
              --calcite-color-foreground-2: white;
              --calcite-color-foreground-3: white;
              --calcite-color-text-1: black;
              --calcite-color-text-2: black;
              --calcite-color-text-3: black;
            }
          `;
          document.body.appendChild(styles);
        } else {
          const styles = document.getElementById(id);
          if (styles) document.body.removeChild(styles);
        }
      },
    );

    const popupWatcher = reactiveUtils.watch(
      () => view.popup.features,
      () => {
        const features = view.popup.features;
        if (features.length === 0) return;

        updatePopupPointerStyles(
          features,
          (view.popup as PopupExt).currentAlignment,
        );

        function getSortIndex(graphic: __esri.Graphic) {
          const parentId = (graphic?.layer?.parent as __esri.GroupLayer)?.id;
          return parentId === 'allWaterbodiesLayer' ? 1 : 0;
        }

        const newFeatures: __esri.Graphic[] = [];
        const idsAdded: string[] = [];
        [...features]
          .sort((a, b) => getSortIndex(a) - getSortIndex(b))
          .forEach((item) => {
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
          view.closePopup();
        } else if (newFeatures.length !== view.popup.features.length) {
          view.popup.features = newFeatures;
        }
      },
    );

    return function cleanup() {
      popupAlignementWatcher.remove();
      popupFeatureMenuWatcher.remove();
      popupWatcher.remove();
    };
  }, [getHucBoundaries, view]);

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
  const legendRoot = useRef<Root | null>(null);
  if (!legendRoot.current) legendRoot.current = createRoot(hmwLegendNode);

  // Creates and adds the legend widget to the map
  const [legend, setLegend] = useState<__esri.Expand | null>(null);
  useEffect(() => {
    if (!view || legend) return;

    const newLegend = new Expand({
      content: legendNode,
      view,
      expanded: false,
      expandIcon: 'legend',
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

      setDisplayEsriLegend(esriMessages.length === 0);
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
      y: (rnd.current.draggable.state as RndDraggableState).y,
    });
  }, []);

  const [addSaveDataWidget, setAddSaveDataWidget] =
    useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!view?.ui) return;

    const node = document.createElement('div');
    view.ui.add(node, { position: 'top-right', index: 2 });

    createRoot(node).render(
      <ShowAddSaveDataWidget
        addSaveDataWidgetVisible={addSaveDataWidgetVisible}
        setAddSaveDataWidgetVisible={setAddSaveDataWidgetVisible}
      />,
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
    let url = `${services.protectedAreasDatabase}/legend?f=json`;
    requests.push(fetchCheck(url, getSignal()));
    url = `${services.ejscreen}legend?f=json`;
    requests.push(fetchCheck(url, getSignal()));
    url = `${services.mappedWater}/legend?f=json`;
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
            displayEsriLegend,
            legendRoot.current,
            additionalLegendInfoNonState,
          );

          watchHandles.push(
            item.watch('visible', function (_ev) {
              updateLegend(
                view,
                displayEsriLegend,
                legendRoot.current,
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

    const basemapHeader = document.createElement('h2');
    basemapHeader.innerHTML = 'Basemaps:';

    const layerListHeader = document.createElement('h2');
    layerListHeader.innerHTML = 'Layers:';

    container.appendChild(basemapHeader);
    if (basemapWidget.container instanceof HTMLElement)
      container.appendChild(basemapWidget.container);
    container.appendChild(document.createElement('hr'));
    container.appendChild(layerListHeader);
    if (layerlist.container instanceof HTMLElement)
      container.appendChild(layerlist.container);

    const expandWidget = new Expand({
      expandIcon: 'layers',
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
    if (!view) return;

    // setup map event handlers
    const zoomHandle = reactiveUtils.watch(
      () => view.zoom,
      () => {
        updateLegend(
          view,
          displayEsriLegend,
          legendRoot.current,
          additionalLegendInfoNonState,
        );
      },
    );

    // when basemap changes, update the basemap in context for persistent basemaps
    // across fullscreen and mobile/desktop layout changes
    const basemapHandle = view.map.allLayers.on('change', function (_ev) {
      if (view.map.basemap !== basemap) {
        setBasemap(view.map.basemap);
      }
    });

    return function cleanup() {
      basemapHandle.remove();
      zoomHandle.remove();
    };
  }, [
    additionalLegendInfo,
    basemap,
    setBasemap,
    hmwLegendNode,
    view,
    displayEsriLegend,
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
    createRoot(node).render(
      <ExpandCollapse
        fullscreenActive={fullscreenActive}
        setFullscreenActive={setFullscreenActive}
        mapViewSetter={setMapView}
      />,
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
    if (!view) return;

    const container = document.createElement('div');
    createRoot(container).render(
      <DownloadWidget services={services} view={view} />,
    );

    const downloadWidget = new Expand({
      expandIcon: 'print',
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

    createRoot(node).render(widget);
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
    updateLegend(
      view,
      displayEsriLegend,
      legendRoot.current,
      additionalLegendInfo,
    );
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
}: Readonly<{
  addSaveDataWidgetVisible: boolean;
  setAddSaveDataWidgetVisible: Dispatch<SetStateAction<boolean>>;
}>) {
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
      css={divStyle(false, hover)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      onClick={clickHandler}
      onKeyDown={clickHandler}
      role="button"
      tabIndex={0}
    >
      <CalciteIcon
        icon={addSaveDataWidgetVisible ? 'chevrons-right' : 'plus-square'}
        scale="s"
      />
    </div>
  );
}

const divStyle = (disabled: boolean, hover: boolean) => css`
  align-items: center;
  background-color: ${!disabled && hover ? '#F0F0F0' : 'white'};
  cursor: ${disabled ? 'default' : 'pointer'};
  display: flex;
  height: 32px;
  justify-content: center;
  padding: 8.5px;
  opacity: ${disabled ? 0.5 : 1.0};
  position: relative;
  width: 32px;

  --calcite-ui-icon-color: ${!disabled && hover ? 'black' : '#6E6E6E'};
`;

type ExpandeCollapseProps = {
  fullscreenActive: boolean;
  setFullscreenActive: Function;
  mapViewSetter: Function;
};

function ExpandCollapse({
  fullscreenActive,
  setFullscreenActive,
  mapViewSetter,
}: Readonly<ExpandeCollapseProps>) {
  const [hover, setHover] = useState(false);

  const clickHandler = useCallback(
    (ev: React.KeyboardEvent | React.MouseEvent) => {
      if (!isClick(ev)) return;
      // Toggle scroll bars
      document.documentElement.style.overflow = fullscreenActive
        ? 'auto'
        : 'hidden';

      const backToTop: HTMLElement | null =
        document.querySelector('.back-to-top');
      if (backToTop)
        backToTop.style.display = fullscreenActive ? 'flex' : 'none';

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
      css={divStyle(false, hover)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      onClick={clickHandler}
      onKeyDown={clickHandler}
      role="button"
      tabIndex={0}
    >
      <CalciteIcon
        icon={fullscreenActive ? 'zoom-in-fixed' : 'zoom-out-fixed'}
        scale="s"
      />
    </div>
  );
}

function retrieveUpstreamWatershed(
  abortSignal: AbortSignal,
  getCurrentExtent: () => __esri.Extent,
  getHuc12: () => string,
  getTemplate: GetTemplateType,
  getUpstreamExtent: () => __esri.Extent,
  upstreamLayer: __esri.GraphicsLayer | null,
  getUpstreamWidgetDisabled: () => boolean,
  getWatershed: () => WatershedAttributes,
  lastHuc12: string,
  services: ServicesData,
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

  const url = services.upstreamWatershed;
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
      const watershed = getWatershed().name || 'Unknown Watershed';
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
}: Readonly<ShowUpstreamWatershedProps>) {
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

  return (
    <div
      title={title}
      css={divStyle(upstreamWidgetDisabled, hover)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      onClick={onClick}
      onKeyDown={onClick}
      role="button"
      tabIndex={0}
    >
      {upstreamLoading ? (
        <LoadingSpinner />
      ) : (
        <span
          css={css`
            display: flex;
            ${!upstreamVisible && 'transform: rotate(-45deg);'}
          `}
        >
          <CalciteIcon
            icon={upstreamVisible ? 'chevrons-right' : 'arrow-bold-up'}
            scale="s"
          />
        </span>
      )}
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
  getTemplate: GetTemplateType;
  getUpstreamExtent: () => __esri.Extent;
  upstreamLayer: __esri.GraphicsLayer | null;
  getUpstreamWidgetDisabled: () => boolean;
  getWatershed: () => WatershedAttributes;
  services: ServicesData;
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
    (ev: __esri.ViewClickEvent) => {
      setSelectionActive(false);

      if (!view) return;

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
        .executeQueryJSON(services.wbd, queryParams)
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
  const selectUpstream = useCallback(() => {
    if (!upstreamLayer) return;

    if (upstreamLayer.visible) {
      const currentExtent = getCurrentExtent();
      currentExtent && view?.goTo(currentExtent);

      setInstructionsVisible(false);

      upstreamLayer.graphics.removeAll();
      updateVisibleLayers({
        upstreamLayer: false,
        watershedsLayer: watershedsVisible,
      });
      return;
    }

    if (watershedsLayer) {
      setWatershedsVisible(watershedsLayer.visible);
      watershedsLayer.visible = true;
    }

    setSelectionActive(true);
  }, [
    getCurrentExtent,
    updateVisibleLayers,
    upstreamLayer,
    view,
    watershedsLayer,
    watershedsVisible,
  ]);

  function handleCloseClick(ev: React.KeyboardEvent | React.MouseEvent) {
    if (!isClick(ev)) return;

    setInstructionsVisible(false);
  }

  return (
    <>
      {mapRef.current &&
        createPortal(
          <div css={instructionContainerStyles(instructionsVisible)}>
            <div css={instructionStyles}>
              <header>
                <i
                  className="esri-icon-close"
                  onClick={handleCloseClick}
                  onKeyDown={handleCloseClick}
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

type PdfLegendImage = {
  code: string | ArrayBuffer;
  height: number;
  width: number;
};

type PdfLegendItemType = 'h1' | 'h2' | 'h3' | 'item' | 'imageItem';

type PdfLegendItem = {
  image?: PdfLegendImage | null;
  text?: string | null;
  type: PdfLegendItemType;
};

const leftMargin = 10;
const topMargin = 10;

function handleError(error: unknown) {
  if (error instanceof Error || typeof error === 'object') {
    return (error as any)?.message;
  } else if (typeof error === 'string') {
    return error;
  } else {
    return 'Unknown error. Check developer tools console.';
  }
}

export async function generateAndDownloadPdf({
  layout,
  title,
  author,
  copyright,
  northArrowVisible,
  scale,
  services,
  view,
  includeLegend,
}: {
  layout: LayoutOptionType;
  title: string;
  author: string;
  copyright: string;
  northArrowVisible: boolean;
  scale: number;
  services: ServicesData;
  view: __esri.MapView;
  includeLegend: boolean;
}) {
  const {
    layoutMultilineText,
    PageSizes,
    PDFDocument,
    PDFImage,
    rgb,
    StandardFonts,
    TextAlignment,
  } = await import('pdf-lib');

  const PrintTemplate = (
    await import('@arcgis/core/rest/support/PrintTemplate.js')
  ).default;
  const PrintVM = (await import('@arcgis/core/widgets/Print/PrintViewModel'))
    .default;

  const layoutOptions = {
    'a3-landscape': {
      columnWidth: 280,
      dimensions: [...PageSizes.A3].reverse() as [number, number],
      dimensionsMapPageLegend: { height: 170, width: 1160 },
      pageMargin: 18,
    },
    'a3-portrait': {
      columnWidth: 260,
      dimensions: PageSizes.A3,
      dimensionsMapPageLegend: { height: 180, width: 690 },
      pageMargin: 18,
    },
    'a4-landscape': {
      columnWidth: 260,
      dimensions: [...PageSizes.A4].reverse() as [number, number],
      dimensionsMapPageLegend: { height: 100, width: 720 },
      pageMargin: 17,
    },
    'a4-portrait': {
      columnWidth: 275,
      dimensions: PageSizes.A4,
      dimensionsMapPageLegend: { height: 155, width: 420 },
      pageMargin: 17,
    },
    'letter-ansi-a-landscape': {
      columnWidth: 240,
      dimensions: [...PageSizes.Letter].reverse() as [number, number],
      dimensionsMapPageLegend: { height: 100, width: 660 },
      pageMargin: 25,
    },
    'letter-ansi-a-portrait': {
      columnWidth: 280,
      dimensions: PageSizes.Letter,
      dimensionsMapPageLegend: { height: 155, width: 420 },
      pageMargin: 25,
    },
    'tabloid-ansi-b-landscape': {
      columnWidth: 287,
      dimensions: [...PageSizes.Tabloid].reverse() as [number, number],
      dimensionsMapPageLegend: { height: 170, width: 1130 },
      pageMargin: 25,
    },
    'tabloid-ansi-b-portrait': {
      columnWidth: 240,
      dimensions: PageSizes.Tabloid,
      dimensionsMapPageLegend: { height: 185, width: 600 },
      pageMargin: 25,
    },
  };

  /**
   * Adds a pdf document to an existing pdf document.
   *
   * @param doc PDFDocument to load provided pdfFile into.
   * @param pdfFile PDF file to load into provided doc.
   */
  async function addDocument(doc: PDFDocumentType, pdfFile: ArrayBuffer) {
    const src = await PDFDocument.load(pdfFile);
    const copiedPages = await doc.copyPages(src, src.getPageIndices());
    copiedPages.forEach((page) => {
      doc.addPage(page);
    });
  }

  /**
   * Gets the symbol and text for the provided combination of
   * element, symbolClass and textClass.
   *
   * @param legendItems Array to add legend item to
   * @param element Element to search in
   * @param symbolClass Class for selecting the symbol part
   * @param textClass Class for selecting the text part
   * @param type Type of legend item (h1, h2, h3 or item)
   * @param firstOnly Only include the first text item
   */
  async function addLegendItem({
    legendItems,
    element,
    symbolClass,
    textClass,
    type,
    firstOnly = true,
  }: {
    legendItems: PdfLegendItem[];
    element: Element;
    symbolClass?: string;
    textClass: string;
    type: PdfLegendItemType;
    firstOnly?: boolean;
  }) {
    const image = !symbolClass ? null : await getImage(element, symbolClass);
    let itemsAdded = 0;

    // skip adding text if the png was generated from a div
    const symbols = !symbolClass
      ? null
      : element.getElementsByClassName(symbolClass);
    if (!symbolClass || (symbols && symbols.length > 0)) {
      // get captions
      const textItems = element.getElementsByClassName(textClass);

      for (let textItem of textItems) {
        const text = textItem.textContent;
        if (text) {
          itemsAdded += 1;
          legendItems.push({
            image,
            text,
            type,
          });
        }

        if (firstOnly) break;
      }
    }

    if (itemsAdded === 0 && image) {
      legendItems.push({
        image,
        type,
      });
    }
  }

  /**
   * Parses the dom and adds the HMW portion of the legend to the
   * provided legendItems array.
   * @param legendItems Array to add legend items to
   */
  async function appendHmwLegendItems(legendItems: PdfLegendItem[]) {
    // loop through individual rows of hmw legend items
    const listItems = document.getElementsByClassName('hmw-legend__item');
    for (let item of listItems) {
      // get the text
      await addLegendItem({
        legendItems,
        element: item,
        symbolClass: 'hmw-legend__symbol',
        textClass: 'hmw-legend__info',
        type: 'imageItem',
      });
    }
  }

  /**
   * Parses the dom and adds the Esri portion of the legend to the
   * provided legendItems array.
   * @param legendItems Array to add legend items to
   */
  async function appendEsriLegendItems(legendItems: PdfLegendItem[]) {
    // loop through layers of esri legend items
    const legendServices = document.querySelectorAll(
      '.esri-legend__service:not(.esri-legend__group-layer-child)',
    );
    for (let legendService of legendServices) {
      let hasHighestLevel = false;
      let groups = Array.from(
        legendService.getElementsByClassName('esri-legend__group-layer-child'),
      );
      if (groups.length === 0) groups.push(legendService);
      else {
        await addLegendItem({
          legendItems,
          element: legendService,
          textClass: 'esri-legend__service-label',
          type: 'h1',
        });
        hasHighestLevel = true;
      }

      for (let group of groups) {
        // get main title
        await addLegendItem({
          legendItems,
          element: group,
          textClass: 'esri-legend__service-label',
          type: hasHighestLevel ? 'h2' : 'h1',
        });

        // get layer level content
        const layers = group.getElementsByClassName('esri-legend__layer');
        for (let layer of layers) {
          // get captions
          await addLegendItem({
            legendItems,
            element: layer,
            textClass: 'esri-legend__layer-caption',
            type: hasHighestLevel ? 'h3' : 'h2',
            firstOnly: false,
          });

          // get row level content
          const rows = layer.getElementsByClassName('esri-legend__layer-row');
          for (let row of rows) {
            // get the text
            await addLegendItem({
              legendItems,
              element: row,
              symbolClass: 'esri-legend__symbol',
              textClass: 'esri-legend__layer-cell--info',
              type: 'item',
            });
          }
        }
      }
    }
  }

  /**
   * Calculates where items should be positioned next. This could be in a new column
   * on the same page or a new page.
   *
   * @param doc PDFDocument adding to
   * @param currentPage Current page of pdf
   * @param layout Layout chosen by user
   * @param pageIndex Index of the current page
   * @param horizontalPosition Current horizontal position
   * @param verticalPosition Current vertical position
   * @param x Current x value
   * @param numberOfIndents Level of indentation
   * @param textHeight Height of current text
   * @param imageScaledHeight Scaled height of current image
   * @returns new values for currentPage, horizontalPosition, verticalPosition, verticalPositionImage,
   *          verticalPositionText and x
   */
  function calculatePositioning({
    doc,
    currentPage,
    layout,
    pageIndex,
    horizontalPosition,
    verticalPosition,
    x,
    numberOfIndents,
    textHeight,
    imageScaledHeight,
  }: {
    doc: PDFDocumentType;
    currentPage: PDFPage;
    layout: LayoutOptionType;
    pageIndex: number;
    horizontalPosition: number;
    verticalPosition: number;
    x: number;
    numberOfIndents: number;
    textHeight: number;
    imageScaledHeight: number;
  }) {
    const { height, width } = currentPage.getSize();
    const { columnWidth, dimensions, dimensionsMapPageLegend, pageMargin } =
      layoutOptions[layout.value];

    // if on map page (1st page) use dimensions of the blank space on map page
    // otherwise use the document dimensions
    const maxHeight = pageIndex === 0 ? dimensionsMapPageLegend.height : height;
    const maxWidth = pageIndex === 0 ? dimensionsMapPageLegend.width : width;

    const rowHeight = Math.max(textHeight, imageScaledHeight);
    let tempY = verticalPosition - rowHeight - topMargin;
    if (tempY < topMargin) {
      // update tempY to be top of next column
      tempY = maxHeight - rowHeight - topMargin * 2;

      // determine whether to start a new column or page
      if (
        horizontalPosition + columnWidth * 2 + pageMargin * 2 < maxWidth &&
        tempY > topMargin
      ) {
        // start a new column on the same page since both height and width check out
        verticalPosition = tempY;
        horizontalPosition += columnWidth + leftMargin;
        x = horizontalPosition + pageMargin + leftMargin * numberOfIndents;
      } else {
        // start a new page
        currentPage = doc.addPage(dimensions);
        pageIndex += 1;
        horizontalPosition = 0;
        x = pageMargin + leftMargin * numberOfIndents;
        verticalPosition = height - rowHeight - topMargin * 2;
      }
    } else {
      verticalPosition = tempY;
    }

    // figure out how to align center the image and text
    let verticalPositionImage = verticalPosition;
    let verticalPositionText = verticalPosition;
    if (imageScaledHeight > textHeight) {
      verticalPositionText =
        verticalPosition + (imageScaledHeight - textHeight) / 2;
    }
    if (imageScaledHeight < textHeight) {
      verticalPositionImage =
        verticalPosition + (textHeight - imageScaledHeight) / 2;
    }

    return {
      currentPage,
      horizontalPosition,
      pageIndex,
      verticalPosition,
      verticalPositionImage,
      verticalPositionText,
      x,
    };
  }

  /**
   * Draws multiline text on page.
   *
   * @param currentPage Current page of pdf
   * @param multiLineText Multiline text to draw
   * @param font Font of text
   * @param fontSize Font size of text
   * @param x Horizontal value to start drawing text
   * @param verticalPositionText Vertical position to start drawing text
   */
  function drawMultilineText(
    currentPage: PDFPage,
    multiLineText: MultilineTextLayout | null,
    font: PDFFont,
    fontSize: number,
    x: number,
    verticalPositionText: number,
  ) {
    if (!multiLineText) return;

    // pdf-lib has y=0 start at the bottom of the page, so
    // we have to reverse the lines and work our way up
    let tempVerticalPositionText = verticalPositionText;
    for (const l of [...multiLineText.lines].reverse()) {
      currentPage.drawText(l.text, {
        x,
        y: tempVerticalPositionText,
        font,
        size: fontSize,
      });

      tempVerticalPositionText = tempVerticalPositionText + l.height;
    }
  }

  /**
   * Embeds the scaled image into the document and returns the pdfImage,
   * scaled height and scaled width of the image.
   *
   * @param doc PDFDocument adding to
   * @param image Image to embed in PDF
   * @returns The pdfImage, scaled height and scaled width
   */
  async function embedImage(
    doc: PDFDocumentType,
    image?: PdfLegendImage | null,
  ) {
    if (!image)
      return { pdfImage: null, imageScaledHeight: 0, imageScaledWidth: 0 };

    const imageScaleFactor = 0.75;
    try {
      // if the image code is a url, then fetch the image
      if (typeof image.code === 'string' && !image.code.includes(';base64,')) {
        image.code = await (await fetch(image.code)).arrayBuffer();
      }

      // embed, scale and draw the image
      const pdfImage = await doc.embedPng(image.code);
      const dimensions = pdfImage.scale(imageScaleFactor);

      return {
        pdfImage,
        imageScaledHeight: dimensions.height,
        imageScaledWidth: dimensions.width,
      };
    } catch (err) {
      console.error(err);
      return {
        pdfImage: 'Failed to load image.',
        imageScaledHeight: 0,
        imageScaledWidth: 0,
      };
    }
  }

  /**
   * Gets a symbol and converts it to a base64 PNG.
   *
   * @param parentElement Element to find symbol in.
   * @param searchClass Class of symbol being searched for.
   * @returns code as base64 PNG and height/width of image.
   */
  async function getImage(parentElement: Element, searchClass: string) {
    const htmltoimage = await import('html-to-image');
    // get the symbol
    const symbols = parentElement.getElementsByClassName(searchClass);
    const symbol = (
      symbols.length > 0 ? symbols[0] : parentElement
    ) as HTMLElement;
    // set div to visible to avoid blank image
    const lastVisibility = symbol.style.visibility;
    symbol.style.visibility = 'visible';
    const img = await htmltoimage.toPng(symbol, { skipFonts: true });
    symbol.style.visibility = lastVisibility;
    return {
      code: img,
      height: symbol.offsetHeight,
      width: symbol.offsetWidth,
    };
  }

  /**
   * Wraps the text across multiple lines and calculates the height of the text.
   *
   * @param text Text to convert to multi line text
   * @param font Font of text
   * @param fontSize Font size of text
   * @param bounds Bounding box for multi line text to fit in
   * @returns multiLineText object and the textHeight
   */
  function getMultilineText({
    bounds,
    font,
    fontSize,
    text,
  }: {
    bounds: LayoutBounds;
    font: PDFFont;
    fontSize: number;
    text?: string | null;
  }) {
    let textHeight = 0;
    let multiLineText: MultilineTextLayout | null = null;

    if (text) {
      multiLineText = layoutMultilineText(text, {
        alignment: TextAlignment.Left,
        font,
        fontSize,
        bounds,
      });

      // calculate height of multiline text
      multiLineText.lines.forEach(
        () => (textHeight += font.heightAtSize(fontSize)),
      );
    }

    return { multiLineText, textHeight };
  }

  /**
   * Determines how far to indent items based on the
   * last heading level.
   *
   * @param lastHeading Last heading level
   * @param type Current item type
   * @returns number of indents
   */
  function getNumberOfIndents(
    lastHeading: PdfLegendItemType,
    type: PdfLegendItemType,
  ) {
    let numberOfIndents = 1;
    if (lastHeading === 'h2') numberOfIndents = 2;
    if (lastHeading === 'h3') numberOfIndents = 3;
    if (type === 'item') numberOfIndents += 1;

    return numberOfIndents;
  }

  /**
   * A wrapper for setTimeout, which allows async/await syntax.
   *
   * @param ms Milliseconds to wait for
   * @returns Promise
   */
  function timeout(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generates the map portion of the PDF using the esri
   * print service.
   *
   * @param printVm PrintViewModel used for calling esri print service
   * @param template PrintTemplate used for formatting the map
   * @param retryCount Retry count for handling failures
   * @returns ArrayBuffer of the map portion of the PDF
   */
  async function generateMapPdf(
    printVm: PrintVMType,
    template: PrintTemplateType,
    retryCount: number = 0,
  ): Promise<ArrayBuffer> {
    try {
      const printRes = await printVm.print(template);
      const res = await fetch(printRes.url);

      // convert to array buffer and return
      return await (await res.blob()).arrayBuffer();
    } catch (err) {
      console.error(err);

      // set failure when retry is exceeded
      if (retryCount === 3) {
        throw err;
      } else {
        // recursive retry (1 second between retries)
        console.log(`Failed to download. Retrying (${retryCount + 1} of 3)...`);
        await timeout(1000);
        return await generateMapPdf(printVm, template, retryCount + 1);
      }
    }
  }

  /**
   * Generates the legend portion of the PDF file.
   *
   * @param doc PDFDocument to add legend to
   */
  async function generateLegendPdf(doc: PDFDocumentType) {
    const legendItems: PdfLegendItem[] = [];
    await appendHmwLegendItems(legendItems);
    await appendEsriLegendItems(legendItems);

    // add a page and set the font
    let currentPage = doc.getPage(0);
    const helveticaFont = doc.embedStandardFont(StandardFonts.Helvetica);
    const helveticaBoldFont = doc.embedStandardFont(
      StandardFonts.HelveticaBold,
    );

    // get the size of the document
    const { height } = currentPage.getSize();
    const fontSize = 12;

    const { columnWidth, dimensionsMapPageLegend, pageMargin } =
      layoutOptions[layout.value];

    // add items to legend
    let lastHeading: PdfLegendItemType = 'h1';
    let horizontalPosition = 0;
    let verticalPosition = dimensionsMapPageLegend.height - topMargin;
    let pageIndex = 0;
    for (const item of legendItems) {
      const { image, text, type } = item;

      if (['h1', 'h2', 'h3'].includes(type)) lastHeading = type;
      const numberOfIndents = getNumberOfIndents(lastHeading, type);

      const font = ['h1', 'h2'].includes(type)
        ? helveticaBoldFont
        : helveticaFont;

      // set x starting position
      let x = horizontalPosition + pageMargin + leftMargin * numberOfIndents;

      // get image dimensions after scaling
      const { pdfImage, imageScaledHeight, imageScaledWidth } =
        await embedImage(doc, image);

      // wrap text and calculate height of text
      const { multiLineText, textHeight } = getMultilineText({
        text,
        font,
        fontSize,
        bounds: {
          x,
          y: verticalPosition - topMargin,
          width: columnWidth - imageScaledWidth - leftMargin * numberOfIndents,
          height,
        },
      });

      const newPosition = calculatePositioning({
        doc,
        currentPage,
        layout,
        pageIndex,
        horizontalPosition,
        verticalPosition,
        x,
        numberOfIndents,
        imageScaledHeight,
        textHeight,
      });

      ({ currentPage, horizontalPosition, pageIndex, verticalPosition, x } =
        newPosition);

      const { verticalPositionImage, verticalPositionText } = newPosition;

      // draw the image
      if (pdfImage instanceof PDFImage) {
        currentPage.drawImage(pdfImage, {
          x,
          y: verticalPositionImage,
          width: imageScaledWidth,
          height: imageScaledHeight,
        });

        // shift x to the right of the image for text
        x = x + leftMargin + imageScaledWidth;
      }
      if (typeof pdfImage === 'string') {
        currentPage.drawText(pdfImage, {
          x,
          y: verticalPositionText,
          color: rgb(1, 0, 0),
          font: helveticaFont,
          size: fontSize,
        });

        x =
          x + leftMargin + helveticaFont.widthOfTextAtSize(pdfImage, fontSize);
      }

      // draw the text which can be multiple lines
      drawMultilineText(
        currentPage,
        multiLineText,
        font,
        fontSize,
        x,
        verticalPositionText,
      );
    }
  }

  const template = new PrintTemplate({
    format: 'pdf',
    layout: layout.value,
    layoutOptions: {
      titleText: title,
      authorText: author,
      copyrightText: copyright,
      legendLayers: [], // hide legend since it has a bug
      elementOverrides: {
        'North Arrow': {
          visible: northArrowVisible,
        },
      },
    },
    outScale: scale,
  });

  const printVm = new PrintVM({
    printServiceUrl: services.printService,
    view,
  });

  // create the PDF document with metadata
  const doc = await PDFDocument.create();
  const creator = `U.S. EPA How's My Waterway`;
  doc.setTitle(title);
  doc.setAuthor(`${author || creator}`);
  doc.setSubject(title);
  doc.setKeywords([
    'MyWaterway',
    'HMWv2',
    'WATERS',
    'RAD',
    'ATTAINS',
    'GRTS',
    'STORET',
    'WQP',
    'WQX',
  ]);
  doc.setProducer(creator);
  doc.setCreator(creator);
  doc.setCreationDate(new Date());
  doc.setModificationDate(new Date());

  // get map part and add it to the document
  const mapPdf = await generateMapPdf(printVm, template);
  await addDocument(doc, mapPdf);

  // get legend part if necessary
  if (includeLegend) await generateLegendPdf(doc);

  // save from browser
  const mergedPdf = new Blob([await doc.save()]);
  const { saveAs } = (await import('file-saver')).default;
  saveAs(mergedPdf, `${title}.pdf`);
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
  padding: 12px 10px;

  h2 {
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

type LayoutOptionType =
  | {
      value: 'a3-landscape';
      label: 'A3 Landscape';
    }
  | {
      value: 'a3-portrait';
      label: 'A3 Portrait';
    }
  | {
      value: 'a4-landscape';
      label: 'A4 Landscape';
    }
  | {
      value: 'a4-portrait';
      label: 'A4 Portrait';
    }
  | {
      value: 'letter-ansi-a-landscape';
      label: 'Letter ANSI A Landscape';
    }
  | {
      value: 'letter-ansi-a-portrait';
      label: 'Letter ANSI A Portrait';
    }
  | {
      value: 'tabloid-ansi-b-landscape';
      label: 'Tabloid ANSI B Landscape';
    }
  | {
      value: 'tabloid-ansi-b-portrait';
      label: 'Tabloid ANSI B Portrait';
    };

type DownloadWidgetProps = {
  services: ServicesData;
  view: __esri.MapView;
};

function DownloadWidget({ services, view }: Readonly<DownloadWidgetProps>) {
  const layoutOptions: LayoutOptionType[] = [
    {
      value: 'a3-landscape',
      label: 'A3 Landscape',
    },
    {
      value: 'a3-portrait',
      label: 'A3 Portrait',
    },
    {
      value: 'a4-landscape',
      label: 'A4 Landscape',
    },
    {
      value: 'a4-portrait',
      label: 'A4 Portrait',
    },
    {
      value: 'letter-ansi-a-landscape',
      label: 'Letter ANSI A Landscape',
    },
    {
      value: 'letter-ansi-a-portrait',
      label: 'Letter ANSI A Portrait',
    },
    {
      value: 'tabloid-ansi-b-landscape',
      label: 'Tabloid ANSI B Landscape',
    },
    {
      value: 'tabloid-ansi-b-portrait',
      label: 'Tabloid ANSI B Portrait',
    },
  ];

  const [author, setAuthor] = useState('');
  const [copyright, setCopyright] = useState('');
  const [enableScale, setEnableScale] = useState(false);
  const [scale, setScale] = useState(0);
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
      <h2>Download Printable Map</h2>
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
        <label css={checkboxStyles}>
          <input
            type="checkbox"
            checked={includeLegend}
            onChange={() => setIncludeLegend(!includeLegend)}
          />
          Include Legend
        </label>
      </div>
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
      <AccordionList expandDisabled={true}>
        <AccordionItem status={'highlighted'} title="Advanced">
          <div css={advanceContainerStyles}>
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
            <div>
              <label css={checkboxStyles}>
                <input
                  type="checkbox"
                  checked={northArrowVisible}
                  onChange={() => setNorthArrowVisible(!northArrowVisible)}
                />
                Include north arrow
              </label>
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
        onClick={async () => {
          if (!view) return;

          if (!title) {
            setStatus('failure');
            setErrorMessage('Please provide a title and try again.');
            return;
          }

          setStatus('fetching');

          try {
            await generateAndDownloadPdf({
              layout,
              title,
              author,
              copyright,
              northArrowVisible,
              scale,
              services,
              view,
              includeLegend,
            });

            setStatus('success');
          } catch (err) {
            console.error(err);
            setStatus('failure');
            setErrorMessage(handleError(err));
          }
        }}
      >
        Download Printable Map
      </button>
    </div>
  );
}

export default MapWidgets;
