// @flow

import { useCallback, useContext, useEffect, useRef, useState } from 'react';
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
 * Styles
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
  align-items: flex-end;
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  padding-bottom: 10px;
  width: 100%;
`;

const sliderHeaderStyles = css`
  background-color: #f0f6f9;
  border-bottom: 2px solid #dee2e6;
  border-top: 1px solid #dee2e6;
  margin: auto;
  font-weight: bold;
  padding: 0.5rem 3.5rem;
  text-align: center;
  width: 100%;
`;

const sliderStyles = css`
  align-items: end;
  display: inline-flex;
  height: 3.5rem;
  padding-bottom: 3px;
  width: 60%;
  .rc-tooltip-arrow {
    display: none !important;
  }
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

const initialWorkerData = {
  minYear: null,
  maxYear: null,
  annualData: {},
};

// Passes parsing of historical CSV data to a Web Worker,
// which itself utilizes an external service
function usePeriodOfRecordData(filter, param) {
  const services = useServicesContext();
  const [url, setUrl] = useState(null);
  const [workerData, setWorkerData] = useState(initialWorkerData);

  // Clear the data on change of location
  const resetWorkerData = useCallback(() => {
    setWorkerData(initialWorkerData);
  }, [setWorkerData]);

  // Craft the URL
  useEffect(() => {
    if (param !== 'huc12' && param !== 'siteId') return;
    if (!filter) return;

    let recordUrl = null;
    if (services.status === 'success') {
      recordUrl =
        `${services.data.waterQualityPortal.monitoringLocation}search?` +
        `&mimeType=csv&dataProfile=periodOfRecord&summaryYears=all`;
      recordUrl += param === 'huc12' ? `&huc=${filter}` : `&siteid=${filter}`;
      setUrl(recordUrl);
    }
  }, [filter, param, services.data, services.status]);

  // Create the worker and assign it a job,
  // then listen for a response
  useEffect(() => {
    if (!filter || !url) return;
    if (!window.Worker) {
      throw new Error("Your browser doesn't support web workers");
    }
    const origin = window.location.origin;
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
    return function cleanup() {
      recordsWorker.terminate();
    };
  }, [filter, url]);

  return [workerData, resetWorkerData];
}

// Dynamically filter the displayed locations
function filterStation(station, timeframe) {
  if (!timeframe) return station;
  const stationRecords = station.stationDataByYear;
  const result = {
    ...station,
    stationTotalMeasurements: 0,
    // TODO: investigate discrepancy between periodOfRecord
    // sample counts and summary counts
    stationTotalsByGroup: {},
    stationTotalsByLabel: {},
    timeframe: [...timeframe],
  };
  characteristicGroupMappings.forEach((mapping) => {
    result.stationTotalsByLabel[mapping.label] = 0;
  });
  for (const year in stationRecords) {
    if (parseInt(year) < timeframe[0]) continue;
    if (parseInt(year) > timeframe[1]) return result;
    result.stationTotalMeasurements +=
      stationRecords[year].stationTotalMeasurements;
    const resultGroups = result.stationTotalsByGroup;
    Object.entries(stationRecords[year].stationTotalsByGroup).forEach(
      ([group, count]) => {
        resultGroups[group] = !resultGroups[group]
          ? count
          : resultGroups[group] + count;
      },
    );
    Object.entries(stationRecords[year].stationTotalsByLabel).forEach(
      ([key, value]) => (result.stationTotalsByLabel[key] += value),
    );
  }

  return result;
}

function filterLocations(groups, timeframe) {
  let toggledLocations = [];
  let allLocations = [];

  if (groups) {
    const toggledGroups = Object.keys(groups)
      .filter((groupLabel) => groupLabel !== 'All')
      .filter((groupLabel) => groups[groupLabel].toggled === true);

    groups['All'].stations.forEach((station) => {
      const curStation = filterStation(station, timeframe);
      const hasToggledData = toggledGroups.some((group) => {
        return curStation.stationTotalsByLabel[group] > 0;
      });
      if (hasToggledData) toggledLocations.push(curStation);
      allLocations.push(curStation);
    });
  }

  return { toggledLocations, allLocations };
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
  useEffect(() => {
    if (!monitoringLocationsLayer) return;
    monitoringLocationsLayer.visible = monitoringDisplayed;
  }, [monitoringLocationsLayer, monitoringDisplayed]);

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
  // exits full screen.
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

  // Added to avoid the slider tooltip appearing
  // on the Current Water Conditions tab
  const [tabIndex, setTabIndex] = useState(0);

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
        <Tabs onChange={(index) => setTabIndex(index)}>
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
                tabSelected={tabIndex === 0}
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

              <MonitoringTab
                monitoringDisplayed={monitoringDisplayed}
                setMonitoringDisplayed={setMonitoringDisplayed}
                tabSelected={tabIndex === 1}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}

function SensorsTab() {
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

function MonitoringTab({ setMonitoringDisplayed, tabSelected }) {
  const services = useServicesContext();

  const {
    huc12,
    monitoringGroups,
    monitoringLocations,
    monitoringLocationsLayer,
    setMonitoringFeatureUpdates,
    setMonitoringGroups,
    watershed,
  } = useContext(LocationSearchContext);

  const updateFeatures = useCallback(
    (locations) => {
      const stationUpdates = {};
      locations.forEach((location) => {
        stationUpdates[location.uniqueId] = {
          stationTotalMeasurements: location.stationTotalMeasurements,
          stationTotalsByGroup: JSON.stringify(location.stationTotalsByGroup),
          timeframe: JSON.stringify(location.timeframe),
        };
      });
      setMonitoringFeatureUpdates(stationUpdates);
    },
    [setMonitoringFeatureUpdates],
  );

  useEffect(() => {
    return function cleanup() {
      setMonitoringFeatureUpdates(null);
    };
  }, [setMonitoringFeatureUpdates]);

  // The data returned by the worker
  const [{ minYear, maxYear, annualData }, resetWorkerData] =
    usePeriodOfRecordData(huc12, 'huc12');
  // The currently selected date range
  const [yearsRange, setYearsRange] = useState(null);
  useEffect(() => {
    if (monitoringGroups) return;
    // Reset data if the user switches locations
    resetWorkerData();
    setYearsRange(null);
  }, [monitoringGroups, resetWorkerData]);

  const [charGroupFilters, setCharGroupFilters] = useState('');
  // create the filter string for download links based on active toggles
  const buildFilter = useCallback(
    (groups) => {
      let filter = '';

      const selectedNames = Object.keys(groups).filter((label) => {
        return label !== 'All' && groups[label].toggled;
      });

      const groupsCount = Object.values(groups).filter(
        (group) => group.label !== 'All',
      ).length;

      if (selectedNames.length !== groupsCount) {
        for (const name of selectedNames) {
          filter +=
            '&characteristicType=' +
            groups[name].characteristicGroups.join('&characteristicType=');
        }
      }

      if (yearsRange) {
        filter += `&startDateLo=01-01-${yearsRange[0]}&startDateHi=12-31-${yearsRange[1]}`;
      }

      setCharGroupFilters(filter);
    },
    [setCharGroupFilters, yearsRange],
  );

  const [displayedLocations, setDisplayedLocations] = useState([]);
  // All stations in the current time range
  const [currentLocations, setCurrentLocations] = useState([]);
  useEffect(() => {
    if (!monitoringLocationsLayer?.visible) return;

    const { toggledLocations, allLocations } = filterLocations(
      monitoringGroups,
      yearsRange,
    );

    // Adds filtered data that's relevent to map popups
    if (yearsRange) {
      updateFeatures(toggledLocations);
    }

    // generate a list of location ids
    const locationIds = [];
    toggledLocations.forEach((station) => {
      locationIds.push(station.uniqueId);
    });

    // update the filters on the layer
    if (toggledLocations.length === monitoringGroups?.['All'].stations.length) {
      monitoringLocationsLayer.definitionExpression = '';
    } else if (locationIds.length === 0) {
      monitoringLocationsLayer.definitionExpression = '1=0';
    } else {
      monitoringLocationsLayer.definitionExpression = `uniqueId IN ('${locationIds.join(
        "','",
      )}')`;
    }

    setCurrentLocations(allLocations);
    setDisplayedLocations(toggledLocations);
  }, [monitoringGroups, monitoringLocationsLayer, updateFeatures, yearsRange]);

  // Add the stations historical data to the `stationDataByYear` property,
  // then initializes the date slider
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
    setYearsRange([minYear, maxYear]);
  }, [
    maxYear,
    minYear,
    monitoringGroups,
    monitoringLocationsLayer,
    annualData,
    setMonitoringGroups,
    setYearsRange,
  ]);

  const [totalDisplayedLocations, setTotalDisplayedLocations] = useState(0);
  const [totalDisplayedMeasurements, setTotalDisplayedMeasurements] =
    useState(0);
  const [totalDisplayedSamples, setTotalDisplayedSamples] = useState(0);
  useEffect(() => {
    if (Object.keys(annualData).length === 0) return;
    if (yearsRange) return;
    addAnnualData();
  }, [addAnnualData, annualData, yearsRange]);

  // Updates total counts after displayed locations are filtered
  useEffect(() => {
    if (monitoringGroups) {
      let newTotalLocations = 0;
      let newTotalSamples = 0;
      let newTotalMeasurements = 0;

      // update the watershed total measurements and samples counts
      displayedLocations.forEach((station) => {
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
      buildFilter(monitoringGroups);
    }
  }, [buildFilter, displayedLocations, monitoringGroups]);

  const handleSliderChange = useCallback(
    (range) => {
      setYearsRange([...range]);
    },
    [setYearsRange],
  );

  const [allToggled, setAllToggled] = useState(true);
  const toggleAll = useCallback(() => {
    const updatedGroups = { ...monitoringGroups };
    for (const label in updatedGroups) {
      updatedGroups[label].toggled = !allToggled;
    }
    setMonitoringDisplayed(!allToggled);
    setAllToggled((prev) => !prev);
    setMonitoringGroups(updatedGroups);
  }, [
    allToggled,
    monitoringGroups,
    setMonitoringDisplayed,
    setMonitoringGroups,
  ]);

  const toggleRow = useCallback(
    (groupLabel) => {
      const updatedGroups = { ...monitoringGroups };
      updatedGroups[groupLabel].toggled = !updatedGroups[groupLabel].toggled;
      setMonitoringGroups(updatedGroups);

      let allOthersToggled = true;
      for (let key in updatedGroups) {
        if (!updatedGroups[key].toggled) allOthersToggled = false;
      }
      setAllToggled(allOthersToggled);

      // only check the toggles that are on the screen (i.e., ignore Bacterial, Sediments, etc.)
      const someToggled = Object.keys(updatedGroups)
        .filter((label) => label !== 'All')
        .some((key) => updatedGroups[key].toggled);
      setMonitoringDisplayed(someToggled);
    },
    [monitoringGroups, setMonitoringDisplayed, setMonitoringGroups],
  );

  const downloadUrl =
    `${services.data.waterQualityPortal.resultSearch}zip=no&huc=` +
    `${huc12}` +
    `${charGroupFilters}`;

  const portalUrl =
    `${services.data.waterQualityPortal.userInterface}#huc=${huc12}` +
    `${charGroupFilters}&mimeType=xlsx&dataProfile=resultPhysChem` +
    `&providers=NWIS&providers=STEWARDS&providers=STORET`;

  const [sortBy, setSortBy] = useState('locationName');
  const sortedMonitoringLocations = displayedLocations
    ? displayedLocations.sort((a, b) => {
        if (sortBy === 'stationTotalMeasurements') {
          return b.stationTotalMeasurements - a.stationTotalMeasurements;
        }

        if (sortBy === 'siteId') {
          return a.siteId.localeCompare(b.siteId);
        }

        return a[sortBy].localeCompare(b[sortBy]);
      })
    : [];

  const totalLocationsCount = monitoringGroups?.['All'].stations.length;
  const displayedLocationsCount =
    sortedMonitoringLocations.length.toLocaleString();

  const [expandedRows, setExpandedRows] = useState([]);

  // Used to position the slider tooltip in the slider container:
  // it defaults to attaching to the document body
  const sliderRef = useRef();

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
        {totalLocationsCount === 0 && (
          <p css={centeredTextStyles}>
            There are no monitoring sample locations in the {watershed}{' '}
            watershed.
          </p>
        )}

        {totalLocationsCount > 0 && (
          <>
            <div css={sliderHeaderStyles}>
              Date range for the {watershed} watershed{' '}
            </div>
            <div css={sliderContainerStyles}>
              {!yearsRange ? (
                <LoadingSpinner />
              ) : (
                <>
                  <span>{minYear}</span>
                  <div ref={sliderRef} css={sliderStyles}>
                    <DateSlider
                      bounds={[minYear, maxYear]}
                      containerRef={sliderRef}
                      disabled={Object.keys(annualData).length === 0}
                      range={yearsRange}
                      onChange={handleSliderChange}
                      tooltipVisible={tabSelected}
                    />
                  </div>
                  <span>{maxYear}</span>
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
                    // get the number of measurements for this group type
                    let sampleCount = 0;
                    let measurementCount = 0;
                    let locationCount = 0;
                    currentLocations.forEach((station) => {
                      if (station.stationTotalsByLabel[group.label] > 0) {
                        sampleCount += station.stationTotalSamples;
                        measurementCount +=
                          station.stationTotalsByLabel[group.label];
                        locationCount++;
                      }
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
                        <td>{locationCount.toLocaleString()}</td>
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
                      {displayedLocationsCount > 0 ? (
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
                      {displayedLocationsCount > 0 ? (
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
                yearsRange ? (
                  <span data-testid="monitoring-accordion-title">
                    <strong>{displayedLocationsCount.toLocaleString()}</strong>{' '}
                    of <strong>{totalLocationsCount.toLocaleString()}</strong>{' '}
                    water monitoring sample locations in the{' '}
                    <em>{watershed}</em> watershed from{' '}
                    <strong>{yearsRange[0]}</strong> to{' '}
                    <strong>{yearsRange[1]}</strong>.
                  </span>
                ) : (
                  <span data-testid="monitoring-accordion-title">
                    <strong>{displayedLocationsCount.toLocaleString()}</strong>{' '}
                    of <strong>{totalLocationsCount.toLocaleString()}</strong>{' '}
                    water monitoring sample locations in the{' '}
                    <em>{watershed}</em> watershed.
                  </span>
                )
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

// Slider component that utilizes annual station data
function DateSlider({
  bounds,
  containerRef,
  disabled,
  range,
  onChange,
  tooltipVisible,
}) {
  const [curRange, setCurRange] = useState(range);

  const tooltipInnerStyles = {
    borderRadius: '10%',
    color: '#444',
    backgroundColor: '#d5e6ee',
    minHeight: 'auto',
    padding: '0.3em',
  };

  const tipProps = {
    align: { offset: [0, 2] },
    getTooltipContainer: () => containerRef.current,
    overlayInnerStyle: tooltipInnerStyles,
    visible: tooltipVisible,
  };

  return (
    <TooltipSlider
      range
      allowCross={false}
      defaultValue={curRange}
      disabled={disabled}
      handleStyle={{ borderColor: '#0b89f4' }}
      max={bounds?.[1]}
      min={bounds?.[0]}
      onAfterChange={(newRange) => {
        onChange(newRange);
      }}
      onChange={(newRange) => {
        setCurRange(newRange);
      }}
      step={1}
      tipProps={tipProps}
      trackStyle={{ backgroundColor: '#0b89f4' }}
      value={curRange}
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
