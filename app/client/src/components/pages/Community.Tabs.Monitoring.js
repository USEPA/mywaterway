// @flow

import React, { useCallback, useContext, useEffect, useState } from 'react';
import Papa from 'papaparse';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import { css } from 'styled-components/macro';
// components
import TabErrorBoundary from 'components/shared/ErrorBoundary.TabErrorBoundary';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import Switch from 'components/shared/Switch';
import ViewOnMapButton from 'components/shared/ViewOnMapButton';
import WaterbodyInfo from 'components/shared/WaterbodyInfo';
import {
  disclaimerStyles,
  downloadLinksStyles,
  iconStyles,
  modifiedTableStyles,
} from 'styles/index';
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
import VirtualizedList from 'components/shared/VirtualizedList';
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
import { subtitleStyles } from 'components/shared/Accordion';
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

type SummaryYears = '1' | '5' | 'all';

function fetchParseCsv(url: string, year: number, records: Array<Object>) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      chunk: (results, parser) => {
        results.data.forEach((result) => {
          if (result.YearSummarized === year) records.push(result);
        });
        if (results.errors?.length)
          console.error('Chunk errors: ', results.errors);
      },
      complete: (results) => resolve('Success'),
      download: true,
      dynamicTyping: true,
      error: (err) => reject(err),
      header: true,
      worker: true,
    });
  });
}

function usePeriodOfRecord(huc12: string, year: number) {
  const services = useServicesContext();

  const [data, setData] = useState([]);
  const [currentYear] = useState(new Date().getFullYear());

  const range: SummaryYears =
    year === currentYear ? '1' : currentYear - year <= 4 ? '5' : 'all';

  const url =
    `${services.data.waterQualityPortal.monitoringLocation}search?huc=${huc12}` +
    `&mimeType=csv&dataProfile=periodOfRecord&summaryYears=${range}`;

  const fetchJson = useCallback(
    async (url: string, year: number) => {
      const records = [];
      try {
        await fetchParseCsv(url, year, records);
        setData(records);
      } catch (e) {
        console.error(e);
      }
    },
    [setData],
  );

  useEffect(() => {
    if (!huc12) return;

    fetchJson(url, year);
  }, [fetchJson, huc12, range, url, year]);

  return data;
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
    if (!usgsDailyAverages.data.value) return;
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

    usgsDailyAverages.data.value?.timeSeries.forEach((site) => {
      const siteId = site.sourceInfo.siteCode[0].value;
      const sitesHasObservations = site.values[0].value.length > 0;

      if (streamgageSiteIds.includes(siteId) && sitesHasObservations) {
        const streamgage = normalizedUsgsStreamgages.find((gage) => {
          return gage.siteId === siteId;
        });

        const paramCode = site.variable.variableCode[0].value;
        const observations = site.values[0].value.map(({ value, dateTime }) => {
          return { measurement: value, date: new Date(dateTime) };
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
              title={
                <>
                  <em css={subtitleStyles}>Location Name:</em>
                  &nbsp;&nbsp;
                  <strong>{item.locationName || 'Unknown'}</strong>
                </>
              }
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
    );
  }
}

function MonitoringTab({ monitoringDisplayed, setMonitoringDisplayed }) {
  const services = useServicesContext();

  const {
    huc12,
    monitoringGroups,
    monitoringLocations,
    monitoringLocationsLayer,
    setMonitoringGroups,
    watershed,
  } = useContext(LocationSearchContext);

  //const records = usePeriodOfRecord(huc12, 2017);

  const [displayedMonitoringLocations, setDisplayedMonitoringLocations] =
    useState([]);

  const [allToggled, setAllToggled] = useState(true);

  const [charGroupFilters, setCharGroupFilters] = useState('');

  const [totalMeasurements, setTotalMeasurements] = useState(0);

  const [totalSamples, setTotalSamples] = useState(0);

  const [sortBy, setSortBy] = useState('locationName');

  const drawMap = useCallback(
    (monitoringLocationTogglesParam) => {
      if (!monitoringLocationsLayer) return;

      const addedStationUids = [];
      let tempDisplayedMonitoringLocations = [];
      let allOthersToggled = true;

      for (let key in monitoringLocationTogglesParam) {
        const group = monitoringLocationTogglesParam[key];
        if (group.label === 'All') continue;

        // if the location is toggled
        if (group.toggled) {
          group.stations.forEach((station) => {
            // add the station to the display, if it has not already been added
            if (!addedStationUids.includes(station.uniqueId)) {
              addedStationUids.push(station.uniqueId);
              tempDisplayedMonitoringLocations.push(station);
            }
          });
        } else {
          allOthersToggled = false;
        }
      }

      setAllToggled(allOthersToggled);

      // generate a list of location ids
      const locationIds = [];
      tempDisplayedMonitoringLocations.forEach((station) => {
        locationIds.push(station.uniqueId);
      });

      // update the filters on the layer
      if (
        tempDisplayedMonitoringLocations.length ===
        monitoringLocationTogglesParam.All.stations.length
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
    [monitoringLocationsLayer],
  );

  // create the filter string for download links based on active toggles
  const buildFilter = useCallback(
    (selectedNames, monitoringGroups) => {
      let filter = '';

      let groups = {};
      characteristicGroupMappings.forEach(
        (mapping) => (groups[mapping.label] = mapping.groupNames),
      );

      const groupsCount = Object.values(monitoringGroups).filter(
        (group) => group.label !== 'All',
      ).length;
      if (groupsCount !== selectedNames.length) {
        for (const name of selectedNames) {
          if (name === 'Other') {
            filter +=
              '&characteristicType=' +
              monitoringGroups['Other'].characteristicGroups.join(
                '&characteristicType=',
              );
          } else {
            filter +=
              '&characteristicType=' +
              groups[name].join('&characteristicType=');
          }
        }
      }

      setCharGroupFilters(filter);
    },
    [setCharGroupFilters],
  );

  const toggleSwitch = useCallback(
    (groupLabel: string, allToggledParam?: boolean = false) => {
      const toggleGroups = monitoringGroups;
      let newTotalMeasurements = 0;
      let newTotalSamples = 0;

      if (groupLabel === 'All') {
        if (!allToggledParam) {
          // toggle everything on
          for (let toggle in toggleGroups) {
            if (toggle !== 'All') toggleGroups[toggle].toggled = true;
          }
          // update the watershed total measurements and samples counts
          toggleGroups['All'].stations.forEach((station) => {
            newTotalMeasurements += parseInt(station.stationTotalMeasurements);
            newTotalSamples += parseInt(station.stationTotalSamples);
          });

          const activeGroups = characteristicGroupMappings.map(
            (group) => group.label,
          );
          buildFilter(activeGroups, monitoringGroups);

          monitoringLocationsLayer.visible = true;

          setMonitoringDisplayed(true);
        } else {
          // toggle everything off
          for (let key in toggleGroups) {
            if (key !== 'All') toggleGroups[key].toggled = false;
          }
          // update the watershed total measurements and samples counts
          newTotalMeasurements = 0;
          newTotalSamples = 0;

          monitoringLocationsLayer.visible = false;

          setCharGroupFilters('');
          setMonitoringDisplayed(false);
        }
      }
      // just one of the categories was changed
      else {
        monitoringLocationsLayer.visible = true;
        toggleGroups[groupLabel].toggled = !toggleGroups[groupLabel].toggled;

        // only check the toggles that are on the screen (i.e., ignore Bacterial, Sediments, etc.)
        const someToggled = Object.keys(toggleGroups).some(
          (key) => toggleGroups[key].toggled,
        );
        setMonitoringDisplayed(someToggled);

        // update the watershed total measurements and samples counts
        // to include only the specified characteristic groups
        const activeGroups = Object.keys(toggleGroups).filter(
          (label) => label !== 'All' && toggleGroups[label].toggled === true,
        );
        buildFilter(activeGroups, monitoringGroups);
        toggleGroups['All'].stations.forEach((station) => {
          let hasData = false;
          activeGroups.forEach((group) => {
            if (station.stationTotalsByGroup[group] > 0) {
              newTotalMeasurements += station.stationTotalsByGroup[group];
              hasData = true;
            }
          });
          if (hasData) newTotalSamples += parseInt(station.stationTotalSamples);
        });
      }

      setTotalMeasurements(newTotalMeasurements);
      setTotalSamples(newTotalSamples);
      setMonitoringGroups(toggleGroups);

      drawMap(toggleGroups);
    },
    [
      buildFilter,
      drawMap,
      monitoringGroups,
      monitoringLocationsLayer,
      setMonitoringDisplayed,
      setMonitoringGroups,
    ],
  );

  const [dataInitialized, setDataInitialized] = useState(false);

  // Reset dataInitialized if the user switches locations (i.e. monitoringGroups
  // changes to null)
  useEffect(() => {
    if (monitoringGroups) return;

    setDataInitialized(false);
  }, [monitoringGroups]);

  // Queries monitoring locations and displays them in the Accordion
  const displayMonitoringLocations = useCallback(async () => {
    const featureSet = await monitoringLocationsLayer.queryFeatures();
    const allMonitoringLocations = featureSet.features.map(
      (feature) => feature.attributes,
    );

    setDisplayedMonitoringLocations(allMonitoringLocations);
    setAllToggled(true);
  }, [monitoringLocationsLayer]);

  // Renders the monitoring locations on the map
  // and displays them in the Accordion list and toggles
  useEffect(() => {
    if (!monitoringGroups) return;
    if (dataInitialized) return;

    setDataInitialized(true);
    drawMap(monitoringGroups);

    try {
      displayMonitoringLocations();
    } catch (e) {
      setDataInitialized(false);
    }
  }, [displayMonitoringLocations, dataInitialized, drawMap, monitoringGroups]);

  useEffect(() => {
    // update total measurements and samples counts
    // after `monitoringGroups` is initialized
    let totalMeasurements = 0;
    let totalSamples = 0;
    if (monitoringGroups) {
      monitoringGroups['All'].stations.forEach((station) => {
        totalMeasurements += parseInt(station.stationTotalMeasurements);
        totalSamples += parseInt(station.stationTotalSamples);
      });
      setTotalMeasurements(totalMeasurements);
      setTotalSamples(totalSamples);
    }
  }, [monitoringGroups]);

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

  const totalLocations = monitoringGroups?.All.stations.length;
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
            <table css={toggleTableStyles} className="table">
              <thead>
                <tr>
                  <th>
                    <div css={toggleStyles}>
                      <Switch
                        checked={allToggled}
                        onChange={(ev) => toggleSwitch('All', allToggled)}
                        ariaLabel="Toggle all monitoring locations"
                      />
                      <span>All Monitoring Sample Locations</span>
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
                        station.stationTotalsByGroup[group.label];
                    });

                    return (
                      <tr key={group.label}>
                        <td>
                          <div css={toggleStyles}>
                            <Switch
                              checked={group.toggled}
                              onChange={(ev) => toggleSwitch(group.label)}
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
              </tbody>
            </table>

            <p>
              <strong>
                <em>{watershed}</em> totals:{' '}
              </strong>
            </p>
            <table
              css={modifiedTableStyles}
              aria-label="Monitoring Totals"
              className="table"
            >
              <tbody>
                <tr>
                  <td>
                    <em>
                      <GlossaryTerm term="Monitoring Samples">
                        Monitoring Samples:
                      </GlossaryTerm>
                    </em>
                  </td>
                  <td>{Number(totalSamples).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>
                    <em>
                      <GlossaryTerm term="Monitoring Measurements">
                        Monitoring Measurements:
                      </GlossaryTerm>
                    </em>
                  </td>
                  <td>{Number(totalMeasurements).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
            <p>
              <strong>
                Download <em>{watershed}</em> Monitoring Data:
              </strong>
            </p>
            <p css={downloadLinksStyles}>
              <span>Data Download Format:</span>
              &nbsp;
              <a href={`${downloadUrl}&mimeType=xlsx`}>
                <i
                  css={iconStyles}
                  className="fas fa-file-excel"
                  aria-hidden="true"
                />
                xls
              </a>
              <a href={`${downloadUrl}&mimeType=csv`}>
                <i
                  css={iconStyles}
                  className="fas fa-file-csv"
                  aria-hidden="true"
                />
                csv
              </a>
            </p>
            <p>
              <a rel="noopener noreferrer" target="_blank" href={portalUrl}>
                <i
                  css={iconStyles}
                  className="fas fa-filter"
                  aria-hidden="true"
                />
                Filter this data using the <em>Water Quality Portal</em> form
              </a>
              &nbsp;&nbsp;
              <small css={disclaimerStyles}>(opens new browser tab)</small>
              <br />
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
              <small css={disclaimerStyles}>(opens new browser tab)</small>
            </p>

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
                  label: 'Monitoring Sample Location Name',
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
                      title={
                        <>
                          <em css={subtitleStyles}>Location Name:</em>
                          &nbsp;&nbsp;
                          <strong>{item.locationName || 'Unknown'}</strong>
                        </>
                      }
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
                          type="Sample Location"
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

export default function MonitoringContainer() {
  return (
    <TabErrorBoundary tabName="Monitoring">
      <Monitoring />
    </TabErrorBoundary>
  );
}
