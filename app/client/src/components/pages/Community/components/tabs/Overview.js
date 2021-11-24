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

  const [
    monitoringStationsDisplayed,
    setMonitoringStationsDisplayed,
  ] = useState(false);

  const [usgsStreamgagesDisplayed, setUsgsStreamgagesDisplayed] = useState(
    false,
  );

  const [sampleLocationsDisplayed, setSampleLocationsDisplayed] = useState(
    false,
  );

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
      const layers = {};

      if (cipSummary.status !== 'failure') {
        layers.waterbodyLayer =
          !waterbodyLayer || useCurrentValue
            ? visibleLayers.waterbodyLayer
            : waterbodiesDisplayed;
      }

      if (monitoringStations.status !== 'failure') {
        layers.monitoringStationsLayer =
          !monitoringStationsLayer || useCurrentValue
            ? visibleLayers.monitoringStationsLayer
            : monitoringStationsDisplayed;
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

  const waterbodies = useWaterbodyFeatures();

  const uniqueWaterbodies = waterbodies
    ? getUniqueWaterbodies(waterbodies)
    : [];

  const totalWaterbodies = uniqueWaterbodies.length;

  const totalSampleLocations =
    monitoringStations.data.features?.length &&
    usgsStreamgages.data.value?.length
      ? monitoringStations.data.features.length +
        usgsStreamgages.data.value.length
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
                    if (!usgsStreamgagesLayer) return;
                    if (!monitoringStationsLayer) return;
                    setSampleLocationsDisplayed(!sampleLocationsDisplayed);
                    setUsgsStreamgagesDisplayed(!sampleLocationsDisplayed);
                    setMonitoringStationsDisplayed(!sampleLocationsDisplayed);
                    setVisibleLayers({
                      usgsStreamgagesLayer: !sampleLocationsDisplayed,
                      monitoringStationsLayer: !sampleLocationsDisplayed,
                      // NOTE: no change for the following layers:
                      waterbodyLayer: waterbodiesDisplayed,
                      dischargersLayer: permittedDischargersDisplayed,
                    });
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
              <SampleLocationsTab
                setSampleLocationsDisplayed={setSampleLocationsDisplayed}
                monitoringStationsDisplayed={monitoringStationsDisplayed}
                setMonitoringStationsDisplayed={setMonitoringStationsDisplayed}
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

function SampleLocationsTab({
  setSampleLocationsDisplayed,
  monitoringStationsDisplayed,
  setMonitoringStationsDisplayed,
  usgsStreamgagesDisplayed,
  setUsgsStreamgagesDisplayed,
  updateVisibleLayers,
}) {
  const { Graphic } = useContext(EsriModulesContext);

  const {
    monitoringStations,
    usgsStreamgages,
    monitoringStationsLayer,
    usgsStreamgagesLayer,
    watershed,
  } = useContext(LocationSearchContext);

  const services = useServicesContext();

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
  }, [
    usgsStreamgagesDisplayed,
    monitoringStationsDisplayed,
    setSampleLocationsDisplayed,
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
        measurement: data.Observations[0].result,
        datetime: new Date(
          data.Observations[0].phenomenonTime,
        ).toLocaleString(),
        unitAbbr: data.unitOfMeasurement.symbol,
        unitName: data.unitOfMeasurement.name,
      })),
    }));

    setNormalizedUsgsStreamgages(gages);

    plotGages(Graphic, gages, usgsStreamgagesLayer);
  }, [Graphic, usgsStreamgages.data, usgsStreamgagesLayer]);

  const [
    normalizedMonitoringStations,
    setNormalizedMonitoringStations,
  ] = useState([]);

  // normalize monitoring stations data with USGS streamgages data,
  // and draw them on the map
  useEffect(() => {
    if (services.status === 'fetching') return;
    if (!monitoringStations.data.features) return;

    const stations = monitoringStations.data.features.map((station) => ({
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
      // TODO
      stationCharacteristicGroups: [].map((data) => ({
        groupName: '',
        totalMeasurements: '',
      })),
    }));

    setNormalizedMonitoringStations(stations);

    plotStations(Graphic, stations, monitoringStationsLayer, services);
  }, [Graphic, monitoringStations.data, monitoringStationsLayer, services]);

  const allSampleLocations = [
    ...normalizedUsgsStreamgages,
    ...normalizedMonitoringStations,
  ];

  const [sampleLocationsSortedBy, setSampleLocationsSortedBy] = useState(
    'locationName',
  );

  const sortedSampleLocations = allSampleLocations.sort((a, b) => {
    if (sampleLocationsSortedBy === 'stationTotalMeasurements') {
      return (
        (b.stationTotalMeasurements || 0) - (a.stationTotalMeasurements || 0)
      );
    }

    if (sampleLocationsSortedBy === 'siteId') {
      return a.siteId.localeCompare(b.siteId);
    }

    return a[sampleLocationsSortedBy].localeCompare(b[sampleLocationsSortedBy]);
  });

  const filteredSampleLocations = sortedSampleLocations.filter((item) => {
    const displayedTypes = [];
    if (usgsStreamgagesDisplayed) displayedTypes.push('USGS Streamgage');
    if (monitoringStationsDisplayed) displayedTypes.push('Monitoring Station');
    return displayedTypes.includes(item.sampleType);
  });

  if (
    monitoringStations.status === 'fetching' ||
    usgsStreamgages.status === 'fetching'
  ) {
    return <LoadingSpinner />;
  }

  if (
    monitoringStations.status === 'failure' &&
    usgsStreamgages.status === 'failure'
  ) {
    return (
      <div css={modifiedErrorBoxStyles}>
        <p>{monitoringError}</p>
      </div>
    );
  }

  if (
    monitoringStations.status === 'success' &&
    usgsStreamgages.status === 'success'
  ) {
    return (
      <>
        {allSampleLocations.length === 0 && (
          <p css={centeredTextStyles}>
            There are no Water Monitoring Locations in the {watershed}{' '}
            watershed.
          </p>
        )}

        {allSampleLocations.length > 0 && (
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
                          normalizedMonitoringStations.length > 0 &&
                          monitoringStationsDisplayed
                        }
                        onChange={(checked) => {
                          if (!monitoringStationsLayer) return;
                          setMonitoringStationsDisplayed(
                            !monitoringStationsDisplayed,
                          );
                          updateVisibleLayers({
                            key: 'monitoringStationsLayer',
                            value: !monitoringStationsDisplayed,
                          });
                        }}
                        disabled={normalizedMonitoringStations.length === 0}
                        ariaLabel="Monitoring Stations"
                      />
                      <span>Monitoring Stations</span>
                    </div>
                  </td>
                  <td>{normalizedMonitoringStations.length}</td>
                </tr>
              </tbody>
            </table>

            <AccordionList
              expandDisabled={true} // disabled to avoid large number of web service calls
              title={
                <>
                  <strong>{filteredSampleLocations.length}</strong> of{' '}
                  <strong>{allSampleLocations.length}</strong> Water Monitoring
                  Locations in the <em>{watershed}</em> watershed.
                </>
              }
              onSortChange={({ value }) => setSampleLocationsSortedBy(value)}
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
              {filteredSampleLocations.map((item, index) => {
                const feature = {
                  geometry: {
                    type: 'point',
                    longitude: item.locationLongitude,
                    latitude: item.locationLatitude,
                  },
                  symbol: {
                    type: 'simple-marker',
                    style: 'square',
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
  const { Graphic } = useContext(EsriModulesContext);

  const { permittedDischargers, dischargersLayer, watershed } = useContext(
    LocationSearchContext,
  );

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
                  <WaterbodyInfo
                    type="Permitted Discharger"
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
