// @flow

import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Viewpoint from '@arcgis/core/Viewpoint';
import WindowSize from '@reach/window-size';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { css } from 'styled-components/macro';

import {
  boxStyles,
  boxHeadingStyles,
  boxSectionStyles,
} from 'components/shared/Box';
import MapErrorBoundary from 'components/shared/ErrorBoundary.MapErrorBoundary';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import Map from 'components/shared/Map';
import MapLoadingSpinner from 'components/shared/MapLoadingSpinner';
import MapVisibilityButton from 'components/shared/MapVisibilityButton';
import { errorBoxStyles } from 'components/shared/MessageBoxes';
import NavBar from 'components/shared/NavBar';
import Page from 'components/shared/Page';
import {
  splitLayoutContainerStyles,
  splitLayoutColumnsStyles,
  splitLayoutColumnStyles,
} from 'components/shared/SplitLayout';
import { characteristicGroupMappings } from 'config/characteristicGroupMappings';
import { monitoringError } from 'config/errorMessages';
import { FullscreenContext, FullscreenProvider } from 'contexts/Fullscreen';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
import { MapHighlightProvider } from 'contexts/MapHighlight';
import { colors } from 'styles';
import { fetchCheck } from 'utils/fetchUtils';
import { useSharedLayers } from 'utils/hooks';
import { plotStations } from 'utils/mapFunctions';

/*
 * Helpers
 */

const fetchStationDetails = async (url, setData, setStatus) => {
  const res = await fetchCheck(url);
  if (res.features.length < 1) {
    setStatus('no-station');
    return;
  }
  const feature = res.features[0];
  const stationDetails = {
    county: feature.properties.CountyName,
    huc8: feature.properties.HUCEightDigitCode,
    locationLongitude: feature.geometry.coordinates[0],
    locationLatitude: feature.geometry.coordinates[1],
    locationName: feature.properties.MonitoringLocationName,
    locationType: feature.properties.MonitoringLocationTypeName,
    orgId: feature.properties.OrganizationIdentifier,
    orgName: feature.properties.OrganizationFormalName,
    siteId: feature.properties.MonitoringLocationIdentifier,
    provider: feature.properties.ProviderName,
    state: feature.properties.StateName,
    sampleTotal: feature.properties.activityCount,
    measurementTotal: feature.properties.resultCount,
    groupCounts: feature.properties.characteristicGroupResultCount,
    groupMappings: {},
    uid:
      `${feature.properties.MonitoringLocationIdentifier}/` +
      `${feature.properties.ProviderName}/` +
      `${feature.properties.OrganizationIdentifier}`,
  };
  characteristicGroupMappings.forEach((mapping) => {
    stationDetails.groupMappings[mapping.label] = [];
    for (const group in stationDetails.groupCounts) {
      if (mapping.groupNames.includes(group)) {
        stationDetails.groupMappings[mapping.label].push(group);
      }
    }
  });

  // add any leftover lower-tier group counts to the 'Other' top-tier group
  for (const group in stationDetails.groupCounts) {
    //const groupsCategorized = Object.values
  }
  setData(stationDetails);
  setStatus('success');
};

const drawStation = (station, layer, services) => {
  if (isEmpty(station)) return false;
  if (services.status === 'fetching') return false;
  plotStations([station], layer, services);
  if (layer.graphics.length) return true;
};

const isEmpty = (obj) => {
  for (var x in obj) {
    return false;
  }
  return true;
};

const useMap = (station) => {
  const [layersInitialized, setLayersInitialized] = useState(false);
  const [doneDrawing, setDoneDrawing] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);

  const services = useServicesContext();
  const getSharedLayers = useSharedLayers();
  const {
    homeWidget,
    layers,
    mapView,
    monitoringLocationsLayer,
    resetData,
    setLayers,
    setMonitoringLocationsLayer,
    setVisibleLayers,
  } = useContext(LocationSearchContext);

  // Initialize the layers
  useEffect(() => {
    if (!getSharedLayers || layersInitialized) return;

    if (!monitoringLocationsLayer) {
      let newMonitoringLocationsLayer = new GraphicsLayer({
        id: 'monitoringLocationsLayer',
        title: 'Sample Locations',
        listMode: 'show',
        visible: true,
        legendEnabled: false,
      });
      setMonitoringLocationsLayer(newMonitoringLocationsLayer);
      setLayers([...getSharedLayers(), newMonitoringLocationsLayer]);
      setVisibleLayers({ monitoringLocationsLayer: true });
    } else {
      setLayersInitialized(true);
    }
  }, [
    getSharedLayers,
    layers,
    layersInitialized,
    monitoringLocationsLayer,
    setLayers,
    setMonitoringLocationsLayer,
    setVisibleLayers,
  ]);

  // Draw the station on the map
  useEffect(() => {
    if (!layersInitialized || doneDrawing) return;
    const result = drawStation(station, monitoringLocationsLayer, services);
    setDoneDrawing(result);
  }, [
    doneDrawing,
    layersInitialized,
    station,
    monitoringLocationsLayer,
    services,
  ]);

  // Zoom to the location of the station
  useEffect(() => {
    if (!doneDrawing || !mapView || !monitoringLocationsLayer || !homeWidget)
      return;

    let zoomParams = monitoringLocationsLayer.graphics;
    if (
      monitoringLocationsLayer.graphics.length === 1 &&
      (monitoringLocationsLayer.graphics.items[0].geometry.type === 'point' ||
        monitoringLocationsLayer.graphics.items[0].geometry.type ===
          'multipoint')
    ) {
      // handle zooming to a single point graphic
      zoomParams = {
        target: monitoringLocationsLayer.graphics,
        zoom: 16, // set zoom 1 higher since it gets decremented later
      };
    }

    mapView.goTo(zoomParams).then(() => {
      // set map zoom and home widget's viewpoint
      mapView.zoom = mapView.zoom - 1;
      homeWidget.viewpoint = new Viewpoint({
        targetGeometry: mapView.extent,
      });
      setMapLoading(false);
    });
  }, [doneDrawing, mapView, monitoringLocationsLayer, homeWidget]);

  // Function for resetting the LocationSearch context when the map is removed
  useEffect(() => {
    return function cleanup() {
      resetData();
    };
  }, [resetData]);

  return { layers, mapView, mapLoading };
};

const useStationDetails = (orgId, siteId) => {
  const services = useServicesContext();

  const [station, setStation] = useState({});
  const [stationStatus, setStationStatus] = useState('fetching');

  useEffect(() => {
    const url =
      `${services.data.waterQualityPortal.monitoringLocation}` +
      `search?mimeType=geojson&zip=no&organization=${orgId}&siteid=${siteId}`;

    fetchStationDetails(url, setStation, setStationStatus).catch((err) => {
      console.error(err);
      setStationStatus('failure');
      setStation({});
    });
  }, [services, setStation, setStationStatus, orgId, siteId]);

  return [station, stationStatus];
};

const sectionRow = (label, value, style, dataStatus) => (
  <div css={style}>
    <h3>{label}:</h3>
    {dataStatus === 'fetching' && <LoadingSpinner />}
    {dataStatus === 'failure' && (
      <div css={modifiedErrorBoxStyles}>
        <p>{monitoringError}</p>
      </div>
    )}
    {dataStatus === 'success' && <p>&nbsp; {value}</p>}
  </div>
);

const sectionRowBlock = (label, value, dataStatus) => {
  return sectionRow(label, value, boxSectionStyles, dataStatus);
};

const sectionRowInline = (label, value, dataStatus) => {
  return sectionRow(label, value, inlineBoxSectionStyles, dataStatus);
};

/*
 * Components
 */

function DownloadSection({ station, stationStatus }) {
  const [range, setRange] = useState('1');

  const ranges = [1, 5, 10];
  const inputs = ranges.map((n) => (
    <p>
      <input
        id={`${n}-year`}
        value={n}
        type="radio"
        name="date-range"
        checked={range === n.toString()}
        onChange={(e) => setRange(e.target.value)}
      />
      <label for={`${n}-year`}>{n === 1 ? `${n} Year` : `${n} Years`}</label>
    </p>
  ));

  return (
    <div css={boxStyles}>
      <h2 css={boxHeadingStyles}>Download Station Data</h2>
      <div css={modifiedBoxSectionStyles}>
        <fieldset>{inputs}</fieldset>
        <div id="download-links"></div>
      </div>
    </div>
  );
}

function InformationSection({ siteId, station, stationStatus }) {
  const heading = (
    <h2 css={infoBoxHeadingStyles}>
      {stationStatus === 'fetching' && <LoadingSpinner />}
      <span>
        {stationStatus === 'success' && station.locationName}
        <small>
          <strong>Monitoring Station ID:</strong>&nbsp; {siteId}
        </small>
      </span>
    </h2>
  );

  return (
    <div css={boxStyles}>
      {heading}
      {sectionRowInline('Organization Name', station.orgName, stationStatus)}
      {sectionRowInline('Organization ID', station.orgId, stationStatus)}
      {sectionRowInline(
        'Location',
        `${station.county}, ${station.state}`,
        stationStatus,
      )}
      {sectionRowInline('Water Type', station.locationType, stationStatus)}
    </div>
  );
}

function MonitoringStation({ fullscreen, orgId, siteId }) {
  const [station, stationStatus] = useStationDetails(orgId, siteId);
  const [mapWidth, setMapWidth] = useState(0);
  const widthRef = useCallback((node) => {
    if (!node) return;
    setMapWidth(node.getBoundingClientRect().width);
  }, []);

  const mapNarrow = (height) => (
    <>
      <MapVisibilityButton>
        {(mapShown) => (
          <div
            style={{
              display: mapShown ? 'block' : 'none',
              height: height - 40,
            }}
            css={`
              ${boxStyles};
            `}
          >
            <StationMapContainer
              layout="narrow"
              station={station}
              widthRef={widthRef}
            />
          </div>
        )}
      </MapVisibilityButton>
    </>
  );

  const mapWide = (
    <div
      id="waterbody-report-map"
      style={{
        height: mapWidth,
        minHeight: '400px',
      }}
      css={`
        ${boxStyles};
      `}
    >
      <StationMapContainer
        layout="wide"
        station={station}
        widthRef={widthRef}
      />
    </div>
  );

  const leftColumn = (width, height) => (
    <div css={splitLayoutColumnStyles}>
      <InformationSection
        orgId={orgId}
        station={station}
        stationStatus={stationStatus}
        siteId={siteId}
      />
      {width < 960 ? mapNarrow(height) : mapWide}
      <DownloadSection station={station} stationStatus={stationStatus} />
    </div>
  );

  const noStationView = (
    <Page>
      <NavBar title="Plan Summary" />

      <div css={containerStyles}>
        <div css={pageErrorBoxStyles}>
          <p>
            The monitoring location <strong>{siteId}</strong> could not be
            found.
          </p>
        </div>
      </div>
    </Page>
  );

  const fullScreenView = (
    <WindowSize>
      {({ width, height }) => (
        <div data-content="stationmap" style={{ width, height }}>
          <StationMapContainer
            layout="fullscreen"
            station={station}
            widthRef={widthRef}
          />
        </div>
      )}
    </WindowSize>
  );

  const twoColumnView = (
    <Page>
      <NavBar title="Monitoring Station Details" />
      <div css={containerStyles} data-content="container">
        <WindowSize>
          {({ width, height }) => {
            return (
              <div css={splitLayoutColumnsStyles}>
                {leftColumn(width, height)}
              </div>
            );
          }}
        </WindowSize>
      </div>
    </Page>
  );

  if (stationStatus === 'no-station') return noStationView;

  return fullscreen.fullscreenActive ? fullScreenView : twoColumnView;
}

function MonitoringStationContainer(props) {
  return (
    <MapHighlightProvider>
      <FullscreenProvider>
        <FullscreenContext.Consumer>
          {(fullscreen) => (
            <MonitoringStation fullscreen={fullscreen} {...props} />
          )}
        </FullscreenContext.Consumer>
      </FullscreenProvider>
    </MapHighlightProvider>
  );
}

function StationMap({ layout, station, widthRef }) {
  const { layers, mapView, mapLoading } = useMap(station);
  // Scrolls to the map when switching layouts
  useEffect(() => {
    const itemName = layout === 'fullscreen' ? 'stationmap' : 'container';
    const content = document.querySelector(`[data-content="${itemName}"]`);
    if (content) {
      let pos = content.getBoundingClientRect();

      window.scrollTo(pos.left + window.scrollX, pos.top + window.scrollY);
    }
  }, [layout]);

  return (
    <div css={mapContainerStyles} data-testid="hmw-station-map" ref={widthRef}>
      <Map layers={layers} />
      {mapView && mapLoading && <MapLoadingSpinner />}
    </div>
  );
}

function StationMapContainer({ ...props }) {
  return (
    <MapErrorBoundary>
      <StationMap {...props} />
    </MapErrorBoundary>
  );
}

/*
 * Styles
 */

const containerStyles = css`
  ${splitLayoutContainerStyles};

  table {
    margin-top: 0.75rem;
    margin-bottom: 0.75rem;
  }

  th,
  td {
    font-size: 0.875rem;
    line-height: 1.25;

    &:last-child {
      text-align: right;
    }
  }

  hr {
    margin-top: 0.125rem;
    margin-bottom: 0.875rem;
    border-top-color: #aebac3;
  }
`;

const infoBoxHeadingStyles = css`
  ${boxHeadingStyles};
  display: flex;
  align-items: center;

  small {
    display: block;
    margin-top: 0.125rem;
  }

  /* loading icon */
  svg {
    margin: 0 -0.375rem 0 -0.875rem;
    height: 1.5rem;
  }
`;

const inlineBoxSectionStyles = css`
  ${boxSectionStyles};

  /* loading icon */
  svg {
    display: inline-block;
    margin: -0.5rem;
    height: 1.25rem;
  }

  h3,
  p {
    display: inline-block;
    margin-top: 0;
    margin-bottom: 0;
    line-height: 1.25;
  }
`;

const mapContainerStyles = css`
  display: flex;
  height: 100%;
  position: relative;
`;

const modifiedBoxSectionStyles = css`
  ${boxSectionStyles}

  display: flex;
  fieldset {
    border: none;
    font-size: 1rem;
    input[type='radio'] {
      appearance: none;
      margin: 0;
    }
    input:checked + label:before {
      background-color: ${colors.steel()};
      box-shadow: 0 0 0 1px ${colors.steel()}, inset 0 0 0 1px ${colors.white()};
    }
    label {
      cursor: pointer;
      font-size: 0.875em;
      padding-left: 1em;
      text-indent: -1em;
      &:before {
        background: ${colors.white()};
        border-radius: 100%;
        box-shadow: 0 0 0 1px ${colors.steel()};
        content: ' ';
        display: inline-block;
        height: 1em;
        left: 2px;
        line-height: 1.25em;
        margin-right: 1em;
        position: relative;
        text-indent: 0;
        vertical-align: middle;
        white-space: pre;
        width: 1em;
      }
    }
    p {
      font-size: 1em;
      margin-top: 1em;
      &:first-child {
        margin-top: 0;
      }
    }
  }
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles};
  text-align: center;
`;

const pageErrorBoxStyles = css`
  ${errorBoxStyles};
  margin: 1rem;
  text-align: center;
`;

export default MonitoringStationContainer;
