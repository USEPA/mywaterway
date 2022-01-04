// @flow

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import { css } from 'styled-components/macro';
// components
import {
  AccordionList,
  AccordionItem,
} from 'components/shared/Accordion/MapHighlight';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import Switch from 'components/shared/Switch';
import WaterbodyList from 'components/shared/WaterbodyList';
import TabErrorBoundary from 'components/shared/ErrorBoundary/TabErrorBoundary';
import WaterbodyInfo from 'components/shared/WaterbodyInfo';
import ViewOnMapButton from 'components/shared/ViewOnMapButton';
import { infoBoxStyles, errorBoxStyles } from 'components/shared/MessageBoxes';
import {
  keyMetricsStyles,
  keyMetricStyles,
  keyMetricNumberStyles,
  keyMetricLabelStyles,
} from 'components/shared/KeyMetrics';
import { tabsStyles } from 'components/shared/ContentTabs';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import { useWaterbodyFeatures, useWaterbodyOnMap } from 'utils/hooks';
import {
  plotFacilities,
  plotStations,
  plotGages,
  getUniqueWaterbodies,
} from 'components/pages/LocationMap/MapFunctions';
// errors
import {
  echoError,
  streamgagesError,
  monitoringError,
  huc12SummaryError,
  zeroAssessedWaterbodies,
} from 'config/errorMessages';
// config
import { usgsStaParameters } from 'config/usgsStaParameters';

const containerStyles = css`
  padding: 1em;
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles};
  margin-bottom: 1em;
  text-align: center;
`;

const modifiedInfoBoxStyles = css`
  ${infoBoxStyles};
  margin-bottom: 1em;
  text-align: center;
`;

const switchContainerStyles = css`
  margin-top: 0.5em;
`;

const centeredTextStyles = css`
  text-align: center;
`;

const accordionContentStyles = css`
  padding: 0.4375em 0.875em 0.875em;
`;

const tableStyles = css`
  thead {
    background-color: #f0f6f9;
  }

  th:last-of-type,
  td:last-of-type {
    text-align: right;
  }
`;

const toggleStyles = css`
  display: flex;
  align-items: center;

  span {
    margin-left: 0.5rem;
  }
`;

function Overview() {
  const {
    cipSummary,
    assessmentUnitCount, // TODO: determine if this is needed...
    monitoringLocations,
    usgsStreamgages,
    permittedDischargers,
    waterbodyLayer,
    monitoringLocationsLayer,
    usgsStreamgagesLayer,
    dischargersLayer,
    watershed,
    visibleLayers,
    setVisibleLayers,
  } = useContext(LocationSearchContext);

  const [waterbodiesDisplayed, setWaterbodiesDisplayed] = useState(true);

  const [monitoringLocationsDisplayed, setMonitoringLocationsDisplayed] =
    useState(false);

  const [usgsStreamgagesDisplayed, setUsgsStreamgagesDisplayed] =
    useState(false);

  const [monitoringAndSensorsDisplayed, setMonitoringAndSensorsDisplayed] =
    useState(false);

  const [permittedDischargersDisplayed, setPermittedDischargersDisplayed] =
    useState(false);

  // Syncs the toggles with the visible layers on the map. Mainly
  // used for when the user toggles layers in full screen mode and then
  // exist full screen.
  useEffect(() => {
    if (typeof visibleLayers.waterbodyLayer === 'boolean') {
      setWaterbodiesDisplayed(visibleLayers.waterbodyLayer);
    }

    if (typeof visibleLayers.monitoringLocationsLayer === 'boolean') {
      setMonitoringLocationsDisplayed(visibleLayers.monitoringLocationsLayer);
    }

    if (typeof visibleLayers.usgsStreamgagesLayer === 'boolean') {
      setUsgsStreamgagesDisplayed(visibleLayers.usgsStreamgagesLayer);
    }

    if (typeof visibleLayers.dischargersLayer === 'boolean') {
      setPermittedDischargersDisplayed(visibleLayers.dischargersLayer);
    }
  }, [visibleLayers]);

  /**
   * Updates the visible layers. This function also takes into account whether
   * or not the underlying webservices failed.
   */
  const updateVisibleLayers = useCallback(
    ({ key = null, value = null, useCurrentValue = false }) => {
      const layers = {};

      if (cipSummary.status !== 'failure') {
        layers.waterbodyLayer =
          !waterbodyLayer || useCurrentValue
            ? visibleLayers.waterbodyLayer
            : waterbodiesDisplayed;
      }

      if (monitoringLocations.status !== 'failure') {
        layers.monitoringLocationsLayer =
          !monitoringLocationsLayer || useCurrentValue
            ? visibleLayers.monitoringLocationsLayer
            : monitoringLocationsDisplayed;
      }

      if (usgsStreamgages.status !== 'failure') {
        layers.usgsStreamgagesLayer =
          !usgsStreamgagesLayer || useCurrentValue
            ? visibleLayers.usgsStreamgagesLayer
            : usgsStreamgagesDisplayed;
      }

      if (permittedDischargers.status !== 'failure') {
        layers.dischargersLayer =
          !dischargersLayer || useCurrentValue
            ? visibleLayers.dischargersLayer
            : permittedDischargersDisplayed;
      }

      if (key && layers.hasOwnProperty(key)) {
        layers[key] = value;
      }

      // set the visible layers if something changed
      if (JSON.stringify(visibleLayers) !== JSON.stringify(layers)) {
        setVisibleLayers(layers);
      }
    },
    [
      cipSummary,
      monitoringLocations,
      usgsStreamgages,
      permittedDischargers,
      waterbodyLayer,
      monitoringLocationsLayer,
      usgsStreamgagesLayer,
      dischargersLayer,
      waterbodiesDisplayed,
      monitoringLocationsDisplayed,
      usgsStreamgagesDisplayed,
      permittedDischargersDisplayed,
      visibleLayers,
      setVisibleLayers,
    ],
  );

  // update visible layers based on webservice statuses.
  useEffect(() => {
    updateVisibleLayers({ useCurrentValue: true });
  }, [
    cipSummary,
    monitoringLocations,
    usgsStreamgages,
    permittedDischargers,
    visibleLayers,
    updateVisibleLayers,
  ]);

  const waterbodies = useWaterbodyFeatures();

  const uniqueWaterbodies = waterbodies
    ? getUniqueWaterbodies(waterbodies)
    : [];

  const totalWaterbodies = uniqueWaterbodies.length;

  const totalMonitoringLocations =
    monitoringLocations.data.features?.length || 0;

  const totalUsgsStreamgages = usgsStreamgages.data.value?.length || 0;

  const totalMonitoringAndSensors =
    monitoringLocations.data.features || usgsStreamgages.data.value
      ? totalMonitoringLocations + totalUsgsStreamgages
      : null;

  const totalPermittedDischargers =
    permittedDischargers.data.Results?.Facilities.length;

  return (
    <div css={containerStyles}>
      {cipSummary.status === 'failure' && (
        <div css={modifiedErrorBoxStyles}>
          <p>{huc12SummaryError}</p>
        </div>
      )}

      {usgsStreamgages.status === 'failure' &&
        monitoringLocations.status === 'failure' && (
          <div css={modifiedErrorBoxStyles}>
            <p>{streamgagesError}</p>
            <p>{monitoringError}</p>
          </div>
        )}

      {permittedDischargers.status === 'failure' && (
        <div css={modifiedErrorBoxStyles}>
          <p>{echoError}</p>
        </div>
      )}

      {cipSummary.status === 'success' &&
        waterbodies !== null &&
        totalWaterbodies === 0 && (
          <div css={modifiedInfoBoxStyles}>
            <p>{zeroAssessedWaterbodies(watershed)}</p>
          </div>
        )}

      <div css={keyMetricsStyles}>
        <div css={keyMetricStyles}>
          {(!waterbodyLayer || waterbodies === null) &&
          cipSummary.status !== 'failure' ? (
            <LoadingSpinner />
          ) : (
            <>
              <span css={keyMetricNumberStyles}>
                {Boolean(assessmentUnitCount) && cipSummary.status === 'success'
                  ? assessmentUnitCount.toLocaleString()
                  : 'N/A'}
              </span>
              <p css={keyMetricLabelStyles}>Waterbodies</p>
              <div css={switchContainerStyles}>
                <Switch
                  checked={Boolean(totalWaterbodies) && waterbodiesDisplayed}
                  onChange={(checked) => {
                    if (!waterbodyLayer) return;
                    setWaterbodiesDisplayed(!waterbodiesDisplayed);
                    updateVisibleLayers({
                      key: 'waterbodyLayer',
                      value: !waterbodiesDisplayed,
                    });
                  }}
                  disabled={!Boolean(totalWaterbodies)}
                  ariaLabel="Waterbodies"
                />
              </div>
            </>
          )}
        </div>

        <div css={keyMetricStyles}>
          {!monitoringLocationsLayer ||
          !usgsStreamgagesLayer ||
          monitoringLocations.status === 'fetching' ||
          usgsStreamgages.status === 'fetching' ? (
            <LoadingSpinner />
          ) : (
            <>
              <span css={keyMetricNumberStyles}>
                {Boolean(totalMonitoringAndSensors) &&
                (monitoringLocations.status === 'success' ||
                  usgsStreamgages.status === 'success')
                  ? totalMonitoringAndSensors
                  : 'N/A'}
              </span>
              <p css={keyMetricLabelStyles}>Monitoring &amp; Sensors</p>
              <div css={switchContainerStyles}>
                <Switch
                  checked={
                    Boolean(totalMonitoringAndSensors) &&
                    monitoringAndSensorsDisplayed
                  }
                  onChange={(checked) => {
                    if (!usgsStreamgagesLayer) return;
                    if (!monitoringLocationsLayer) return;
                    setMonitoringAndSensorsDisplayed(
                      !monitoringAndSensorsDisplayed,
                    );
                    setUsgsStreamgagesDisplayed(!monitoringAndSensorsDisplayed);
                    setMonitoringLocationsDisplayed(
                      !monitoringAndSensorsDisplayed,
                    );
                    setVisibleLayers({
                      usgsStreamgagesLayer: !monitoringAndSensorsDisplayed,
                      monitoringLocationsLayer: !monitoringAndSensorsDisplayed,
                      // NOTE: no change for the following layers:
                      waterbodyLayer: waterbodiesDisplayed,
                      dischargersLayer: permittedDischargersDisplayed,
                    });
                  }}
                  disabled={!Boolean(totalMonitoringAndSensors)}
                  ariaLabel="Monitoring Stations"
                />
              </div>
            </>
          )}
        </div>

        <div css={keyMetricStyles}>
          {!dischargersLayer || permittedDischargers.status === 'fetching' ? (
            <LoadingSpinner />
          ) : (
            <>
              <span css={keyMetricNumberStyles}>
                {Boolean(totalPermittedDischargers) &&
                permittedDischargers.status === 'success'
                  ? totalPermittedDischargers
                  : 'N/A'}
              </span>
              <p css={keyMetricLabelStyles}>Permitted Dischargers</p>
              <div css={switchContainerStyles}>
                <Switch
                  checked={
                    Boolean(totalPermittedDischargers) &&
                    permittedDischargersDisplayed
                  }
                  onChange={(checked) => {
                    if (!dischargersLayer) return;
                    setPermittedDischargersDisplayed(
                      !permittedDischargersDisplayed,
                    );
                    updateVisibleLayers({
                      key: 'dischargersLayer',
                      value: !permittedDischargersDisplayed,
                    });
                  }}
                  disabled={!Boolean(totalPermittedDischargers)}
                  ariaLabel="Permitted Dischargers"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div css={tabsStyles}>
        <Tabs>
          <TabList>
            <Tab>Waterbodies</Tab>
            <Tab>Monitoring &amp; Sensors</Tab>
            <Tab>Permitted Dischargers</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <WaterbodiesTab />
            </TabPanel>

            <TabPanel>
              <MonitoringAndSensorsTab
                setMonitoringAndSensorsDisplayed={
                  setMonitoringAndSensorsDisplayed
                }
                monitoringLocationsDisplayed={monitoringLocationsDisplayed}
                setMonitoringLocationsDisplayed={
                  setMonitoringLocationsDisplayed
                }
                usgsStreamgagesDisplayed={usgsStreamgagesDisplayed}
                setUsgsStreamgagesDisplayed={setUsgsStreamgagesDisplayed}
                updateVisibleLayers={updateVisibleLayers}
              />
            </TabPanel>

            <TabPanel>
              <PermittedDischargersTab
                totalPermittedDischargers={totalPermittedDischargers}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}

function WaterbodiesTab() {
  const { watershed } = useContext(LocationSearchContext);
  const waterbodies = useWaterbodyFeatures();

  // draw the waterbody on the map
  useWaterbodyOnMap();

  return (
    <WaterbodyList
      waterbodies={waterbodies}
      fieldName={null}
      title={
        <div data-testid="overview-waterbodies-accordion-title">
          Overall condition of{' '}
          <strong>{waterbodies?.length.toLocaleString()}</strong>{' '}
          {waterbodies?.length === 1 ? 'waterbody' : 'waterbodies'} in the{' '}
          <em>{watershed}</em> watershed.
        </div>
      }
    />
  );
}

function MonitoringAndSensorsTab({
  setMonitoringAndSensorsDisplayed,
  monitoringLocationsDisplayed,
  setMonitoringLocationsDisplayed,
  usgsStreamgagesDisplayed,
  setUsgsStreamgagesDisplayed,
  updateVisibleLayers,
}) {
  const {
    monitoringLocations,
    usgsStreamgages,
    usgsDailyPrecipitation,
    monitoringLocationsLayer,
    usgsStreamgagesLayer,
    watershed,
  } = useContext(LocationSearchContext);

  const services = useServicesContext();

  // if either of the "Current Water Conditions" or "Sample Locations" switches
  // are turned on, or if both switches are turned off, keep the "Monitoring
  // Stations" switch in sync
  useEffect(() => {
    if (usgsStreamgagesDisplayed || monitoringLocationsDisplayed) {
      setMonitoringAndSensorsDisplayed(true);
    }

    if (!usgsStreamgagesDisplayed && !monitoringLocationsDisplayed) {
      setMonitoringAndSensorsDisplayed(false);
    }
  }, [
    usgsStreamgagesDisplayed,
    monitoringLocationsDisplayed,
    setMonitoringAndSensorsDisplayed,
  ]);

  const [normalizedUsgsStreamgages, setNormalizedUsgsStreamgages] = useState(
    [],
  );

  // normalize USGS streamgages data with monitoring stations data,
  // and draw them on the map
  useEffect(() => {
    if (!usgsStreamgages.data.value) return;

    const gages = usgsStreamgages.data.value.map((gage) => {
      const streamgageMeasurements = { primary: [], secondary: [] };

      [...gage.Datastreams]
        .filter((item) => item.Observations.length > 0)
        .forEach((item) => {
          const observation = item.Observations[0];
          const parameterCode = item.properties.ParameterCode;
          const parameterDesc = item.description.split(' / USGS-')[0];
          const parameterUnit = item.unitOfMeasurement;

          let measurement = observation.result;
          // convert measurements recorded in celsius to fahrenheit
          if (['00010', '00020', '85583'].includes(parameterCode)) {
            measurement = measurement * (9 / 5) + 32;
          }

          const matchedParam = usgsStaParameters.find((p) => {
            return p.staParameterCode === parameterCode;
          });

          const data = {
            parameterCategory: matchedParam?.hmwCategory || 'exclude',
            parameterOrder: matchedParam?.hmwOrder || 0,
            parameterName: matchedParam?.hmwName || parameterDesc,
            parameterCode,
            measurement,
            datetime: new Date(observation.phenomenonTime).toLocaleString(),
            unitAbbr: matchedParam?.hmwUnits || parameterUnit.symbol,
            unitName: parameterUnit.name,
          };

          if (data.parameterCategory === 'primary') {
            streamgageMeasurements.primary.push(data);
          }

          if (data.parameterCategory === 'secondary') {
            streamgageMeasurements.secondary.push(data);
          }
        });

      return {
        monitoringType: 'Current Water Conditions',
        siteId: gage.properties.monitoringLocationNumber,
        orgId: gage.properties.agencyCode,
        orgName: gage.properties.agency,
        locationLongitude: gage.Locations[0].location.coordinates[0],
        locationLatitude: gage.Locations[0].location.coordinates[1],
        locationName: gage.properties.monitoringLocationName,
        locationType: gage.properties.monitoringLocationType,
        locationUrl: gage.properties.monitoringLocationUrl,
        // usgs streamgage specific properties:
        streamgageMeasurements,
      };
    });

    setNormalizedUsgsStreamgages(gages);

    plotGages(gages, usgsStreamgagesLayer);
  }, [usgsStreamgages.data, usgsStreamgagesLayer]);

  // add precipitation data (fetched from usgsDailyValues web service) to each
  // streamgage if it exists for that particular location and replot the
  // streamgages on the map
  useEffect(() => {
    if (!usgsDailyPrecipitation.data.value) return;
    if (normalizedUsgsStreamgages.length === 0) return;

    const streamgageNames = normalizedUsgsStreamgages.map((gage) => {
      return gage.locationName;
    });

    usgsDailyPrecipitation.data.value?.timeSeries.forEach((site) => {
      const { siteName } = site.sourceInfo;
      const observation = site.values[0].value[0];

      if (streamgageNames.includes(siteName)) {
        const streamgage = normalizedUsgsStreamgages.find((gage) => {
          return gage.locationName === siteName;
        });

        streamgage.streamgageMeasurements.primary.push({
          parameterCategory: 'primary',
          parameterOrder: 5,
          parameterName: 'Total Daily Rainfall',
          parameterCode: '00045 (USGS Daily Value)',
          measurement: observation.value,
          datetime: new Date(observation.dateTime).toLocaleDateString(),
          unitAbbr: 'in',
          unitName: 'inches',
        });
      }
    });

    plotGages(normalizedUsgsStreamgages, usgsStreamgagesLayer);
  }, [usgsDailyPrecipitation, normalizedUsgsStreamgages, usgsStreamgagesLayer]);

  const [normalizedMonitoringLocations, setNormalizedMonitoringLocations] =
    useState([]);

  // normalize monitoring stations data with USGS streamgages data,
  // and draw them on the map
  useEffect(() => {
    if (services.status === 'fetching') return;
    if (!monitoringLocations.data.features) return;

    const stations = monitoringLocations.data.features.map((station) => ({
      monitoringType: 'Sample Location',
      siteId: station.properties.MonitoringLocationIdentifier,
      orgId: station.properties.OrganizationIdentifier,
      orgName: station.properties.OrganizationFormalName,
      locationLongitude: station.geometry.coordinates[0],
      locationLatitude: station.geometry.coordinates[1],
      locationName: station.properties.MonitoringLocationName,
      locationType: station.properties.MonitoringLocationTypeName,
      // TODO: explore if the built up locationUrl below is ever different from
      // `station.properties.siteUrl`. from a quick test, they seem the same
      locationUrl:
        `${services.data.waterQualityPortal.monitoringLocationDetails}` +
        `${station.properties.ProviderName}/` +
        `${station.properties.OrganizationIdentifier}/` +
        `${station.properties.MonitoringLocationIdentifier}/`,
      // monitoring station specific properties:
      stationProviderName: station.properties.ProviderName,
      stationTotalSamples: station.properties.activityCount,
      stationTotalMeasurements: station.properties.resultCount,
      stationTotalsByCategory: JSON.stringify(
        station.properties.characteristicGroupResultCount,
      ),
    }));

    setNormalizedMonitoringLocations(stations);

    plotStations(stations, monitoringLocationsLayer, services);
  }, [monitoringLocations.data, monitoringLocationsLayer, services]);

  const allMonitoringAndSensors = [
    ...normalizedUsgsStreamgages,
    ...normalizedMonitoringLocations,
  ];

  const [monitoringAndSensorsSortedBy, setMonitoringAndSensorsSortedBy] =
    useState('locationName');

  const sortedMonitoringAndSensors = [...allMonitoringAndSensors].sort(
    (a, b) => {
      if (monitoringAndSensorsSortedBy === 'stationTotalMeasurements') {
        return (
          (b.stationTotalMeasurements || 0) - (a.stationTotalMeasurements || 0)
        );
      }

      if (monitoringAndSensorsSortedBy === 'siteId') {
        return a.siteId.localeCompare(b.siteId);
      }

      return a[monitoringAndSensorsSortedBy].localeCompare(
        b[monitoringAndSensorsSortedBy],
      );
    },
  );

  const filteredMonitoringAndSensors = sortedMonitoringAndSensors.filter(
    (item) => {
      const displayedTypes = [];

      if (usgsStreamgagesDisplayed) {
        displayedTypes.push('Current Water Conditions');
      }

      if (monitoringLocationsDisplayed) {
        displayedTypes.push('Sample Location');
      }

      return displayedTypes.includes(item.monitoringType);
    },
  );

  if (
    monitoringLocations.status === 'fetching' ||
    usgsStreamgages.status === 'fetching'
  ) {
    return <LoadingSpinner />;
  }

  if (
    monitoringLocations.status === 'success' ||
    usgsStreamgages.status === 'success'
  ) {
    return (
      <>
        {allMonitoringAndSensors.length === 0 && (
          <p css={centeredTextStyles}>
            There are no locations with data in the <em>{watershed}</em>{' '}
            watershed.
          </p>
        )}

        {allMonitoringAndSensors.length > 0 && (
          <>
            {usgsStreamgages.status === 'failure' && (
              <div css={modifiedErrorBoxStyles}>
                <p>{streamgagesError}</p>
              </div>
            )}

            {monitoringLocations.status === 'failure' && (
              <div css={modifiedErrorBoxStyles}>
                <p>{monitoringError}</p>
              </div>
            )}

            <p>
              Find out about current water conditions at sensor locations and
              explore sample data from water quality monitoring locations.
            </p>

            <table css={tableStyles} className="table">
              <thead>
                <tr>
                  <th>
                    <span>Water Conditions</span>
                  </th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div css={toggleStyles}>
                      <Switch
                        checked={
                          normalizedUsgsStreamgages.length > 0 &&
                          usgsStreamgagesDisplayed
                        }
                        onChange={(checked) => {
                          if (!usgsStreamgagesLayer) return;
                          setUsgsStreamgagesDisplayed(
                            !usgsStreamgagesDisplayed,
                          );
                          updateVisibleLayers({
                            key: 'usgsStreamgagesLayer',
                            value: !usgsStreamgagesDisplayed,
                          });
                        }}
                        disabled={normalizedUsgsStreamgages.length === 0}
                        ariaLabel="Current Water Conditions"
                      />
                      <span>Current Water Conditions</span>
                    </div>
                  </td>
                  <td>{normalizedUsgsStreamgages.length}</td>
                </tr>
                <tr>
                  <td>
                    <div css={toggleStyles}>
                      <Switch
                        checked={
                          normalizedMonitoringLocations.length > 0 &&
                          monitoringLocationsDisplayed
                        }
                        onChange={(checked) => {
                          if (!monitoringLocationsLayer) return;
                          setMonitoringLocationsDisplayed(
                            !monitoringLocationsDisplayed,
                          );
                          updateVisibleLayers({
                            key: 'monitoringLocationsLayer',
                            value: !monitoringLocationsDisplayed,
                          });
                        }}
                        disabled={normalizedMonitoringLocations.length === 0}
                        ariaLabel="Sample Locations"
                      />
                      <span>Sample Locations</span>
                    </div>
                  </td>
                  <td>{normalizedMonitoringLocations.length}</td>
                </tr>
              </tbody>
            </table>

            <AccordionList
              expandDisabled={true} // disabled to avoid large number of web service calls
              title={
                <>
                  <strong>{filteredMonitoringAndSensors.length}</strong> of{' '}
                  <strong>{allMonitoringAndSensors.length}</strong> locations
                  with data in the <em>{watershed}</em> watershed.
                </>
              }
              onSortChange={({ value }) =>
                setMonitoringAndSensorsSortedBy(value)
              }
              sortOptions={[
                {
                  label: 'Location Name',
                  value: 'locationName',
                },
                {
                  label: 'Organization ID',
                  value: 'orgId',
                },
                {
                  label: 'Monitoring Site ID',
                  value: 'siteId',
                },
              ].concat(
                monitoringLocationsDisplayed
                  ? [
                      {
                        label: 'Monitoring Measurements',
                        value: 'stationTotalMeasurements',
                      },
                    ]
                  : [],
              )}
            >
              {filteredMonitoringAndSensors.map((item, index) => {
                const feature = {
                  geometry: {
                    type: 'point',
                    longitude: item.locationLongitude,
                    latitude: item.locationLatitude,
                  },
                  attributes: item,
                };

                return (
                  <AccordionItem
                    key={index}
                    title={<strong>{item.locationName || 'Unknown'}</strong>}
                    subTitle={
                      <>
                        <em>Monitoring Type:</em>&nbsp;&nbsp;
                        {item.monitoringType}
                        <br />
                        <em>Organization ID:</em>&nbsp;&nbsp;{item.orgId}
                        <br />
                        <em>Monitoring Site ID:</em>&nbsp;&nbsp;
                        {item.siteId.replace(`${item.orgId}-`, '')}
                        {item.monitoringType === 'Sample Location' && (
                          <>
                            <br />
                            <em>Monitoring Measurements:</em>&nbsp;&nbsp;
                            {item.stationTotalMeasurements}
                          </>
                        )}
                      </>
                    }
                    feature={feature}
                    idKey="siteId"
                  >
                    <div css={accordionContentStyles}>
                      {item.monitoringType === 'Current Water Conditions' && (
                        <WaterbodyInfo
                          type="Current Water Conditions"
                          feature={feature}
                          services={services}
                        />
                      )}

                      {item.monitoringType === 'Sample Location' && (
                        <WaterbodyInfo
                          type="Sample Location"
                          feature={feature}
                          services={services}
                        />
                      )}

                      <ViewOnMapButton feature={feature} />
                    </div>
                  </AccordionItem>
                );
              })}
            </AccordionList>
          </>
        )}
      </>
    );
  }

  return null;
}

function PermittedDischargersTab({ totalPermittedDischargers }) {
  const { permittedDischargers, dischargersLayer, watershed } = useContext(
    LocationSearchContext,
  );

  // draw the permitted dischargers on the map
  useEffect(() => {
    if (permittedDischargers.data.Results?.Facilities) {
      plotFacilities({
        facilities: permittedDischargers.data.Results.Facilities,
        layer: dischargersLayer,
      });
    }
  }, [permittedDischargers.data, dischargersLayer]);

  const [permittedDischargersSortedBy, setPermittedDischargersSortedBy] =
    useState('CWPName');

  /* prettier-ignore */
  const sortedPermittedDischargers = permittedDischargers.data.Results?.Facilities
    ? permittedDischargers.data.Results.Facilities.sort((a, b) => {
        return a[permittedDischargersSortedBy].localeCompare(
          b[permittedDischargersSortedBy],
        );
      })
    : [];

  if (permittedDischargers.status === 'fetching') {
    return <LoadingSpinner />;
  }

  if (permittedDischargers.status === 'failure') {
    return (
      <div css={modifiedErrorBoxStyles}>
        <p>{echoError}</p>
      </div>
    );
  }

  if (permittedDischargers.status === 'success') {
    return (
      <>
        {totalPermittedDischargers === 0 && (
          <p css={centeredTextStyles}>
            There are no dischargers in the <em>{watershed}</em> watershed.
          </p>
        )}

        {totalPermittedDischargers > 0 && (
          <AccordionList
            title={
              <>
                <strong>{totalPermittedDischargers}</strong> permitted
                discharger{totalPermittedDischargers === 1 ? '' : 's'} in the{' '}
                <em>{watershed}</em> watershed.
              </>
            }
            onSortChange={(sortBy) => {
              setPermittedDischargersSortedBy(sortBy.value);
            }}
            sortOptions={[
              {
                value: 'CWPName',
                label: 'Discharger Name',
              },
              {
                value: 'SourceID',
                label: 'NPDES ID',
              },
            ]}
          >
            {sortedPermittedDischargers.map((discharger, index) => {
              const id = discharger.SourceID;
              const name = discharger.CWPName;
              const feature = {
                geometry: {
                  type: 'point',
                  longitude: discharger.FacLong,
                  latitude: discharger.FacLat,
                },
                attributes: discharger,
              };
              return (
                <AccordionItem
                  key={index}
                  title={<strong>{name || 'Unknown'}</strong>}
                  subTitle={<>NPDES ID: {id}</>}
                  feature={feature}
                  idKey="CWPName"
                >
                  <div css={accordionContentStyles}>
                    <WaterbodyInfo
                      type="Permitted Discharger"
                      feature={feature}
                    />

                    <ViewOnMapButton feature={feature} />
                  </div>
                </AccordionItem>
              );
            })}
          </AccordionList>
        )}
      </>
    );
  }

  return null;
}

export default function OverviewContainer({ ...props }: Props) {
  return (
    <TabErrorBoundary tabName="Overview">
      <Overview {...props} />
    </TabErrorBoundary>
  );
}
