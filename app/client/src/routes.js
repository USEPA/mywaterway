// @flow

import React from 'react';
import { Router } from '@reach/router';
// components
import Home from 'components/pages/Home';
import Attains from 'components/pages/Attains';
import Data from 'components/pages/Data';
import About from 'components/pages/About';
import Community from 'components/pages/Community';
import CommunityIntro from 'components/pages/Community/components/routes/CommunityIntro';
import CommunityTabs from 'components/pages/Community/components/routes/CommunityTabs';
import State from 'components/pages/State';
import StateIntro from 'components/pages/State/components/routes/StateIntro';
import StateTabs from 'components/pages/State/components/routes/StateTabs';
import National from 'components/pages/National';
import DrinkingWater from 'components/pages/DrinkingWater';
import Swimming from 'components/pages/Swimming';
import Fishing from 'components/pages/Fishing';
import OrgSelect from 'components/pages/Actions/OrgSelect';
import Actions from 'components/pages/Actions';
import WaterbodyReport from 'components/pages/WaterbodyReport';
import ErrorPage from 'components/pages/404';

// routes provided by Reach Router to each child of the Router component
export type RouteProps = {
  children: Node,
  location: Object,
  navigate: () => void,
  path: string,
  uri: string,
};

// --- components ---
function Routes() {
  return (
    <Router>
      <Home path="/" />
      <About path="/about" />
      <Data path="/data" />
      <Attains path="/attains" />
      <Community path="/community">
        <CommunityIntro path="/" />
        {/* $FlowFixMe (urlSearch prop is passed from the path) */}
        <CommunityTabs path="/:urlSearch" />
        {/* $FlowFixMe (urlSearch and tabName props are passed from the path) */}
        <CommunityTabs path="/:urlSearch/:tabName" />
      </Community>
      <State path="/state">
        <StateIntro path="/" />
        {/* $FlowFixMe (stateCode prop is passed from the path) */}
        <StateTabs path="/:stateCode" />
        {/* $FlowFixMe (stateCode and tabName props are passed from the path) */}
        <StateTabs path="/:stateCode/:tabName" />
      </State>
      <National path="/national" />
      <DrinkingWater path="/drinking-water" />
      <Swimming path="/swimming" />
      <Fishing path="/eating-fish" />
      {/* TODO: Remove this route once orgId is added to the response of the
          ATTAINS plans web service */}
      <OrgSelect path="/plan-summary/:actionId" />
      {/* $FlowFixMe (orgId and actionId props are passed from the path) */}
      <Actions path="/plan-summary/:orgId/:actionId" />
      {/* $FlowFixMe (orgId and auId props are passed from the path) */}
      <WaterbodyReport path="/waterbody-report/:orgId/:auId" />
      <ErrorPage default />
    </Router>
  );
}

export default Routes;
