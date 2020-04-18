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
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
// utilities
import { getUrlFromMarkup, getTitleFromMarkup } from 'components/shared/Regex';
// styles
import { fonts } from 'styles/index.js';
// errors
import { protectNonpointSourceError } from 'config/errorMessages';

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

// --- components ---
type Props = {
  // props passed implicitly in Community component
  esriModules: Object,
  infoToggleChecked: boolean,
};

function Protect({ esriModules, infoToggleChecked }: Props) {
  const { grts, watershed } = React.useContext(LocationSearchContext);

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

  return (
    <Container>
      <ContentTabs>
        <Tabs>
          <TabList>
            <Tab>Tips</Tab>
            <Tab>Protection Projects</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
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
            <TabPanel>
              <>
                {grts.status === 'fetching' && <LoadingSpinner />}

                {grts.status === 'failure' && (
                  <StyledErrorBox>
                    <p>{protectNonpointSourceError}</p>
                  </StyledErrorBox>
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
                      <AccordionList
                        title={`EPA funded protection projects in the ${watershed} watershed.`}
                      >
                        {sortedGrtsData.map((item, index) => {
                          const url = getUrlFromMarkup(item['project_link']);
                          const protectionPlans =
                            item['watershed_plans'] &&
                            // break string into pieces separated by commas and map over them
                            item['watershed_plans'].split(',').map((plan) => {
                              const markup = plan.split('</a>')[0] + '</a>';
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
                            <AccordionItem
                              key={index}
                              title={
                                <strong>
                                  {item['prj_title'] || 'Unknown'}
                                </strong>
                              }
                              subTitle={`ID: ${item['prj_seq'] ||
                                'Unknown ID'}`}
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
                            </AccordionItem>
                          );
                        })}
                      </AccordionList>
                    )}
                  </>
                )}
              </>
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
