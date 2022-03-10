// @flow

import React from 'react';
import { Router, Location, navigate } from '@reach/router';
import styled from 'styled-components';
// components
import Home from 'components/pages/Home';
import Attains from 'components/pages/Attains';
import Data from 'components/pages/Data';
import About from 'components/pages/About';
import Community from 'components/pages/Community';
import CommunityIntro from 'components/pages/Community.Routes.CommunityIntro';
import CommunityTabs from 'components/pages/Community.Routes.CommunityTabs';
import State from 'components/pages/State';
import StateIntro from 'components/pages/State.Routes.StateIntro';
import StateTabs from 'components/pages/State.Routes.StateTabs';
import National from 'components/pages/National';
import DrinkingWater from 'components/pages/DrinkingWater';
import Swimming from 'components/pages/Swimming';
import EatingFish from 'components/pages/EatingFish';
import AquaticLife from 'components/pages/AquaticLife';
import Actions from 'components/pages/Actions';
import WaterbodyReport from 'components/pages/WaterbodyReport';
import ErrorPage from 'components/pages/404';
import InvalidUrl from 'components/pages/InvalidUrl';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import AlertMessage from 'components/shared/AlertMessage';
// styled components
import { StyledErrorBox } from 'components/shared/MessageBoxes';
// contexts
import { useServicesContext } from 'contexts/LookupFiles';
// helpers
import {
  containsScriptTag,
  resetCanonicalLink,
  removeJsonLD,
} from 'utils/utils';
// errors
import { servicesLookupServiceError } from 'config/errorMessages';

// --- styled components ---
const ErrorBox = styled(StyledErrorBox)`
  margin: 1rem;
  text-align: center;
`;

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
  const services = useServicesContext();

  if (services.status === 'fetching') {
    return <LoadingSpinner />;
  }
  if (services.status === 'failure') {
    return <ErrorBox>{servicesLookupServiceError}</ErrorBox>;
  }

  return (
    <>
      <AlertMessage />
      <Location>
        {({ location }) => {
          if (containsScriptTag(location.href)) {
            // if someone puts a <script> tag in the url we have to
            // navigate to invalid-url and reload the page, otherwise the css
            // gets all messed up.
            navigate('/invalid-url');
            window.location.reload();
          }

          // reset the canonical link and JSON LD:
          // if the pathname is not on a community page
          // or if the pathname is the community home page with no location
          const pathName = window.location.pathname;
          if (!pathName.includes('/community') || pathName === '/community') {
            // reset canonical geoconnex PID link
            resetCanonicalLink();

            // remove JSON LD context script
            removeJsonLD();
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
              <WaterbodyReport path="/waterbody-report/:orgId/:auId/:reportingCycle" />
              <InvalidUrl path="/invalid-url" />
              <ErrorPage default />
            </Router>
          );
        }}
      </Location>
    </>
  );
}

export default Routes;
