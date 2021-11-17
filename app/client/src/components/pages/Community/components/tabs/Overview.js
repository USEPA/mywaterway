// @flow

import React, { useState, useEffect, useContext } from 'react';
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
import { EsriModulesContext } from 'contexts/EsriModules';
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
// styles
import { colors } from 'styles/index.js';

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

const datetimeStyles = css`
  font-style: italic;
  color: ${colors.gray9};
`;

const iconStyles = css`
  margin-right: 5px;
`;

function Overview() {
  const { Graphic } = useContext(EsriModulesContext);

  const {
    cipSummary,
    assessmentUnitCount, // TODO: determine if this is needed...
    monitoringStations,
    usgsStreamgages,
    permittedDischargers,
    waterbodyLayer,
    monitoringStationsLayer,
    usgsStreamgagesLayer,
    dischargersLayer,
    watershed,
    visibleLayers,
    setVisibleLayers,
  } = useContext(LocationSearchContext);

  const [waterbodiesDisplayed, setWaterbodiesDisplayed] = useState(true);

  const [sampleLocationsDisplayed, setSampleLocationsDisplayed] = useState(
    false,
  );

  const [
    monitoringStationsDisplayed,
    setMonitoringStationsDisplayed,
  ] = useState(false);

  const [usgsStreamgagesDisplayed, setUsgsStreamgagesDisplayed] = useState(
    false,
  );

  const [
    permittedDischargersDisplayed,
    setPermittedDischargersDisplayed,
  ] = useState(false);

  // when the "Sample Locations" switch is turned on or off, the "Daily Stream
  // Flow Conditions" and "Monitoring Stations" switches will be turned on/off
  useEffect(() => {
    setUsgsStreamgagesDisplayed(sampleLocationsDisplayed);
    setMonitoringStationsDisplayed(sampleLocationsDisplayed);
  }, [sampleLocationsDisplayed]);

  // if either of the "Daily Stream Flow Conditions" or "Monitoring Stations"
  // switches are turned on, or if both switches are turned off, keep the
  // "Sample Locations" switch in sync
  useEffect(() => {
    if (usgsStreamgagesDisplayed || monitoringStationsDisplayed) {
      setSampleLocationsDisplayed(true);
    }
    if (!usgsStreamgagesDisplayed && !monitoringStationsDisplayed) {
      setSampleLocationsDisplayed(false);
    }
  }, [usgsStreamgagesDisplayed, monitoringStationsDisplayed]);

  const services = useServicesContext();

  const waterbodies = useWaterbodyFeatures();

  const uniqueWaterbodies = waterbodies
    ? getUniqueWaterbodies(waterbodies)
    : [];

  // draw the waterbody on the map
  useWaterbodyOnMap();

  // draw the monitoring stations on the map
  useEffect(() => {
    if (services.status === 'fetching') return;
    if (!monitoringStations.data.features) return;

    const stations = monitoringStations.data.features.map((station) => {
      return {
        x: station.geometry.coordinates[0],
        y: station.geometry.coordinates[1],
        properties: station.properties,
      };
    });

    plotStations(Graphic, stations, monitoringStationsLayer, services);
  }, [Graphic, monitoringStations.data, monitoringStationsLayer, services]);

  // draw the usgs streamgages on the map
  useEffect(() => {
    if (!usgsStreamgages.data.value) return;

    const gages = usgsStreamgages.data.value.map((gage) => {
      // TODO: determine if there's a better way to isolate gage height measurements
      const gageHeight = gage.Datastreams.find((data) => {
        return data.properties.ParameterCode === '00065';
      })?.Observations[0].result;

      return {
        x: gage.Locations[0].location.coordinates[0],
        y: gage.Locations[0].location.coordinates[1],
        properties: {
          ...gage.properties,
          gageHeight: Number(gageHeight) || 0,
        },
      };
    });

    plotGages(Graphic, gages, usgsStreamgagesLayer);
  }, [Graphic, usgsStreamgages.data, usgsStreamgagesLayer]);

  // draw the permitted dischargers on the map
  useEffect(() => {
    if (permittedDischargers.data.Results?.Facilities) {
      plotFacilities({
        Graphic: Graphic,
        facilities: permittedDischargers.data.Results.Facilities,
        layer: dischargersLayer,
      });
    }
  }, [permittedDischargers.data, Graphic, dischargersLayer]);

  // Syncs the toggles with the visible layers on the map. Mainly
  // used for when the user toggles layers in full screen mode and then
  // exist full screen.
  useEffect(() => {
    if (typeof visibleLayers.waterbodyLayer === 'boolean') {
      setWaterbodiesDisplayed(visibleLayers.waterbodyLayer);
    }

    if (typeof visibleLayers.monitoringStationsLayer === 'boolean') {
      setMonitoringStationsDisplayed(visibleLayers.monitoringStationsLayer);
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
  const updateVisibleLayers = React.useCallback(
    ({ key = null, value = null, useCurrentValue = false }) => {
      const newVisibleLayers = {};

      if (cipSummary.status !== 'failure') {
        newVisibleLayers.waterbodyLayer =
          !waterbodyLayer || useCurrentValue
            ? visibleLayers.waterbodyLayer
            : waterbodiesDisplayed;
      }

      if (monitoringStations.status !== 'failure') {
        newVisibleLayers.monitoringStationsLayer =
          !monitoringStationsLayer || useCurrentValue
            ? visibleLayers.monitoringStationsLayer
            : monitoringStationsDisplayed;
      }

      if (usgsStreamgages.status !== 'failure') {
        newVisibleLayers.usgsStreamgagesLayer =
          !usgsStreamgagesLayer || useCurrentValue
            ? visibleLayers.usgsStreamgagesLayer
            : usgsStreamgagesDisplayed;
      }

      if (permittedDischargers.status !== 'failure') {
        newVisibleLayers.dischargersLayer =
          !dischargersLayer || useCurrentValue
            ? visibleLayers.dischargersLayer
            : permittedDischargersDisplayed;
      }

      if (key && newVisibleLayers.hasOwnProperty(key)) {
        newVisibleLayers[key] = value;
      }

      // set the visible layers if something changed
      if (JSON.stringify(visibleLayers) !== JSON.stringify(newVisibleLayers)) {
        setVisibleLayers(newVisibleLayers);
      }
    },
    [
      cipSummary,
      monitoringStations,
      usgsStreamgages,
      permittedDischargers,
      waterbodyLayer,
      monitoringStationsLayer,
      usgsStreamgagesLayer,
      dischargersLayer,
      waterbodiesDisplayed,
      monitoringStationsDisplayed,
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
    monitoringStations,
    usgsStreamgages,
    permittedDischargers,
    visibleLayers,
    updateVisibleLayers,
  ]);

  const totalWaterbodies = uniqueWaterbodies.length;

  const totalMonitoringStations = monitoringStations.data.features?.length;

  const totalUsgsStreamgages = usgsStreamgages.data.value?.length;

  const totalSampleLocations =
    totalMonitoringStations && totalUsgsStreamgages
      ? totalMonitoringStations + totalUsgsStreamgages
      : null;

  const displayedSampleLocations = []; // TODO: displayed monitoring stations and usgs streamgages

  const totalPermittedDischargers =
    permittedDischargers.data.Results?.Facilities.length;

  const [sampleLocationsSortedBy, setSampleLocationsSortedBy] = useState(
    'MonitoringLocationName',
  );

  const sortedMonitoringStations = monitoringStations.data.features
    ? monitoringStations.data.features.sort((objA, objB) => {
        // sort resultCount (measurements) in descending order
        if (sampleLocationsSortedBy === 'resultCount') {
          return objB.properties.resultCount - objA.properties.resultCount;
        }

        if (sampleLocationsSortedBy === 'MonitoringLocationIdentifier') {
          const a = objA.properties.MonitoringLocationIdentifier.split('-')[1];
          const b = objB.properties.MonitoringLocationIdentifier.split('-')[1];
          return a.localeCompare(b);
        }

        return objA.properties[sampleLocationsSortedBy].localeCompare(
          objB.properties[sampleLocationsSortedBy],
        );
      })
    : [];

  const [
    permittedDischargersSortedBy,
    setPermittedDischargersSortedBy,
  ] = useState('CWPName');

  /* prettier-ignore */
  const sortedPermittedDischargers = permittedDischargers.data.Results?.Facilities
    ? permittedDischargers.data.Results.Facilities.sort((objA, objB) => {
        return objA[permittedDischargersSortedBy].localeCompare(
          objB[permittedDischargersSortedBy],
        );
      })
    : [];

  // --- tab contents ---
  const waterbodiesTabContents = (
    <WaterbodyList
      waterbodies={waterbodies}
      fieldName={null}
      title={`Overall condition of waterbodies in the ${watershed} watershed.`}
    />
  );

  const monitoringLocationsTabContents = (
    <>
      {totalSampleLocations === 0 && (
        <p css={centeredTextStyles}>
          There are no Water Monitoring Locations in the {watershed} watershed.
        </p>
      )}

      {totalSampleLocations && totalSampleLocations > 0 && (
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
                        Boolean(totalUsgsStreamgages) &&
                        usgsStreamgagesDisplayed
                      }
                      onChange={(checked) => {
                        setUsgsStreamgagesDisplayed(!usgsStreamgagesDisplayed);
                        updateVisibleLayers({
                          key: 'usgsStreamgagesLayer',
                          value:
                            usgsStreamgagesLayer && !usgsStreamgagesDisplayed,
                        });
                      }}
                      disabled={!Boolean(totalUsgsStreamgages)}
                      ariaLabel="Daily Stream Flow Conditions"
                    />
                    <span>Daily Stream Flow Conditions</span>
                  </div>
                </td>
                <td>{totalUsgsStreamgages}</td>
              </tr>
              <tr>
                <td>
                  <div css={toggleStyles}>
                    <Switch
                      checked={
                        Boolean(totalMonitoringStations) &&
                        monitoringStationsDisplayed
                      }
                      onChange={(checked) => {
                        setMonitoringStationsDisplayed(
                          !monitoringStationsDisplayed,
                        );
                        updateVisibleLayers({
                          key: 'monitoringStationsLayer',
                          value:
                            monitoringStationsLayer &&
                            !monitoringStationsDisplayed,
                        });
                      }}
                      disabled={!Boolean(totalMonitoringStations)}
                      ariaLabel="Monitoring Stations"
                    />
                    <span>Monitoring Stations</span>
                  </div>
                </td>
                <td>{totalMonitoringStations}</td>
              </tr>
            </tbody>
          </table>

          <AccordionList
            expandDisabled={true} // disabled to avoid large number of web service calls
            title={
              <>
                <strong>{displayedSampleLocations.length}</strong> of{' '}
                <strong>{totalSampleLocations}</strong> Water Monitoring
                Locations in the <em>{watershed}</em> watershed.
              </>
            }
            onSortChange={(sortBy) => {
              setSampleLocationsSortedBy(sortBy.value);
            }}
            sortOptions={[
              {
                value: 'MonitoringLocationName',
                label: 'Monitoring Location Name',
              },
              {
                value: 'OrganizationIdentifier',
                label: 'Organization ID',
              },
              {
                value: 'MonitoringLocationIdentifier',
                label: 'Monitoring Site ID',
              },
              {
                value: 'resultCount',
                label: 'Monitoring Measurements',
              },
            ]}
          >
            {usgsStreamgages.data.value.map((gage, gageIndex) => {
              const id = gage.properties.monitoringLocationNumber;
              const url = gage.properties.monitoringLocationUrl;
              const name = gage.properties.monitoringLocationName;
              const type = gage.properties.monitoringLocationType;
              const org = gage.properties.agency;
              const orgId = gage.properties.agencyCode;
              return (
                <AccordionItem
                  key={gageIndex}
                  title={<strong>{name || 'Unknown'}</strong>}
                  subTitle={
                    <>
                      <em>Organization ID:</em>&nbsp;&nbsp;{orgId}
                      <br />
                      <em>Monitoring Site ID:</em>&nbsp;&nbsp;{id}
                    </>
                  }
                >
                  <div css={accordionContentStyles}>
                    <table className="table">
                      <tbody>
                        <tr>
                          <td>
                            <em>Organization:</em>
                          </td>
                          <td>{org}</td>
                        </tr>
                        <tr>
                          <td>
                            <em>Location Name:</em>
                          </td>
                          <td>{name}</td>
                        </tr>
                        <tr>
                          <td>
                            <em>Monitoring Location Type:</em>
                          </td>
                          <td>{type}</td>
                        </tr>
                        <tr>
                          <td>
                            <em>Monitoring Site ID:</em>
                          </td>
                          <td>{id}</td>
                        </tr>
                      </tbody>
                    </table>
                    <table css={tableStyles} className="table">
                      <thead>
                        <tr>
                          <th>Parameter</th>
                          <th>Latest Measurement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gage.Datastreams.map((data, dataIndex) => {
                          const measurement = data.Observations[0].result;
                          const datetime = new Date(
                            data.Observations[0].phenomenonTime,
                          ).toLocaleString();
                          const unitAbbr = data.unitOfMeasurement.symbol;
                          const unitName = data.unitOfMeasurement.name;
                          return (
                            <tr key={dataIndex}>
                              <td>{data.description.split(' / USGS-')[0]}</td>
                              <td>
                                <strong>{measurement}</strong>&nbsp;
                                <small title={unitName}>{unitAbbr}</small>
                                <br />
                                <small css={datetimeStyles}>{datetime}</small>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <a rel="noopener noreferrer" target="_blank" href={url}>
                      <i
                        css={iconStyles}
                        className="fas fa-info-circle"
                        aria-hidden="true"
                      />
                      More Information
                    </a>
                    &nbsp;&nbsp;
                    <small>(opens new browser tab)</small>
                  </div>
                </AccordionItem>
              );
            })}

            {sortedMonitoringStations.map((station, stationIndex) => {
              const id = station.properties.MonitoringLocationIdentifier;
              const name = station.properties.MonitoringLocationName;
              const orgId = station.properties.OrganizationIdentifier;
              const result = station.properties.resultCount;
              const feature = {
                geometry: {
                  type: 'point',
                  longitude: station.x,
                  latitude: station.y,
                },
                symbol: {
                  type: 'simple-marker',
                  style: 'square',
                },
                attributes: station.properties,
              };
              return (
                <AccordionItem
                  key={stationIndex}
                  title={<strong>{name || 'Unknown'}</strong>}
                  subTitle={
                    <>
                      <em>Organization ID:</em>&nbsp;&nbsp;{orgId}
                      <br />
                      <em>Monitoring Site ID:</em>&nbsp;&nbsp;
                      {id.split('-')[1]}
                      <br />
                      <em>Monitoring Measurements:</em>
                      &nbsp;&nbsp;
                      {Number(result).toLocaleString()}
                    </>
                  }
                  feature={feature}
                  idKey={'MonitoringLocationIdentifier'}
                >
                  <div css={accordionContentStyles}>
                    <WaterbodyInfo
                      type={'Monitoring Location'}
                      feature={feature}
                      services={services}
                    />
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

  const permittedDischargersTabContents = (
    <>
      {totalPermittedDischargers === 0 && (
        <p css={centeredTextStyles}>
          There are no dischargers in the {watershed} watershed.
        </p>
      )}

      {totalPermittedDischargers > 0 && (
        <AccordionList
          title={`Dischargers in the ${watershed} watershed.`}
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
          {sortedPermittedDischargers.map((discharger, dischargerIndex) => {
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
                key={dischargerIndex}
                title={<strong>{name || 'Unknown'}</strong>}
                subTitle={<>NPDES ID: {id}</>}
                feature={feature}
                idKey={'CWPName'}
              >
                <WaterbodyInfo
                  type={'Permitted Discharger'}
                  feature={feature}
                />
                <ViewOnMapButton feature={feature} />
              </AccordionItem>
            );
          })}
        </AccordionList>
      )}
    </>
  );

  return (
    <div css={containerStyles}>
      {cipSummary.status === 'failure' && (
        <div css={modifiedErrorBoxStyles}>
          <p>{huc12SummaryError}</p>
        </div>
      )}

      {monitoringStations.status === 'failure' &&
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
                {cipSummary.status === 'failure' || !assessmentUnitCount
                  ? 'N/A'
                  : assessmentUnitCount.toLocaleString() || '0'}
              </span>
              <p css={keyMetricLabelStyles}>Waterbodies</p>
              <div css={switchContainerStyles}>
                <Switch
                  checked={Boolean(totalWaterbodies) && waterbodiesDisplayed}
                  onChange={(checked) => {
                    setWaterbodiesDisplayed(!waterbodiesDisplayed);
                    updateVisibleLayers({
                      key: 'waterbodyLayer',
                      value: waterbodyLayer && !waterbodiesDisplayed,
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
          {!monitoringStationsLayer ||
          !usgsStreamgagesLayer ||
          monitoringStations.status === 'fetching' ||
          usgsStreamgages.status === 'fetching' ? (
            <LoadingSpinner />
          ) : (
            <>
              <span css={keyMetricNumberStyles}>
                {monitoringStations.status === 'failure' ||
                usgsStreamgages.status === 'failure' ||
                !totalSampleLocations
                  ? 'N/A'
                  : totalSampleLocations || 0}
              </span>
              <p css={keyMetricLabelStyles}>Sample Locations</p>
              <div css={switchContainerStyles}>
                <Switch
                  checked={
                    Boolean(totalSampleLocations) && sampleLocationsDisplayed
                  }
                  onChange={(checked) => {
                    setSampleLocationsDisplayed(!sampleLocationsDisplayed);
                  }}
                  disabled={!Boolean(totalSampleLocations)}
                  ariaLabel="Sample Locations"
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
                {permittedDischargers.status === 'failure' ||
                !totalPermittedDischargers
                  ? 'N/A'
                  : totalPermittedDischargers || 0}
              </span>
              <p css={keyMetricLabelStyles}>Permitted Dischargers</p>
              <div css={switchContainerStyles}>
                <Switch
                  checked={
                    Boolean(totalPermittedDischargers) &&
                    permittedDischargersDisplayed
                  }
                  onChange={(checked) => {
                    setPermittedDischargersDisplayed(
                      !permittedDischargersDisplayed,
                    );
                    updateVisibleLayers({
                      key: 'dischargersLayer',
                      value: dischargersLayer && !permittedDischargersDisplayed,
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
            <TabPanel>{waterbodiesTabContents}</TabPanel>

            <TabPanel>
              {(monitoringStations.status === 'fetching' ||
                usgsStreamgages.status === 'fetching') && <LoadingSpinner />}

              {monitoringStations.status === 'failure' &&
                usgsStreamgages.status === 'failure' && (
                  <div css={modifiedErrorBoxStyles}>
                    <p>{monitoringError}</p>
                  </div>
                )}

              {monitoringStations.status === 'success' &&
                usgsStreamgages.status === 'success' &&
                monitoringLocationsTabContents}
            </TabPanel>

            <TabPanel>
              {permittedDischargers.status === 'fetching' && <LoadingSpinner />}

              {permittedDischargers.status === 'failure' && (
                <div css={modifiedErrorBoxStyles}>
                  <p>{echoError}</p>
                </div>
              )}

              {permittedDischargers.status === 'success' &&
                permittedDischargersTabContents}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}

export default function OverviewContainer({ ...props }: Props) {
  return (
    <TabErrorBoundary tabName="Overview">
      <Overview {...props} />
    </TabErrorBoundary>
  );
}
