// @flow

import Graphic from '@arcgis/core/Graphic';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Viewpoint from '@arcgis/core/Viewpoint';
import WindowSize from '@reach/window-size';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
import { colors, tableStyles } from 'styles';
import { fetchCheck } from 'utils/fetchUtils';
import { useSharedLayers } from 'utils/hooks';
import {
  getPopupContent,
  getPopupTitle,
  plotStations,
} from 'utils/mapFunctions';

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
    groupCounts: feature.properties.characteristicGroupResultCount,
    groupCategories: categorizeGroups(
      feature.properties.characteristicGroupResultCount,
      characteristicGroupMappings,
    ),
    huc8: feature.properties.HUCEightDigitCode,
    locationLongitude: feature.geometry.coordinates[0],
    locationLatitude: feature.geometry.coordinates[1],
    locationName: feature.properties.MonitoringLocationName,
    locationType: feature.properties.MonitoringLocationTypeName,
    monitoringType: 'Sample Location',
    orgId: feature.properties.OrganizationIdentifier,
    orgName: feature.properties.OrganizationFormalName,
    siteId: feature.properties.MonitoringLocationIdentifier,
    stationProviderName: feature.properties.ProviderName,
    state: feature.properties.StateName,
    stationTotalSamples: feature.properties.activityCount,
    stationTotalMeasurements: feature.properties.resultCount,
    uniqueId:
      `${feature.properties.MonitoringLocationIdentifier}/` +
      `${feature.properties.ProviderName}/` +
      `${feature.properties.OrganizationIdentifier}`,
  };
  setData(stationDetails);
  setStatus('success');
};

const drawStation = async (station, layer, services) => {
  if (isEmpty(station)) return false;
  if (services.status === 'fetching') return false;
  plotStations([station], layer);
  const featureSet = await layer.queryFeatures();
  return featureSet.features.length ? true : false;
};

const isEmpty = (obj) => {
  for (var x in obj) {
    return false;
  }
  return true;
};

const categorizeGroups = (groups, mappings) => {
  const categories = {};
  mappings
    .filter((mapping) => mapping.label !== 'All')
    .forEach((mapping) => {
      categories[mapping.label] = [];
      for (const group in groups) {
        if (mapping.groupNames.includes(group)) {
          categories[mapping.label].push(group);
        }
      }
    });

  // add any leftover lower-tier group counts to the 'Other' category
  const groupsCategorized = Object.values(categories).reduce((a, b) => {
    a.push([...b]);
    return a;
  }, []);
  for (const group in groups) {
    if (!groupsCategorized.includes(group)) {
      categories['Other'].push(group);
    }
  }
  return categories;
};

const getZoomParams = async (layer) => {
  const featureSet = await layer.queryFeatures();
  const graphics = featureSet.features;
  if (
    graphics.length === 1 &&
    (graphics[0].geometry.type === 'point' ||
      graphics[0].geometry.type === 'multipoint')
  ) {
    // handle zooming to a single point graphic
    const zoomParams = {
      target: graphics[0],
      zoom: 16, // set zoom 1 higher since it gets decremented later
    };
    return zoomParams;
  }
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
      const newMonitoringLocationsLayer = new FeatureLayer({
        id: 'monitoringLocationsLayer',
        title: 'Sample Locations',
        listMode: 'hide',
        legendEnabled: false,
        fields: [
          { name: 'OBJECTID', type: 'oid' },
          { name: 'monitoringType', type: 'string' },
          { name: 'siteId', type: 'string' },
          { name: 'orgId', type: 'string' },
          { name: 'orgName', type: 'string' },
          { name: 'locationLongitude', type: 'double' },
          { name: 'locationLatitude', type: 'double' },
          { name: 'locationName', type: 'string' },
          { name: 'locationType', type: 'string' },
          { name: 'locationUrl', type: 'string' },
          { name: 'stationProviderName', type: 'string' },
          { name: 'stationTotalSamples', type: 'string' },
          { name: 'stationTotalMeasurements', type: 'string' },
          { name: 'stationTotalMeasurementsPercentile', type: 'double' },
          { name: 'stationTotalsByCategory', type: 'string' },
          { name: 'uniqueId', type: 'string' },
        ],
        outFields: ['*'],
        source: [
          new Graphic({
            geometry: {
              type: 'point',
              longitude: station.locationLongitude,
              latitude: station.locationLatitude,
            },
            attributes: { ObjectID: 1 },
          }),
        ],
        renderer: {
          type: 'simple',
          symbol: {
            type: 'simple-marker',
            style: 'square',
            color: colors.lightPurple(),
          },
          visualVariables: [
            {
              type: 'size',
              field: 'stationTotalMeasurementsPercentile',
              minDataValue: 0,
              maxDataValue: 1,
              minSize: 8,
              maxSize: 20,
            },
          ],
        },
        popupTemplate: {
          outFields: ['*'],
          title: (feature) => getPopupTitle(feature.graphic.attributes),
          content: (feature) =>
            getPopupContent({ feature: feature.graphic, services }),
        },
      });
      //let newMonitoringLocationsLayer = new GraphicsLayer({
      //  id: 'monitoringLocationsLayer',
      //  title: 'Sample Locations',
      //  listMode: 'show',
      //  visible: true,
      //  legendEnabled: false,
      //});
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
    services,
    setLayers,
    setMonitoringLocationsLayer,
    setVisibleLayers,
    station,
  ]);

  // Draw the station on the map
  useEffect(() => {
    if (!layersInitialized || doneDrawing) return;
    drawStation(station, monitoringLocationsLayer, services).then((result) => {
      setDoneDrawing(result);
    });
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

    getZoomParams(monitoringLocationsLayer).then((zoomParams) => {
      mapView.goTo(zoomParams).then(() => {
        // set map zoom and home widget's viewpoint
        mapView.zoom = mapView.zoom - 1;
        homeWidget.viewpoint = new Viewpoint({
          targetGeometry: mapView.extent,
        });
        setMapLoading(false);
      });
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

function DownloadSection({ station }) {
  const [range, setRange] = useState('1');
  const [categories, setCategories] = useState([]);
  const [allChecked, setAllChecked] = useState(1);

  const toggleCategory = (category) => {
    const newCategories = categories.includes(category)
      ? categories.filter((c) => c !== category)
      : [...categories, category];
    setCategories(newCategories);

    if (categories.length === Object.keys(station.groupCategories).length) {
      setAllChecked(1);
    } else if (categories.length === 0) {
      setAllChecked(0);
    } else {
      setAllChecked(2);
    }
  };

  const toggleAllCategories = () => {
    let selected = allChecked === 0 ? Object.keys(station.groupCategories) : [];
    setCategories(selected);
    setAllChecked(allChecked === 0 ? 1 : 0);
  };

  const ranges = [1, 5, 10];
  const radios = ranges.map((n) => (
    <p key={n}>
      <input
        id={`${n}-year`}
        value={n}
        type="radio"
        name="date-range"
        checked={range === n.toString()}
        onChange={(e) => setRange(e.target.value)}
      />
      <label htmlFor={`${n}-year`}>
        {n === 1 ? `${n} Year` : `${n} Years`}
      </label>
    </p>
  ));

  const checkboxRows = Object.keys(station.groupCategories).map(
    (category, index) => {
      return station.groupCategories[category].length === 0 ? null : (
        <tr key={index}>
          <td css={checkboxCellStyles}>
            <input
              css={checkboxStyles}
              type="checkbox"
              className="checkbox"
              checked={categories.includes(category) || allChecked === 1}
              onChange={toggleCategory}
            />
          </td>
          <td>{category}</td>
        </tr>
      );
    },
  );

  const checkboxHeader = (
    <tr>
      <th css={checkboxCellStyles}>
        <input
          css={checkboxStyles}
          type="checkbox"
          className="checkbox"
          checked={allChecked === 1}
          ref={(input) => {
            if (input) input.indeterminate = allChecked === 2;
          }}
          onChange={toggleAllCategories}
        />
      </th>
      <th>
        <GlossaryTerm term="Characteristic Group">
          Characteristic Groups
        </GlossaryTerm>
      </th>
    </tr>
  );

  return (
    <div css={boxStyles}>
      <h2 css={boxHeadingStyles}>Download Station Data</h2>
      {
        /*Object.keys(station.groupCounts).length === 0 ? (
        <p>No data available for this monitoring location.</p>
      ) : (*/
        <>
          <div css={modifiedBoxSectionStyles}>
            <fieldset>{radios}</fieldset>
            <table css={modifiedTableStyles} className="table">
              <thead>{checkboxHeader}</thead>
              <tbody>{checkboxRows}</tbody>
            </table>
          </div>
          <div id="download-links"></div>
        </>
        /*)*/
      }
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

function MonitoringStation({ fullscreen }) {
  const { orgId, siteId } = useParams();
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

  switch (stationStatus) {
    case 'no-station':
      return noStationView;
    case 'success':
      return fullscreen.fullscreenActive ? fullScreenView : twoColumnView;
    default:
      return null;
  }
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

const checkboxCellStyles = css`
  padding-right: 0 !important;
  text-align: center;
`;

const checkboxStyles = css`
  appearance: checkbox;
  transform: scale(1.2);
`;

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

const downloadLinksStyles = css`
  span {
    display: inline-block;
    width: 100%;
    font-weight: bold;

    @media (min-width: 360px) {
      margin-right: 0.5em;
      width: auto;
    }
  }

  a {
    margin-right: 1em;
  }
`;

const iconStyles = css`
  margin-right: 5px;
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

const modifiedTableStyles = css`
  ${tableStyles}

  thead th {
    vertical-align: top;
  }

  th,
  td {
    overflow-wrap: anywhere;
    hyphens: auto;

    :first-of-type {
      padding-left: 0;
    }

    :last-of-type {
      padding-right: 0;
      text-align: right;
    }
  }
`;

const pageErrorBoxStyles = css`
  ${errorBoxStyles};
  margin: 1rem;
  text-align: center;
`;

export default MonitoringStationContainer;
