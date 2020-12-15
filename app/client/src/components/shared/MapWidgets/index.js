// @flow

import React from 'react';
import ReactDOM from 'react-dom';
// components
import MapLegend from 'components/shared/MapLegend';
// contexts
import { EsriModulesContext } from 'contexts/EsriModules';
import { LocationSearchContext } from 'contexts/locationSearch';
import { FullscreenContext } from 'contexts/Fullscreen';
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import { shallowCompare } from 'components/pages/LocationMap/MapFunctions';
// helpers
import { useDynamicPopup } from 'utils/hooks';

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
  'mappedWaterLayer',
  'watershedsLayer',
  'congressionalLayer',
  'stateBoundariesLayer',
];

// function called whenever the map's zoom changes
function handleMapZoomChange(newVal: number, target: any) {
  // return early if zoom is not set to an integer
  if (newVal % 1 !== 0) return;
  // set listMode for each layer, when zoom changes (practically, this shows/
  // hides 'County' or 'Mapped Water (all)' layers, depending on zoom level)
  target.map.layers.items.forEach((layer) => {
    if (zoomDependentLayers.includes(layer.id)) {
      if (isInScale(layer, target.scale)) {
        layer.listMode = layer.hasOwnProperty('sublayers')
          ? 'hide-children'
          : 'show';
      } else {
        layer.listMode = 'hide';
      }
    }
  });
}

// helper method used in handleMapZoomChange() for determining a map layer’s listMode
function isInScale(layer: any, scale: number) {
  const { maxScale, minScale } = layer;
  let isInScale = true;
  if (minScale > 0 || maxScale > 0) {
    if (maxScale > 0 && minScale > 0) {
      isInScale = maxScale <= scale && scale <= minScale;
    } else if (maxScale > 0) {
      isInScale = maxScale <= scale;
    } else if (minScale > 0) {
      isInScale = scale <= minScale;
    }
  }
  return isInScale;
}

function updateVisibleLayers(view: any, legendNode: Node) {
  if (!view || !view.map || !view.map.layers || !view.map.layers.items) {
    return;
  }

  // used to order the layer legends, so the ordering is consistent no matter
  // which layer legends are visible.
  const orderedLayers = [
    'waterbodyLayer',
    'monitoringStationsLayer',
    'issuesLayer',
    'dischargersLayer',
    'nonprofitsLayer',
    'providersLayer',
    'upstreamWatershed',
    'boundariesLayer',
    'actionsWaterbodies',
    'watershedsLayer',
    'countyLayer',
    'mappedWaterLayer',
    'stateBoundariesLayer',
    'congressionalLayer',
    'tribalLayer',
    'tribalLayer-1',
    'tribalLayer-2',
    'tribalLayer-4',
    'wsioHealthIndexLayer',
    'searchIconLayer',
  ];

  // build an array of layers that are visible based on the ordering above
  const visibleLayers = [];
  orderedLayers.forEach((layerId) => {
    // get the esri layer from the map view
    let layer = view.map.layers.items.find((layer) => layer.id === layerId);
    if (!layer) return;

    // add the layer if it is visible on the map. Boundaries and actions
    // waterbodies layers are handled separately here because it is always
    // hidden from the layer list widget, but still needs to be in the legend.
    if (
      (layer.visible && layer.listMode !== 'hide') ||
      (layer.visible && layer.id === 'boundariesLayer') ||
      (layer.visible && layer.id === 'actionsWaterbodies') ||
      (layer.visible && layer.id === 'upstreamWatershed')
    ) {
      visibleLayers.push(layer);
    }
  });

  ReactDOM.render(<MapLegend visibleLayers={visibleLayers} />, legendNode);
}

// --- components ---
type Props = {
  // map and view props auto passed from parent Map component by react-arcgis
  map: any,
  view: any,
  layers: Array<any>,
  scrollToComponent: string,
  onHomeWidgetRendered: (homeWidget: any) => void,
};

function MapWidgets({
  map,
  view,
  layers,
  scrollToComponent,
  onHomeWidgetRendered = () => {},
}: Props) {
  const {
    Home,
    PortalBasemapsSource,
    BasemapGallery,
    LayerList,
    Expand,
    watchUtils,
    ScaleBar,
    Query,
    QueryTask,
    Viewpoint,
    Graphic,
  } = React.useContext(EsriModulesContext);

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
  } = React.useContext(LocationSearchContext);

  const services = useServicesContext();

  const getDynamicPopup = useDynamicPopup();
  const { getTemplate } = getDynamicPopup();

  const {
    getFullscreenActive,
    setFullscreenActive, //
  } = React.useContext(FullscreenContext);

  const [mapEventHandlersSet, setMapEventHandlersSet] = React.useState(false);

  // add the layers to the map
  React.useEffect(() => {
    if (!layers || !map) return;

    map.removeAll();
    map.addMany(layers);
  }, [layers, map]);

  // put the home widget back on the ui after the window is resized
  React.useEffect(() => {
    if (homeWidget) {
      const newHomeWidget = new Home({ view, viewpoint: homeWidget.viewpoint });
      view.ui.add(newHomeWidget, { position: 'top-left', index: 1 });
      view.ui.move('zoom', 'top-left');
      setHomeWidget(newHomeWidget);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keeps the layer visiblity in sync with the layer list widget visibilities
  const [toggledLayer, setToggledLayer] = React.useState({});
  const [lastToggledLayer, setLastToggledLayer] = React.useState({});
  React.useEffect(() => {
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
  React.useEffect(() => {
    if (!view || homeWidget) return;

    // create the home widget
    const newHomeWidget = new Home({ view });
    view.ui.add(newHomeWidget, { position: 'top-left', index: 1 });
    view.ui.move('zoom', 'top-left');
    // pass the home widget up to the consumer of this component,
    // so it can modify it as needed (e.g. update the viewpoint)
    onHomeWidgetRendered(newHomeWidget);
    setHomeWidget(newHomeWidget);
  }, [Home, onHomeWidgetRendered, setHomeWidget, view, homeWidget]);

  // Creates and adds the scale bar widget to the map
  const [scaleBar, setScaleBar] = React.useState(null);
  React.useEffect(() => {
    if (!view || scaleBar) return;

    const newScaleBar = new ScaleBar({
      view: view,
      unit: 'dual',
    });
    view.ui.add(newScaleBar, { position: 'bottom-left', index: 1 });
    setScaleBar(newScaleBar);
  }, [ScaleBar, view, scaleBar]);

  // manages which layers are visible in the legend
  const legendTemp = document.createElement('div');
  legendTemp.className = 'map-legend';
  const [legendNode] = React.useState(legendTemp);

  // Creates and adds the legend widget to the map
  const [legend, setLegend] = React.useState(null);
  React.useEffect(() => {
    if (!view || legend) return;

    const newLegend = new Expand({
      content: legendNode,
      view,
      expanded: false,
      expandIconClass: 'esri-icon-layer-list',
      expandTooltip: 'Toggle Legend',
      autoCollapse: true,
      mode: 'floating',
    });
    view.ui.add(newLegend, { position: 'bottom-left', index: 0 });
    setLegend(newLegend);
  }, [Expand, view, legend, legendNode]);

  // Creates and adds the basemap/layer list widget to the map
  const [layerListWidget, setLayerListWidget] = React.useState(null);
  React.useEffect(() => {
    if (!view || layerListWidget) return;

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
    const uniqueParentItems = [];
    function defineActions(event) {
      const item = event.item;
      if (!item.parent) {
        //only add the item if it has not been added before
        if (!uniqueParentItems.includes(item.title)) {
          uniqueParentItems.push(item.title);
          updateVisibleLayers(view, legendNode);

          item.watch('visible', function (event) {
            updateVisibleLayers(view, legendNode);
            const dict = {
              layerId: item.layer.id,
              visible: item.layer.visible,
            };
            setToggledLayer(dict);
          });
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
    container.appendChild(basemapWidget.domNode);
    container.appendChild(document.createElement('hr'));
    container.appendChild(layerListHeader);
    container.appendChild(layerlist.domNode);

    const expandWidget = new Expand({
      expandIconClass: 'esri-icon-layers',
      view: view,
      mode: 'floating',
      autoCollapse: true,
      content: container,
    });

    view.ui.add(expandWidget, { position: 'top-right', index: 0 });
    setLayerListWidget(layerlist);
  }, [
    BasemapGallery,
    Expand,
    LayerList,
    PortalBasemapsSource,
    legendNode,
    view,
    layerListWidget,
  ]);

  // Sets up the zoom event handler that is used for determining if layers
  // should be visible at the current zoom level.
  React.useEffect(() => {
    if (!view || mapEventHandlersSet) return;

    // setup map event handlers
    watchUtils.watch(view, 'zoom', (newVal, oldVal, propName, target) => {
      handleMapZoomChange(newVal, target);
    });

    // when basemap changes, update the basemap in context for persistent basemaps
    // across fullscreen and mobile/desktop layout changes
    view.map.allLayers.on('change', function (event) {
      if (map.basemap !== basemap) {
        setBasemap(map.basemap);
      }
    });

    setMapEventHandlersSet(true);
  }, [watchUtils, view, mapEventHandlersSet, basemap, setBasemap, map]);

  React.useEffect(() => {
    if (!layers || layers.length === 0) return;

    //build a list of layers that we care about
    const layerList = [
      'dischargersLayer',
      'monitoringStationsLayer',
      'nonprofitsLayer',
      'providersLayer',
      'waterbodyLayer',
      'issuesLayer',
      'actionsLayer',
    ];

    // hide/show layers based on the provided list of layers to show
    if (layers) {
      layers.forEach((layer) => {
        if (layerList.includes(layer.id)) {
          if (visibleLayers.hasOwnProperty(layer.id)) {
            layer.visible = visibleLayers[layer.id];
            layer.listMode = layer.layers ? 'hide-children' : 'show';
          } else {
            layer.visible = false;
            layer.listMode = 'hide';
          }
        } else if (layer.id === 'boundariesLayer') {
          if (visibleLayers.hasOwnProperty('boundariesLayer')) {
            layer.visible = visibleLayers['boundariesLayer'];
          } else {
            layer.visible = true;
          }
        }
      });
    }
  }, [layers, visibleLayers]);

  // This code removes any layers that still have a listMode of hide.
  // This is a workaround for an ESRI bug. The operational items are
  // updated automatically when the listModes for the layers are changed,
  // however ESRI always leaves one layer behind that has a listMode equal
  // to hide. The other part of this bug, is if you build a new collection
  // of operationalItems then the layer loading indicators no longer work.
  React.useEffect(() => {
    if (!layerListWidget) return;

    const numOperationalItems = layerListWidget.operationalItems.items.length;
    for (let i = numOperationalItems - 1; i >= 0; i--) {
      const item = layerListWidget.operationalItems.items[i];
      if (item.layer.listMode === 'hide') {
        layerListWidget.operationalItems.splice(i, 1);
      }
    }
  }, [layerListWidget, visibleLayers]);

  // create the home widget, layers widget, and setup map zoom change listener
  const [
    fullScreenWidgetCreated,
    setFullScreenWidgetCreated, //
  ] = React.useState(false);
  React.useEffect(() => {
    if (fullScreenWidgetCreated) return;

    // create the basemap/layers widget
    const node = document.createElement('div');
    view.ui.add(node, { position: 'bottom-right', index: 0 });
    ReactDOM.render(
      <ExpandCollapse
        scrollToComponent={scrollToComponent}
        fullscreenActive={getFullscreenActive}
        setFullscreenActive={setFullscreenActive}
      />,
      node,
    );
    setFullScreenWidgetCreated(true);
  }, [
    getFullscreenActive,
    setFullscreenActive,
    scrollToComponent,
    view,
    fullScreenWidgetCreated,
  ]);

  // watch for location changes and disable/enable the upstream widget accordingly
  // widget should only be displayed on valid Community page location
  React.useEffect(() => {
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

  React.useEffect(() => {
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

  // watch for changes to upstream layer visibility and update visible layers accordingly
  React.useEffect(() => {
    updateVisibleLayers(view, legendNode);
  }, [view, legendNode, upstreamLayerVisible]);

  // create upstream widget
  const [
    upstreamWidgetCreated,
    setUpstreamWidgetCreated, //
  ] = React.useState(false);
  React.useEffect(() => {
    if (upstreamWidgetCreated || !view || !view.ui) return;

    const node = document.createElement('div');
    view.ui.add(node, { position: 'top-right', index: 1 });
    setUpstreamWidget(node); // store the widget in context so it can be shown or hidden later
    ReactDOM.render(
      <ShowUpstreamWatershed
        getWatershedName={getWatershed}
        getHuc12={getHuc12}
        getCurrentExtent={getCurrentExtent}
        getUpstreamLayer={getUpstreamLayer}
        setUpstreamLayer={setUpstreamLayer}
        getUpstreamExtent={getUpstreamExtent}
        setUpstreamExtent={setUpstreamExtent}
        setErrorMessage={setErrorMessage}
        getUpstreamWidgetDisabled={getUpstreamWidgetDisabled}
        setUpstreamWidgetDisabled={setUpstreamWidgetDisabled}
        setUpstreamLayerVisible={setUpstreamLayerVisible}
      />,
      node,
    );
    setUpstreamWidgetCreated(true);
  }, [
    setUpstreamWidget,
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

  type upstreamProps = {
    getWatershedName: Function,
    getHuc12: Function,
    getCurrentExtent: Function,
    getUpstreamLayer: Function,
    setUpstreamLayer: Function,
    getUpstreamExtent: Function,
    setUpstreamExtent: Function,
    setErrorMessage: Function,
    getUpstreamWidgetDisabled: Function,
    setUpstreamWidgetDisabled: Function,
    setUpstreamLayerVisible: Function,
  };

  function ShowUpstreamWatershed({
    getWatershedName,
    getHuc12,
    getCurrentExtent,
    getUpstreamLayer,
    setUpstreamLayer,
    getUpstreamExtent,
    setUpstreamExtent,
    setErrorMessage,
    getUpstreamWidgetDisabled,
    setUpstreamWidgetDisabled,
    setUpstreamLayerVisible,
  }: upstreamProps) {
    const [hover, setHover] = React.useState(false);
    const [lastHuc12, setLastHuc12] = React.useState('');

    // store loading state to Upstream Watershed map widget icon
    const [upstreamLoading, setUpstreamLoading] = React.useState(false);

    const currentHuc12 = getHuc12();

    const upstreamWidgetDisabled = getUpstreamWidgetDisabled();
    const upstreamLayer = getUpstreamLayer();

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
        onClick={(ev) => {
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
              : 'esri-icon esri-icon-maps'
          }
          style={
            !upstreamWidgetDisabled && hover ? buttonHoverStyle : buttonStyle
          }
        />
      </div>
    );
  }

  const retrieveUpstreamWatershed = React.useCallback(
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
      const query = new Query({
        returnGeometry: true,
        where: filter,
        outFields: ['*'],
      });

      setUpstreamLoading(true);

      new QueryTask({
        url: services.data.upstreamWatershed,
      })
        .execute(query)
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

          upstreamLayer.graphics.add(
            new Graphic({
              geometry: {
                type: res.geometryType,
                spatialReference: res.spatialReference,
                rings: res.features[0].geometry.rings,
              },
              symbol: {
                type: 'simple-fill',
                style: 'solid',
                color: [31, 184, 255, 0.2],
                outline: {
                  style: 'solid',
                  color: 'black',
                  width: 1,
                },
              },
              attributes: res.features[0].attributes,
              popupTemplate: {
                title: upstreamTitle,
                content: getTemplate,
                outfields: ['*'],
              },
            }),
          );

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
    [
      view,
      Query,
      QueryTask,
      Viewpoint,
      Graphic,
      services.data.upstreamWatershed,
    ],
  );

  return null;
}

const buttonStyle = {
  margin: '8.5px',
  fontSize: '15px',
  textAlign: 'center',
  verticalAlign: 'middle',

  backgroundColor: 'white',
  color: '#6E6E6E',
};

const buttonHoverStyle = {
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
  scrollToComponent: string,
  fullscreenActive: boolean,
  setFullscreenActive: Function,
};

function ExpandCollapse({
  scrollToComponent,
  fullscreenActive,
  setFullscreenActive,
}: ExpandeCollapseProps) {
  const [hover, setHover] = React.useState(false);

  return (
    <div
      title={fullscreenActive() ? 'Exit fullscreen' : 'Enter fullscreen'}
      style={hover ? divHoverStyle : divStyle}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      onClick={(ev) => {
        // Toggle scroll bars
        if (fullscreenActive()) {
          // Display the scroll bars
          document.documentElement.style.overflow = 'auto';
          document.body.scroll = 'yes'; //ie browser
        } else {
          // Hide the scroll bars
          document.documentElement.style.overflow = 'hidden';
          document.body.scroll = 'no'; //ie browser
        }

        // Toggle fullscreen mode
        setFullscreenActive(!fullscreenActive());
      }}
    >
      <span
        className={
          fullscreenActive()
            ? 'esri-icon esri-icon-zoom-in-fixed'
            : 'esri-icon esri-icon-zoom-out-fixed'
        }
        style={hover ? buttonHoverStyle : buttonStyle}
      />
    </div>
  );
}

export default MapWidgets;
