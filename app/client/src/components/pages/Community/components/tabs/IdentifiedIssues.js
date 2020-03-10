// @flow

import React from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import styled from 'styled-components';
// components
import { ContentTabs } from 'components/shared/ContentTabs';
import {
  AccordionList,
  AccordionItem,
} from 'components/shared/Accordion/MapHighlight';
import ViewOnMapButton from 'components/shared/ViewOnMapButton';
import WaterbodyInfo from 'components/shared/WaterbodyInfo';
import { impairmentFields } from 'config/attainsToHmwMapping';
import Switch from 'components/shared/Switch';
import DisclaimerModal from 'components/shared/DisclaimerModal';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { StyledErrorBox } from 'components/shared/MessageBoxes';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import TabErrorBoundary from 'components/shared/ErrorBoundary/TabErrorBoundary';
// styled components
import {
  StyledMetrics,
  StyledMetric,
  StyledNumber,
  StyledLabel,
} from 'components/shared/KeyMetrics';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
// utilities
import { formatNumber } from 'utils/utils';
import {
  plotFacilities,
  plotIssues,
} from 'components/pages/LocationMap/MapFunctions';
// styles
import { fonts } from 'styles/index.js';
// errors
import { echoError, huc12SummaryError } from 'config/errorMessages';

// --- styled components ---
const Container = styled.div`
  padding: 1em;
`;

const Disclaimer = styled(DisclaimerModal)`
  /* */
`;

const Text = styled.p`
  text-align: center;
`;

const Table = styled.table`
  th:last-of-type,
  td:last-of-type {
    text-align: right;
  }
`;

const Heading = styled.h3`
  margin-top: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 0;
  font-family: ${fonts.primary};
  font-size: 1.375em;
`;

const SwitchContainer = styled.div`
  margin-top: 0.5em;
`;

const TableSwitch = styled.div`
  margin-right: 0.5em;
`;

const FlexDiv = styled.div`
  display: flex;
`;

// ***removed until EPA determines correct value***
// const MapKeyText = styled.span`
//   color: rgb(249, 59, 91);
//   font-weight: bold;
// `;

const Title = styled.p`
  padding-bottom: 0.3em 1em;
`;

const THead = styled.thead`
  background-color: #f0f6f9;
`;

const IntroDiv = styled.div`
  margin-bottom: 20px;
`;

// --- components ---
type Props = {
  // props passed implicitly in Community component
  esriModules: Object,
  infoToggleChecked: boolean,
};

type State = {
  violatingFacilities: Array<Object>,
  parameterToggleObject: Object,
  showAllParameters: boolean,
  showIssuesLayer: boolean,
  showDischargersLayer: boolean,
  permittedDischargersData: Object,
};

class IdentifiedIssues extends React.Component<Props, State> {
  static contextType = LocationSearchContext;

  state: State = {
    violatingFacilities: [],
    parameterToggleObject: {},
    showAllParameters: false,
    showIssuesLayer: true,
    showDischargersLayer: true,
    permittedDischargersData: {},
  };

  setViolatingFacilities = (data: Object) => {
    if (!data || !data['Results'] || !data['Results']['Facilities']) return;
    const violatingFacilities = data['Results']['Facilities'].filter((fac) => {
      return (
        fac['CWPSNCStatus'] &&
        fac['CWPSNCStatus'].toLowerCase().indexOf('effluent') !== -1
      );
    });

    // if the permitter discharger data has changed from a new search
    if (
      this.state.permittedDischargersData !==
      this.context.permittedDischargers.data
    ) {
      this.setState({
        permittedDischargersData: this.context.permittedDischargers.data,
        violatingFacilities,
      });
    }
  };

  convertFacilityToGraphic = (facility: Object) => {
    const { Graphic } = this.props.esriModules;

    return new Graphic({
      geometry: {
        type: 'point', // autocasts as new Point()
        longitude: facility['FacLong'],
        latitude: facility['FacLat'],
      },
      symbol: {
        type: 'simple-marker', // autocasts as new SimpleMarkerSymbol()
        color: '#246007',
        style: 'diamond',
      },
      attributes: facility,
    });
  };

  checkDischargersToDisplay = () => {
    const { violatingFacilities, showDischargersLayer } = this.state;
    const { Graphic } = this.props.esriModules;
    const { dischargersLayer } = this.context;

    if (!dischargersLayer || !showDischargersLayer) return;

    plotFacilities({
      Graphic: Graphic,
      facilities: violatingFacilities,
      layer: dischargersLayer,
    });
  };

  // translate scientific parameter names
  getMappedParameterName = (parameterFields: Object, parameter: String) => {
    const filteredFields = parameterFields.filter(
      (field) => parameter === field.parameterGroup,
    )[0];
    if (!filteredFields) {
      return null;
    }

    return filteredFields.label;
  };

  checkWaterbodiesToDisplay = () => {
    const { parameterToggleObject, showAllParameters } = this.state;
    const waterbodiesToShow = new Set(); // set to prevent duplicates
    const { Graphic } = this.props.esriModules;
    const { issuesLayer, waterbodyLayer } = this.context;
    const features = this.context.getAllFeatures();

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
      plotIssues(Graphic, Array.from(waterbodiesToShow), issuesLayer);
    }
  };

  componentDidMount() {
    // use the pollution toggle object from context if available
    const {
      showAllPolluted,
      pollutionParameters,
      setPollutionParameters,
    } = this.context;
    if (pollutionParameters) {
      this.setState({ parameterToggleObject: pollutionParameters });
      return;
    }

    // generate an object with all possible parameters to store which ones are displayed
    const parameterToggles = {};
    impairmentFields.forEach((param) => {
      parameterToggles[param.label] = true;
    });

    this.setState({
      showAllParameters: showAllPolluted,
      parameterToggleObject: parameterToggles,
    });
    setPollutionParameters(parameterToggles);
  }

  componentDidUpdate() {
    this.checkWaterbodiesToDisplay();
    this.checkDischargersToDisplay();

    if (
      this.state.permittedDischargersData !==
        this.context.permittedDischargers.data &&
      this.context.dischargersLayer &&
      this.context.issuesLayer
    ) {
      this.setViolatingFacilities(this.context.permittedDischargers.data);
      this.checkDischargersToDisplay();
      this.context.dischargersLayer.graphics.removeAll();
    }

    const { visibleLayers } = this.context;
    if (
      this.state.showIssuesLayer !== visibleLayers['issuesLayer'] ||
      this.state.showDischargersLayer !== visibleLayers['dischargersLayer']
    ) {
      this.setState({
        showIssuesLayer: visibleLayers['issuesLayer'],
        showDischargersLayer: visibleLayers['dischargersLayer'],
      });
    }
  }

  checkIfAllSwitchesToggled = (
    cipSummaryData: Object,
    tempParameterToggleObject: Object,
  ) => {
    const parameters = [];
    const { issuesLayer, dischargersLayer, setVisibleLayers } = this.context;

    // get a list of all parameters displayed in table and push them to array
    cipSummaryData.items[0].summaryByParameterImpairments.forEach((param) => {
      const mappedParameterName = this.getMappedParameterName(
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
      this.setState({
        showIssuesLayer: false,
      });
      setVisibleLayers({
        issuesLayer: false,
        dischargersLayer: dischargersLayer && this.state.showDischargersLayer,
      });
    } else {
      this.setState({
        showIssuesLayer: true,
      });
      setVisibleLayers({
        issuesLayer: issuesLayer && true,
        dischargersLayer: dischargersLayer && this.state.showDischargersLayer,
      });
    }

    // check if any parameters are not checked. if all parameters are checked, set the showAllParameters switch to true
    if (!parameters.some(checkNotCheckedParameters)) {
      this.setState({
        showAllParameters: true,
      });
      this.context.setShowAllPolluted(true);
    } else {
      // just one of the categories was turned off, set Toggle All switch to off
      this.setState({
        showAllParameters: false,
      });
      this.context.setShowAllPolluted(false);
    }
  };

  toggleSwitch = (checkedSwitch: SwitchNames) => {
    const {
      parameterToggleObject,
      showAllParameters,
      showIssuesLayer,
    } = this.state;
    const {
      cipSummary,
      issuesLayer,
      dischargersLayer,
      setVisibleLayers,
      setPollutionParameters,
      setShowAllPolluted,
    } = this.context;

    // create a temporary object with the previous state
    const tempParameterToggleObject = { ...parameterToggleObject };

    // set all paramters to On and show the issuesLayer
    const toggleOn = () => {
      this.setState({
        showAllParameters: true,
        showIssuesLayer: true,
      });
      for (let property in tempParameterToggleObject) {
        tempParameterToggleObject[property] = true;
      }

      setShowAllPolluted(true);
      setVisibleLayers({
        issuesLayer: issuesLayer && true,
        dischargersLayer: dischargersLayer && this.state.showDischargersLayer,
      });
    };

    // set all parameters to Off and hide the issuesLayer
    const toggleOff = () => {
      this.setState({
        showAllParameters: false,
        showIssuesLayer: false,
      });
      for (let property in tempParameterToggleObject) {
        tempParameterToggleObject[property] = false;
      }

      setShowAllPolluted(false);
      setVisibleLayers({
        issuesLayer: false,
        dischargersLayer: dischargersLayer && this.state.showDischargersLayer,
      });
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
      } else if (showAllParameters === true) {
        toggleOff();
      }
    }
    // if switch under number of Dischargers in violation is switched
    else if (checkedSwitch === 'Toggle Dischargers Layer') {
      this.setState((prevState) => ({
        showDischargersLayer: !prevState.showDischargersLayer,
      }));
      this.checkDischargersToDisplay();

      setVisibleLayers({
        issuesLayer: issuesLayer && this.state.showIssuesLayer,
        dischargersLayer: dischargersLayer && !this.state.showDischargersLayer,
      });
    }
    // one of the parameters is switched
    else {
      tempParameterToggleObject[checkedSwitch] = !parameterToggleObject[
        checkedSwitch
      ];

      this.checkIfAllSwitchesToggled(
        cipSummary.data,
        tempParameterToggleObject,
      );
    }

    // update the object holding the toggle states and check if any waterbodies need to be hidden or shown
    setPollutionParameters(tempParameterToggleObject);
    this.setState(
      {
        parameterToggleObject: tempParameterToggleObject,
      },
      () => {
        this.checkWaterbodiesToDisplay();
      },
    );
  };

  render() {
    const { infoToggleChecked } = this.props;
    const {
      violatingFacilities,
      parameterToggleObject,
      showAllParameters,
      showIssuesLayer,
      showDischargersLayer,
    } = this.state;

    const { watershed, permittedDischargers, cipSummary } = this.context;

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
    const zeroDischargers = !Boolean(violatingFacilities.length);

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

    return (
      <Container>
        <>
          <StyledMetrics>
            <StyledMetric>
              {cipSummary.status === 'fetching' ? (
                <LoadingSpinner />
              ) : (
                <>
                  <StyledNumber>
                    {cipSummary.status === 'failure'
                      ? 'N/A'
                      : `${pollutedPercent}%` || 0 + '%'}
                  </StyledNumber>
                  <StyledLabel>of Assessed Waters are impaired</StyledLabel>
                  <SwitchContainer>
                    <Switch
                      checked={
                        toggleIssuesChecked && cipSummary.status !== 'failure'
                      }
                      onChange={() => this.toggleSwitch('Toggle Issues Layer')}
                      disabled={
                        zeroPollutedWaterbodies ||
                        cipSummary.status === 'failure'
                      }
                    />
                  </SwitchContainer>
                </>
              )}
            </StyledMetric>
            <StyledMetric>
              {permittedDischargers.status === 'fetching' ? (
                <LoadingSpinner />
              ) : (
                <>
                  <StyledNumber>
                    {permittedDischargers.status === 'failure'
                      ? 'N/A'
                      : violatingFacilities.length.toLocaleString()}
                  </StyledNumber>
                  <StyledLabel>
                    Dischargers with Significant Violations
                  </StyledLabel>
                  <SwitchContainer>
                    <Switch
                      checked={toggleDischargersChecked}
                      onChange={() =>
                        this.toggleSwitch('Toggle Dischargers Layer')
                      }
                      disabled={zeroDischargers}
                    />
                  </SwitchContainer>
                </>
              )}
            </StyledMetric>
          </StyledMetrics>

          <ContentTabs>
            <Tabs>
              <TabList>
                <Tab>Impaired Assessed Waters</Tab>
                <Tab>Dischargers with Significant Violations</Tab>
              </TabList>

              <TabPanels>
                <TabPanel>
                  {cipSummary.status === 'fetching' && <LoadingSpinner />}
                  {cipSummary.status === 'failure' && (
                    <StyledErrorBox>
                      <p>{huc12SummaryError}</p>
                    </StyledErrorBox>
                  )}
                  {cipSummary.status === 'success' && (
                    <>
                      {(cipSummary.data.count === 0 ||
                        (cipSummary.data.items &&
                          cipSummary.data.items.length === 0)) && (
                        <Text>
                          There are no impairment categories in the {watershed}{' '}
                          watershed.
                        </Text>
                      )}
                      {cipSummary.data.items &&
                        cipSummary.data.items.length > 0 && (
                          <>
                            <IntroDiv>
                              {/* ***removed until EPA determines correct value*** */}
                              {/* {assessedPercent > 0 && (
                        <span>
                          <strong>{assessedPercent}%</strong> of waters in
                          your watershed have been assessed.
                          <br />
                          Of those assessed,{' '}
                          <strong>{pollutedPercent}</strong>% are impaired
                          (shown in <MapKeyText>red</MapKeyText>
                          ).
                        </span>
                      )}
                      <br /> */}
                              <Disclaimer>
                                <p>
                                  The condition of a waterbody is dynamic and
                                  can change at any time, and the information in
                                  How’s My Waterway should only be used for
                                  general reference. If available, refer to
                                  local or state real-time water quality
                                  reports.
                                </p>
                                <p>
                                  Furthermore, users of this application should
                                  not rely on information relating to
                                  environmental laws and regulations posted on
                                  this application. Application users are solely
                                  responsible for ensuring that they are in
                                  compliance with all relevant environmental
                                  laws and regulations. In addition, EPA cannot
                                  attest to the accuracy of data provided by
                                  organizations outside of the federal
                                  government.
                                </p>
                              </Disclaimer>
                            </IntroDiv>

                            {!zeroPollutedWaterbodies ? (
                              <>
                                <Title>
                                  Impairment categories in the {watershed}{' '}
                                  watershed.
                                </Title>
                                <Table className="table">
                                  <THead>
                                    <tr>
                                      <th>
                                        <FlexDiv>
                                          <TableSwitch>
                                            <Switch
                                              checked={showAllParameters}
                                              onChange={() =>
                                                this.toggleSwitch('Toggle All')
                                              }
                                            />
                                          </TableSwitch>
                                          Impairment Category
                                        </FlexDiv>
                                      </th>
                                      <th>% of Assessed Area</th>
                                    </tr>
                                  </THead>
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

                                        const mappedParameterName = this.getMappedParameterName(
                                          impairmentFields,
                                          param['parameterGroupName'],
                                        );
                                        // if service contains a parameter we have no mapping for
                                        if (!mappedParameterName) return false;

                                        return (
                                          <tr key={mappedParameterName}>
                                            <td>
                                              <FlexDiv>
                                                <TableSwitch>
                                                  <Switch
                                                    checked={
                                                      parameterToggleObject[
                                                        mappedParameterName
                                                      ]
                                                    }
                                                    onChange={() =>
                                                      this.toggleSwitch(
                                                        mappedParameterName,
                                                      )
                                                    }
                                                  />
                                                </TableSwitch>
                                                {mappedParameterName}
                                              </FlexDiv>
                                            </td>
                                            <td>{percent}%</td>
                                          </tr>
                                        );
                                      },
                                    )}
                                  </tbody>
                                </Table>
                              </>
                            ) : (
                              <Text>
                                There are no impairment categories in the{' '}
                                {watershed} watershed.
                              </Text>
                            )}
                          </>
                        )}
                    </>
                  )}
                </TabPanel>

                <TabPanel>
                  {permittedDischargers.status === 'fetching' && (
                    <LoadingSpinner />
                  )}

                  {permittedDischargers.status === 'failure' && (
                    <StyledErrorBox>
                      <p>{echoError}</p>
                    </StyledErrorBox>
                  )}

                  {permittedDischargers.status === 'success' && (
                    <>
                      {violatingFacilities.length === 0 && (
                        <Text>
                          There are no dischargers with significant{' '}
                          <GlossaryTerm term="Effluent">effluent</GlossaryTerm>{' '}
                          violations in the {watershed} watershed.
                        </Text>
                      )}
                      {violatingFacilities.length > 0 && (
                        <AccordionList
                          title={
                            <>
                              Dischargers with significant{' '}
                              <GlossaryTerm term="Effluent">
                                effluent
                              </GlossaryTerm>{' '}
                              violations in the {watershed} watershed.
                            </>
                          }
                        >
                          {violatingFacilities.map((item, index) => {
                            const feature = this.convertFacilityToGraphic(item);

                            return (
                              <AccordionItem
                                key={index}
                                title={
                                  <strong>
                                    {item['CWPName'] || 'Unknown'}
                                  </strong>
                                }
                                subTitle={`NPDES ID: ${item['SourceID']}`}
                                feature={feature}
                                idKey={'CWPName'}
                              >
                                <WaterbodyInfo
                                  type={'Permitted Discharger'}
                                  feature={feature}
                                />
                                <ViewOnMapButton feature={feature} />
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
          </ContentTabs>

          {infoToggleChecked && (
            <>
              <Heading>Did You Know?</Heading>

              <ul>
                <li>
                  Impairments take many forms, often a result of human behavior.
                  Water impairments are identified across 34 categories such as
                  excess algae, mercury, pathogens, pesticides, trash and more.
                </li>
                <li>
                  Impairments can enter your water through runoff, water
                  discharge from a building, and from the breakdown of water
                  infrastructure like sewers and pipes
                </li>
              </ul>
            </>
          )}
        </>
      </Container>
    );
  }
}

export default function IdentifiedIssuesContainer({ ...props }: Props) {
  return (
    <TabErrorBoundary tabName="Identified Issues">
      <IdentifiedIssues {...props} />
    </TabErrorBoundary>
  );
}
