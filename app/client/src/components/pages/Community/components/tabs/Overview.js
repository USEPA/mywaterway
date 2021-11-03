// @flow

import React, { useState, useEffect } from 'react';
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
  const { Graphic } = React.useContext(EsriModulesContext);

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
  } = React.useContext(LocationSearchContext);

  const [waterbodiesDisplayed, setWaterbodiesDisplayed] = useState(true);

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

  const [
    monitoringLocationsDisplayed,
    setMonitoringLocationsDisplayed,
  ] = useState(false);

  useEffect(() => {
    // TODO: determine how monitoring stations and usgs streamgages switches are
    // toggled whenever the 'monitoringLocationsDisplayed' switch is true
    console.log(monitoringLocationsDisplayed);
  }, [monitoringLocationsDisplayed]);

  const services = useServicesContext();

  // set the waterbody features
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
      return {
        x: gage.Locations[0].location.coordinates[0],
        y: gage.Locations[0].location.coordinates[1],
        properties: gage.properties,
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

  // Updates visible layers based on webservice statuses.
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

  const totalMonitoringLocations =
    totalMonitoringStations && totalUsgsStreamgages
      ? totalMonitoringStations + totalUsgsStreamgages
      : null;

  const totalPermittedDischargers =
    permittedDischargers.data.Results?.Facilities.length;

  // TODO: determine if we'll display monitoring stations and streamgages together
  // if not, maybe rename setMonitoringLocations... to setMonitoringStations ?
  const [
    monitoringLocationsSortedBy,
    setMonitoringLocationsSortedBy,
  ] = useState('MonitoringLocationName');

  const sortedMonitoringStations = monitoringStations.data.features
    ? monitoringStations.data.features.sort((objA, objB) => {
        // sort resultCount (measurements) in descending order
        if (monitoringLocationsSortedBy === 'resultCount') {
          return objB.properties.resultCount - objA.properties.resultCount;
        }

        if (monitoringLocationsSortedBy === 'MonitoringLocationIdentifier') {
          const a = objA.properties.MonitoringLocationIdentifier.split('-')[1];
          const b = objB.properties.MonitoringLocationIdentifier.split('-')[1];
          return a.localeCompare(b);
        }

        return objA.properties[monitoringLocationsSortedBy].localeCompare(
          objB.properties[monitoringLocationsSortedBy],
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
                !totalMonitoringLocations
                  ? 'N/A'
                  : totalMonitoringLocations || 0}
              </span>
              <p css={keyMetricLabelStyles}>Sample Locations</p>
              <div css={switchContainerStyles}>
                <Switch
                  checked={
                    Boolean(totalMonitoringLocations) &&
                    monitoringLocationsDisplayed
                  }
                  onChange={(checked) => {
                    setMonitoringLocationsDisplayed(
                      !monitoringLocationsDisplayed,
                    );
                  }}
                  disabled={!Boolean(totalMonitoringLocations)}
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
            <TabPanel>
              <WaterbodyList
                waterbodies={waterbodies}
                fieldName={null}
                title={`Overall condition of waterbodies in the ${watershed} watershed.`}
              />
            </TabPanel>

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
                usgsStreamgages.status === 'success' && (
                  <>
                    {totalMonitoringLocations === 0 && (
                      <p css={centeredTextStyles}>
                        There are no Water Monitoring Locations in the{' '}
                        {watershed} watershed.
                      </p>
                    )}

                    {totalMonitoringLocations && totalMonitoringLocations > 0 && (
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
                                      setUsgsStreamgagesDisplayed(
                                        !usgsStreamgagesDisplayed,
                                      );

                                      updateVisibleLayers({
                                        key: 'usgsStreamgagesLayer',
                                        value:
                                          usgsStreamgagesLayer &&
                                          !usgsStreamgagesDisplayed,
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
                          title={`Water Monitoring Locations in the ${watershed} watershed.`}
                          onSortChange={(sortBy) => {
                            setMonitoringLocationsSortedBy(sortBy.value);
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
                          {usgsStreamgages.data.value.map((item, index) => {
                            const id = item.properties.monitoringLocationNumber;
                            const name = item.properties.monitoringLocationName;
                            const feature = {};

                            return (
                              <AccordionItem
                                key={index}
                                title={<strong>{name || 'Unknown'}</strong>}
                                subTitle={<>Monitoring Location ID: {id}</>}
                                feature={feature}
                                idKey={null}
                              >
                                <div css={accordionContentStyles}>
                                  (Placeholder)
                                  {/* <ViewOnMapButton feature={feature} /> */}
                                </div>
                              </AccordionItem>
                            );
                          })}

                          {sortedMonitoringStations.map((item, index) => {
                            const id =
                              item.properties.MonitoringLocationIdentifier;
                            const name = item.properties.MonitoringLocationName;
                            const orgId =
                              item.properties.OrganizationIdentifier;
                            const result = item.properties.resultCount;
                            const feature = {
                              geometry: {
                                type: 'point',
                                longitude: item.x,
                                latitude: item.y,
                              },
                              symbol: {
                                type: 'simple-marker',
                                style: 'square',
                              },
                              attributes: item.properties,
                            };

                            return (
                              <AccordionItem
                                key={index}
                                title={<strong>{name || 'Unknown'}</strong>}
                                subTitle={
                                  <>
                                    Organization ID: {orgId}
                                    <br />
                                    Monitoring Site ID: {id.split('-')[1]}
                                    <br />
                                    Monitoring Measurements:{' '}
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
                )}
            </TabPanel>

            <TabPanel>
              {permittedDischargers.status === 'fetching' && <LoadingSpinner />}

              {permittedDischargers.status === 'failure' && (
                <div css={modifiedErrorBoxStyles}>
                  <p>{echoError}</p>
                </div>
              )}

              {permittedDischargers.status === 'success' && (
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
                      {sortedPermittedDischargers.map((item, index) => {
                        const id = item.SourceID;
                        const name = item.CWPName;
                        const feature = {
                          geometry: {
                            type: 'point',
                            longitude: item.FacLong,
                            latitude: item.FacLat,
                          },
                          attributes: item,
                        };

                        return (
                          <AccordionItem
                            key={index}
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
              )}
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
