import { useContext, useEffect, useRef, useState } from 'react';
import { css } from 'styled-components/macro';
import EsriMap from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import MapWidgets from 'components/shared/MapWidgets';
import MapMouseEvents from 'components/shared/MapMouseEvents';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';

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
  const { basemap, highlightOptions, initialExtent, mapView, setMapView } =
    useContext(LocationSearchContext);

  const [map, setMap] = useState<__esri.Map | null>(null);

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
      popup: {
        collapseEnabled: false,
      },
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
