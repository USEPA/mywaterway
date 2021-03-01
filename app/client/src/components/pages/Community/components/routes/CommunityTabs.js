// @flow

import React from 'react';
import styled from 'styled-components';
import { navigate } from '@reach/router';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
// components
import type { RouteProps } from 'routes.js';
import Switch from 'components/shared/Switch';
import PinIcon from 'components/shared/Icons/PinIcon';
// contexts
import { CommunityTabsContext } from 'contexts/CommunityTabs';
import { LocationSearchContext } from 'contexts/locationSearch';
// config
import { tabs } from 'components/pages/Community/config.js';
// styles
import { colors, fonts } from 'styles/index.js';
import '@reach/tabs/styles.css';

// --- styled components ---
const lightBlue = '#f0f6f9';

const Location = styled.div`
  display: flex;
  align-items: center;
  padding: 0.5em;
`;

const Icon = styled(PinIcon)`
  margin-right: 0.25em;
  width: 3.25em;
  height: 3.25em;
`;

const Text = styled.div`
  display: flex;
  flex-flow: row wrap;

  p {
    margin: 0;
    padding: 0;
    width: 100%;
  }
`;

const Address = styled.p`
  font-size: 1.0625em;
  font-weight: bold;
`;

const Watershed = styled.p`
  strong {
    font-size: 0.875em;
  }
`;

/*
  - TabsOverlay's height is set to match each tab's initial min-height value
    (see StyledTabs [data-react-tab] styles below).
  - TabsOverlays' margin-bottom matches its height, so the overlay visually
    appears on top of the tabs, which are below the overlay in the DOM.
  - Though initially set to 45px, these two values (height and margin-bottom)
    are re-assigned with the actual rendered height of the tabs in case the
    tab's text contents makes its height greater than 45px
    (see measuredTabRef and tabsOverlayRef below).
*/
const TabsOverlay = styled.div`
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
    width: calc(100% / 9); /* .5 tab width */
    height: inherit;

    @media (min-width: 800px) {
      width: calc(100% / 11); /* .5 tab width */
    }

    @media (min-width: 960px) {
      width: calc(100% / 9); /* .5 tab width */
    }

    @media (min-width: 1280px) {
      width: calc(100% / 11); /* .5 tab width */
    }

    @media (min-width: 1600px) {
      width: calc(100% / 9); /* .5 tab width */
    }

    @media (min-width: 1920px) {
      width: calc(100% / 11); /* .5 tab width */
    }
  }

  ::before {
    left: 0;
    background-image: linear-gradient(
      to right,
      rgba(0, 0, 0, 0.5),
      rgba(0, 0, 0, 0)
    );
  }

  ::after {
    right: 0;
    background-image: linear-gradient(
      to left,
      rgba(0, 0, 0, 0.5),
      rgba(0, 0, 0, 0)
    );
  }
`;

const StyledTabs = styled(Tabs)`
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
      padding: ${(props) => {
        return props['info-toggle-checked'] === 'true' ? '1em' : '0';
      }};

      p {
        margin-top: 1rem;
        padding-bottom: 0;

        :first-of-type {
          margin-top: 0;
        }
      }

      h3 {
        margin: 1rem 0;
        padding-bottom: 0;
        font-family: ${fonts.primary};
        font-size: 1.375em;
      }
    }
  }
`;

const TabDots = styled.ul`
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

const TabDot = styled.button`
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

const TabHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5em;
  background-color: ${lightBlue};

  div {
    display: flex;
    align-items: center;
  }

  img {
    margin-right: 0.25em;
    height: 2.25em;
  }

  label {
    display: flex;
    align-items: center;
    margin-bottom: 0;
    font-weight: bold;
  }

  span {
    margin-right: 0.5em;
  }
`;

const TabTitle = styled.h1`
  font-family: inherit;
  font-size: 1.5em;
  font-weight: bold;
  margin: 0;
  padding-bottom: 0;
`;

// --- components ---
type Props = {
  ...RouteProps,
  // url params defined in routes.js
  urlSearch: string,
  tabName: string,
};

function CommunityTabs({ urlSearch, tabName, ...props }: Props) {
  const {
    activeTabIndex,
    setActiveTabIndex,
    infoToggleChecked,
    setInfoToggleChecked,
  } = React.useContext(CommunityTabsContext);

  const {
    searchText,
    setSearchText,
    address,
    watershed,
    huc12,
    setShowAllMonitoring,
    setMonitoringGroups,
    setShowAllPolluted,
    setPollutionParameters,
    setDrinkingWaterTabIndex,
  } = React.useContext(LocationSearchContext);

  // redirect to overview tab if tabName param wasn't provided in the url
  // (e.g. '/community/20001' redirects to '/community/20001/overview')
  React.useEffect(() => {
    if (urlSearch && !tabName) {
      navigate(`/community/${urlSearch}/overview`);
    }
  }, [urlSearch, tabName]);

  // redirect to '/community' if the url doesn't match a route in the tabs array
  // and conditionally set active tab index
  React.useEffect(() => {
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
  }, [urlSearch, activeTabIndex, setActiveTabIndex]);

  // conditionally set searchText from urlSearch
  // (e.g. when a user visits '/community/20001' directly)
  React.useEffect(() => {
    if (urlSearch !== searchText) {
      setSearchText(urlSearch);
    }
  }, [urlSearch, searchText, setSearchText]);

  const tabListRef = React.useRef();

  // focus and scroll (horizontally) to the active tab
  React.useEffect(() => {
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
  const [tabHeight, setTabHeight] = React.useState(45);
  const measuredTabRef = React.useCallback((node) => {
    if (!node) return;
    setTabHeight(node.getBoundingClientRect().height);
  }, []);

  const tabsOverlayRef = React.useRef();
  React.useEffect(() => {
    if (tabsOverlayRef.current) {
      tabsOverlayRef.current.style.height = `${tabHeight}px`;
      tabsOverlayRef.current.style.marginBottom = `-${tabHeight}px`;
    }
  }, [tabsOverlayRef, tabHeight]);

  const resetTabSpecificData = () => {
    // monitoring panel
    setShowAllMonitoring(true);
    setMonitoringGroups(null);

    // identified issues panel
    setShowAllPolluted(true);
    setPollutionParameters(null);

    // drinking water panel
    setDrinkingWaterTabIndex(0);
  };

  if (activeTabIndex === -1) return null;

  return (
    <>
      <Location>
        <Icon />

        <Text>
          <Address>{address}</Address>
          {watershed && (
            <Watershed>
              <strong>WATERSHED: </strong>
              {watershed} ({huc12})
            </Watershed>
          )}
        </Text>
      </Location>

      <TabsOverlay ref={tabsOverlayRef} />

      <StyledTabs
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
        info-toggle-checked={
          // pass custom DOM data-attribute as a prop so we can adjust each
          // TabPanel's styling, whenever the info panel is checked
          infoToggleChecked.toString()
        }
      >
        <TabList ref={tabListRef}>
          {tabs.map((tab) => (
            <Tab key={tab.title} ref={measuredTabRef}>
              {tab.title}
            </Tab>
          ))}
        </TabList>

        <TabDots aria-hidden="true">
          {tabs.map((tab, index) => {
            return (
              <li key={index}>
                <TabDot
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
        </TabDots>

        <TabHeader>
          <div>
            <img
              src={tabs[activeTabIndex].icon}
              alt={tabs[activeTabIndex].title}
            />
            <TabTitle>{tabs[activeTabIndex].title}</TabTitle>
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
        </TabHeader>

        <TabPanels>
          {tabs.map((tab) => (
            <TabPanel key={tab.title}>
              {/* only display upper tab content if info toggle is checked */}
              {infoToggleChecked && tab.upper}
            </TabPanel>
          ))}
        </TabPanels>
      </StyledTabs>
    </>
  );
}

export default CommunityTabs;
