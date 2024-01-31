// @flow
/** @jsxImportSource @emotion/react */

import { css } from '@emotion/react';
import { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
// components
import Switch from 'components/shared/Switch';
import { PinIcon } from 'components/shared/Icons';
// contexts
import { CommunityTabsContext } from 'contexts/CommunityTabs';
import {
  initialMonitoringGroups,
  LocationSearchContext,
} from 'contexts/locationSearch';
// config
import { tabs } from 'config/communityConfig.js';
// styles
import { colors } from 'styles/index';
import '@reach/tabs/styles.css';
// utils
import { formatNumber } from 'utils/utils';

const lightBlue = '#f0f6f9';

const locationStyles = css`
  display: flex;
  align-items: center;
  padding: 0.75em 1em;

  @media (min-width: 320px) {
    padding: 0.75em 0.5em;
  }

  @media (min-width: 480px) {
    padding: 0.5em;
  }
`;

const iconStyles = css`
  display: none;

  @media (min-width: 320px) {
    display: block;
    margin-right: 0.25em;
    width: 2.25em;
    height: 2.25em;
  }

  @media (min-width: 480px) {
    width: 3.25em;
    height: 3.25em;
  }
`;

const locationTextStyles = css`
  display: flex;
  flex-flow: row wrap;

  @media (min-width: 320px) {
    width: calc(100% - 2.25em);
  }

  @media (min-width: 480px) {
    width: calc(100% - 3.25em);
  }

  p {
    margin: 0;
    padding: 0;
    width: 100%;
  }
`;

const addressStyles = css`
  font-size: 1em;
  font-weight: bold;

  @media (min-width: 480px) {
    font-size: 1.0625em;
  }
`;

const watershedStyles = css`
  font-size: 0.9375em;

  span {
    font-size: 0.875em;
    font-weight: bold;
  }
`;

/*
  - tabsOverlayStyles's height is set to match each tab's initial min-height
    value (see StyledTabs [data-react-tab] styles below).
  - tabsOverlayStyles' margin-bottom matches its height, so the overlay visually
    appears on top of the tabs, which are below the overlay in the DOM.
  - Though initially set to 45px, these two values (height and margin-bottom)
    are re-assigned with the actual rendered height of the tabs in case the
    tab's text contents makes its height greater than 45px
    (see measuredTabRef and tabsOverlayRef below).
*/
const tabsOverlayStyles = css`
  position: relative;
  width: 100%;
  height: 45px;
  margin-bottom: -45px;
  pointer-events: none;

  ::before,
  ::after {
    content: '';
    display: block;
    position: absolute;
    top: 0;
    width: calc(100% / 9); /* half tab width */
    height: inherit;

    @media (min-width: 800px) {
      width: calc(100% / 11); /* half tab width */
    }

    @media (min-width: 960px) {
      width: calc(100% / 9); /* half tab width */
    }

    @media (min-width: 1280px) {
      width: calc(100% / 11); /* half tab width */
    }

    @media (min-width: 1600px) {
      width: calc(100% / 9); /* half tab width */
    }

    @media (min-width: 1920px) {
      width: calc(100% / 11); /* half tab width */
    }
  }

  ::before {
    left: 0;
    background-image: linear-gradient(
      to right,
      ${colors.black(0.5)},
      ${colors.black(0)}
    );
  }

  ::after {
    right: 0;
    background-image: linear-gradient(
      to left,
      ${colors.black(0.5)},
      ${colors.black(0)}
    );
  }
`;

const tabsStyles = (infoToggleChecked) => css`
  & ::-webkit-scrollbar {
    height: 12px;
  }

  & ::-webkit-scrollbar-track {
    background-color: ${lightBlue};
  }

  & ::-webkit-scrollbar-thumb {
    border: 1px solid ${colors.black(0.25)};
    border-radius: 12px;
    background-color: ${colors.white()};
  }

  > [data-reach-tab-list] {
    overflow-x: scroll;
    padding-bottom: 0.5em;
    background-color: ${lightBlue};

    [data-reach-tab] {
      flex: 0 0 calc(2 / 9 * 100%); /* 4.5 tabs before overflow */
      padding: 0.5em;
      border: none;
      border-right: 1px solid ${colors.white()};
      border-radius: 0;
      min-height: 45px;
      font-size: 0.6875em;
      color: white;
      background-color: ${colors.blue()};
      /* fake border bottom so it doesn't interfere with right border */
      box-shadow: inset 0 -5px 0 ${colors.blue()};

      &[data-selected],
      &:hover,
      &:focus {
        z-index: 1;
        background-color: ${colors.navyBlue()};
        box-shadow: inset 0 -5px 0 ${colors.teal()};
      }

      &:last-of-type {
        border-right: none;
      }

      @media (min-width: 640px) {
        font-size: 0.75em;
      }

      @media (min-width: 800px) {
        flex-basis: calc(2 / 11 * 100%); /* 5.5 tabs before overflow */
      }

      @media (min-width: 960px) {
        flex-basis: calc(2 / 9 * 100%); /* 4.5 tabs before overflow */
      }

      @media (min-width: 1280px) {
        flex-basis: calc(2 / 11 * 100%); /* 5.5 tabs before overflow */
      }

      @media (min-width: 1600px) {
        flex-basis: calc(2 / 9 * 100%); /* 4.5 tabs before overflow */
      }

      @media (min-width: 1920px) {
        flex-basis: calc(2 / 11 * 100%); /* 5.5 tabs before overflow */
      }
    }
  }

  > [data-reach-tab-panels] {
    [data-reach-tab-panel] {
      padding: ${infoToggleChecked ? '1em' : '0'};
    }
  }
`;

const tabDotsStyles = css`
  padding: 0.25em 0 0;
  height: 22px;
  text-align: center;
  list-style: none;
  background-color: ${lightBlue};

  li {
    display: inline-block;
    height: 22px;
  }
`;

const tabDotStyles = css`
  margin: 4px;
  padding: 0;
  border: 1px solid ${colors.black(0.25)};
  border-radius: 50%;
  width: 14px;
  height: 14px;
  background-color: ${colors.white()};

  &[data-selected='true'],
  &:hover,
  &:focus {
    border-color: ${colors.blue(0.75)};
    box-shadow: 0 0 0 1px ${colors.blue(0.75)};
  }
`;

const tabHeaderStyles = css`
  padding: 0.75em 1em;
  background-color: ${lightBlue};

  @media (min-width: 240px) {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  @media (min-width: 320px) {
    padding: 0.5em;
  }

  div {
    display: flex;
    align-items: center;
  }

  img {
    display: none;

    @media (min-width: 320px) {
      display: block;
      margin-right: 0.25em;
      height: 2.25em;
    }
  }

  label {
    display: flex;
    align-items: center;
    margin-top: 0.375em;
    margin-bottom: 0;
    font-weight: bold;
  }

  span {
    margin-right: 0.5em;
    margin-bottom: 0.125em;
    font-size: 0.875em;

    @media (min-width: 320px) {
      font-size: 1em;
    }
  }
`;

const tabTitleStyles = css`
  margin: 0;
  padding-bottom: 0;
  font-family: inherit;
  font-weight: bold;
  font-size: 1.25em;
  line-height: 1.125;

  @media (min-width: 480px) {
    font-size: 1.5em;
  }
`;

function CommunityTabs() {
  const { urlSearch, tabName } = useParams();
  const navigate = useNavigate();

  const {
    activeTabIndex,
    setActiveTabIndex,
    infoToggleChecked,
    setInfoToggleChecked,
  } = useContext(CommunityTabsContext);

  const {
    searchText,
    setSearchText,
    address,
    watershed,
    huc12,
    setDischargerPermitComponents,
    setMonitoringGroups,
    setShowAllPolluted,
    setParameterToggleObject,
    setPollutionParameters,
    setDrinkingWaterTabIndex,
  } = useContext(LocationSearchContext);

  // redirect to overview tab if tabName param wasn't provided in the url
  // (e.g. '/community/20001' redirects to '/community/20001/overview')
  useEffect(() => {
    if (urlSearch && !tabName) {
      navigate(`/community/${urlSearch}/overview`);
    }
  }, [navigate, urlSearch, tabName]);

  // redirect to '/community' if the url doesn't match a route in the tabs array
  // and conditionally set active tab index
  useEffect(() => {
    const tabIndex = tabs
      .map((tab) => encodeURI(tab.route.replace('{urlSearch}', urlSearch)))
      .indexOf(window.location.pathname);

    if (tabIndex === -1) {
      navigate('/community');
    }

    if (activeTabIndex !== tabIndex) {
      setActiveTabIndex(tabIndex === -1 ? 0 : tabIndex);
    }

    // set the tab index back to -1 if going to community home page
    // this is to make sure that when the user does another search
    // the waterbodies will be shown on the screen
    return function cleanup() {
      if (window.location.pathname === '/community') setActiveTabIndex(-1);
    };
  }, [navigate, urlSearch, activeTabIndex, setActiveTabIndex]);

  // conditionally set searchText from urlSearch
  // (e.g. when a user visits '/community/20001' directly)
  useEffect(() => {
    if (urlSearch !== searchText) {
      setSearchText(urlSearch);
    }
  }, [urlSearch, searchText, setSearchText]);

  const tabListRef = useRef();

  // focus and scroll (horizontally) to the active tab
  useEffect(() => {
    if (tabListRef.current) {
      const tabList = tabListRef.current;
      const activeTab = tabList.children[activeTabIndex];
      setTimeout(() => activeTab.focus(), 0);

      const column = document.querySelector('[data-column="right"]');
      if (!column) return;

      const columnCenter = column.offsetLeft + column.offsetWidth / 2;
      const tabCenter = activeTab.offsetLeft + activeTab.offsetWidth / 2;
      const distance = tabCenter - columnCenter - tabList.scrollLeft;

      tabList.scrollBy({ top: 0, left: distance, behavior: 'smooth' });
    }
  }, [tabListRef, activeTabIndex]);

  // keep the tab overlay height in sync with the height of a tab in the tablist
  const [tabHeight, setTabHeight] = useState(45);

  const measuredTabRef = useCallback((node) => {
    if (!node) return;
    setTabHeight(node.getBoundingClientRect().height);
  }, []);

  const tabsOverlayRef = useRef();

  useEffect(() => {
    if (tabsOverlayRef.current) {
      tabsOverlayRef.current.style.height = `${tabHeight}px`;
      tabsOverlayRef.current.style.marginBottom = `-${tabHeight}px`;
    }
  }, [tabsOverlayRef, tabHeight]);

  const resetTabSpecificData = () => {
    // overview panel
    setDischargerPermitComponents(null);

    // monitoring panel
    setMonitoringGroups(initialMonitoringGroups());

    // identified issues panel
    setShowAllPolluted(true);
    setParameterToggleObject({});
    setPollutionParameters(null);

    // drinking water panel
    setDrinkingWaterTabIndex(0);
  };

  if (activeTabIndex === -1) return null;

  return (
    <>
      <div css={locationStyles}>
        <PinIcon css={iconStyles} />

        <div css={locationTextStyles}>
          <p css={addressStyles}>{address}</p>

          {watershed.name && (
            <p css={watershedStyles}>
              <span>WATERSHED:</span> {watershed.name} ({huc12})
            </p>
          )}
          {watershed.areasqkm && watershed.areaacres && (
            <p css={watershedStyles}>
              <span>SIZE:</span> {formatNumber(watershed.areaacres)} acres /{' '}
              {formatNumber(watershed.areasqkm, 2)} km<sup>2</sup>
            </p>
          )}
        </div>
      </div>

      <div css={tabsOverlayStyles} ref={tabsOverlayRef} />

      <Tabs
        css={tabsStyles(infoToggleChecked)}
        index={activeTabIndex}
        onChange={(index) => {
          // used for reseting tab specific toggles. This is needed so the
          // toggles will go back to the default settings when the user
          // changes panels, but the toggles will be remembered when the user
          // switches to and from full screen mode.
          resetTabSpecificData();

          // set active tab index in CommunityTabs context,
          // so 'lower' tab panels stay in sync with these 'upper' tabs
          setActiveTabIndex(index);
          // navigate to the tab’s route so Google Analytics captures a pageview
          navigate(tabs[index].route.replace('{urlSearch}', urlSearch));
        }}
      >
        <TabList ref={tabListRef}>
          {tabs.map((tab) => (
            <Tab key={tab.title} ref={measuredTabRef}>
              {tab.title}
            </Tab>
          ))}
        </TabList>

        <ul css={tabDotsStyles} aria-hidden="true">
          {tabs.map((tab, index) => {
            return (
              <li key={tab.title}>
                <button
                  css={tabDotStyles}
                  tabIndex="-1"
                  title={tab.title}
                  data-selected={index === activeTabIndex}
                  onClick={(ev) => {
                    const tabList = tabListRef.current;
                    if (tabList) tabList.children[index].click();
                  }}
                />
              </li>
            );
          })}
        </ul>

        <header css={tabHeaderStyles}>
          <div>
            <img aria-hidden="true" src={tabs[activeTabIndex].icon} alt="" />
            <h1 css={tabTitleStyles}>{tabs[activeTabIndex].title}</h1>
          </div>

          <div>
            <label>
              <span>Show Text</span>
              <Switch
                checked={infoToggleChecked}
                onChange={(checked) => setInfoToggleChecked(checked)}
                ariaLabel="Show Text"
              />
            </label>
          </div>
        </header>

        <TabPanels>
          {tabs.map((tab) => (
            <TabPanel key={tab.title}>
              {/* only display upper tab content if info toggle is checked */}
              {infoToggleChecked && tab.upper}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </>
  );
}

export default CommunityTabs;
