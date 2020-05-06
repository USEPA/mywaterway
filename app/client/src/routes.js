// @flow

import React from 'react';
import { Router, Location, navigate } from '@reach/router';
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
import EatingFish from 'components/pages/EatingFish';
import AquaticLife from 'components/pages/AquaticLife';
import Actions from 'components/pages/Actions';
import WaterbodyReport from 'components/pages/WaterbodyReport';
import ErrorPage from 'components/pages/404';
import InvalidUrl from 'components/pages/InvalidUrl';
// helpers
import { containsScriptTag } from 'utils/utils';

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
    <Location>
      {({ location }) => {
        if (containsScriptTag(location.href)) {
          // if someone puts a <script> tag in the url we have to
          // navigate to invalid-url and reload the page, otherwise the css
          // gets all messed up.
          navigate('/invalid-url');
          window.location.reload();
        }

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
            <EatingFish path="/eating-fish" />
            <AquaticLife path="/aquatic-life" />
            {/* $FlowFixMe (orgId and actionId props are passed from the path) */}
            <Actions path="/plan-summary/:orgId/:actionId" />
            {/* $FlowFixMe (orgId and auId props are passed from the path) */}
            <WaterbodyReport path="/waterbody-report/:orgId/:auId" />
            <InvalidUrl path="/invalid-url" />
            <ErrorPage default />
          </Router>
        );
      }}
    </Location>
  );
}

export default Routes;
