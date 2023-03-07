// @flow

import { useCallback, useContext, useEffect, useState } from 'react';
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
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
// utilities
import { getUrlFromMarkup } from 'components/shared/Regex';
import { useWaterbodyOnMap } from 'utils/hooks';
// errors
import {
  restoreNonpointSourceError,
  restorationPlanError,
} from 'config/errorMessages';

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
  const {
    attainsPlans,
    cipSummary,
    grts,
    visibleLayers,
    setVisibleLayers,
    watershed,
    waterbodyLayer,
  } = useContext(LocationSearchContext);

  // draw the waterbody on the map
  useWaterbodyOnMap('restoreTab', 'overallstatus');

  const [restoreLayerEnabled, setRestoreLayerEnabled] = useState(true);

  // Syncs the toggles with the visible layers on the map. Mainly
  // used for when the user toggles layers in full screen mode and then
  // exist full screen.
  useEffect(() => {
    const { waterbodyLayer } = visibleLayers;

    if (typeof waterbodyLayer === 'boolean') {
      setRestoreLayerEnabled(waterbodyLayer);
    }
  }, [visibleLayers]);

  // Updates the visible layers. This function also takes into account whether
  // or not the underlying webservices failed.
  const updateVisibleLayers = useCallback(
    ({ key = null, newValue = null, useCurrentValue = false }) => {
      const newVisibleLayers = {};
      if (cipSummary.status !== 'failure') {
        newVisibleLayers['waterbodyLayer'] =
          !waterbodyLayer || useCurrentValue
            ? visibleLayers['waterbodyLayer']
            : restoreLayerEnabled;
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
      waterbodyLayer,
      restoreLayerEnabled,
      cipSummary,
      visibleLayers,
      setVisibleLayers,
    ],
  );

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

  const setRestoreLayerVisibility = (visible) => {
    setRestoreLayerEnabled(visible);

    // first check if layer exists and is not falsy
    updateVisibleLayers({
      key: 'waterbodyLayer',
      newValue: waterbodyLayer && visible,
    });
  };

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
        <Tabs onChange={(index) => setRestoreLayerVisibility(index === 1)}>
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
                                      label: 'Total Funds',
                                      value: item.total_319_funds,
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
