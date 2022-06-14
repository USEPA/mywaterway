// @flow

import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import { css } from 'styled-components/macro';
import { useNavigate } from 'react-router-dom';
// components
import {
  AccordionList,
  AccordionItem,
} from 'components/shared/AccordionMapHighlight';
import { tabsStyles } from 'components/shared/ContentTabs';
import TabErrorBoundary from 'components/shared/ErrorBoundary.TabErrorBoundary';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import {
  keyMetricsStyles,
  keyMetricStyles,
  keyMetricNumberStyles,
  keyMetricLabelStyles,
} from 'components/shared/KeyMetrics';
import { errorBoxStyles } from 'components/shared/MessageBoxes';
import Switch from 'components/shared/Switch';
import TooltipSlider from 'components/shared/TooltipSlider';
import ViewOnMapButton from 'components/shared/ViewOnMapButton';
import VirtualizedList from 'components/shared/VirtualizedList';
import WaterbodyInfo from 'components/shared/WaterbodyInfo';
// contexts
import { useFetchedDataState } from 'contexts/FetchedData';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import { plotFacilities } from 'utils/mapFunctions';
import { useStreamgageData, useWaterbodyOnMap } from 'utils/hooks';
// data
import { characteristicGroupMappings } from 'config/characteristicGroupMappings';
// errors
import { monitoringError } from 'config/errorMessages';
// styles
import 'rc-slider/assets/index.css';
import {
  disclaimerStyles,
  iconStyles,
  toggleTableStyles,
} from 'styles/index.js';

/*
 ** Styles
 */
const containerStyles = css`
  @media (min-width: 960px) {
    padding: 1em;
  }
`;

const modifiedDisclaimerStyles = css`
  ${disclaimerStyles};
  padding-bottom: 0;
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles};
  text-align: center;
`;

const totalRowStyles = css`
  border-top: 2px solid #dee2e6;
  font-weight: bold;
  background-color: #f0f6f9;
`;

const tableFooterStyles = css`
  border-bottom: 1px solid #dee2e6;
  background-color: #f0f6f9;

  td {
    border-top: none;
    font-weight: bold;
    width: 50%;
  }

  span {
    display: inline-block;
    margin-bottom: 0.25em;
  }
`;

const sliderContainerStyles = css`
  align-items: center;
  display: flex;
  gap: 1rem;
  justify-content: center;
  width: 100%;
`;

const sliderHeaderStyles = css`
  padding: 0.5rem 3.5rem;
  width: 100%;
  background-color: #f0f6f9;
  border-top: 1px solid #dee2e6;
  font-weight: bold;
  border-bottom: 2px solid #dee2e6;
`;

const sliderStyles = css`
  align-items: center;
  display: inline-flex;
  height: 3rem;
  width: 60%;
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

function usePeriodOfRecordData(filter, param) {
  const services = useServicesContext();
  const initialWorkerData = {
    minYear: 0,
    maxYear: 0,
    annualData: {},
  };

  const [url, setUrl] = useState(null);
  const [workerData, setWorkerData] = useState(initialWorkerData);

  const resetWorkerData = () => {
    setWorkerData(initialWorkerData);
  };

  useEffect(() => {
    if (param !== 'huc12' && param !== 'siteId') return;
    if (!filter) return;

    let url = null;
    if (services.status === 'success') {
      url =
        `${services.data.waterQualityPortal.monitoringLocation}search?` +
        `&mimeType=csv&dataProfile=periodOfRecord&summaryYears=all`;
      url += param === 'huc12' ? `&huc=${filter}` : `&siteId=${filter}`;
      setUrl(url);
    }
  }, [filter, param, services.data, services.status]);

  useEffect(() => {
    if (!filter || !url) return;
    if (!window.Worker) {
      throw new Error("Your browser doesn't support web workers");
    }
    const origin = window.location.origin;
    // const recordsWorker = buildWorker(recordsJob);
    const recordsWorker = new Worker(`${origin}/periodOfRecordWorker.js`);
    recordsWorker.postMessage([url, origin, characteristicGroupMappings]);
    recordsWorker.onmessage = (message) => {
      if (message.data && typeof message.data === 'string') {
        const parsedData = JSON.parse(message.data);
        parsedData.minYear = parseInt(parsedData.minYear);
        parsedData.maxYear = parseInt(parsedData.maxYear);
        setWorkerData(parsedData);
      }
    };
    return () => recordsWorker.terminate();
  }, [filter, url]);

  return [workerData, resetWorkerData];
}

function Monitoring() {
  const navigate = useNavigate();
  const { usgsStreamgages } = useFetchedDataState();

  // draw the waterbody on the map
  useWaterbodyOnMap();

  const {
    cipSummary,
    monitoringLocations,
    dischargersLayer,
    permittedDischargers,
    monitoringLocationsLayer,
    visibleLayers,
    setVisibleLayers,
    usgsStreamgagesLayer,
  } = useContext(LocationSearchContext);

  const [usgsStreamgagesDisplayed, setUsgsStreamgagesDisplayed] =
    useState(true);

  const [monitoringDisplayed, setMonitoringDisplayed] = useState(true);

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
        navigate,
      });
    }
  }, [permittedDischargers.data, dischargersLayer, navigate]);

  // Syncs the toggles with the visible layers on the map. Mainly
  // used for when the user toggles layers in full screen mode and then
  // exist full screen.
  useEffect(() => {
    if (typeof visibleLayers.usgsStreamgagesLayer === 'boolean') {
      setUsgsStreamgagesDisplayed(visibleLayers.usgsStreamgagesLayer);
    }

    if (typeof visibleLayers.monitoringLocationsLayer === 'boolean') {
      setMonitoringDisplayed(visibleLayers.monitoringLocationsLayer);
    }
  }, [visibleLayers]);

  /**
   * Updates the visible layers. This function also takes into account whether
   * or not the underlying webservices failed.
   */
  const updateVisibleLayers = useCallback(
    ({ useCurrentValue = false }) => {
      const layers = {};

      if (cipSummary.status !== 'failure') {
        layers.waterbodyLayer = visibleLayers.waterbodyLayer;
      }

      if (monitoringLocations.status !== 'failure') {
        layers.monitoringLocationsLayer =
          !monitoringLocationsLayer || useCurrentValue
            ? visibleLayers.monitoringLocationsLayer
            : monitoringDisplayed;
      }

      if (usgsStreamgages.status !== 'failure') {
        layers.usgsStreamgagesLayer =
          !usgsStreamgagesLayer || useCurrentValue
            ? visibleLayers.usgsStreamgagesLayer
            : usgsStreamgagesDisplayed;
      }

      if (permittedDischargers.status !== 'failure') {
        layers.dischargersLayer = visibleLayers.dischargersLayer;
      }

      // set the visible layers if something changed
      if (JSON.stringify(visibleLayers) !== JSON.stringify(layers)) {
        setVisibleLayers(layers);
      }
    },
    [
      cipSummary,
      monitoringDisplayed,
      monitoringLocations,
      monitoringLocationsLayer,
      permittedDischargers,
      setVisibleLayers,
      usgsStreamgages,
      usgsStreamgagesDisplayed,
      usgsStreamgagesLayer,
      visibleLayers,
    ],
  );

  // update visible layers based on webservice statuses.
  useEffect(() => {
    updateVisibleLayers({ useCurrentValue: true });
  }, [
    cipSummary,
    monitoringLocations,
    permittedDischargers,
    updateVisibleLayers,
    usgsStreamgages,
    visibleLayers,
  ]);

  return (
    <div css={containerStyles}>
      <div css={keyMetricsStyles}>
        <div css={keyMetricStyles}>
          {usgsStreamgages.status === 'idle' ||
          usgsStreamgages.status === 'pending' ? (
            <LoadingSpinner />
          ) : (
            <>
              <span css={keyMetricNumberStyles}>
                {usgsStreamgages.status === 'failure'
                  ? 'N/A'
                  : `${usgsStreamgages.data.value?.length}`}
              </span>
              <p css={keyMetricLabelStyles}>Current Water Conditions</p>
              <div css={switchContainerStyles}>
                <Switch
                  checked={
                    Boolean(usgsStreamgages.data.value?.length) &&
                    usgsStreamgagesDisplayed
                  }
                  onChange={(_checked) => {
                    if (!usgsStreamgagesLayer) return;

                    setUsgsStreamgagesDisplayed(!usgsStreamgagesDisplayed);

                    const newVisibleLayers = {
                      ...visibleLayers,
                      usgsStreamgagesLayer: !usgsStreamgagesDisplayed,
                    };
                    setVisibleLayers(newVisibleLayers);
                  }}
                  disabled={!Boolean(usgsStreamgages.data.value?.length)}
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
              <p css={keyMetricLabelStyles}>Past Water Conditions</p>
              <div css={switchContainerStyles}>
                <Switch
                  checked={
                    Boolean(monitoringLocations.data.features?.length) &&
                    monitoringDisplayed
                  }
                  onChange={(_checked) => {
                    if (!monitoringLocationsLayer) return;

                    const newMonitoringDisplayed = !monitoringDisplayed;
                    setMonitoringDisplayed(newMonitoringDisplayed);

                    const newVisibleLayers = {
                      ...visibleLayers,
                      monitoringLocationsLayer: newMonitoringDisplayed,
                    };
                    setVisibleLayers(newVisibleLayers);
                  }}
                  disabled={!Boolean(monitoringLocations.data.features?.length)}
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
            <Tab>Past Water Conditions</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <p>
                Click on each monitoring location on the map or in the list
                below to find out about current water conditions. Water
                conditions are measured in real-time using water quality sensors
                deployed at each location.
              </p>

              <SensorsTab
                usgsStreamgagesDisplayed={usgsStreamgagesDisplayed}
                setUsgsStreamgagesDisplayed={setUsgsStreamgagesDisplayed}
              />
            </TabPanel>
            <TabPanel>
              <p>
                Click on each monitoring location on the map or in the list
                below to find out what was monitored at each location, as well
                as the number of samples and measurements taken. These locations
                may have monitoring data available from as recently as last
                week, to multiple decades old, or anywhere in between, depending
                on the location.
              </p>
              <p>
                <a
                  rel="noopener noreferrer"
                  target="_blank"
                  href="https://www.waterqualitydata.us/portal_userguide/"
                >
                  <i
                    css={iconStyles}
                    className="fas fa-book-open"
                    aria-hidden="true"
                  />
                  Water Quality Portal User Guide
                </a>
                &nbsp;&nbsp;
                <small css={modifiedDisclaimerStyles}>
                  (opens new browser tab)
                </small>
              </p>

              <MonitoringTab
                monitoringDisplayed={monitoringDisplayed}
                setMonitoringDisplayed={setMonitoringDisplayed}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}

function SensorsTab({ usgsStreamgagesDisplayed, setUsgsStreamgagesDisplayed }) {
  const { usgsStreamgages, usgsPrecipitation, usgsDailyAverages } =
    useFetchedDataState();

  const services = useServicesContext();

  const { watershed } = useContext(LocationSearchContext);

  const normalizedUsgsStreamgages = useStreamgageData(
    usgsStreamgages,
    usgsPrecipitation,
    usgsDailyAverages,
  );

  const [sensorsSortedBy, setSensorsSortedBy] = useState('locationName');

  const sortedSensors = [...normalizedUsgsStreamgages].sort((a, b) => {
    if (sensorsSortedBy === 'siteId') {
      return a.siteId.localeCompare(b.siteId);
    }

    return a[sensorsSortedBy].localeCompare(b[sensorsSortedBy]);
  });

  if (usgsStreamgages.status === 'idle' || usgsStreamgages.status === 'pending')
    return <LoadingSpinner />;

  if (usgsStreamgages.status === 'failure') {
    return (
      <div css={modifiedErrorBoxStyles}>
        <p>{monitoringError}</p>
      </div>
    );
  }

  if (usgsStreamgages.status === 'success') {
    return (
      <AccordionList
        title={
          <>
            There {normalizedUsgsStreamgages.length === 1 ? 'is' : 'are'}{' '}
            <strong>{normalizedUsgsStreamgages.length}</strong>{' '}
            {normalizedUsgsStreamgages.length === 1 ? 'location' : 'locations'}{' '}
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
            label: 'Water Type',
            value: 'locationType',
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
              title={<strong>{item.locationName || 'Unknown'}</strong>}
              subTitle={
                <>
                  <em>Organization Name:</em>&nbsp;&nbsp;
                  {item.orgName}
                  <br />
                  <em>Water Type:</em>&nbsp;&nbsp;
                  {item.locationType}
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
        })}
      </AccordionList>
    );
  }
}

function MonitoringTab({ setMonitoringDisplayed }) {
  const services = useServicesContext();

  const {
    huc12,
    monitoringGroups,
    monitoringLocations,
    monitoringLocationsLayer,
    setMonitoringGroups,
    setTimeRange,
    watershed,
  } = useContext(LocationSearchContext);

  const [rangeEnabled, setRangeEnabled] = useState(false);
  const [yearsRange, setYearsRange] = useState([0, 0]);
  useEffect(() => {
    setTimeRange([...yearsRange]);
  }, [setTimeRange, yearsRange]);

  const [{ minYear, maxYear, annualData }, resetWorkerData] =
    usePeriodOfRecordData(huc12, 'huc12');

  const [displayedMonitoringLocations, setDisplayedMonitoringLocations] =
    useState([]);

  const [allToggled, setAllToggled] = useState(true);

  const [charGroupFilters, setCharGroupFilters] = useState('');

  const [totalDisplayedLocations, setTotalDisplayedLocations] = useState(0);

  const [totalDisplayedMeasurements, setTotalDisplayedMeasurements] =
    useState(0);

  const [totalDisplayedSamples, setTotalDisplayedSamples] = useState(0);

  const [sortBy, setSortBy] = useState('locationName');

  // create the filter string for download links based on active toggles
  const buildFilter = useCallback(
    (groups, displayedLocations) => {
      let filter = '';

      const selectedCount = Object.keys(groups).filter((label) => {
        return label !== 'All' && groups[label].toggled;
      }).length;

      const groupsCount = Object.values(groups).filter(
        (group) => group.label !== 'All',
      ).length;

      if (selectedCount !== groupsCount) {
        const groupNames = Array.from(
          new Set(
            displayedLocations.reduce(
              (a, b) => a.concat(Object.keys(b.stationTotalsByGroup)),
              [],
            ),
          ),
        );
        filter +=
          '&characteristicType=' + groupNames.join('&characteristicType=');
      }

      if (rangeEnabled) {
        filter += `&startDateLo=01-01-${yearsRange[0]}&startDateHi=12-31-${yearsRange[1]}`;
      }

      setCharGroupFilters(filter);
    },
    [rangeEnabled, setCharGroupFilters, yearsRange],
  );

  const filterStation = useCallback((station, timeframe) => {
    const stationRecords = station.stationDataByYear;
    const result = {
      ...station,
      stationTotalMeasurements: 0,
      stationTotalSamples: 0,
      stationTotalsByGroup: {},
      stationTotalsByLabel: {},
    };
    characteristicGroupMappings.forEach((mapping) => {
      result.stationTotalsByLabel[mapping.label] = 0;
    });
    for (const year in stationRecords) {
      if (parseInt(year) < timeframe[0]) continue;
      if (parseInt(year) > timeframe[1]) return result;
      result.stationTotalMeasurements +=
        stationRecords[year].stationTotalMeasurements;
      result.stationTotalSamples += stationRecords[year].stationTotalSamples;
      Object.entries(stationRecords[year].stationTotalsByGroup).forEach(
        ([key, value]) => {
          key in result.stationTotalsByGroup
            ? (result.stationTotalsByGroup[key] += value)
            : (result.stationTotalsByGroup[key] = value);
        },
      );
      Object.entries(stationRecords[year].stationTotalsByLabel).forEach(
        ([key, value]) => (result.stationTotalsByLabel[key] += value),
      );
    }
    return result;
  }, []);

  const drawMap = useCallback(
    (groups, timeframe) => {
      if (!monitoringLocationsLayer) return;

      let tempDisplayedMonitoringLocations = [];

      const toggledGroups = Object.keys(groups)
        .filter((groupLabel) => groupLabel !== 'All')
        .filter((groupLabel) => groups[groupLabel].toggled === true);

      groups['All'].stations.forEach((station) => {
        const hasToggledData = toggledGroups.some((group) => {
          return station.stationTotalsByLabel[group] > 0;
        });
        if (hasToggledData) {
          if (rangeEnabled) {
            const filteredStation = filterStation(station, timeframe);
            // MILL CREEK WWTP 002 OUTFALL TO OHIO R.
            /* if (station.uniqueId === '21OHIO_WQX-Q01E06-STORET-21OHIO_WQX') {
              console.log(filteredStation);
            } */
            if (filteredStation.stationTotalMeasurements > 0) {
              tempDisplayedMonitoringLocations.push(filteredStation);
            }
          } else {
            tempDisplayedMonitoringLocations.push(station);
          }
        }
      });

      // generate a list of location ids
      const locationIds = [];
      tempDisplayedMonitoringLocations.forEach((station) => {
        locationIds.push(station.uniqueId);
      });

      // update the filters on the layer
      if (
        tempDisplayedMonitoringLocations.length ===
        groups['All'].stations.length
      ) {
        monitoringLocationsLayer.definitionExpression = '';
      } else if (locationIds.length === 0) {
        monitoringLocationsLayer.definitionExpression = '1=0';
      } else {
        monitoringLocationsLayer.definitionExpression = `uniqueId IN ('${locationIds.join(
          "','",
        )}')`;
      }

      if (tempDisplayedMonitoringLocations.length === 0) {
        setDisplayedMonitoringLocations([]);
        return;
      }

      setDisplayedMonitoringLocations(tempDisplayedMonitoringLocations);
    },
    [filterStation, monitoringLocationsLayer, rangeEnabled],
  );

  const addAnnualData = useCallback(async () => {
    if (!monitoringLocationsLayer || !monitoringGroups) return;

    const updatedMonitoringGroups = { ...monitoringGroups };
    for (const label in updatedMonitoringGroups) {
      for (const station of updatedMonitoringGroups[label].stations) {
        const id = station.uniqueId;
        if (id in annualData) {
          station.stationDataByYear = annualData[id];
        }
      }
    }
    setMonitoringGroups(updatedMonitoringGroups);
    setRangeEnabled(true);
    setYearsRange([minYear, maxYear]);
    drawMap(updatedMonitoringGroups, [minYear, maxYear]);
  }, [
    maxYear,
    minYear,
    monitoringGroups,
    monitoringLocationsLayer,
    annualData,
    drawMap,
    setMonitoringGroups,
    setYearsRange,
  ]);

  useEffect(() => {
    if (Object.keys(annualData).length === 0) return;
    if (rangeEnabled) return;
    addAnnualData();
  }, [addAnnualData, annualData, rangeEnabled]);

  const handleSliderChange = useCallback(
    (range) => {
      setYearsRange([...range]);
      drawMap(monitoringGroups, range);
    },
    [drawMap, monitoringGroups, setYearsRange],
  );

  useEffect(() => {
    if (monitoringGroups && displayedMonitoringLocations.length) {
      let newTotalLocations = 0;
      let newTotalSamples = 0;
      let newTotalMeasurements = 0;

      // update the watershed total measurements and samples counts
      displayedMonitoringLocations.forEach((station) => {
        newTotalSamples += station.stationTotalSamples;
        newTotalLocations++;
        Object.keys(monitoringGroups)
          .filter((group) => group !== 'All')
          .forEach((group) => {
            if (monitoringGroups[group].toggled) {
              newTotalMeasurements += station.stationTotalsByLabel[group];
            }
          });
      });

      setTotalDisplayedLocations(newTotalLocations);
      setTotalDisplayedMeasurements(newTotalMeasurements);
      setTotalDisplayedSamples(newTotalSamples);
      buildFilter(monitoringGroups, displayedMonitoringLocations);
    }
  }, [buildFilter, displayedMonitoringLocations, monitoringGroups]);

  const toggleAll = useCallback(() => {
    for (const label in monitoringGroups) {
      monitoringGroups[label].toggled = !allToggled;
    }
    monitoringLocationsLayer.visible = !allToggled;
    setMonitoringDisplayed(!allToggled);
    setAllToggled((prev) => !prev);
    setMonitoringGroups({ ...monitoringGroups });
    drawMap(monitoringGroups, yearsRange);
  }, [
    allToggled,
    drawMap,
    monitoringGroups,
    monitoringLocationsLayer,
    setMonitoringDisplayed,
    setMonitoringGroups,
    yearsRange,
  ]);

  const toggleRow = useCallback(
    (groupLabel) => {
      monitoringLocationsLayer.visible = true;
      monitoringGroups[groupLabel].toggled =
        !monitoringGroups[groupLabel].toggled;
      setMonitoringGroups({ ...monitoringGroups });

      let allOthersToggled = true;
      for (let key in monitoringGroups) {
        if (!monitoringGroups[key].toggled) allOthersToggled = false;
      }
      setAllToggled(allOthersToggled);

      // only check the toggles that are on the screen (i.e., ignore Bacterial, Sediments, etc.)
      const someToggled = Object.keys(monitoringGroups)
        .filter((label) => label !== 'All')
        .some((key) => monitoringGroups[key].toggled);
      setMonitoringDisplayed(someToggled);
      drawMap(monitoringGroups, yearsRange);
    },
    [
      drawMap,
      monitoringGroups,
      monitoringLocationsLayer,
      setMonitoringDisplayed,
      setMonitoringGroups,
      yearsRange,
    ],
  );

  const [dataInitialized, setDataInitialized] = useState(false);

  // Reset dataInitialized if the user switches locations (i.e. monitoringGroups
  // changes to null)
  useEffect(() => {
    if (monitoringGroups) return;

    setDataInitialized(false);
    setRangeEnabled(false);
    resetWorkerData();
  }, [monitoringGroups, resetWorkerData]);

  // Renders the monitoring locations on the map
  // and displays them in the Accordion list and toggles
  useEffect(() => {
    if (!monitoringGroups) return;
    if (!dataInitialized) {
      setDataInitialized(true);
      drawMap(monitoringGroups, yearsRange);
    }
  }, [dataInitialized, drawMap, monitoringGroups, yearsRange]);

  useEffect(() => {
    // update total measurements and samples counts
    // after `monitoringGroups` is initialized
    if (dataInitialized) return;
    let totalLocations = 0;
    let totalMeasurements = 0;
    let totalSamples = 0;
    if (monitoringGroups) {
      monitoringGroups['All'].stations.forEach((station) => {
        totalLocations++;
        totalMeasurements += station.stationTotalMeasurements;
        totalSamples += station.stationTotalSamples;
      });
      setTotalDisplayedLocations(totalLocations);
      setTotalDisplayedMeasurements(totalMeasurements);
      setTotalDisplayedSamples(totalSamples);
    }
  }, [dataInitialized, monitoringGroups]);

  const downloadUrl =
    `${services.data.waterQualityPortal.resultSearch}zip=no&huc=` +
    `${huc12}` +
    `${charGroupFilters}`;

  const portalUrl =
    `${services.data.waterQualityPortal.userInterface}#huc=${huc12}` +
    `${charGroupFilters}&mimeType=xlsx&dataProfile=resultPhysChem` +
    `&providers=NWIS&providers=STEWARDS&providers=STORET`;

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

  sortedMonitoringLocations.forEach((location) => {
    location.timeframe = [...yearsRange];
  });
  const totalLocations = monitoringGroups?.['All'].stations.length;
  const displayLocations = sortedMonitoringLocations.length.toLocaleString();

  const [expandedRows, setExpandedRows] = useState([]);

  if (monitoringLocations.status === 'fetching') return <LoadingSpinner />;

  if (monitoringLocations.status === 'failure') {
    return (
      <div css={modifiedErrorBoxStyles}>
        <p>{monitoringError}</p>
      </div>
    );
  }

  if (monitoringLocations.status === 'success') {
    return (
      <>
        {totalLocations === 0 && (
          <p css={centeredTextStyles}>
            There are no monitoring sample locations in the {watershed}{' '}
            watershed.
          </p>
        )}

        {totalLocations > 0 && (
          <>
            <div css={sliderHeaderStyles}>Date Range</div>
            <div css={sliderContainerStyles}>
              {!rangeEnabled ? (
                <LoadingSpinner />
              ) : (
                <>
                  <span>{yearsRange[0]}</span>
                  <div css={sliderStyles}>
                    <DateSlider
                      bounds={[minYear, maxYear]}
                      disabled={Object.keys(annualData).length === 0}
                      range={yearsRange}
                      onChange={handleSliderChange}
                    />
                  </div>
                  <span>{yearsRange[1]}</span>
                </>
              )}
            </div>
            <table
              css={toggleTableStyles}
              aria-label="Monitoring Location Summary"
              className="table"
            >
              <thead>
                <tr>
                  <th>
                    <div css={toggleStyles}>
                      <Switch
                        checked={allToggled}
                        onChange={(_ev) => toggleAll()}
                        ariaLabel="Toggle all monitoring locations"
                      />
                      <span>All Monitoring Locations</span>
                    </div>
                  </th>
                  <th>Location Count</th>
                  <th>Sample Count</th>
                  <th>Measurement Count</th>
                </tr>
              </thead>

              <tbody>
                {Object.values(monitoringGroups)
                  .filter((group) => group.label !== 'All')
                  .map((group) => {
                    // remove duplicates caused by a single monitoring station having multiple overlapping groupNames
                    // like 'Inorganics, Major, Metals' and 'Inorganics, Minor, Metals'
                    const uniqueStations = [...new Set(group.stations)];

                    // get the number of measurements for this group type
                    let sampleCount = 0;
                    let measurementCount = 0;
                    uniqueStations.forEach((station) => {
                      let curStation = station;
                      if (rangeEnabled)
                        curStation = filterStation(station, yearsRange);
                      sampleCount += curStation.stationTotalSamples;
                      measurementCount +=
                        curStation.stationTotalsByLabel[group.label];
                    });

                    return (
                      <tr key={group.label}>
                        <td>
                          <div css={toggleStyles}>
                            <Switch
                              checked={group.toggled}
                              onChange={(_ev) => toggleRow(group.label)}
                              ariaLabel={`Toggle ${group.label}`}
                            />
                            <span>{group.label}</span>
                          </div>
                        </td>
                        <td>{uniqueStations.length.toLocaleString()}</td>
                        <td>{sampleCount.toLocaleString()}</td>
                        <td>{measurementCount.toLocaleString()}</td>
                      </tr>
                    );
                  })
                  .sort((a, b) => {
                    // sort the switches with Other at the end
                    if (a.key === 'Other') return 1;
                    if (b.key === 'Other') return -1;
                    return a.key > b.key ? 1 : -1;
                  })}

                <tr css={totalRowStyles}>
                  <td>
                    <div css={toggleStyles}>
                      <div style={{ width: '38px' }} />
                      <span>Totals</span>
                    </div>
                  </td>
                  <td>{Number(totalDisplayedLocations).toLocaleString()}</td>
                  <td>{Number(totalDisplayedSamples).toLocaleString()}</td>
                  <td>{Number(totalDisplayedMeasurements).toLocaleString()}</td>
                </tr>
              </tbody>

              <tfoot css={tableFooterStyles}>
                <tr>
                  <td colSpan="2">
                    <a
                      href={portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-cy="portal"
                      style={{ fontWeight: 'normal' }}
                    >
                      <i
                        css={iconStyles}
                        className="fas fa-filter"
                        aria-hidden="true"
                      />
                      Advanced Filtering
                    </a>
                    &nbsp;&nbsp;
                    <small css={modifiedDisclaimerStyles}>
                      (opens new browser tab)
                    </small>
                  </td>

                  <td colSpan="2">
                    <span>Download All Selected Data</span>
                    <span>
                      &nbsp;&nbsp;
                      {displayLocations > 0 ? (
                        <a href={`${downloadUrl}&mimeType=xlsx`}>
                          <i className="fas fa-file-excel" aria-hidden="true" />
                        </a>
                      ) : (
                        <i
                          className="fas fa-file-excel"
                          aria-hidden="true"
                          style={{ color: '#ccc' }}
                        />
                      )}
                      &nbsp;&nbsp;
                      {displayLocations > 0 ? (
                        <a href={`${downloadUrl}&mimeType=csv`}>
                          <i className="fas fa-file-csv" aria-hidden="true" />
                        </a>
                      ) : (
                        <i
                          className="fas fa-file-csv"
                          aria-hidden="true"
                          style={{ color: '#ccc' }}
                        />
                      )}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>

            <AccordionList
              title={
                <span data-testid="monitoring-accordion-title">
                  <strong>{displayLocations}</strong> of{' '}
                  <strong>{totalLocations.toLocaleString()}</strong> water
                  monitoring sample locations in the <em>{watershed}</em>{' '}
                  watershed.
                </span>
              }
              onSortChange={({ value }) => setSortBy(value)}
              sortOptions={[
                {
                  label: 'Monitoring Location Name',
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
                {
                  label: 'Monitoring Measurements',
                  value: 'stationTotalMeasurements',
                },
              ]}
            >
              <VirtualizedList
                items={sortedMonitoringLocations}
                expandedRowsSetter={setExpandedRows}
                renderer={({ index, resizeCell, allExpanded }) => {
                  const item = sortedMonitoringLocations[index];

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
                          <em>Organization Name:</em>&nbsp;&nbsp;
                          {item.orgName}
                          <br />
                          <em>Water Type:</em>&nbsp;&nbsp;
                          {item.locationType}
                          <br />
                          <em>Monitoring Measurements:</em>&nbsp;&nbsp;
                          {item.stationTotalMeasurements}
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
                        <WaterbodyInfo
                          type="Past Water Conditions"
                          feature={feature}
                          services={services}
                          // timeframe={[yearsRange[0], yearsRange[1]]}
                        />
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

function DateSlider({ bounds, disabled, range, onChange }) {
  const max = new Date().getFullYear();
  let min = bounds.length ? bounds[0] : max;

  useEffect(() => {
    onChange([min, max]);
  }, [min, max, onChange]);

  return (
    <TooltipSlider
      range
      allowCross={false}
      defaultValue={range}
      disabled={disabled}
      handleStyle={{ borderColor: '#0b89f4' }}
      max={max}
      min={min}
      onChange={(newRange) => {
        onChange(newRange);
      }}
      step={1}
      trackStyle={{ backgroundColor: '#0b89f4' }}
      value={range}
    />
  );
}

export default function MonitoringContainer() {
  return (
    <TabErrorBoundary tabName="Monitoring">
      <Monitoring />
    </TabErrorBoundary>
  );
}
