// @flow

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import { css } from 'styled-components/macro';
import { useNavigate } from 'react-router-dom';
// components
import {
  AccordionList,
  AccordionItem,
} from 'components/shared/AccordionMapHighlight';
import { tabsStyles } from 'components/shared/ContentTabs';
import DateSlider from 'components/shared/DateSlider';
import TabErrorBoundary from 'components/shared/ErrorBoundary.TabErrorBoundary';
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
import { errorBoxStyles } from 'components/shared/MessageBoxes';
import Switch from 'components/shared/Switch';
import ViewOnMapButton from 'components/shared/ViewOnMapButton';
import VirtualizedList from 'components/shared/VirtualizedList';
import WaterbodyInfo from 'components/shared/WaterbodyInfo';
// contexts
import { useFetchedDataState } from 'contexts/FetchedData';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import { plotFacilities } from 'utils/mapFunctions';
import { useStreamgageFeatures, useWaterbodyOnMap } from 'utils/hooks';
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

const sliderContainerStyles = css`
  align-items: flex-end;
  display: flex;
  gap: 1rem;
  justify-content: center;
  padding-bottom: 10px;
  width: 100%;
  span {
    &:first-of-type {
      margin-left: 1em;
    }
    &:last-of-type {
      margin-right: 1em;
    }
  }
`;

const sliderHeaderStyles = css`
  background-color: #f0f6f9;
  border-bottom: 2px solid #dee2e6;
  border-top: 1px solid #dee2e6;
  display: flex;
  gap: 0.5em;
  justify-content: space-between;
  margin: auto;
  font-weight: bold;
  padding: 0.5rem;
  text-align: center;
  width: 100%;

  span {
    &:first-of-type {
      width: 1em;
    }
  }
`;

const switchContainerStyles = css`
  margin-top: 0.5em;
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
 ** Helpers
 */
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

  const {
    cipSummary,
    cyanWaterbodies,
    monitoringLocations,
    dischargersLayer,
    permittedDischargers,
    monitoringLocationsLayer,
    mapView,
    visibleLayers,
    setVisibleLayers,
    usgsStreamgagesLayer,
  } = useContext(LocationSearchContext);

  const [currentWaterConditionsDisplayed, setCurrentWaterConditionsDisplayed] =
    useState(true);

  const [cyanDisplayed, setCyanDisplayed] = useState(true);

  const [usgsStreamgagesDisplayed, setUsgsStreamgagesDisplayed] =
    useState(true);

  const [monitoringDisplayed, setMonitoringDisplayed] = useState(false);

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

    if (typeof visibleLayers.cyanLayer === 'boolean') {
      setCyanDisplayed(visibleLayers.cyanLayer);
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

      if (cyanWaterbodies.status !== 'failure') {
        const cyanLayer = mapView?.map.findLayerById('cyanLayer');
        layers.cyanLayer =
          !cyanLayer || useCurrentValue
            ? visibleLayers.cyanLayer
            : cyanDisplayed;
      }

      if (permittedDischargers.status !== 'failure') {
        layers.dischargersLayer = visibleLayers.dischargersLayer;
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
      cyanWaterbodies,
      cyanDisplayed,
      mapView,
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

  const handleCurrentWaterConditionsToggle = useCallback(
    (checked) => {
      if (!usgsStreamgagesLayer) return;

      setCyanDisplayed(checked);
      setUsgsStreamgagesDisplayed(checked);
      setCurrentWaterConditionsDisplayed(checked);

      const newVisibleLayers = {
        ...visibleLayers,
        cyanLayer: checked,
        usgsStreamgagesLayer: checked,
      };
      setVisibleLayers(newVisibleLayers);
    },
    [setVisibleLayers, usgsStreamgagesLayer, visibleLayers],
  );

  const handlePastWaterConditionsToggle = useCallback(
    (checked) => {
      if (!monitoringLocationsLayer) return;

      setMonitoringDisplayed(checked);

      const newVisibleLayers = {
        ...visibleLayers,
        monitoringLocationsLayer: checked,
      };
      setVisibleLayers(newVisibleLayers);
    },
    [monitoringLocationsLayer, setVisibleLayers, visibleLayers],
  );

  const totalCurrentWaterConditions =
    (usgsStreamgages.data.value?.length ?? 0) +
    (cyanWaterbodies.data?.length ?? 0);

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
                {usgsStreamgages.status === 'success' ||
                cyanWaterbodies.status === 'success'
                  ? totalCurrentWaterConditions
                  : 'N/A'}
              </span>
              <p css={keyMetricLabelStyles}>Current Water Conditions</p>
              <div css={switchContainerStyles}>
                <Switch
                  checked={
                    Boolean(totalCurrentWaterConditions) &&
                    currentWaterConditionsDisplayed
                  }
                  onChange={handleCurrentWaterConditionsToggle}
                  disabled={!Boolean(totalCurrentWaterConditions)}
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
                  onChange={handlePastWaterConditionsToggle}
                  disabled={!Boolean(monitoringLocations.data.features?.length)}
                  ariaLabel="Past Water Conditions"
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
                Explore the map and information below to find out about current
                water conditions. On this tab, we define current data as less
                than one week old. The water condition information shown here is
                estimated using satellite imagery and water quality sensors
                deployed in the waterbody.
              </p>

              <div css={legendItemsStyles}>
                <span>
                  {waterwayIcon({ color: '#6c95ce' })}
                  &nbsp;CyAN Satellite Imagery&nbsp;
                </span>
                <span>
                  {squareIcon({ color: '#fffe00' })}
                  &nbsp;USGS Sensors&nbsp;
                </span>
              </div>

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
              <p>
                Click on each monitoring location on the map or in the list
                below to find out what was monitored at each location, as well
                as the number of samples and measurements taken. These locations
                may have monitoring data available from as recently as last
                week, to multiple decades old, or anywhere in between, depending
                on the location.
              </p>

              <div css={legendItemsStyles}>
                <span>
                  {circleIcon({ color: colors.lightPurple() })}
                  &nbsp;Past Water Conditions&nbsp;
                </span>
              </div>

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

  const { usgsStreamgages, usgsPrecipitation, usgsDailyAverages } =
    useFetchedDataState();

  // draw the waterbody on the map
  useWaterbodyOnMap();

  const services = useServicesContext();

  const { cyanWaterbodies, mapView, watershed } = useContext(
    LocationSearchContext,
  );

  const normalizedUsgsStreamgages = useStreamgageFeatures(
    usgsStreamgages,
    usgsPrecipitation,
    usgsDailyAverages,
  );

  const [sortedBy, setSortedBy] = useState('locationName');

  const sortedLocations = [
    ...normalizedUsgsStreamgages,
    ...(cyanWaterbodies.status === 'success' ? cyanWaterbodies.data : []),
  ].sort(({ attributes: a }, { attributes: b }) => {
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

    return displayedTypes.includes(item.attributes.monitoringType);
  });

  const handleUsgsSensorsToggle = useCallback(
    (checked) => {
      setUsgsStreamgagesDisplayed(checked);
      updateVisibleLayers({
        key: 'usgsStreamgagesLayer',
        value: checked,
      });
    },
    [setUsgsStreamgagesDisplayed, updateVisibleLayers],
  );

  const handleCyanWaterbodiesToggle = useCallback(
    (checked) => {
      setCyanDisplayed(checked);
      updateVisibleLayers({
        key: 'cyanLayer',
        value: checked,
      });
    },
    [setCyanDisplayed, updateVisibleLayers],
  );

  const handleSortChange = useCallback(({ value }) => setSortedBy(value), []);

  if (usgsStreamgages.status === 'idle' || usgsStreamgages.status === 'pending')
    return <LoadingSpinner />;

  return (
    <>
      {usgsStreamgages.status === 'failure' && (
        <div css={modifiedErrorBoxStyles}>
          <p>{streamgagesError}</p>
        </div>
      )}

      {cyanWaterbodies.status === 'failure' && (
        <div css={modifiedErrorBoxStyles}>
          <p>{cyanError}</p>
        </div>
      )}

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
              <div css={toggleStyles}>
                <Switch
                  checked={
                    normalizedUsgsStreamgages.length > 0 &&
                    usgsStreamgagesDisplayed
                  }
                  onChange={handleUsgsSensorsToggle}
                  disabled={normalizedUsgsStreamgages.length === 0}
                  ariaLabel="USGS Sensors"
                />
                <span>USGS Sensors</span>
              </div>
            </td>
            <td>{normalizedUsgsStreamgages.length}</td>
          </tr>
          <tr>
            <td>
              <div css={toggleStyles}>
                <Switch
                  checked={cyanWaterbodies.data?.length > 0 && cyanDisplayed}
                  onChange={handleCyanWaterbodiesToggle}
                  disabled={
                    cyanWaterbodies.status !== 'success' ||
                    cyanWaterbodies.data?.length === 0
                  }
                  ariaLabel="CyAN Satellite Imagery"
                />
                <span>CyAN Satellite Imagery</span>
              </div>
            </td>
            <td>{cyanWaterbodies.data?.length ?? 'N/A'}</td>
          </tr>
        </tbody>
      </table>

      <AccordionList
        title={
          <>
            <strong>{filteredLocations.length}</strong> of{' '}
            <strong>{sortedLocations.length}</strong>{' '}
            {sortedLocations.length === 1 ? 'location' : 'locations'} with data
            in the <em>{watershed}</em> watershed.
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
          switch (item.attributes.monitoringType) {
            case 'USGS Sensors':
              return (
                <AccordionItem
                  icon={squareIcon({ color: '#fffe00' })}
                  key={item.attributes.siteId}
                  title={
                    <strong>{item.attributes.locationName || 'Unknown'}</strong>
                  }
                  subTitle={
                    <>
                      <em>Organization Name:</em>&nbsp;&nbsp;
                      {item.attributes.orgName}
                      <br />
                      <em>Water Type:</em>&nbsp;&nbsp;
                      {item.attributes.locationType}
                    </>
                  }
                  feature={item}
                  idKey="siteId"
                >
                  <div css={accordionContentStyles}>
                    <WaterbodyInfo
                      type="USGS Sensors"
                      feature={item}
                      services={services}
                    />

                    <ViewOnMapButton feature={item} />
                  </div>
                </AccordionItem>
              );
            case 'CyAN':
              return (
                <AccordionItem
                  icon={waterwayIcon({ color: '#6c95ce' })}
                  key={item.attributes.FID}
                  title={
                    <strong>{item.attributes.GNIS_NAME || 'Unknown'}</strong>
                  }
                  subTitle={
                    <>
                      <em>Organization Name:</em>&nbsp;&nbsp;
                      {item.attributes.orgName}
                    </>
                  }
                  feature={item}
                  idKey="FID"
                >
                  <div css={accordionContentStyles}>
                    <WaterbodyInfo
                      feature={item}
                      mapView={mapView}
                      services={services}
                      type="CyAN"
                    />
                    <ViewOnMapButton feature={item} fieldName="FID" />
                  </div>
                </AccordionItem>
              );
            default:
              throw new Error('Unhandled monitoring type');
          }
        })}
      </AccordionList>
    </>
  );
}

function PastConditionsTab({ monitoringDisplayed, setMonitoringDisplayed }) {
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
  const [{ minYear, maxYear, annualData }, resetWorkerData] =
    usePeriodOfRecordData(huc12, 'huc12');
  // The currently selected date range
  const [yearsRange, setYearsRange] = useState(null);
  useEffect(() => {
    if (monitoringGroups) return;
    // Reset data if the user switches locations
    monitoringLocationsLayer.definitionExpression = '';
    resetWorkerData();
    setYearsRange(null);
    setAllToggled(true);
  }, [
    monitoringGroups,
    monitoringLocationsLayer,
    resetWorkerData,
    setMonitoringDisplayed,
  ]);

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
    if (!monitoringLocationsLayer || !monitoringGroups) return;

    const { toggledLocations, allLocations } = filterLocations(
      monitoringGroups,
      yearsRange,
    );

    // Add filtered data that's relevent to map popups
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
    monitoringLocationsLayer.visible = monitoringDisplayed;
  }, [
    monitoringDisplayed,
    monitoringGroups,
    monitoringLocationsLayer,
    updateFeatures,
    yearsRange,
  ]);

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
  useEffect(() => {
    if (Object.keys(annualData).length === 0) return;
    if (yearsRange) return;
    addAnnualData();
  }, [addAnnualData, annualData, yearsRange]);

  // Updates total counts after displayed locations are filtered
  useEffect(() => {
    if (monitoringGroups) {
      let newTotalLocations = 0;
      let newTotalMeasurements = 0;

      // update the watershed total measurements and samples counts
      displayedLocations.forEach((station) => {
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
      buildFilter(monitoringGroups);
    }
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
          if (sortBy === 'stationTotalMeasurements') {
            return b.stationTotalMeasurements - a.stationTotalMeasurements;
          }

          if (sortBy === 'siteId') {
            return a.siteId.localeCompare(b.siteId);
          }

          return a[sortBy].localeCompare(b[sortBy]);
        })
      : [];
  }, [displayedLocations, sortBy]);

  const totalLocationsCount = monitoringGroups?.['All'].stations.length;
  const displayedLocationsCount =
    sortedMonitoringLocations.length.toLocaleString();

  const handleDateSliderChange = useCallback((newRange) => {
    setYearsRange(newRange);
  }, []);

  const handleSortChange = useCallback(({ value }) => setSortBy(value), []);

  const [expandedRows, setExpandedRows] = useState([]);

  const handleExpandCollapse = useCallback(
    (allExpanded) => {
      if (allExpanded) {
        setExpandedRows([...Array(sortedMonitoringLocations.length).keys()]);
      } else {
        setExpandedRows([]);
      }
    },
    [sortedMonitoringLocations],
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
    return sortedMonitoringLocations.map((_item, index) => {
      return accordionItemToggleHandler(index);
    });
  }, [accordionItemToggleHandler, sortedMonitoringLocations]);

  const renderListItem = useCallback(
    ({ index }) => {
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
              {item.stationTotalMeasurements}
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
      services,
      sortedMonitoringLocations,
    ],
  );

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
              <span></span>
              <span>Date range for the {watershed} watershed </span>
              <HelpTooltip label="Adjust the slider handles to filter location data by the selected year range" />
            </div>
            <div css={sliderContainerStyles}>
              {!yearsRange ? (
                <LoadingSpinner />
              ) : (
                <DateSlider
                  max={maxYear}
                  min={minYear}
                  disabled={!Boolean(Object.keys(annualData).length)}
                  onChange={handleDateSliderChange}
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
                    <div css={toggleStyles}>
                      <Switch
                        checked={allToggled}
                        onChange={toggleAll}
                        ariaLabel="Toggle all monitoring locations"
                      />
                      <span>All Monitoring Locations</span>
                    </div>
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
                      if (station.stationTotalsByLabel[group.label] > 0) {
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
                              onChange={groupToggleHandlers?.[group.label]}
                              ariaLabel={`Toggle ${group.label}`}
                            />
                            <span>{group.label}</span>
                          </div>
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
                  value: 'stationTotalMeasurements',
                },
              ]}
            >
              <VirtualizedList
                items={sortedMonitoringLocations}
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
