// @flow

import React from 'react';
import styled from 'styled-components';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import Switch from 'components/shared/Switch';
import WaterbodyList from 'components/shared/WaterbodyList';
import { StyledErrorBox, StyledInfoBox } from 'components/shared/MessageBoxes';
import TabErrorBoundary from 'components/shared/ErrorBoundary/TabErrorBoundary';
// styled components
import {
  StyledMetrics,
  StyledMetric,
  StyledNumber,
  StyledLabel,
} from 'components/shared/KeyMetrics';
// contexts
import { EsriModulesContext } from 'contexts/EsriModules';
import { LocationSearchContext } from 'contexts/locationSearch';
import { OverviewFiltersContext } from 'contexts/OverviewFilters';
// utilities
import { useWaterbodyFeatures, useWaterbodyOnMap } from 'utils/hooks';
import {
  plotFacilities,
  plotStations,
  getUniqueWaterbodies,
} from 'components/pages/LocationMap/MapFunctions';
// errors
import {
  echoError,
  monitoringError,
  huc12SummaryError,
  zeroAssessedWaterbodies,
} from 'config/errorMessages';

// --- styled components ---
const Container = styled.div`
  margin-top: 1em;
`;

const SwitchContainer = styled.div`
  margin-top: 0.5em;
`;

const ErrorBoxWithMargin = styled(StyledErrorBox)`
  margin: 1em;
`;

const InfoBoxWithMargin = styled(StyledInfoBox)`
  margin: 1em;
  text-align: center;
`;

// --- components ---
function Overview() {
  const { Graphic } = React.useContext(EsriModulesContext);

  const {
    monitoringLocations,
    permittedDischargers,
    waterbodyLayer,
    monitoringStationsLayer,
    dischargersLayer,
    cipSummary,
    watershed,
    visibleLayers,
    setVisibleLayers,
  } = React.useContext(LocationSearchContext);

  const {
    waterbodiesFilterEnabled,
    monitoringLocationsFilterEnabled,
    dischargersFilterEnabled,
    setWaterbodiesFilterEnabled,
    setMonitoringLocationsFilterEnabled,
    setDischargersFilterEnabled,
  } = React.useContext(OverviewFiltersContext);

  // set the waterbody features
  const waterbodies = useWaterbodyFeatures();

  const uniqueWaterbodies = waterbodies
    ? getUniqueWaterbodies(waterbodies)
    : [];

  // draw the waterbody on the map
  useWaterbodyOnMap();

  // draw the monitoring stations on the map
  React.useEffect(() => {
    // wait until monitoring stations data is set in context
    if (!monitoringLocations.data.features) return;

    const stations = monitoringLocations.data.features.map(station => {
      return {
        x: station.geometry.coordinates[0],
        y: station.geometry.coordinates[1],
        properties: station.properties,
      };
    });

    plotStations(Graphic, stations, monitoringStationsLayer);
  }, [monitoringLocations.data, Graphic, monitoringStationsLayer]);

  // draw the permitted dischargers on the map
  React.useEffect(() => {
    // wait until permitted dischargers data is set in context
    if (
      permittedDischargers.data['Results'] &&
      permittedDischargers.data['Results']['Facilities']
    ) {
      plotFacilities({
        Graphic: Graphic,
        facilities: permittedDischargers.data['Results']['Facilities'],
        layer: dischargersLayer,
      });
    }
  }, [permittedDischargers.data, Graphic, dischargersLayer]);

  // Syncs the toggles with the visible layers on the map. Mainly
  // used for when the user toggles layers in full screen mode and then
  // exist full screen.
  React.useEffect(() => {
    if (
      !visibleLayers.hasOwnProperty('waterbodyLayer') ||
      !visibleLayers.hasOwnProperty('monitoringStationsLayer') ||
      !visibleLayers.hasOwnProperty('dischargersLayer')
    ) {
      return;
    }

    const {
      waterbodyLayer,
      monitoringStationsLayer,
      dischargersLayer,
    } = visibleLayers;

    if (typeof waterbodyLayer === 'boolean') {
      setWaterbodiesFilterEnabled(waterbodyLayer);
    }
    if (typeof monitoringStationsLayer === 'boolean') {
      setMonitoringLocationsFilterEnabled(monitoringStationsLayer);
    }
    if (typeof dischargersLayer === 'boolean') {
      setDischargersFilterEnabled(dischargersLayer);
    }
  }, [
    visibleLayers,
    setDischargersFilterEnabled,
    setMonitoringLocationsFilterEnabled,
    setWaterbodiesFilterEnabled,
  ]);

  const waterbodyCount = uniqueWaterbodies && uniqueWaterbodies.length;
  const monitoringLocationCount =
    monitoringLocations.data.features &&
    monitoringLocations.data.features.length;
  const permittedDischargerCount =
    permittedDischargers.data.Results &&
    permittedDischargers.data.Results.Facilities &&
    permittedDischargers.data.Results.Facilities.length;

  return (
    <Container>
      {cipSummary.status === 'failure' && (
        <ErrorBoxWithMargin>
          <p>{huc12SummaryError}</p>
        </ErrorBoxWithMargin>
      )}
      {monitoringLocations.status === 'failure' && (
        <ErrorBoxWithMargin>
          <p>{monitoringError}</p>
        </ErrorBoxWithMargin>
      )}

      {permittedDischargers.status === 'failure' && (
        <ErrorBoxWithMargin>
          <p>{echoError}</p>
        </ErrorBoxWithMargin>
      )}
      <StyledMetrics>
        <StyledMetric>
          {(!waterbodyLayer || waterbodies === null) &&
          cipSummary.status !== 'failure' ? (
            <LoadingSpinner />
          ) : (
            <>
              <StyledNumber>
                {cipSummary.status === 'failure'
                  ? 'N/A'
                  : waterbodyCount.toLocaleString()}
              </StyledNumber>
              <StyledLabel>Waterbodies</StyledLabel>
              <SwitchContainer>
                <Switch
                  checked={Boolean(waterbodyCount) && waterbodiesFilterEnabled}
                  onChange={checked => {
                    setWaterbodiesFilterEnabled(!waterbodiesFilterEnabled);

                    // first check if layer exists and is not falsy
                    setVisibleLayers({
                      waterbodyLayer:
                        waterbodyLayer && !waterbodiesFilterEnabled,
                      monitoringStationsLayer:
                        monitoringStationsLayer &&
                        monitoringLocationsFilterEnabled,
                      dischargersLayer:
                        dischargersLayer && dischargersFilterEnabled,
                    });
                  }}
                  disabled={!Boolean(waterbodyCount)}
                  ariaLabel="Waterbodies"
                />
              </SwitchContainer>
            </>
          )}
        </StyledMetric>

        <StyledMetric>
          {!monitoringStationsLayer ||
          monitoringLocations.status === 'fetching' ? (
            <LoadingSpinner />
          ) : (
            <>
              <StyledNumber>
                {monitoringLocations.status === 'failure'
                  ? 'N/A'
                  : (monitoringLocationCount &&
                      monitoringLocationCount.toLocaleString()) ||
                    0}
              </StyledNumber>
              <StyledLabel>Monitoring Locations</StyledLabel>
              <SwitchContainer>
                <Switch
                  checked={
                    Boolean(monitoringLocationCount) &&
                    monitoringLocationsFilterEnabled
                  }
                  onChange={checked => {
                    setMonitoringLocationsFilterEnabled(
                      !monitoringLocationsFilterEnabled,
                    );

                    // first check if layer exists and is not falsy
                    setVisibleLayers({
                      waterbodyLayer:
                        waterbodyLayer && waterbodiesFilterEnabled,
                      monitoringStationsLayer:
                        monitoringStationsLayer &&
                        !monitoringLocationsFilterEnabled,
                      dischargersLayer:
                        dischargersLayer && dischargersFilterEnabled,
                    });
                  }}
                  disabled={!Boolean(monitoringLocationCount)}
                  ariaLabel="Monitoring Locations"
                />
              </SwitchContainer>
            </>
          )}
        </StyledMetric>

        <StyledMetric>
          {!dischargersLayer || permittedDischargers.status === 'fetching' ? (
            <LoadingSpinner />
          ) : (
            <>
              <StyledNumber>
                {permittedDischargers.status === 'failure'
                  ? 'N/A'
                  : (permittedDischargerCount &&
                      permittedDischargerCount.toLocaleString()) ||
                    0}
              </StyledNumber>
              <StyledLabel>Permitted Dischargers</StyledLabel>
              <SwitchContainer>
                <Switch
                  checked={
                    Boolean(permittedDischargerCount) &&
                    dischargersFilterEnabled
                  }
                  onChange={checked => {
                    setDischargersFilterEnabled(!dischargersFilterEnabled);

                    // first check if layer exists and is not falsy
                    setVisibleLayers({
                      waterbodyLayer:
                        waterbodyLayer && waterbodiesFilterEnabled,
                      monitoringStationsLayer:
                        monitoringStationsLayer &&
                        monitoringLocationsFilterEnabled,
                      dischargersLayer:
                        dischargersLayer && !dischargersFilterEnabled,
                    });
                  }}
                  disabled={!Boolean(permittedDischargerCount)}
                  ariaLabel="Permitted Dischargers"
                />
              </SwitchContainer>
            </>
          )}
        </StyledMetric>
      </StyledMetrics>
      {cipSummary.status === 'success' &&
        waterbodies !== null &&
        waterbodyCount === 0 && (
          <InfoBoxWithMargin>
            {zeroAssessedWaterbodies(watershed)}
          </InfoBoxWithMargin>
        )}
      {cipSummary.status !== 'failure' && (
        <WaterbodyList
          waterbodies={waterbodies}
          fieldName={null}
          title={`Overall condition of waterbodies in the ${watershed} watershed.`}
        />
      )}
    </Container>
  );
}

export default function OverviewContainer({ ...props }: Props) {
  return (
    <TabErrorBoundary tabName="Overview">
      <Overview {...props} />
    </TabErrorBoundary>
  );
}
