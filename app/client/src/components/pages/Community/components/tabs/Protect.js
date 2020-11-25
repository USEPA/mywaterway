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

const AccordionContent = styled.div`
  padding: 0.875em;

  p:last-of-type {
    padding-bottom: 0.875rem;
  }
`;

const Project = styled.div`
  // NOTE: this is still a work in progress...just highlighting each project
  // on hover for now (if there's eventually a geospacial component for each
  // project, we'll want to hightlight it on the map)

  &:hover {
    background-color: #f0f6f9;
  }
`;

const ProjectTitle = styled.p`
  padding: 0.75rem;
`;

const NewTabDisclaimer = styled.div`
  display: inline-block;
`;

// --- components ---
function Protect() {
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

  const accordionRef = React.useRef();

  // initially expand first accordion item
  React.useEffect(() => {
    if (accordionRef.current) {
      const accordion = accordionRef.current;
      const header = accordion.querySelector('.hmw-accordion-header');
      if (header) header.click();
    }
  }, [accordionRef]);

  return (
    <Container>
      <ContentTabs>
        <Tabs>
          <TabList>
            <Tab>Tips</Tab>
            <Tab>Watershed Health and Protection</Tab>
          </TabList>
          <TabPanels>
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
            <TabPanel>
              <p>
                Learn about watershed health scores in relation to your state,
                if there are any protected areas in your watershed, and the
                location of any designated <em>Wild and Scenic Rivers</em>
              </p>

              <div ref={accordionRef}>
                <AccordionList title={''}>
                  <AccordionItem
                    title={<strong>Watershed Health Scores</strong>}
                  >
                    <AccordionContent>
                      <p>
                        <strong>
                          Where do the healthiest watersheds occur?
                        </strong>
                      </p>
                      <p>
                        The Watershed Health Index, from the Preliminary Healthy
                        Watersheds Assessment (PHWA), is a score of{' '}
                        <strong>watershed health</strong> across the
                        conterminous United States
                      </p>
                      <ul>
                        <li>
                          The map to the left shows watershed health,
                          characterized by the presence of natural land cover
                          that supports hydrologic and geomorphic processes
                          within their natural range of variation, good water
                          quality, and habitats of sufficient size and
                          connectivity to support healthy, native aquatic and
                          riparian biological communities.
                        </li>
                        <li>
                          Each Watershed Health Index score is relative to the
                          scores (1-99% percentile) of watersheds across the
                          state. A HUC12 watershed that straddles more than one
                          state is scored only in the state in which its
                          majority area resides.
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
                          Provides an initial dataset upon which others can
                          build better watershed condition information.
                        </li>
                        <li>
                          Improves communication and coordination among
                          watershed management partners by providing nationally
                          consistent measures of watershed health.
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
                        official national inventory of U.S. terrestrial and
                        marine protected areas that are dedicated to the
                        preservation of biological diversity and to other
                        natural, recreation and cultural uses, managed for these
                        purposes through legal or other effective means.
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
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    title={<strong>Wild and Scenic Rivers</strong>}
                  >
                    <AccordionContent>
                      <p>
                        The National Wild and Scenic Rivers System was created
                        by Congress in 1968 to preserve certain rivers with
                        outstanding natural, cultural, and recreational values
                        in a free-flowing condition for the enjoyment of present
                        and future generations. The Act is notable for
                        safeguarding the special character of these rivers,
                        while also recognizing the potential for their
                        appropriate use and development. It encourages river
                        management that crosses political boundaries and
                        promotes public participation in developing goals for
                        river protection.
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
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem title={<strong>Protection Projects</strong>}>
                    <AccordionContent>
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
                            <>
                              <p>
                                EPA funded protection projects in the{' '}
                                {watershed} watershed.
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
                                  <Project key={index}>
                                    <ProjectTitle>
                                      <strong>
                                        {item['prj_title'] || 'Unknown'}
                                      </strong>
                                      <br />
                                      <small>
                                        ID: {item['prj_seq'] || 'Unknown ID'}
                                      </small>
                                    </ProjectTitle>

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
                                  </Project>
                                );
                              })}
                            </>
                          )}
                        </>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </AccordionList>
              </div>
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
