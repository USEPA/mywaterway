/** @jsxImportSource @emotion/react */

import { css } from '@emotion/react';
import { useContext, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import Select from 'react-select';
// components
import Page from 'components/shared/Page';
import TabLinks from 'components/shared/TabLinks';
import ShowLessMore from 'components/shared/ShowLessMore';
import { DisclaimerModal } from 'components/shared/Modal';
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
import { useConfigFilesState } from 'contexts/ConfigFiles';
import { useOrganizationsData } from 'contexts/FetchedData';
import { LocationSearchContext } from 'contexts/locationSearch';
import {
  StateTribalTabsContext,
  StateTribalTabsProvider,
} from 'contexts/StateTribalTabs';
// utilities
import { fetchCheck } from 'utils/fetchUtils';
import { useKeyPress } from 'utils/hooks';
import { isClick } from 'utils/utils';
// styles
import { reactSelectStyles } from 'styles/index';
import { h2Styles } from 'styles/stateTribal';
// errors
import {
  stateListError,
  stateGeneralError,
  stateNoDataError,
  usesStateSummaryServiceInvalidResponse,
} from 'config/errorMessages';

const allSources = ['All', 'State', 'Tribe'];

const containerStyles = css`
  margin: auto;
  max-width: 1140px;
  padding: 1em;

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
  padding: 0.375rem 0.75rem;
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles}
  margin-bottom: 1.5em;
`;

const modifiedIntroBoxStyles = css`
  ${introBoxStyles}

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
  margin-bottom: 1rem;
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

  .esri-search__sources-button {
    border-top-left-radius: 4px;
    border-bottom-left-radius: 4px;
    border-right: 1px solid #6e6e6e4d;
    height: 38px;
  }

  .esri-search--sources .esri-search__sources-menu {
    visibility: visible;
    max-height: 300px;
    animation: 0.25s ease-out esri-fade-in;
    overflow: auto;
  }
`;

const searchSourceButtonStyles = css`
  height: 38px;
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
`;

function StateTribal() {
  const configFiles = useConfigFilesState();
  const location = useLocation();
  const navigate = useNavigate();
  const organizations = useOrganizationsData();

  const {
    activeState,
    errorType,
    introText,
    setActiveState,
    setErrorType,
    setIntroText,
    setUsesStateSummaryServiceError,
    usesStateSummaryServiceError,
  } = useContext(StateTribalTabsContext);

  // Set `introText` to empty if the `activeState` is set and there is no `attainsId`.
  useEffect(() => {
    if (activeState.value && !activeState.attainsId) {
      setIntroText({
        status: 'success',
        data: {
          organizationMetrics: [],
          organizationURLs: [],
          description: '',
        },
      });
    }
  }, [activeState, setIntroText]);

  // redirect to '/stateandtribe' if the url is /state or /tribe
  useEffect(() => {
    const pathname = window.location.pathname.toLowerCase();
    if (['/state', '/state/', '/tribe', '/tribe/'].includes(pathname)) {
      setErrorType('');
      navigate('/state-and-tribal', { replace: true });
    }
  }, [navigate, setErrorType]);

  // get tribes from the tribeMapping data
  const [tribes, setTribes] = useState({ status: 'fetching', data: [] });
  useEffect(() => {
    if (organizations.status === 'failure') {
      setTribes({ status: 'failure', data: [] });
      return;
    }
    if (organizations.status !== 'success') {
      return;
    }

    const tribeMapping = Object.values(
      [
        ...configFiles.data.attainsTribeMapping, // Keep the ATTAINS mapping first, it has priority
        ...configFiles.data.wqxTribeMapping,
      ].reduce((acc, cur) => {
        if (!acc.hasOwnProperty(cur.epaId)) {
          acc[cur.epaId] = cur;
        } else {
          acc[cur.epaId] = {
            ...acc[cur.epaId],
            wqxIds: [...acc[cur.epaId].wqxIds, ...cur.wqxIds],
          };
        }
        return acc;
      }, {}),
    )
      .map((tribe) => ({
        ...tribe,
        wqxIds: Array.from(new Set(tribe.wqxIds)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const tempTribes = [];
    tribeMapping.forEach((tribe) => {
      const { attainsId } = tribe;
      const tribeAttains = attainsId
        ? organizations.data.find(
            (item) =>
              item.orgtype === 'Tribe' &&
              item.organizationid.toUpperCase() === attainsId.toUpperCase(),
          )
        : null;

      tempTribes.push({
        ...tribe,
        attainsId: tribeAttains ? attainsId : null,
        value: tribe.attainsId ?? tribe.wqxIds[0],
        label: tribe.name,
        source: 'Tribe',
      });
    });

    setTribes({ status: 'success', data: tempTribes });
  }, [configFiles, organizations]);

  // query attains for the list of states
  const [states, setStates] = useState({ status: 'fetching', data: [] });
  const [statesInitialized, setStatesInitialized] = useState(false);
  useEffect(() => {
    if (statesInitialized) return;

    setStatesInitialized(true);

    fetchCheck(`${configFiles.data.services.attains.serviceUrl}states`)
      .then((res) => {
        setStates({
          status: 'success',
          data: res.data.map((state) => {
            return { value: state.code, label: state.name, source: 'State' };
          }),
        });
      })
      .catch((_err) => setStates({ status: 'failure', data: [] }));
  }, [configFiles, statesInitialized]);

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

  const sourceList = useRef(null);
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

      <div css={containerStyles}>
        {(states.status === 'fetching' || tribes.status === 'fetching') && (
          <LoadingSpinner />
        )}

        {states.status === 'failure' && (
          <div css={modifiedErrorBoxStyles}>
            <p>{stateListError('State')}</p>
          </div>
        )}
        {tribes.status === 'failure' && (
          <div css={modifiedErrorBoxStyles}>
            <p>{stateListError('Tribe')}</p>
          </div>
        )}

        {errorType === 'invalid-org-id' && (
          <div css={modifiedErrorBoxStyles}>
            <p>
              Data is not available for this location. Please select a state,
              territory or tribe from the dropdown below.
            </p>
          </div>
        )}

        {errorType === 'invalid-page' && (
          <div css={modifiedErrorBoxStyles}>
            <p>
              Invalid URL path. Please select a state, territory or tribe from
              the dropdown below.
            </p>
          </div>
        )}

        {(states.status === 'success' || tribes.status === 'success') && (
          <>
            <label css={promptStyles} htmlFor="hmw-state-select-input">
              <strong>Let’s get started!</strong>&nbsp;&nbsp;
              <em>
                Select your state, tribe or territory from the drop down to
                begin exploring water quality.
              </em>
            </label>

            <div css={formStyles}>
              <div css={searchContainerStyles}>
                <div
                  role="presentation"
                  className={
                    `esri-search-multiple-sources esri-search__container ` +
                    `${sourcesVisible ? 'esri-search--sources' : ''} `
                  }
                  onBlur={(ev) => {
                    if (
                      !ev.currentTarget.contains(ev.relatedTarget) ||
                      ev.relatedTarget?.tagName !== 'LI'
                    ) {
                      setSourcesVisible(false);
                      setSourceCursor(-1);
                    }
                  }}
                >
                  <div
                    css={searchSourceButtonStyles}
                    role="button"
                    title="Search in"
                    aria-haspopup="true"
                    aria-controls="search-container-source-menu"
                    className="esri-search__sources-button esri-widget--button "
                    tabIndex={0}
                    data-node-ref="_sourceMenuButtonNode"
                    ref={sourceList}
                    onClick={() => {
                      setSourcesVisible(!sourcesVisible);
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter')
                        setSourcesVisible(!sourcesVisible);
                    }}
                  >
                    <span
                      aria-hidden="true"
                      role="presentation"
                      className="esri-icon-down-arrow esri-search__sources-button--down"
                    ></span>
                  </div>
                  <div
                    id="search-container-source-menu-div"
                    tabIndex={-1}
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

                        function handleClick(
                          ev: React.KeyboardEvent | React.MouseEvent,
                        ) {
                          if (!isClick(ev)) return;

                          setSelectedSource(source);
                          setSourcesVisible(false);

                          const searchInput =
                            document.getElementById('hmw-search-input');
                          if (searchInput) searchInput.focus();
                        }

                        return (
                          <li
                            id={`source-${sourceIndex}`}
                            role="menuitem"
                            className={`esri-search__source esri-menu__list-item ${secondClass}`}
                            tabIndex="-1"
                            key={source}
                            onClick={handleClick}
                            onKeyDown={handleClick}
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
                        ? 'Select a state, tribe or territory...'
                        : selectedSource === 'State'
                          ? 'Select a state or territory...'
                          : 'Select a tribe...'
                    }
                    options={selectOptions}
                    value={selectedStateTribe}
                    onKeyDown={(ev) => {
                      if (ev.key !== 'Enter') return;
                      const selection =
                        statesSelect.current.state.focusedOption;
                      if (!selection) return;
                      handleSubmit(statesSelect.current.state.focusedOption);
                    }}
                    onChange={(ev) => {
                      setSelectedStateTribe(ev);
                    }}
                    styles={reactSelectStyles}
                  />
                </div>
              </div>

              <button
                onClick={() => handleSubmit(selectedStateTribe)}
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
          <div>
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
                            <h2 css={h2Styles}>
                              <i
                                className="fas fa-chart-line"
                                aria-hidden="true"
                              />
                              <strong>{activeState.label}</strong> by the
                              Numbers
                            </h2>

                            <div css={keyMetricsStyles}>
                              {stateIntro.organizationMetrics.map((metric) => {
                                if (!metric?.value || !metric.label) {
                                  return null;
                                }

                                let value = Number(metric.value);
                                if (!value) {
                                  // just in case the service has a non-numeric string in the future
                                  value = metric.value;
                                } else if (value <= 1) {
                                  // numbers <=1 convert to percentages
                                  value = (value * 100).toLocaleString() + '%';
                                } else {
                                  value = value.toLocaleString();
                                }

                                return (
                                  <div
                                    css={keyMetricStyles}
                                    key={`${metric.label}-${metric.value}`}
                                  >
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
                              })}
                            </div>
                            <p css={byTheNumbersExplanationStyles}>
                              Waters not assessed do not show up in summaries
                              below.
                            </p>
                          </>
                        )}

                        {stateIntro.description && (
                          <>
                            <h2 css={h2Styles}>
                              <i aria-hidden="true" className="fas fa-water" />
                              About <strong>{activeState.label}</strong>
                            </h2>
                            <div css={modifiedIntroBoxStyles}>
                              <p>
                                <ShowLessMore
                                  text={stateIntro.description}
                                  charLimit={450}
                                />
                              </p>
                            </div>
                          </>
                        )}

                        <DisclaimerModal css={disclaimerStyles}>
                          <p>
                            The condition of a waterbody is dynamic and can
                            change at any time, and the information in How’s My
                            Waterway should only be used for general reference.
                            If available, refer to local, state, or tribal
                            real-time water quality reports.
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
  const { resetData } = useContext(LocationSearchContext);
  useEffect(() => {
    return function cleanup() {
      resetData(true);
    };
  }, [resetData]);

  return (
    <StateTribalTabsProvider>
      <StateTribal />
    </StateTribalTabsProvider>
  );
}
