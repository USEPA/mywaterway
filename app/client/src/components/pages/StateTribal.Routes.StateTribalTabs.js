// @flow

import React, { useContext, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {} from 'styled-components/macro';
import { Tab, Tabs, TabList, TabPanel, TabPanels } from '@reach/tabs';
// components
import { tabsStyles, tabPanelStyles } from 'components/shared/ContentTabs';
import WaterQualityOverview from 'components/pages/StateTribal.Tabs.WaterQualityOverview';
import AdvancedSearch from 'components/pages/StateTribal.Tabs.AdvancedSearch';
// styled components
import { largeTabStyles } from 'components/shared/ContentTabs.LargeTab.js';
// contexts
import { StateTribalTabsContext } from 'contexts/StateTribalTabs';
import {
  useOrganizationsContext,
  useServicesContext,
} from 'contexts/LookupFiles';
// utilities
import { fetchCheck } from 'utils/fetchUtils';

function StateTribalTabs() {
  const { stateCode, tabName } = useParams();
  const navigate = useNavigate();

  const organizations = useOrganizationsContext();
  const services = useServicesContext();

  const { activeState, setActiveState, activeTabIndex, setActiveTabIndex } =
    useContext(StateTribalTabsContext);

  // redirect to overview tab if tabName param wasn't provided in the url
  // (e.g. '/state/al' redirects to '/state/AL/water-quality-overview')
  useEffect(() => {
    const pathname = window.location.pathname.toLowerCase();
    if (pathname === `/tribe/${stateCode.toLowerCase()}`) return;

    if (stateCode && !tabName) {
      navigate(`/state/${stateCode.toUpperCase()}/water-quality-overview`);
    }
  }, [navigate, stateCode, tabName]);

  // redirect to '/stateandtribal' if the url doesn't match a valid route
  // and conditionally set active tab index
  useEffect(() => {
    const validRoutes = [
      `/state/${stateCode.toLowerCase()}/water-quality-overview`,
      `/state/${stateCode.toLowerCase()}/advanced-search`,
      `/tribe/${stateCode.toLowerCase()}`,
    ];

    const tabIndex = validRoutes.indexOf(
      window.location.pathname.toLowerCase(),
    );

    if (tabIndex === -1) {
      navigate('/stateandtribal');
    }

    if (activeTabIndex !== tabIndex) {
      setActiveTabIndex(tabIndex === -1 ? 0 : tabIndex);
    }
  }, [navigate, activeTabIndex, setActiveTabIndex, stateCode]);

  // if user navigation directly to the url, activeState.value will be an empty
  // string, so we'll need to query the attains states service for the states
  useEffect(() => {
    if (organizations.status === 'fetching') return;
    if (activeState.value === '') {
      // check if the stateID is a tribe id by checking the control table
      const matchTribes = organizations.data.features.filter(
        (feature) =>
          feature.attributes.orgtype === 'Tribe' &&
          feature.attributes.organizationid === stateCode.toUpperCase(),
      )[0];

      if (matchTribes) {
        setActiveState({
          value: matchTribes.attributes.organizationid,
          label: matchTribes.attributes.organizationid,
          source: 'Tribes',
        });
        return;
      }

      fetchCheck(`${services.data.attains.serviceUrl}states`)
        .then((res) => {
          // get matched state from web service response
          const match = res.data.filter(
            (state) => state.code === stateCode.toUpperCase(),
          )[0];

          // redirect to /state if no state was found
          if (!match) navigate('/stateandtribal');

          setActiveState({
            value: match.code,
            label: match.name,
            source: 'States',
          });
        })
        .catch((err) => {
          navigate('/stateandtribal');
        });
    }
  }, [
    activeState,
    navigate,
    organizations,
    services,
    setActiveState,
    stateCode,
  ]);

  const tabListRef = useRef();

  // focus the active tab
  useEffect(() => {
    if (tabListRef.current) {
      const tabList = tabListRef.current;
      const activeTab = tabList.children[activeTabIndex];
      setTimeout(() => activeTab.focus(), 0);
    }
  }, [tabListRef, activeTabIndex]);

  if (activeState.source === 'Tribes') {
    return <WaterQualityOverview />;
  }

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

export default StateTribalTabs;
