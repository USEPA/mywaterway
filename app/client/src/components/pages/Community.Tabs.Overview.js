// @flow

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import { css } from 'styled-components/macro';
import { useNavigate } from 'react-router-dom';
// components
import {
  AccordionList,
  AccordionItem,
} from 'components/shared/AccordionMapHighlight';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import Switch from 'components/shared/Switch';
import WaterbodyList from 'components/shared/WaterbodyList';
import TabErrorBoundary from 'components/shared/ErrorBoundary.TabErrorBoundary';
import WaterbodyInfo from 'components/shared/WaterbodyInfo';
import ViewOnMapButton from 'components/shared/ViewOnMapButton';
import { infoBoxStyles, errorBoxStyles } from 'components/shared/MessageBoxes';
import {
  keyMetricsStyles,
  keyMetricStyles,
  keyMetricNumberStyles,
  keyMetricLabelStyles,
} from 'components/shared/KeyMetrics';
import ShowLessMore from 'components/shared/ShowLessMore';
import { tabsStyles } from 'components/shared/ContentTabs';
import VirtualizedList from 'components/shared/VirtualizedList';
// contexts
import { useFetchedDataState } from 'contexts/FetchedData';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import {
  useStreamgageData,
  useWaterbodyFeatures,
  useWaterbodyOnMap,
} from 'utils/hooks';
import { plotFacilities, getUniqueWaterbodies } from 'utils/mapFunctions';
// errors
import {
  echoError,
  streamgagesError,
  monitoringError,
  huc12SummaryError,
  zeroAssessedWaterbodies,
} from 'config/errorMessages';
// styles
import { toggleTableStyles } from 'styles/index.js';

const containerStyles = css`
  @media (min-width: 960px) {
    padding: 1em;
  }
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

const toggleStyles = css`
  display: flex;
  align-items: center;

  span {
    margin-left: 0.5rem;
  }
`;

function Overview() {
  const { usgsStreamgages } = useFetchedDataState();

  const {
    cipSummary,
    monitoringLocations,
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
                {Boolean(waterbodies.length) && cipSummary.status === 'success'
                  ? waterbodies.length.toLocaleString()
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
          usgsStreamgages.status === 'idle' ||
          usgsStreamgages.status === 'pending' ? (
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
              <p css={keyMetricLabelStyles}>Monitoring Locations</p>
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
            <Tab>Monitoring Locations</Tab>
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
        <span data-testid="overview-waterbodies-accordion-title">
          Overall condition of{' '}
          <strong>{waterbodies?.length.toLocaleString()}</strong>{' '}
          {waterbodies?.length === 1 ? 'waterbody' : 'waterbodies'} in the{' '}
          <em>{watershed}</em> watershed.
        </span>
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
  const { usgsStreamgages, usgsPrecipitation, usgsDailyAverages } =
    useFetchedDataState();

  const {
    monitoringLocations,
    monitoringLocationsLayer,
    usgsStreamgagesLayer,
    watershed,
  } = useContext(LocationSearchContext);

  const services = useServicesContext();

  const [expandedRows, setExpandedRows] = useState([]);

  const [listTypes, setListTypes] = useState({
    usgsStreamgages: usgsStreamgagesDisplayed,
    monitoringLocations: monitoringLocationsDisplayed,
  });
  // if either of the "Current Water Conditions" or "Past Water Conditions" switches
  // are turned on, or if both switches are turned off, keep the "Monitoring
  // Stations" switch in sync
  useEffect(() => {
    if (usgsStreamgagesDisplayed || monitoringLocationsDisplayed) {
      setMonitoringAndSensorsDisplayed(true);
    }

    if (!usgsStreamgagesDisplayed && !monitoringLocationsDisplayed) {
      setMonitoringAndSensorsDisplayed(false);
    }

    setListTypes({
      usgsStreamgages: usgsStreamgagesDisplayed,
      monitoringLocations: monitoringLocationsDisplayed,
    });
  }, [
    usgsStreamgagesDisplayed,
    monitoringLocationsDisplayed,
    setMonitoringAndSensorsDisplayed,
  ]);

  const normalizedUsgsStreamgages = useStreamgageData(
    usgsStreamgages,
    usgsPrecipitation,
    usgsDailyAverages,
  );

  const [normalizedMonitoringLocations, setNormalizedMonitoringLocations] =
    useState([]);

  // normalize monitoring stations data with USGS streamgages data,
  // and draw them on the map
  useEffect(() => {
    if (services.status === 'fetching') return;
    if (!monitoringLocations.data.features) return;

    const stations = monitoringLocations.data.features.map((station) => ({
      monitoringType: 'Past Water Conditions',
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
      stationTotalMeasurementsPercentile:
        station.properties.stationTotalMeasurementsPercentile,
      stationTotalsByCategory: JSON.stringify(
        station.properties.characteristicGroupResultCount,
      ),
    }));

    setNormalizedMonitoringLocations(stations);

    // remove any filters on the monitoring locations layer
    monitoringLocationsLayer.definitionExpression = '';
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
        displayedTypes.push('Past Water Conditions');
      }

      return displayedTypes.includes(item.monitoringType);
    },
  );

  if (
    monitoringLocations.status === 'fetching' ||
    usgsStreamgages.status === 'idle' ||
    usgsStreamgages.status === 'pending'
  ) {
    return <LoadingSpinner />;
  }

  if (
    monitoringLocations.status === 'success' ||
    usgsStreamgages.status === 'success'
  ) {
    return (
      <>
        <p>
          Water is monitored by state, federal, tribal, and local agencies.
          Universities, volunteers and others also help detect water quality
          concerns.
        </p>

        <p>
          Water quality monitoring locations are shown on the map as both purple
          circles and yellow squares.
          <ShowLessMore
            charLimit={0}
            text=" The yellow squares represent monitoring
            locations that provide real time water quality measurements for a
            subset of categories– such as water level, water temperature,
            dissolved oxygen saturation, and other water quality indicators. The purple circles represent monitoring locations where all other past water conditions data is available. These locations may have monitoring data available from as recently as last week, to multiple decades old, or anywhere in between, depending on the location."
          />
        </p>

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

            <table css={toggleTableStyles} className="table">
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
                        ariaLabel="Past Water Conditions"
                      />
                      <span>Past Water Conditions</span>
                    </div>
                  </td>
                  <td>{normalizedMonitoringLocations.length}</td>
                </tr>
              </tbody>
            </table>

            <AccordionList
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
                  label: 'Organization Name',
                  value: 'orgName',
                },
                {
                  label: 'Water Type',
                  value: 'locationType',
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
              <VirtualizedList
                items={filteredMonitoringAndSensors}
                expandedRowsSetter={setExpandedRows}
                displayedTypes={listTypes}
                renderer={({ index, resizeCell, allExpanded }) => {
                  const item = filteredMonitoringAndSensors[index];

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
                      index={index}
                      title={<strong>{item.locationName || 'Unknown'}</strong>}
                      subTitle={
                        <>
                          <em>Monitoring Type:</em>&nbsp;&nbsp;
                          {item.monitoringType}
                          <br />
                          <em>Organization Name:</em>&nbsp;&nbsp;
                          {item.orgName}
                          <br />
                          <em>Water Type:</em>&nbsp;&nbsp;
                          {item.locationType}
                          {item.monitoringType === 'Past Water Conditions' && (
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
                      allExpanded={allExpanded || expandedRows.includes(index)}
                      onChange={() => {
                        // ensure the cell is sized appropriately
                        resizeCell();

                        // add the item to the expandedRows array so the accordion item
                        // will stay expanded when the user scrolls or highlights map items
                        if (expandedRows.includes(index)) {
                          setExpandedRows(
                            expandedRows.filter((item) => item !== index),
                          );
                        } else setExpandedRows(expandedRows.concat(index));
                      }}
                    >
                      <div css={accordionContentStyles}>
                        {item.monitoringType === 'Current Water Conditions' && (
                          <WaterbodyInfo
                            type="Current Water Conditions"
                            feature={feature}
                            services={services}
                          />
                        )}

                        {item.monitoringType === 'Past Water Conditions' && (
                          <WaterbodyInfo
                            type="Past Water Conditions"
                            feature={feature}
                            services={services}
                          />
                        )}

                        <ViewOnMapButton feature={feature} />
                      </div>
                    </AccordionItem>
                  );
                }}
              />
            </AccordionList>
          </>
        )}
      </>
    );
  }

  return null;
}

function PermittedDischargersTab({ totalPermittedDischargers }) {
  const navigate = useNavigate();
  const { permittedDischargers, dischargersLayer, watershed } = useContext(
    LocationSearchContext,
  );

  // draw the permitted dischargers on the map
  useEffect(() => {
    if (permittedDischargers.data.Results?.Facilities) {
      plotFacilities({
        facilities: permittedDischargers.data.Results.Facilities,
        layer: dischargersLayer,
        navigate,
      });
    }
  }, [permittedDischargers.data, dischargersLayer, navigate]);

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
                There {totalPermittedDischargers === 1 ? 'is' : 'are'}{' '}
                <strong>{totalPermittedDischargers}</strong> permitted{' '}
                {totalPermittedDischargers === 1 ? 'discharger' : 'dischargers'}{' '}
                in the <em>{watershed}</em> watershed.
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

export default function OverviewContainer() {
  return (
    <TabErrorBoundary tabName="Overview">
      <Overview />
    </TabErrorBoundary>
  );
}
