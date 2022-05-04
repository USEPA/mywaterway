// @flow

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { css } from 'styled-components/macro';
// components
import Home from 'components/pages/Home';
import Attains from 'components/pages/Attains';
import Data from 'components/pages/Data';
import About from 'components/pages/About';
import Community from 'components/pages/Community';
import CommunityIntro from 'components/pages/Community.Routes.CommunityIntro';
import CommunityTabs from 'components/pages/Community.Routes.CommunityTabs';
import StateTribal from 'components/pages/StateTribal';
import StateTribalIntro from 'components/pages/StateTribal.Routes.StateTribalIntro';
import StateTribalTabs from 'components/pages/StateTribal.Routes.StateTribalTabs';
import National from 'components/pages/National';
import MonitoringStation from 'components/pages/MonitoringStation';
import DrinkingWater from 'components/pages/DrinkingWater';
import Swimming from 'components/pages/Swimming';
import EatingFish from 'components/pages/EatingFish';
import AquaticLife from 'components/pages/AquaticLife';
import Actions from 'components/pages/Actions';
import WaterbodyReport from 'components/pages/WaterbodyReport';
import Educators from 'components/pages/Educators';
import ErrorPage from 'components/pages/404';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import AlertMessage from 'components/shared/AlertMessage';
// styled components
import { errorBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import { useServicesContext } from 'contexts/LookupFiles';
// helpers
import { resetCanonicalLink, removeJsonLD } from 'utils/utils';
// errors
import { servicesLookupServiceError } from 'config/errorMessages';

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles}
  margin: 1rem;
  text-align: center;
`;

function AppRoutes() {
  const services = useServicesContext();

  if (services.status === 'fetching') {
    return <LoadingSpinner />;
  }

  if (services.status === 'failure') {
    return <div css={modifiedErrorBoxStyles}>{servicesLookupServiceError}</div>;
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

<<<<<<< HEAD
      <Routes>
        <Route index element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/data" element={<Data />} />
        <Route path="/attains" element={<Attains />} />
        <Route path="/community" element={<Community />}>
          <Route index element={<CommunityIntro />} />
          <Route path=":urlSearch" element={<CommunityTabs />} />
          <Route path=":urlSearch/:tabName" element={<CommunityTabs />} />
        </Route>
        <Route path="/state-and-tribal" element={<StateTribal />}>
          <Route index element={<StateTribalIntro />} />
        </Route>
        <Route path="/state" element={<StateTribal />}>
          <Route path="/state/:stateCode" element={<StateTribalTabs />} />
          <Route
            path="/state/:stateCode/:tabName"
            element={<StateTribalTabs />}
          />
        </Route>
        <Route path="/tribe" element={<StateTribal />}>
          <Route path="/tribe/:stateCode" element={<StateTribalTabs />} />
        </Route>
        <Route path="/national" element={<National />} />
        <Route path="/drinking-water" element={<DrinkingWater />} />
        <Route path="/swimming" element={<Swimming />} />
        <Route path="/eating-fish" element={<EatingFish />} />
        <Route path="/aquatic-life" element={<AquaticLife />} />
        <Route path="/plan-summary/:orgId/:actionId" element={<Actions />} />
        <Route
          path="/waterbody-report/:orgId/:auId"
          element={<WaterbodyReport />}
        />
        <Route
          path="/waterbody-report/:orgId/:auId/:reportingCycle"
          element={<WaterbodyReport />}
        />
        <Route path="/educators" element={<Educators />} />
        <Route path="/station/:siteId" element={<MonitoringStation />} />
        <Route path="*" element={<ErrorPage />} />
      </Routes>
=======
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
              <MonitoringStation path="/station/:orgId/:siteId" />
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
>>>>>>> 64675453 (Began implementing the custom map component)
    </>
  );
}

export default AppRoutes;
