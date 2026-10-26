/** @jsxImportSource @emotion/react */

import { useContext, useEffect, useRef, useState } from 'react';
import '@arcgis/map-components/dist/components/arcgis-map';
import FullscreenContainer from 'components/shared/FullscreenContainer';
import MapWidgets from 'components/shared/MapWidgets';
import MapMouseEvents from 'components/shared/MapMouseEvents';
// contexts
import { useAddSaveDataWidgetState } from 'contexts/AddSaveDataWidget';
import { useConfigFilesState } from 'contexts/ConfigFiles';
import { useFullscreenState, FullscreenProvider } from 'contexts/Fullscreen';
import { initialExtent, LocationSearchContext } from 'contexts/locationSearch';
import { useLayers } from 'contexts/Layers';
// types
import type arcgisCoreMap from '@arcgis/core/Map';
import type Layer from '@arcgis/core/layers/Layer';
import type { LayerId } from 'contexts/Layers';
import type { ReactNode } from 'react';
// utils
import { basemapFromPortalItem } from 'utils/mapFunctions';
import { adoptMapStyles } from 'utils/popupStyles';

type Props = {
  children?: ReactNode;
  layers: Layer[] | null;
  startingExtent?: Object | null;
};

function Map({
  children,
  layers = null,
  startingExtent = null,
}: Readonly<Props>) {
  const { widgetLayers } = useAddSaveDataWidgetState();
  const services = useConfigFilesState().data.services;
  const { basemapId, highlightOptions, homeWidget, mapView, setMapView } =
    useContext(LocationSearchContext);

  const { visibleLayers } = useLayers();

  const [map, setMap] = useState<arcgisCoreMap | null>(null);

  useEffect(() => {
    return function cleanup() {
      setMap(null);
      setMapView(null);
    };
  }, [setMap, setMapView]);

  useEffect(() => {
    if (!layers || layers.length === 0) return;

    // hide/show layers based on the visibleLayers object
    map?.layers.forEach((layer) => {
      if (visibleLayers.hasOwnProperty(layer.id)) {
        layer.visible = visibleLayers[layer.id as LayerId];
      }
    });
  }, [layers, map, visibleLayers, widgetLayers]);

  // Create a basemap from the portal item ID.
  const [mapBasemap] = useState(() =>
    basemapFromPortalItem(basemapId ?? services.basemaps.default),
  );

  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Calculate the height of the div holding the footer content.
  const [footerHeight, setFooterHeight] = useState(0);

  const footerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!footerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const footer = entries.pop();
      if (footer) setFooterHeight(footer.contentRect.height);
    });

    resizeObserver.observe(footerRef.current);

    return function cleaup() {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div css={{ position: 'absolute', height: '100%', width: '100%' }}>
      <div
        css={{
          position: 'relative',
          height: `calc(100% - ${footerHeight}px)`,
          overflow: 'hidden',
          width: '100%',
        }}
        ref={mapContainerRef}
      >
        <arcgis-map
          basemap={mapBasemap}
          id="hmw-map-container"
          css={{
            height: '100%',
            width: '100%',
          }}
          onarcgisViewReadyChange={(event) => {
            setMap(event.target.map);
            setMapView(event.target.view);

            // The view lives in <arcgis-map>'s shadow root.
            // Styles for esri's own markup have to be adopted into it
            const viewRoot = event.target.view.container?.getRootNode();
            if (viewRoot instanceof ShadowRoot) adoptMapStyles(viewRoot);

            // TODO highlightOptions was deprecated, need to switch it out
            event.target.view.highlightOptions = highlightOptions;
            event.target.view.popupEnabled = false;
            // `viewpoint` ignores a viewpoint with no scale, and the home
            // viewpoint is usually stored as an extent alone.
            const homeViewpoint = homeWidget?.viewpoint;
            if (homeViewpoint?.scale) event.target.viewpoint = homeViewpoint;
            else if (homeViewpoint)
              event.target.extent = homeViewpoint.targetGeometry.extent;
            else
              event.target.extent = (startingExtent as any) ?? initialExtent();
          }}
        >
          {map && mapView && (
            <>
              <MapWidgets
                map={map}
                mapRef={mapContainerRef}
                view={mapView}
                layers={layers}
              />
              <MapMouseEvents view={mapView} />
            </>
          )}
        </arcgis-map>
      </div>
      <div ref={footerRef}>{children}</div>
    </div>
  );
}

export function MapContainer(props: Props) {
  const { fullscreenActive } = useFullscreenState();

  return fullscreenActive ? (
    <FullscreenContainer title="Fullscreen Map View">
      <Map {...props} />
    </FullscreenContainer>
  ) : (
    <Map {...props} />
  );
}

export default function MapWrapper(props: Readonly<Props>) {
  return (
    <FullscreenProvider>
      <MapContainer {...props} />
    </FullscreenProvider>
  );
}
