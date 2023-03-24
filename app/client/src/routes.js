// @flow

import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { css } from 'styled-components/macro';
// components
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

const Home = lazy(() => import('components/pages/Home'));
const Attains = lazy(() => import('components/pages/Attains'));
const Data = lazy(() => import('components/pages/Data'));
const About = lazy(() => import('components/pages/About'));
const Community = lazy(() => import('components/pages/Community'));
const CommunityIntro = lazy(() =>
  import('components/pages/Community.Routes.CommunityIntro'),
);
const CommunityTabs = lazy(() =>
  import('components/pages/Community.Routes.CommunityTabs'),
);
const StateTribal = lazy(() => import('components/pages/StateTribal'));
const StateTribalIntro = lazy(() =>
  import('components/pages/StateTribal.Routes.StateTribalIntro'),
);
const StateTribalTabs = lazy(() =>
  import('components/pages/StateTribal.Routes.StateTribalTabs'),
);
const National = lazy(() => import('components/pages/National'));
const MonitoringReport = lazy(() =>
  import('components/pages/MonitoringReport'),
);
const DrinkingWater = lazy(() => import('components/pages/DrinkingWater'));
const Swimming = lazy(() => import('components/pages/Swimming'));
const EatingFish = lazy(() => import('components/pages/EatingFish'));
const AquaticLife = lazy(() => import('components/pages/AquaticLife'));
const Actions = lazy(() => import('components/pages/Actions'));
const WaterbodyReport = lazy(() => import('components/pages/WaterbodyReport'));
const Educators = lazy(() => import('components/pages/Educators'));
const ErrorPage = lazy(() => import('components/pages/404'));

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

      <Suspense fallback={<LoadingSpinner />}>
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
            path="/monitoring-report/:provider/:orgId/:siteId"
            element={<MonitoringReport />}
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
      </Suspense>
    </>
  );
}

export default AppRoutes;
