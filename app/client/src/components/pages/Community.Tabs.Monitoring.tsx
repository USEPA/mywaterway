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
import OrganizationsSelect from 'components/shared/OrganizationsSelect';
import PastWaterConditionsFilters from 'components/shared/PastWaterConditionsFilters';
import ShowLessMore from 'components/shared/ShowLessMore';
import Switch from 'components/shared/Switch';
import TogglePanel from 'components/shared/TogglePanel';
import ViewOnMapButton from 'components/shared/ViewOnMapButton';
import VirtualizedList from 'components/shared/VirtualizedList';
import WaterbodyInfo from 'components/shared/WaterbodyInfo';
// contexts
import { useConfigFilesState } from 'contexts/ConfigFiles';
import { useFetchedDataState } from 'contexts/FetchedData';
import { useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
// utilities
import {
  useCyanWaterbodies,
  useMonitoringGroups,
  useStreamgages,
  useWaterbodyOnMap,
} from 'utils/hooks';
import { countOrNotAvailable } from 'utils/utils';
// errors
import {
  cyanError,
  monitoringError,
  streamgagesError,
} from 'config/errorMessages';
// styles
import { colors, tabLegendStyles, toggleTableStyles } from 'styles/index';
// types
import type { MonitoringLocationAttributes, Option } from 'types';

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

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles};
  margin-bottom: 1em;
  text-align: center;
`;

const selectColumnStyles = css`
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  margin-bottom: 0.5em;
`;

const showLessMoreStyles = css`
  display: block;
  padding-top: 1.5em;
`;

const switchContainerStyles = css`
  margin-bottom: 0;
  & > div {
    margin-top: 0.5em;
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

/*
## Helpers
*/

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

  const configFiles = useConfigFilesState();

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
                          configFiles={configFiles.data}
                          feature={feature}
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
                          configFiles={configFiles.data}
                          feature={feature}
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
  const configFiles = useConfigFilesState();

  const {
    huc12,
    monitoringPeriodOfRecordStatus,
    selectedMonitoringYearsRange,
    watershed,
  } = useContext(LocationSearchContext);
  const annualRecordsReady = monitoringPeriodOfRecordStatus === 'success';

  const { monitoringLocationsLayer } = useLayers();
  const { monitoringLocations } = useFetchedDataState();
  const { monitoringGroups } = useMonitoringGroups();

  const [
    locationsFilteredByCharcGroupAndTime,
    setLocationsFilteredByCharcGroupAndTime,
  ] = useState<MonitoringLocationAttributes[]>([]);
  const [sortBy, setSortBy] = useState('locationName');

  const sortedMonitoringLocations = useMemo(() => {
    return locationsFilteredByCharcGroupAndTime.sort((a, b) => {
      if (sortBy === 'totalMeasurements') {
        return b.totalMeasurements - a.totalMeasurements;
      }

      return a[sortBy].localeCompare(b[sortBy]);
    });
  }, [locationsFilteredByCharcGroupAndTime, sortBy]);

  const [selectedCharacteristicOptions, setSelectedCharacteristicOptions] =
    useState<Readonly<Option[]>>([]);
  const selectedCharacteristics = selectedCharacteristicOptions.map(
    (opt) => opt.value,
  );

  const [selectedOrganizationOptions, setSelectedOrganizationOptions] =
    useState<Readonly<Option[]>>([]);
  const selectedOrganizations = selectedOrganizationOptions.map(
    (option) => option.value,
  );

  // Filter the displayed locations by selected characteristics
  const filteredMonitoringLocations = sortedMonitoringLocations
    .filter((location) => {
      if (!selectedCharacteristics.length) {
        return true;
      }
      for (let characteristic of Object.keys(location.totalsByCharacteristic)) {
        if (selectedCharacteristics.includes(characteristic)) return true;
      }
      return false;
    })
    .filter((location) => {
      if (!selectedOrganizations.length) {
        return true;
      }
      if (selectedOrganizations.includes(location.orgId)) return true;
      return false;
    });

  const totalLocationsCount = monitoringGroups['All']?.stations.length;
  const displayedLocationsCount =
    filteredMonitoringLocations.length.toLocaleString();

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
              configFiles={configFiles.data}
              feature={feature}
              type="Past Water Conditions"
            />
            <ViewOnMapButton feature={feature} />
          </div>
        </AccordionItem>
      );
    },
    [
      accordionItemToggleHandlers,
      configFiles,
      expandedRows,
      filteredMonitoringLocations,
    ],
  );

  // Update the filters on the layer
  const locationIds = filteredMonitoringLocations.map(
    (location) => location.uniqueId,
  );
  let definitionExpression = '';
  if (locationIds.length === 0) definitionExpression = '1=0';
  else if (locationIds.length !== monitoringGroups['All']?.stations.length) {
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
    setSelectedCharacteristicOptions([]);
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

            <PastWaterConditionsFilters
              key={huc12}
              filteredLocations={locationsFilteredByCharcGroupAndTime}
              huc12={huc12}
              locationName={watershed.name}
              locationType="watershed"
              setFilteredLocations={setLocationsFilteredByCharcGroupAndTime}
              setMonitoringDisplayed={setMonitoringDisplayed}
            />

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
                <TogglePanel defaultOpen title="Filter By:">
                  <div css={selectColumnStyles}>
                    <CharacteristicsSelect
                      selected={selectedCharacteristicOptions}
                      onChange={setSelectedCharacteristicOptions}
                    />
                    <OrganizationsSelect
                      selected={selectedOrganizationOptions}
                      onChange={setSelectedOrganizationOptions}
                    />
                  </div>
                </TogglePanel>
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
