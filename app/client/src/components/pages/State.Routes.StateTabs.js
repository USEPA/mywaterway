// @flow

import React, { useContext, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {} from 'styled-components/macro';
import { Tab, Tabs, TabList, TabPanel, TabPanels } from '@reach/tabs';
// components
import { tabsStyles, tabPanelStyles } from 'components/shared/ContentTabs';
import WaterQualityOverview from 'components/pages/State.Tabs.WaterQualityOverview';
import AdvancedSearch from 'components/pages/State.Tabs.AdvancedSearch';
// styled components
import { largeTabStyles } from 'components/shared/ContentTabs.LargeTab.js';
// contexts
import { StateTabsContext } from 'contexts/StateTabs';
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import { fetchCheck } from 'utils/fetchUtils';

function StateTabs() {
  const { stateCode, tabName } = useParams();
  const navigate = useNavigate();

  const services = useServicesContext();

  const { activeState, setActiveState, activeTabIndex, setActiveTabIndex } =
    useContext(StateTabsContext);

  // redirect to overview tab if tabName param wasn't provided in the url
  // (e.g. '/state/al' redirects to '/state/AL/water-quality-overview')
  useEffect(() => {
    if (stateCode && !tabName) {
      navigate(`/state/${stateCode.toUpperCase()}/water-quality-overview`);
    }
  }, [navigate, stateCode, tabName]);

  // redirect to '/state' if the url doesn't match a valid route
  // and conditionally set active tab index
  useEffect(() => {
    const validRoutes = [
      `/state/${stateCode.toLowerCase()}/water-quality-overview`,
      `/state/${stateCode.toLowerCase()}/advanced-search`,
    ];

    const tabIndex = validRoutes.indexOf(
      window.location.pathname.toLowerCase(),
    );

    if (tabIndex === -1) {
      navigate('/state');
    }

    if (activeTabIndex !== tabIndex) {
      setActiveTabIndex(tabIndex === -1 ? 0 : tabIndex);
    }
  }, [navigate, activeTabIndex, setActiveTabIndex, stateCode]);

  // if user navigation directly to the url, activeState.code will be an empty
  // string, so we'll need to query the attains states service for the states
  useEffect(() => {
    if (activeState.code === '') {
      fetchCheck(`${services.data.attains.serviceUrl}states`)
        .then((res) => {
          // get matched state from web service response
          const match = res.data.filter(
            (state) => state.code === stateCode.toUpperCase(),
          )[0];

          // redirect to /state if no state was found
          if (!match) navigate('/state');

          setActiveState({ code: match.code, name: match.name });
        })
        .catch((err) => {
          navigate('/state');
        });
    }
  }, [navigate, activeState, setActiveState, stateCode, services]);

  const tabListRef = useRef();

  // focus the active tab
  useEffect(() => {
    if (tabListRef.current) {
      const tabList = tabListRef.current;
      const activeTab = tabList.children[activeTabIndex];
      setTimeout(() => activeTab.focus(), 0);
    }
  }, [tabListRef, activeTabIndex]);

  return (
    <Tabs
      css={tabsStyles}
      data-content="stateTabs"
      index={activeTabIndex}
      onChange={(index) => {
        setActiveTabIndex(index);
        // navigate to the tab’s route so Google Analytics captures a pageview
        const route =
          index === 0 ? 'water-quality-overview' : 'advanced-search';
        navigate(`/state/${stateCode.toUpperCase()}/${route}`);
      }}
    >
      <TabList ref={tabListRef}>
        <Tab css={largeTabStyles}>State Water Quality Overview</Tab>
        <Tab css={largeTabStyles}>Advanced Search</Tab>
      </TabList>

      <TabPanels>
        <TabPanel css={tabPanelStyles}>
          <WaterQualityOverview />
        </TabPanel>
        <TabPanel css={tabPanelStyles}>
          <AdvancedSearch />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}

export default StateTabs;
