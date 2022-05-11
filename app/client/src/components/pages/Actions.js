// @flow

import React, {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useParams } from 'react-router-dom';
import { css } from 'styled-components/macro';
import WindowSize from '@reach/window-size';
import StickyBox from 'react-sticky-box';
// components
import Page from 'components/shared/Page';
import NavBar from 'components/shared/NavBar';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import {
  AccordionList,
  AccordionItem,
} from 'components/shared/AccordionMapHighlight';
import ShowLessMore from 'components/shared/ShowLessMore';
import ActionsMap from 'components/shared/ActionsMap';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import ViewOnMapButton from 'components/shared/ViewOnMapButton';
import MapVisibilityButton from 'components/shared/MapVisibilityButton';
import VirtualizedList from 'components/shared/VirtualizedList';
// styled components
import { errorBoxStyles } from 'components/shared/MessageBoxes';
import {
  splitLayoutContainerStyles,
  splitLayoutColumnsStyles,
  splitLayoutColumnStyles,
} from 'components/shared/SplitLayout';
import {
  boxStyles,
  boxHeadingStyles,
  boxSectionStyles,
} from 'components/shared/Box';
// contexts
import { FullscreenContext, FullscreenProvider } from 'contexts/Fullscreen';
import {
  MapHighlightContext,
  MapHighlightProvider,
} from 'contexts/MapHighlight';
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import { fetchCheck } from 'utils/fetchUtils';
import {
  getOrganizationLabel,
  getTypeFromAttributes,
} from 'utils/mapFunctions';
import { chunkArray } from 'utils/utils';
// styles
import { colors } from 'styles/index.js';
// errors
import { actionsError, noActionsAvailableCombo } from 'config/errorMessages';

const echoUrl = 'https://echo.epa.gov/detailed-facility-report?fid=';

function getAssessmentUnitNames(services: any, orgId: string, action: Object) {
  return new Promise((resolve, reject) => {
    const unitIds = action.associatedWaters.specificWaters.map((water) => {
      return water.assessmentUnitIdentifier;
    });

    // unitIds, in 100 item chunks, to not overload attains web service call
    const chunkedUnitIds = chunkArray(unitIds, 100);

    // request data with each chunk of unitIds
    const requests = [];

    chunkedUnitIds.forEach((chunk: Array<string>) => {
      const url =
        `${services.data.attains.serviceUrl}` +
        `assessmentUnits?organizationId=${orgId}` +
        `&assessmentUnitIdentifier=${chunk.join(',')}`;
      const request = fetchCheck(url);
      requests.push(request);
    });

    Promise.all(requests)
      .then((responses) => {
        // the attains assessmentUnits web service returns an object with an
        // 'items' array containing a single object. so we’ll create an array
        // constructed from the first (and only) item in the 'items' array of
        // each web service response
        const itemsFromEachResponse = responses.map((res) => res.items[0]);
        // we’ll then combine the array of objects from each response into
        // a single object, concatinating the assessment units data arrays
        // (every other field contains the same data each web service response)
        const data = itemsFromEachResponse.reduce((acc, cur) => {
          return {
            ...acc,
            assessmentUnits: acc.assessmentUnits.concat(cur.assessmentUnits),
          };
        });

        // pass combined data from all responses to be processed
        resolve(data);
      })
      .catch((err) => reject(err));
  });
}

function processAssessmentUnitData(data: Object, action: Object) {
  if (data) {
    const { assessmentUnits } = data;

    // create a temporary names object for mapping assessment unit ids and names
    const names = {};
    assessmentUnits.forEach((unit) => {
      names[unit.assessmentUnitIdentifier] = unit.assessmentUnitName;
    });

    // update each specific waters’ name from the mapping names object
    action.associatedWaters.specificWaters.forEach((water) => {
      water.assessmentUnitName = names[water.assessmentUnitIdentifier];
    });
  }

  // pass updated action and the org id to be displayed
  return action;
}

function getPollutantsWaters(action: Object, orgId: string) {
  // build up pollutants, and waters from action data
  const pollutants = [];
  const waters = [];

  action.associatedWaters.specificWaters.forEach((water) => {
    const {
      assessmentUnitIdentifier,
      assessmentUnitName,
      associatedPollutants,
      parameters,
    } = water;

    // build up unique list of pollutants
    associatedPollutants.forEach((pollutant) => {
      if (pollutants.indexOf(pollutant.pollutantName) === -1) {
        pollutants.push(pollutant.pollutantName);
      }
    });

    waters.push({
      assessmentUnitIdentifier,
      assessmentUnitName,
      associatedPollutants,
      parameters,
    });
  });

  const sortedWaters = waters.sort((a, b) => {
    if (a.assessmentUnitName && b.assessmentUnitName) {
      return a.assessmentUnitName.localeCompare(b.assessmentUnitName);
    } else if (!a.assessmentUnitName && b.assessmentUnitName) {
      return 1;
    } else {
      return -1;
    }
  });

  return {
    sortedPollutants: pollutants.sort((a, b) => a.localeCompare(b)),
    sortedWaters,
  };
}

function getWaterbodyGraphic(
  mapLayer: Object,
  orgId: string,
  assessmentUnitIdentifier: string,
) {
  const graphics = mapLayer.status === 'success' && mapLayer.layer?.graphics;
  if (!graphics) return null;

  const assessmentIndex = graphics.items.findIndex((graphic) => {
    const graphicOrgId = graphic.attributes.organizationid;
    const graphicAuId = graphic.attributes.assessmentunitidentifier;

    return graphicOrgId === orgId && graphicAuId === assessmentUnitIdentifier;
  });

  return assessmentIndex === -1 ? null : graphics.items[assessmentIndex];
}

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles}
  margin: 1rem;
  text-align: center;
`;

const inlineBoxStyles = css`
  ${boxSectionStyles};
  padding-top: 0;

  * {
    display: inline-block;
  }
`;

const introTextStyles = css`
  margin-top: 0 !important;
  padding-bottom: 0.4375em !important;
`;

const iconStyles = css`
  margin-right: 5px;
`;

const listStyles = css`
  padding-bottom: 0;
`;

const accordionContentStyles = css`
  padding: 0.4375em 0.875em 0.875em;

  li {
    margin-bottom: 0.875em;
  }

  p {
    margin-top: 0.875em;
  }

  button {
    margin-bottom: 0.25em;
  }
`;

const paragraphContentStyles = css`
  button {
    &:hover,
    &:focus {
      background-color: ${colors.navyBlue()};
    }
  }
`;

const disclaimerStyles = css`
  display: inline-block;
`;

const textBottomMarginStyles = css`
  margin-bottom: 0.5em !important;
`;

const strongBottomMarginStyles = css`
  display: block;
  margin-bottom: 0.25em !important;
`;

type Props = {
  fullscreen: Object, // passed from FullscreenContext.Consumer
};

function Actions({ fullscreen }: Props) {
  const { orgId, actionId } = useParams();

  const services = useServicesContext();

  const [loading, setLoading] = useState(true);
  const [noActions, setNoActions] = useState(false);
  const [error, setError] = useState(false);
  const [mapLayer, setMapLayer] = useState({
    status: 'fetching',
    layer: null,
  });

  const { selectedGraphic, highlightedGraphic } =
    useContext(MapHighlightContext);

  // fetch action data from the attains 'actions' web service
  const [organizationName, setOrganizationName] = useState('');
  const [actionName, setActionName] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [actionTypeCode, setActionTypeCode] = useState('');
  const [actionStatusCode, setActionStatusCode] = useState('');
  const [documents, setDocuments] = useState([]);
  const [pollutants, setPollutants] = useState([]);
  const [waters, setWaters] = useState([]);
  useEffect(() => {
    const url =
      services.data.attains.serviceUrl +
      `actions?ActionIdentifier=${actionId}` +
      `&organizationIdentifier=${orgId}`;

    function onError(err) {
      setLoading(false);
      setError(true);
      console.error(err);
    }

    fetchCheck(url)
      .then((res) => {
        if (res.items.length < 1) {
          setLoading(false);
          setNoActions(true);
          return;
        }

        setOrganizationName(res.items[0].organizationName);
        if (res.items.length >= 1 && res.items[0].actions.length >= 1) {
          const action = res.items[0].actions[0];

          getAssessmentUnitNames(services, orgId, action)
            .then((data) => {
              // process assessment unit data and get key action data
              const {
                actionName,
                completionDate,
                actionTypeCode,
                actionStatusCode,
                documents,
              } = processAssessmentUnitData(data, action);

              // Get a sorted list of pollutants and waters
              const { sortedPollutants, sortedWaters } = getPollutantsWaters(
                action,
                orgId,
              );

              // set the state variables
              setLoading(false);
              setActionName(actionName);
              setCompletionDate(completionDate);
              setActionTypeCode(actionTypeCode);
              setActionStatusCode(actionStatusCode);
              setDocuments(
                documents.sort((a, b) =>
                  a.documentName.localeCompare(b.documentName),
                ),
              );
              setPollutants(sortedPollutants);
              setWaters(sortedWaters);
            })
            .catch(onError);
        }
      })
      .catch(onError);
  }, [actionId, orgId, services]);

  // Builds the unitIds dictionary that is used for determining what
  // waters to display on the screen and what the content will be.
  const [unitIds, setUnitIds] = useState({});
  useEffect(() => {
    if (waters.length === 0) return;

    const unitIds = {};

    waters.forEach((water) => {
      const { assessmentUnitIdentifier, associatedPollutants, parameters } =
        water;

      const content = (reportingCycle, hasWaterbody) => {
        const assessmentUrl =
          reportingCycle && hasWaterbody
            ? `/waterbody-report/${orgId}/${assessmentUnitIdentifier}/${reportingCycle}`
            : `/waterbody-report/${orgId}/${assessmentUnitIdentifier}`;

        const hasTmdlData =
          actionTypeCode === 'TMDL' && associatedPollutants.length > 0;

        return (
          <>
            {organizationName && orgId && (
              <p css={textBottomMarginStyles}>
                <strong>Organization Name (ID):&nbsp;</strong>
                {organizationName} ({orgId})
              </p>
            )}
            {hasTmdlData && associatedPollutants.length > 0 && (
              <>
                <strong css={strongBottomMarginStyles}>
                  Associated Impairments:{' '}
                </strong>
                <ul css={listStyles}>
                  {associatedPollutants
                    .sort((a, b) =>
                      a.pollutantName.localeCompare(b.pollutantName),
                    )
                    .map((pollutant) => {
                      const permits = pollutant.permits
                        .filter((permit) => {
                          return permit.NPDESIdentifier;
                        })
                        .sort((a, b) => {
                          return a.NPDESIdentifier.localeCompare(
                            b.NPDESIdentifier,
                          );
                        });

                      return (
                        <li key={pollutant.pollutantName}>
                          <strong>{pollutant.pollutantName}</strong>
                          <br />
                          <em>TMDL End Point: </em>
                          <ShowLessMore
                            text={pollutant.TMDLEndPointText}
                            charLimit={150}
                          />
                          <br />
                          {permits.length > 0 && (
                            <em>Links below open in a new browser tab.</em>
                          )}
                          <br />
                          <em>Permits: </em>

                          {permits.length === 0 ? (
                            <>Not specified.</>
                          ) : (
                            permits.map((permit, index) => (
                              <Fragment key={index}>
                                <a
                                  href={echoUrl + permit.NPDESIdentifier}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {permit.NPDESIdentifier}
                                </a>
                                {index === permits.length - 1 ? '' : ', '}
                              </Fragment>
                            ))
                          )}
                        </li>
                      );
                    })}
                </ul>
              </>
            )}
            {!hasTmdlData && parameters.length > 0 && (
              <>
                <strong css={strongBottomMarginStyles}>
                  Parameters Addressed:{' '}
                </strong>
                <ul css={listStyles}>
                  {parameters
                    .sort((a, b) =>
                      a.parameterName.localeCompare(b.parameterName),
                    )
                    .map((parameter) => {
                      return (
                        <li key={parameter.parameterName}>
                          <strong>{parameter.parameterName}</strong>
                        </li>
                      );
                    })}
                </ul>
              </>
            )}

            {assessmentUrl && (
              <div>
                <a
                  href={assessmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i
                    css={iconStyles}
                    className="fas fa-file-alt"
                    aria-hidden="true"
                  />
                  View Waterbody Report
                </a>
                &nbsp;&nbsp;
                <small css={disclaimerStyles}>(opens new browser tab)</small>
              </div>
            )}
          </>
        );
      };

      unitIds[assessmentUnitIdentifier] = content;
    });

    setUnitIds(unitIds);
  }, [waters, actionTypeCode, orgId, organizationName]);

  // calculate height of div holding actions info
  const [infoHeight, setInfoHeight] = useState(0);
  const measuredRef = useCallback((node) => {
    if (!node) return;
    setInfoHeight(node.getBoundingClientRect().height);
  }, []);

  const planType =
    actionTypeCode === 'TMDL' ||
    actionTypeCode === '4B Restoration Approach' ||
    actionTypeCode === 'Alternative Restoration Approach' ? (
      <>
        Restoration Plan:{' '}
        <GlossaryTerm term={actionTypeCode}>{actionTypeCode}</GlossaryTerm>
      </>
    ) : actionTypeCode === 'Protection Approach' ? (
      <GlossaryTerm term={actionTypeCode}>{actionTypeCode}</GlossaryTerm>
    ) : (
      actionTypeCode
    );

  const infoBox = (
    <div css={boxStyles} ref={measuredRef}>
      <h2 css={boxHeadingStyles}>
        Plan Information <br />
        <small>
          <strong>ID:</strong> {actionId}
        </small>
      </h2>

      <div css={boxSectionStyles}>
        <p css={introTextStyles}>
          This page reflects information provided to EPA by the state on plans
          in place to restore water quality. These plans could include a{' '}
          <GlossaryTerm term="TMDL">TMDL</GlossaryTerm> and/or a watershed
          restoration plan.
        </p>
      </div>

      <div css={inlineBoxStyles}>
        <h3>Name:&nbsp;</h3>
        <p>{actionName}</p>
      </div>

      <div css={inlineBoxStyles}>
        <h3>Completed:&nbsp;</h3>
        <p>{completionDate}</p>
      </div>

      <div css={inlineBoxStyles}>
        <h3>Type:&nbsp;</h3>
        <p>{planType}</p>
      </div>

      <div css={inlineBoxStyles}>
        <h3>Status:&nbsp;</h3>
        <p>
          {/* if Action type is not a TMDL, change 'EPA Final Action' to 'Final */}
          {actionTypeCode !== 'TMDL' && actionStatusCode === 'EPA Final Action'
            ? 'Final'
            : actionStatusCode}
        </p>
      </div>

      <div css={inlineBoxStyles}>
        <h3>Organization Name (ID):&nbsp;</h3>
        <p>
          {organizationName} ({orgId})
        </p>
      </div>
    </div>
  );

  const [expandedRows, setExpandedRows] = useState([]);
  if (loading) {
    return (
      <Page>
        <NavBar title="Plan Summary" />
        <LoadingSpinner />
      </Page>
    );
  }

  if (noActions) {
    return (
      <Page>
        <NavBar title="Plan Summary" />

        <div css={splitLayoutContainerStyles}>
          <div css={modifiedErrorBoxStyles}>
            <p>{noActionsAvailableCombo(orgId, actionId)}</p>
          </div>
        </div>
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <NavBar title="Plan Summary" />

        <div css={splitLayoutContainerStyles}>
          <div css={modifiedErrorBoxStyles}>
            <p>{actionsError}</p>
          </div>
        </div>
      </Page>
    );
  }

  if (fullscreen.fullscreenActive) {
    return (
      <WindowSize>
        {({ width, height }) => {
          return (
            <div data-content="actionsmap" style={{ height, width }}>
              <ActionsMap
                layout="fullscreen"
                unitIds={unitIds}
                onLoad={setMapLayer}
              />
            </div>
          );
        }}
      </WindowSize>
    );
  }

  return (
    <Page>
      <NavBar title="Plan Summary" />

      <div css={splitLayoutContainerStyles} data-content="container">
        <WindowSize>
          {({ width, height }) => {
            return (
              <div css={splitLayoutColumnsStyles}>
                <div css={splitLayoutColumnStyles}>
                  {width < 960 ? (
                    <>
                      {infoBox}
                      <MapVisibilityButton>
                        {(mapShown) => (
                          <div
                            style={{
                              display: mapShown ? 'block' : 'none',
                              height: height - 40,
                            }}
                          >
                            <ActionsMap
                              layout="narrow"
                              unitIds={unitIds}
                              onLoad={setMapLayer}
                            />
                          </div>
                        )}
                      </MapVisibilityButton>
                    </>
                  ) : (
                    <StickyBox offsetTop={20} offsetBottom={20}>
                      {infoBox}
                      <div
                        id="plan-summary-map"
                        style={{
                          height: height - infoHeight - 70,
                          minHeight: '400px',
                        }}
                      >
                        <ActionsMap
                          layout="wide"
                          unitIds={unitIds}
                          onLoad={setMapLayer}
                        />
                      </div>
                    </StickyBox>
                  )}
                </div>

                <div css={splitLayoutColumnStyles}>
                  <div css={boxStyles}>
                    <h2 css={boxHeadingStyles}>Associated Documents</h2>
                    {documents.length > 0 && (
                      <div css={[boxSectionStyles, { paddingBottom: 0 }]}>
                        <p css={introTextStyles}>
                          <em>Links below open in a new browser tab.</em>
                        </p>
                      </div>
                    )}
                    <div css={boxSectionStyles}>
                      <ul css={listStyles}>
                        {documents.length === 0 && (
                          <li>No documents are available</li>
                        )}

                        {documents.length > 0 &&
                          documents.map((document) => (
                            <li key={document.documentName}>
                              <a
                                href={document.documentURL}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {document.documentName}
                              </a>
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>

                  {actionTypeCode === 'TMDL' && (
                    <div css={boxStyles}>
                      <h2 css={boxHeadingStyles}>Impairments Addressed</h2>

                      <div css={boxSectionStyles}>
                        <ul css={listStyles}>
                          {pollutants.length === 0 && (
                            <li>No impairments are addressed</li>
                          )}

                          {pollutants.length > 0 &&
                            pollutants.map((pollutant) => (
                              <li key={pollutant}>{pollutant}</li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div css={boxStyles}>
                    <h2 css={boxHeadingStyles}>Waters Covered</h2>

                    <div css={boxSectionStyles}>
                      {waters.length > 0 && (
                        <AccordionList
                          expandDisabled={true} // disabled to avoid large number of web service calls
                        >
                          <VirtualizedList
                            items={waters}
                            expandedRowsSetter={setExpandedRows}
                            renderer={({ index, resizeCell, allExpanded }) => {
                              const water = waters[index];

                              const auId = water.assessmentUnitIdentifier;
                              const name = water.assessmentUnitName;

                              const graphic = getWaterbodyGraphic(
                                mapLayer,
                                orgId,
                                auId,
                              );

                              // get the type of symbol for creating a unique key, since it is currently
                              // possible for the assessmentunitid and objectid to be duplicated across
                              // layers.
                              const symbolType = graphic
                                ? getTypeFromAttributes(graphic)
                                : '';

                              let status = null;
                              // ensure the key exists prior to deciding to highlight
                              if (
                                graphic?.attributes.assessmentunitidentifier
                              ) {
                                const id =
                                  graphic.attributes.assessmentunitidentifier;

                                let isSelected = false;
                                if (selectedGraphic?.attributes) {
                                  isSelected =
                                    selectedGraphic.attributes
                                      .assessmentunitidentifier === id;
                                }

                                let isHighlighted = false;
                                if (highlightedGraphic?.attributes) {
                                  isHighlighted =
                                    highlightedGraphic.attributes
                                      .assessmentunitidentifier === id;
                                }

                                if (isSelected) {
                                  status = 'selected';
                                } else if (isHighlighted && !isSelected) {
                                  status = 'highlighted';
                                }
                              }

                              const waterbodyReportingCycle = graphic
                                ? graphic.attributes.reportingcycle
                                : null;

                              const orgLabel = getOrganizationLabel(
                                graphic?.attributes,
                              );

                              return (
                                <AccordionItem
                                  key={symbolType + orgId + auId}
                                  index={symbolType + orgId + auId}
                                  title={
                                    <strong>
                                      {name || 'Name not provided'}
                                    </strong>
                                  }
                                  subTitle={
                                    <>
                                      {orgLabel} {auId}
                                    </>
                                  }
                                  feature={graphic}
                                  idKey="assessmentunitidentifier"
                                  status={status}
                                  allExpanded={
                                    allExpanded || expandedRows.includes(index)
                                  }
                                  onChange={() => {
                                    // ensure the cell is sized appropriately
                                    resizeCell();

                                    // add the item to the expandedRows array so the accordion item
                                    // will stay expanded when the user scrolls or highlights map items
                                    if (expandedRows.includes(index)) {
                                      setExpandedRows(
                                        expandedRows.filter(
                                          (item) => item !== index,
                                        ),
                                      );
                                    } else
                                      setExpandedRows(
                                        expandedRows.concat(index),
                                      );
                                  }}
                                >
                                  <div css={accordionContentStyles}>
                                    {unitIds[auId] &&
                                      unitIds[auId](
                                        waterbodyReportingCycle,
                                        graphic ? true : false,
                                      )}

                                    <p css={paragraphContentStyles}>
                                      {graphic && (
                                        <ViewOnMapButton
                                          feature={{
                                            attributes: {
                                              assessmentunitidentifier: auId,
                                              organizationid: orgId,
                                              fieldName: 'hmw-extra-content',
                                            },
                                          }}
                                          layers={[mapLayer.layer]}
                                          fieldName="hmw-extra-content"
                                        />
                                      )}
                                    </p>
                                  </div>
                                </AccordionItem>
                              );
                            }}
                          />
                        </AccordionList>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }}
        </WindowSize>
      </div>
    </Page>
  );
}

export default function ActionsContainer() {
  return (
    <MapHighlightProvider>
      <FullscreenProvider>
        <FullscreenContext.Consumer>
          {(fullscreen) => <Actions fullscreen={fullscreen} />}
        </FullscreenContext.Consumer>
      </FullscreenProvider>
    </MapHighlightProvider>
  );
}
