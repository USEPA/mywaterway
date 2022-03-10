// @flow

import React from 'react';
import type { Node } from 'react';
import { navigate } from '@reach/router';
import styled from 'styled-components';
import Select from 'react-select';
// components
import type { RouteProps } from 'routes.js';
import Page from 'components/shared/Page';
import TabLinks from 'components/shared/TabLinks';
import ShowLessMore from 'components/shared/ShowLessMore';
import DisclaimerModal from 'components/shared/DisclaimerModal';
import LoadingSpinner from 'components/shared/LoadingSpinner';
// styled components
import { StyledErrorBox } from 'components/shared/MessageBoxes';
import { StyledIntroBox } from 'components/shared/IntroBox';
import {
  StyledMetrics,
  StyledMetric,
  StyledNumber,
  StyledLabel,
} from 'components/shared/KeyMetrics';
// contexts
import { StateTabsContext, StateTabsProvider } from 'contexts/StateTabs';
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import { fetchCheck } from 'utils/fetchUtils';
// styles
import { colors, fonts, reactSelectStyles } from 'styles/index.js';
// errors
import {
  stateListError,
  stateGeneralError,
  stateNoDataError,
  usesStateSummaryServiceInvalidResponse,
} from 'config/errorMessages';

// --- styled components ---
const Container = styled.div`
  margin-top: 15px;
  margin-bottom: 15px;

  @media (max-width: 400px) {
    padding-left: 0.2em !important;
    padding-right: 0.2em !important;
  }

  .Select__single-value {
    line-height: 1.25;
  }
`;

const Prompt = styled.label`
  margin: 0;
  padding-bottom: 0;
`;

const Form = styled.form`
  display: flex;
  margin-bottom: 1em;
`;

const SelectStyled = styled(Select)`
  flex: 1;
  margin-top: 1em;
  margin-right: 0.5em;
  font-size: 0.9375em;
  z-index: 2;
`;

const Button = styled.button`
  margin-top: 1em;
  margin-bottom: 0;
  font-size: 0.9375em;
  font-weight: bold;
  color: ${colors.white()};
  background-color: ${colors.blue()};

  &:hover,
  &:focus {
    color: ${colors.white()};
    background-color: ${colors.navyBlue()};
  }
`;

const Content = styled.div`
  h2 {
    margin-top: 0.75rem;
    font-size: 1.625em;

    i {
      margin-right: 0.3125em;
      color: #2c72b5;
    }
  }

  h3 {
    font-size: 1.375em;
  }

  h2,
  h3 {
    font-family: ${fonts.primary};
    font-weight: normal;
  }

  h4 {
    margin-bottom: 0.75rem;
    padding-bottom: 0;
    font-size: 1.125em;
    color: #526571;
    font-family: ${fonts.primary};
  }
`;

const ErrorBox = styled(StyledErrorBox)`
  margin-bottom: 1.5em;
`;

const IntroBox = styled(StyledIntroBox)`
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  padding: 1.5rem;
  line-height: 1.375;

  p {
    padding-bottom: 0;
  }
`;

const Disclaimer = styled(DisclaimerModal)`
  margin-bottom: 1rem;
`;

const ByTheNumbersExplanation = styled.p`
  font-style: italic;
  padding: 0.5rem 0 0 0;
`;

// --- components ---
type Props = {
  ...RouteProps,
  children: Node,
};

function State({ children, ...props }: Props) {
  const services = useServicesContext();

  // query attains for the list of states
  const [states, setStates] = React.useState({ status: 'fetching', data: [] });
  const [statesInitialized, setStatesInitialized] = React.useState(false);
  React.useEffect(() => {
    if (statesInitialized) return;

    setStatesInitialized(true);

    fetchCheck(`${services.data.attains.serviceUrl}states`)
      .then((res) => setStates({ status: 'success', data: res.data }))
      .catch((err) => setStates({ status: 'failure', data: [] }));
  }, [services, statesInitialized]);

  const {
    activeState,
    setActiveState,
    introText,
    usesStateSummaryServiceError,
    setUsesStateSummaryServiceError,
  } = React.useContext(StateTabsContext);

  // reset active state if on state intro page
  React.useEffect(() => {
    if (props.location.pathname === '/state') {
      setActiveState({ code: '', name: '' });
    }
  }, [props.location, setActiveState]);

  // selectedState used for the HTML select menu, so we don't immediately
  // update activeState every time the user changes the selected state
  const [selectedState, setSelectedState] = React.useState(activeState);

  // update selectedState whenever activeState changes
  // (e.g. when a user navigates directly to '/state/DC/advanced-search')
  React.useEffect(() => {
    setUsesStateSummaryServiceError(false);
    setSelectedState(activeState);
  }, [activeState, setUsesStateSummaryServiceError]);

  // get the state intro and metrics data
  const stateIntro = introText.status === 'success' ? introText.data : null;

  return (
    <Page>
      <TabLinks />

      <Container className="container" data-content="state">
        {states.status === 'fetching' && <LoadingSpinner />}

        {states.status === 'failure' && (
          <ErrorBox>
            <p>{stateListError}</p>
          </ErrorBox>
        )}

        {states.status === 'success' && (
          <>
            <Prompt htmlFor="hmw-state-select-input">
              <strong>Let’s get started!</strong>&nbsp;&nbsp;
              <em>
                Select your state or territory from the drop down to begin
                exploring water quality.
              </em>
            </Prompt>

            <Form
              onSubmit={(ev) => {
                ev.preventDefault();
                setActiveState(selectedState);
                navigate(`/state/${selectedState.code}/water-quality-overview`);
              }}
            >
              <SelectStyled
                id="hmw-state-select"
                inputId="hmw-state-select-input"
                classNamePrefix="Select"
                placeholder="Select a state..."
                options={states.data.map((state) => {
                  return { value: state.code, label: state.name };
                })}
                value={
                  selectedState.code
                    ? {
                        value: selectedState.code,
                        label: selectedState.name,
                      }
                    : null
                }
                onChange={(ev) =>
                  setSelectedState({
                    code: ev.value,
                    name: ev.label,
                  })
                }
                styles={reactSelectStyles}
              />

              <Button type="submit" className="btn">
                <i className="fas fa-angle-double-right" aria-hidden="true" />{' '}
                Go
              </Button>
            </Form>
          </>
        )}

        {usesStateSummaryServiceError ? (
          <ErrorBox>
            {usesStateSummaryServiceInvalidResponse(activeState.name)}
          </ErrorBox>
        ) : (
          <Content>
            {activeState.code !== '' && (
              <>
                {introText.status === 'fetching' && <LoadingSpinner />}
                {introText.status === 'failure' && (
                  <ErrorBox>
                    <p>{stateGeneralError}</p>
                  </ErrorBox>
                )}
                {introText.status === 'success' && (
                  <>
                    {!stateIntro ? (
                      <ErrorBox>
                        <p>{stateNoDataError(activeState.name)}</p>
                      </ErrorBox>
                    ) : (
                      <>
                        {stateIntro.organizationMetrics.length > 0 && (
                          <>
                            <h2>
                              <i
                                className="fas fa-chart-line"
                                aria-hidden="true"
                              />
                              <strong>{activeState.name}</strong> by the Numbers
                            </h2>

                            <StyledMetrics>
                              {stateIntro.organizationMetrics.map(
                                (metric, index) => {
                                  if (
                                    !metric ||
                                    !metric.value ||
                                    !metric.label
                                  ) {
                                    return null;
                                  }

                                  let value = Number(metric.value);
                                  if (!value) {
                                    // just in case the service has a non-numeric string in the future
                                    value = metric.value;
                                  } else if (value <= 1) {
                                    // numbers <=1 convert to percentages
                                    value =
                                      (value * 100).toLocaleString() + '%';
                                  } else {
                                    value = value.toLocaleString();
                                  }

                                  return (
                                    <StyledMetric key={index}>
                                      <StyledNumber>{value}</StyledNumber>
                                      <StyledLabel>
                                        {metric.label}
                                        <br />
                                        <em>{metric.unit}</em>
                                      </StyledLabel>
                                    </StyledMetric>
                                  );
                                },
                              )}
                            </StyledMetrics>
                            <ByTheNumbersExplanation>
                              Waters not assessed do not show up in summaries
                              below.
                            </ByTheNumbersExplanation>
                          </>
                        )}

                        {stateIntro.description && (
                          <IntroBox>
                            <p>
                              <ShowLessMore
                                text={stateIntro.description}
                                charLimit={450}
                              />
                            </p>
                          </IntroBox>
                        )}

                        <Disclaimer>
                          <p>
                            The condition of a waterbody is dynamic and can
                            change at any time, and the information in How’s My
                            Waterway should only be used for general reference.
                            If available, refer to local or state real-time
                            water quality reports.
                          </p>
                          <p>
                            Furthermore, users of this application should not
                            rely on information relating to environmental laws
                            and regulations posted on this application.
                            Application users are solely responsible for
                            ensuring that they are in compliance with all
                            relevant environmental laws and regulations. In
                            addition, EPA cannot attest to the accuracy of data
                            provided by organizations outside of the federal
                            government.
                          </p>
                        </Disclaimer>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* children is either StateIntro or StateTabs */}
            {children}
          </Content>
        )}
      </Container>
    </Page>
  );
}

export default function StateContainer({ ...props }: Props) {
  return (
    <StateTabsProvider>
      <State {...props} />
    </StateTabsProvider>
  );
}
