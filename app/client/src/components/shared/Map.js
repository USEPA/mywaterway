// @flow

import React, { useContext, useState, useEffect } from 'react';
import type { Node } from 'react';
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
  layers: Object,
  startingExtent?: Object,
  children?: Node,
};

function Map({ layers = null, startingExtent = null, children }: Props) {
  const { basemap, highlightOptions, initialExtent, mapView, setMapView } =
    useContext(LocationSearchContext);

  const [map, setMap] = useState(null);

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

  return (
    <div id="hmw-map-container" css={mapContainerStyles}>
      {map && mapView && (
        <>
          <MapWidgets map={map} view={mapView} layers={layers} />
          <MapMouseEvents map={map} view={mapView} />
        </>
      )}
    </div>
  );
}

export default Map;
