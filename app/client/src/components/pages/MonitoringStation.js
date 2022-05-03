// @flow

import WindowSize from '@reach/window-size';
import React, { useEffect, useState } from 'react';
import { css } from 'styled-components/macro';

import {
  boxStyles,
  boxHeadingStyles,
  boxSectionStyles,
} from 'components/shared/Box';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import MapVisibilityButton from 'components/shared/MapVisibilityButton';
import { errorBoxStyles } from 'components/shared/MessageBoxes';
import NavBar from 'components/shared/NavBar';
import Page from 'components/shared/Page';
import {
  splitLayoutContainerStyles,
  splitLayoutColumnsStyles,
  splitLayoutColumnStyles,
} from 'components/shared/SplitLayout';
import { monitoringError } from 'config/errorMessages';
import { FullscreenContext, FullscreenProvider } from 'contexts/Fullscreen';
import { MapHighlightProvider } from 'contexts/MapHighlight';
import { useServicesContext } from 'contexts/LookupFiles';
import { fetchCheck } from 'utils/fetchUtils';

/*
 * Components
 */

function InformationSection({ siteId, station, stationStatus }) {
  const heading = (
    <h2 css={infoBoxHeadingStyles}>
      {stationStatus === 'fetching' && <LoadingSpinner />}
      <span>
        {stationStatus === 'success' && station.locationName}
        <small>
          <strong>Monitoring Station ID:</strong> {siteId}
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
      {sectionRowInline('Water Type', station.locationType)}
    </div>
  );
}

function MonitoringStation({ fullscreen, siteId }) {
  const [station, stationStatus] = useStationDetails(siteId);

  const leftColumn = (width, height) => (
    <div css={splitLayoutColumnStyles}>
      {width < 960 ? leftColumnSmall(height) : leftColumnLarge(height)}
    </div>
  );

  const leftColumnSmall = (height) => (
    <>
      <MapVisibilityButton>
        {(mapShown) => (
          <div
            style={{
              display: mapShown ? 'block' : 'none',
              height: height - 40,
            }}
          ></div>
        )}
      </MapVisibilityButton>
    </>
  );

  const leftColumnLarge = (height) => (
    <div
      id="waterbody-report-map"
      style={{
        height: height - 70,
        minHeight: '400px',
      }}
    ></div>
  );

  return fullscreen.fullscreenActive ? (
    <Page></Page>
  ) : (
    <Page>
      <NavBar title="Monitoring Station Details" />
      <div css={containerStyles} data-content="container">
        <InformationSection
          station={station}
          stationStatus={stationStatus}
          siteId={siteId}
        />
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
    totalSamples: feature.properties.activityCount,
    totalMeasurements: feature.properties.resultCount,
    totalsByCategory: feature.properties.characteristicGroupResultCount,
  };
  setData(stationDetails);
  setStatus('success');
};

const useStationDetails = (siteId) => {
  const services = useServicesContext();

  const [station, setStation] = useState(null);
  const [stationStatus, setStationStatus] = useState('fetching');

  useEffect(() => {
    const url =
      `${services.data.waterQualityPortal.monitoringLocation}` +
      `search?mimeType=geojson&zip=no&siteid=${siteId}`;

    fetchStationDetails(url, setStation, setStationStatus).catch((err) => {
      console.error(err);
      setStationStatus('failure');
      setStation(null);
    });
  }, [services, setStation, setStationStatus, siteId]);

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

  /* status icon */
  span svg {
    margin-left: -0.25rem;
    margin-right: 0.375rem;
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

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles};
  text-align: center;
`;

export default MonitoringStationContainer;
