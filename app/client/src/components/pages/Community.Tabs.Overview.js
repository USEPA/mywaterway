// @flow

import { useEffect, useCallback, useContext, useMemo, useState } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import { css } from 'styled-components/macro';
// components
import {
  AccordionList,
  AccordionItem,
} from 'components/shared/AccordionMapHighlight';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import {
  circleIcon,
  diamondIcon,
  squareIcon,
} from 'components/shared/MapLegend';
import Switch from 'components/shared/Switch';
import WaterbodyList from 'components/shared/WaterbodyList';
import TabErrorBoundary from 'components/shared/ErrorBoundary.TabErrorBoundary';
import WaterbodyInfo from 'components/shared/WaterbodyInfo';
import ViewOnMapButton from 'components/shared/ViewOnMapButton';
import { infoBoxStyles, errorBoxStyles } from 'components/shared/MessageBoxes';
import {
  keyMetricsStyles,
  keyMetricStyles,
  keyMetricNumberStyles,
  keyMetricLabelStyles,
} from 'components/shared/KeyMetrics';
import ShowLessMore from 'components/shared/ShowLessMore';
import { tabsStyles } from 'components/shared/ContentTabs';
import VirtualizedList from 'components/shared/VirtualizedList';
// contexts
import { useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import {
  useLocalDischargers,
  useLocalMonitoringLocations,
  useLocalStreamgages,
  useWaterbodyFeatures,
  useWaterbodyOnMap,
} from 'utils/hooks';
import { getUniqueWaterbodies } from 'utils/mapFunctions';
// errors
import {
  echoError,
  streamgagesError,
  monitoringError,
  huc12SummaryError,
  zeroAssessedWaterbodies,
} from 'config/errorMessages';
// styles
import { colors, toggleTableStyles } from 'styles/index.js';

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

const toggleStyles = css`
  display: flex;
  align-items: center;

  span {
    margin-left: 0.5rem;
  }
`;

function Overview() {
  const { dischargers, dischargersStatus } = useLocalDischargers();
  const { streamgages, streamgagesStatus } = useLocalStreamgages();
  const { monitoringLocations, monitoringLocationsStatus } =
    useLocalMonitoringLocations();
  const { dischargersLayer, monitoringLocationsLayer, usgsStreamgagesLayer } =
    useLayers();

  const {
    cipSummary,
    waterbodyLayer,
    watershed,
    visibleLayers,
    setVisibleLayers,
  } = useContext(LocationSearchContext);

  const [waterbodiesDisplayed, setWaterbodiesDisplayed] = useState(true);

  const [monitoringLocationsDisplayed, setMonitoringLocationsDisplayed] =
    useState(false);

  const [usgsStreamgagesDisplayed, setUsgsStreamgagesDisplayed] =
    useState(false);

  const [monitoringAndSensorsDisplayed, setMonitoringAndSensorsDisplayed] =
    useState(false);

  const [permittedDischargersDisplayed, setPermittedDischargersDisplayed] =
    useState(false);

  // Syncs the toggles with the visible layers on the map. Mainly
  // used for when the user toggles layers in full screen mode and then
  // exist full screen.
  useEffect(() => {
    if (typeof visibleLayers.waterbodyLayer === 'boolean') {
      setWaterbodiesDisplayed(visibleLayers.waterbodyLayer);
    }

    if (typeof visibleLayers.monitoringLocationsLayer === 'boolean') {
      setMonitoringLocationsDisplayed(visibleLayers.monitoringLocationsLayer);
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
  const updateVisibleLayers = useCallback(
    ({ key = null, value = null, useCurrentValue = false }) => {
      const layers = {};

      if (cipSummary.status !== 'failure') {
        layers.waterbodyLayer =
          !waterbodyLayer || useCurrentValue
            ? visibleLayers.waterbodyLayer
            : waterbodiesDisplayed;
      }

      if (monitoringLocationsStatus !== 'failure') {
        layers.monitoringLocationsLayer =
          !monitoringLocationsLayer || useCurrentValue
            ? visibleLayers.monitoringLocationsLayer
            : monitoringLocationsDisplayed;
      }

      if (streamgagesStatus !== 'failure') {
        layers.usgsStreamgagesLayer =
          !usgsStreamgagesLayer || useCurrentValue
            ? visibleLayers.usgsStreamgagesLayer
            : usgsStreamgagesDisplayed;
      }

      if (dischargersStatus !== 'failure') {
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
      dischargersStatus,
      monitoringLocationsStatus,
      streamgagesStatus,
      visibleLayers,
      waterbodyLayer,
      waterbodiesDisplayed,
      monitoringLocationsLayer,
      monitoringLocationsDisplayed,
      usgsStreamgagesLayer,
      usgsStreamgagesDisplayed,
      dischargersLayer,
      permittedDischargersDisplayed,
      setVisibleLayers,
    ],
  );

  // update visible layers based on webservice statuses.
  useEffect(() => {
    updateVisibleLayers({ useCurrentValue: true });
  }, [updateVisibleLayers]);

  const handleWaterbodiesToggle = useCallback(
    (checked) => {
      if (!waterbodyLayer) return;

      setWaterbodiesDisplayed(checked);
      updateVisibleLayers({
        key: 'waterbodyLayer',
        value: checked,
      });
    },
    [updateVisibleLayers, waterbodyLayer],
  );

  const handleMonitoringLocationsToggle = useCallback(
    (checked) => {
      if (!usgsStreamgagesLayer) return;
      if (!monitoringLocationsLayer) return;

      setMonitoringAndSensorsDisplayed(checked);
      setUsgsStreamgagesDisplayed(checked);
      setMonitoringLocationsDisplayed(checked);
      setVisibleLayers({
        usgsStreamgagesLayer: checked,
        monitoringLocationsLayer: checked,
        // NOTE: no change for the following layers:
        waterbodyLayer: waterbodiesDisplayed,
        dischargersLayer: permittedDischargersDisplayed,
      });
    },
    [
      monitoringLocationsLayer,
      permittedDischargersDisplayed,
      setVisibleLayers,
      usgsStreamgagesLayer,
      waterbodiesDisplayed,
    ],
  );

  const handlePermittedDischargersToggle = useCallback(
    (checked) => {
      if (!dischargersLayer) return;
      setPermittedDischargersDisplayed(checked);
      updateVisibleLayers({
        key: 'dischargersLayer',
        value: checked,
      });
    },
    [dischargersLayer, updateVisibleLayers],
  );

  const handleTabClick = useCallback(
    (index) => {
      if (index === 0) handleWaterbodiesToggle(true);
      if (index === 1) handleMonitoringLocationsToggle(true);
      if (index === 2) handlePermittedDischargersToggle(true);
    },
    [
      handleMonitoringLocationsToggle,
      handlePermittedDischargersToggle,
      handleWaterbodiesToggle,
    ],
  );

  const waterbodies = useWaterbodyFeatures();

  const uniqueWaterbodies = waterbodies
    ? getUniqueWaterbodies(waterbodies)
    : [];

  const totalWaterbodies = uniqueWaterbodies.length;

  const totalMonitoringLocations = monitoringLocations.length;

  const totalUsgsStreamgages = streamgages.length;

  const totalMonitoringAndSensors =
    totalMonitoringLocations + totalUsgsStreamgages;

  const totalPermittedDischargers = dischargers.length;

  return (
    <div css={containerStyles}>
      {cipSummary.status === 'failure' && (
        <div css={modifiedErrorBoxStyles}>
          <p>{huc12SummaryError}</p>
        </div>
      )}

      {streamgagesStatus === 'failure' &&
        monitoringLocationsStatus === 'failure' && (
          <div css={modifiedErrorBoxStyles}>
            <p>{streamgagesError}</p>
            <p>{monitoringError}</p>
          </div>
        )}

      {dischargersStatus === 'failure' && (
        <div css={modifiedErrorBoxStyles}>
          <p>{echoError}</p>
        </div>
      )}

      {cipSummary.status === 'success' &&
        waterbodies !== null &&
        totalWaterbodies === 0 && (
          <div css={modifiedInfoBoxStyles}>
            <p>{zeroAssessedWaterbodies(watershed)}</p>
          </div>
        )}

      <div css={keyMetricsStyles}>
        <div css={keyMetricStyles}>
          {(!waterbodyLayer || waterbodies === null) &&
          cipSummary.status !== 'failure' ? (
            <LoadingSpinner />
          ) : (
            <>
              <span css={keyMetricNumberStyles}>
                {Boolean(totalWaterbodies) && cipSummary.status === 'success'
                  ? totalWaterbodies.toLocaleString()
                  : 'N/A'}
              </span>
              <p css={keyMetricLabelStyles}>Waterbodies</p>
              <div css={switchContainerStyles}>
                <Switch
                  checked={Boolean(totalWaterbodies) && waterbodiesDisplayed}
                  onChange={handleWaterbodiesToggle}
                  disabled={!Boolean(totalWaterbodies)}
                  ariaLabel="Waterbodies"
                />
              </div>
            </>
          )}
        </div>

        <div css={keyMetricStyles}>
          {!monitoringLocationsLayer ||
          !usgsStreamgagesLayer ||
          monitoringLocationsStatus === 'pending' ||
          streamgagesStatus === 'pending' ? (
            <LoadingSpinner />
          ) : (
            <>
              <span css={keyMetricNumberStyles}>
                {Boolean(totalMonitoringAndSensors)
                  ? totalMonitoringAndSensors
                  : 'N/A'}
              </span>
              <p css={keyMetricLabelStyles}>Monitoring Locations</p>
              <div css={switchContainerStyles}>
                <Switch
                  checked={
                    Boolean(totalMonitoringAndSensors) &&
                    monitoringAndSensorsDisplayed
                  }
                  onChange={handleMonitoringLocationsToggle}
                  disabled={!Boolean(totalMonitoringAndSensors)}
                  ariaLabel="Monitoring Stations"
                />
              </div>
            </>
          )}
        </div>

        <div css={keyMetricStyles}>
          {dischargersStatus === 'pending' ? (
            <LoadingSpinner />
          ) : (
            <>
              <span css={keyMetricNumberStyles}>
                {Boolean(totalPermittedDischargers)
                  ? totalPermittedDischargers
                  : 'N/A'}
              </span>
              <p css={keyMetricLabelStyles}>Permitted Dischargers</p>
              <div css={switchContainerStyles}>
                <Switch
                  checked={
                    Boolean(totalPermittedDischargers) &&
                    permittedDischargersDisplayed
                  }
                  onChange={handlePermittedDischargersToggle}
                  disabled={!Boolean(totalPermittedDischargers)}
                  ariaLabel="Permitted Dischargers"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div css={tabsStyles}>
        <Tabs onChange={handleTabClick}>
          <TabList>
            <Tab>Waterbodies</Tab>
            <Tab>Monitoring Locations</Tab>
            <Tab>Permitted Dischargers</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <WaterbodiesTab />
            </TabPanel>

            <TabPanel>
              <MonitoringAndSensorsTab
                setMonitoringAndSensorsDisplayed={
                  setMonitoringAndSensorsDisplayed
                }
                monitoringLocationsDisplayed={monitoringLocationsDisplayed}
                setMonitoringLocationsDisplayed={
                  setMonitoringLocationsDisplayed
                }
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

  const uniqueWaterbodies = waterbodies
    ? getUniqueWaterbodies(waterbodies)
    : [];

  const totalWaterbodies = uniqueWaterbodies.length;

  // draw the waterbody on the map
  useWaterbodyOnMap();

  return (
    <WaterbodyList
      waterbodies={waterbodies}
      fieldName={null}
      title={
        <span data-testid="overview-waterbodies-accordion-title">
          Overall condition of{' '}
          <strong>{totalWaterbodies.toLocaleString()}</strong>{' '}
          {totalWaterbodies === 1 ? 'waterbody' : 'waterbodies'} in the{' '}
          <em>{watershed}</em> watershed.
        </span>
      }
    />
  );
}

function MonitoringAndSensorsTab({
  setMonitoringAndSensorsDisplayed,
  monitoringLocationsDisplayed,
  setMonitoringLocationsDisplayed,
  usgsStreamgagesDisplayed,
  setUsgsStreamgagesDisplayed,
  updateVisibleLayers,
}) {
  const { watershed } = useContext(LocationSearchContext);

  const { monitoringLocationsLayer, usgsStreamgagesLayer } = useLayers();

  const services = useServicesContext();

  const [expandedRows, setExpandedRows] = useState([]);

  // if either of the "USGS Sensors" or "Past Water Conditions" switches
  // are turned on, or if both switches are turned off, keep the "Monitoring
  // Stations" switch in sync
  useEffect(() => {
    if (usgsStreamgagesDisplayed || monitoringLocationsDisplayed) {
      setMonitoringAndSensorsDisplayed(true);
    }

    if (!usgsStreamgagesDisplayed && !monitoringLocationsDisplayed) {
      setMonitoringAndSensorsDisplayed(false);
    }
  }, [
    usgsStreamgagesDisplayed,
    monitoringLocationsDisplayed,
    setMonitoringAndSensorsDisplayed,
  ]);

  const { streamgages, streamgagesStatus } = useLocalStreamgages();
  const { monitoringLocations, monitoringLocationsStatus } =
    useLocalMonitoringLocations();

  useEffect(() => {
    if (!monitoringLocationsLayer) return;
    monitoringLocationsLayer.baseLayer.definitionExpression = '';
  }, [monitoringLocationsLayer]);

  const allMonitoringAndSensors = [...streamgages, ...monitoringLocations];

  const [monitoringAndSensorsSortedBy, setMonitoringAndSensorsSortedBy] =
    useState('locationName');

  const sortedMonitoringAndSensors = [...allMonitoringAndSensors].sort(
    ({ attributes: a }, { attributes: b }) => {
      if (monitoringAndSensorsSortedBy === 'stationTotalMeasurements') {
        return (
          (b.stationTotalMeasurements || 0) - (a.stationTotalMeasurements || 0)
        );
      }

      if (monitoringAndSensorsSortedBy === 'siteId') {
        return a.siteId.localeCompare(b.siteId);
      }

      return a[monitoringAndSensorsSortedBy].localeCompare(
        b[monitoringAndSensorsSortedBy],
      );
    },
  );

  const filteredMonitoringAndSensors = sortedMonitoringAndSensors.filter(
    (item) => {
      const displayedTypes = [];

      if (usgsStreamgagesDisplayed) {
        displayedTypes.push('USGS Sensors');
      }

      if (monitoringLocationsDisplayed) {
        displayedTypes.push('Past Water Conditions');
      }

      return displayedTypes.includes(item.attributes.monitoringType);
    },
  );

  const handleUsgsSensorsToggle = useCallback(
    (checked) => {
      if (!usgsStreamgagesLayer) return;

      setUsgsStreamgagesDisplayed(checked);
      updateVisibleLayers({
        key: 'usgsStreamgagesLayer',
        value: checked,
      });
    },
    [setUsgsStreamgagesDisplayed, updateVisibleLayers, usgsStreamgagesLayer],
  );

  const handlePastWaterConditionsToggle = useCallback(
    (checked) => {
      if (!monitoringLocationsLayer) return;

      setMonitoringLocationsDisplayed(checked);
      updateVisibleLayers({
        key: 'monitoringLocationsLayer',
        value: checked,
      });
    },
    [
      monitoringLocationsLayer,
      setMonitoringLocationsDisplayed,
      updateVisibleLayers,
    ],
  );

  const handleSortChange = useCallback(
    ({ value }) => setMonitoringAndSensorsSortedBy(value),
    [],
  );

  const handleExpandCollapse = useCallback(
    (allExpanded) => {
      if (allExpanded) {
        setExpandedRows([...Array(filteredMonitoringAndSensors.length).keys()]);
      } else {
        setExpandedRows([]);
      }
    },
    [filteredMonitoringAndSensors],
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
    return filteredMonitoringAndSensors.map((_item, index) => {
      return accordionItemToggleHandler(index);
    });
  }, [accordionItemToggleHandler, filteredMonitoringAndSensors]);

  const renderListItem = useCallback(
    ({ index }) => {
      const item = filteredMonitoringAndSensors[index];

      const {
        locationName,
        locationType,
        monitoringType,
        orgName,
        uniqueId,
        uniqueIdKey,
      } = item.attributes;

      let icon = circleIcon({ color: colors.lightPurple() });
      if (monitoringType === 'USGS Sensors')
        icon = squareIcon({ color: '#fffe00' });

      return (
        <AccordionItem
          icon={icon}
          key={uniqueId}
          index={index}
          title={<strong>{locationName || 'Unknown'}</strong>}
          subTitle={
            <>
              <em>Monitoring Type:</em>&nbsp;&nbsp;
              {monitoringType}
              <br />
              <em>Organization Name:</em>&nbsp;&nbsp;
              {orgName}
              <br />
              <em>Water Type:</em>&nbsp;&nbsp;
              {locationType}
              {monitoringType === 'Past Water Conditions' && (
                <>
                  <br />
                  <em>Monitoring Measurements:</em>&nbsp;&nbsp;
                  {item.attributes.stationTotalMeasurements}
                </>
              )}
            </>
          }
          feature={item}
          idKey={uniqueIdKey}
          allExpanded={expandedRows.includes(index)}
          onChange={accordionItemToggleHandlers[index]}
        >
          <div css={accordionContentStyles}>
            {monitoringType === 'USGS Sensors' && (
              <WaterbodyInfo
                type="USGS Sensors"
                feature={item}
                services={services}
              />
            )}

            {monitoringType === 'Past Water Conditions' && (
              <WaterbodyInfo
                type="Past Water Conditions"
                feature={item}
                services={services}
              />
            )}

            <ViewOnMapButton feature={item} />
          </div>
        </AccordionItem>
      );
    },
    [
      accordionItemToggleHandlers,
      expandedRows,
      filteredMonitoringAndSensors,
      services,
    ],
  );
  if (
    monitoringLocationsStatus === 'pending' ||
    streamgagesStatus === 'pending'
  ) {
    return <LoadingSpinner />;
  }

  if (
    monitoringLocationsStatus === 'success' ||
    streamgagesStatus === 'success'
  ) {
    return (
      <>
        <p>
          Water is monitored by state, federal, tribal, and local agencies.
          Universities, volunteers and others also help detect water quality
          concerns.
        </p>

        <div css={legendItemsStyles}>
          <span>
            {circleIcon({ color: colors.lightPurple() })}
            &nbsp;Past Water Conditions&nbsp;
          </span>
          <span>
            {squareIcon({ color: '#fffe00' })}
            &nbsp;USGS Sensors&nbsp;
          </span>
        </div>

        <p>
          Water quality monitoring locations are shown on the map as both purple
          circles and yellow squares.
          <ShowLessMore
            charLimit={0}
            text=" The yellow squares represent monitoring
            locations that provide real time water quality measurements for a
            subset of categories– such as water level, water temperature,
            dissolved oxygen saturation, and other water quality indicators. The purple circles represent monitoring locations where all other past water conditions data is available. These locations may have monitoring data available from as recently as last week, to multiple decades old, or anywhere in between, depending on the location."
          />
        </p>

        {allMonitoringAndSensors.length === 0 && (
          <p css={centeredTextStyles}>
            There are no locations with data in the <em>{watershed}</em>{' '}
            watershed.
          </p>
        )}

        {allMonitoringAndSensors.length > 0 && (
          <>
            {streamgagesStatus === 'failure' && (
              <div css={modifiedErrorBoxStyles}>
                <p>{streamgagesError}</p>
              </div>
            )}

            {monitoringLocations.status === 'failure' && (
              <div css={modifiedErrorBoxStyles}>
                <p>{monitoringError}</p>
              </div>
            )}

            <table css={toggleTableStyles} className="table">
              <thead>
                <tr>
                  <th>
                    <span>Water Conditions</span>
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
                          streamgages.length > 0 && usgsStreamgagesDisplayed
                        }
                        onChange={handleUsgsSensorsToggle}
                        disabled={streamgages.length === 0}
                        ariaLabel="USGS Sensors"
                      />
                      <span>USGS Sensors</span>
                    </div>
                  </td>
                  <td>{streamgages.length}</td>
                </tr>
                <tr>
                  <td>
                    <div css={toggleStyles}>
                      <Switch
                        checked={
                          monitoringLocations.length > 0 &&
                          monitoringLocationsDisplayed
                        }
                        onChange={handlePastWaterConditionsToggle}
                        disabled={monitoringLocations.length === 0}
                        ariaLabel="Past Water Conditions"
                      />
                      <span>Past Water Conditions</span>
                    </div>
                  </td>
                  <td>{monitoringLocations.length}</td>
                </tr>
              </tbody>
            </table>

            <AccordionList
              title={
                <>
                  <strong>{filteredMonitoringAndSensors.length}</strong> of{' '}
                  <strong>{allMonitoringAndSensors.length}</strong> locations
                  with data in the <em>{watershed}</em> watershed.
                </>
              }
              onSortChange={handleSortChange}
              onExpandCollapse={handleExpandCollapse}
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
              ].concat(
                monitoringLocationsDisplayed
                  ? [
                      {
                        label: 'Monitoring Measurements',
                        value: 'stationTotalMeasurements',
                      },
                    ]
                  : [],
              )}
            >
              <VirtualizedList
                items={filteredMonitoringAndSensors}
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

const complianceRank = {
  Significant: 0,
  'Significant/Category I Noncompliance': 0,
  'Violation Identified': 1,
  'No Violation': 2,
  'No Violation Identified': 2,
  Unknown: 3,
};

function sortDischarchers(dischargers, sortBy) {
  if (sortBy === 'CWPStatus') {
    return dischargers.sort(({ attributes: a }, { attributes: b }) => {
      return (
        (complianceRank[a.CWPStatus] ?? complianceRank.Unknown) -
        (complianceRank[b.CWPStatus] ?? complianceRank.Unknown)
      );
    });
  } else {
    return dischargers.sort(({ attributes: a }, { attributes: b }) => {
      return a[sortBy].localeCompare(b[sortBy]);
    });
  }
}

function PermittedDischargersTab({ totalPermittedDischargers }) {
  const { dischargers, dischargersStatus } = useLocalDischargers();

  const { watershed } = useContext(LocationSearchContext);

  const [permittedDischargersSortedBy, setPermittedDischargersSortedBy] =
    useState('CWPName');

  const handleSortChange = useCallback((sortBy) => {
    setPermittedDischargersSortedBy(sortBy.value);
  }, []);

  /* prettier-ignore */
  const sortedPermittedDischargers = sortDischarchers(
    dischargers,
    permittedDischargersSortedBy,
  );

  if (dischargersStatus === 'pending') {
    return <LoadingSpinner />;
  }

  if (dischargersStatus === 'failure') {
    return (
      <div css={modifiedErrorBoxStyles}>
        <p>{echoError}</p>
      </div>
    );
  }

  if (dischargersStatus === 'success') {
    return (
      <>
        {totalPermittedDischargers === 0 && (
          <p css={centeredTextStyles}>
            There are no dischargers in the <em>{watershed}</em> watershed.
          </p>
        )}

        {totalPermittedDischargers > 0 && (
          <>
            <div css={legendItemsStyles}>
              <span>
                {diamondIcon({ color: colors.orange })}
                &nbsp;Permitted Dischargers&nbsp;
              </span>
            </div>
            <AccordionList
              title={
                <>
                  There {totalPermittedDischargers === 1 ? 'is' : 'are'}{' '}
                  <strong>{totalPermittedDischargers}</strong> permitted{' '}
                  {totalPermittedDischargers === 1
                    ? 'discharger'
                    : 'dischargers'}{' '}
                  in the <em>{watershed}</em> watershed.
                </>
              }
              onSortChange={handleSortChange}
              sortOptions={[
                {
                  value: 'CWPName',
                  label: 'Discharger Name',
                },
                {
                  value: 'SourceID',
                  label: 'NPDES ID',
                },
                {
                  value: 'CWPStatus',
                  label: 'Compliance Status',
                },
              ]}
            >
              {sortedPermittedDischargers.map((discharger) => {
                const {
                  SourceID: id,
                  CWPName: name,
                  CWPStatus: status,
                  uniqueIdKey: idKey,
                } = discharger.attributes;

                return (
                  <AccordionItem
                    icon={diamondIcon({ color: colors.orange })}
                    key={id}
                    title={<strong>{name || 'Unknown'}</strong>}
                    subTitle={
                      <>
                        NPDES ID: {id}
                        <br />
                        Compliance Status: {status}
                      </>
                    }
                    feature={discharger}
                    idKey={idKey}
                  >
                    <div css={accordionContentStyles}>
                      <WaterbodyInfo
                        type="Permitted Discharger"
                        feature={discharger}
                      />

                      <ViewOnMapButton feature={discharger} />
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

export default function OverviewContainer() {
  return (
    <TabErrorBoundary tabName="Overview">
      <Overview />
    </TabErrorBoundary>
  );
}
