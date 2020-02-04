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

const StyledTabs = styled(Tabs)`
  > [data-reach-tab-list] {
    flex-flow: row wrap;

    [data-reach-tab] {
      padding: 0.5em;
      border: none;
      border-right: 1px solid white;
      border-bottom: 1px solid white;
      border-radius: 0;
      min-height: 45px;
      width: 50%;
      font-size: 0.8125em;
      color: white;
      background-color: ${colors.blue()};
      /* fake border bottom so it doesn't interfere with right border */
      box-shadow: inset 0 -5px 0 ${colors.blue()};

      &[data-selected],
      &:hover,
      &:focus {
        z-index: 1;
        background-color: ${colors.purple()};
        box-shadow: inset 0 -5px 0 ${colors.teal()};
      }

      &:nth-of-type(even) {
        border-right: none;
      }

      @media (min-width: 320px) {
        width: 25%;

        &:nth-of-type(2),
        &:nth-of-type(6) {
          border-right: 1px solid white;
        }
      }

      @media (min-width: 600px) {
        width: 12.5%;

        &:nth-of-type(4) {
          border-right: 1px solid white;
        }
      }

      @media (min-width: 960px) {
        font-size: 0.6875em;
      }

      @media (min-width: 1200px) {
        font-size: 0.75em;
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

const TabHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5em;
  background-color: #f0f6f9;

  div {
    display: flex;
    align-items: center;
  }

  img {
    margin-right: 0.25em;
    height: 2.25em;
  }

  p {
    padding-bottom: 0;
    font-size: 1.5em;
    font-weight: bold;
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
  }, [urlSearch, setActiveTabIndex, activeTabIndex]);

  // conditionally set searchText from urlSearch
  // (e.g. when a user visits '/community/20001' directly)
  React.useEffect(() => {
    if (urlSearch !== searchText) {
      setSearchText(urlSearch);
    }
  }, [urlSearch, searchText, setSearchText]);

  const tabListRef = React.useRef();

  // focus the active tab
  React.useEffect(() => {
    if (tabListRef.current) {
      tabListRef.current.children[activeTabIndex].focus();
    }
  }, [tabListRef, activeTabIndex]);

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
            <Tab key={tab.title}>{tab.title}</Tab>
          ))}
        </TabList>

        <TabHeader>
          <div>
            <img src={tabs[activeTabIndex].icon} alt="" />
            <p>{tabs[activeTabIndex].title}</p>
          </div>

          <div>
            <label>
              <span>Show Text</span>
              <Switch
                checked={infoToggleChecked}
                onChange={(checked) => setInfoToggleChecked(checked)}
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
