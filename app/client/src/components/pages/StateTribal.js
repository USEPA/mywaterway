// @flow

import React, { useContext, useEffect, useRef, useState } from 'react';
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
import {
  StateTribalTabsContext,
  StateTribalTabsProvider,
} from 'contexts/StateTribalTabs';
import {
  useServicesContext,
  useTribeMappingContext,
} from 'contexts/LookupFiles';
// utilities
import { fetchCheck } from 'utils/fetchUtils';
import { useKeyPress } from 'utils/hooks';
// styles
import { colors, fonts, reactSelectStyles } from 'styles/index.js';
// errors
import {
  stateListError,
  stateGeneralError,
  stateNoDataError,
  usesStateSummaryServiceInvalidResponse,
} from 'config/errorMessages';

const allSources = ['All', 'State', 'Tribe'];

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

  .Select__control {
    border: none;
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

const searchContainerStyles = css`
  margin-top: 1em;
  margin-right: 0.5em;
  border-radius: 4px;
  border: 1px solid #ccc;
  flex: 1 0 calc(100% - 61.53px - 0.5em);

  .esri-menu {
    z-index: 800;
  }

  .esri-menu__list-item-active {
    background-color: #e2f1fb;
  }
`;

const searchSourceButtonStyles = css`
  height: 38px;
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
`;

function StateTribal() {
  const location = useLocation();
  const navigate = useNavigate();
  const services = useServicesContext();
  const tribeMapping = useTribeMappingContext();

  // redirect to '/stateandtribe' if the url is /state or /tribe
  useEffect(() => {
    const pathname = window.location.pathname.toLowerCase();
    if (['/state', '/state/', '/tribe', '/tribe/'].includes(pathname)) {
      navigate('/state-and-tribal', { replace: true });
    }
  }, [navigate]);

  // get tribes from the tribeMapping data
  const [tribes, setTribes] = useState({ status: 'fetching', data: [] });
  useEffect(() => {
    if (tribeMapping.status !== 'success') return;

    const tempTribes = [];
    tribeMapping.data.forEach((tribe) => {
      tempTribes.push({
        ...tribe,
        value: tribe.attainsId,
        label: tribe.name,
        source: 'Tribe',
      });
    });

    setTribes({ status: 'success', data: tempTribes });
  }, [tribeMapping]);

  // query attains for the list of states
  const [states, setStates] = useState({ status: 'fetching', data: [] });
  const [statesInitialized, setStatesInitialized] = useState(false);
  useEffect(() => {
    if (statesInitialized) return;

    setStatesInitialized(true);

    fetchCheck(`${services.data.attains.serviceUrl}states`)
      .then((res) => {
        setStates({
          status: 'success',
          data: res.data.map((state) => {
            return { value: state.code, label: state.name, source: 'State' };
          }),
        });
      })
      .catch((_err) => setStates({ status: 'failure', data: [] }));
  }, [services, statesInitialized]);

  const {
    activeState,
    setActiveState,
    introText,
    usesStateSummaryServiceError,
    setUsesStateSummaryServiceError,
  } = useContext(StateTribalTabsContext);

  // reset active state if on state intro page
  useEffect(() => {
    if (location.pathname === '/state-and-tribal') {
      setSelectedStateTribe(null);
      setActiveState({
        label: '',
        value: '',
        source: 'All',
      });
    }
  }, [location, setActiveState]);

  // selectedState used for the HTML select menu, so we don't immediately
  // update activeState every time the user changes the selected state
  const [selectedSource, setSelectedSource] = useState('All');
  const [selectOptions, setSelectOptions] = useState([]);
  const [selectedStateTribe, setSelectedStateTribe] = useState(
    activeState.value ? activeState : null,
  );

  // updates the selectOptions based on the selectedSource
  useEffect(() => {
    const options = [];
    if (selectedSource === 'All') {
      options.push({
        label: 'State',
        options: states.data,
      });
      options.push({
        label: 'Tribe',
        options: tribes.data,
      });
    }
    if (selectedSource === 'State') options.push(...states.data);
    if (selectedSource === 'Tribe') options.push(...tribes.data);

    setSelectOptions(options);
  }, [selectedSource, states, tribes]);

  // update selectedState whenever activeState changes
  // (e.g. when a user navigates directly to '/state/DC/advanced-search')
  useEffect(() => {
    setUsesStateSummaryServiceError(false);

    if (activeState.value) setSelectedStateTribe(activeState);
  }, [activeState, setUsesStateSummaryServiceError]);

  // get the state intro and metrics data
  const stateIntro = introText.status === 'success' ? introText.data : null;

  const sourceList = useRef();
  const sourceDownPress = useKeyPress('ArrowDown', sourceList);
  const sourceUpPress = useKeyPress('ArrowUp', sourceList);
  const sourceEnterPress = useKeyPress('Enter', sourceList);
  const [sourcesVisible, setSourcesVisible] = useState(false);
  const [sourceCursor, setSourceCursor] = useState(-1);

  const statesSelect = useRef();

  // Handle arrow down key press (sources list)
  useEffect(() => {
    if (allSources.length > 0 && sourceDownPress) {
      setSourceCursor((prevState) => {
        const newIndex = prevState < allSources.length - 1 ? prevState + 1 : 0;

        // scroll to the suggestion
        const elm = document.getElementById(`source-${newIndex}`);
        const panel = document.getElementById('search-container-source-menu');
        if (elm && panel) panel.scrollTop = elm.offsetTop;

        return newIndex;
      });
    }
  }, [sourceDownPress]);

  // Handle arrow up key press (sources list)
  useEffect(() => {
    if (allSources.length > 0 && sourceUpPress) {
      setSourceCursor((prevState) => {
        const newIndex = prevState > 0 ? prevState - 1 : allSources.length - 1;

        // scroll to the suggestion
        const elm = document.getElementById(`source-${newIndex}`);
        const panel = document.getElementById('search-container-source-menu');
        if (elm && panel) panel.scrollTop = elm.offsetTop;

        return newIndex;
      });
    }
  }, [sourceUpPress]);

  // Handle enter key press (sources list)
  useEffect(() => {
    if (!sourceEnterPress) return;

    // determine if the sources menu is visible
    const sourcesShown =
      document
        .getElementById('search-container-source-menu-div')
        .getBoundingClientRect().height !== 0;

    // determine whether or not the enter button is being used to open/close
    // the sources menu or select a source
    if (!sourcesShown) {
      setSourcesVisible(true);
      return;
    }
    if (sourcesShown && sourceCursor === -1) {
      setSourcesVisible(false);
      return;
    }

    // handle selecting a source
    if (sourceCursor < 0 || sourceCursor > allSources.length) return;
    if (allSources[sourceCursor]) {
      setSelectedSource(allSources[sourceCursor]);
      setSourceCursor(-1);

      setTimeout(() => {
        const searchInput = document.getElementById('hmw-search-input');
        if (searchInput) searchInput.focus();
      }, 250);
    }
  }, [sourceCursor, sourceEnterPress]);

  const handleSubmit = (selection) => {
    if (!selection) return;
    setActiveState(selection);

    if (selection.source === 'State') {
      navigate(`/state/${selection.value}/water-quality-overview`);
    }
    if (selection.source === 'Tribe') {
      navigate(`/tribe/${selection.value}`);
    }
  };

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

            <div css={formStyles}>
              <div
                css={searchContainerStyles}
                role="presentation"
                className={
                  `esri-search-multiple-sources esri-search__container ` +
                  `${sourcesVisible ? 'esri-search--sources' : ''} `
                }
              >
                <div
                  css={searchSourceButtonStyles}
                  role="button"
                  title="Search in"
                  aria-haspopup="true"
                  aria-controls="search-container-source-menu"
                  className="esri-search__sources-button esri-widget--button "
                  tabIndex="0"
                  data-node-ref="_sourceMenuButtonNode"
                  ref={sourceList}
                  onClick={() => {
                    setSourcesVisible(!sourcesVisible);
                  }}
                >
                  <span
                    aria-hidden="true"
                    role="presentation"
                    className="esri-icon-down-arrow esri-search__sources-button--down"
                  ></span>
                  <span
                    aria-hidden="true"
                    role="presentation"
                    className="esri-icon-up-arrow esri-search__sources-button--up"
                  ></span>
                  <span
                    aria-hidden="true"
                    role="presentation"
                    className="esri-search__source-name"
                  >
                    {selectedSource}
                  </span>
                </div>
                <div
                  id="search-container-source-menu-div"
                  tabIndex="-1"
                  className="esri-menu esri-search__sources-menu"
                >
                  <ul
                    id="search-container-source-menu"
                    role="menu"
                    data-node-ref="_sourceListNode"
                    className="esri-menu__list"
                  >
                    {allSources.map((source, sourceIndex) => {
                      let secondClass = '';
                      if (selectedSource === source) {
                        secondClass = 'esri-menu__list-item--active';
                      } else if (sourceIndex === sourceCursor) {
                        secondClass = 'esri-menu__list-item-active';
                      }

                      return (
                        <li
                          id={`source-${sourceIndex}`}
                          role="menuitem"
                          className={`esri-search__source esri-menu__list-item ${secondClass}`}
                          tabIndex="-1"
                          key={`source-key-${sourceIndex}`}
                          onClick={() => {
                            setSelectedSource(source);
                            setSourcesVisible(false);

                            const searchInput =
                              document.getElementById('hmw-search-input');
                            if (searchInput) searchInput.focus();
                          }}
                        >
                          {source}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <Select
                  id="hmw-state-select"
                  inputId="hmw-state-select-input"
                  ref={statesSelect}
                  css={selectStyles}
                  classNamePrefix="Select"
                  placeholder={
                    selectedSource === 'All'
                      ? 'Select a state or tribe...'
                      : selectedSource === 'State'
                      ? 'Select a state...'
                      : 'Select a tribe...'
                  }
                  options={selectOptions}
                  value={selectedStateTribe}
                  onKeyDown={(ev) => {
                    if (ev.key !== 'Enter') return;
                    const selection = statesSelect.current.state.focusedOption;
                    if (!selection) return;
                    handleSubmit(statesSelect.current.state.focusedOption);
                  }}
                  onChange={(ev) => {
                    setSelectedStateTribe(ev);
                  }}
                  styles={reactSelectStyles}
                />
              </div>

              <button
                onClick={() => handleSubmit(selectedStateTribe)}
                className="btn"
                css={buttonStyles}
              >
                <i className="fas fa-angle-double-right" aria-hidden="true" />{' '}
                Go
              </button>
            </div>
          </>
        )}

        {usesStateSummaryServiceError ? (
          <div css={modifiedErrorBoxStyles}>
            {usesStateSummaryServiceInvalidResponse(
              activeState.source,
              activeState.label,
            )}
          </div>
        ) : (
          <div css={contentStyles}>
            {activeState.value !== '' && (
              <>
                {introText.status === 'fetching' && <LoadingSpinner />}
                {introText.status === 'failure' && (
                  <div css={modifiedErrorBoxStyles}>
                    <p>{stateGeneralError(activeState.source)}</p>
                  </div>
                )}
                {introText.status === 'success' && (
                  <>
                    {!stateIntro ? (
                      <div css={modifiedErrorBoxStyles}>
                        <p>{stateNoDataError(activeState.label)}</p>
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
                              <strong>{activeState.label}</strong> by the
                              Numbers
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
            <Outlet context={{ tribes, states }} />
          </div>
        )}
      </div>
    </Page>
  );
}

export default function StateTribalContainer() {
  return (
    <StateTribalTabsProvider>
      <StateTribal />
    </StateTribalTabsProvider>
  );
}
