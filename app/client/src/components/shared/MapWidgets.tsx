/** @jsxImportSource @emotion/react */

import '@arcgis/map-components/components/arcgis-basemap-gallery';
import { ArcgisBasemapGalleryItem } from '@arcgis/map-components/components/arcgis-basemap-gallery-item';
import '@arcgis/map-components/components/arcgis-expand';
import '@arcgis/map-components/components/arcgis-home';
import '@arcgis/map-components/components/arcgis-layer-list';
import '@arcgis/map-components/components/arcgis-legend';
import { LegendClassicView } from '@arcgis/map-components/components/arcgis-legend-classic-view';
import '@arcgis/map-components/components/arcgis-scale-bar';
import '@arcgis/map-components/components/arcgis-zoom';
import Polygon from '@arcgis/core/geometry/Polygon';
import Graphic from '@arcgis/core/Graphic';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import Point from '@arcgis/core/geometry/Point';
import PortalBasemapsSource from '@arcgis/core/widgets/BasemapGallery/support/PortalBasemapsSource';
import * as query from '@arcgis/core/rest/query';
import SpatialReference from '@arcgis/core/geometry/SpatialReference';
import Viewpoint from '@arcgis/core/Viewpoint';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';
import '@esri/calcite-components/components/calcite-icon';
import { css } from '@emotion/react';
import React, {
  Fragment,
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
import SurroundingsWidget from 'components/shared/SurroundingsWidget';
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
import type MapView from '@arcgis/core/views/MapView';
import type { ClickEvent } from '@arcgis/core/views/input/types';
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import type Extent from '@arcgis/core/geometry/Extent';
import type Map from '@arcgis/core/Map';
import type FeatureSet from '@arcgis/core/rest/support/FeatureSet';
import type GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import type ListItem from '@arcgis/core/widgets/LayerList/ListItem';
import type Layer from '@arcgis/core/layers/Layer';
import type GroupLayer from '@arcgis/core/layers/GroupLayer';
import type Popup from '@arcgis/core/widgets/Popup';
import type { ResourceHandle } from '@arcgis/core/core/Handles';
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
  MapSlot,
  RndDraggableState,
  ServicesData,
  WatershedAttributes,
} from 'types';
// styles
import { fonts } from 'styles';

/*
## Styles
*/

// Appended to elementStyles so it is adopted after the component's own sheet in
// every item's shadow root.
const thumbnailStyles = new CSSStyleSheet();
thumbnailStyles.replaceSync(`
  .item-thumbnail {
    aspect-ratio: auto;
    height: 31px;
    width: 64px;
    min-width: 64px;
  }
`);
ArcgisBasemapGalleryItem.elementStyles = [
  ...ArcgisBasemapGalleryItem.elementStyles,
  thumbnailStyles,
];

// We show our own message, so hide the message the legend
// falls back to when it has nothing to draw.
const noLegendStyles = new CSSStyleSheet();
noLegendStyles.replaceSync(`
  .no-legend {
    display: none;
  }
`);
LegendClassicView.elementStyles = [
  ...LegendClassicView.elementStyles,
  noLegendStyles,
];

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
  'protectedAreasLayer',
  'wellsLayer',
  'cmraScreeningLayer',
  'landCoverLayer',
  'searchIconLayer',
];

function updateLegend(
  view: MapView,
  displayEsriLegend: boolean,
  hmwLegendRoots: Root[],
  additionalLegendInfo: Object,
) {
  if (!hmwLegendRoots.length) return;
  if (!view?.map?.layers) return;

  // build an array of layers that are visible based on the ordering above
  const visibleLayers: Layer[] = [];
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

  // One copy for the panel and one off-screen for the PDF export, see LegendWidget
  const legend = (
    <MapLegend
      view={view}
      displayEsriLegend={displayEsriLegend}
      visibleLayers={visibleLayers}
      additionalLegendInfo={additionalLegendInfo}
    />
  );
  hmwLegendRoots.forEach((root) => root.render(legend));
}

const resizeHandleStyles = css`
  float: right;
  position: absolute;
  right: 0;
  bottom: 0;
`;

/*
## Components
*/
interface PopupExt extends Popup {
  featureMenuOpen: boolean;
}

type Props = {
  // map and view props auto passed from parent Map component by react-arcgis
  map: Map;
  mapRef: MutableRefObject<HTMLDivElement | null>;
  view: MapView;
  layers: Array<Layer> | null;
  onHomeWidgetRendered?: (homeWidget: HTMLArcgisHomeElement) => void;
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
    setSaveLayersList,
    widgetLayers,
  } = useAddSaveDataWidgetState();

  const pathname = window.location.pathname;
  const { getSignal } = useAbort();
  const watchHandles = useMemo<ResourceHandle[]>(() => [], []);
  useEffect(() => {
    return function cleanup() {
      watchHandles.forEach((handle) => handle.remove());
    };
  }, [watchHandles]);

  const {
    basemapId,
    setBasemapId,
    homeWidget,
    setHomeWidget,
    setUpstreamWidgetDisabled,
    getUpstreamWidgetDisabled,
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

        function getSortIndex(graphic: Graphic) {
          const parentId = (graphic?.layer?.parent as GroupLayer)?.id;
          return parentId === 'allWaterbodiesLayer' ? 1 : 0;
        }

        const newFeatures: Graphic[] = [];
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
    function getLayerType(layer: Layer) {
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
    map.layers.sort((a: Layer, b: Layer) => {
      return sortBy.indexOf(getLayerType(a)) - sortBy.indexOf(getLayerType(b));
    });

    return function cleanup() {
      // These layers are shared through context and outlive this map. When
      // <arcgis-map> unmounts it destroys the view, and view.destroy()
      // destroys the map and everything still on it.
      map.removeAll();
    };
  }, [layers, map, widgetLayers]);

  const homeWidgetRef = useRef<HTMLArcgisHomeElement | null>(null);
  useEffect(() => {
    const newHomeWidget = homeWidgetRef.current;
    if (!newHomeWidget || newHomeWidget === homeWidget) return;

    if (homeWidget?.viewpoint) newHomeWidget.viewpoint = homeWidget.viewpoint;
    else onHomeWidgetRendered(newHomeWidget);

    setHomeWidget(newHomeWidget);
  }, [homeWidget, onHomeWidgetRendered, setHomeWidget]);

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

  const legendRoots = useRef<Root[]>([]);
  const [displayEsriLegend, setDisplayEsriLegend] = useState(false);

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

  const [addSaveDataWidgetInitialized, setAddSaveDataWidgetInitialized] =
    useState<boolean>(false);
  useEffect(() => {
    if (addSaveDataWidgetInitialized) return;
    window.addEventListener('resize', handleResize);
    setAddSaveDataWidgetInitialized(true);

    return function cleanup() {
      window.removeEventListener('resize', handleResize);
    };
  }, [addSaveDataWidgetInitialized, handleResize]);

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
    let url = `${services.mappedWater}/legend?f=json`;
    requests.push(fetchCheck(url, getSignal()));

    Promise.all(requests)
      .then((responses) => {
        additionalLegendInfoNonState = {
          status: 'success',
          data: {
            mappedWaterLayer: responses[0],
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

  useEffect(() => {
    if (!view) return;

    // setup map event handlers
    const zoomHandle = reactiveUtils.watch(
      () => view.zoom,
      () => {
        updateLegend(
          view,
          displayEsriLegend,
          legendRoots.current,
          additionalLegendInfoNonState,
        );
      },
    );

    // when basemap changes, record the portal item in context for persistent
    // basemaps across fullscreen and mobile/desktop layout changes
    const basemapHandle = view.map.allLayers.on('change', function (_ev) {
      const id = view.map.basemap?.portalItem?.id;
      if (id && id !== basemapId) setBasemapId(id);
    });

    return function cleanup() {
      basemapHandle.remove();
      zoomHandle.remove();
    };
  }, [additionalLegendInfo, basemapId, setBasemapId, view, displayEsriLegend]);

  // watch for location changes and disable/enable the upstream widget accordingly
  // widget should only be displayed on Tribal page or valid Community page location
  useEffect(() => {
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
  }, [huc12, setUpstreamWidgetDisabled, pathname]);

  const setUpstreamLayerErrored = useCallback(
    (isErrored: boolean) => {
      updateErroredLayers({ upstreamLayer: isErrored });
    },
    [updateErroredLayers],
  );

  const { upstreamLayer: upstreamLayerErrored } = erroredLayers;

  const { visible: surroundingsVisible } = useSurroundingsState();

  // watch for changes to all waterbodies layer visibility and update visible
  // layers accordingly
  useEffect(() => {
    updateLegend(
      view,
      displayEsriLegend,
      legendRoots.current,
      additionalLegendInfo,
    );
  }, [
    additionalLegendInfo,
    surroundingsVisible,
    displayEsriLegend,
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
    setSaveLayersList(null);
  }, [
    setActiveTabIndex,
    setAddSaveDataWidgetVisible,
    setSaveAsName,
    setSaveDescription,
    setSaveLayersList,
  ]);

  // Creates actions in the LayerList to monitor layer visibility
  function defineActions(event: { item: ListItem }) {
    const item = event.item;
    if (!item.parent) {
      updateLegend(
        item.view,
        displayEsriLegend,
        legendRoots.current,
        additionalLegendInfoNonState,
      );

      watchHandles.push(
        reactiveUtils.watch(
          () => item.visible,
          () => {
            updateLegend(
              view,
              displayEsriLegend,
              legendRoots.current,
              additionalLegendInfoNonState,
            );
            const dict = {
              layerId: item.layer.id,
              visible: item.layer.visible,
            };
            setToggledLayer(dict);
          },
        ),
      );
    }
  }

  const [basemapSource] = useState(
    new PortalBasemapsSource({
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
    }),
  );

  // Measured so the widget is laid out again when a hidden map is shown and goes back to a non-zero width.
  const [mapWidth, setMapWidth] = useState(0);
  useEffect(() => {
    if (!mapRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const map = entries.pop();
      if (map) setMapWidth(map.contentRect.width);
    });

    resizeObserver.observe(mapRef.current);

    return function cleanup() {
      resizeObserver.disconnect();
    };
  }, [mapRef]);

  if (!addSaveDataWidgetInitialized) return null;

  const viewportWidth = window.innerWidth;

  return (
    <Fragment>
      <arcgis-expand
        autoCollapse={true}
        closeOnEscDisabled={false}
        collapseTooltip="Close Legend"
        expanded={false}
        expandIcon="legend"
        expandTooltip="Open Legend"
        mode="floating"
        slot="top-left"
        style={{ marginBottom: '10px' }}
      >
        <LegendWidget
          legendRoots={legendRoots}
          setDisplayEsriLegend={setDisplayEsriLegend}
          view={view}
        />
      </arcgis-expand>

      <arcgis-home ref={homeWidgetRef} slot="top-left" />
      <arcgis-zoom slot="top-left" />

      <arcgis-expand
        autoCollapse={true}
        closeOnEscDisabled={false}
        collapseTooltip="Close Basemaps and Layers"
        expanded={false}
        expandIcon="layers"
        expandTooltip="Open Basemaps and Layers"
        mode="floating"
        slot="top-right"
        style={{ marginBottom: '10px' }}
      >
        <div className="hmw-map-toggle">
          <h2>Basemaps:</h2>
          <arcgis-basemap-gallery source={basemapSource} />
          <hr />
          <h2>Layers:</h2>
          <arcgis-layer-list
            data-testid="hmw-map-layers"
            listItemCreatedFunction={defineActions}
          />
        </div>
      </arcgis-expand>

      <SurroundingsWidget slot="top-right" />

      <ShowAddSaveDataWidget
        addSaveDataWidgetVisible={addSaveDataWidgetVisible}
        setAddSaveDataWidgetVisible={setAddSaveDataWidgetVisible}
        slot="top-right"
      />

      <arcgis-expand
        autoCollapse={true}
        closeOnEscDisabled={false}
        collapseTooltip="Close Printable Map Widget"
        expanded={false}
        expandIcon="print"
        expandTooltip="Open Printable Map Widget"
        mode="floating"
        slot="top-right"
        style={{ marginBottom: '10px 0' }}
      >
        <DownloadWidget services={services} view={view} />
      </arcgis-expand>

      {pathname.includes('/community') && (
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
          slot="top-right"
          updateVisibleLayers={updateVisibleLayers}
          upstreamLayer={upstreamLayer}
          upstreamLayerErrored={upstreamLayerErrored}
          view={view}
        />
      )}
      {pathname.includes('/tribe') && (
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
          slot="top-right"
          updateVisibleLayers={updateVisibleLayers}
          upstreamLayer={upstreamLayer}
          upstreamLayerErrored={upstreamLayerErrored}
          view={view}
        />
      )}

      <arcgis-scale-bar slot="bottom-left" unit="dual" />

      <ExpandCollapse
        fullscreenActive={fullscreenActive}
        setFullscreenActive={setFullscreenActive}
        mapViewSetter={setMapView}
        slot="bottom-right"
      />

      {/* Rnd reads mapWidth once, on mount, so wait for a real measurement */}
      {mapWidth > 0 && (
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
      )}
    </Fragment>
  );
}

// Builds the legend twice, once for the expand panel and once for the PDF
// export to read.
function LegendWidget({
  legendRoots,
  setDisplayEsriLegend,
  view,
}: {
  legendRoots: MutableRefObject<Root[]>;
  setDisplayEsriLegend: React.Dispatch<React.SetStateAction<boolean>>;
  view: MapView;
}) {
  const panelHmwLegend = useRef<HTMLDivElement | null>(null);
  const offscreenHmwLegend = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (legendRoots.current.length) return;
    if (!panelHmwLegend.current || !offscreenHmwLegend.current) return;

    legendRoots.current = [
      createRoot(panelHmwLegend.current),
      createRoot(offscreenHmwLegend.current),
    ];
  }, [legendRoots]);

  const esriLegendWatcher = useRef<ResourceHandle | null>(null);
  useEffect(() => {
    return function cleanup() {
      esriLegendWatcher.current?.remove();
    };
  }, []);

  return (
    <Fragment>
      {/*
        <arcgis-expand> caps the height of each slotted child and scrolls it on its own,
        so put both legends in one element.
      */}
      <div className="hmw-map-legend">
        <div ref={panelHmwLegend} />

        {/* inside <arcgis-expand> this finds the view on its own */}
        <arcgis-legend
          layerInfos={[]}
          onarcgisReady={(event) => {
            const legend = event.target;
            esriLegendWatcher.current?.remove();

            // Counting the layers the legend was handed, rather than asking
            // whether it drew anything, keeps this from toggling as those
            // legends load.
            esriLegendWatcher.current = reactiveUtils.watch(
              () => legend.activeLayerInfos.length > 0,
              (hasLayers) => setDisplayEsriLegend(hasLayers),
              { initial: true },
            );
          }}
        />
      </div>

      {/*
        Portaled out of the panel, because <arcgis-expand> renders its slot in a
        calcite-popover that is display: none while collapsed. The PDF export
        measures and rasterizes these nodes, so they have to keep their layout;
        sr-only leaves it intact.
      */}
      {createPortal(
        <div
          aria-hidden={true}
          className="hmw-map-legend sr-only"
          id="non-visible-legend"
        >
          <div ref={offscreenHmwLegend} />
          {/* set the view, since there is no ancestor out here to find it on */}
          <arcgis-legend layerInfos={[]} view={view} />
        </div>,
        document.body,
      )}
    </Fragment>
  );
}

function ShowAddSaveDataWidget({
  addSaveDataWidgetVisible,
  setAddSaveDataWidgetVisible,
  slot,
}: Readonly<{
  addSaveDataWidgetVisible: boolean;
  setAddSaveDataWidgetVisible: Dispatch<SetStateAction<boolean>>;
  slot: MapSlot;
}>) {
  const [hover, setHover] = useState(false);

  const clickHandler = useCallback(
    (ev: React.MouseEvent | React.KeyboardEvent) => {
      if (!isClick(ev)) return;
      setAddSaveDataWidgetVisible((visible) => !visible);
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
      slot={slot}
      tabIndex={0}
    >
      <calcite-icon
        icon={addSaveDataWidgetVisible ? 'chevrons-right' : 'plus-square'}
        scale="s"
      />
    </div>
  );
}

const divStyle = (disabled: boolean, hover: boolean) => css`
  align-items: center;
  background-color: ${!disabled && hover ? '#F0F0F0' : 'white'};
  /* matches the shadow Esri applies to .esri-component.esri-widget */
  box-shadow: 0 1px 2px rgb(0 0 0 / 30%);
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
  slot: MapSlot;
};

function ExpandCollapse({
  fullscreenActive,
  setFullscreenActive,
  mapViewSetter,
  slot,
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
      slot={slot}
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
      <calcite-icon
        icon={fullscreenActive ? 'zoom-in-fixed' : 'zoom-out-fixed'}
        scale="s"
      />
    </div>
  );
}

function retrieveUpstreamWatershed(
  abortSignal: AbortSignal,
  getCurrentExtent: () => Extent,
  getHuc12: () => string,
  getTemplate: GetTemplateType,
  getUpstreamExtent: () => Extent,
  upstreamLayer: GraphicsLayer | null,
  getUpstreamWidgetDisabled: () => boolean,
  getWatershed: () => WatershedAttributes,
  lastHuc12: string,
  services: ServicesData,
  setErrorMessage: Dispatch<SetStateAction<string>>,
  setLastHuc12: Dispatch<SetStateAction<string>>,
  setUpstreamExtent: Dispatch<SetStateAction<Viewpoint>>,
  setUpstreamLayerErrored: (isErrored: boolean) => void,
  updateVisibleLayers: (
    updates?: Partial<LayersState['visible']>,
    merge?: boolean,
  ) => void,
  setUpstreamWatershedResponse: Dispatch<
    SetStateAction<{ status: Status; data: FeatureSet | null }>
  >,
  setUpstreamWidgetDisabled: Dispatch<SetStateAction<boolean>>,
  view: MapView | null,
  setUpstreamLoading: Dispatch<SetStateAction<boolean>>,
  upstreamLayerErrored: boolean,
  huc12 = null,
  canDisable = true,
) {
  // if widget is disabled do nothing
  if (getUpstreamWidgetDisabled()) return;
  if (!upstreamLayer) return;

  const currentHuc12 = huc12 ?? getHuc12();
  // location hasn't resolved yet - an empty filter would disable the widget
  if (!currentHuc12) return;

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
    if (view?.popup && view.popup.hasOwnProperty('close')) view.popup.close();
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
    updateVisibleLayers({
      upstreamLayer: true,
      watershedsLayer: false,
    });
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
      updateVisibleLayers({
        upstreamLayer: true,
        watershedsLayer: false,
      });

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
  upstreamLayer: GraphicsLayer | null;
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
  const [watcher, setWatcher] = useState<ResourceHandle | null>(null);
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
          <calcite-icon
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
  getCurrentExtent: () => Extent;
  getHuc12: () => string;
  getTemplate: GetTemplateType;
  getUpstreamExtent: () => Extent;
  upstreamLayer: GraphicsLayer | null;
  getUpstreamWidgetDisabled: () => boolean;
  getWatershed: () => WatershedAttributes;
  services: ServicesData;
  setErrorMessage: Dispatch<SetStateAction<string>>;
  setUpstreamExtent: Dispatch<SetStateAction<Viewpoint>>;
  setUpstreamLayerErrored: (isErrored: boolean) => void;
  setUpstreamWatershedResponse: Dispatch<
    SetStateAction<{ status: Status; data: FeatureSet | null }>
  >;
  setUpstreamWidgetDisabled: Dispatch<SetStateAction<boolean>>;
  slot: MapSlot;
  updateVisibleLayers: (
    updates?: Partial<LayersState['visible']>,
    merge?: boolean,
  ) => void;
  upstreamLayerErrored: boolean;
  view: MapView | null;
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
  slot,
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
    <div slot={slot}>
      <ShowUpstreamWatershed
        getUpstreamWidgetDisabled={getUpstreamWidgetDisabled}
        onClick={handleClick}
        upstreamLayer={upstreamLayer}
        upstreamLoading={upstreamLoading}
      />
    </div>
  );
}

type ShowSelectedUpstreamWatershedProps = ShowCurrentUpstreamWatershedProps & {
  map: Map;
  mapRef: MutableRefObject<HTMLDivElement | null>;
  setCurrentExtent: Dispatch<SetStateAction<Extent>>;
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
  slot,
  upstreamLayerErrored,
}: ShowSelectedUpstreamWatershedProps) {
  const { upstreamWidgetDisabled } = useContext(LocationSearchContext);
  // Record visibility state of watersheds layer to restore later
  const [watershedsVisible, setWatershedsVisible] = useState(false);

  // Store the watersheds layer instance for later access
  const [watershedsLayer, setWatershedsLayer] = useState<FeatureLayer | null>(
    null,
  );

  useEffect(() => {
    if (!map) return;

    const newWatershedsLayer = map.findLayerById(
      'watershedsLayer',
    ) as FeatureLayer | null;
    setWatershedsLayer(newWatershedsLayer);
    newWatershedsLayer && setWatershedsVisible(newWatershedsLayer.visible);
  }, [map]);

  const [selectionActive, setSelectionActive] = useState(false);
  const [instructionsVisible, setInstructionsVisible] = useState(false);
  const [originalMinScale, setOriginalMinScale] = useState(0);
  const [originalMaxScale, setOriginalMaxScale] = useState(0);

  // Show/hide instruction dialogue when watershed selection activity changes
  useEffect(() => {
    setInstructionsVisible(selectionActive);
  }, [selectionActive]);

  // Disable "selection mode" and/or restore the
  // initial visibility of the watersheds layer
  const cancelSelection = useCallback(() => {
    updateVisibleLayers({ watershedsLayer: watershedsVisible });
    if (watershedsLayer) {
      watershedsLayer.minScale = originalMinScale;
      watershedsLayer.maxScale = originalMaxScale;
    }

    setSelectionActive(false);
  }, [
    originalMaxScale,
    originalMinScale,
    updateVisibleLayers,
    watershedsLayer,
    watershedsVisible,
  ]);

  // Get the selected watershed, search for
  // its upstream watershed, and draw it
  const [lastHuc12, setLastHuc12] = useState<string>('');
  const [upstreamLoading, setUpstreamLoading] = useState(false);

  const handleHucSelection = useCallback(
    (ev: ClickEvent) => {
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

      ev.stopPropagation();

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
      if (watershedsLayer) {
        watershedsLayer.minScale = originalMinScale;
        watershedsLayer.maxScale = originalMaxScale;
      }

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
      setOriginalMinScale(watershedsLayer.minScale);
      setOriginalMaxScale(watershedsLayer.maxScale);
      updateVisibleLayers({
        watershedsLayer: true,
      });
      watershedsLayer.minScale = 0;
      watershedsLayer.maxScale = 0;
    }

    setSelectionActive(true);
  }, [
    getCurrentExtent,
    originalMaxScale,
    originalMinScale,
    updateVisibleLayers,
    upstreamLayer,
    view,
    watershedsLayer,
    watershedsVisible,
  ]);

  function handleCloseClick(ev: React.KeyboardEvent | React.MouseEvent) {
    if (!isClick(ev)) return;

    setSelectionActive(false);
    setInstructionsVisible(false);
    updateVisibleLayers({
      watershedsLayer: watershedsVisible,
    });
    if (watershedsLayer) {
      watershedsLayer.minScale = originalMinScale;
      watershedsLayer.maxScale = originalMaxScale;
    }
  }

  return (
    <div
      slot={slot}
      style={{
        cursor: upstreamWidgetDisabled ? 'default' : 'pointer',
        filter: selectionActive
          ? 'invert(0.8) brightness(1.5) contrast(1.5)'
          : 'none',
        opacity: upstreamWidgetDisabled ? '0.5' : '1',
      }}
    >
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
    </div>
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

// html-to-image rasterizes at the display's devicePixelRatio unless told
// otherwise, which would tie the printed size of a legend symbol to the screen
// it was exported from. Pinned, so it does not, and left above 1 to keep the
// symbols sharp in print.
const symbolPixelRatio = 2;

function handleError(error: unknown) {
  if (error instanceof Error || typeof error === 'object') {
    return (error as any)?.message;
  } else if (typeof error === 'string') {
    return error;
  } else {
    return 'Unknown error. Check developer tools console.';
  }
}

/**
 * querySelectorAll stops at every shadow boundary, and arcgis-legend opens a
 * new root for each layer and each of its sublayers.
 *
 * @param root Node to search under
 * @param selector Selector to match
 * @returns The outermost match of each branch. A layer block nests another for
 *   each sublayer, and returning both would count the inner one's rows twice.
 */
function queryShadowAll(root: ParentNode, selector: string) {
  const matches: Element[] = [];

  const walk = (node: ParentNode) => {
    for (const child of node.children) {
      if (child.matches(selector)) {
        matches.push(child);
        continue;
      }
      walk(child);
      if (child.shadowRoot) walk(child.shadowRoot);
    }
  };
  walk(root);

  return matches;
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
  view: MapView;
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
   * element, symbolSelector and textSelector.
   *
   * @param legendItems Array to add legend item to
   * @param element Element to search in
   * @param symbolSelector Selector for the symbol part
   * @param textSelector Selector for the text part
   * @param type Type of legend item (h1, h2, h3 or item)
   * @param firstOnly Only include the first text item
   */
  async function addLegendItem({
    legendItems,
    element,
    symbolSelector,
    textSelector,
    type,
    firstOnly = true,
  }: {
    legendItems: PdfLegendItem[];
    element: Element;
    symbolSelector?: string;
    textSelector: string;
    type: PdfLegendItemType;
    firstOnly?: boolean;
  }) {
    const image = !symbolSelector
      ? null
      : await getImage(element, symbolSelector);
    let itemsAdded = 0;

    // skip adding text if the png was generated from a div
    const symbols = !symbolSelector
      ? null
      : queryShadowAll(element, symbolSelector);
    if (!symbolSelector || (symbols && symbols.length > 0)) {
      // get captions
      const textItems = queryShadowAll(element, textSelector);

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
    const legendElm = document.getElementById('non-visible-legend');
    if (!legendElm) return;

    const listItems = legendElm.getElementsByClassName('hmw-legend__item');
    for (const item of listItems) {
      // get the text
      await addLegendItem({
        legendItems,
        element: item,
        symbolSelector: '.hmw-legend__symbol',
        textSelector: '.hmw-legend__info',
        type: 'imageItem',
      });
    }
  }

  /*
   * Two shapes end up under #non-visible-legend, so every selector below pairs
   * them: our own markup for the mapped water legend, which borrows the class
   * names of the widget arcgis-legend replaced (see MapLegend.tsx), and the
   * component's own markup for everything else.
   */
  const legendSelectors = {
    service: '.esri-legend__service, .layers > .layer',
    group: '.esri-legend__group-layer-child, .layer-child',
    title: '.esri-legend__service-label, .esri-widget__heading',
    layer: '.esri-legend__layer, .layer-table',
    caption: '.esri-legend__layer-caption, .layer-caption',
    row: '.esri-legend__layer-row, .layer-row',
    symbol: '.esri-legend__symbol, .symbol',
    info: '.esri-legend__layer-cell--info, .layer-cell-info',
  };

  /**
   * Parses the dom and adds the Esri portion of the legend to the
   * provided legendItems array.
   * @param legendItems Array to add legend items to
   */
  async function appendEsriLegendItems(legendItems: PdfLegendItem[]) {
    // loop through layers of esri legend items
    const legendElm = document.getElementById('non-visible-legend');
    if (!legendElm) return;
    const legendServices = queryShadowAll(legendElm, legendSelectors.service);
    for (const legendService of legendServices) {
      let hasHighestLevel = false;
      const groups = queryShadowAll(legendService, legendSelectors.group);
      if (groups.length === 0) groups.push(legendService);
      else {
        await addLegendItem({
          legendItems,
          element: legendService,
          textSelector: legendSelectors.title,
          type: 'h1',
        });
        hasHighestLevel = true;
      }

      for (const group of groups) {
        // get main title
        await addLegendItem({
          legendItems,
          element: group,
          textSelector: legendSelectors.title,
          type: hasHighestLevel ? 'h2' : 'h1',
        });

        // get layer level content
        const layers = queryShadowAll(group, legendSelectors.layer);
        for (const layer of layers) {
          // get captions
          await addLegendItem({
            legendItems,
            element: layer,
            textSelector: legendSelectors.caption,
            type: hasHighestLevel ? 'h3' : 'h2',
            firstOnly: false,
          });

          // get row level content
          const rows = queryShadowAll(layer, legendSelectors.row);
          for (const row of rows) {
            // get the text
            await addLegendItem({
              legendItems,
              element: row,
              symbolSelector: legendSelectors.symbol,
              textSelector: legendSelectors.info,
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
   * @param maxWidth Widest the image may be drawn
   * @returns The pdfImage, scaled height and scaled width
   */
  async function embedImage(
    doc: PDFDocumentType,
    image: PdfLegendImage | null | undefined,
    maxWidth: number,
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

      // Some services publish a legend as one wide swatch with its labels drawn
      // in. Left at the usual factor those run into the next column.
      const dimensions = pdfImage.scale(
        Math.min(
          imageScaleFactor / symbolPixelRatio,
          maxWidth / pdfImage.width,
        ),
      );

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
   * @param searchSelector Selector for the symbol being searched for.
   * @returns code as base64 PNG and height/width of image.
   */
  async function getImage(parentElement: Element, searchSelector: string) {
    const htmltoimage = await import('html-to-image');
    // get the symbol
    const symbols = queryShadowAll(parentElement, searchSelector);
    const symbol = (
      symbols.length > 0 ? symbols[0] : parentElement
    ) as HTMLElement;

    // An <img> that has not loaded measures 0 wide, and html-to-image sizes its
    // canvas from that, so toPng hands back "data:," and embedPng rejects it.
    await Promise.all(
      [symbol, ...queryShadowAll(symbol, 'img')]
        .filter((el): el is HTMLImageElement => el instanceof HTMLImageElement)
        .map((img) => img.decode().catch(() => {})),
    );

    // set div to visible to avoid blank image
    const lastVisibility = symbol.style.visibility;
    symbol.style.visibility = 'visible';
    const img = await htmltoimage.toPng(symbol, {
      pixelRatio: symbolPixelRatio,
      skipFonts: true,
    });
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

      const indent = leftMargin * numberOfIndents;

      // set x starting position
      let x = horizontalPosition + pageMargin + indent;

      // get image dimensions after scaling
      const { pdfImage, imageScaledHeight, imageScaledWidth } =
        await embedImage(doc, image, columnWidth - indent);

      // the text is drawn a leftMargin to the right of the image, so the column
      // has that much less room for it
      const textWidth = Math.max(
        columnWidth -
          indent -
          (imageScaledWidth ? leftMargin + imageScaledWidth : 0),
        0,
      );

      // wrap text and calculate height of text
      const { multiLineText, textHeight } = getMultilineText({
        text,
        font,
        fontSize,
        bounds: {
          x,
          y: verticalPosition - topMargin,
          width: textWidth,
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
  view: MapView;
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
