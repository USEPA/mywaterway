// @flow

import React from 'react';
import { navigate } from '@reach/router';
import { Tabs, TabList, TabPanels, TabPanel } from '@reach/tabs';
// components
import type { RouteProps } from 'routes.js';
import { ContentTabs } from 'components/shared/ContentTabs';
import WaterQualityOverview from 'components/pages/State/components/tabs/WaterQualityOverview';
import AdvancedSearch from 'components/pages/State/components/tabs/AdvancedSearch';
// styled components
import { LargeTab } from 'components/shared/ContentTabs/LargeTab.js';
// contexts
import { StateTabsContext } from 'contexts/StateTabs';
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import { fetchCheck } from 'utils/fetchUtils';

// --- components ---
type Props = {
  stateCode: string,
  tabName: string,
  ...RouteProps,
};

function StateTabs({ stateCode, tabName, ...props }: Props) {
  const services = useServicesContext();

  const {
    activeState,
    setActiveState,
    activeTabIndex,
    setActiveTabIndex,
  } = React.useContext(StateTabsContext);

  // redirect to overview tab if tabName param wasn't provided in the url
  // (e.g. '/state/al' redirects to '/state/AL/water-quality-overview')
  React.useEffect(() => {
    if (stateCode && !tabName) {
      navigate(`/state/${stateCode.toUpperCase()}/water-quality-overview`);
    }
  }, [stateCode, tabName]);

  // redirect to '/state' if the url doesn't match a valid route
  // and conditionally set active tab index
  React.useEffect(() => {
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
  }, [activeTabIndex, setActiveTabIndex, stateCode]);

  // if user navigation directly to the url, activeState.code will be an empty
  // string, so we'll need to query the attains states service for the states
  React.useEffect(() => {
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
  }, [activeState, setActiveState, stateCode, services]);

  const tabListRef = React.useRef();

  // focus the active tab
  React.useEffect(() => {
    if (tabListRef.current) {
      const tabList = tabListRef.current;
      const activeTab = tabList.children[activeTabIndex];
      setTimeout(() => activeTab.focus(), 0);
    }
  }, [tabListRef, activeTabIndex]);

  return (
    <>
      <ContentTabs>
        <Tabs
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
            <LargeTab>State Water Quality Overview</LargeTab>
            <LargeTab>Advanced Search</LargeTab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <WaterQualityOverview />
            </TabPanel>
            <TabPanel>
              <AdvancedSearch />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </ContentTabs>
    </>
  );
}

export default StateTabs;
