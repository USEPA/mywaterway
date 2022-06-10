// @flow

import Papa from 'papaparse';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import { css } from 'styled-components/macro';
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
import buildWorker from 'components/shared/workerBuilder';
import recordsJob from 'components/shared/periodOfRecordWorker';
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

/*
 ** Types
 */

type ParseError = {|
  type: string,
  code: string,
  message: string,
  row: number,
|};
type ParseErrors = Array<ParseError>;

type ParsedRecord = {
  Provider: string,
  MonitoringLocationIdentifier: string,
  YearSummarized: number,
  CharacteristicType: string,
  CharacteristicName: string,
  ActivityCount: number,
  ResultCount: number,
  LastResultSubmittedDate: string,
  OrganizationIdentifier: string,
  OrganizationFormalName: string,
  MonitoringLocationName: string,
  MonitoringLocationTypeName: string,
  ResolvedMonitoringLocationTypeName: string,
  HUCEightDigitCode: number,
  MonitoringLocationUrl: string,
  CountyName: string,
  StateName: string,
  MonitoringLocationLatitude: number,
  MonitoringLocationLongitude: number,
};
type ParsedRecords = Array<ParsedRecord>;

type PeriodData =
  | { status: 'idle', data: {} }
  | { status: 'pending', data: {} }
  | { status: 'success', data: ParsedRecords }
  | { status: 'failure', data: ParseErrors };

function fetchParseCsv(url: string) {
  const parsePromise = new Promise((resolve, reject) => {
    Papa.parse(url, {
      complete: (results) => resolve(results),
      download: true,
      dynamicTyping: true,
      error: (err) => reject(err),
      header: true,
      worker: true,
    });
  });
  return parsePromise;
}

function usePeriodOfRecordData(filter: string, param: 'huc12' | 'siteId') {
  if (param !== 'huc12' && param !== 'siteId') {
    throw new Error('Missing parameter for Period of Record service');
  }

  const services = useServicesContext();

  const initialRecordsState: PeriodData = { status: 'idle', data: {} };
  const [records, setRecords] = useState(initialRecordsState);
  const [worker, setWorker] = useState(null);
  const [workerData, setWorkerData] = useState({
    minYear: 0,
    maxYear: 0,
    annualData: {},
  });

  let url =
    `${services.data.waterQualityPortal.monitoringLocation}search?` +
    `&mimeType=csv&dataProfile=periodOfRecord&summaryYears=all`;
  url += param === 'huc12' ? `&huc=${filter}` : `&siteId=${filter}`;

  const fetchJson = useCallback(
    async (url: string) => {
      let results = {};
      try {
        results = await fetchParseCsv(url);
        setRecords({ status: 'success', data: results.data });
      } catch (e) {
        console.error(e);
        setRecords({ status: 'failure', data: results.errors });
      }
    },
    [setRecords],
  );

  useEffect(() => {
    if (!filter || records.status !== 'idle') return;
    setRecords({ status: 'pending', data: {} });
    fetchJson(url);
  }, [records.status, fetchJson, filter, url]);

  useEffect(() => {
    if (worker || records.status !== 'success') return;
    if (!window.Worker) {
      throw new Error("Your browser doesn't support web workers");
    }
    if (records.status === 'success') {
      const recordsWorker = buildWorker(recordsJob);
      setWorker(recordsWorker);
      recordsWorker.postMessage([records.data, characteristicGroupMappings]);
      recordsWorker.onmessage = (message) => {
        if (message.data && typeof message.data === 'string') {
          const parsedData = JSON.parse(message.data);
          parsedData.minYear = parseInt(parsedData.minYear);
          parsedData.maxYear = parseInt(parsedData.maxYear);
          setWorkerData(parsedData);
        }
      };
    }
  }, [filter, records, url, worker, workerData]);

  return workerData;
}

function Monitoring() {
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
      });
    }
  }, [permittedDischargers.data, dischargersLayer]);

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
                  onChange={(checked) => {
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
                  onChange={(checked) => {
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
                Find out about current water conditions at sensor locations.
              </p>

              <SensorsTab
                usgsStreamgagesDisplayed={usgsStreamgagesDisplayed}
                setUsgsStreamgagesDisplayed={setUsgsStreamgagesDisplayed}
              />
            </TabPanel>
            <TabPanel>
              <p>
                View available monitoring sample locations in your local
                watershed or view by category.
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

  const normalizedUsgsStreamgages = useStreamgageData(usgsStreamgages);

  // once streamgages have been normalized, add precipitation data and
  // daily average measurements data (both fetched from the usgs daily values
  // web service) to each streamgage if it exists for that particular location
  useEffect(() => {
    if (!usgsPrecipitation.data.value) return;
    if (!usgsDailyAverages.data?.allParamsMean?.value) return;
    if (!usgsDailyAverages.data?.precipitationSum?.value) return;
    if (normalizedUsgsStreamgages.length === 0) return;

    const streamgageSiteIds = normalizedUsgsStreamgages.map((gage) => {
      return gage.siteId;
    });

    usgsPrecipitation.data.value?.timeSeries.forEach((site) => {
      const siteId = site.sourceInfo.siteCode[0].value;
      const observation = site.values[0].value[0];

      if (streamgageSiteIds.includes(siteId)) {
        const streamgage = normalizedUsgsStreamgages.find((gage) => {
          return gage.siteId === siteId;
        });

        streamgage?.streamgageMeasurements.primary.push({
          parameterCategory: 'primary',
          parameterOrder: 5,
          parameterName: 'Total Daily Rainfall',
          parameterUsgsName: 'Precipitation (USGS Daily Value)',
          parameterCode: '00045',
          measurement: observation.value,
          datetime: new Date(observation.dateTime).toLocaleDateString(),
          dailyAverages: [],
          unitAbbr: 'in',
          unitName: 'inches',
        });
      }
    });

    const usgsDailyTimeSeriesData = [
      ...(usgsDailyAverages.data.allParamsMean.value?.timeSeries || []),
      ...(usgsDailyAverages.data.precipitationSum.value.timeSeries || []),
    ];

    usgsDailyTimeSeriesData.forEach((site) => {
      const siteId = site.sourceInfo.siteCode[0].value;
      const sitesHasObservations = site.values[0].value.length > 0;

      if (streamgageSiteIds.includes(siteId) && sitesHasObservations) {
        const streamgage = normalizedUsgsStreamgages.find((gage) => {
          return gage.siteId === siteId;
        });

        const paramCode = site.variable.variableCode[0].value;
        const observations = site.values[0].value.map(({ value, dateTime }) => {
          let measurement = value;
          // convert measurements recorded in celsius to fahrenheit
          if (['00010', '00020', '85583'].includes(paramCode)) {
            measurement = measurement * (9 / 5) + 32;
          }
          return { measurement, date: new Date(dateTime) };
        });

        // NOTE: 'category' is either 'primary' or 'secondary' – loop over both
        for (const category in streamgage?.streamgageMeasurements) {
          streamgage.streamgageMeasurements[category].forEach((measurement) => {
            if (measurement.parameterCode === paramCode.toString()) {
              measurement.dailyAverages = observations;
            }
          });
        }
      }
    });
  }, [normalizedUsgsStreamgages, usgsPrecipitation, usgsDailyAverages]);

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
    watershed,
  } = useContext(LocationSearchContext);

  const [rangeEnabled, setRangeEnabled] = useState(false);
  const { minYear, maxYear, annualData } = usePeriodOfRecordData(
    huc12,
    'huc12',
  );
  const [annualDataInitialized, setAnnualDataInitialized] = useState(false);
  const addAnnualData = useCallback(async () => {
    if (!monitoringLocationsLayer || !monitoringGroups) return;
    if (annualDataInitialized) return;

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
    setAnnualDataInitialized(true);
    setRangeEnabled(true);
  }, [
    annualDataInitialized,
    monitoringGroups,
    monitoringLocationsLayer,
    annualData,
    setMonitoringGroups,
  ]);

  useEffect(() => {
    if (Object.keys(annualData).length === 0) return;
    if (annualDataInitialized) return;
    addAnnualData();
  }, [addAnnualData, annualData, annualDataInitialized]);

  const [yearsRange, setYearsRange] = useState([0, 0]);

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
    // const stationAnnualData = annualData[station.uniqueId];
    const stationRecords = station.stationDataByYear;
    const result = {
      ...station,
      stationTotalMeasurements: 0,
      stationTotalSamples: 0,
      stationTotalsByGroup: {},
      stationTotalsByLabel: {},
    };
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
        ([key, value]) => {
          key in result.stationTotalsByLabel
            ? (result.stationTotalsByLabel[key] += value)
            : (result.stationTotalsByLabel[key] = value);
        },
      );
    }
    return result;
  }, []);

  const drawMap = useCallback(
    (groups, timeframe) => {
      if (!monitoringLocationsLayer) return;

      // const addedStationUids = [];
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

  const handleSliderChange = useCallback(
    (timeframe) => {
      setYearsRange(timeframe);
      drawMap(monitoringGroups, timeframe);
    },
    [drawMap, monitoringGroups],
  );

  useEffect(() => {
    if (displayedMonitoringLocations.length) {
      // if (monitoringGroups) {
      let newTotalLocations = 0;
      let newTotalSamples = 0;
      let newTotalMeasurements = 0;

      // update the watershed total measurements and samples counts
      displayedMonitoringLocations.forEach((station) => {
        // aggregated sample counts in the historical data are a lot greater
        // than those in the original dataset, so using the original sample
        // counts here for consistency
        const stationIdx = monitoringGroups['All'].stations.findIndex(
          (origStation) => origStation.uniqueId === station.uniqueId,
        );
        newTotalSamples +=
          monitoringGroups['All'].stations[stationIdx].stationTotalSamples;
        newTotalLocations++;
        Object.keys(monitoringGroups)
          .filter((group) => group !== 'All')
          .forEach((group) => {
            if (monitoringGroups[group].toggled) {
              newTotalMeasurements += station.stationTotalsByLabel[group] ?? 0;
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
    (groupLabel: string) => {
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
  }, [monitoringGroups]);

  // Renders the monitoring locations on the map
  // and displays them in the Accordion list and toggles
  useEffect(() => {
    if (!monitoringGroups) return;
    if (!dataInitialized) {
      setDataInitialized(true);
      // setDisplayedMonitoringLocations([...monitoringGroups['All'].stations]);
      // setAllToggled(true);
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
              {!annualDataInitialized ? (
                <LoadingSpinner />
              ) : (
                <>
                  <span>{yearsRange[0]}</span>
                  <div css={sliderStyles}>
                    <DateSlider
                      years={[minYear, maxYear]}
                      disabled={Object.keys(annualData).length === 0}
                      yearsRange={yearsRange}
                      onChange={handleSliderChange}
                    />
                  </div>
                  <span>{yearsRange[1]}</span>
                </>
              )}
            </div>
            <table css={toggleTableStyles} className="table">
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
                      sampleCount += parseInt(station.stationTotalSamples);
                      measurementCount +=
                        station.stationTotalsByLabel[group.label];
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

function DateSlider({ years, disabled, yearsRange, onChange }) {
  const max = new Date().getFullYear();
  let min = years.length ? years[0] : max;

  useEffect(() => {
    onChange([min, max]);
  }, [min, max, onChange]);

  return (
    <TooltipSlider
      range
      allowCross={false}
      defaultValue={yearsRange}
      disabled={disabled}
      handleStyle={{ borderColor: '#0b89f4' }}
      max={max}
      min={min}
      onChange={(range) => {
        onChange(range);
      }}
      step={1}
      trackStyle={{ backgroundColor: '#0b89f4' }}
      value={yearsRange}
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
