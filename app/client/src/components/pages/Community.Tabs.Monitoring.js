// @flow
/** @jsxImportSource @emotion/react */

import { css } from '@emotion/react';
import uniqueId from 'lodash/uniqueId';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
// components
import {
  AccordionList,
  AccordionItem,
} from 'components/shared/AccordionMapHighlight';
import CharacteristicsSelect from 'components/shared/CharacteristicsSelect';
import { tabsStyles } from 'components/shared/ContentTabs';
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
import { errorBoxStyles, infoBoxStyles } from 'components/shared/MessageBoxes';
import ShowLessMore from 'components/shared/ShowLessMore';
import Slider from 'components/shared/Slider';
import Switch from 'components/shared/Switch';
import ViewOnMapButton from 'components/shared/ViewOnMapButton';
import VirtualizedList from 'components/shared/VirtualizedList';
import WaterbodyInfo from 'components/shared/WaterbodyInfo';
// contexts
import { useFetchedDataState } from 'contexts/FetchedData';
import { useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import {
  useCyanWaterbodies,
  useMonitoringGroups,
  useStreamgages,
  useWaterbodyOnMap,
} from 'utils/hooks';
import { countOrNotAvailable } from 'utils/utils';
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
  tabLegendStyles,
  toggleTableStyles,
} from 'styles/index';

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

// Dynamically filter the displayed locations
function filterStation(station, timeframe) {
  if (!timeframe) return station;
  const stationRecords = station.dataByYear;
  const result = {
    ...station,
    characteristicsByGroup: {},
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
    // Get timeframe characteristics by group
    Object.entries(stationRecords[year].characteristicsByGroup).forEach(
      ([group, charcList]) => {
        result.characteristicsByGroup[group] = Array.from(
          new Set(charcList.concat(result.characteristicsByGroup[group] ?? [])),
        );
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
                {countOrNotAvailable(
                  totalCurrentWaterConditions,
                  usgsStreamgages.status,
                  cyanWaterbodies.status,
                )}
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
                {countOrNotAvailable(
                  monitoringLocations.data,
                  monitoringLocations.status,
                )}
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
      displayedTypes.push('Blue-Green Algae');
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

  const [switchId] = useState(uniqueId('habs-switch-'));

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
            There are no locations with data in the <em>{watershed.name}</em>{' '}
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
                    other large waterbodies where{' '}
                    <GlossaryTerm term="Potential Harmful Algal Blooms (HABs)">
                      potential harmful algal bloom
                    </GlossaryTerm>{' '}
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

          <div css={tabLegendStyles}>
            <span>
              {waterwayIcon({ color: colors.darkCyan() })}
              &nbsp;
              <GlossaryTerm term="Potential Harmful Algal Blooms (HABs)">
                Potential Harmful Algal Blooms (HABs)
              </GlossaryTerm>
              &nbsp;
            </span>
            <span>
              {squareIcon({ color: colors.yellow() })}
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
                <td>{countOrNotAvailable(streamgages, streamgagesStatus)}</td>
              </tr>
              <tr>
                <td>
                  <div css={toggleStyles}>
                    <Switch
                      ariaLabelledBy={switchId}
                      checked={cyanWaterbodies.length > 0 && cyanDisplayed}
                      onChange={handleCyanWaterbodiesToggle}
                      disabled={
                        cyanWaterbodiesStatus !== 'success' ||
                        cyanWaterbodies.length === 0
                      }
                    />
                    <GlossaryTerm
                      id={switchId}
                      term="Potential Harmful Algal Blooms (HABs)"
                    >
                      Potential Harmful Algal Blooms (HABs)
                    </GlossaryTerm>
                  </div>
                </td>
                <td>
                  {countOrNotAvailable(cyanWaterbodies, cyanWaterbodiesStatus)}
                </td>
              </tr>
            </tbody>
          </table>

          <AccordionList
            title={
              <>
                <strong>{filteredLocations.length}</strong> of{' '}
                <strong>{sortedLocations.length}</strong> locations with data in
                the <em>{watershed.name}</em> watershed.
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
                      icon={squareIcon({ color: colors.yellow() })}
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
                          feature={feature}
                          lookupFiles={{ services }}
                          type="USGS Sensors"
                        />

                        <ViewOnMapButton feature={feature} />
                      </div>
                    </AccordionItem>
                  );
                }
                case 'Blue-Green Algae': {
                  const feature = {
                    geometry: item.geometry,
                    attributes: item,
                  };
                  return (
                    <AccordionItem
                      ariaLabel={item.GNIS_NAME}
                      icon={waterwayIcon({ color: colors.darkCyan() })}
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
                          lookupFiles={{ services }}
                          mapView={mapView}
                          type="Blue-Green Algae"
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
    monitoringPeriodOfRecordStatus,
    monitoringYearsRange,
    selectedMonitoringYearsRange,
    setMonitoringFeatureUpdates,
    setSelectedMonitoringYearsRange,
    watershed,
  } = useContext(LocationSearchContext);
  const annualRecordsReady = monitoringPeriodOfRecordStatus === 'success';

  const { monitoringLocationsLayer } = useLayers();
  const { monitoringLocations } = useFetchedDataState();
  const { monitoringGroups, setMonitoringGroups } = useMonitoringGroups();

  const updateFeatures = useCallback(
    (locations) => {
      const stationUpdates = {};
      locations.forEach((location) => {
        stationUpdates[location.uniqueId] = {
          characteristicsByGroup: JSON.stringify(
            location.characteristicsByGroup,
          ),
          totalMeasurements: location.totalMeasurements,
          totalsByCharacteristic: JSON.stringify(
            location.totalsByCharacteristic,
          ),
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
    const toggles = {};
    Object.values(monitoringGroups)
      .filter((group) => group.label !== 'All')
      .forEach((group) => {
        toggles[group.label] = groupToggleHandler(group.label);
      });
    return toggles;
  }, [monitoringGroups, groupToggleHandler]);

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

      if (annualRecordsReady) {
        filter += `&startDateLo=01-01-${selectedMonitoringYearsRange[0]}&startDateHi=12-31-${selectedMonitoringYearsRange[1]}`;
      }

      setCharGroupFilters(filter);
    },
    [setCharGroupFilters, annualRecordsReady, selectedMonitoringYearsRange],
  );

  const [displayedLocations, setDisplayedLocations] = useState([]);
  // All stations in the current time range
  const [currentLocations, setCurrentLocations] = useState([]);
  useEffect(() => {
    const { toggledLocations, allLocations } = filterLocations(
      monitoringGroups,
      annualRecordsReady ? selectedMonitoringYearsRange : null,
    );

    // Add filtered data that's relevent to map popups
    if (annualRecordsReady) {
      updateFeatures(toggledLocations);
    }

    setCurrentLocations(allLocations);
    setDisplayedLocations(toggledLocations);
  }, [
    annualRecordsReady,
    monitoringGroups,
    selectedMonitoringYearsRange,
    updateFeatures,
  ]);

  const [totalDisplayedLocations, setTotalDisplayedLocations] = useState(0);
  const [totalDisplayedMeasurements, setTotalDisplayedMeasurements] =
    useState(0);

  // Updates total counts after displayed locations are filtered
  useEffect(() => {
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

  const [selectedCharacteristics, setSelectedCharacteristics] = useState([]);

  // Filter the displayed locations by selected characteristics
  const filteredMonitoringLocations = sortedMonitoringLocations.filter(
    (location) => {
      if (!selectedCharacteristics.length) {
        return true;
      }
      for (let characteristic of Object.keys(location.totalsByCharacteristic)) {
        if (selectedCharacteristics.includes(characteristic)) return true;
      }
      return false;
    },
  );

  const totalLocationsCount = monitoringGroups['All'].stations.length;
  const displayedLocationsCount =
    filteredMonitoringLocations.length.toLocaleString();

  const handleDateSliderChange = useCallback(
    (newRange) => {
      setSelectedMonitoringYearsRange(newRange);
    },
    [setSelectedMonitoringYearsRange],
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
              feature={feature}
              lookupFiles={{ services }}
              type="Past Water Conditions"
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

  // Update the filters on the layer
  const locationIds = filteredMonitoringLocations.map(
    (location) => location.uniqueId,
  );
  let definitionExpression = '';
  if (locationIds.length === 0) definitionExpression = '1=0';
  else if (locationIds.length !== monitoringGroups['All'].stations.length) {
    definitionExpression = `uniqueId IN ('${locationIds.join("','")}')`;
  }
  if (
    monitoringLocationsLayer &&
    definitionExpression !== monitoringLocationsLayer.definitionExpression
  ) {
    monitoringLocationsLayer.definitionExpression = definitionExpression;
  }

  // Clear the filter when changing tabs
  useEffect(() => {
    return function cleanup() {
      if (monitoringLocationsLayer) {
        monitoringLocationsLayer.definitionExpression = '';
      }
    };
  }, [monitoringLocationsLayer]);

  // Reset data if the user switches locations
  const [prevHuc12, setPrevHuc12] = useState(huc12);
  if (huc12 !== prevHuc12) {
    setPrevHuc12(huc12);
    setAllToggled(true);
    setSelectedCharacteristics([]);
  }

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
              <em>{watershed.name}</em> watershed.
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

            <div css={tabLegendStyles}>
              <span>
                {circleIcon({ color: colors.lightPurple() })}
                &nbsp;Past Water Conditions&nbsp;
              </span>
            </div>

            <div css={sliderContainerStyles}>
              {monitoringPeriodOfRecordStatus === 'failure' && (
                <div css={modifiedErrorBoxStyles}>
                  <p>
                    Annual Past Water Conditions data is temporarily
                    unavailable, please try again later.
                  </p>
                </div>
              )}
              {monitoringPeriodOfRecordStatus === 'pending' && (
                <LoadingSpinner />
              )}
              {monitoringPeriodOfRecordStatus === 'success' && (
                <Slider
                  max={monitoringYearsRange[1]}
                  min={monitoringYearsRange[0]}
                  disabled={
                    !monitoringYearsRange[0] || !monitoringYearsRange[1]
                  }
                  onChange={handleDateSliderChange}
                  range={[monitoringYearsRange[0], monitoringYearsRange[1]]}
                  headerElm={
                    <p css={subheadingStyles}>
                      <HelpTooltip label="Adjust the slider handles to filter location data by the selected year range" />
                      &nbsp;&nbsp; Date range for the <em>{watershed.name}</em>{' '}
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
                  .filter(
                    (group) =>
                      group.label !== 'All' && group.stations.length > 0,
                  )
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

            <AccordionList
              title={
                <span data-testid="monitoring-accordion-title">
                  <strong>{displayedLocationsCount.toLocaleString()}</strong> of{' '}
                  <strong>{totalLocationsCount.toLocaleString()}</strong> water
                  monitoring sample locations
                  {selectedCharacteristics.length > 0 &&
                    ' with the selected characteristic'}
                  {selectedCharacteristics.length > 1 && 's'} in the{' '}
                  <em>{watershed.name}</em> watershed
                  {annualRecordsReady && (
                    <>
                      {' '}
                      from <strong>
                        {selectedMonitoringYearsRange[0]}
                      </strong> to{' '}
                      <strong>{selectedMonitoringYearsRange[1]}</strong>
                    </>
                  )}
                  .
                </span>
              }
              extraListHeaderContent={
                <CharacteristicsSelect
                  selected={selectedCharacteristics}
                  onChange={setSelectedCharacteristics}
                />
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
