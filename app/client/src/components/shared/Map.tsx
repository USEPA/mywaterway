/** @jsxImportSource @emotion/react */

import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import EsriMap from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import FullscreenContainer from 'components/shared/FullscreenContainer';
import MapWidgets from 'components/shared/MapWidgets';
import MapMouseEvents from 'components/shared/MapMouseEvents';
// contexts
import { useAddSaveDataWidgetState } from 'contexts/AddSaveDataWidget';
import { useFullscreenState } from 'contexts/Fullscreen';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useLayers } from 'contexts/Layers';
// types
import type { LayerId } from 'contexts/Layers';
import type { ReactNode } from 'react';

type Props = {
  children?: ReactNode;
  layers: __esri.Layer[] | null;
  startingExtent?: Object | null;
};

function Map({ children, layers = null, startingExtent = null }: Props) {
  const { widgetLayers } = useAddSaveDataWidgetState();
  const { basemap, highlightOptions, initialExtent, mapView, setMapView } =
    useContext(LocationSearchContext);

  const { visibleLayers } = useLayers();

  const [map, setMap] = useState<__esri.Map | null>(null);

  useEffect(() => {
    if (!layers || layers.length === 0) return;

    // hide/show layers based on the visibleLayers object
    map?.layers.forEach((layer) => {
      if (visibleLayers.hasOwnProperty(layer.id)) {
        layer.visible = visibleLayers[layer.id as LayerId];
      }
    });
  }, [layers, map, visibleLayers, widgetLayers]);

  const [mapInitialized, setMapInitialized] = useState(false);

  useEffect(() => {
    if (mapInitialized) return;

    const esriMap = new EsriMap({
      basemap,
      layers: [],
    });

    setMap(esriMap);

    const view = new MapView({
      container: 'hmw-map-container',
      map: esriMap,
      extent: startingExtent ?? initialExtent,
      highlightOptions,
    });

    setMapView(view);

    setMapInitialized(true);
  }, [
    mapInitialized,
    basemap,
    highlightOptions,
    initialExtent,
    startingExtent,
    setMapView,
  ]);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Calculate the height of the div holding the footer content.
  const [footerHeight, setFooterHeight] = useState(0);
  const footerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    setFooterHeight(node.getBoundingClientRect().height);
  }, []);

  return (
    <div css={{ position: 'absolute', height: '100%', width: '100%' }}>
      <div
        id="hmw-map-container"
        css={{
          position: 'relative',
          height: `calc(100% - ${footerHeight}px)`,
          width: '100%',
        }}
        ref={mapContainerRef}
      >
        {map && mapView && (
          <>
            <MapWidgets
              map={map}
              mapRef={mapContainerRef}
              view={mapView}
              layers={layers}
            />
            <MapMouseEvents map={map} view={mapView} />
          </>
        )}
      </div>
      <div ref={footerRef}>{children}</div>
    </div>
  );
}

export default function MapContainer(props: Props) {
  const { fullscreenActive } = useFullscreenState();
  return fullscreenActive ? (
    <FullscreenContainer title="Fullscreen Map View">
      <Map {...props} />
    </FullscreenContainer>
  ) : (
    <Map {...props} />
  );
}
