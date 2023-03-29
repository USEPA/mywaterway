// @flow

import { useContext } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import { css } from 'styled-components/macro';
// components
import { AccordionList, AccordionItem } from 'components/shared/Accordion';
import { ListContent } from 'components/shared/BoxContent';
import { tabsStyles } from 'components/shared/ContentTabs';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import { errorBoxStyles } from 'components/shared/MessageBoxes';
import TabErrorBoundary from 'components/shared/ErrorBoundary.TabErrorBoundary';
import {
  keyMetricsStyles,
  keyMetricStyles,
  keyMetricNumberStyles,
  keyMetricLabelStyles,
} from 'components/shared/KeyMetrics';
import { modifiedTableStyles } from 'styles';
// contexts
import { useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
// utilities
import { getUrlFromMarkup } from 'components/shared/Regex';
import { useWaterbodyOnMap } from 'utils/hooks';
// errors
import {
  restoreNonpointSourceError,
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

function Restore() {
  const { attainsPlans, grts, watershed } = useContext(LocationSearchContext);

  const { updateVisibleLayers } = useLayers();

  // draw the waterbody on the map
  useWaterbodyOnMap('restoreTab', 'overallstatus');

  const sortedGrtsData =
    grts.data.items && grts.data.items.length > 0
      ? grts.data.items
          .sort((a, b) => a.prj_title.localeCompare(b.prj_title))
          .filter((project) => {
            return !project.ws_protect_ind || project.ws_protect_ind === 'N';
          })
      : [];

  const sortedAttainsPlanData =
    attainsPlans.data.items && attainsPlans.data.items.length > 0
      ? attainsPlans.data.items
          .filter((item) => item.actionTypeCode !== 'Protection Approach')
          .sort((a, b) => a.actionName.localeCompare(b.actionName))
      : [];

  return (
    <div css={containerStyles}>
      <div css={keyMetricsStyles}>
        <div css={keyMetricStyles}>
          {grts.status === 'fetching' ? (
            <LoadingSpinner />
          ) : (
            <span css={keyMetricNumberStyles}>
              {grts.status === 'failure'
                ? 'N/A'
                : sortedGrtsData.length.toLocaleString()}
            </span>
          )}
          <p css={keyMetricLabelStyles}>Projects</p>
        </div>
        <div css={keyMetricStyles}>
          {attainsPlans.status === 'fetching' ? (
            <LoadingSpinner />
          ) : (
            <span css={keyMetricNumberStyles}>
              {attainsPlans.status === 'failure'
                ? 'N/A'
                : sortedAttainsPlanData.length.toLocaleString()}
            </span>
          )}
          <p css={keyMetricLabelStyles}>Plans</p>
        </div>
      </div>

      <div css={tabsStyles}>
        <Tabs
          onChange={(index) =>
            updateVisibleLayers({ waterbodyLayer: index === 1 })
          }
        >
          <TabList>
            <Tab>Clean Water Act Section 319 Projects</Tab>
            <Tab>Restoration Plans</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <>
                {grts.status === 'fetching' && <LoadingSpinner />}

                {grts.status === 'failure' && (
                  <div css={errorBoxStyles}>
                    <p>{restoreNonpointSourceError}</p>
                  </div>
                )}

                {grts.status === 'success' && (
                  <>
                    {sortedGrtsData.length === 0 && (
                      <p css={textStyles}>
                        There are no{' '}
                        <GlossaryTerm term="Clean Water Act Section 319 Projects">
                          Clean Water Act Section 319
                        </GlossaryTerm>{' '}
                        projects in the <em>{watershed}</em> watershed.
                      </p>
                    )}

                    {sortedGrtsData.length > 0 && (
                      <>
                        <AccordionList
                          title={
                            <>
                              There {sortedGrtsData.length === 1 ? 'is' : 'are'}{' '}
                              <strong>
                                {sortedGrtsData.length.toLocaleString()}
                              </strong>{' '}
                              EPA Funded{' '}
                              {sortedGrtsData.length === 1 ? 'grant' : 'grants'}{' '}
                              under the{' '}
                              <GlossaryTerm term="Clean Water Act Section 319 Projects">
                                Clean Water Act Section 319
                              </GlossaryTerm>{' '}
                              that benefit waterbodies in the{' '}
                              <em>{watershed}</em> watershed.
                            </>
                          }
                        >
                          {sortedGrtsData.map((item, index) => {
                            const url = getUrlFromMarkup(item.project_link);

                            let watershedPlans = null;
                            if (item.watershed_plans !== null) {
                              try {
                                watershedPlans = JSON.parse(
                                  item.watershed_plans,
                                );
                              } catch (err) {
                                console.error(err);
                              }
                            }

                            return (
                              <AccordionItem
                                key={index}
                                title={
                                  <strong>{item.prj_title || 'Unknown'}</strong>
                                }
                                subTitle={
                                  <>ID: {item.prj_seq || 'Unknown ID'}</>
                                }
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
                      </>
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
                      <p css={textStyles}>
                        There are no EPA funded{' '}
                        <GlossaryTerm term="Restoration plan">
                          restoration plans
                        </GlossaryTerm>{' '}
                        in the <em>{watershed}</em> watershed.
                      </p>
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
                            in the <em>{watershed}</em> watershed.
                          </>
                        }
                      >
                        {sortedAttainsPlanData.map((item, index) => {
                          let planType = item.actionTypeCode;
                          if (planType === 'TMDL') {
                            planType = (
                              <>
                                Restoration Plan:{' '}
                                <GlossaryTerm term="TMDL">TMDL</GlossaryTerm>
                              </>
                            );
                          }
                          if (planType === '4B Restoration Approach') {
                            planType = (
                              <>
                                Restoration Plan:{' '}
                                <GlossaryTerm term="4B Restoration Approach">
                                  4B Restoration Approach
                                </GlossaryTerm>
                              </>
                            );
                          }
                          if (planType === 'Alternative Restoration Approach') {
                            planType = (
                              <>
                                Restoration Plan:{' '}
                                <GlossaryTerm term="Alternative Restoration Approach">
                                  Alternative Restoration Approach
                                </GlossaryTerm>
                              </>
                            );
                          }

                          return (
                            <AccordionItem
                              key={index}
                              title={
                                <strong>{item.actionName || 'Unknown'}</strong>
                              }
                              subTitle={<>ID: {item.actionIdentifier}</>}
                            >
                              <ListContent
                                rows={[
                                  {
                                    label: 'Plan Type',
                                    value: planType,
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
