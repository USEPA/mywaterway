// @flow

import React, { useContext, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { css } from 'styled-components/macro';
import Select from 'react-select';
// components
import Page from 'components/shared/Page';
import TabLinks from 'components/shared/TabLinks';
import ShowLessMore from 'components/shared/ShowLessMore';
import DisclaimerModal from 'components/shared/DisclaimerModal';
import LoadingSpinner from 'components/shared/LoadingSpinner';
// styled components
import { errorBoxStyles } from 'components/shared/MessageBoxes';
import { introBoxStyles } from 'components/shared/IntroBox';
import {
  keyMetricsStyles,
  keyMetricStyles,
  keyMetricNumberStyles,
  keyMetricLabelStyles,
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

const containerStyles = css`
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

const promptStyles = css`
  margin: 0;
  padding-bottom: 0;
`;

const formStyles = css`
  display: flex;
  margin-bottom: 1em;
`;

const selectStyles = css`
  flex: 1;
  margin-top: 1em;
  margin-right: 0.5em;
  font-size: 0.9375em;
  z-index: 2;
`;

const buttonStyles = css`
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

const contentStyles = css`
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

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles}
  margin-bottom: 1.5em;
`;

const modifiedIntroBoxStyles = css`
  ${introBoxStyles}

  margin-top: 1.5rem;
  margin-bottom: 1rem;
  line-height: 1.375;

  p {
    padding-bottom: 0;
  }
`;

const disclaimerStyles = css`
  margin-bottom: 1rem;
`;

const byTheNumbersExplanationStyles = css`
  font-style: italic;
  padding: 0.5rem 0 0 0;
`;

function State() {
  const location = useLocation();
  const navigate = useNavigate();

  const services = useServicesContext();

  // query attains for the list of states
  const [states, setStates] = useState({ status: 'fetching', data: [] });
  const [statesInitialized, setStatesInitialized] = useState(false);
  useEffect(() => {
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
  } = useContext(StateTabsContext);

  // reset active state if on state intro page
  useEffect(() => {
    if (location.pathname === '/state') {
      setActiveState({ code: '', name: '' });
    }
  }, [location, setActiveState]);

  // selectedState used for the HTML select menu, so we don't immediately
  // update activeState every time the user changes the selected state
  const [selectedState, setSelectedState] = useState(activeState);

  // update selectedState whenever activeState changes
  // (e.g. when a user navigates directly to '/state/DC/advanced-search')
  useEffect(() => {
    setUsesStateSummaryServiceError(false);
    setSelectedState(activeState);
  }, [activeState, setUsesStateSummaryServiceError]);

  // get the state intro and metrics data
  const stateIntro = introText.status === 'success' ? introText.data : null;

  return (
    <Page>
      <TabLinks />

      <div css={containerStyles} className="container" data-content="state">
        {states.status === 'fetching' && <LoadingSpinner />}

        {states.status === 'failure' && (
          <div css={modifiedErrorBoxStyles}>
            <p>{stateListError}</p>
          </div>
        )}

        {states.status === 'success' && (
          <>
            <label css={promptStyles} htmlFor="hmw-state-select-input">
              <strong>Let’s get started!</strong>&nbsp;&nbsp;
              <em>
                Select your state or territory from the drop down to begin
                exploring water quality.
              </em>
            </label>

            <form
              css={formStyles}
              onSubmit={(ev) => {
                ev.preventDefault();
                setActiveState(selectedState);
                navigate(`/state/${selectedState.code}/water-quality-overview`);
              }}
            >
              <Select
                css={selectStyles}
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

              <button type="submit" className="btn" css={buttonStyles}>
                <i className="fas fa-angle-double-right" aria-hidden="true" />{' '}
                Go
              </button>
            </form>
          </>
        )}

        {usesStateSummaryServiceError ? (
          <div css={modifiedErrorBoxStyles}>
            {usesStateSummaryServiceInvalidResponse(activeState.name)}
          </div>
        ) : (
          <div css={contentStyles}>
            {activeState.code !== '' && (
              <>
                {introText.status === 'fetching' && <LoadingSpinner />}
                {introText.status === 'failure' && (
                  <div css={modifiedErrorBoxStyles}>
                    <p>{stateGeneralError}</p>
                  </div>
                )}
                {introText.status === 'success' && (
                  <>
                    {!stateIntro ? (
                      <div css={modifiedErrorBoxStyles}>
                        <p>{stateNoDataError(activeState.name)}</p>
                      </div>
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

                            <div css={keyMetricsStyles}>
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
                                    <div css={keyMetricStyles} key={index}>
                                      <span css={keyMetricNumberStyles}>
                                        {value}
                                      </span>
                                      <p css={keyMetricLabelStyles}>
                                        {metric.label}
                                        <br />
                                        <em>{metric.unit}</em>
                                      </p>
                                    </div>
                                  );
                                },
                              )}
                            </div>
                            <p css={byTheNumbersExplanationStyles}>
                              Waters not assessed do not show up in summaries
                              below.
                            </p>
                          </>
                        )}

                        {stateIntro.description && (
                          <div css={modifiedIntroBoxStyles}>
                            <p>
                              <ShowLessMore
                                text={stateIntro.description}
                                charLimit={450}
                              />
                            </p>
                          </div>
                        )}

                        <DisclaimerModal css={disclaimerStyles}>
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
                        </DisclaimerModal>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* Outlet is either StateIntro or StateTabs */}
            <Outlet />
          </div>
        )}
      </div>
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
