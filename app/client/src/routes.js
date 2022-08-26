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
import MonitoringLocation from 'components/pages/MonitoringLocation';
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
        {/* TODO-Tribal - Uncomment the below lines */}
        {/* <Route path="/state-and-tribal" element={<StateTribal />}>
          <Route index element={<StateTribalIntro />} />
        </Route> */}
        <Route path="/state" element={<StateTribal />}>
          {/* TODO-Tribal - Remove the next line */}
          <Route index element={<StateTribalIntro />} />
          <Route path="/state/:stateCode" element={<StateTribalTabs />} />
          <Route
            path="/state/:stateCode/:tabName"
            element={<StateTribalTabs />}
          />
        </Route>
        {/* TODO-Tribal - Uncomment the below lines */}
        {/* <Route path="/tribe" element={<StateTribal />}>
          <Route path="/tribe/:stateCode" element={<StateTribalTabs />} />
        </Route> */}
        <Route path="/national" element={<National />} />
        <Route path="/drinking-water" element={<DrinkingWater />} />
        <Route path="/swimming" element={<Swimming />} />
        <Route path="/eating-fish" element={<EatingFish />} />
        <Route path="/aquatic-life" element={<AquaticLife />} />
        <Route path="/plan-summary/:orgId/:actionId" element={<Actions />} />
        <Route
          path="/monitoring-report/:provider/:orgId/:siteId"
          element={<MonitoringLocation />}
        />
        <Route
          path="/waterbody-report/:orgId/:auId"
          element={<WaterbodyReport />}
        />
        <Route
          path="/waterbody-report/:orgId/:auId/:reportingCycle"
          element={<WaterbodyReport />}
        />
        <Route path="/educators" element={<Educators />} />
        <Route path="*" element={<ErrorPage />} />
      </Routes>
    </>
  );
}

export default AppRoutes;
