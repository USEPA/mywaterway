// @flow
/** @jsxImportSource @emotion/react */

import { useContext } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import { css } from '@emotion/react';
// components
import { AccordionList, AccordionItem } from 'components/shared/Accordion';
import { ListContent } from 'components/shared/BoxContent';
import { tabsStyles } from 'components/shared/ContentTabs';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import {
  errorBoxStyles,
  infoBoxStyles,
  textBoxStyles,
} from 'components/shared/MessageBoxes';
import TabErrorBoundary from 'components/shared/ErrorBoundary.TabErrorBoundary';
import {
  keyMetricsStyles,
  keyMetricStyles,
  keyMetricNumberStyles,
  keyMetricLabelStyles,
} from 'components/shared/KeyMetrics';
// contexts
import { useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
// utilities
import { getUrlFromMarkup } from 'components/shared/Regex';
import { useWaterbodyOnMap } from 'utils/hooks';
import { mapRestorationPlanToGlossary } from 'utils/mapFunctions';
import { countOrNotAvailable, getExtensionFromPath } from 'utils/utils';
// styles
import { iconStyles, modifiedTableStyles } from 'styles';
// errors
import {
  restoreNonpointSourceError,
  restoreStoriesError,
  restorationPlanError,
} from 'config/errorMessages';

const accordionContentStyles = css`
  padding: 0 0.875em 0.875em;
`;

const containerStyles = css`
  @media (min-width: 960px) {
    padding: 1em;
  }
`;

const textStyles = css`
  text-align: center;
`;

const disclaimerStyles = css`
  display: inline-block;
`;

const linkBoxStyles = css``;

const storyStyles = css`
  padding: 0 0.75em 0.75em;

  div {
    ${textBoxStyles}
    padding: 0.75em;
  }
`;

function Restore() {
  const { attainsPlans, grts, grtsStories, watershed } = useContext(
    LocationSearchContext,
  );

  const { updateVisibleLayers } = useLayers();

  // draw the waterbody on the map
  useWaterbodyOnMap('restoreTab', 'overallstatus');

  const sortedGrtsData =
    grts.data.items
      ?.filter((project) => {
        return !project.ws_protect_ind || project.ws_protect_ind === 'N';
      })
      .sort((a, b) => a.prj_title.localeCompare(b.prj_title)) ?? [];

  const sortedStoriesData =
    grtsStories.data.items
      ?.filter((story) => story.ss_overview && story.web_link) // Filter stories that have no description text or url
      .sort((a, b) => a.ss_title.localeCompare(b.ss_title)) ?? [];

  const sortedAttainsPlanData =
    attainsPlans.data.items
      ?.filter((item) => item.actionTypeCode !== 'Protection Approach')
      .sort((a, b) => a.actionName.localeCompare(b.actionName)) ?? [];

  return (
    <div css={containerStyles}>
      <div css={keyMetricsStyles}>
        <div css={keyMetricStyles}>
          {grts.status === 'fetching' ? (
            <LoadingSpinner />
          ) : (
            <span css={keyMetricNumberStyles}>
              {countOrNotAvailable(sortedGrtsData, grts.status)}
            </span>
          )}
          <p css={keyMetricLabelStyles}>Projects</p>
        </div>
        <div css={keyMetricStyles}>
          {attainsPlans.status === 'fetching' ? (
            <LoadingSpinner />
          ) : (
            <span css={keyMetricNumberStyles}>
              {countOrNotAvailable(sortedAttainsPlanData, attainsPlans.status)}
            </span>
          )}
          <p css={keyMetricLabelStyles}>Plans</p>
        </div>
        <div css={keyMetricStyles}>
          {grtsStories.status === 'fetching' ? (
            <LoadingSpinner />
          ) : (
            <span css={keyMetricNumberStyles}>
              {countOrNotAvailable(sortedStoriesData, grtsStories.status)}
            </span>
          )}
          <p css={keyMetricLabelStyles}>Stories</p>
        </div>
      </div>

      <div css={tabsStyles}>
        <Tabs
          onChange={(index) =>
            updateVisibleLayers({ waterbodyLayer: index === 1 })
          }
        >
          <TabList>
            <Tab>Nonpoint Source Projects</Tab>
            <Tab>Restoration Plans</Tab>
            <Tab>Success Stories</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <>
                <p>
                  <GlossaryTerm term="Nonpoint Source Pollution">
                    Nonpoint Source pollution
                  </GlossaryTerm>{' '}
                  generally results from land runoff, precipitation, atmospheric
                  deposition, drainage, seepage or hydrologic modification.
                </p>

                {grts.status === 'fetching' && <LoadingSpinner />}

                {grts.status === 'failure' && (
                  <div css={errorBoxStyles}>
                    <p>{restoreNonpointSourceError}</p>
                  </div>
                )}

                {grts.status === 'success' && (
                  <>
                    {sortedGrtsData.length === 0 && (
                      <div css={infoBoxStyles}>
                        <p css={textStyles}>
                          There are no nonpoint source projects in the{' '}
                          <em>{watershed.name}</em> watershed.
                        </p>
                      </div>
                    )}

                    {sortedGrtsData.length > 0 && (
                      <AccordionList
                        title={
                          <>
                            There {sortedGrtsData.length === 1 ? 'is' : 'are'}{' '}
                            <strong>
                              {sortedGrtsData.length.toLocaleString()}
                            </strong>{' '}
                            Nonpoint Source{' '}
                            {sortedGrtsData.length === 1
                              ? 'project'
                              : 'projects'}{' '}
                            funded from EPA grants under the{' '}
                            <GlossaryTerm term="Clean Water Act Section 319 Projects">
                              Clean Water Act Section 319
                            </GlossaryTerm>{' '}
                            that benefit waterbodies in the{' '}
                            <em>{watershed.name}</em> watershed.
                          </>
                        }
                      >
                        {sortedGrtsData.map((item) => {
                          const url = getUrlFromMarkup(item.project_link);

                          let watershedPlans = null;
                          if (item.watershed_plans !== null) {
                            try {
                              watershedPlans = JSON.parse(item.watershed_plans);
                            } catch (err) {
                              console.error(err);
                              window.logErrorToGa(
                                `Failed to parse watershed_plans JSON data for the "${item.prj_title}" project with ID "${item.prj_seq}"`,
                              );
                            }
                          }

                          return (
                            <AccordionItem
                              ariaLabel={item.prj_title || 'Unknown'}
                              key={item.prj_seq}
                              title={
                                <strong>{item.prj_title || 'Unknown'}</strong>
                              }
                              subTitle={<>ID: {item.prj_seq || 'Unknown ID'}</>}
                            >
                              <ListContent
                                rows={[
                                  item.pollutants
                                    ? {
                                        label: 'Impairments',
                                        value: item.pollutants,
                                      }
                                    : null,
                                  {
                                    label: (
                                      <GlossaryTerm term="Total EPA Funds (CWA 319)">
                                        Total EPA Funds
                                      </GlossaryTerm>
                                    ),
                                    value: item.total_319_funds,
                                  },
                                  {
                                    label: (
                                      <GlossaryTerm term="Total Budget (CWA 319)">
                                        Total Budget
                                      </GlossaryTerm>
                                    ),
                                    value: item.total_budget,
                                  },
                                  {
                                    label: 'Project Start Date',
                                    value: item.project_start_date,
                                  },
                                  {
                                    label: 'Project Status',
                                    value: item.status,
                                  },
                                  {
                                    label: 'Project Details',
                                    value: (
                                      <>
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          Open Project Summary
                                        </a>
                                        <small css={disclaimerStyles}>
                                          (opens new browser tab)
                                        </small>
                                      </>
                                    ),
                                  },
                                ]}
                              />
                              {Array.isArray(watershedPlans) &&
                                watershedPlans.length > 0 && (
                                  <div css={accordionContentStyles}>
                                    <table
                                      aria-label="Watershed Plans"
                                      css={modifiedTableStyles}
                                      className="table"
                                    >
                                      <thead>
                                        <tr>
                                          <th>Watershed Plan</th>
                                          <th>Watershed Plan Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {watershedPlans.map((plan) => (
                                          <tr key={plan.title}>
                                            <td>
                                              {plan.link ? (
                                                <a
                                                  href={plan.link}
                                                  rel="noopener noreferrer"
                                                  target="_blank"
                                                >
                                                  {plan.title ||
                                                    'No Document Available'}
                                                </a>
                                              ) : (
                                                plan.title ||
                                                'No Document Available'
                                              )}
                                            </td>
                                            <td>
                                              {plan.status || 'Not Available'}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                            </AccordionItem>
                          );
                        })}
                      </AccordionList>
                    )}
                  </>
                )}
              </>
            </TabPanel>

            <TabPanel>
              <>
                <p>
                  View all restoration plans for the selected watershed in the
                  list below. Find out which plans are in place to restore each
                  waterbody shown on the map.
                </p>

                {attainsPlans.status === 'fetching' && <LoadingSpinner />}

                {attainsPlans.status === 'failure' && (
                  <div css={errorBoxStyles}>
                    <p>{restorationPlanError}</p>
                  </div>
                )}

                {attainsPlans.status === 'success' && (
                  <>
                    {sortedAttainsPlanData.length === 0 && (
                      <div css={infoBoxStyles}>
                        <p css={textStyles}>
                          There are no EPA funded{' '}
                          <GlossaryTerm term="Restoration plan">
                            restoration plans
                          </GlossaryTerm>{' '}
                          in the <em>{watershed.name}</em> watershed.
                        </p>
                      </div>
                    )}

                    {sortedAttainsPlanData.length > 0 && (
                      <AccordionList
                        title={
                          <>
                            There{' '}
                            {sortedAttainsPlanData.length === 1 ? 'is' : 'are'}{' '}
                            <strong>
                              {sortedAttainsPlanData.length.toLocaleString()}
                            </strong>{' '}
                            <GlossaryTerm term="Restoration plan">
                              Restoration{' '}
                              {sortedAttainsPlanData.length === 1
                                ? 'plan'
                                : 'plans'}
                            </GlossaryTerm>{' '}
                            in the <em>{watershed.name}</em> watershed.
                          </>
                        }
                      >
                        {sortedAttainsPlanData.map((item) => {
                          return (
                            <AccordionItem
                              key={item.actionIdentifier}
                              title={
                                <strong>{item.actionName || 'Unknown'}</strong>
                              }
                              subTitle={<>ID: {item.actionIdentifier}</>}
                            >
                              <ListContent
                                rows={[
                                  {
                                    label: 'Plan Type',
                                    value: mapRestorationPlanToGlossary(
                                      item.actionTypeCode,
                                      true,
                                    ),
                                  },
                                  {
                                    label: 'Status',
                                    /* if Action type is not a TMDL, change 'EPA Final Action' to 'Final */
                                    value:
                                      item.actionTypeCode !== 'TMDL' &&
                                      item.actionStatusCode ===
                                        'EPA Final Action'
                                        ? 'Final'
                                        : item.actionStatusCode,
                                  },
                                  {
                                    label: 'Completion Date',
                                    value: item.completionDate,
                                  },
                                  item.actionIdentifier
                                    ? {
                                        label: 'Plan Details',
                                        value: (
                                          <>
                                            <a
                                              href={`/plan-summary/${item.organizationId}/${item.actionIdentifier}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                            >
                                              Open Plan Summary
                                            </a>
                                            <small css={disclaimerStyles}>
                                              (opens new browser tab)
                                            </small>
                                          </>
                                        ),
                                      }
                                    : null,
                                ]}
                              />
                            </AccordionItem>
                          );
                        })}
                      </AccordionList>
                    )}
                  </>
                )}
              </>
            </TabPanel>

            <TabPanel>
              <>
                <p>Some descriptive text</p>
                {grtsStories.status === 'fetching' && <LoadingSpinner />}
                {grtsStories.status === 'failure' && (
                  <div css={errorBoxStyles}>
                    <p>{restoreStoriesError}</p>
                  </div>
                )}
                {grtsStories.status === 'success' && (
                  <>
                    {sortedStoriesData.length === 0 && (
                      <div css={infoBoxStyles}>
                        <p css={textStyles}>
                          There are no stories available for the{' '}
                          <em>{watershed.name}</em> watershed.
                        </p>
                      </div>
                    )}

                    {sortedStoriesData.length > 0 && (
                      <AccordionList
                        title={
                          <>
                            There{' '}
                            {sortedStoriesData.length === 1 ? 'is' : 'are'}{' '}
                            <strong>
                              {sortedStoriesData.length.toLocaleString()}
                            </strong>{' '}
                            {sortedStoriesData.length === 1
                              ? 'story'
                              : 'stories'}{' '}
                            about Nonpoint Source projects funded from EPA
                            grants under the{' '}
                            <GlossaryTerm term="Clean Water Act Section 319 Projects">
                              Clean Water Act Section 319
                            </GlossaryTerm>{' '}
                            that benefit waterbodies in the{' '}
                            <em>{watershed.name}</em> watershed.
                          </>
                        }
                      >
                        {sortedStoriesData.map((item) => (
                          <AccordionItem
                            ariaLabel={item.ss_title}
                            key={item.ss_seq}
                            title={<strong>{item.ss_title}</strong>}
                          >
                            <div css={storyStyles}>
                              <p>{item.ss_overview}</p>
                              <div css={linkBoxStyles}>
                                <a
                                  href={item.web_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <i
                                    css={iconStyles}
                                    className="fas fa-file-alt"
                                    aria-hidden="true"
                                  />
                                  Full Story (
                                  {getExtensionFromPath(item.web_link)})
                                </a>
                                &nbsp;&nbsp;
                                <small css={disclaimerStyles}>
                                  (opens new browser tab)
                                </small>
                              </div>
                            </div>
                          </AccordionItem>
                        ))}
                      </AccordionList>
                    )}
                  </>
                )}
              </>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}

export default function RestoreContainer() {
  return (
    <TabErrorBoundary tabName="Restore">
      <Restore />
    </TabErrorBoundary>
  );
}
