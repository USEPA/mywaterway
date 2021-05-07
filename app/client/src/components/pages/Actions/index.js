// @flow

import React from 'react';
import styled from 'styled-components';
import WindowSize from '@reach/window-size';
import StickyBox from 'react-sticky-box';
// components
import type { RouteProps } from 'routes.js';
import Page from 'components/shared/Page';
import NavBar from 'components/shared/NavBar';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { AccordionList, AccordionItem } from 'components/shared/Accordion';
import ShowLessMore from 'components/shared/ShowLessMore';
import ActionsMap from './ActionsMap';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import ViewOnMapButton from 'components/shared/ViewOnMapButton';
import MapVisibilityButton from 'components/shared/MapVisibilityButton';
// styled components
import { StyledErrorBox } from 'components/shared/MessageBoxes';
import {
  StyledContainer,
  StyledColumns,
  StyledColumn,
} from 'components/shared/SplitLayout';
import {
  StyledBox,
  StyledBoxHeading,
  StyledBoxSection,
} from 'components/shared/Box';
// contexts
import { FullscreenContext, FullscreenProvider } from 'contexts/Fullscreen';
import { MapHighlightProvider } from 'contexts/MapHighlight';
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import { fetchCheck } from 'utils/fetchUtils';
import { chunkArray } from 'utils/utils';
// utilities
import { getOrganizationLabel } from 'components/pages/LocationMap/MapFunctions';
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
    pollutants: pollutants.sort((a, b) => a.localeCompare(b)),
    waters: sortedWaters,
  };
}

function getWaterbodyData(
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

// --- styled components ---
const Container = styled(StyledContainer)`
  ul {
    padding-bottom: 0;
  }
`;

const ErrorBox = styled(StyledErrorBox)`
  margin: 1rem;
  text-align: center;
`;

const InlineBoxSection = styled(StyledBoxSection)`
  padding-top: 0;

  * {
    display: inline-block;
  }
`;

const Intro = styled.p`
  margin-top: 0 !important;
  padding-bottom: 0.4375em !important;
`;

const Icon = styled.i`
  margin-right: 5px;
`;

const Accordions = styled(AccordionList)`
  border-bottom: none;
`;

const AccordionContent = styled.div`
  padding: 0.4375em 0.875em 0.875em;

  ul {
    padding-bottom: 0;
  }

  li {
    margin-bottom: 0.875em;
  }

  p {
    margin-top: 0.875em;
  }

  button {
    margin-bottom: 0.25em;

    &:hover,
    &:focus {
      background-color: ${colors.navyBlue()};
    }
  }
`;

const NewTabDisclaimerItalic = styled.em`
  padding: 0.4375rem 0.875rem;
`;

const NewTabDisclaimerDiv = styled.div`
  display: inline-block;
`;

const TextBottomMargin = styled.p`
  margin-bottom: 0.5em !important;
`;

// --- components ---
type Props = {
  ...RouteProps,
  fullscreen: Object, // passed from FullscreenContext.Consumer
  orgId: string, // (organization id)
  actionId: string,
};

function Actions({ fullscreen, orgId, actionId, ...props }: Props) {
  const services = useServicesContext();

  const [loading, setLoading] = React.useState(true);
  const [noActions, setNoActions] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [mapLayer, setMapLayer] = React.useState({
    status: 'fetching',
    layer: null,
  });

  // fetch action data from the attains 'actions' web service
  const [organizationName, setOrganizationName] = React.useState('');
  const [actionName, setActionName] = React.useState('');
  const [completionDate, setCompletionDate] = React.useState('');
  const [actionTypeCode, setActionTypeCode] = React.useState('');
  const [actionStatusCode, setActionStatusCode] = React.useState('');
  const [documents, setDocuments] = React.useState([]);
  const [pollutants, setPollutants] = React.useState([]);
  const [waters, setWaters] = React.useState([]);
  React.useEffect(() => {
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
              const {
                pollutants,
                waters, //
              } = getPollutantsWaters(action, orgId);

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
              setPollutants(pollutants);
              setWaters(waters);
            })
            .catch(onError);
        }
      })
      .catch(onError);
  }, [actionId, orgId, services]);

  // Builds the unitIds dictionary that is used for determining what
  // waters to display on the screen and what the content will be.
  const [unitIds, setUnitIds] = React.useState({});
  React.useEffect(() => {
    if (waters.length === 0) return;

    const unitIds = {};

    waters.forEach((water) => {
      const {
        assessmentUnitIdentifier,
        associatedPollutants,
        parameters,
      } = water;

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
              <TextBottomMargin>
                <strong>Organization Name (ID):&nbsp;</strong>
                {organizationName} ({orgId})
              </TextBottomMargin>
            )}
            {hasTmdlData && (
              <>
                <strong>Associated Impairments: </strong>
                <ul>
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
                            <>No permits found.</>
                          ) : (
                            permits.map((permit, index) => (
                              <React.Fragment key={index}>
                                <a
                                  href={echoUrl + permit.NPDESIdentifier}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {permit.NPDESIdentifier}
                                </a>
                                {index === permits.length - 1 ? '' : ', '}
                              </React.Fragment>
                            ))
                          )}
                        </li>
                      );
                    })}
                </ul>
              </>
            )}
            {!hasTmdlData && (
              <>
                <strong>Parameters Addressed: </strong>
                <ul>
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
                  <Icon className="fas fa-file-alt" aria-hidden="true" />
                  View Waterbody Report
                </a>
                &nbsp;&nbsp;
                <NewTabDisclaimerDiv>
                  (opens new browser tab)
                </NewTabDisclaimerDiv>
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
  const [infoHeight, setInfoHeight] = React.useState(0);
  const measuredRef = React.useCallback((node) => {
    if (!node) return;
    setInfoHeight(node.getBoundingClientRect().height);
  }, []);

  const infoBox = (
    <StyledBox ref={measuredRef}>
      <StyledBoxHeading>
        Plan Information <br />
        <small>
          <strong>ID:</strong> {actionId}
        </small>
      </StyledBoxHeading>

      <StyledBoxSection>
        <Intro>
          This page reflects information provided to EPA by the state on plans
          in place to restore water quality. These plans could include a{' '}
          <GlossaryTerm term="TMDL">TMDL</GlossaryTerm> and/or a watershed
          restoration plan.
        </Intro>
      </StyledBoxSection>

      <InlineBoxSection>
        <h3>Name:&nbsp;</h3>
        <p>{actionName}</p>
      </InlineBoxSection>

      <InlineBoxSection>
        <h3>Completed:&nbsp;</h3>
        <p>{completionDate}</p>
      </InlineBoxSection>

      <InlineBoxSection>
        <h3>Type:&nbsp;</h3>
        <p>{actionTypeCode}</p>
      </InlineBoxSection>

      <InlineBoxSection>
        <h3>Status:&nbsp;</h3>
        <p>
          {/* if Action type is not a TMDL, change 'EPA Final Action' to 'Final */}
          {actionTypeCode !== 'TMDL' && actionStatusCode === 'EPA Final Action'
            ? 'Final'
            : actionStatusCode}
        </p>
      </InlineBoxSection>

      <InlineBoxSection>
        <h3>Organization Name (ID):&nbsp;</h3>
        <p>
          {organizationName} ({orgId})
        </p>
      </InlineBoxSection>
    </StyledBox>
  );

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
        <NavBar title={<>Plan Summary</>} />

        <Container>
          <ErrorBox>
            <p>{noActionsAvailableCombo(orgId, actionId)}</p>
          </ErrorBox>
        </Container>
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <NavBar title={<>Plan Summary</>} />

        <Container>
          <ErrorBox>
            <p>{actionsError}</p>
          </ErrorBox>
        </Container>
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

      <Container data-content="container">
        <WindowSize>
          {({ width, height }) => {
            return (
              <StyledColumns>
                <StyledColumn>
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
                </StyledColumn>

                <StyledColumn>
                  <StyledBox>
                    <StyledBoxHeading>Associated Documents</StyledBoxHeading>
                    {documents.length > 0 && (
                      <NewTabDisclaimerItalic>
                        Links below open in a new browser tab.
                      </NewTabDisclaimerItalic>
                    )}
                    <StyledBoxSection>
                      <ul>
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
                    </StyledBoxSection>
                  </StyledBox>

                  {actionTypeCode === 'TMDL' && (
                    <StyledBox>
                      <StyledBoxHeading>Impairments Addressed</StyledBoxHeading>

                      <StyledBoxSection>
                        <ul>
                          {pollutants.length === 0 && (
                            <li>No impairments are addressed</li>
                          )}

                          {pollutants.length > 0 &&
                            pollutants.map((pollutant) => (
                              <li key={pollutant}>{pollutant}</li>
                            ))}
                        </ul>
                      </StyledBoxSection>
                    </StyledBox>
                  )}

                  <StyledBox>
                    <StyledBoxHeading>Waters Covered</StyledBoxHeading>

                    <StyledBoxSection>
                      {waters.length > 0 && (
                        <Accordions>
                          {waters.map((water) => {
                            const {
                              assessmentUnitIdentifier,
                              assessmentUnitName,
                            } = water;

                            const waterbodyData = getWaterbodyData(
                              mapLayer,
                              orgId,
                              assessmentUnitIdentifier,
                            );
                            const waterbodyReportingCycle = waterbodyData
                              ? waterbodyData.attributes.reportingcycle
                              : null;

                            return (
                              <AccordionItem
                                key={assessmentUnitIdentifier}
                                title={
                                  <strong>
                                    {assessmentUnitName || 'Name not provided'}
                                  </strong>
                                }
                                subTitle={`${getOrganizationLabel(
                                  waterbodyData?.attributes,
                                )} ${assessmentUnitIdentifier}`}
                              >
                                <AccordionContent>
                                  {unitIds[assessmentUnitIdentifier] &&
                                    unitIds[assessmentUnitIdentifier](
                                      waterbodyReportingCycle,
                                      waterbodyData ? true : false,
                                    )}

                                  <p>
                                    {waterbodyData && (
                                      <ViewOnMapButton
                                        feature={{
                                          attributes: {
                                            assessmentunitidentifier: assessmentUnitIdentifier,
                                            organizationid: orgId,
                                            fieldName: 'hmw-extra-content',
                                          },
                                        }}
                                        layers={[mapLayer.layer]}
                                        fieldName="hmw-extra-content"
                                      />
                                    )}
                                  </p>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordions>
                      )}
                    </StyledBoxSection>
                  </StyledBox>
                </StyledColumn>
              </StyledColumns>
            );
          }}
        </WindowSize>
      </Container>
    </Page>
  );
}

export default function ActionsContainer({ ...props }: Props) {
  return (
    <MapHighlightProvider>
      <FullscreenProvider>
        <FullscreenContext.Consumer>
          {(fullscreen) => <Actions fullscreen={fullscreen} {...props} />}
        </FullscreenContext.Consumer>
      </FullscreenProvider>
    </MapHighlightProvider>
  );
}
