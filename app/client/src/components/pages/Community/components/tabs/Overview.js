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
  monitoringError,
  huc12SummaryError,
  zeroAssessedWaterbodies,
} from 'config/errorMessages';

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

  const [
    monitoringLocationsDisplayed,
    setMonitoringLocationsDisplayed,
  ] = useState(false);

  const [usgsStreamgagesDisplayed, setUsgsStreamgagesDisplayed] = useState(
    false,
  );

  const [
    monitoringStationsDisplayed,
    setMonitoringStationsDisplayed,
  ] = useState(false);

  const [
    permittedDischargersDisplayed,
    setPermittedDischargersDisplayed,
  ] = useState(false);

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

  const totalMonitoringStations =
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

      {monitoringLocations.status === 'failure' &&
        usgsStreamgages.status === 'failure' && (
          <div css={modifiedErrorBoxStyles}>
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
          <p css={modifiedInfoBoxStyles}>
            {zeroAssessedWaterbodies(watershed)}
          </p>
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
                {Boolean(totalMonitoringStations) &&
                (monitoringLocations.status === 'success' ||
                  usgsStreamgages.status === 'success')
                  ? totalMonitoringStations
                  : 'N/A'}
              </span>
              <p css={keyMetricLabelStyles}>Monitoring Stations</p>
              <div css={switchContainerStyles}>
                <Switch
                  checked={
                    Boolean(totalMonitoringStations) &&
                    monitoringStationsDisplayed
                  }
                  onChange={(checked) => {
                    if (!usgsStreamgagesLayer) return;
                    if (!monitoringLocationsLayer) return;
                    setMonitoringStationsDisplayed(
                      !monitoringStationsDisplayed,
                    );
                    setUsgsStreamgagesDisplayed(!monitoringStationsDisplayed);
                    setMonitoringLocationsDisplayed(
                      !monitoringStationsDisplayed,
                    );
                    setVisibleLayers({
                      usgsStreamgagesLayer: !monitoringStationsDisplayed,
                      monitoringLocationsLayer: !monitoringStationsDisplayed,
                      // NOTE: no change for the following layers:
                      waterbodyLayer: waterbodiesDisplayed,
                      dischargersLayer: permittedDischargersDisplayed,
                    });
                  }}
                  disabled={!Boolean(totalMonitoringStations)}
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
              <MonitoringStationsTab
                setMonitoringStationsDisplayed={setMonitoringStationsDisplayed}
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
      title={`Overall condition of waterbodies in the ${watershed} watershed.`}
    />
  );
}

function MonitoringStationsTab({
  setMonitoringStationsDisplayed,
  monitoringLocationsDisplayed,
  setMonitoringLocationsDisplayed,
  usgsStreamgagesDisplayed,
  setUsgsStreamgagesDisplayed,
  updateVisibleLayers,
}) {
  const {
    monitoringLocations,
    usgsStreamgages,
    monitoringLocationsLayer,
    usgsStreamgagesLayer,
    watershed,
  } = useContext(LocationSearchContext);

  const services = useServicesContext();

  // if either of the "Daily Stream Flow Conditions" or "Sample Locations"
  // switches are turned on, or if both switches are turned off, keep the
  // "Monitoring Stations" switch in sync
  useEffect(() => {
    if (usgsStreamgagesDisplayed || monitoringLocationsDisplayed) {
      setMonitoringStationsDisplayed(true);
    }

    if (!usgsStreamgagesDisplayed && !monitoringLocationsDisplayed) {
      setMonitoringStationsDisplayed(false);
    }
  }, [
    usgsStreamgagesDisplayed,
    monitoringLocationsDisplayed,
    setMonitoringStationsDisplayed,
  ]);

  const [normalizedUsgsStreamgages, setNormalizedUsgsStreamgages] = useState(
    [],
  );

  // normalize USGS streamgages data with monitoring stations data,
  // and draw them on the map
  useEffect(() => {
    if (!usgsStreamgages.data.value) return;

    const gages = usgsStreamgages.data.value.map((gage) => ({
      sampleType: 'USGS Streamgage',
      siteId: gage.properties.monitoringLocationNumber,
      orgId: gage.properties.agencyCode,
      orgName: gage.properties.agency,
      locationLongitude: gage.Locations[0].location.coordinates[0],
      locationLatitude: gage.Locations[0].location.coordinates[1],
      locationName: gage.properties.monitoringLocationName,
      locationType: gage.properties.monitoringLocationType,
      locationUrl: gage.properties.monitoringLocationUrl,
      // usgs streamgage specific properties:
      streamGageMeasurements: gage.Datastreams.map((data) => ({
        parameterDescription: data.description.split(' / USGS-')[0],
        parameterCode: data.properties.ParameterCode,
        // TODO: determine if we should display parameters missing measurements
        measurement: data.Observations[0]?.result || '---',
        datetime: data.Observations[0]?.phenomenonTime
          ? new Date(data.Observations[0]?.phenomenonTime).toLocaleString()
          : '',
        unitAbbr: data.unitOfMeasurement.symbol,
        unitName: data.unitOfMeasurement.name,
      })),
    }));

    setNormalizedUsgsStreamgages(gages);

    plotGages(gages, usgsStreamgagesLayer);
  }, [usgsStreamgages.data, usgsStreamgagesLayer]);

  const [
    normalizedMonitoringLocations,
    setNormalizedMonitoringLocations,
  ] = useState([]);

  // normalize monitoring stations data with USGS streamgages data,
  // and draw them on the map
  useEffect(() => {
    if (services.status === 'fetching') return;
    if (!monitoringLocations.data.features) return;

    const stations = monitoringLocations.data.features.map((station) => ({
      sampleType: 'Monitoring Station',
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

  const allMonitoringStations = [
    ...normalizedUsgsStreamgages,
    ...normalizedMonitoringLocations,
  ];

  const [monitoringStationsSortedBy, setMonitoringStationsSortedBy] = useState(
    'locationName',
  );

  const sortedMonitoringStations = [...allMonitoringStations].sort((a, b) => {
    if (monitoringStationsSortedBy === 'stationTotalMeasurements') {
      return (
        (b.stationTotalMeasurements || 0) - (a.stationTotalMeasurements || 0)
      );
    }

    if (monitoringStationsSortedBy === 'siteId') {
      return a.siteId.localeCompare(b.siteId);
    }

    return a[monitoringStationsSortedBy].localeCompare(
      b[monitoringStationsSortedBy],
    );
  });

  const filteredMonitoringStations = sortedMonitoringStations.filter((item) => {
    const displayedTypes = [];
    if (usgsStreamgagesDisplayed) displayedTypes.push('USGS Streamgage');
    if (monitoringLocationsDisplayed) displayedTypes.push('Monitoring Station');
    return displayedTypes.includes(item.sampleType);
  });

  if (
    monitoringLocations.status === 'fetching' ||
    usgsStreamgages.status === 'fetching'
  ) {
    return <LoadingSpinner />;
  }

  // TODO: check with EPA if they want to use the same error message for both
  // web services (how this is currently implemented) or have unique error
  // messages for each (which would mean removing the block below, and adding
  // in conditional rendering of both error messages in the success block below)
  if (
    monitoringLocations.status === 'failure' &&
    usgsStreamgages.status === 'failure'
  ) {
    return (
      <div css={modifiedErrorBoxStyles}>
        <p>{monitoringError}</p>
      </div>
    );
  }

  if (
    monitoringLocations.status === 'success' ||
    usgsStreamgages.status === 'success'
  ) {
    return (
      <>
        {allMonitoringStations.length === 0 && (
          <p css={centeredTextStyles}>
            There are no Water Monitoring Locations in the {watershed}{' '}
            watershed.
          </p>
        )}

        {allMonitoringStations.length > 0 && (
          <>
            <table css={tableStyles} className="table">
              <thead>
                <tr>
                  <th>
                    <span>Monitors &amp; Streams</span>
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
                        ariaLabel="Daily Stream Flow Conditions"
                      />
                      <span>Daily Stream Flow Conditions</span>
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
                  <strong>{filteredMonitoringStations.length}</strong> of{' '}
                  <strong>{allMonitoringStations.length}</strong> Water
                  Monitoring Locations in the <em>{watershed}</em> watershed.
                </>
              }
              onSortChange={({ value }) => setMonitoringStationsSortedBy(value)}
              sortOptions={[
                {
                  label: 'Monitoring Location Name',
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
                {
                  label: 'Monitoring Measurements',
                  value: 'stationTotalMeasurements',
                },
              ]}
            >
              {filteredMonitoringStations.map((item, index) => {
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
                        <em>Sample Type:</em>&nbsp;&nbsp;{item.sampleType}
                        <br />
                        <em>Organization ID:</em>&nbsp;&nbsp;{item.orgId}
                        <br />
                        <em>Monitoring Site ID:</em>&nbsp;&nbsp;
                        {item.siteId.replace(`${item.orgId}-`, '')}
                        {item.sampleType === 'Monitoring Station' && (
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
                      {item.sampleType === 'USGS Streamgage' && (
                        <WaterbodyInfo
                          type="USGS Streamgage"
                          feature={feature}
                          services={services}
                        />
                      )}

                      {item.sampleType === 'Monitoring Station' && (
                        <WaterbodyInfo
                          type="Monitoring Station"
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

  const [
    permittedDischargersSortedBy,
    setPermittedDischargersSortedBy,
  ] = useState('CWPName');

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
            There are no dischargers in the {watershed} watershed.
          </p>
        )}

        {totalPermittedDischargers > 0 && (
          <AccordionList
            title={<>Dischargers in the {watershed} watershed.</>}
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
