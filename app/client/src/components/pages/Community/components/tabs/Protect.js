// @flow

import React from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import styled from 'styled-components';
// components
import { ContentTabs } from 'components/shared/ContentTabs';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { AccordionList, AccordionItem } from 'components/shared/Accordion';
import { StyledErrorBox } from 'components/shared/MessageBoxes';
import TabErrorBoundary from 'components/shared/ErrorBoundary/TabErrorBoundary';
import Switch from 'components/shared/Switch';
import { gradientIcon } from 'components/pages/LocationMap/MapFunctions';
import ShowLessMore from 'components/shared/ShowLessMore';
import ViewOnMapButton from 'components/shared/ViewOnMapButton';
// contexts
import { EsriModulesContext } from 'contexts/EsriModules';
import { LocationSearchContext } from 'contexts/locationSearch';
import { CommunityTabsContext } from 'contexts/CommunityTabs';
import { MapHighlightContext } from 'contexts/MapHighlight';
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import { getUrlFromMarkup, getTitleFromMarkup } from 'components/shared/Regex';
import { useWaterbodyOnMap } from 'utils/hooks';
import { convertAgencyCode, convertDomainCode } from 'utils/utils';
// styles
import { fonts } from 'styles/index.js';
// errors
import {
  protectNonpointSourceError,
  protectedAreasDatabaseError,
  wildScenicRiversError,
  wsioHealthIndexError,
} from 'config/errorMessages';

// given a state code like AL,VA and an array of state objects from attains states service,
// returns the full name of the states (e.g., Alabama and Virginia)
function convertStateCode(stateCode: string, stateData: Array<Object>) {
  if (stateData.length === 0) return stateCode;

  const stateCodes = stateCode.split(',');
  const stateNames = [];

  stateCodes.forEach((code) => {
    const matchingState = stateData.filter((s) => s.code === code)[0];

    if (matchingState) stateNames.push(matchingState.name);
  });

  // don't add ' and ' if only one state is found
  if (stateNames.length === 1) return stateNames[0];

  stateNames.sort();
  const stateNamesStr =
    stateNames.slice(0, -1).join(', ') + ' and ' + stateNames.slice(-1);
  return stateNamesStr;
}

// --- styled components ---
const Container = styled.div`
  padding: 1em;
`;

const List = styled.ul`
  padding-bottom: 1.5rem;
`;

const Heading = styled.h2`
  margin-bottom: 0.25rem;
  padding-bottom: 0;
  font-family: ${fonts.primary};
  font-size: 1.375em;
`;

const AccordionContent = styled.div`
  padding: 0.875em;

  p:last-of-type {
    padding-bottom: 0.875rem;
  }
`;

const NoSwitchHeader = styled.strong`
  margin-left: 48px;
`;

const StyledSwitch = styled.div`
  margin-right: 10px;
  pointer-events: all;
  display: flex;
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  margin: 0;
  font-weight: bold;
  pointer-events: none;

  span {
    margin-left: 0.5em;
  }
`;

const Feature = styled.div`
  &:hover {
    background-color: #f0f6f9;
  }
`;

const FeatureTitle = styled.p`
  padding: 0.75rem;
`;

const NewTabDisclaimer = styled.div`
  display: inline-block;
`;

const WatershedContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
`;

const GradientInnerContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
`;

const GradientHeaderFooter = styled.div`
  text-align: center;
`;

const ErrorBox = styled(StyledErrorBox)`
  text-align: center;

  p {
    padding-bottom: 0 !important;
  }
`;

const InlineBlockWrapper = styled.div`
  display: inline-block;
`;

const WsioQuestionContainer = styled.div`
  padding-bottom: 0.875rem;
`;

const ViewButtonContainer = styled.div`
  margin-left: 0.5em;
`;

// --- components ---
function Protect() {
  const services = useServicesContext();

  // draw the waterbody on the map
  useWaterbodyOnMap();

  const { Query, QueryTask, SimpleFillSymbol } = React.useContext(
    EsriModulesContext,
  );
  const {
    mapView,
    grts,
    watershed,
    huc12,
    statesData,
    visibleLayers,
    setVisibleLayers,
    wsioHealthIndexLayer,
    wsioHealthIndexData,
    wildScenicRiversLayer,
    wildScenicRiversData,
    protectedAreasLayer,
    protectedAreasData,
    protectedAreasHighlightLayer,
    waterbodyLayer,
    cipSummary,
  } = React.useContext(LocationSearchContext);

  const { infoToggleChecked } = React.useContext(CommunityTabsContext);

  const sortedGrtsData =
    grts.data.items && grts.data.items.length > 0
      ? grts.data.items
          .sort((objA, objB) => {
            return objA['prj_title'].localeCompare(objB['prj_title']);
          })
          .filter(
            (project) =>
              project.ws_protect_ind && project.ws_protect_ind === 'Y',
          )
      : [];

  const [
    healthScoresDisplayed,
    setHealthScoresDisplayed, //
  ] = React.useState(true);

  const [
    protectedAreasDisplayed,
    setProtectedAreasDisplayed, //
  ] = React.useState(false);

  const [
    wildScenicRiversDisplayed,
    setWildScenicRiversDisplayed,
  ] = React.useState(false);

  // Updates the visible layers. This function also takes into account whether
  // or not the underlying webservices failed.
  const updateVisibleLayers = React.useCallback(
    ({ key = null, newValue = null, useCurrentValue = false }) => {
      const newVisibleLayers = {};
      if (wsioHealthIndexData.status !== 'failure') {
        newVisibleLayers['wsioHealthIndexLayer'] =
          !wsioHealthIndexLayer || useCurrentValue
            ? visibleLayers['wsioHealthIndexLayer']
            : healthScoresDisplayed;
      }
      if (protectedAreasData.status !== 'failure') {
        newVisibleLayers['protectedAreasLayer'] =
          !protectedAreasLayer || useCurrentValue
            ? visibleLayers['protectedAreasLayer']
            : protectedAreasDisplayed;
      }
      if (wildScenicRiversData.status !== 'failure') {
        newVisibleLayers['wildScenicRiversLayer'] =
          !wildScenicRiversLayer || useCurrentValue
            ? visibleLayers['wildScenicRiversLayer']
            : wildScenicRiversDisplayed;
      }
      if (cipSummary.status !== 'failure') {
        newVisibleLayers['waterbodyLayer'] =
          !waterbodyLayer || useCurrentValue
            ? visibleLayers['waterbodyLayer']
            : false;
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
      healthScoresDisplayed,
      wsioHealthIndexLayer,
      wsioHealthIndexData,
      protectedAreasDisplayed,
      protectedAreasLayer,
      protectedAreasData,
      wildScenicRiversDisplayed,
      wildScenicRiversLayer,
      wildScenicRiversData,
      waterbodyLayer,
      cipSummary,
      visibleLayers,
      setVisibleLayers,
    ],
  );

  // Updates visible layers based on webservice statuses.
  React.useEffect(() => {
    updateVisibleLayers({ useCurrentValue: true });
  }, [
    wsioHealthIndexData,
    protectedAreasData,
    wildScenicRiversData,
    visibleLayers,
    updateVisibleLayers,
  ]);

  const [tabIndex, setTabIndex] = React.useState(null);

  // toggle the switches setting when the map layer's visibility changes
  React.useEffect(() => {
    if (healthScoresDisplayed !== visibleLayers['wsioHealthIndexLayer']) {
      setHealthScoresDisplayed(visibleLayers['wsioHealthIndexLayer']);
    }

    if (wildScenicRiversDisplayed !== visibleLayers['wildScenicRiversLayer']) {
      setWildScenicRiversDisplayed(visibleLayers['wildScenicRiversLayer']);
    }

    if (protectedAreasDisplayed !== visibleLayers['protectedAreasLayer']) {
      setProtectedAreasDisplayed(visibleLayers['protectedAreasLayer']);
    }
  }, [
    healthScoresDisplayed,
    wildScenicRiversDisplayed,
    protectedAreasDisplayed,
    visibleLayers,
  ]);

  const wsioData =
    wsioHealthIndexData.status === 'success'
      ? wsioHealthIndexData.data[0]
      : null;

  const wsioScore = wsioData
    ? Math.round(wsioData.phwa_health_ndx_st_2016 * 100) / 100
    : null;

  function SwitchContainer({ children }) {
    // This div is to workaround a couple of issues with the react-switch component.
    // The first issue is the className prop of the component does not work, which
    // prevented putting styles (margin, pointer-events) on the component. The
    // second issue is the react-switch component returns two different event types.
    // One event type has stopPropagation and the other does not. This container
    // allows us to stopPropagation in the case of the event without stopPropagation
    // is returned.
    return (
      <StyledSwitch onClick={(ev) => ev.stopPropagation()}>
        {children}
      </StyledSwitch>
    );
  }

  return (
    <Container>
      <ContentTabs>
        <Tabs
          onChange={(index) => {
            setTabIndex(index);
            updateVisibleLayers({});
          }}
          defaultIndex={tabIndex}
        >
          <TabList>
            <Tab>Watershed Health and Protection</Tab>
            <Tab>Tips</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              {infoToggleChecked && (
                <p>
                  Learn about watershed health scores in relation to your state,
                  the location of designated Wild and Scenic Rivers and if there
                  are any protection projects or protected areas in your
                  watershed.
                </p>
              )}

              <AccordionList>
                <AccordionItem
                  highlightContent={false}
                  title={
                    <Label>
                      <SwitchContainer>
                        <Switch
                          checked={
                            healthScoresDisplayed &&
                            wsioHealthIndexData.status === 'success' &&
                            wsioHealthIndexData.data.length > 0
                          }
                          onChange={(checked, event) => {
                            setHealthScoresDisplayed(checked);
                            updateVisibleLayers({
                              key: 'wsioHealthIndexLayer',
                              newValue: checked,
                            });
                          }}
                          disabled={
                            wsioHealthIndexData.status === 'failure' ||
                            wsioHealthIndexData.data.length === 0
                          }
                          ariaLabel="Watershed Health Scores"
                        />
                      </SwitchContainer>
                      <strong>Watershed Health Scores</strong>
                    </Label>
                  }
                >
                  <AccordionContent>
                    {wsioHealthIndexData.status === 'failure' && (
                      <ErrorBox>
                        <p>{wsioHealthIndexError}</p>
                      </ErrorBox>
                    )}
                    {wsioHealthIndexData.status === 'fetching' && (
                      <LoadingSpinner />
                    )}
                    {wsioHealthIndexData.status === 'success' &&
                      wsioHealthIndexData.data.length === 0 && (
                        <p>
                          No Protected Areas Database data available for this
                          location.
                        </p>
                      )}
                    {wsioHealthIndexData.status === 'success' &&
                      wsioHealthIndexData.data.length > 0 && (
                        <WatershedContainer>
                          <div style={{ flex: '3 1 220px' }}>
                            <table className="table">
                              <tbody>
                                <tr>
                                  <td>
                                    <em>Watershed Name:</em>
                                  </td>
                                  <td>{watershed}</td>
                                </tr>
                                <tr>
                                  <td>
                                    <em>Watershed:</em>
                                  </td>
                                  <td>{huc12}</td>
                                </tr>
                                <tr>
                                  <td>
                                    <em>State:</em>
                                  </td>
                                  <td>
                                    {(wsioHealthIndexData.status ===
                                      'fetching' ||
                                      statesData.status === 'fetching') && (
                                      <LoadingSpinner />
                                    )}
                                    {wsioHealthIndexData.status === 'success' &&
                                      statesData.status === 'success' &&
                                      convertStateCode(
                                        wsioData.states,
                                        statesData.data,
                                      )}
                                  </td>
                                </tr>
                                <tr>
                                  <td>
                                    <em>Watershed Health Score:</em>
                                  </td>
                                  <td>
                                    {wsioHealthIndexData.status ===
                                      'fetching' && <LoadingSpinner />}
                                    {wsioHealthIndexData.status ===
                                      'success' && <>{wsioScore}</>}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <div
                            style={{ flex: '1 1 0', margin: '0 0 10px 10px' }}
                          >
                            <GradientInnerContainer>
                              <GradientHeaderFooter>
                                More Healthy
                              </GradientHeaderFooter>
                              <div style={{ marginLeft: '25px' }}>
                                {gradientIcon({
                                  id: 'health-index-horizontal-gradient',
                                  stops: [
                                    { label: '1', color: 'rgb(10, 8, 145)' },
                                    {
                                      label: '0.75',
                                      color: 'rgb(30, 61, 181)',
                                    },
                                    {
                                      label: '0.5',
                                      color: 'rgb(54, 140, 225)',
                                    },
                                    {
                                      label: '0.25',
                                      color: 'rgb(124, 187, 234)',
                                    },
                                    {
                                      label: '0',
                                      color: 'rgb(180, 238, 239)',
                                    },
                                  ],
                                })}
                              </div>
                              <GradientHeaderFooter>
                                Less Healthy
                              </GradientHeaderFooter>
                            </GradientInnerContainer>
                          </div>
                        </WatershedContainer>
                      )}

                    <WsioQuestionContainer>
                      <InlineBlockWrapper>
                        <p>
                          <strong>
                            Where might the healthier watersheds be located in
                            your state?
                          </strong>
                        </p>
                      </InlineBlockWrapper>

                      <InlineBlockWrapper>
                        <ShowLessMore
                          charLimit={0}
                          text={
                            <>
                              <p>
                                The Watershed Health Index, from the Preliminary
                                Healthy Watersheds Assessment (PHWA), is a score
                                of <strong>watershed health</strong> across the
                                United States.
                              </p>
                              <ul>
                                <li>
                                  The map to the left shows watershed health,
                                  characterized by the presence of natural land
                                  cover that supports hydrologic and geomorphic
                                  processes within their natural range of
                                  variation, good water quality, and habitats of
                                  sufficient size and connectivity to support
                                  healthy, native aquatic and riparian
                                  biological communities.
                                </li>
                                <li>
                                  Each Watershed Health Index score is relative
                                  to the scores of watersheds across the state.
                                  A watershed that straddles more than one state
                                  is scored only in the state in which its
                                  majority area resides.
                                </li>
                              </ul>
                            </>
                          }
                        />
                      </InlineBlockWrapper>
                    </WsioQuestionContainer>

                    <WsioQuestionContainer>
                      <InlineBlockWrapper>
                        <p>
                          <strong>
                            Why is the Watershed Health Index valuable?
                          </strong>
                        </p>
                      </InlineBlockWrapper>
                      <InlineBlockWrapper>
                        <ShowLessMore
                          charLimit={0}
                          text={
                            <>
                              <ul>
                                <li>
                                  Raises awareness of where the healthier
                                  watersheds may occur.
                                </li>
                                <li>
                                  Provides an initial dataset upon which others
                                  can build better watershed condition
                                  information.
                                </li>
                                <li>
                                  Improves communication and coordination among
                                  watershed management partners by providing
                                  nationally consistent measures of watershed
                                  health.
                                </li>
                                <li>
                                  Provides a basis to promote high quality
                                  waters protection.
                                </li>
                                <li>
                                  Supports efforts to prioritize, protect and
                                  maintain high quality waters.
                                </li>
                              </ul>
                            </>
                          }
                        />
                      </InlineBlockWrapper>
                    </WsioQuestionContainer>

                    <p>
                      <a
                        href="https://www.epa.gov/hwp/download-preliminary-healthy-watersheds-assessments"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <i className="fas fa-info-circle" aria-hidden="true" />{' '}
                        More Information
                      </a>{' '}
                      (opens new browser tab)
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  highlightContent={false}
                  title={
                    <Label>
                      <SwitchContainer>
                        <Switch
                          checked={
                            wildScenicRiversDisplayed &&
                            wildScenicRiversData.status === 'success'
                          }
                          onChange={(checked, event) => {
                            setWildScenicRiversDisplayed(checked);
                            updateVisibleLayers({
                              key: 'wildScenicRiversLayer',
                              newValue: checked,
                            });
                          }}
                          disabled={wildScenicRiversData.status === 'failure'}
                          ariaLabel="Wild and Scenic Rivers"
                        />
                      </SwitchContainer>
                      <strong>Wild and Scenic Rivers</strong>
                    </Label>
                  }
                >
                  <AccordionContent>
                    {infoToggleChecked && (
                      <p>
                        The{' '}
                        <a
                          href="https://www.rivers.gov/"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          National Wild and Scenic Rivers System{' '}
                        </a>{' '}
                        (opens new browser tab) was created by Congress in 1968
                        to preserve certain rivers with outstanding natural,
                        cultural, and recreational values in a free-flowing
                        condition for the enjoyment of present and future
                        generations. The Act is notable for safeguarding the
                        special character of these rivers, while also
                        recognizing the potential for their appropriate use and
                        development. It encourages river management that crosses
                        political boundaries and promotes public participation
                        in developing goals for river protection.
                      </p>
                    )}

                    {wildScenicRiversData.status === 'failure' && (
                      <ErrorBox>
                        <p>{wildScenicRiversError}</p>
                      </ErrorBox>
                    )}

                    {wildScenicRiversData.status === 'fetching' && (
                      <LoadingSpinner />
                    )}

                    {wildScenicRiversData.status === 'success' &&
                      wildScenicRiversData.data.length === 0 && (
                        <p>No Wild and Scenic River data available.</p>
                      )}

                    {wildScenicRiversData.status === 'success' &&
                      wildScenicRiversData.data.length > 0 &&
                      wildScenicRiversData.data.map((item) => {
                        const attributes = item.attributes;
                        return (
                          <FeatureItem
                            key={attributes.GlobalID}
                            feature={item}
                            title={
                              <strong>
                                River Name: {attributes.WSR_RIVER_SHORTNAME}
                              </strong>
                            }
                          >
                            <table className="table">
                              <tbody>
                                <tr>
                                  <td>
                                    <em>Agency</em>
                                  </td>
                                  <td>
                                    {convertAgencyCode(attributes.AGENCY)}
                                  </td>
                                </tr>

                                <tr>
                                  <td>
                                    <em>Management Plan</em>
                                  </td>
                                  <td>
                                    {attributes.MANAGEMENT_PLAN === 'Y'
                                      ? 'Yes'
                                      : 'No'}
                                  </td>
                                </tr>

                                <tr>
                                  <td>
                                    <em>Managing Entities</em>
                                  </td>
                                  <td>
                                    {convertAgencyCode(
                                      attributes.MANAGING_ENTITIES,
                                    )}
                                  </td>
                                </tr>

                                <tr>
                                  <td>
                                    <em>Public Law Name</em>
                                  </td>
                                  <td>{attributes.PUBLIC_LAW_NAME}</td>
                                </tr>

                                <tr>
                                  <td>
                                    <em>State</em>
                                  </td>
                                  <td>{attributes.STATE}</td>
                                </tr>

                                <tr>
                                  <td>
                                    <em>River Category</em>
                                  </td>
                                  <td>{attributes.RiverCategory}</td>
                                </tr>

                                <tr>
                                  <td>
                                    <em>Website</em>
                                  </td>
                                  <td>
                                    {attributes.WEBLINK ? (
                                      <>
                                        <a
                                          href={attributes.WEBLINK}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          More information
                                        </a>{' '}
                                        (opens new browser tab)
                                      </>
                                    ) : (
                                      'Not available.'
                                    )}
                                  </td>
                                </tr>
                              </tbody>
                            </table>

                            <ViewButtonContainer>
                              <ViewOnMapButton
                                layers={[wildScenicRiversLayer]}
                                feature={item}
                                idField={'GlobalID'}
                                onClick={() => {
                                  if (wildScenicRiversDisplayed) return;

                                  setWildScenicRiversDisplayed(true);
                                  updateVisibleLayers({
                                    key: 'wildScenicRiversLayer',
                                    newValue: true,
                                  });
                                }}
                              />
                            </ViewButtonContainer>
                          </FeatureItem>
                        );
                      })}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  highlightContent={false}
                  title={<NoSwitchHeader>Protection Projects</NoSwitchHeader>}
                >
                  <AccordionContent>
                    {grts.status === 'fetching' && <LoadingSpinner />}

                    {grts.status === 'failure' && (
                      <ErrorBox>
                        <p>{protectNonpointSourceError}</p>
                      </ErrorBox>
                    )}

                    {grts.status === 'success' && (
                      <>
                        {sortedGrtsData.length === 0 && (
                          <p>
                            There are no EPA funded protection projects in the{' '}
                            {watershed} watershed.
                          </p>
                        )}

                        {sortedGrtsData.length > 0 && (
                          <>
                            <p>
                              EPA funded protection projects in the {watershed}{' '}
                              watershed.
                            </p>

                            {sortedGrtsData.map((item, index) => {
                              const url = getUrlFromMarkup(
                                item['project_link'],
                              );
                              const protectionPlans =
                                item['watershed_plans'] &&
                                // break string into pieces separated by commas and map over them
                                item['watershed_plans']
                                  .split(',')
                                  .map((plan) => {
                                    const markup =
                                      plan.split('</a>')[0] + '</a>';
                                    const title = getTitleFromMarkup(markup);
                                    const planUrl = getUrlFromMarkup(markup);
                                    if (!title || !planUrl) return false;
                                    return { url: planUrl, title: title };
                                  });
                              // remove any plans with missing titles or urls
                              const filteredProtectionPlans =
                                protectionPlans &&
                                protectionPlans.filter(
                                  (plan) => plan && plan.url && plan.title,
                                );
                              return (
                                <FeatureItem
                                  key={index}
                                  title={
                                    <>
                                      <strong>
                                        {item['prj_title'] || 'Unknown'}
                                      </strong>
                                      <br />
                                      <small>
                                        ID: {item['prj_seq'] || 'Unknown ID'}
                                      </small>
                                    </>
                                  }
                                >
                                  <table className="table">
                                    <tbody>
                                      {item['pollutants'] && (
                                        <tr>
                                          <td>
                                            <em>Impairments:</em>
                                          </td>
                                          <td>{item['pollutants']}</td>
                                        </tr>
                                      )}
                                      <tr>
                                        <td>
                                          <em>Total Funds:</em>
                                        </td>
                                        <td>{item['total_319_funds']}</td>
                                      </tr>
                                      <tr>
                                        <td>
                                          <em>Project Start Date:</em>
                                        </td>
                                        <td>{item['project_start_date']}</td>
                                      </tr>
                                      <tr>
                                        <td>
                                          <em>Project Status:</em>
                                        </td>
                                        <td>{item['status']}</td>
                                      </tr>
                                      <tr>
                                        <td>
                                          <em>Project Details:</em>
                                        </td>
                                        <td>
                                          <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            Open Project Summary
                                          </a>
                                          &nbsp;&nbsp;
                                          <NewTabDisclaimer>
                                            (opens new browser tab)
                                          </NewTabDisclaimer>
                                        </td>
                                      </tr>

                                      <tr>
                                        <td>
                                          <em>Protection Plans:</em>
                                        </td>
                                        {filteredProtectionPlans &&
                                        filteredProtectionPlans.length > 0 ? (
                                          <td>
                                            {filteredProtectionPlans.map(
                                              (plan, index) => {
                                                if (
                                                  plan &&
                                                  plan.url &&
                                                  plan.title
                                                ) {
                                                  return (
                                                    <div key={index}>
                                                      <a
                                                        href={plan.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                      >
                                                        {plan.title}
                                                      </a>
                                                    </div>
                                                  );
                                                }
                                                return false;
                                              },
                                            )}
                                          </td>
                                        ) : (
                                          <td>Document not available</td>
                                        )}
                                      </tr>
                                    </tbody>
                                  </table>
                                </FeatureItem>
                              );
                            })}
                          </>
                        )}
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  highlightContent={false}
                  title={
                    <Label>
                      <SwitchContainer>
                        <Switch
                          checked={
                            protectedAreasDisplayed &&
                            protectedAreasData.status === 'success' &&
                            protectedAreasData.data.length > 0
                          }
                          onChange={(checked, event) => {
                            setProtectedAreasDisplayed(checked);
                            updateVisibleLayers({
                              key: 'protectedAreasLayer',
                              newValue: checked,
                            });
                          }}
                          disabled={
                            protectedAreasData.status === 'failure' ||
                            protectedAreasData.data.length === 0
                          }
                          ariaLabel="Protected Areas"
                        />
                      </SwitchContainer>
                      <strong>Protected Areas</strong>
                    </Label>
                  }
                >
                  <AccordionContent>
                    {infoToggleChecked && (
                      <>
                        <p>
                          The Protected Areas Database (PAD-US) is America’s
                          official national inventory of U.S. terrestrial and
                          marine protected areas that are dedicated to the
                          preservation of biological diversity and to other
                          natural, recreation and cultural uses, managed for
                          these purposes through legal or other effective means.
                        </p>

                        <p>
                          <a
                            href="https://www.usgs.gov/core-science-systems/science-analytics-and-synthesis/gap/science/protected-areas"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <i
                              className="fas fa-info-circle"
                              aria-hidden="true"
                            />{' '}
                            More Information
                          </a>{' '}
                          (opens new browser tab)
                        </p>
                      </>
                    )}

                    {protectedAreasData.status === 'failure' && (
                      <ErrorBox>
                        <p>{protectedAreasDatabaseError}</p>
                      </ErrorBox>
                    )}

                    {protectedAreasData.status === 'fetching' && (
                      <LoadingSpinner />
                    )}

                    {protectedAreasData.status === 'success' &&
                      protectedAreasData.data.length === 0 && (
                        <p>
                          No Protected Areas Database data available for this
                          location.
                        </p>
                      )}

                    {protectedAreasData.status === 'success' &&
                      protectedAreasData.data.length > 0 && (
                        <AccordionList>
                          {protectedAreasData.data.map((item) => {
                            const attributes = item.attributes;
                            const fields = protectedAreasData.fields;
                            const idKey = 'OBJECTID';
                            return (
                              <AccordionItem
                                key={`protected-area-${attributes.OBJECTID}`}
                                feature={item}
                                title={
                                  <strong>
                                    Protected Area {attributes.Loc_Nm}
                                  </strong>
                                }
                              >
                                <table className="table">
                                  <tbody>
                                    <tr>
                                      <td>
                                        <em>Manager Type:</em>
                                      </td>
                                      <td>
                                        {convertDomainCode(
                                          fields,
                                          'Mang_Type',
                                          attributes.Mang_Type,
                                        )}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        <em>Manager Name:</em>
                                      </td>
                                      <td>
                                        {convertDomainCode(
                                          fields,
                                          'Mang_Name',
                                          attributes.Mang_Name,
                                        )}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        <em>Protection Category:</em>
                                      </td>
                                      <td>
                                        {convertDomainCode(
                                          fields,
                                          'Category',
                                          attributes.Category,
                                        )}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        <em>Public Access:</em>
                                      </td>
                                      <td>
                                        {convertDomainCode(
                                          fields,
                                          'Access',
                                          attributes.Access,
                                        )}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>

                                <ViewButtonContainer>
                                  <ViewOnMapButton
                                    layers={[protectedAreasLayer]}
                                    feature={item}
                                    fieldName={idKey}
                                    customQuery={(viewClick) => {
                                      // query for the item
                                      const query = new Query({
                                        where: `${idKey} = ${attributes[idKey]}`,
                                        returnGeometry: true,
                                        outFields: ['*'],
                                      });

                                      new QueryTask({
                                        url: `${services.data.protectedAreasDatabase}0`,
                                      })
                                        .execute(query)
                                        .then((res) => {
                                          if (res.features.length === 0) return;

                                          // create the feature
                                          const feature = res.features[0];
                                          feature.symbol = new SimpleFillSymbol(
                                            {
                                              color:
                                                mapView.highlightOptions.color,
                                              outline: null,
                                            },
                                          );

                                          // add it to the highlight layer
                                          protectedAreasHighlightLayer.removeAll();
                                          protectedAreasHighlightLayer.add(
                                            feature,
                                          );

                                          // set the highlight
                                          viewClick(
                                            protectedAreasHighlightLayer
                                              .graphics.items[0],
                                          );
                                        })
                                        .catch((err) => {
                                          console.error(err);
                                        });
                                    }}
                                    onClick={() => {
                                      if (protectedAreasDisplayed) return;

                                      setProtectedAreasDisplayed(true);
                                      updateVisibleLayers({
                                        key: 'protectedAreasLayer',
                                        newValue: true,
                                      });
                                    }}
                                  />
                                </ViewButtonContainer>
                              </AccordionItem>
                            );
                          })}
                        </AccordionList>
                      )}
                  </AccordionContent>
                </AccordionItem>
              </AccordionList>
            </TabPanel>
            <TabPanel>
              <p>
                <em>Links below open in a new browser tab.</em>
              </p>
              <p>Get quick tips for protecting water in your:</p>

              <Heading>Community</Heading>
              <List>
                <li>Contribute to local water cleanup efforts.</li>
                <li>Find a watershed protection organization to support.</li>
                <li>Volunteer to help monitor water quality.</li>
                <li>
                  Lead a campaign to educate your community about impairment
                  from nonpoint sources, like stormwater.
                </li>
                <li>
                  Sponsor a watershed festival in your community to raise
                  awareness about the importance of watershed protection.
                </li>
                <li>See how your state is protecting your waters.</li>
              </List>

              <Heading>School</Heading>
              <List>
                <li>Adopt your watershed.</li>
                <li>
                  Teach students about watershed protection by showing the
                  “After the Storm” television special and using other resources
                  from EPA’s Watershed Academy.
                </li>
                <li>
                  <a
                    href="https://www.epa.gov/schools"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Find other ways to make a difference in your school.
                  </a>
                </li>
              </List>

              <Heading>Yard</Heading>
              <List>
                <li>
                  <a
                    href="https://www.epa.gov/nutrientpollution/what-you-can-do-your-yard"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Use fertilizer responsibly.
                  </a>
                </li>
                <li>Don’t overwater gardens and yards.</li>
                <li>
                  <a
                    href="https://www.epa.gov/watersense/what-plant"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Landscape with native plants.
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.epa.gov/soakuptherain"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Reduce runoff.
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.epa.gov/safepestcontrol/lawn-and-garden"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Find other ways to make a difference in your yard.
                  </a>
                </li>
              </List>

              <Heading>Home</Heading>
              <List>
                <li>Choose phosphate-free soaps and detergents.</li>
                <li>Pick up after your pet.</li>
                <li>
                  <a
                    href="https://www.epa.gov/watersense"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Use water efficiently.
                  </a>
                </li>
                <li>Wash your car on your lawn or in commercial car washes.</li>
                <li>Find other ways to make a difference in your home.</li>
              </List>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </ContentTabs>
    </Container>
  );
}

type FeatureItemProps = {
  feature: ?Object,
  title: Node,
  children: Node,
};

function FeatureItem({ feature, title, children }: FeatureItemProps) {
  const { mapView } = React.useContext(LocationSearchContext);
  const { setHighlightedGraphic } = React.useContext(MapHighlightContext);

  const addHighlight = () => {
    if (!feature || !mapView) return;
    setHighlightedGraphic(feature);
  };

  const removeHighlight = () => {
    if (!feature || !mapView) return;
    setHighlightedGraphic(null);
  };

  return (
    <Feature
      onMouseEnter={(ev) => addHighlight()}
      onMouseLeave={(ev) => removeHighlight()}
      onFocus={(ev) => addHighlight()}
      onBlur={(ev) => removeHighlight()}
    >
      {title && <FeatureTitle>{title}</FeatureTitle>}

      {children}
    </Feature>
  );
}

export default function ProtectContainer({ ...props }: Props) {
  return (
    <TabErrorBoundary tabName="Protect">
      <Protect {...props} />
    </TabErrorBoundary>
  );
}
