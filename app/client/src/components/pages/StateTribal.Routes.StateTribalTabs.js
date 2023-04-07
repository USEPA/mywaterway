// @flow

import React, { useContext, useEffect, useRef } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import {} from 'styled-components/macro';
import { Tab, Tabs, TabList, TabPanel, TabPanels } from '@reach/tabs';
import { useWindowSize } from '@reach/window-size';
// components
import { tabsStyles, tabPanelStyles } from 'components/shared/ContentTabs';
import WaterQualityOverview from 'components/pages/StateTribal.Tabs.WaterQualityOverview';
import AdvancedSearch from 'components/pages/StateTribal.Tabs.AdvancedSearch';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import TribalMapList from 'components/shared/TribalMapList';
// styled components
import { largeTabStyles } from 'components/shared/ContentTabs.LargeTab.js';
// contexts
import { StateTribalTabsContext } from 'contexts/StateTribalTabs';
import { useFullscreenState, FullscreenProvider } from 'contexts/Fullscreen';

function StateTribalTabs() {
  const { stateCode, tabName } = useParams();
  const navigate = useNavigate();

  const {
    activeState,
    activeTabIndex,
    setActiveState,
    setActiveTabIndex,
    setErrorType,
  } = useContext(StateTribalTabsContext);

  const { fullscreenActive } = useFullscreenState();

  // redirect to overview tab if tabName param wasn't provided in the url
  // (e.g. '/state/al' redirects to '/state/AL/water-quality-overview')
  useEffect(() => {
    const pathname = window.location.pathname.toLowerCase();
    if (pathname === `/tribe/${stateCode.toLowerCase()}`) return;

    if (stateCode && !tabName) {
      navigate(`/state/${stateCode.toUpperCase()}/water-quality-overview`, {
        replace: true,
      });
    }
  }, [navigate, stateCode, tabName]);

  // redirect to '/state-and-tribal' if the url doesn't match a valid route
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
      setErrorType('invalid-page');
      navigate('/state-and-tribal', { replace: true });
    }

    if (activeTabIndex !== tabIndex) {
      setActiveTabIndex(tabIndex === -1 ? 0 : tabIndex);
    }
  }, [activeTabIndex, navigate, setActiveTabIndex, setErrorType, stateCode]);

  // if user navigation directly to the url, activeState.value will be an empty
  // string, and if the back or forward buttons are used, `stateCode` won't match the
  // activeState, so we need to set it.
  const { states, tribes } = useOutletContext();
  useEffect(() => {
    if (tribes.status !== 'success' || states.status !== 'success') return;
    if (activeState.value === '' || activeState.value !== stateCode) {
      const match = [...tribes.data, ...states.data].find((stateTribe) => {
        return stateTribe.value === stateCode.toUpperCase();
      });
      if (match) setActiveState(match);
      else {
        setErrorType('invalid-org-id');
        navigate('/state-and-tribal', { replace: true });
      }
    }
  }, [
    activeState.value,
    navigate,
    setActiveState,
    setErrorType,
    stateCode,
    states,
    tribes,
  ]);

  // reset the error after a successfull search
  useEffect(() => {
    if (activeState.value) setErrorType('');
  }, [activeState.value, setErrorType]);

  const tabListRef = useRef();

  const { width, height } = useWindowSize();

  const mapContent = (
    <TribalMapList
      windowHeight={height}
      windowWidth={width}
      layout={fullscreenActive ? 'fullscreen' : 'narrow'}
      activeState={activeState}
    />
  );

  if (activeState.source === 'All') {
    if (states.status === 'failure' || tribes.status === 'failure') {
      return null;
    }

    return <LoadingSpinner />;
  }

  if (activeState.source === 'State' && states.status === 'failure') {
    return null;
  }

  if (activeState.source === 'Tribe') {
    if (tribes.status === 'failure') return null;
    if (fullscreenActive) return mapContent;

    return (
      <div>
        <h2>
          <i className="fas fa-map-marked-alt" aria-hidden="true" />
          <strong>{activeState.label}</strong> at a Glance
        </h2>
        <div>{mapContent}</div>
        <hr />
        <WaterQualityOverview />
      </div>
    );
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

export default function StateTribalTabsContainer() {
  return (
    <FullscreenProvider>
      <StateTribalTabs />
    </FullscreenProvider>
  );
}
