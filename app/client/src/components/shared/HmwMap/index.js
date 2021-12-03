// @flow

import React from 'react';
import type { Node } from 'react';
import { css } from 'styled-components/macro';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import MapWidgets from 'components/shared/MapWidgets';
import MapMouseEvents from 'components/shared/MapMouseEvents';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';

// --- styled components ---
const mapContainerStyles = css`
  position: absolute;
  width: 100%;
  height: 100%;
`;

// --- components ---
type Props = {
  layers: Object,
  startingExtent?: Object,
  children?: Node,
};

function HmwMap({ layers = null, startingExtent = null, children }: Props) {
  const {
    initialExtent,
    highlightOptions,
    getBasemap,
    mapView,
    setMapView,
  } = React.useContext(LocationSearchContext);

  const [map, setMap] = React.useState(null);

  // Initialize the map
  const [mapInitialized, setMapInitialized] = React.useState(false);
  React.useEffect(() => {
    if (mapInitialized) return;

    const newMap = new Map({
      basemap: getBasemap(),
      layers: [],
    });
    setMap(newMap);

    const view = new MapView({
      container: 'hmw-map-container',
      map: newMap,
      extent: startingExtent ?? initialExtent,
      highlightOptions,
    });
    setMapView(view);

    setMapInitialized(true);
  }, [
    mapInitialized,
    getBasemap,
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

export default HmwMap;
