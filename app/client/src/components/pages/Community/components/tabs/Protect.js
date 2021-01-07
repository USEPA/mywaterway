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
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
// utilities
import { getUrlFromMarkup, getTitleFromMarkup } from 'components/shared/Regex';
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

  const sortedStateNames = stateNames.sort();
  const stateNamesStr =
    sortedStateNames.slice(0, -1).join(', ') +
    ' and ' +
    sortedStateNames.slice(-1);
  return stateNamesStr;
}

// --- styled components ---
const Container = styled.div`
  padding: 1em;
`;

const Text = styled.p`
  text-align: center;
`;

const List = styled.ul`
  padding-bottom: 1.5rem;
`;

const Heading = styled.h3`
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

const Label = styled.label`
  display: flex;
  align-items: center;
  margin: 0.75rem 0;
  font-weight: bold;

  span {
    margin-left: 0.5em;
  }
`;

const Feature = styled.div`
  // NOTE: this is still a work in progress...just highlighting each item
  // on hover for now (if there's eventually a geospacial component for each
  // project, we'll want to hightlight it on the map)

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
  justify-content: space-between;
  align-items: center;
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

// --- components ---
function Protect() {
  const {
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
  } = React.useContext(LocationSearchContext);

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

  const [tabIndex, setTabIndex] = React.useState(null);
  // toggle map layers' visibility when a tab changes
  React.useEffect(() => {
    if (!wsioHealthIndexLayer || !wildScenicRiversLayer || !protectedAreasLayer)
      return;

    if (tabIndex === 0) {
      setVisibleLayers({
        wsioHealthIndexLayer: true,
        wildScenicRiversLayer: false,
        protectedAreasLayer: false,
      });
    }

    if (tabIndex === 1) {
      setVisibleLayers({
        wsioHealthIndexLayer: false,
        wildScenicRiversLayer: false,
        protectedAreasLayer: false,
      });
    }
  }, [
    tabIndex,
    setVisibleLayers,
    wsioHealthIndexLayer,
    wildScenicRiversLayer,
    protectedAreasLayer,
  ]);

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

  return (
    <Container>
      <ContentTabs>
        <Tabs
          onChange={(index) => {
            setTabIndex(index);
          }}
          defaultIndex={tabIndex}
        >
          <TabList>
            <Tab>Watershed Health and Protection</Tab>
            <Tab>Tips</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <p>
                Learn about watershed health scores in relation to your state,
                if there are any protected areas in your watershed, and the
                location of any designated <em>Wild and Scenic Rivers</em>
              </p>

              <AccordionList>
                <AccordionItem title={<strong>Watershed Health Scores</strong>}>
                  <AccordionContent>
                    <Label>
                      <Switch
                        checked={
                          healthScoresDisplayed &&
                          wsioHealthIndexData.status === 'success' &&
                          wsioHealthIndexData.data.length > 0
                        }
                        onChange={(checked) => {
                          setHealthScoresDisplayed(checked);
                          setVisibleLayers({
                            wsioHealthIndexLayer: checked,
                          });
                        }}
                        disabled={
                          wsioHealthIndexData.status === 'failure' ||
                          wsioHealthIndexData.data.length === 0
                        }
                        ariaLabel="Watershed Health Scores"
                      />
                      <span>Display on Map</span>
                    </Label>

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
                          <div style={{ width: 'calc(80% - 0.75em)' }}>
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
                          <div style={{ width: 'calc(20% - 0.75em)' }}>
                            <div>
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
                            </div>
                          </div>
                        </WatershedContainer>
                      )}

                    <p>
                      <strong>Where do the healthiest watersheds occur?</strong>
                    </p>
                    <p>
                      The Watershed Health Index, from the Preliminary Healthy
                      Watersheds Assessment (PHWA), is a score of{' '}
                      <strong>watershed health</strong> across the conterminous
                      United States
                    </p>
                    <ul>
                      <li>
                        The map to the left shows watershed health,
                        characterized by the presence of natural land cover that
                        supports hydrologic and geomorphic processes within
                        their natural range of variation, good water quality,
                        and habitats of sufficient size and connectivity to
                        support healthy, native aquatic and riparian biological
                        communities.
                      </li>
                      <li>
                        Each Watershed Health Index score is relative to the
                        scores (1-99% percentile) of watersheds across the
                        state. A HUC12 watershed that straddles more than one
                        state is scored only in the state in which its majority
                        area resides.
                      </li>
                    </ul>

                    <p>
                      <strong>Why is the PHWA valuable?</strong>
                    </p>

                    <ul>
                      <li>
                        Raises awareness of where the healthiest watersheds
                        occur
                      </li>
                      <li>
                        Provides an initial dataset upon which others can build
                        better watershed condition information.
                      </li>
                      <li>
                        Improves communication and coordination among watershed
                        management partners by providing nationally consistent
                        measures of watershed health.
                      </li>
                      <li>
                        Provides a basis to promote high quality waters
                        protection.
                      </li>
                      <li>
                        Supports efforts to prioritize, protect and maintain
                        high quality waters.
                      </li>
                    </ul>

                    <p>
                      <a
                        href="https://www.epa.gov/hwp/download-preliminary-healthy-watersheds-assessments"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        More Information »
                      </a>
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem title={<strong>Protected Areas</strong>}>
                  <AccordionContent>
                    <p>
                      The Protected Areas Database (PAD-US) is America’s
                      official national inventory of U.S. terrestrial and marine
                      protected areas that are dedicated to the preservation of
                      biological diversity and to other natural, recreation and
                      cultural uses, managed for these purposes through legal or
                      other effective means.
                    </p>

                    <p>
                      <a
                        href="https://www.usgs.gov/core-science-systems/science-analytics-and-synthesis/gap/science/protected-areas"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        More Information »
                      </a>
                    </p>

                    <Label>
                      <Switch
                        checked={
                          protectedAreasDisplayed &&
                          protectedAreasData.status === 'success' &&
                          protectedAreasData.data.length > 0
                        }
                        onChange={(checked) => {
                          setProtectedAreasDisplayed(checked);
                          setVisibleLayers({
                            protectedAreasLayer: checked,
                          });
                        }}
                        disabled={
                          protectedAreasData.status === 'failure' ||
                          protectedAreasData.data.length === 0
                        }
                        ariaLabel="Protected Areas"
                      />
                      <span>Display on Map</span>
                    </Label>

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
                      protectedAreasData.data.length > 0 &&
                      protectedAreasData.data.map((item) => {
                        /* TODO: replace with protected areas data */
                        return (
                          <Feature key={item}>
                            <FeatureTitle>
                              <strong>Protected Area {item}</strong>
                            </FeatureTitle>

                            <table className="table">
                              <tbody>
                                <tr>
                                  <td>
                                    <em>Manager Type:</em>
                                  </td>
                                  <td>{'...'}</td>
                                </tr>
                                <tr>
                                  <td>
                                    <em>Manager Name:</em>
                                  </td>
                                  <td>{'...'}</td>
                                </tr>
                                <tr>
                                  <td>
                                    <em>Protection Category:</em>
                                  </td>
                                  <td>{'...'}</td>
                                </tr>
                                <tr>
                                  <td>
                                    <em>Public Access:</em>
                                  </td>
                                  <td>{'...'}</td>
                                </tr>
                              </tbody>
                            </table>
                          </Feature>
                        );
                      })}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem title={<strong>Wild and Scenic Rivers</strong>}>
                  <AccordionContent>
                    <p>
                      The National Wild and Scenic Rivers System was created by
                      Congress in 1968 to preserve certain rivers with
                      outstanding natural, cultural, and recreational values in
                      a free-flowing condition for the enjoyment of present and
                      future generations. The Act is notable for safeguarding
                      the special character of these rivers, while also
                      recognizing the potential for their appropriate use and
                      development. It encourages river management that crosses
                      political boundaries and promotes public participation in
                      developing goals for river protection.
                    </p>

                    <p>
                      <a
                        href="https://www.rivers.gov/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        More Information »
                      </a>
                    </p>

                    <Label>
                      <Switch
                        checked={
                          wildScenicRiversDisplayed &&
                          wildScenicRiversData.status === 'success' &&
                          wildScenicRiversData.data.length > 0
                        }
                        onChange={(checked) => {
                          setWildScenicRiversDisplayed(checked);
                          setVisibleLayers({
                            wildScenicRiversLayer: checked,
                          });
                        }}
                        disabled={
                          wildScenicRiversData.status === 'failure' ||
                          wildScenicRiversData.data.length === 0
                        }
                        ariaLabel="Wild and Scenic Rivers"
                      />
                      <span>Display on Map</span>
                    </Label>

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
                        <p>
                          No Wild and Scenic River data available for this
                          location.
                        </p>
                      )}

                    {wildScenicRiversData.status === 'success' &&
                      wildScenicRiversData.data.length > 0 &&
                      wildScenicRiversData.data.map((item) => {
                        const attributes = item.attributes;
                        return (
                          <Feature key={item}>
                            <FeatureTitle>
                              <strong>{attributes.WSR_RIVER_NAME}</strong>
                            </FeatureTitle>

                            <table className="table">
                              <tbody>
                                <tr>
                                  <td>
                                    <em>Short Name</em>
                                  </td>
                                  <td>{attributes.WSR_RIVER_SHORTNAME}</td>
                                </tr>

                                <tr>
                                  <td>
                                    <em>Agency</em>
                                  </td>
                                  <td>{attributes.AGENCY}</td>
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
                                  <td>{attributes.MANAGING_ENTITIES}</td>
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
                                    <em>More information</em>
                                  </td>
                                  <td>
                                    <a
                                      href={attributes.WEBLINK}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {attributes.WEBLINK}
                                    </a>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </Feature>
                        );
                      })}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem title={<strong>Protection Projects</strong>}>
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
                          <Text>
                            There are no EPA funded protection projects in the{' '}
                            {watershed} watershed.
                          </Text>
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
                                <Feature key={index}>
                                  <FeatureTitle>
                                    <strong>
                                      {item['prj_title'] || 'Unknown'}
                                    </strong>
                                    <br />
                                    <small>
                                      ID: {item['prj_seq'] || 'Unknown ID'}
                                    </small>
                                  </FeatureTitle>

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
                                </Feature>
                              );
                            })}
                          </>
                        )}
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </AccordionList>
            </TabPanel>
            <TabPanel>
              <p>
                <em>Links below open in a new browser tab.</em>
              </p>
              <p>Get quick tips for reducing water impairment in your:</p>

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

export default function ProtectContainer({ ...props }: Props) {
  return (
    <TabErrorBoundary tabName="Protect">
      <Protect {...props} />
    </TabErrorBoundary>
  );
}
