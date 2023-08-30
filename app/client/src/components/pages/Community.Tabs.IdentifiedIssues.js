// @flow

import { useCallback, useContext, useEffect, useState } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import { css } from 'styled-components/macro';
import { useNavigate } from 'react-router-dom';
// components
import { tabsStyles } from 'components/shared/ContentTabs';
import {
  AccordionList,
  AccordionItem,
} from 'components/shared/AccordionMapHighlight';
import ViewOnMapButton from 'components/shared/ViewOnMapButton';
import WaterbodyInfo from 'components/shared/WaterbodyInfo';
import { impairmentFields } from 'config/attainsToHmwMapping';
import Switch from 'components/shared/Switch';
import { DisclaimerModal } from 'components/shared/Modal';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { errorBoxStyles, infoBoxStyles } from 'components/shared/MessageBoxes';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import TabErrorBoundary from 'components/shared/ErrorBoundary.TabErrorBoundary';
import {
  keyMetricsStyles,
  keyMetricStyles,
  keyMetricNumberStyles,
  keyMetricLabelStyles,
} from 'components/shared/KeyMetrics';
import { diamondIcon } from 'components/shared/MapLegend';
import WaterbodyIcon from 'components/shared/WaterbodyIcon';
// contexts
import { CommunityTabsContext } from 'contexts/CommunityTabs';
import { useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
// utilities
import { formatNumber } from 'utils/utils';
import { getMappedParameter, plotIssues } from 'utils/mapFunctions';
import { useDischargers, useWaterbodyOnMap } from 'utils/hooks';
// errors
import { echoError, huc12SummaryError } from 'config/errorMessages';
// styles
import {
  tabLegendStyles,
  colors,
  fonts,
  toggleTableStyles,
} from 'styles/index';

const containerStyles = css`
  @media (min-width: 960px) {
    padding: 1em;
  }
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

const toggleStyles = css`
  display: flex;
  align-items: center;
  margin-bottom: 0;

  label {
    margin-bottom: 0;
  }

  & > span {
    margin-left: 0.5rem;
  }
`;

const headingStyles = css`
  margin-top: 1rem;
  margin-bottom: 0.25rem;
  padding-bottom: 0;
  font-family: ${fonts.primary};
  font-size: 1.375em;
`;

function IdentifiedIssues() {
  const navigate = useNavigate();
  const { infoToggleChecked } = useContext(CommunityTabsContext);

  useWaterbodyOnMap('isimpaired');

  const {
    showAllPolluted,
    pollutionParameters,
    setPollutionParameters,
    getAllFeatures,
    setShowAllPolluted,
    cipSummary,
    watershed,
    parameterToggleObject,
    setParameterToggleObject,
    setEffluentToggleObject,
  } = useContext(LocationSearchContext);

  const {
    dischargersLayer,
    issuesLayer,
    updateVisibleLayers,
    visibleLayers,
    waterbodyLayer,
  } = useLayers();

  const { dischargers, dischargersStatus } = useDischargers();

  const [showAllParameters, setShowAllParameters] = useState(false);

  const [showIssuesLayer, setShowIssuesLayer] = useState(true);

  const [showDischargersLayer, setShowDischargersLayer] = useState(false);

  const [showCompliantDischargers, setShowCompliantDischargers] =
    useState(false);
  const [showViolatingDischargers, setShowViolatingDischargers] =
    useState(true);

  // Hide the waterbody layer from the list view on this tab
  useEffect(() => {
    if (waterbodyLayer) waterbodyLayer.listMode = 'hide';
    if (issuesLayer) issuesLayer.listMode = 'show';

    return function cleanup() {
      if (waterbodyLayer) waterbodyLayer.listMode = 'hide-children';
      if (issuesLayer) issuesLayer.listMode = 'hide';
    };
  }, [issuesLayer, waterbodyLayer]);

  const checkWaterbodiesToDisplay = useCallback(() => {
    const waterbodiesToShow = new Set(); // set to prevent duplicates
    const features = getAllFeatures();

    if (!issuesLayer || !waterbodyLayer) return;
    // prevent waterbody layer from showing when deeplinking to Identified Issues page
    waterbodyLayer.visible = false;

    issuesLayer.graphics.removeAll();

    if (features && features.length !== 0) {
      features.forEach((feature) => {
        if (
          feature?.attributes &&
          impairmentFields.findIndex(
            (field) => feature.attributes[field.value] === 'Cause',
          ) !== -1
        ) {
          impairmentFields.forEach((field) => {
            // if impairment is not a cause, ignore it. overview waterbody listview only displays impairments that are causes
            if (feature.attributes[field.value] !== 'Cause') return null;
            else if (parameterToggleObject[field.label] || showAllParameters) {
              feature.attributes.layerType = 'issues';
              waterbodiesToShow.add(feature);
            }
          });
        }
      });
      plotIssues(Array.from(waterbodiesToShow), issuesLayer, navigate);
    }
  }, [
    getAllFeatures,
    issuesLayer,
    parameterToggleObject,
    showAllParameters,
    waterbodyLayer,
    navigate,
  ]);

  // emulate componentdidmount
  const [componentMounted, setComponentMounted] = useState(false);
  useEffect(() => {
    if (componentMounted) return;
    setComponentMounted(true);
    setShowAllParameters(showAllPolluted);
    // use the pollution toggle object from context if available
    if (pollutionParameters) {
      setParameterToggleObject(pollutionParameters);
      return;
    }

    // generate an object with all possible parameters to store which ones are displayed
    const parameterToggles = {};
    impairmentFields.forEach((param) => {
      parameterToggles[param.label] = true;
    });

    setParameterToggleObject(parameterToggles);
    setPollutionParameters(parameterToggles);
  }, [
    showAllPolluted,
    pollutionParameters,
    setComponentMounted,
    componentMounted,
    setParameterToggleObject,
    setShowAllParameters,
    setPollutionParameters,
  ]);

  useEffect(() => {
    checkWaterbodiesToDisplay();

    setShowIssuesLayer(visibleLayers['issuesLayer']);
    setShowDischargersLayer(visibleLayers['dischargersLayer']);
  }, [checkWaterbodiesToDisplay, visibleLayers]);

  // check the data quality and log a non-fatal exception to Google Analytics
  // if necessary
  const [emptyCategoriesWithPercent, setEmptyCategoriesWithPercent] =
    useState(false);
  const [nullPollutedWaterbodies, setNullPollutedWaterbodies] = useState(false);
  useEffect(() => {
    if (!window.gaTarget || cipSummary.status !== 'success') return;

    if (!cipSummary.data?.items?.length > 0) {
      setNullPollutedWaterbodies(true);
      return;
    }

    const {
      assessedCatchmentAreaSqMi,
      containImpairedWatersCatchmentAreaPercent,
      containImpairedWatersCatchmentAreaSqMi,
      summaryByParameterImpairments,
    } = cipSummary.data.items[0];

    // check for empty summaryByParameterImpairments array
    let emptyCategoriesWithPercent = false;
    let pollutedPercent = formatNumber(
      Math.min(
        100,
        (containImpairedWatersCatchmentAreaSqMi / assessedCatchmentAreaSqMi) *
          100,
      ),
    );
    if (pollutedPercent > 0 && summaryByParameterImpairments.length === 0) {
      emptyCategoriesWithPercent = true;
      window.logToGa('send', 'exception', {
        exDescription: `The summaryByParameterImpairments[] array is empty, even though ${pollutedPercent}% of assessed waters are impaired `,
        exFatal: false,
      });
    }

    // check for null percent of assess waters impaired
    const nullPollutedWaterbodies =
      containImpairedWatersCatchmentAreaPercent === null ? true : false;
    if (nullPollutedWaterbodies && summaryByParameterImpairments.length > 0) {
      window.logToGa('send', 'exception', {
        exDescription: `The "% of assessed waters are impaired" value is 0, even though there are ${summaryByParameterImpairments.length} items in the summaryByParameterImpairments[] array.`,
        exFatal: false,
      });
    }

    setEmptyCategoriesWithPercent(emptyCategoriesWithPercent);
    setNullPollutedWaterbodies(nullPollutedWaterbodies);
  }, [cipSummary]);

  const checkIfAllSwitchesToggled = (
    cipSummaryData: Object,
    tempParameterToggleObject: Object,
  ) => {
    const parameters = [];

    // get a list of all parameters displayed in table and push them to array
    cipSummaryData.items[0].summaryByParameterImpairments.forEach((param) => {
      const mappedParameter = getMappedParameter(
        impairmentFields,
        param['parameterGroupName'],
      );

      if (mappedParameter) {
        parameters.push(mappedParameter.label);
      }
    });

    // return true if toggle for a parameter is not checked
    const checkNotCheckedParameters = (param) => {
      return !tempParameterToggleObject[param];
    };

    const checkAnyCheckedParameters = (param) => {
      return tempParameterToggleObject[param];
    };

    if (!parameters.some(checkAnyCheckedParameters)) {
      setShowIssuesLayer(false);

      updateVisibleLayers({ issuesLayer: false });
    } else {
      setShowIssuesLayer(true);
      updateVisibleLayers({ issuesLayer: true });
    }

    // check if any parameters are not checked. if all parameters are checked, set the showAllParameters switch to true
    if (!parameters.some(checkNotCheckedParameters)) {
      setShowAllParameters(true);
      setShowAllPolluted(true);
    } else {
      // just one of the categories was turned off, set Toggle All switch to off
      setShowAllParameters(false);
      setShowAllPolluted(false);
    }
  };

  const toggleSwitch = (checkedSwitch) => {
    // create a temporary object with the previous state
    const tempParameterToggleObject = { ...parameterToggleObject };

    // set all paramters to On and show the issuesLayer
    const toggleOn = () => {
      setShowIssuesLayer(true);
      setShowAllParameters(true);

      for (let property in tempParameterToggleObject) {
        tempParameterToggleObject[property] = true;
      }

      setShowAllPolluted(true);
      updateVisibleLayers({ issuesLayer: true });
    };

    // set all parameters to Off and hide the issuesLayer
    const toggleOff = () => {
      setShowAllParameters(false);
      setShowIssuesLayer(false);

      for (let property in tempParameterToggleObject) {
        tempParameterToggleObject[property] = false;
      }

      setShowAllPolluted(false);
      updateVisibleLayers({ issuesLayer: false });
    };

    // if switch at top of table is switched
    if (checkedSwitch === 'Toggle All') {
      if (showAllParameters === false) {
        toggleOn();
      } else if (showAllParameters === true) {
        toggleOff();
      }
    }
    // if switch under Assessed Waterbodies metric is switched
    else if (checkedSwitch === 'Toggle Issues Layer') {
      if (showAllParameters === false && showIssuesLayer === false) {
        toggleOn();
      } else if (showAllParameters === false && showIssuesLayer === true) {
        toggleOff();
      } else if (showAllParameters === true && showIssuesLayer === true) {
        toggleOff();
      } else if (showAllParameters === true && showIssuesLayer === false) {
        toggleOn();
      }
    }
    // one of the parameters is switched
    else {
      tempParameterToggleObject[checkedSwitch] =
        !parameterToggleObject[checkedSwitch];

      checkIfAllSwitchesToggled(cipSummary.data, tempParameterToggleObject);
    }

    // update the object holding the toggle states and check if any waterbodies need to be hidden or shown
    setPollutionParameters(tempParameterToggleObject);
    setParameterToggleObject(tempParameterToggleObject);
  };

  // Switch under number of Dischargers is switched
  const toggleDischargersLayer = (checked) => {
    setShowDischargersLayer(checked);
    setShowViolatingDischargers(checked);
    setShowCompliantDischargers(checked);
    setEffluentToggleObject({ compliant: checked, violating: checked });
    updateVisibleLayers({ dischargersLayer: checked });
  };

  // Dischargers with significant effluent violations switch is toggled
  const toggleViolatingDischargers = (checked) => {
    setShowViolatingDischargers(checked);
    setEffluentToggleObject({
      compliant: showCompliantDischargers,
      violating: checked,
    });
    const newShowDischargersLayer = checked || showCompliantDischargers;
    setShowDischargersLayer(newShowDischargersLayer);
    if (newShowDischargersLayer !== showDischargersLayer) {
      updateVisibleLayers({ dischargersLayer: newShowDischargersLayer });
    }
  };

  // Dischargers without significant violations switch is toggled
  const toggleCompliantDischargers = (checked) => {
    setShowCompliantDischargers(checked);
    setEffluentToggleObject({
      compliant: checked,
      violating: showViolatingDischargers,
    });
    const newShowDischargersLayer = checked || showViolatingDischargers;
    setShowDischargersLayer(newShowDischargersLayer);
    if (newShowDischargersLayer !== showDischargersLayer) {
      updateVisibleLayers({ dischargersLayer: newShowDischargersLayer });
    }
  };

  const cipServiceReady =
    cipSummary.status !== 'fetching' &&
    cipSummary.data.items &&
    cipSummary.data.items !== 0;

  // ***removed until EPA determines correct value***
  // percentage of waters that are assessed
  // const assessedPercent =
  //   cipServiceReady &&
  //   Math.round(cipSummary.data.items[0].assessedCatchmentAreaPercent);

  // percentage of waters that are polluted
  let pollutedPercent =
    cipServiceReady &&
    formatNumber(
      Math.min(
        100,
        (cipSummary.data.items[0].containImpairedWatersCatchmentAreaSqMi /
          cipSummary.data.items[0].assessedCatchmentAreaSqMi) *
          100,
      ),
    );

  // if 0% of waterbodies are impaired this is true
  const zeroPollutedWaterbodies =
    cipServiceReady &&
    !cipSummary.data.items[0].containImpairedWatersCatchmentAreaPercent;

  let toggleIssuesChecked;

  if (zeroPollutedWaterbodies) {
    // if there are no polluted waterbodies, uncheck the toggle
    toggleIssuesChecked = false;
  } else if (showIssuesLayer) {
    // there are polluted waterbodies and the .state toggle is true
    toggleIssuesChecked = true;
  } else {
    // there are polluted waterbodies and the .state toggle is false
    toggleIssuesChecked = false;
  }

  // true if 0 facilities in violation are found
  const zeroDischargers = !dischargers.length;

  let toggleDischargersChecked;

  if (zeroDischargers) {
    // if there are no dischargers in violation, uncheck the toggle
    toggleDischargersChecked = false;
  } else if (showDischargersLayer) {
    // there are dischargers in violation and the .state toggle is true
    toggleDischargersChecked = true;
  } else {
    // there are dischargers in violation and the state toggle is false
    toggleDischargersChecked = false;
  }

  function handleTabClick(index) {
    if (index === 0 && !toggleIssuesChecked)
      toggleSwitch('Toggle Issues Layer');
    if (index === 1 && !toggleDischargersChecked) toggleDischargersLayer(true);
  }

  function getImpairedWatersPercent() {
    if (cipSummary.status === 'failure') return 'N/A';
    return nullPollutedWaterbodies ? 'N/A %' : `${pollutedPercent ?? 0}%`;
  }

  // Reset the dischargers layer filter when leaving the tab
  useEffect(() => {
    return function cleanup() {
      if (dischargersLayer) dischargersLayer.definitionExpression = '';
      setEffluentToggleObject(null);
    };
  }, [dischargersLayer, setEffluentToggleObject]);

  const violatingDischargers = [];
  const compliantDischargers = [];
  dischargers.forEach((discharger) => {
    if (discharger['CWPSNCStatus']?.toLowerCase().includes('effluent')) {
      violatingDischargers.push(discharger);
    } else {
      compliantDischargers.push(discharger);
    }
  });

  const displayedDischargers = [
    ...(showViolatingDischargers ? violatingDischargers : []),
    ...(showCompliantDischargers ? compliantDischargers : []),
  ];

  const displayedDischargerIds = displayedDischargers.map(
    (discharger) => discharger.uniqueId,
  );

  let dischargersLayerFilter = '';
  if (displayedDischargerIds.length === 0) dischargersLayerFilter = '1=0';
  else if (displayedDischargerIds.length !== dischargers.length) {
    dischargersLayerFilter = `uniqueId IN ('${displayedDischargerIds.join(
      "','",
    )}')`;
  }

  const [prevDischargersLayerFilter, setPrevDischagersLayerFilter] =
    useState('');
  if (
    dischargersLayer &&
    showDischargersLayer &&
    dischargersLayerFilter !== prevDischargersLayerFilter
  ) {
    dischargersLayer.definitionExpression = dischargersLayerFilter;
    setPrevDischagersLayerFilter(dischargersLayerFilter);
  }

  return (
    <div css={containerStyles}>
      <div css={keyMetricsStyles}>
        <div css={keyMetricStyles}>
          {cipSummary.status === 'fetching' ? (
            <LoadingSpinner />
          ) : (
            <label css={switchContainerStyles}>
              <span css={keyMetricNumberStyles}>
                {getImpairedWatersPercent()}
              </span>
              <p css={keyMetricLabelStyles}>of Assessed Waters are impaired</p>
              <Switch
                checked={toggleIssuesChecked && cipSummary.status !== 'failure'}
                onChange={() => toggleSwitch('Toggle Issues Layer')}
                disabled={
                  zeroPollutedWaterbodies || cipSummary.status === 'failure'
                }
              />
            </label>
          )}
        </div>

        <div css={keyMetricStyles}>
          {dischargersStatus === 'pending' ? (
            <LoadingSpinner />
          ) : (
            <label css={switchContainerStyles}>
              <span css={keyMetricNumberStyles}>
                {dischargersStatus === 'failure'
                  ? 'N/A'
                  : dischargers.length.toLocaleString()}
              </span>
              <p css={keyMetricLabelStyles}>Permitted Dischargers</p>
              <Switch
                checked={toggleDischargersChecked}
                onChange={toggleDischargersLayer}
                disabled={zeroDischargers}
              />
            </label>
          )}
        </div>
      </div>

      <div css={tabsStyles}>
        <Tabs onChange={handleTabClick}>
          <TabList>
            <Tab>Impaired Assessed Waters</Tab>
            <Tab data-testid="hmw-dischargers">Permitted Dischargers</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              {cipSummary.status === 'fetching' && <LoadingSpinner />}

              {(cipSummary.status === 'failure' ||
                (cipSummary.status === 'success' &&
                  !cipSummary.data?.items)) && (
                <div css={errorBoxStyles}>
                  <p>{huc12SummaryError}</p>
                </div>
              )}

              {cipSummary.status === 'success' && (
                <>
                  {(cipSummary.data.count === 0 ||
                    (cipSummary.data.items &&
                      cipSummary.data.items.length === 0)) && (
                    <div css={infoBoxStyles}>
                      <p css={centeredTextStyles}>
                        There are no impairment categories in the{' '}
                        <em>{watershed}</em> watershed.
                      </p>
                    </div>
                  )}

                  {cipSummary.data.items &&
                    cipSummary.data.items.length > 0 && (
                      <>
                        <p>
                          {/* NOTE: removed until EPA determines correct value */}
                          {/* {assessedPercent > 0 && (
                          <span>
                            <strong>{assessedPercent}%</strong> of waters in
                            your watershed have been assessed.
                            <br />
                            Of those assessed,{' '}
                            <strong>{pollutedPercent}</strong>% are impaired
                            (shown in{' '}
                            <strong style={{ color: 'rgb(249, 59, 91)' }}>
                              red
                            </strong>
                            ).
                          </span>
                        )}
                        <br /> */}

                          <DisclaimerModal>
                            <p>
                              The condition of a waterbody is dynamic and can
                              change at any time, and the information in How’s
                              My Waterway should only be used for general
                              reference. If available, refer to local or state
                              real-time water quality reports.
                            </p>

                            <p>
                              Furthermore, users of this application should not
                              rely on information relating to environmental laws
                              and regulations posted on this application.
                              Application users are solely responsible for
                              ensuring that they are in compliance with all
                              relevant environmental laws and regulations. In
                              addition, EPA cannot attest to the accuracy of
                              data provided by organizations outside of the
                              federal government.
                            </p>
                          </DisclaimerModal>
                        </p>

                        {emptyCategoriesWithPercent && (
                          <p css={centeredTextStyles}>
                            Impairment Summary information is temporarily
                            unavailable for the <em>{watershed}</em> watershed.
                            Please see the Overview tab for specific impairment
                            information on these waters.
                          </p>
                        )}

                        {!emptyCategoriesWithPercent &&
                          zeroPollutedWaterbodies && (
                            <div css={infoBoxStyles}>
                              <p css={centeredTextStyles}>
                                There are no impairment categories in the{' '}
                                <em>{watershed}</em> watershed.
                              </p>
                            </div>
                          )}

                        {!emptyCategoriesWithPercent &&
                          !zeroPollutedWaterbodies && (
                            <>
                              <div css={tabLegendStyles}>
                                <span>
                                  <WaterbodyIcon
                                    condition="polluted"
                                    selected={false}
                                  />
                                  &nbsp;Impaired Assessed Waters&nbsp;
                                </span>
                              </div>

                              <p>
                                Impairment categories in the{' '}
                                <em>{watershed}</em> watershed.
                              </p>

                              <table css={toggleTableStyles} className="table">
                                <thead>
                                  <tr>
                                    <th>
                                      <label css={toggleStyles}>
                                        <Switch
                                          checked={showAllParameters}
                                          onChange={(_ev) => {
                                            toggleSwitch('Toggle All');
                                          }}
                                        />
                                        <span>Identified Issues</span>
                                      </label>
                                    </th>
                                    <th>% of Assessed Area</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {cipSummary.data.items[0].summaryByParameterImpairments.map(
                                    (param) => {
                                      const percent = formatNumber(
                                        Math.min(
                                          100,
                                          (param['catchmentSizeSqMi'] /
                                            cipSummary.data.items[0]
                                              .assessedCatchmentAreaSqMi) *
                                            100,
                                        ),
                                      );

                                      const mappedParameter =
                                        getMappedParameter(
                                          impairmentFields,
                                          param['parameterGroupName'],
                                        );
                                      // if service contains a parameter we have no mapping for
                                      if (!mappedParameter) return false;

                                      const parameterLabelId = `${mappedParameter.label.replaceAll(
                                        ' ',
                                        '-',
                                      )}-label`;
                                      return (
                                        <tr key={mappedParameter.label}>
                                          <td>
                                            <div css={toggleStyles}>
                                              <Switch
                                                ariaLabelledBy={
                                                  parameterLabelId
                                                }
                                                checked={
                                                  parameterToggleObject[
                                                    mappedParameter.label
                                                  ]
                                                }
                                                onChange={(_ev) => {
                                                  toggleSwitch(
                                                    mappedParameter.label,
                                                  );
                                                }}
                                              />
                                              <span id={parameterLabelId}>
                                                <GlossaryTerm
                                                  term={mappedParameter.term}
                                                >
                                                  {mappedParameter.label}
                                                </GlossaryTerm>
                                              </span>
                                            </div>
                                          </td>
                                          <td>
                                            {nullPollutedWaterbodies === true
                                              ? 'N/A'
                                              : percent + '%'}
                                          </td>
                                        </tr>
                                      );
                                    },
                                  )}
                                </tbody>
                              </table>
                            </>
                          )}
                      </>
                    )}
                </>
              )}
            </TabPanel>

            <TabPanel>
              {dischargersStatus === 'pending' && <LoadingSpinner />}

              {dischargersStatus === 'failure' && (
                <div css={errorBoxStyles}>
                  <p>{echoError}</p>
                </div>
              )}

              {dischargersStatus === 'success' && (
                <>
                  {!dischargers.length && (
                    <div css={infoBoxStyles}>
                      <p css={centeredTextStyles}>
                        There are no dischargers in the <em>{watershed}</em>{' '}
                        watershed.
                      </p>
                    </div>
                  )}

                  {dischargers.length > 0 && (
                    <>
                      <div css={tabLegendStyles}>
                        <span>
                          {diamondIcon({ color: colors.orange() })}
                          &nbsp;Permitted Dischargers&nbsp;
                        </span>
                      </div>

                      <table css={toggleTableStyles} className="table">
                        <thead>
                          <tr>
                            <th>
                              <span>All Permitted Dischargers</span>
                            </th>
                            <th>Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <label css={toggleStyles}>
                                <Switch
                                  checked={showViolatingDischargers}
                                  onChange={toggleViolatingDischargers}
                                  disabled={!violatingDischargers.length}
                                />
                                <span>
                                  Dischargers with Significant{' '}
                                  <GlossaryTerm term="Effluent">
                                    Effluent
                                  </GlossaryTerm>{' '}
                                  Violations
                                </span>
                              </label>
                            </td>
                            <td>
                              {violatingDischargers.length.toLocaleString()}
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <label css={toggleStyles}>
                                <Switch
                                  checked={showCompliantDischargers}
                                  onChange={toggleCompliantDischargers}
                                  disabled={!compliantDischargers.length}
                                />
                                <span>
                                  Dischargers without Significant Violations
                                </span>
                              </label>
                            </td>
                            <td>
                              {compliantDischargers.length.toLocaleString()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      <AccordionList
                        title={
                          <>
                            <strong>
                              {displayedDischargers.length.toLocaleString()}
                            </strong>{' '}
                            of{' '}
                            <strong>
                              {dischargers.length.toLocaleString()}
                            </strong>{' '}
                            permitted dischargers in the <em>{watershed}</em>{' '}
                            watershed.
                          </>
                        }
                      >
                        {displayedDischargers.map((discharger) => {
                          const {
                            uniqueId: id,
                            CWPName: name,
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
                              key={id}
                              title={<strong>{name || 'Unknown'}</strong>}
                              subTitle={
                                <>
                                  NPDES ID: {id}
                                  <br />
                                  Permit Components:{' '}
                                  {components || 'Components Not Specified'}
                                </>
                              }
                              feature={feature}
                              idKey="uniqueId"
                            >
                              <div css={accordionContentStyles}>
                                <WaterbodyInfo
                                  type="Permitted Discharger"
                                  feature={feature}
                                />
                                <ViewOnMapButton feature={feature} />
                              </div>
                            </AccordionItem>
                          );
                        })}
                      </AccordionList>
                    </>
                  )}
                </>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>

      {infoToggleChecked && (
        <>
          <h2 css={headingStyles}>Did You Know?</h2>

          <ul>
            <li>
              Impairments take many forms, often a result of human behavior.
              Water impairments are identified across 34 categories such as
              algae, mercury, pathogens, pesticides, trash and more.
            </li>
            <li>
              Impairments can enter your water through runoff, water discharge
              from a building, and from the breakdown of water infrastructure
              like sewers and pipes
            </li>
          </ul>
        </>
      )}
    </div>
  );
}

export default function IdentifiedIssuesContainer() {
  return (
    <TabErrorBoundary tabName="Identified Issues">
      <IdentifiedIssues />
    </TabErrorBoundary>
  );
}
