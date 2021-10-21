// @flow

import React from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import { css } from 'styled-components/macro';
// components
import {
  AccordionList,
  AccordionItem,
} from 'components/shared/Accordion/MapHighlight';
import { ContentTabs } from 'components/shared/ContentTabs';
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
// contexts
import { EsriModulesContext } from 'contexts/EsriModules';
import { LocationSearchContext } from 'contexts/locationSearch';
import { OverviewFiltersContext } from 'contexts/OverviewFilters';
import { useServicesContext } from 'contexts/LookupFiles';
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

const toggleStyles = css`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;

  span {
    margin-left: 0.5rem;
  }
`;

const centeredTextStyles = css`
  text-align: center;
`;

const accordionContentStyles = css`
  padding: 0.4375em 0.875em 0.875em;
`;

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
    assessmentUnitCount,
  } = React.useContext(LocationSearchContext);

  const {
    waterbodiesFilterEnabled,
    monitoringLocationsFilterEnabled,
    dischargersFilterEnabled,
    setWaterbodiesFilterEnabled,
    setMonitoringLocationsFilterEnabled,
    setDischargersFilterEnabled,
  } = React.useContext(OverviewFiltersContext);

  const services = useServicesContext();

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
    if (services.status === 'fetching') return;

    const stations = monitoringLocations.data.features.map((station) => {
      return {
        x: station.geometry.coordinates[0],
        y: station.geometry.coordinates[1],
        properties: station.properties,
      };
    });

    plotStations(Graphic, stations, monitoringStationsLayer, services);
  }, [monitoringLocations.data, Graphic, monitoringStationsLayer, services]);

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

  // Updates the visible layers. This function also takes into account whether
  // or not the underlying webservices failed.
  const updateVisibleLayers = React.useCallback(
    ({ key = null, newValue = null, useCurrentValue = false }) => {
      const newVisibleLayers = {};
      if (monitoringLocations.status !== 'failure') {
        newVisibleLayers['monitoringStationsLayer'] =
          !monitoringStationsLayer || useCurrentValue
            ? visibleLayers['monitoringStationsLayer']
            : monitoringLocationsFilterEnabled;
      }
      if (cipSummary.status !== 'failure') {
        newVisibleLayers['waterbodyLayer'] =
          !waterbodyLayer || useCurrentValue
            ? visibleLayers['waterbodyLayer']
            : waterbodiesFilterEnabled;
      }
      if (permittedDischargers.status !== 'failure') {
        newVisibleLayers['dischargersLayer'] =
          !dischargersLayer || useCurrentValue
            ? visibleLayers['dischargersLayer']
            : dischargersFilterEnabled;
      }

      if (newVisibleLayers.hasOwnProperty(key)) {
        newVisibleLayers[key] = newValue;
      }

      // set the visible layers if something changed
      if (JSON.stringify(visibleLayers) !== JSON.stringify(newVisibleLayers)) {
        setVisibleLayers(newVisibleLayers);
      }
    },
    [
      dischargersLayer,
      dischargersFilterEnabled,
      permittedDischargers,
      monitoringLocations,
      monitoringStationsLayer,
      monitoringLocationsFilterEnabled,
      waterbodyLayer,
      waterbodiesFilterEnabled,
      cipSummary,
      visibleLayers,
      setVisibleLayers,
    ],
  );

  // Updates visible layers based on webservice statuses.
  React.useEffect(() => {
    updateVisibleLayers({ useCurrentValue: true });
  }, [
    monitoringLocations,
    cipSummary,
    permittedDischargers,
    visibleLayers,
    updateVisibleLayers,
  ]);

  const waterbodyCount = uniqueWaterbodies && uniqueWaterbodies.length;
  const monitoringLocationCount =
    monitoringLocations.data.features &&
    monitoringLocations.data.features.length;
  const permittedDischargerCount =
    permittedDischargers.data.Results &&
    permittedDischargers.data.Results.Facilities &&
    permittedDischargers.data.Results.Facilities.length;

  const [sortBy, setSortBy] = React.useState('MonitoringLocationName');
  const sortedMonitoringStations = monitoringLocations.data.features
    ? monitoringLocations.data.features.sort((objA, objB) => {
        // sort resultCount (measurements) in descending order
        if (sortBy === 'resultCount') {
          return objB['properties'][sortBy] - objA['properties'][sortBy];
        }

        if (sortBy === 'MonitoringLocationIdentifier') {
          const idA = objA['properties'][sortBy].split('-')[1];
          const idB = objB['properties'][sortBy].split('-')[1];
          return idA.localeCompare(idB);
        }

        return objA['properties'][sortBy].localeCompare(
          objB['properties'][sortBy],
        );
      })
    : [];

  const [sortDischBy, setSortDischBy] = React.useState('CWPName');
  const sortedDischargers = permittedDischargers.data?.Results?.Facilities
    ? permittedDischargers.data?.Results?.Facilities?.sort((objA, objB) => {
        // sort resultCount (measurements) in descending order
        if (sortDischBy === 'resultCount') {
          return objB[sortDischBy] - objA[sortDischBy];
        }

        if (sortDischBy === 'MonitoringLocationIdentifier') {
          const idA = objA[sortDischBy].split('-')[1];
          const idB = objB[sortDischBy].split('-')[1];
          return idA.localeCompare(idB);
        }

        return objA[sortDischBy].localeCompare(objB[sortDischBy]);
      })
    : [];

  const convertFacilityToGraphic = React.useCallback(
    (facility: Object) => {
      return new Graphic({
        geometry: {
          type: 'point', // autocasts as new Point()
          longitude: facility['FacLong'],
          latitude: facility['FacLat'],
        },
        attributes: facility,
      });
    },
    [Graphic],
  );

  return (
    <div css={containerStyles}>
      {cipSummary.status === 'failure' && (
        <div css={modifiedErrorBoxStyles}>
          <p>{huc12SummaryError}</p>
        </div>
      )}

      {monitoringLocations.status === 'failure' && (
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
        waterbodyCount === 0 && (
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
                {cipSummary.status === 'failure'
                  ? 'N/A'
                  : (assessmentUnitCount &&
                      assessmentUnitCount.toLocaleString()) ||
                    '0'}
              </span>
              <p css={keyMetricLabelStyles}>Number of Waterbodies</p>
              <div css={switchContainerStyles}>
                <Switch
                  checked={Boolean(waterbodyCount) && waterbodiesFilterEnabled}
                  onChange={(checked) => {
                    setWaterbodiesFilterEnabled(!waterbodiesFilterEnabled);

                    // first check if layer exists and is not falsy
                    updateVisibleLayers({
                      key: 'waterbodyLayer',
                      newValue: waterbodyLayer && !waterbodiesFilterEnabled,
                    });
                  }}
                  disabled={!Boolean(waterbodyCount)}
                  ariaLabel="Waterbodies"
                />
              </div>
            </>
          )}
        </div>

        <div css={keyMetricStyles}>
          {!monitoringStationsLayer ||
          monitoringLocations.status === 'fetching' ? (
            <LoadingSpinner />
          ) : (
            <>
              <span css={keyMetricNumberStyles}>
                {monitoringLocations.status === 'failure'
                  ? 'N/A'
                  : (monitoringLocationCount &&
                      monitoringLocationCount.toLocaleString()) ||
                    '0'}
              </span>
              <p css={keyMetricLabelStyles}>Number of Monitoring Locations</p>
              <div css={switchContainerStyles}>
                <Switch
                  checked={
                    Boolean(monitoringLocationCount) &&
                    monitoringLocationsFilterEnabled
                  }
                  onChange={(checked) => {
                    setMonitoringLocationsFilterEnabled(
                      !monitoringLocationsFilterEnabled,
                    );

                    // first check if layer exists and is not falsy
                    updateVisibleLayers({
                      key: 'monitoringStationsLayer',
                      newValue:
                        monitoringStationsLayer &&
                        !monitoringLocationsFilterEnabled,
                    });
                  }}
                  disabled={!Boolean(monitoringLocationCount)}
                  ariaLabel="Monitoring Locations"
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
                {permittedDischargers.status === 'failure'
                  ? 'N/A'
                  : (permittedDischargerCount &&
                      permittedDischargerCount.toLocaleString()) ||
                    '0'}
              </span>
              <p css={keyMetricLabelStyles}>Number of Permitted Dischargers</p>
              <div css={switchContainerStyles}>
                <Switch
                  checked={
                    Boolean(permittedDischargerCount) &&
                    dischargersFilterEnabled
                  }
                  onChange={(checked) => {
                    setDischargersFilterEnabled(!dischargersFilterEnabled);

                    // first check if layer exists and is not falsy
                    updateVisibleLayers({
                      key: 'dischargersLayer',
                      newValue: dischargersLayer && !dischargersFilterEnabled,
                    });
                  }}
                  disabled={!Boolean(permittedDischargerCount)}
                  ariaLabel="Permitted Dischargers"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <ContentTabs>
        <Tabs>
          <TabList>
            <Tab>
              {(!waterbodyLayer || waterbodies === null) &&
              cipSummary.status !== 'failure' ? (
                <>Waterbodies</>
              ) : (
                <>
                  {cipSummary.status !== 'failure' && assessmentUnitCount && (
                    <strong>{assessmentUnitCount.toLocaleString()}</strong>
                  )}{' '}
                  Waterbodies
                </>
              )}
            </Tab>

            <Tab>
              {!monitoringStationsLayer ||
              monitoringLocations.status === 'fetching' ? (
                <>Monitoring Locations</>
              ) : (
                <>
                  {monitoringLocations.status !== 'failure' &&
                    monitoringLocationCount && (
                      <strong>
                        {monitoringLocationCount.toLocaleString() || '0'}
                      </strong>
                    )}{' '}
                  Monitoring Locations
                </>
              )}
            </Tab>

            <Tab>
              {!dischargersLayer ||
              permittedDischargers.status === 'fetching' ? (
                <>Permitted Dischargers</>
              ) : (
                <>
                  {permittedDischargers.status !== 'failure' &&
                    permittedDischargerCount && (
                      <strong>
                        {permittedDischargerCount.toLocaleString() || '0'}
                      </strong>
                    )}{' '}
                  Permitted Dischargers
                </>
              )}
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              {waterbodies && (
                <div css={toggleStyles}>
                  <Switch
                    checked={
                      Boolean(waterbodyCount) && waterbodiesFilterEnabled
                    }
                    onChange={(checked) => {
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
                  <span>
                    Display <strong>Waterbodies</strong> on map
                  </span>
                </div>
              )}

              <hr />

              <WaterbodyList
                waterbodies={waterbodies}
                fieldName={null}
                title={`Overall condition of waterbodies in the ${watershed} watershed.`}
              />
            </TabPanel>

            <TabPanel>
              {monitoringLocations.status === 'fetching' && <LoadingSpinner />}

              {monitoringLocations.status === 'failure' && (
                <div css={modifiedErrorBoxStyles}>
                  <p>{monitoringError}</p>
                </div>
              )}

              {monitoringLocations.status === 'success' && (
                <>
                  {monitoringLocations.data.features.length === 0 && (
                    <p css={centeredTextStyles}>
                      There are no Water Monitoring Locations in the {watershed}{' '}
                      watershed.
                    </p>
                  )}

                  {monitoringLocations.data.features.length > 0 && (
                    <>
                      <div css={toggleStyles}>
                        <Switch
                          checked={
                            Boolean(monitoringLocationCount) &&
                            monitoringLocationsFilterEnabled
                          }
                          onChange={(checked) => {
                            setMonitoringLocationsFilterEnabled(
                              !monitoringLocationsFilterEnabled,
                            );

                            // first check if layer exists and is not falsy
                            updateVisibleLayers({
                              key: 'monitoringStationsLayer',
                              newValue:
                                monitoringStationsLayer &&
                                !monitoringLocationsFilterEnabled,
                            });
                          }}
                          disabled={!Boolean(monitoringLocationCount)}
                          ariaLabel="Monitoring Locations"
                        />
                        <span>
                          Display <strong>Monitoring Locations</strong> on map
                        </span>
                      </div>

                      <hr />

                      <AccordionList
                        expandDisabled={true} // disabled to avoid large number of web service calls
                        title={`Water Monitoring Locations in the ${watershed} watershed.`}
                        onSortChange={(sortBy) => setSortBy(sortBy.value)}
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
                        {sortedMonitoringStations.map((item, index) => {
                          const { properties: prop } = item;

                          const feature = {
                            geometry: {
                              type: 'point', // autocasts as new Point()
                              longitude: item.x,
                              latitude: item.y,
                            },
                            symbol: {
                              type: 'simple-marker', // autocasts as new SimpleMarkerSymbol()
                              style: 'square',
                            },
                            attributes: prop,
                          };

                          return (
                            <AccordionItem
                              key={index}
                              title={
                                <strong>
                                  {prop['MonitoringLocationName'] || 'Unknown'}
                                </strong>
                              }
                              subTitle={
                                <>
                                  Organization ID:{' '}
                                  {prop['OrganizationIdentifier']}
                                  <br />
                                  Monitoring Site ID:{' '}
                                  {
                                    prop['MonitoringLocationIdentifier'].split(
                                      '-',
                                    )[1]
                                  }
                                  <br />
                                  Monitoring Measurements:{' '}
                                  {Number(prop['resultCount']).toLocaleString()}
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
                  {permittedDischargers.data.Results.Facilities.length ===
                    0 && (
                    <p css={centeredTextStyles}>
                      There are no dischargers in the {watershed} watershed.
                    </p>
                  )}

                  {permittedDischargers.data.Results.Facilities.length > 0 && (
                    <>
                      <div css={toggleStyles}>
                        <Switch
                          checked={
                            Boolean(permittedDischargerCount) &&
                            dischargersFilterEnabled
                          }
                          onChange={(checked) => {
                            setDischargersFilterEnabled(
                              !dischargersFilterEnabled,
                            );

                            // first check if layer exists and is not falsy
                            updateVisibleLayers({
                              key: 'dischargersLayer',
                              newValue:
                                dischargersLayer && !dischargersFilterEnabled,
                            });
                          }}
                          disabled={!Boolean(permittedDischargerCount)}
                          ariaLabel="Permitted Dischargers"
                        />
                        <span>
                          Display <strong>Permitted Dischargers</strong> on map
                        </span>
                      </div>

                      <hr />

                      <AccordionList
                        title={`Dischargers in the ${watershed} watershed.`}
                        onSortChange={(sortBy) => setSortDischBy(sortBy.value)}
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
                        {sortedDischargers.map((item, index) => {
                          const feature = convertFacilityToGraphic(item);

                          return (
                            <AccordionItem
                              key={index}
                              title={
                                <strong>{item['CWPName'] || 'Unknown'}</strong>
                              }
                              subTitle={`NPDES ID: ${item['SourceID']}`}
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
                    </>
                  )}
                </>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </ContentTabs>
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
