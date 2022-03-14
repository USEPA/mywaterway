// @flow

import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import { css } from 'styled-components/macro';
import Graphic from '@arcgis/core/Graphic';
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
import DisclaimerModal from 'components/shared/DisclaimerModal';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { errorBoxStyles } from 'components/shared/MessageBoxes';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import TabErrorBoundary from 'components/shared/ErrorBoundary.TabErrorBoundary';
import {
  keyMetricsStyles,
  keyMetricStyles,
  keyMetricNumberStyles,
  keyMetricLabelStyles,
} from 'components/shared/KeyMetrics';
// contexts
import { CommunityTabsContext } from 'contexts/CommunityTabs';
import { LocationSearchContext } from 'contexts/locationSearch';
// utilities
import { formatNumber } from 'utils/utils';
import { plotFacilities, plotIssues } from 'utils/mapFunctions';
// errors
import { echoError, huc12SummaryError } from 'config/errorMessages';
// styles
import { fonts, toggleTableStyles } from 'styles/index.js';

const containerStyles = css`
  @media (min-width: 960px) {
    padding: 1em;
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

const headingStyles = css`
  margin-top: 1rem;
  margin-bottom: 0.25rem;
  padding-bottom: 0;
  font-family: ${fonts.primary};
  font-size: 1.375em;
`;

function IdentifiedIssues() {
  const { infoToggleChecked } = useContext(CommunityTabsContext);

  const {
    permittedDischargers,
    dischargersLayer,
    issuesLayer,
    waterbodyLayer,
    showAllPolluted,
    pollutionParameters,
    setPollutionParameters,
    visibleLayers,
    getAllFeatures,
    setVisibleLayers,
    setShowAllPolluted,
    cipSummary,
    watershed,
  } = useContext(LocationSearchContext);

  const [permittedDischargersData, setPermittedDischargersData] = useState({});

  const [parameterToggleObject, setParameterToggleObject] = useState({});

  const [violatingFacilities, setStateViolatingFacilities] = useState([]);

  const [showAllParameters, setShowAllParameters] = useState(false);

  const [showIssuesLayer, setShowIssuesLayer] = useState(true);

  const [showDischargersLayer, setShowDischargersLayer] = useState(true);

  const setViolatingFacilities = useCallback(
    (data: Object) => {
      if (!data || !data['Results'] || !data['Results']['Facilities']) return;
      const violatingFacilities = data['Results']['Facilities'].filter(
        (fac) => {
          return (
            fac['CWPSNCStatus'] &&
            fac['CWPSNCStatus'].toLowerCase().indexOf('effluent') !== -1
          );
        },
      );

      // if the permitter discharger data has changed from a new search
      if (permittedDischargersData !== permittedDischargers.data) {
        setPermittedDischargersData(permittedDischargers.data);
        setStateViolatingFacilities(violatingFacilities);
      }
    },
    [permittedDischargers, permittedDischargersData],
  );

  const checkDischargersToDisplay = useCallback(() => {
    if (!dischargersLayer || !showDischargersLayer) return;

    plotFacilities({
      facilities: violatingFacilities,
      layer: dischargersLayer,
    });
  }, [dischargersLayer, showDischargersLayer, violatingFacilities]);

  // translate scientific parameter names
  const getMappedParameterName = (
    parameterFields: Object,
    parameter: string,
  ) => {
    const filteredFields = parameterFields.filter(
      (field) => parameter === field.parameterGroup,
    )[0];
    if (!filteredFields) {
      return null;
    }

    return filteredFields.label;
  };

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
          feature &&
          feature.attributes &&
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
      plotIssues(Array.from(waterbodiesToShow), issuesLayer);
    }
  }, [
    getAllFeatures,
    issuesLayer,
    parameterToggleObject,
    showAllParameters,
    waterbodyLayer,
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

  // emulate componentdidupdate
  const mounted = useRef();
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
    } else {
      checkWaterbodiesToDisplay();
      checkDischargersToDisplay();

      if (
        permittedDischargersData !== permittedDischargers.data &&
        dischargersLayer &&
        issuesLayer
      ) {
        setViolatingFacilities(permittedDischargers.data);
        checkDischargersToDisplay();
        dischargersLayer.graphics.removeAll();
      }

      if (
        showIssuesLayer !== visibleLayers['issuesLayer'] ||
        showDischargersLayer !== visibleLayers['dischargersLayer']
      ) {
        setShowIssuesLayer(visibleLayers['issuesLayer']);
        setShowDischargersLayer(visibleLayers['dischargersLayer']);
      }
    }
  }, [
    checkWaterbodiesToDisplay,
    checkDischargersToDisplay,
    permittedDischargersData,
    permittedDischargers.data,
    dischargersLayer,
    issuesLayer,
    showIssuesLayer,
    visibleLayers,
    showDischargersLayer,
    setViolatingFacilities,
  ]);

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

  // Updates the visible layers. This function also takes into account whether
  // or not the underlying webservices failed.
  const updateVisibleLayers = useCallback(
    ({ key = null, newValue = null, useCurrentValue = false }) => {
      const newVisibleLayers = {};
      if (cipSummary.status !== 'failure') {
        newVisibleLayers['issuesLayer'] =
          !issuesLayer || useCurrentValue
            ? visibleLayers['issuesLayer']
            : showIssuesLayer;
      }
      if (permittedDischargers.status !== 'failure') {
        newVisibleLayers['dischargersLayer'] =
          !dischargersLayer || useCurrentValue
            ? visibleLayers['dischargersLayer']
            : showDischargersLayer;
      }

      if (newVisibleLayers.hasOwnProperty(key)) {
        newVisibleLayers[key] = newValue;
      }

      // set the visible layers if something changed
      if (JSON.stringify(visibleLayers) !== JSON.stringify(newVisibleLayers)) {
        setVisibleLayers(newVisibleLayers);
      }
    },
    [
      dischargersLayer,
      showDischargersLayer,
      permittedDischargers,
      issuesLayer,
      showIssuesLayer,
      cipSummary,
      visibleLayers,
      setVisibleLayers,
    ],
  );

  // Updates visible layers based on webservice statuses.
  useEffect(() => {
    updateVisibleLayers({ useCurrentValue: true });
  }, [cipSummary, permittedDischargers, visibleLayers, updateVisibleLayers]);

  const checkIfAllSwitchesToggled = (
    cipSummaryData: Object,
    tempParameterToggleObject: Object,
  ) => {
    const parameters = [];

    // get a list of all parameters displayed in table and push them to array
    cipSummaryData.items[0].summaryByParameterImpairments.forEach((param) => {
      const mappedParameterName = getMappedParameterName(
        impairmentFields,
        param['parameterGroupName'],
      );

      if (mappedParameterName) {
        parameters.push(mappedParameterName);
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

      updateVisibleLayers({ key: 'issuesLayer', newValue: false });
    } else {
      setShowIssuesLayer(true);
      updateVisibleLayers({ key: 'issuesLayer', newValue: true });
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

  const toggleSwitch = (checkedSwitch: SwitchNames) => {
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
      updateVisibleLayers({ key: 'issuesLayer', newValue: true });
    };

    // set all parameters to Off and hide the issuesLayer
    const toggleOff = () => {
      setShowAllParameters(false);
      setShowIssuesLayer(false);

      for (let property in tempParameterToggleObject) {
        tempParameterToggleObject[property] = false;
      }

      setShowAllPolluted(false);
      updateVisibleLayers({ key: 'issuesLayer', newValue: false });
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
    // if switch under number of Dischargers in violation is switched
    else if (checkedSwitch === 'Toggle Dischargers Layer') {
      setShowDischargersLayer(!showDischargersLayer);
      checkDischargersToDisplay();

      updateVisibleLayers({
        key: 'dischargersLayer',
        newValue: dischargersLayer && !showDischargersLayer,
      });
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
    !Boolean(
      cipSummary.data.items[0].containImpairedWatersCatchmentAreaPercent,
    );

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
  const zeroDischargers =
    violatingFacilities && !Boolean(violatingFacilities.length);

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

  function getImpairedWatersPercent() {
    if (cipSummary.status === 'failure') return 'N/A';
    return nullPollutedWaterbodies ? 'N/A %' : `${pollutedPercent}%` || 0 + '%';
  }

  return (
    <div css={containerStyles}>
      <div css={keyMetricsStyles}>
        <div css={keyMetricStyles}>
          {cipSummary.status === 'fetching' ? (
            <LoadingSpinner />
          ) : (
            <>
              <span css={keyMetricNumberStyles}>
                {getImpairedWatersPercent()}
              </span>
              <p css={keyMetricLabelStyles}>of Assessed Waters are impaired</p>
              <div css={switchContainerStyles}>
                <Switch
                  checked={
                    toggleIssuesChecked && cipSummary.status !== 'failure'
                  }
                  onChange={() => toggleSwitch('Toggle Issues Layer')}
                  disabled={
                    zeroPollutedWaterbodies || cipSummary.status === 'failure'
                  }
                  ariaLabel="Toggle Issues Layer"
                />
              </div>
            </>
          )}
        </div>

        <div css={keyMetricStyles}>
          {permittedDischargers.status === 'fetching' ? (
            <LoadingSpinner />
          ) : (
            <>
              <span css={keyMetricNumberStyles}>
                {permittedDischargers.status === 'failure'
                  ? 'N/A'
                  : violatingFacilities.length.toLocaleString()}
              </span>
              <p css={keyMetricLabelStyles}>
                Dischargers with Significant Violations
              </p>
              <div css={switchContainerStyles}>
                <Switch
                  checked={toggleDischargersChecked}
                  onChange={() => toggleSwitch('Toggle Dischargers Layer')}
                  disabled={zeroDischargers}
                  ariaLabel="Toggle Dischargers Layer"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div css={tabsStyles}>
        <Tabs>
          <TabList>
            <Tab>Impaired Assessed Waters</Tab>
            <Tab data-testid="hmw-dischargers">
              Dischargers with Significant Violations
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              {cipSummary.status === 'fetching' && <LoadingSpinner />}

              {(cipSummary.status === 'failure' || !cipSummary.data?.items) && (
                <div css={errorBoxStyles}>
                  <p>{huc12SummaryError}</p>
                </div>
              )}

              {cipSummary.status === 'success' && (
                <>
                  {(cipSummary.data.count === 0 ||
                    (cipSummary.data.items &&
                      cipSummary.data.items.length === 0)) && (
                    <p css={centeredTextStyles}>
                      There are no impairment categories in the{' '}
                      <em>{watershed}</em> watershed.
                    </p>
                  )}

                  {cipSummary.data.items && cipSummary.data.items.length > 0 && (
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
                            change at any time, and the information in How’s My
                            Waterway should only be used for general reference.
                            If available, refer to local or state real-time
                            water quality reports.
                          </p>

                          <p>
                            Furthermore, users of this application should not
                            rely on information relating to environmental laws
                            and regulations posted on this application.
                            Application users are solely responsible for
                            ensuring that they are in compliance with all
                            relevant environmental laws and regulations. In
                            addition, EPA cannot attest to the accuracy of data
                            provided by organizations outside of the federal
                            government.
                          </p>
                        </DisclaimerModal>
                      </p>

                      {emptyCategoriesWithPercent && (
                        <p css={centeredTextStyles}>
                          Impairment Summary information is temporarily
                          unavailable for the {watershed} watershed. Please see
                          the Overview tab for specific impairment information
                          on these waters.
                        </p>
                      )}

                      {!emptyCategoriesWithPercent && zeroPollutedWaterbodies && (
                        <p css={centeredTextStyles}>
                          There are no impairment categories in the{' '}
                          <em>{watershed}</em> watershed.
                        </p>
                      )}

                      {!emptyCategoriesWithPercent && !zeroPollutedWaterbodies && (
                        <>
                          <p>
                            Impairment categories in the {watershed} watershed.
                          </p>

                          <table css={toggleTableStyles} className="table">
                            <thead>
                              <tr>
                                <th>
                                  <div css={toggleStyles}>
                                    <Switch
                                      checked={showAllParameters}
                                      onChange={(ev) => {
                                        toggleSwitch('Toggle All');
                                      }}
                                      ariaLabel="Toggle all impairment categories"
                                    />
                                    <span>Impairment Category</span>
                                  </div>
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

                                  const mappedParameterName =
                                    getMappedParameterName(
                                      impairmentFields,
                                      param['parameterGroupName'],
                                    );
                                  // if service contains a parameter we have no mapping for
                                  if (!mappedParameterName) return false;

                                  return (
                                    <tr key={mappedParameterName}>
                                      <td>
                                        <div css={toggleStyles}>
                                          <Switch
                                            ariaLabel={mappedParameterName}
                                            checked={
                                              parameterToggleObject[
                                                mappedParameterName
                                              ]
                                            }
                                            onChange={(ev) => {
                                              toggleSwitch(mappedParameterName);
                                            }}
                                          />
                                          <span>{mappedParameterName}</span>
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
              {permittedDischargers.status === 'fetching' && <LoadingSpinner />}

              {permittedDischargers.status === 'failure' && (
                <div css={errorBoxStyles}>
                  <p>{echoError}</p>
                </div>
              )}

              {permittedDischargers.status === 'success' && (
                <>
                  {violatingFacilities.length === 0 && (
                    <p css={centeredTextStyles}>
                      There are no dischargers with significant{' '}
                      <GlossaryTerm term="Effluent">effluent</GlossaryTerm>{' '}
                      violations in the <em>{watershed}</em> watershed.
                    </p>
                  )}

                  {violatingFacilities.length > 0 && (
                    <AccordionList
                      title={
                        <>
                          There{' '}
                          {violatingFacilities.length === 1 ? 'is' : 'are'}{' '}
                          <strong>
                            {violatingFacilities.length.toLocaleString()}
                          </strong>{' '}
                          {violatingFacilities.length === 1
                            ? 'discharger'
                            : 'dischargers'}{' '}
                          with significant{' '}
                          <GlossaryTerm term="Effluent">effluent</GlossaryTerm>{' '}
                          violations in the <em>{watershed}</em> watershed.
                        </>
                      }
                    >
                      {violatingFacilities.map((item, index) => {
                        const feature = new Graphic({
                          geometry: {
                            type: 'point',
                            longitude: item.FacLong,
                            latitude: item.FacLat,
                          },
                          attributes: item,
                        });

                        return (
                          <AccordionItem
                            key={index}
                            title={<strong>{item.CWPName || 'Unknown'}</strong>}
                            subTitle={<>NPDES ID: {item.SourceID}</>}
                            feature={feature}
                            idKey="CWPName"
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

export default function IdentifiedIssuesContainer({ ...props }: Props) {
  return (
    <TabErrorBoundary tabName="Identified Issues">
      <IdentifiedIssues {...props} />
    </TabErrorBoundary>
  );
}
