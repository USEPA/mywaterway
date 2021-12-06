// @flow

import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import { css } from 'styled-components/macro';
// components
import { AccordionList, AccordionItem } from 'components/shared/Accordion';
import { ContentTabs } from 'components/shared/ContentTabs';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import { StyledErrorBox } from 'components/shared/MessageBoxes';
import Switch from 'components/shared/Switch';
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
import { getUrlFromMarkup, getTitleFromMarkup } from 'components/shared/Regex';
import { useWaterbodyFeatures, useWaterbodyOnMap } from 'utils/hooks';
import { getUniqueWaterbodies } from 'components/pages/LocationMap/MapFunctions';
// errors
import {
  restoreNonpointSourceError,
  restorationPlanError,
} from 'config/errorMessages';

// --- styled components ---
const containerStyles = css`
  padding: 1em;
`;

const textStyles = css`
  text-align: center;
`;

const newTabDisclaimerStyles = css`
  display: inline-block;
`;

const switchContainerStyles = css`
  margin-top: 0.5em;
`;

// --- components ---
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

  // set the waterbody features
  const waterbodies = useWaterbodyFeatures();

  const uniqueWaterbodies = waterbodies
    ? getUniqueWaterbodies(waterbodies)
    : [];

  // draw the waterbody on the map
  useWaterbodyOnMap('restoreTab');

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
          .sort((objA, objB) => {
            return objA['prj_title'].localeCompare(objB['prj_title']);
          })
          .filter(
            (project) =>
              !project.ws_protect_ind || project.ws_protect_ind === 'N',
          )
      : [];

  const sortedAttainsPlanData =
    attainsPlans.data.items && attainsPlans.data.items.length > 0
      ? attainsPlans.data.items
          .filter((item) => item.actionTypeCode !== 'Protection Approach')
          .sort((objA, objB) => {
            return objA['actionName'].localeCompare(objB['actionName']);
          })
      : [];

  const waterbodyCount = uniqueWaterbodies && uniqueWaterbodies.length;

  return (
    <div css={containerStyles}>
      <StyledMetrics>
        <StyledMetric>
          {grts.status === 'fetching' ? (
            <LoadingSpinner />
          ) : (
            <StyledNumber>
              {grts.status === 'failure'
                ? 'N/A'
                : sortedGrtsData.length.toLocaleString()}
            </StyledNumber>
          )}
          <StyledLabel>Projects</StyledLabel>
        </StyledMetric>
        <StyledMetric>
          {attainsPlans.status === 'fetching' ? (
            <LoadingSpinner />
          ) : (
            <StyledNumber>
              {attainsPlans.status === 'failure'
                ? 'N/A'
                : sortedAttainsPlanData.length.toLocaleString()}
            </StyledNumber>
          )}
          <StyledLabel>Plans</StyledLabel>
          <div css={switchContainerStyles}>
            <Switch
              checked={Boolean(waterbodyCount) && restoreLayerEnabled}
              onChange={(checked) => {
                setRestoreLayerEnabled(!restoreLayerEnabled);

                // first check if layer exists and is not falsy
                updateVisibleLayers({
                  key: 'waterbodyLayer',
                  newValue: waterbodyLayer && !restoreLayerEnabled,
                });
              }}
              disabled={!Boolean(waterbodyCount)}
              ariaLabel="Waterbodies"
            />
          </div>
        </StyledMetric>
      </StyledMetrics>

      <ContentTabs>
        <Tabs>
          <TabList>
            <Tab>Clean Water Act Section 319 Projects</Tab>
            <Tab>Restoration Plans</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <>
                {grts.status === 'fetching' && <LoadingSpinner />}

                {grts.status === 'failure' && (
                  <StyledErrorBox>
                    <p>{restoreNonpointSourceError}</p>
                  </StyledErrorBox>
                )}

                {grts.status === 'success' && (
                  <>
                    {sortedGrtsData.length === 0 && (
                      <p css={textStyles}>
                        There are no{' '}
                        <GlossaryTerm term="Clean Water Act Section 319 Projects">
                          Clean Water Act Section 319
                        </GlossaryTerm>{' '}
                        projects in the {watershed} watershed.
                      </p>
                    )}
                    {sortedGrtsData.length > 0 && (
                      <>
                        <AccordionList
                          title={
                            <>
                              EPA Funded grants under the{' '}
                              <GlossaryTerm term="Clean Water Act Section 319 Projects">
                                Clean Water Act Section 319
                              </GlossaryTerm>{' '}
                              that benefit waterbodies in the {watershed}{' '}
                              watershed.
                            </>
                          }
                        >
                          {sortedGrtsData.map((item, index) => {
                            const url = getUrlFromMarkup(item['project_link']);
                            const documents =
                              item['watershed_plans'] &&
                              // break string into pieces separated by commas and map over them
                              item['watershed_plans'].split(',').map((plan) => {
                                const markup = plan.split('</a>')[0] + '</a>';
                                const title = getTitleFromMarkup(markup);
                                const planUrl = getUrlFromMarkup(markup);
                                if (!title || !planUrl) return false;
                                return { url: planUrl, title: title };
                              });
                            // remove any documents with missing titles or urls
                            const filteredDocuments =
                              documents &&
                              documents.filter(
                                (document) =>
                                  document && document.url && document.title,
                              );
                            return (
                              <AccordionItem
                                key={index}
                                title={
                                  <strong>
                                    {item['prj_title'] || 'Unknown'}
                                  </strong>
                                }
                                subTitle={`ID:  ${
                                  item['prj_seq'] || 'Unknown ID'
                                }`}
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
                                        <div css={newTabDisclaimerStyles}>
                                          (opens new browser tab)
                                        </div>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        <em>Documents:</em>
                                      </td>

                                      {filteredDocuments &&
                                      filteredDocuments.length > 0 ? (
                                        <td>
                                          {filteredDocuments.map(
                                            (document, index) => {
                                              if (
                                                document &&
                                                document.url &&
                                                document.title
                                              ) {
                                                return (
                                                  <div key={index}>
                                                    <a
                                                      href={document.url}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                    >
                                                      {document.title}
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
                      </>
                    )}
                  </>
                )}
              </>
            </TabPanel>

            <TabPanel>
              <>
                {attainsPlans.status === 'fetching' && <LoadingSpinner />}

                {attainsPlans.status === 'failure' && (
                  <StyledErrorBox>
                    <p>{restorationPlanError}</p>
                  </StyledErrorBox>
                )}

                {attainsPlans.status === 'success' && (
                  <>
                    {sortedAttainsPlanData.length === 0 && (
                      <p css={textStyles}>
                        There are no EPA funded{' '}
                        <GlossaryTerm term="Restoration plan">
                          restoration plans
                        </GlossaryTerm>{' '}
                        in the {watershed} watershed.
                      </p>
                    )}
                    {sortedAttainsPlanData.length > 0 && (
                      <>
                        <AccordionList
                          title={
                            <>
                              <GlossaryTerm term="Restoration plan">
                                Restoration plans
                              </GlossaryTerm>{' '}
                              in the {watershed} watershed.
                            </>
                          }
                        >
                          {sortedAttainsPlanData.map((item, index) => {
                            return (
                              <AccordionItem
                                key={index}
                                title={
                                  <strong>
                                    {item['actionName'] || 'Unknown'}
                                  </strong>
                                }
                                subTitle={`ID: ${item['actionIdentifier']}`}
                              >
                                <table className="table">
                                  <tbody>
                                    <tr>
                                      <td>
                                        <em>Plan Type:</em>
                                      </td>
                                      <td>{item['actionTypeCode']}</td>
                                    </tr>
                                    <tr>
                                      <td>
                                        <em>Status:</em>
                                      </td>
                                      <td>
                                        {/* if Action type is not a TMDL, change 'EPA Final Action' to 'Final */}
                                        {item['actionTypeCode'] !== 'TMDL' &&
                                        item['actionStatusCode'] ===
                                          'EPA Final Action'
                                          ? 'Final'
                                          : item['actionStatusCode']}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        <em>Completion Date:</em>
                                      </td>
                                      <td>{item['completionDate']}</td>
                                    </tr>
                                    {item['actionIdentifier'] && (
                                      <tr>
                                        <td>
                                          <em>Plan Details:</em>
                                        </td>
                                        <td>
                                          <a
                                            href={`/plan-summary/${item['organizationId']}/${item['actionIdentifier']}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            Open Plan Summary
                                          </a>
                                          &nbsp;&nbsp;
                                          <div css={newTabDisclaimerStyles}>
                                            (opens new browser tab)
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
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
          </TabPanels>
        </Tabs>
      </ContentTabs>
    </div>
  );
}

export default function RestoreContainer({ ...props }: Props) {
  return (
    <TabErrorBoundary tabName="Restore">
      <Restore {...props} />
    </TabErrorBoundary>
  );
}
