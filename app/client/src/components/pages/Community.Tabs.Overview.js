// @flow

import { useEffect, useCallback, useContext, useMemo, useState } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import { css } from 'styled-components/macro';
// components
import {
  AccordionList,
  AccordionItem,
} from 'components/shared/AccordionMapHighlight';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import {
  circleIcon,
  diamondIcon,
  squareIcon,
  waterwayIcon,
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
  useCyanWaterbodies,
  useDischargers,
  useMonitoringLocations,
  useStreamgages,
  useWaterbodyFeatures,
  useWaterbodyOnMap,
} from 'utils/hooks';
import { getUniqueWaterbodies } from 'utils/mapFunctions';
// errors
import {
  cyanError,
  echoError,
  streamgagesError,
  monitoringError,
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

const switchContainerStyles = css`
  margin-bottom: 0;
  & > div {
    margin-top: 0.5em;
  }
`;

const centeredTextStyles = css`
  text-align: center;
`;

const accordionContentStyles = css`
  padding: 0.4375em 0.875em 0.875em;
`;

const showLessMoreStyles = css`
  display: block;
  padding-top: 1.5em;
`;

const toggleStyles = css`
  display: flex;
  align-items: center;
  margin-bottom: 0;

  label {
    margin-bottom: 0;
  }

  span {
    margin-left: 0.5rem;
  }
`;

function Overview() {
  const { cyanWaterbodies, cyanWaterbodiesStatus } = useCyanWaterbodies();
  const { dischargers, dischargersStatus } = useDischargers();
  const { streamgages, streamgagesStatus } = useStreamgages();
  const { monitoringLocations, monitoringLocationsStatus } =
    useMonitoringLocations();

  const {
    cyanLayer,
    dischargersLayer,
    monitoringLocationsLayer,
    updateVisibleLayers,
    usgsStreamgagesLayer,
    visibleLayers,
    waterbodyLayer,
  } = useLayers();

  const { cipSummary } = useContext(LocationSearchContext);

  const [waterbodiesDisplayed, setWaterbodiesDisplayed] = useState(true);

  const [cyanDisplayed, setCyanDisplayed] = useState(true);

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
    setWaterbodiesDisplayed(visibleLayers.waterbodyLayer);
    setMonitoringLocationsDisplayed(visibleLayers.monitoringLocationsLayer);
    setUsgsStreamgagesDisplayed(visibleLayers.usgsStreamgagesLayer);
    setPermittedDischargersDisplayed(visibleLayers.dischargersLayer);
  }, [visibleLayers]);

  const handleWaterbodiesToggle = useCallback(
    (checked) => {
      if (!waterbodyLayer) return;

      setWaterbodiesDisplayed(checked);
      updateVisibleLayers({ waterbodyLayer: checked });
    },
    [updateVisibleLayers, waterbodyLayer],
  );

  const handleMonitoringLocationsToggle = useCallback(
    (checked) => {
      if (!usgsStreamgagesLayer) return;
      if (!monitoringLocationsLayer) return;
      if (!cyanLayer) return;

      setMonitoringAndSensorsDisplayed(checked);
      setUsgsStreamgagesDisplayed(checked);
      setMonitoringLocationsDisplayed(checked);
      setCyanDisplayed(checked);
      updateVisibleLayers({
        usgsStreamgagesLayer: checked,
        monitoringLocationsLayer: checked,
      });
    },
    [
      cyanLayer,
      monitoringLocationsLayer,
      updateVisibleLayers,
      usgsStreamgagesLayer,
    ],
  );

  const handlePermittedDischargersToggle = useCallback(
    (checked) => {
      if (!dischargersLayer) return;
      setPermittedDischargersDisplayed(checked);
      updateVisibleLayers({ dischargersLayer: checked });
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

  const totalMonitoringAndSensors =
    monitoringLocations.length + streamgages.length + cyanWaterbodies.length;

  const totalPermittedDischargers = dischargers.length;

  return (
    <div css={containerStyles}>
      <div css={keyMetricsStyles}>
        <div css={keyMetricStyles}>
          {(!waterbodyLayer || waterbodies === null) &&
          cipSummary.status !== 'failure' ? (
            <LoadingSpinner />
          ) : (
            <label css={switchContainerStyles}>
              <span css={keyMetricNumberStyles}>
                {Boolean(totalWaterbodies) && cipSummary.status === 'success'
                  ? totalWaterbodies.toLocaleString()
                  : 'N/A'}
              </span>
              <p css={keyMetricLabelStyles}>Waterbodies</p>
              <div>
                <Switch
                  checked={Boolean(totalWaterbodies) && waterbodiesDisplayed}
                  onChange={handleWaterbodiesToggle}
                  disabled={!totalWaterbodies}
                />
              </div>
            </label>
          )}
        </div>

        <div css={keyMetricStyles}>
          {!cyanLayer ||
          !monitoringLocationsLayer ||
          !usgsStreamgagesLayer ||
          cyanWaterbodiesStatus === 'pending' ||
          monitoringLocationsStatus === 'pending' ||
          streamgagesStatus === 'pending' ? (
            <LoadingSpinner />
          ) : (
            <label css={switchContainerStyles}>
              <span css={keyMetricNumberStyles}>
                {totalMonitoringAndSensors ?? 'N/A'}
              </span>
              <p css={keyMetricLabelStyles}>Water Monitoring Locations</p>
              <div>
                <Switch
                  checked={
                    Boolean(totalMonitoringAndSensors) &&
                    monitoringAndSensorsDisplayed
                  }
                  onChange={handleMonitoringLocationsToggle}
                  disabled={!totalMonitoringAndSensors}
                />
              </div>
            </label>
          )}
        </div>

        <div css={keyMetricStyles}>
          {dischargersStatus === 'pending' ? (
            <LoadingSpinner />
          ) : (
            <label css={switchContainerStyles}>
              <span css={keyMetricNumberStyles}>
                {totalPermittedDischargers ? totalPermittedDischargers : 'N/A'}
              </span>
              <p css={keyMetricLabelStyles}>Permitted Dischargers</p>
              <div>
                <Switch
                  checked={
                    Boolean(totalPermittedDischargers) &&
                    permittedDischargersDisplayed
                  }
                  onChange={handlePermittedDischargersToggle}
                  disabled={!totalPermittedDischargers}
                />
              </div>
            </label>
          )}
        </div>
      </div>

      <div css={tabsStyles}>
        <Tabs onChange={handleTabClick}>
          <TabList>
            <Tab>Waterbodies</Tab>
            <Tab>Water Monitoring Locations</Tab>
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
                cyanDisplayed={cyanDisplayed}
                setCyanDisplayed={setCyanDisplayed}
                updateVisibleLayers={updateVisibleLayers}
              />
            </TabPanel>

            <TabPanel>
              <PermittedDischargersTab
                setPermittedDischargersDisplayed={
                  setPermittedDischargersDisplayed
                }
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
  const { cipSummary, watershed } = useContext(LocationSearchContext);
  const waterbodies = useWaterbodyFeatures();

  const uniqueWaterbodies = waterbodies
    ? getUniqueWaterbodies(waterbodies)
    : [];

  const totalWaterbodies = uniqueWaterbodies.length;

  // draw the waterbody on the map
  useWaterbodyOnMap();

  if (
    cipSummary.status === 'success' &&
    waterbodies !== null &&
    totalWaterbodies === 0
  ) {
    return (
      <div css={infoBoxStyles}>
        <p css={centeredTextStyles}>{zeroAssessedWaterbodies(watershed)}</p>
      </div>
    );
  }

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
  cyanDisplayed,
  setCyanDisplayed,
  updateVisibleLayers,
}) {
  const { mapView, watershed } = useContext(LocationSearchContext);

  const { cyanLayer, monitoringLocationsLayer, usgsStreamgagesLayer } =
    useLayers();

  const services = useServicesContext();

  const [expandedRows, setExpandedRows] = useState([]);

  // if any of the "USGS Sensors", "Harmful Algal Blooms", or "Past Water Conditions" switches
  // are turned on, or if all switches are turned off, keep the "Water Monitoring
  // Locations" switch in sync
  useEffect(() => {
    setMonitoringAndSensorsDisplayed(
      usgsStreamgagesDisplayed || monitoringLocationsDisplayed || cyanDisplayed,
    );
  }, [
    cyanDisplayed,
    usgsStreamgagesDisplayed,
    monitoringLocationsDisplayed,
    setMonitoringAndSensorsDisplayed,
  ]);

  const { streamgages, streamgagesStatus } = useStreamgages();
  const { monitoringLocations, monitoringLocationsStatus } =
    useMonitoringLocations();
  const { cyanWaterbodies, cyanWaterbodiesStatus } = useCyanWaterbodies();

  const allMonitoringAndSensors = [
    ...streamgages,
    ...monitoringLocations,
    ...cyanWaterbodies,
  ];

  const [monitoringAndSensorsSortedBy, setMonitoringAndSensorsSortedBy] =
    useState('locationName');

  const sortedMonitoringAndSensors = [...allMonitoringAndSensors].sort(
    (a, b) => {
      if (monitoringAndSensorsSortedBy === 'totalMeasurements') {
        return (b.totalMeasurements ?? 0) - (a.totalMeasurements ?? 0);
      }

      if (
        monitoringAndSensorsSortedBy in a &&
        monitoringAndSensorsSortedBy in b
      ) {
        return a[monitoringAndSensorsSortedBy].localeCompare(
          b[monitoringAndSensorsSortedBy],
        );
      } else if (monitoringAndSensorsSortedBy in a) return -1;
      else return 1;
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

      if (cyanDisplayed) {
        displayedTypes.push('CyAN');
      }

      return displayedTypes.includes(item.monitoringType);
    },
  );

  const handleUsgsSensorsToggle = useCallback(
    (checked) => {
      if (!usgsStreamgagesLayer) return;

      setUsgsStreamgagesDisplayed(checked);
      updateVisibleLayers({ usgsStreamgagesLayer: checked });
    },
    [setUsgsStreamgagesDisplayed, updateVisibleLayers, usgsStreamgagesLayer],
  );

  const handlePastWaterConditionsToggle = useCallback(
    (checked) => {
      if (!monitoringLocationsLayer) return;

      setMonitoringLocationsDisplayed(checked);
      updateVisibleLayers({ monitoringLocationsLayer: checked });
    },
    [
      monitoringLocationsLayer,
      setMonitoringLocationsDisplayed,
      updateVisibleLayers,
    ],
  );

  const handleHarmfulAlgalBloomsToggle = useCallback(
    (checked) => {
      if (!cyanLayer) return;

      setCyanDisplayed(checked);
      updateVisibleLayers({ cyanLayer: checked });
    },
    [cyanLayer, setCyanDisplayed, updateVisibleLayers],
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

      if (item.monitoringType === 'CyAN') {
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
            allExpanded={expandedRows.includes(index)}
            onChange={accordionItemToggleHandlers[index]}
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
      } else {
        const {
          locationName,
          locationType,
          monitoringType,
          orgName,
          uniqueId,
        } = item;

        let icon = circleIcon({ color: colors.lightPurple() });
        if (monitoringType === 'USGS Sensors')
          icon = squareIcon({ color: '#fffe00' });

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
                    {item.totalMeasurements}
                  </>
                )}
              </>
            }
            feature={feature}
            idKey="uniqueId"
            allExpanded={expandedRows.includes(index)}
            onChange={accordionItemToggleHandlers[index]}
          >
            <div css={accordionContentStyles}>
              <WaterbodyInfo
                type={monitoringType}
                feature={feature}
                services={services}
              />
              <ViewOnMapButton feature={feature} />
            </div>
          </AccordionItem>
        );
      }
    },
    [
      accordionItemToggleHandlers,
      expandedRows,
      filteredMonitoringAndSensors,
      mapView,
      services,
    ],
  );

  if (
    cyanWaterbodiesStatus === 'failure' &&
    streamgagesStatus === 'failure' &&
    monitoringLocationsStatus === 'failure'
  ) {
    return (
      <div css={errorBoxStyles}>
        <p>{cyanError}</p>
        <p>{streamgagesError}</p>
        <p>{monitoringError}</p>
      </div>
    );
  }

  if (
    cyanWaterbodiesStatus === 'pending' ||
    monitoringLocationsStatus === 'pending' ||
    streamgagesStatus === 'pending'
  ) {
    return <LoadingSpinner />;
  }

  if (
    cyanWaterbodiesStatus === 'success' ||
    monitoringLocationsStatus === 'success' ||
    streamgagesStatus === 'success'
  ) {
    return (
      <>
        {allMonitoringAndSensors.length > 0 && (
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
              <span>
                {waterwayIcon({ color: '#6c95ce' })}
                &nbsp;Harmful Algal Blooms (HABs)&nbsp;
              </span>
            </div>

            <p>
              Water quality monitoring locations are shown on the map as both
              purple circles and yellow squares.
              <ShowLessMore
                charLimit={0}
                text={
                  <>
                    <span css={showLessMoreStyles}>
                      The yellow squares represent monitoring locations that
                      provide real time water quality measurements for a subset
                      of categories– such as water level, water temperature,
                      dissolved oxygen saturation, and other water quality
                      indicators.
                    </span>
                    <span css={showLessMoreStyles}>
                      The purple circles represent monitoring locations where
                      all other past water conditions data is available. These
                      locations may have monitoring data available from as
                      recently as last week, to multiple decades old, or
                      anywhere in between, depending on the location.
                    </span>
                    <span css={showLessMoreStyles}>
                      Areas highlighted light blue are the lakes, reservoirs,
                      and other large waterbodies where CyAN satellite imagery
                      data is available. Daily data are a snapshot of{' '}
                      <GlossaryTerm term="Cyanobacteria">
                        cyanobacteria
                      </GlossaryTerm>{' '}
                      (sometimes referred to as blue-green algae) at the time of
                      detection.
                    </span>
                    <span css={showLessMoreStyles}>
                      Click on each monitoring location on the map or in the
                      list below to find out more about what was monitored at
                      each location.
                    </span>
                  </>
                }
              />
            </p>
          </>
        )}

        {streamgagesStatus === 'failure' && (
          <div css={modifiedErrorBoxStyles}>
            <p>{streamgagesError}</p>
          </div>
        )}

        {monitoringLocationsStatus === 'failure' && (
          <div css={modifiedErrorBoxStyles}>
            <p>{monitoringError}</p>
          </div>
        )}

        {cyanWaterbodiesStatus === 'failure' && (
          <div css={modifiedErrorBoxStyles}>
            <p>{cyanError}</p>
          </div>
        )}

        {allMonitoringAndSensors.length === 0 && (
          <div css={infoBoxStyles}>
            <p css={centeredTextStyles}>
              There are no locations with data in the <em>{watershed}</em>{' '}
              watershed.
            </p>
          </div>
        )}

        {allMonitoringAndSensors.length > 0 && (
          <>
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
                        checked={
                          monitoringLocations.length > 0 &&
                          monitoringLocationsDisplayed
                        }
                        onChange={handlePastWaterConditionsToggle}
                        disabled={monitoringLocations.length === 0}
                      />
                      <span>Past Water Conditions</span>
                    </label>
                  </td>
                  <td>{monitoringLocations.length}</td>
                </tr>
                <tr>
                  <td>
                    <label css={toggleStyles}>
                      <Switch
                        checked={cyanWaterbodies.length > 0 && cyanDisplayed}
                        onChange={handleHarmfulAlgalBloomsToggle}
                        disabled={cyanWaterbodies.length === 0}
                      />
                      <span>Harmful Algal Blooms (HABs)</span>
                    </label>
                  </td>
                  <td>{cyanWaterbodies.length}</td>
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
                        value: 'totalMeasurements',
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
    return dischargers.sort((a, b) => {
      return (
        (complianceRank[a.CWPStatus] ?? complianceRank.Unknown) -
        (complianceRank[b.CWPStatus] ?? complianceRank.Unknown)
      );
    });
  } else {
    return dischargers.sort((a, b) => {
      if (a[sortBy] && b[sortBy]) {
        return a[sortBy].localeCompare(b[sortBy]);
      } else if (!a[sortBy] && b[sortBy]) {
        return 1;
      } else {
        return -1;
      }
    });
  }
}

function PermittedDischargersTab({
  setPermittedDischargersDisplayed,
  totalPermittedDischargers,
}) {
  const { dischargers, dischargersStatus } = useDischargers();

  const {
    dischargerPermitComponents,
    huc12,
    setDischargerPermitComponents,
    watershed,
  } = useContext(LocationSearchContext);

  const { dischargersLayer } = useLayers();

  const [allToggled, setAllToggled] = useState(true);
  const [displayedDischargers, setDisplayedDischargers] = useState([]);
  const [expandedRows, setExpandedRows] = useState([]);

  const [permittedDischargersSortedBy, setPermittedDischargersSortedBy] =
    useState('CWPName');

  // Filter dischargers
  useEffect(() => {
    if (!dischargersLayer || !dischargerPermitComponents) return;

    const dischargerIds = [];
    let dischargersToDisplay = [];
    if (dischargerPermitComponents.All.toggled) {
      dischargersToDisplay = dischargerPermitComponents.All.dischargers;
    } else {
      // generate a list of discharger ids
      Object.values(dischargerPermitComponents).forEach((group) => {
        if (group.label === 'All' || !group.toggled) return;

        group.dischargers.forEach((discharger) => {
          const uniqueId = discharger.uniqueId;
          if (!dischargerIds.includes(uniqueId)) {
            dischargerIds.push(uniqueId);
            dischargersToDisplay.push(discharger);
          }
        });
      });
    }

    // update the filters on the layer
    if (dischargerPermitComponents.All.toggled) {
      dischargersLayer.definitionExpression = '';
    } else if (dischargerIds.length === 0) {
      dischargersLayer.definitionExpression = '1=0';
    } else {
      dischargersLayer.definitionExpression = `uniqueId IN ('${dischargerIds.join(
        "','",
      )}')`;
    }

    setDisplayedDischargers(dischargersToDisplay);
  }, [dischargerPermitComponents, dischargersLayer]);

  const sortedPermittedDischargers = sortDischarchers(
    displayedDischargers,
    permittedDischargersSortedBy,
  );

  useEffect(() => {
    if (dischargersStatus !== 'success') return;

    const alreadyAdded = [];
    const permitComponents = {
      All: {
        dischargers: [],
        label: 'All',
        toggled: true,
      },
    };

    // build a unique list of permit components
    dischargers.forEach((discharger) => {
      // there can be multiple permit components split by ", "
      const components = discharger.PermitComponents?.split(', ') || [null];

      components.forEach((component) => {
        if (!permitComponents.hasOwnProperty(component)) {
          permitComponents[component] = {
            dischargers: [discharger],
            label: component,
            toggled: true,
          };
        } else {
          permitComponents[component].dischargers.push(discharger);
        }

        if (!alreadyAdded.includes(discharger.uniqueId)) {
          permitComponents['All'].dischargers.push(discharger);
          alreadyAdded.push(discharger.uniqueId);
        }
      });
    });

    setDischargerPermitComponents(permitComponents);
  }, [dischargers, dischargersStatus, setDischargerPermitComponents]);

  const toggleAll = useCallback(() => {
    if (!dischargerPermitComponents) return;

    const updatedGroups = { ...dischargerPermitComponents };
    for (const label in updatedGroups) {
      updatedGroups[label].toggled = !allToggled;
    }
    setPermittedDischargersDisplayed(!allToggled);
    setAllToggled((prev) => !prev);
    setDischargerPermitComponents(updatedGroups);
  }, [
    allToggled,
    dischargerPermitComponents,
    setDischargerPermitComponents,
    setPermittedDischargersDisplayed,
  ]);

  const groupToggleHandler = useCallback(
    (groupLabel) => {
      return function toggleGroup(_ev) {
        if (!dischargerPermitComponents) return;

        const updatedGroups = { ...dischargerPermitComponents };
        updatedGroups[groupLabel].toggled = !updatedGroups[groupLabel].toggled;

        let allOthersToggled = true;
        for (let key in updatedGroups) {
          if (key === 'All') continue;
          if (!updatedGroups[key].toggled) allOthersToggled = false;
        }
        setAllToggled(allOthersToggled);
        updatedGroups.All.toggled = allOthersToggled;

        setDischargerPermitComponents(updatedGroups);

        // only check the toggles that are on the screen
        const someToggled = Object.keys(updatedGroups)
          .filter((label) => label !== 'All')
          .some((key) => updatedGroups[key].toggled);
        setPermittedDischargersDisplayed(someToggled);
      };
    },
    [
      dischargerPermitComponents,
      setDischargerPermitComponents,
      setPermittedDischargersDisplayed,
    ],
  );

  const groupToggleHandlers = useMemo(() => {
    if (!dischargerPermitComponents) return null;

    const toggles = {};
    Object.values(dischargerPermitComponents)
      .filter((group) => group.label !== 'All')
      .forEach((group) => {
        toggles[group.label] = groupToggleHandler(group.label);
      });
    return toggles;
  }, [dischargerPermitComponents, groupToggleHandler]);

  // Reset data if the user switches locations
  useEffect(() => {
    if (!huc12) return;

    return function cleanup() {
      setAllToggled(true);
      if (!dischargersLayer) return;

      dischargersLayer.definitionExpression = '';
    };
  }, [huc12, dischargersLayer]);

  const handleSortChange = useCallback((sortBy) => {
    setPermittedDischargersSortedBy(sortBy.value);
  }, []);

  const handleExpandCollapse = useCallback(
    (allExpanded) => {
      if (allExpanded) {
        setExpandedRows([...Array(sortedPermittedDischargers.length).keys()]);
      } else {
        setExpandedRows([]);
      }
    },
    [sortedPermittedDischargers],
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
    return sortedPermittedDischargers.map((_item, index) => {
      return accordionItemToggleHandler(index);
    });
  }, [accordionItemToggleHandler, sortedPermittedDischargers]);

  const renderListItem = useCallback(
    ({ index }) => {
      const discharger = sortedPermittedDischargers[index];

      const {
        uniqueId: id,
        CWPName: name,
        CWPStatus: status,
        PermitComponents: components,
      } = discharger;

      const feature = {
        geometry: {
          type: 'point',
          longitude: discharger.FacLong,
          latitude: discharger.FacLat,
        },
        attributes: discharger,
      };

      return (
        <AccordionItem
          ariaLabel={name || 'Unknown'}
          icon={diamondIcon({ color: colors.orange() })}
          key={id}
          title={<strong>{name || 'Unknown'}</strong>}
          subTitle={
            <>
              NPDES ID: {id}
              <br />
              Compliance Status: {status}
              <br />
              Permit Components: {components || 'Not Specified'}
            </>
          }
          feature={feature}
          idKey="uniqueId"
          allExpanded={expandedRows.includes(index)}
          onChange={accordionItemToggleHandlers[index]}
        >
          <div css={accordionContentStyles}>
            <WaterbodyInfo type="Permitted Discharger" feature={feature} />

            <ViewOnMapButton feature={feature} />
          </div>
        </AccordionItem>
      );
    },
    [accordionItemToggleHandlers, expandedRows, sortedPermittedDischargers],
  );

  if (dischargersStatus === 'pending') {
    return <LoadingSpinner />;
  }

  if (dischargersStatus === 'failure') {
    return (
      <div css={errorBoxStyles}>
        <p css={centeredTextStyles}>{echoError}</p>
      </div>
    );
  }

  if (dischargersStatus === 'success') {
    return (
      <>
        {totalPermittedDischargers === 0 && (
          <div css={infoBoxStyles}>
            <p css={centeredTextStyles}>
              There are no dischargers in the <em>{watershed}</em> watershed.
            </p>
          </div>
        )}

        {totalPermittedDischargers > 0 && (
          <>
            <div css={legendItemsStyles}>
              <span>
                {diamondIcon({ color: colors.orange() })}
                &nbsp;Permitted Dischargers&nbsp;
              </span>
            </div>

            <table css={toggleTableStyles} className="table">
              <thead>
                <tr>
                  <th>
                    <label css={toggleStyles}>
                      <Switch checked={allToggled} onChange={toggleAll} />
                      <span>All Permit Components</span>
                    </label>
                  </th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {dischargerPermitComponents &&
                  Object.keys(dischargerPermitComponents)
                    .filter((key) => key !== 'All')
                    .sort((a, b) => {
                      if (a === 'null') return 1;
                      return a.localeCompare(b);
                    })
                    .map((key) => {
                      const component = dischargerPermitComponents[key];

                      const componentLabel = !component.label
                        ? 'Not Specified'
                        : component.label;
                      const componentLabelId = `${key.replaceAll(
                        ' ',
                        '-',
                      )}-label`;

                      return (
                        <tr key={key}>
                          <td>
                            <div css={toggleStyles}>
                              <Switch
                                checked={component.toggled}
                                onChange={
                                  groupToggleHandlers?.[component.label]
                                }
                                ariaLabelledBy={componentLabelId}
                              />
                              {componentLabel === 'Not Specified' ? (
                                <span id={componentLabelId}>Not Specified</span>
                              ) : (
                                <span id={componentLabelId}>
                                  <GlossaryTerm term={componentLabel}>
                                    {componentLabel}
                                  </GlossaryTerm>
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{component.dischargers.length}</td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>

            <AccordionList
              ariaLabel="List of Permitted Dischargers"
              title={
                <>
                  <strong>
                    {displayedDischargers.length.toLocaleString()}
                  </strong>{' '}
                  of{' '}
                  <strong>{totalPermittedDischargers.toLocaleString()}</strong>{' '}
                  permitted dischargers in the <em>{watershed}</em> watershed.
                </>
              }
              onSortChange={handleSortChange}
              onExpandCollapse={handleExpandCollapse}
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
                {
                  value: 'PermitComponents',
                  label: 'Permit Components',
                },
              ]}
            >
              <VirtualizedList
                items={sortedPermittedDischargers}
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

export default function OverviewContainer() {
  return (
    <TabErrorBoundary tabName="Overview">
      <Overview />
    </TabErrorBoundary>
  );
}
