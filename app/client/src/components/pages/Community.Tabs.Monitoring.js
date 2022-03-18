// @flow

import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import { css } from 'styled-components/macro';
// components
import TabErrorBoundary from 'components/shared/ErrorBoundary.TabErrorBoundary';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import Switch from 'components/shared/Switch';
import ViewOnMapButton from 'components/shared/ViewOnMapButton';
import WaterbodyInfo from 'components/shared/WaterbodyInfo';
import {
  AccordionList,
  AccordionItem,
} from 'components/shared/AccordionMapHighlight';
import { errorBoxStyles } from 'components/shared/MessageBoxes';
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
import { plotFacilities, plotGages, plotStations } from 'utils/mapFunctions';
import { useWaterbodyOnMap } from 'utils/hooks';
// data
import { characteristicGroupMappings } from 'config/characteristicGroupMappings';
// errors
import { monitoringError } from 'config/errorMessages';
// config
import { usgsStaParameters } from 'config/usgsStaParameters';
// styles
import { toggleTableStyles } from 'styles/index.js';

const containerStyles = css`
  @media (min-width: 960px) {
    padding: 1em;
  }
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles};
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

type MonitoringLocationData = {
  type: 'FeatureCollection',
  features: Array<{
    type: 'Feature',
    geometry: Object,
    properties: Object,
  }>,
};

type Station = {
  monitoringType: 'Sample Location',
  siteId: string,
  orgId: string,
  orgName: string,
  locationLongitude: number,
  locationLatitude: number,
  locationName: string,
  locationType: string,
  locationUrl: string,
  stationProviderName: string,
  stationTotalSamples: number,
  stationTotalMeasurements: number,
  uid: string,
};

type MonitoringLocationGroups = {
  [label: string]: {
    label: string,
    groupName: string,
    stations: Station[],
    toggled: boolean,
  },
};

function Monitoring() {
  const services = useServicesContext();

  // draw the waterbody on the map
  useWaterbodyOnMap();

  const {
    monitoringLocations,
    monitoringGroups,
    showAllMonitoring,
    setMonitoringGroups,
    dischargersLayer,
    permittedDischargers,
    monitoringLocationsLayer,
    setShowAllMonitoring,
    watershed,
    visibleLayers,
    setVisibleLayers,
    usgsStreamgages,
    usgsDailyPrecipitation,
    usgsStreamgagesLayer,
  } = useContext(LocationSearchContext);

  const [usgsStreamgagesDisplayed, setUsgsStreamgagesDisplayed] =
    useState(true);

  const [monitoringDisplayed, setMonitoringDisplayed] = useState(true);

  const [usgsStreamgagesPlotted, setUsgsGtreamgagesPlotted] = useState(false);

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
            parameterUsgsName: matchedParam?.staDescription || parameterDesc,
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

    plotGages(gages, usgsStreamgagesLayer).then((result) => {
      if (result.addFeatureResults.length > 0) setUsgsGtreamgagesPlotted(true);
    });
  }, [usgsStreamgages.data, usgsStreamgagesLayer]);

  // once streamgages have been plotted initially, add precipitation data
  // (fetched from usgsDailyValues web service) to each streamgage if it exists
  // for that particular location and replot the streamgages on the map
  useEffect(() => {
    if (!usgsStreamgagesPlotted) return;
    if (!usgsDailyPrecipitation.data.value) return;
    if (normalizedUsgsStreamgages.length === 0) return;

    const streamgageSiteIds = normalizedUsgsStreamgages.map((gage) => {
      return gage.siteId;
    });

    usgsDailyPrecipitation.data.value?.timeSeries.forEach((site) => {
      const siteId = site.sourceInfo.siteCode[0].value;
      const observation = site.values[0].value[0];

      if (streamgageSiteIds.includes(siteId)) {
        const streamgage = normalizedUsgsStreamgages.find((gage) => {
          return gage.siteId === siteId;
        });

        streamgage.streamgageMeasurements.primary.push({
          parameterCategory: 'primary',
          parameterOrder: 5,
          parameterName: 'Total Daily Rainfall',
          parameterUsgsName: 'Precipitation (USGS Daily Value)',
          parameterCode: '00045',
          measurement: observation.value,
          datetime: new Date(observation.dateTime).toLocaleDateString(),
          unitAbbr: 'in',
          unitName: 'inches',
        });
      }
    });

    plotGages(normalizedUsgsStreamgages, usgsStreamgagesLayer);
  }, [
    usgsStreamgagesPlotted,
    usgsDailyPrecipitation,
    normalizedUsgsStreamgages,
    usgsStreamgagesLayer,
  ]);

  const [sensorsSortedBy, setSensorsSortedBy] = useState('locationName');

  const sortedSensors = [...normalizedUsgsStreamgages].sort((a, b) => {
    if (sensorsSortedBy === 'siteId') {
      return a.siteId.localeCompare(b.siteId);
    }

    return a[sensorsSortedBy].localeCompare(b[sensorsSortedBy]);
  });

  const [prevMonitoringLocationData, setPrevMonitoringLocationData] =
    useState<MonitoringLocationData>({});

  const [monitoringLocationToggles, setMonitoringLocationToggles] = useState(
    {},
  );

  const [monitoringLocationTogglesPrev, setMonitoringLocationTogglesPrev] =
    useState({});

  const [monitoringLocationGroups, setMonitoringLocationGroups] = useState({});

  const [allMonitoringLocations, setAllMonitoringLocations] = useState([]);

  const [displayedMonitoringLocations, setDisplayedMonitoringLocations] =
    useState([]);

  const [allToggled, setAllToggled] = useState(true);

  const [sortBy, setSortBy] = useState('locationName');

  const storeMonitoringLocations = useCallback(() => {
    if (!monitoringLocations.data.features) {
      setAllMonitoringLocations([]);
      return;
    }

    // build up monitoring stations, toggles, and groups
    let allMonitoringLocations = [];
    let monitoringLocationToggles = {};
    let monitoringLocationGroups: MonitoringLocationGroups = {
      Other: { label: 'Other', stations: [], toggled: true },
    };

    monitoringLocations.data.features.forEach((station) => {
      const monitoringLocation = {
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
        // create a unique id, so we can check if the monitoring station has
        // already been added to the display (since a monitoring station id
        // isn't universally unique)
        uid:
          `${station.properties.MonitoringLocationIdentifier}/` +
          `${station.properties.ProviderName}/` +
          `${station.properties.OrganizationIdentifier}`,
      };

      allMonitoringLocations.push(monitoringLocation);

      // build up the monitoringLocationToggles and monitoringLocationGroups
      let groupAdded = false;

      characteristicGroupMappings.forEach((mapping) => {
        monitoringLocationToggles[mapping.label] = true;

        for (const group in station.properties.characteristicGroupResultCount) {
          // if characteristic group exists in switch config object
          if (mapping.groupNames.includes(group)) {
            // if switch group (w/ label key) already exists, add the stations to it
            if (monitoringLocationGroups[mapping.label]) {
              monitoringLocationGroups[mapping.label].stations.push(
                monitoringLocation,
              );
              // else, create the group (w/ label key) and add the station
            } else {
              monitoringLocationGroups[mapping.label] = {
                label: mapping.label,
                stations: [monitoringLocation],
                toggled: true,
              };
            }
            groupAdded = true;
          }
        }
      });

      // if characteristic group didn't exist in switch config object,
      // add the station to the 'Other' group
      if (!groupAdded)
        monitoringLocationGroups['Other'].stations.push(monitoringLocation);
    });

    if (monitoringGroups) {
      setMonitoringLocationToggles(monitoringGroups);
    } else {
      setMonitoringLocationToggles(monitoringLocationToggles);
    }

    setAllMonitoringLocations(allMonitoringLocations);
    setDisplayedMonitoringLocations(allMonitoringLocations);
    setMonitoringLocationGroups(monitoringLocationGroups);
    setAllToggled(showAllMonitoring);

    if (!monitoringGroups) setMonitoringGroups(monitoringLocationToggles);
  }, [
    services,
    monitoringGroups,
    monitoringLocations,
    setMonitoringGroups,
    showAllMonitoring,
  ]);

  const drawMap = useCallback(
    (monitoringLocationTogglesParam) => {
      if (allMonitoringLocations.length === 0) return;
      if (services.status === 'fetching') return;
      const addedStationUids = [];
      let tempDisplayedMonitoringLocations = [];

      if (allToggled) {
        tempDisplayedMonitoringLocations = allMonitoringLocations;
      } else {
        for (let key in monitoringLocationGroups) {
          const group = monitoringLocationGroups[key];
          // if the location is toggled
          if (monitoringLocationTogglesParam[group.label]) {
            group.stations.forEach((station) => {
              // add the station to the display, if it has not already been added
              if (!addedStationUids.includes(station.uid)) {
                addedStationUids.push(station.uid);
                tempDisplayedMonitoringLocations.push(station);
              }
            });
          }
        }
      }

      plotStations(
        tempDisplayedMonitoringLocations,
        monitoringLocationsLayer,
        services,
      );

      if (tempDisplayedMonitoringLocations.length === 0) {
        setDisplayedMonitoringLocations([]);
        return;
      }

      if (
        displayedMonitoringLocations.length ===
        tempDisplayedMonitoringLocations.length
      ) {
        return;
      }

      setDisplayedMonitoringLocations(tempDisplayedMonitoringLocations);
    },
    [
      displayedMonitoringLocations,
      allMonitoringLocations,
      allToggled,
      monitoringLocationGroups,
      monitoringLocationsLayer,
      services,
    ],
  );

  const toggleSwitch = useCallback(
    (groupLabel: string, allToggledParam?: boolean = false) => {
      const toggleGroups = monitoringLocationToggles;

      if (groupLabel === 'All') {
        console.log('allToggledParam: ', allToggledParam);
        if (!allToggledParam) {
          // toggle everything on
          setAllToggled(true);
          for (var toggle in toggleGroups) {
            toggleGroups[toggle] = true;
          }

          setShowAllMonitoring(true);
          monitoringLocationsLayer.visible = true;

          setMonitoringDisplayed(true);
        } else {
          // toggle everything off
          setAllToggled(false);
          for (var key in toggleGroups) {
            toggleGroups[key] = false;
          }

          setShowAllMonitoring(false);
          monitoringLocationsLayer.visible = false;

          setMonitoringDisplayed(false);
        }
      }
      // just one of the categories was changed
      else {
        monitoringLocationsLayer.visible = true;
        toggleGroups[groupLabel] = !monitoringLocationToggles[groupLabel];

        // if all other switches are toggled on, toggle the 'All' switch on
        const groups = toggleGroups;
        delete groups['All'];

        const allOthersToggled = Object.keys(groups).every((group) => {
          return groups[group];
        });

        setAllToggled(allOthersToggled);
        setShowAllMonitoring(allOthersToggled);

        // only check the toggles that are on the screen (i.e., ignore Bacterial, Sediments, etc.)
        const someToggled =
          groups.Metals ||
          groups.Nutrients ||
          groups.Pesticides ||
          groups.Physical ||
          groups.Other;
        setMonitoringDisplayed(someToggled);
      }

      setMonitoringGroups(toggleGroups);
      setMonitoringLocationToggles(toggleGroups);

      drawMap(toggleGroups);
    },
    [
      monitoringLocationsLayer,
      drawMap,
      monitoringLocationToggles,
      setMonitoringGroups,
      setShowAllMonitoring,
    ],
  );

  // emulate componentdidmount
  const [componentMounted, setComponentMounted] = useState(false);
  useEffect(() => {
    if (componentMounted) return;
    storeMonitoringLocations();
    setComponentMounted(true);
  }, [componentMounted, storeMonitoringLocations]);

  // emulate componentdidupdate
  const mounted = useRef();
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
    } else {
      // re-store monitoring stations if the data changes
      if (monitoringLocations.data !== prevMonitoringLocationData) {
        setPrevMonitoringLocationData(monitoringLocations.data);
        storeMonitoringLocations();
      }

      // return early if displayedMonitoringLocations hasn't yet been set
      if (displayedMonitoringLocations.length === 0) return;

      drawMap(monitoringLocationToggles);
    }
  }, [
    monitoringLocationToggles,
    monitoringLocations,
    prevMonitoringLocationData,
    displayedMonitoringLocations,
    drawMap,
    storeMonitoringLocations,
  ]);

  // clear the visible layers if the monitoring stations service failed
  useEffect(() => {
    if (monitoringLocations.status !== 'failure') return;

    if (Object.keys(visibleLayers).length > 0) setVisibleLayers({});
  }, [monitoringLocations, visibleLayers, setVisibleLayers]);

  // draw the permitted dischargers on the map
  useEffect(() => {
    // wait until permitted dischargers data is set in context
    if (
      permittedDischargers.data['Results'] &&
      permittedDischargers.data['Results']['Facilities']
    ) {
      plotFacilities({
        facilities: permittedDischargers.data['Results']['Facilities'],
        layer: dischargersLayer,
      });
    }
  }, [permittedDischargers.data, dischargersLayer]);

  const sortedMonitoringLocations = displayedMonitoringLocations
    ? displayedMonitoringLocations.sort((a, b) => {
        if (sortBy === 'stationTotalMeasurements') {
          return b.stationTotalMeasurements - a.stationTotalMeasurements;
        }

        if (sortBy === 'siteId') {
          return a.siteId.localeCompare(b.siteId);
        }

        return a[sortBy].localeCompare(b[sortBy]);
      })
    : [];

  const totalLocations = allMonitoringLocations.length.toLocaleString();
  const displayLocations = sortedMonitoringLocations.length.toLocaleString();

  return (
    <div css={containerStyles}>
      <div css={keyMetricsStyles}>
        <div css={keyMetricStyles}>
          {usgsStreamgages.status === 'fetching' ? (
            <LoadingSpinner />
          ) : (
            <>
              <span css={keyMetricNumberStyles}>
                {usgsStreamgages.status === 'failure'
                  ? 'N/A'
                  : `${normalizedUsgsStreamgages.length}`}
              </span>
              <p css={keyMetricLabelStyles}>Current Water Conditions</p>
              <div css={switchContainerStyles}>
                <Switch
                  checked={
                    Boolean(normalizedUsgsStreamgages.length) &&
                    usgsStreamgagesDisplayed
                  }
                  onChange={(checked) => {
                    if (!usgsStreamgagesLayer) return;
                    if (!monitoringLocationsLayer) return;
                    setUsgsStreamgagesDisplayed(!usgsStreamgagesDisplayed);
                    setVisibleLayers({
                      usgsStreamgagesLayer: !usgsStreamgagesDisplayed,
                      monitoringLocationsLayer: monitoringDisplayed,
                    });
                  }}
                  disabled={!Boolean(normalizedUsgsStreamgages.length)}
                  ariaLabel="Current Water Conditions"
                />
              </div>
            </>
          )}
        </div>
        <div css={keyMetricStyles}>
          {monitoringLocations.status === 'fetching' ? (
            <LoadingSpinner />
          ) : (
            <>
              <span css={keyMetricNumberStyles}>
                {monitoringLocations.status === 'failure'
                  ? 'N/A'
                  : `${monitoringLocations.data.features.length}`}
              </span>
              <p css={keyMetricLabelStyles}>Sample Locations</p>
              <div css={switchContainerStyles}>
                <Switch
                  checked={Boolean(totalLocations) && monitoringDisplayed}
                  onChange={(checked) => {
                    if (!usgsStreamgagesLayer) return;
                    if (!monitoringLocationsLayer) return;
                    const newMonitoringDisplayed = !monitoringDisplayed;
                    setMonitoringDisplayed(newMonitoringDisplayed);
                    setVisibleLayers({
                      usgsStreamgagesLayer: usgsStreamgagesDisplayed,
                      monitoringLocationsLayer: newMonitoringDisplayed,
                    });

                    if (newMonitoringDisplayed) {
                      // restore the switch values
                      setMonitoringLocationToggles(
                        monitoringLocationTogglesPrev,
                      );
                      setMonitoringGroups(monitoringLocationTogglesPrev);

                      const allToggledOn = Object.values(
                        monitoringLocationTogglesPrev,
                      ).every((value) => value);
                      setAllToggled(allToggledOn);

                      drawMap(monitoringLocationTogglesPrev);
                    } else {
                      setMonitoringLocationTogglesPrev({ ...monitoringGroups });

                      // turn off all switches
                      toggleSwitch('All', true);

                      drawMap(monitoringLocationToggles);
                    }
                  }}
                  disabled={!Boolean(totalLocations)}
                  ariaLabel="Monitoring Stations"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div css={tabsStyles}>
        <Tabs>
          <TabList>
            <Tab>Current Water Conditions</Tab>
            <Tab>Sample Locations</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <p>
                Find out about current water conditions at sensor locations.
              </p>

              {usgsStreamgages.status === 'fetching' && <LoadingSpinner />}

              {usgsStreamgages.status === 'failure' && (
                <div css={modifiedErrorBoxStyles}>
                  <p>{monitoringError}</p>
                </div>
              )}

              {usgsStreamgages.status === 'success' && (
                <>
                  <AccordionList
                    expandDisabled={true} // disabled to avoid large number of web service calls
                    title={
                      <>
                        There{' '}
                        {normalizedUsgsStreamgages.length === 1 ? 'is' : 'are'}{' '}
                        <strong>{normalizedUsgsStreamgages.length}</strong>{' '}
                        {normalizedUsgsStreamgages.length === 1
                          ? 'location'
                          : 'locations'}{' '}
                        with data in the <em>{watershed}</em> watershed.
                      </>
                    }
                    onSortChange={({ value }) => setSensorsSortedBy(value)}
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
                        label: 'Organization ID',
                        value: 'orgId',
                      },
                      {
                        label: 'Monitoring Site ID',
                        value: 'siteId',
                      },
                    ]}
                  >
                    {sortedSensors.map((item, index) => {
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
                          title={
                            <strong>{item.locationName || 'Unknown'}</strong>
                          }
                          subTitle={
                            <>
                              <em>Organization Name:</em>&nbsp;&nbsp;
                              {item.orgName}
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
                            {item.monitoringType ===
                              'Current Water Conditions' && (
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
            </TabPanel>
            <TabPanel>
              <p>
                View available monitoring sample locations in your local
                watershed or view by category.
              </p>

              {monitoringLocations.status === 'fetching' && <LoadingSpinner />}

              {monitoringLocations.status === 'failure' && (
                <div css={modifiedErrorBoxStyles}>
                  <p>{monitoringError}</p>
                </div>
              )}

              {monitoringLocations.status === 'success' && (
                <>
                  {allMonitoringLocations.length === 0 && (
                    <p css={centeredTextStyles}>
                      There are no monitoring sample locations in the{' '}
                      {watershed} watershed.
                    </p>
                  )}

                  {allMonitoringLocations.length > 0 && (
                    <>
                      <table css={toggleTableStyles} className="table">
                        <thead>
                          <tr>
                            <th>
                              <div css={toggleStyles}>
                                <Switch
                                  checked={allToggled}
                                  onChange={(ev) =>
                                    toggleSwitch('All', allToggled)
                                  }
                                  ariaLabel="Toggle all monitoring locations"
                                />
                                <span>All Monitoring Sample Locations</span>
                              </div>
                            </th>
                            <th>Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.values(monitoringLocationGroups)
                            .map((group) => {
                              // remove duplicates caused by a single monitoring station having multiple overlapping groupNames
                              // like 'Inorganics, Major, Metals' and 'Inorganics, Minor, Metals'
                              const uniqueStations = [
                                ...new Set(group.stations),
                              ];

                              return (
                                <tr key={group.label}>
                                  <td>
                                    <div css={toggleStyles}>
                                      <Switch
                                        checked={
                                          monitoringLocationToggles[group.label]
                                        }
                                        onChange={(ev) =>
                                          toggleSwitch(group.label)
                                        }
                                        ariaLabel={`Toggle ${group.label}`}
                                      />
                                      <span>{group.label}</span>
                                    </div>
                                  </td>
                                  <td>
                                    {uniqueStations.length.toLocaleString()}
                                  </td>
                                </tr>
                              );
                            })
                            .sort((a, b) => {
                              // sort the switches with Other at the end
                              if (a.key === 'Other') return 1;
                              if (b.key === 'Other') return -1;
                              return a.key > b.key ? 1 : -1;
                            })}
                        </tbody>
                      </table>

                      <AccordionList
                        expandDisabled={true} // disabled to avoid large number of web service calls
                        title={
                          <span data-testid="monitoring-accordion-title">
                            <strong>{displayLocations}</strong> of{' '}
                            <strong>{totalLocations}</strong> water monitoring
                            sample locations in the <em>{watershed}</em>{' '}
                            watershed.
                          </span>
                        }
                        onSortChange={({ value }) => setSortBy(value)}
                        sortOptions={[
                          {
                            label: 'Monitoring Sample Location Name',
                            value: 'locationName',
                          },
                          {
                            label: 'Organization Name',
                            value: 'orgName',
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
                        {sortedMonitoringLocations.map((item, index) => {
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
                              title={
                                <strong>
                                  {item.locationName || 'Unknown'}
                                </strong>
                              }
                              subTitle={
                                <>
                                  <em>Organization Name:</em>&nbsp;&nbsp;
                                  {item.orgName}
                                  <br />
                                  <em>Organization ID:</em>&nbsp;&nbsp;
                                  {item.orgId}
                                  <br />
                                  <em>Monitoring Site ID:</em>&nbsp;&nbsp;
                                  {item.siteId.replace(`${item.orgId}-`, '')}
                                  <br />
                                  <em>Monitoring Measurements:</em>&nbsp;&nbsp;
                                  {item.stationTotalMeasurements}
                                </>
                              }
                              feature={feature}
                              idKey="siteId"
                            >
                              <div css={accordionContentStyles}>
                                <WaterbodyInfo
                                  type="Sample Location"
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
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}

export default function MonitoringContainer({ ...props }: Props) {
  return (
    <TabErrorBoundary tabName="Monitoring">
      <Monitoring {...props} />
    </TabErrorBoundary>
  );
}
