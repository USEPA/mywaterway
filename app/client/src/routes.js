// @flow

import React from 'react';
import { Router, useLocation, useNavigate } from '@reach/router';
import { css } from 'styled-components/macro';
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
import { errorBoxStyles } from 'components/shared/MessageBoxes';
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

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles}
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
  const location = useLocation();
  const navigate = useNavigate();

  const services = useServicesContext();

  if (services.status === 'fetching') {
    return <LoadingSpinner />;
  }

  if (services.status === 'failure') {
    return <div css={modifiedErrorBoxStyles}>{servicesLookupServiceError}</div>;
  }

  if (containsScriptTag(location.href)) {
    // if '<script>' is in the url, navigate to 'invalid-url' and reload the
    // page, otherwise the styles get all messed up
    navigate('/invalid-url');
    window.location.reload();
  }

  // if the pathname is not on a community page or is the community home page
  // with no location, reset the canonical link and remove the JSON LD script
  const pathName = window.location.pathname;
  if (!pathName.includes('/community') || pathName === '/community') {
    resetCanonicalLink();
    removeJsonLD();
  }

  return (
    <>
      <AlertMessage />

      <Router>
        <Home path="/" />
        <About path="/about" />
        <Data path="/data" />
        <Attains path="/attains" />
        <Community path="/community">
          <CommunityIntro path="/" />
          <CommunityTabs path="/:urlSearch" />
          <CommunityTabs path="/:urlSearch/:tabName" />
        </Community>
        <State path="/state">
          <StateIntro path="/" />
          <StateTabs path="/:stateCode" />
          <StateTabs path="/:stateCode/:tabName" />
        </State>
        <National path="/national" />
        <DrinkingWater path="/drinking-water" />
        <Swimming path="/swimming" />
        <EatingFish path="/eating-fish" />
        <AquaticLife path="/aquatic-life" />
        <Actions path="/plan-summary/:orgId/:actionId" />
        <WaterbodyReport path="/waterbody-report/:orgId/:auId" />
        <WaterbodyReport path="/waterbody-report/:orgId/:auId/:reportingCycle" />
        <InvalidUrl path="/invalid-url" />
        <ErrorPage default />
      </Router>
    </>
  );
}

export default Routes;
