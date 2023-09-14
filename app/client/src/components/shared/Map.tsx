import { useContext, useEffect, useRef, useState } from 'react';
import { css } from 'styled-components/macro';
import EsriMap from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import MapWidgets from 'components/shared/MapWidgets';
import MapMouseEvents from 'components/shared/MapMouseEvents';
// contexts
import { useAddSaveDataWidgetState } from 'contexts/AddSaveDataWidget';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useLayers } from 'contexts/Layers';
// types
import type { LayerId } from 'contexts/Layers';

const mapContainerStyles = css`
  position: absolute;
  width: 100%;
  height: 100%;
`;

type Props = {
  layers: __esri.Layer[] | null;
  startingExtent?: Object | null;
};

function Map({ layers = null, startingExtent = null }: Props) {
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

  return (
    <div id="hmw-map-container" css={mapContainerStyles} ref={mapContainerRef}>
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
  );
}

export default Map;
