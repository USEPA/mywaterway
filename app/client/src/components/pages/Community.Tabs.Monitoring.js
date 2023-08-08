// @flow

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import { css } from 'styled-components/macro';
// components
import {
  AccordionList,
  AccordionItem,
} from 'components/shared/AccordionMapHighlight';
import { tabsStyles } from 'components/shared/ContentTabs';
import DateSlider from 'components/shared/DateSlider';
import TabErrorBoundary from 'components/shared/ErrorBoundary.TabErrorBoundary';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import { HelpTooltip } from 'components/shared/HelpTooltip';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import {
  keyMetricsStyles,
  keyMetricStyles,
  keyMetricNumberStyles,
  keyMetricLabelStyles,
} from 'components/shared/KeyMetrics';
import {
  circleIcon,
  squareIcon,
  waterwayIcon,
} from 'components/shared/MapLegend';
import MenuList from 'components/shared/MenuList';
import { errorBoxStyles, infoBoxStyles } from 'components/shared/MessageBoxes';
import ShowLessMore from 'components/shared/ShowLessMore';
import Switch from 'components/shared/Switch';
import ViewOnMapButton from 'components/shared/ViewOnMapButton';
import VirtualizedList from 'components/shared/VirtualizedList';
import WaterbodyInfo from 'components/shared/WaterbodyInfo';
// contexts
import { useFetchedDataState } from 'contexts/FetchedData';
import { useLayers } from 'contexts/Layers';
import {
  initialWorkerData,
  LocationSearchContext,
} from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import {
  useCyanWaterbodies,
  useStreamgages,
  useMonitoringGroups,
  useWaterbodyOnMap,
} from 'utils/hooks';
// data
import { characteristicGroupMappings } from 'config/characteristicGroupMappings';
// errors
import {
  cyanError,
  monitoringError,
  streamgagesError,
} from 'config/errorMessages';
// styles
import {
  colors,
  disclaimerStyles,
  iconStyles,
  toggleTableStyles,
} from 'styles/index.js';

/*
 * Styles
 */
const accordionContentStyles = css`
  padding: 0.4375em 0.875em 0.875em;
`;

const centeredTextStyles = css`
  text-align: center;
`;

const containerStyles = css`
  @media (min-width: 960px) {
    padding: 1em;
  }
`;

const legendItemsStyles = css`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-around;

  span {
    display: flex;
    align-items: center;
    font-size: 0.875em;
    margin-bottom: 1em;

    @media (min-width: 560px) {
      font-size: 1em;
    }
  }
`;

const modifiedDisclaimerStyles = css`
  ${disclaimerStyles};
  padding-bottom: 0;
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles};
  margin-bottom: 1em;
  text-align: center;
`;

const modifiedToggleTableStyles = css`
  ${toggleTableStyles}
  th, td {
    text-align: right;
    width: 33%;
    &:first-of-type {
      text-align: left;
    }
  }
`;

const showLessMoreStyles = css`
  display: block;
  padding-top: 1.5em;
`;

const sliderContainerStyles = css`
  margin: 1em 0;
`;

const subheadingStyles = css`
  font-weight: bold;
  padding-bottom: 0;
  text-align: center;
`;

const switchContainerStyles = css`
  margin-bottom: 0;
  & > div {
    margin-top: 0.5em;
  }
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

const toggleStyles = css`
  display: flex;
  align-items: center;
  margin-bottom: 0;

  span {
    margin-left: 0.5rem;
  }
`;

const totalRowStyles = css`
  border-top: 2px solid #dee2e6;
  font-weight: bold;
  background-color: #f0f6f9;
`;

/*
## Helpers
*/

// Passes parsing of historical CSV data to a Web Worker,
// which itself utilizes an external service
function usePeriodOfRecordData(filter, param) {
  const {
    monitoringAnnualRecords,
    setMonitoringAnnualRecords,
    setMonitoringYearsRange,
  } = useContext(LocationSearchContext);
  const services = useServicesContext();
  const [url, setUrl] = useState(null);

  // Clear the data on change of location
  const resetWorkerData = useCallback(() => {
    setMonitoringAnnualRecords({ status: 'idle', data: initialWorkerData });
    setMonitoringYearsRange(null);
  }, [setMonitoringAnnualRecords, setMonitoringYearsRange]);

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
  }, [filter, param, services]);

  // Create the worker and assign it a job,
  // then listen for a response
  useEffect(() => {
    if (!filter || !url) return;
    if (!window.Worker) {
      throw new Error("Your browser doesn't support web workers");
    }
    const origin = window.location.origin;
    const recordsWorker = new Worker(`${origin}/periodOfRecordWorker.js`);
    setMonitoringAnnualRecords({ status: 'pending', data: initialWorkerData });
    recordsWorker.postMessage([url, origin, characteristicGroupMappings]);
    recordsWorker.onmessage = (message) => {
      if (message.data && typeof message.data === 'string') {
        const parsedData = JSON.parse(message.data);
        parsedData.data.minYear = parseInt(parsedData.data.minYear);
        parsedData.data.maxYear = parseInt(parsedData.data.maxYear);
        setMonitoringYearsRange([
          parsedData.data.minYear,
          parsedData.data.maxYear,
        ]);
        setMonitoringAnnualRecords(parsedData);
      }
    };
    return function cleanup() {
      recordsWorker.terminate();
    };
  }, [filter, setMonitoringAnnualRecords, setMonitoringYearsRange, url]);

  return [monitoringAnnualRecords, resetWorkerData];
}

// Dynamically filter the displayed locations
function filterStation(station, timeframe) {
  if (!timeframe) return station;
  const stationRecords = station.dataByYear;
  const result = {
    ...station,
    totalMeasurements: 0,
    totalsByCharacteristic: {},
    totalsByGroup: {},
    totalsByLabel: {},
    timeframe: [...timeframe],
  };
  // Include the label in the object even if zero
  characteristicGroupMappings.forEach((mapping) => {
    result.totalsByLabel[mapping.label] = 0;
  });
  for (const year in stationRecords) {
    if (parseInt(year) < timeframe[0]) continue;
    if (parseInt(year) > timeframe[1]) break;
    result.totalMeasurements += stationRecords[year].totalMeasurements;
    // Tally characteristic group counts
    const resultGroups = result.totalsByGroup;
    Object.entries(stationRecords[year].totalsByGroup).forEach(
      ([group, count]) => {
        if (count <= 0) return;
        if (group in resultGroups) resultGroups[group] += count;
        else resultGroups[group] = count;
      },
    );
    // Tally characteristic label counts
    Object.entries(stationRecords[year].totalsByLabel).forEach(
      ([label, count]) => (result.totalsByLabel[label] += count),
    );
    // Tally characteristic counts
    const resultCharcs = result.totalsByCharacteristic;
    Object.entries(stationRecords[year].totalsByCharacteristic).forEach(
      ([charc, count]) => {
        if (count <= 0) return;
        if (charc in resultCharcs) resultCharcs[charc] += count;
        else resultCharcs[charc] = count;
      },
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
        return curStation.totalsByLabel[group] > 0;
      });
      if (hasToggledData) toggledLocations.push(curStation);
      allLocations.push(curStation);
    });
  }

  return { toggledLocations, allLocations };
}

function Monitoring() {
  const {
    monitoringLocationsLayer,
    updateVisibleLayers,
    usgsStreamgagesLayer,
    visibleLayers,
  } = useLayers();

  const { cyanWaterbodies, monitoringLocations, usgsStreamgages } =
    useFetchedDataState();

  const [currentWaterConditionsDisplayed, setCurrentWaterConditionsDisplayed] =
    useState(true);

  const [cyanDisplayed, setCyanDisplayed] = useState(true);

  const [usgsStreamgagesDisplayed, setUsgsStreamgagesDisplayed] =
    useState(true);

  const [monitoringDisplayed, setMonitoringDisplayed] = useState(false);

  // Syncs the toggles with the visible layers on the map. Mainly
  // used for when the user toggles layers in full screen mode and then
  // exits full screen.
  useEffect(() => {
    setUsgsStreamgagesDisplayed(visibleLayers.usgsStreamgagesLayer);
    setMonitoringDisplayed(visibleLayers.monitoringLocationsLayer);
    setCyanDisplayed(visibleLayers.cyanLayer);
  }, [visibleLayers]);

  const handleCurrentWaterConditionsToggle = useCallback(
    (checked) => {
      if (!usgsStreamgagesLayer) return;

      setCyanDisplayed(checked);
      setUsgsStreamgagesDisplayed(checked);
      setCurrentWaterConditionsDisplayed(checked);

      updateVisibleLayers({
        cyanLayer: checked,
        usgsStreamgagesLayer: checked,
      });
    },
    [updateVisibleLayers, usgsStreamgagesLayer],
  );

  const handlePastWaterConditionsToggle = useCallback(
    (checked) => {
      if (!monitoringLocationsLayer) return;

      setMonitoringDisplayed(checked);

      updateVisibleLayers({
        monitoringLocationsLayer: checked,
      });
    },
    [monitoringLocationsLayer, updateVisibleLayers],
  );

  const handleTabClick = useCallback(
    (index) => {
      if (index === 0) handleCurrentWaterConditionsToggle(true);
      if (index === 1) handlePastWaterConditionsToggle(true);
    },
    [handleCurrentWaterConditionsToggle, handlePastWaterConditionsToggle],
  );

  const totalCurrentWaterConditions =
    (usgsStreamgages.data?.length ?? 0) + (cyanWaterbodies.data?.length ?? 0);

  return (
    <div css={containerStyles}>
      <div css={keyMetricsStyles}>
        <div css={keyMetricStyles}>
          {usgsStreamgages.status === 'pending' ? (
            <LoadingSpinner />
          ) : (
            <label css={switchContainerStyles}>
              <span css={keyMetricNumberStyles}>
                {totalCurrentWaterConditions || 'N/A'}
              </span>
              <p css={keyMetricLabelStyles}>Current Water Conditions</p>
              <Switch
                checked={
                  Boolean(totalCurrentWaterConditions) &&
                  currentWaterConditionsDisplayed
                }
                onChange={handleCurrentWaterConditionsToggle}
                disabled={!totalCurrentWaterConditions}
              />
            </label>
          )}
        </div>
        <div css={keyMetricStyles}>
          {monitoringLocations.status === 'pending' ? (
            <LoadingSpinner />
          ) : (
            <label css={switchContainerStyles}>
              <span css={keyMetricNumberStyles}>
                {monitoringLocations.data?.length || 'N/A'}
              </span>
              <p css={keyMetricLabelStyles}>Past Water Conditions</p>
              <Switch
                checked={
                  Boolean(monitoringLocations.data?.length) &&
                  monitoringDisplayed
                }
                onChange={handlePastWaterConditionsToggle}
                disabled={!monitoringLocations.data?.length}
              />
            </label>
          )}
        </div>
      </div>

      <div css={tabsStyles}>
        <Tabs onChange={handleTabClick}>
          <TabList>
            <Tab>Current Water Conditions</Tab>
            <Tab>Past Water Conditions</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <CurrentConditionsTab
                usgsStreamgagesDisplayed={usgsStreamgagesDisplayed}
                setUsgsStreamgagesDisplayed={setUsgsStreamgagesDisplayed}
                cyanDisplayed={cyanDisplayed}
                setCyanDisplayed={setCyanDisplayed}
                setCurrentWaterConditionsDisplayed={
                  setCurrentWaterConditionsDisplayed
                }
                updateVisibleLayers={updateVisibleLayers}
              />
            </TabPanel>
            <TabPanel>
              <PastConditionsTab
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

function CurrentConditionsTab({
  usgsStreamgagesDisplayed,
  setUsgsStreamgagesDisplayed,
  cyanDisplayed,
  setCyanDisplayed,
  setCurrentWaterConditionsDisplayed,
  updateVisibleLayers,
}) {
  useEffect(() => {
    if (usgsStreamgagesDisplayed || cyanDisplayed) {
      setCurrentWaterConditionsDisplayed(true);
    }

    if (!usgsStreamgagesDisplayed && !cyanDisplayed) {
      setCurrentWaterConditionsDisplayed(false);
    }
  }, [
    usgsStreamgagesDisplayed,
    cyanDisplayed,
    setCurrentWaterConditionsDisplayed,
  ]);

  // draw the waterbody on the map
  useWaterbodyOnMap();

  const services = useServicesContext();

  const { mapView, watershed } = useContext(LocationSearchContext);

  const { cyanWaterbodies, cyanWaterbodiesStatus } = useCyanWaterbodies();
  const { streamgages, streamgagesStatus } = useStreamgages();

  const [sortedBy, setSortedBy] = useState('locationName');

  const sortedLocations = [...streamgages, ...cyanWaterbodies].sort((a, b) => {
    if (sortedBy in a && sortedBy in b) {
      return a[sortedBy].localeCompare(b[sortedBy]);
    } else if (sortedBy in a) return -1;
    else return 1;
  });

  const filteredLocations = sortedLocations.filter((item) => {
    const displayedTypes = [];

    if (usgsStreamgagesDisplayed) {
      displayedTypes.push('USGS Sensors');
    }

    if (cyanDisplayed) {
      displayedTypes.push('CyAN');
    }

    return displayedTypes.includes(item.monitoringType);
  });

  const handleUsgsSensorsToggle = useCallback(
    (checked) => {
      setUsgsStreamgagesDisplayed(checked);
      updateVisibleLayers({ usgsStreamgagesLayer: checked });
    },
    [setUsgsStreamgagesDisplayed, updateVisibleLayers],
  );

  const handleCyanWaterbodiesToggle = useCallback(
    (checked) => {
      setCyanDisplayed(checked);
      updateVisibleLayers({ cyanLayer: checked });
    },
    [setCyanDisplayed, updateVisibleLayers],
  );

  const handleSortChange = useCallback(({ value }) => setSortedBy(value), []);

  if (streamgagesStatus === 'pending') return <LoadingSpinner />;

  return (
    <>
      {streamgagesStatus === 'failure' && (
        <div css={modifiedErrorBoxStyles}>
          <p>{streamgagesError}</p>
        </div>
      )}

      {cyanWaterbodiesStatus === 'failure' && (
        <div css={modifiedErrorBoxStyles}>
          <p>{cyanError}</p>
        </div>
      )}

      {sortedLocations.length === 0 && (
        <div css={infoBoxStyles}>
          <p css={centeredTextStyles}>
            There are no locations with data in the <em>{watershed}</em>{' '}
            watershed.
          </p>
        </div>
      )}

      {sortedLocations.length > 0 && (
        <>
          <p>
            The yellow squares represent{' '}
            <a
              rel="noreferrer"
              target="_blank"
              href="https://dashboard.waterdata.usgs.gov"
            >
              USGS monitoring locations
            </a>{' '}
            that provide real time water quality measurements – such as water
            level, water temperature, dissolved oxygen saturation, and other
            water quality indicators.
            <ShowLessMore
              charLimit={0}
              text={
                <>
                  <span css={showLessMoreStyles}>
                    Areas highlighted light blue are the lakes, reservoirs, and
                    other large waterbodies where potential harmful algal bloom
                    data is available. Daily data are a snapshot of{' '}
                    <GlossaryTerm term="Blue-Green Algae">
                      blue-green algae
                    </GlossaryTerm>{' '}
                    at the time of detection.
                  </span>

                  <span css={showLessMoreStyles}>
                    Click on each monitoring location on the map or in the list
                    below to find out more about what was monitored at each
                    location.
                  </span>
                </>
              }
            />
          </p>

          <div css={legendItemsStyles}>
            <span>
              {waterwayIcon({ color: '#6c95ce' })}
              &nbsp;Potential Harmful Algal Blooms (HABs)&nbsp;
            </span>
            <span>
              {squareIcon({ color: '#fffe00' })}
              &nbsp;USGS Sensors&nbsp;
            </span>
          </div>

          <table css={toggleTableStyles} className="table">
            <thead>
              <tr>
                <th>
                  <span>Current Water Conditions</span>
                </th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <label css={toggleStyles}>
                    <Switch
                      checked={
                        streamgages.length > 0 && usgsStreamgagesDisplayed
                      }
                      onChange={handleUsgsSensorsToggle}
                      disabled={streamgages.length === 0}
                    />
                    <span>USGS Sensors</span>
                  </label>
                </td>
                <td>{streamgages.length}</td>
              </tr>
              <tr>
                <td>
                  <label css={toggleStyles}>
                    <Switch
                      checked={cyanWaterbodies.length > 0 && cyanDisplayed}
                      onChange={handleCyanWaterbodiesToggle}
                      disabled={
                        cyanWaterbodiesStatus !== 'success' ||
                        cyanWaterbodies.length === 0
                      }
                    />
                    <span>Potential Harmful Algal Blooms (HABs)</span>
                  </label>
                </td>
                <td>{cyanWaterbodies.length ?? 'N/A'}</td>
              </tr>
            </tbody>
          </table>

          <AccordionList
            title={
              <>
                <strong>{filteredLocations.length}</strong> of{' '}
                <strong>{sortedLocations.length}</strong>{' '}
                {sortedLocations.length === 1 ? 'location' : 'locations'} with
                data in the <em>{watershed}</em> watershed.
              </>
            }
            onSortChange={handleSortChange}
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
            {filteredLocations.map((item) => {
              switch (item.monitoringType) {
                case 'USGS Sensors': {
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
                      ariaLabel={item.locationName}
                      icon={squareIcon({ color: '#fffe00' })}
                      key={item.uniqueId}
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
                      idKey="uniqueId"
                    >
                      <div css={accordionContentStyles}>
                        <WaterbodyInfo
                          type="USGS Sensors"
                          feature={feature}
                          services={services}
                        />

                        <ViewOnMapButton feature={feature} />
                      </div>
                    </AccordionItem>
                  );
                }
                case 'CyAN': {
                  const feature = {
                    geometry: item.geometry,
                    attributes: item,
                  };
                  return (
                    <AccordionItem
                      ariaLabel={item.GNIS_NAME}
                      icon={waterwayIcon({ color: '#6c95ce' })}
                      key={item.FID}
                      title={<strong>{item.GNIS_NAME || 'Unknown'}</strong>}
                      subTitle={
                        <>
                          <em>Organization Name:</em>&nbsp;&nbsp;
                          {item.orgName}
                        </>
                      }
                      feature={feature}
                      idKey="FID"
                    >
                      <div css={accordionContentStyles}>
                        <WaterbodyInfo
                          feature={feature}
                          mapView={mapView}
                          services={services}
                          type="CyAN"
                        />
                        <ViewOnMapButton feature={feature} fieldName="FID" />
                      </div>
                    </AccordionItem>
                  );
                }
                default:
                  throw new Error('Unhandled monitoring type');
              }
            })}
          </AccordionList>
        </>
      )}
    </>
  );
}

function PastConditionsTab({ setMonitoringDisplayed }) {
  const services = useServicesContext();

  const {
    huc12,
    monitoringGroups,
    monitoringYearsRange,
    setMonitoringFeatureUpdates,
    setMonitoringGroups,
    setMonitoringYearsRange,
    watershed,
  } = useContext(LocationSearchContext);

  const { monitoringLocationsLayer } = useLayers();
  const { monitoringLocations } = useFetchedDataState();
  useMonitoringGroups();

  const updateFeatures = useCallback(
    (locations) => {
      const stationUpdates = {};
      locations.forEach((location) => {
        stationUpdates[location.uniqueId] = {
          totalMeasurements: location.totalMeasurements,
          totalsByGroup: JSON.stringify(location.totalsByGroup),
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

  const groupToggleHandler = useCallback(
    (groupLabel) => {
      return function toggleGroup(_ev) {
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
      };
    },
    [monitoringGroups, setMonitoringDisplayed, setMonitoringGroups],
  );

  const groupToggleHandlers = useMemo(() => {
    if (!monitoringGroups) return null;
    const toggles = {};
    Object.values(monitoringGroups)
      .filter((group) => group.label !== 'All')
      .forEach((group) => {
        toggles[group.label] = groupToggleHandler(group.label);
      });
    return toggles;
  }, [monitoringGroups, groupToggleHandler]);

  // The data returned by the worker
  const [workerData, resetWorkerData] = usePeriodOfRecordData(huc12, 'huc12');
  const {
    data: { minYear, maxYear, sites: annualData },
    status: workerStatus,
  } = workerData;

  // Reset data if the user switches locations
  useEffect(() => {
    if (!huc12) return;

    return function cleanup() {
      resetWorkerData();
      setAllToggled(true);
      if (!monitoringLocationsLayer) return;

      monitoringLocationsLayer.definitionExpression = '';
    };
  }, [huc12, monitoringLocationsLayer, resetWorkerData]);

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

      if (monitoringYearsRange) {
        filter += `&startDateLo=01-01-${monitoringYearsRange[0]}&startDateHi=12-31-${monitoringYearsRange[1]}`;
      }

      setCharGroupFilters(filter);
    },
    [setCharGroupFilters, monitoringYearsRange],
  );

  const [displayedLocations, setDisplayedLocations] = useState([]);
  // All stations in the current time range
  const [currentLocations, setCurrentLocations] = useState([]);
  useEffect(() => {
    if (!monitoringLocationsLayer || !monitoringGroups) return;

    const { toggledLocations, allLocations } = filterLocations(
      monitoringGroups,
      monitoringYearsRange,
    );

    // Add filtered data that's relevent to map popups
    if (monitoringYearsRange) {
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
  }, [
    monitoringGroups,
    monitoringLocationsLayer,
    monitoringYearsRange,
    updateFeatures,
  ]);

  const [totalDisplayedLocations, setTotalDisplayedLocations] = useState(0);
  const [totalDisplayedMeasurements, setTotalDisplayedMeasurements] =
    useState(0);

  // Updates total counts after displayed locations are filtered
  useEffect(() => {
    if (!monitoringGroups) return;

    let newTotalLocations = 0;
    let newTotalMeasurements = 0;

    // update the watershed total measurements and samples counts
    displayedLocations.forEach((station) => {
      newTotalLocations++;
      Object.keys(monitoringGroups)
        .filter((group) => group !== 'All')
        .forEach((group) => {
          if (monitoringGroups[group].toggled) {
            newTotalMeasurements += station.totalsByLabel[group];
          }
        });
    });

    setTotalDisplayedLocations(newTotalLocations);
    setTotalDisplayedMeasurements(newTotalMeasurements);
    buildFilter(monitoringGroups);
  }, [buildFilter, displayedLocations, monitoringGroups]);

  const downloadUrl =
    `${services.data.waterQualityPortal.resultSearch}zip=no&huc=` +
    `${huc12}` +
    `${charGroupFilters}`;

  const portalUrl =
    `${services.data.waterQualityPortal.userInterface}#huc=${huc12}` +
    `${charGroupFilters}&mimeType=xlsx&dataProfile=resultPhysChem` +
    `&providers=NWIS&providers=STEWARDS&providers=STORET`;

  const [sortBy, setSortBy] = useState('locationName');

  const sortedMonitoringLocations = useMemo(() => {
    return displayedLocations
      ? displayedLocations.sort((a, b) => {
          if (sortBy === 'totalMeasurements') {
            return b.totalMeasurements - a.totalMeasurements;
          }

          return a[sortBy].localeCompare(b[sortBy]);
        })
      : [];
  }, [displayedLocations, sortBy]);

  // Gather all available characteristics from the periodOfRecord data
  const allCharacteristicOptions = useMemo(() => {
    const uniqueCharacteristics = new Set();
    Object.values(annualData).forEach((siteData) => {
      Object.values(siteData).forEach((yearData) => {
        Object.keys(yearData.totalsByCharacteristic).forEach((characteristic) =>
          uniqueCharacteristics.add(characteristic),
        );
      });
    });
    return Array.from(uniqueCharacteristics)
      .toSorted((a, b) => a.localeCompare(b))
      .map((charc) => ({ label: charc, value: charc }));
  }, [annualData]);

  const [selectedCharacteristicOptions, setSelectedCharacteristicOptions] =
    useState([]);

  // Filter the displayed locations by selected characteristics
  const filteredMonitoringLocations = useMemo(() => {
    if (!selectedCharacteristicOptions.length || workerStatus !== 'success')
      return sortedMonitoringLocations;
    const selectedCharacteristics = selectedCharacteristicOptions.map(
      (charc) => charc.value,
    );
    return sortedMonitoringLocations.filter((location) => {
      for (let characteristic of Object.keys(location.totalsByCharacteristic)) {
        if (selectedCharacteristics.includes(characteristic)) return true;
      }
      return false;
    });
  }, [selectedCharacteristicOptions, sortedMonitoringLocations, workerStatus]);

  const totalLocationsCount = monitoringGroups?.['All'].stations.length;
  const displayedLocationsCount =
    filteredMonitoringLocations.length.toLocaleString();

  const handleDateSliderChange = useCallback(
    (newRange) => {
      setMonitoringYearsRange(newRange);
    },
    [setMonitoringYearsRange],
  );

  const handleSortChange = useCallback(({ value }) => setSortBy(value), []);

  const [expandedRows, setExpandedRows] = useState([]);

  const handleExpandCollapse = useCallback(
    (allExpanded) => {
      if (allExpanded) {
        setExpandedRows([...Array(filteredMonitoringLocations.length).keys()]);
      } else {
        setExpandedRows([]);
      }
    },
    [filteredMonitoringLocations],
  );

  const accordionItemToggleHandler = useCallback(
    (index) => {
      return function toggleAccordionItem() {
        // add the item to the expandedRows array so the accordion item
        // will stay expanded when the user scrolls or highlights map items
        if (expandedRows.includes(index)) {
          setExpandedRows(expandedRows.filter((item) => item !== index));
        } else setExpandedRows(expandedRows.concat(index));
      };
    },
    [expandedRows],
  );

  const accordionItemToggleHandlers = useMemo(() => {
    return filteredMonitoringLocations.map((_item, index) => {
      return accordionItemToggleHandler(index);
    });
  }, [accordionItemToggleHandler, filteredMonitoringLocations]);

  const renderListItem = useCallback(
    ({ index }) => {
      const item = filteredMonitoringLocations[index];

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
          ariaLabel={item.locationName}
          icon={circleIcon({ color: colors.lightPurple() })}
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
              {item.totalMeasurements}
            </>
          }
          feature={feature}
          idKey="siteId"
          allExpanded={expandedRows.includes(index)}
          onChange={accordionItemToggleHandlers[index]}
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
    },
    [
      accordionItemToggleHandlers,
      expandedRows,
      filteredMonitoringLocations,
      services,
    ],
  );

  if (monitoringLocations.status === 'pending') return <LoadingSpinner />;

  if (monitoringLocations.status === 'failure') {
    return (
      <div css={errorBoxStyles}>
        <p css={centeredTextStyles}>{monitoringError}</p>
      </div>
    );
  }

  if (monitoringLocations.status === 'success') {
    return (
      <>
        {totalLocationsCount === 0 && (
          <div css={infoBoxStyles}>
            <p css={centeredTextStyles}>
              There are no monitoring sample locations in the{' '}
              <em>{watershed}</em> watershed.
            </p>
          </div>
        )}

        {totalLocationsCount > 0 && (
          <>
            <p>
              The purple circles represent{' '}
              <a
                rel="noreferrer"
                target="_blank"
                href="https://www.waterqualitydata.us"
              >
                Water Quality Portal
              </a>{' '}
              monitoring locations where diverse past water condition data are
              available. These locations may have monitoring data available from
              as recently as last week, to multiple decades old, or anywhere in
              between, depending on the location.
              <ShowLessMore
                text={
                  <span css={showLessMoreStyles}>
                    Click on each monitoring location on the map or in the list
                    below to find out more about what was monitored at each
                    location."
                  </span>
                }
              />
            </p>

            <div css={legendItemsStyles}>
              <span>
                {circleIcon({ color: colors.lightPurple() })}
                &nbsp;Past Water Conditions&nbsp;
              </span>
            </div>

            <div css={sliderContainerStyles}>
              {workerStatus === 'failure' && (
                <div css={modifiedErrorBoxStyles}>
                  <p>
                    Annual Past Water Conditions data is temporarily
                    unavailable, please try again later.
                  </p>
                </div>
              )}
              {workerStatus === 'pending' && <LoadingSpinner />}
              {workerStatus === 'success' && (
                <DateSlider
                  max={maxYear}
                  min={minYear}
                  disabled={!Object.keys(annualData).length}
                  onChange={handleDateSliderChange}
                  range={monitoringYearsRange}
                  headerElm={
                    <p css={subheadingStyles}>
                      <HelpTooltip label="Adjust the slider handles to filter location data by the selected year range" />
                      &nbsp;&nbsp; Date range for the <em>{watershed}</em>{' '}
                      watershed{' '}
                    </p>
                  }
                />
              )}
            </div>

            <table
              css={modifiedToggleTableStyles}
              aria-label="Monitoring Location Summary"
              className="table"
            >
              <thead>
                <tr>
                  <th>
                    <label css={toggleStyles}>
                      <Switch checked={allToggled} onChange={toggleAll} />
                      <span>All Monitoring Locations</span>
                    </label>
                  </th>
                  <th colSpan="2">Location Count</th>
                  <th>Measurement Count</th>
                </tr>
              </thead>

              <tbody>
                {Object.values(monitoringGroups)
                  .filter((group) => group.label !== 'All')
                  .map((group) => {
                    // get the number of measurements for this group type
                    let measurementCount = 0;
                    let locationCount = 0;
                    currentLocations.forEach((station) => {
                      if (station.totalsByLabel[group.label] > 0) {
                        measurementCount += station.totalsByLabel[group.label];
                        locationCount++;
                      }
                    });

                    return (
                      <tr key={group.label}>
                        <td>
                          <label css={toggleStyles}>
                            <Switch
                              checked={group.toggled}
                              onChange={groupToggleHandlers?.[group.label]}
                            />
                            <span>{group.label}</span>
                          </label>
                        </td>
                        <td colSpan="2">{locationCount.toLocaleString()}</td>
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
                  <td colSpan="2">
                    {Number(totalDisplayedLocations).toLocaleString()}
                  </td>
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
                          <HelpTooltip
                            label="Download XLSX"
                            description="Download selected data as an XLSX file."
                          >
                            <i
                              className="fas fa-file-excel"
                              aria-hidden="true"
                            />
                          </HelpTooltip>
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
                          <HelpTooltip
                            label="Download CSV"
                            description="Download selected data as a CSV file."
                          >
                            <i className="fas fa-file-csv" aria-hidden="true" />
                          </HelpTooltip>
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

            <Select
              components={{ MenuList }}
              isDisabled={workerStatus === 'failure'}
              isLoading={workerStatus === 'pending'}
              isMulti
              onChange={(options) => setSelectedCharacteristicOptions(options)}
              options={allCharacteristicOptions}
              placeholder="Select a characteristic..."
              value={selectedCharacteristicOptions}
            />
            <AccordionList
              title={
                monitoringYearsRange ? (
                  <span data-testid="monitoring-accordion-title">
                    <strong>{displayedLocationsCount.toLocaleString()}</strong>{' '}
                    of <strong>{totalLocationsCount.toLocaleString()}</strong>{' '}
                    water monitoring sample locations in the{' '}
                    <em>{watershed}</em> watershed from{' '}
                    <strong>{monitoringYearsRange[0]}</strong> to{' '}
                    <strong>{monitoringYearsRange[1]}</strong>.
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
              onSortChange={handleSortChange}
              onExpandCollapse={handleExpandCollapse}
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
                  value: 'totalMeasurements',
                },
              ]}
            >
              <VirtualizedList
                items={filteredMonitoringLocations}
                renderer={renderListItem}
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
