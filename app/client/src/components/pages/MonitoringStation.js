// @flow

import React, { useEffect, useState } from 'react';

import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import Page from 'components/shared/Page';
import { FullscreenContext, FullscreenProvider } from 'contexts/Fullscreen';
import { MapHighlightProvider } from 'contexts/MapHighlight';
import { useServicesContext } from 'contexts/LookupFiles';
import { fetchCheck } from 'utils/fetchUtils';

function MonitoringStation({ fullscreen, siteId }) {
  const station = useStationDetails(siteId);
}

const fetchStationDetails = async (url, callback) => {
  const res = await fetchCheck(url);
  if (res.features.length < 1) return;
  const feature = res.features[0];
  const stationDetails = {
    huc8: feature.properties.HUCEightDigitCode,
    locationLongitude: feature.geometry.coordinates[0],
    locationLatitude: feature.geometry.coordinates[1],
    locationName: feature.properties.MonitoringLocationName,
    locationType: feature.properties.MonitoringLocationTypeName,
    orgId: feature.properties.OrganizationIdentifier,
    orgName: feature.properties.OrganizationFormalName,
    siteId: feature.properties.MonitoringLocationIdentifier,
    stationProviderName: feature.properties.ProviderName,
    stationTotalSamples: feature.properties.activityCount,
    stationTotalMeasurements: feature.properties.resultCount,
    stationTotalsByCategory: feature.properties.characteristicGroupResultCount,
  };
  callback({ status: 'success', data: stationDetails });
};

function useStationDetails(siteId) {
  const services = useServicesContext();

  const { station, setStation } = useState({
    status: 'fetching',
    data: null,
  });

  useEffect(() => {
    const url =
      `${services.data.waterQualityPortal.monitoringLocation}` +
      `search?mimeType=geojson&zip=no&siteid=${siteId}`;

    fetchStationDetails(url, setStation).catch((err) => {
      console.error(err);
      setStation({ status: 'failure', data: null });
    });
  }, [services, setStation, siteId]);

  return station;
}

export default function MonitoringStationContainer(props) {
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
