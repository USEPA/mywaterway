// @flow
/** @jsxImportSource @emotion/react */

import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { css } from '@emotion/react';
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
import MonitoringReport from 'components/pages/MonitoringReport';
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
import {
  useConfigFilesDispatch,
  useConfigFilesState,
} from 'contexts/ConfigFiles';
// helpers
import { fetchCheck } from 'utils/fetchUtils';
import { resetCanonicalLink, removeJsonLD } from 'utils/utils';
// errors
import { servicesLookupServiceError } from 'config/errorMessages';

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles}
  margin: 1rem;
  text-align: center;
`;

/** Custom hook to fetch static content */
function useConfigFilesContent() {
  const contentDispatch = useConfigFilesDispatch();

  useEffect(() => {
    const loc = window.location;
    const origin =
      loc.hostname === 'localhost'
        ? `${loc.protocol}//${loc.hostname}:9091`
        : loc.origin;

    const controller = new AbortController();
    contentDispatch({ type: 'FETCH_CONFIG_REQUEST' });
    fetchCheck(`${origin}/api/configFiles`, controller.signal)
      .then((res) => {
        // setup google analytics map
        const googleAnalyticsMapping = [];
        res.services.googleAnalyticsMapping.forEach((item) => {
          // get base url
          let urlLookup = origin;
          if (item.urlLookup !== 'origin') {
            urlLookup = res.services;
            const pathParts = item.urlLookup.split('.');
            pathParts.forEach((part) => {
              urlLookup = urlLookup[part];
            });
          }

          let wildcardUrl = item.wildcardUrl;
          wildcardUrl = wildcardUrl.replace(/\{urlLookup\}/g, urlLookup);

          googleAnalyticsMapping.push({
            wildcardUrl,
            name: item.name,
          });
        });

        window.googleAnalyticsMapping = googleAnalyticsMapping;

        contentDispatch({
          type: 'FETCH_CONFIG_SUCCESS',
          payload: res,
        });
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        contentDispatch({ type: 'FETCH_CONFIG_FAILURE' });
      });

    return function cleanup() {
      controller.abort();
    };
  }, [contentDispatch]);
}

function AppRoutes() {
  const configFiles = useConfigFilesState();
  useConfigFilesContent();

  if (['idle', 'pending'].includes(configFiles.status))
    return <LoadingSpinner />;

  if (configFiles.status === 'failure')
    return <div css={modifiedErrorBoxStyles}>{servicesLookupServiceError}</div>;

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
    </>
  );
}

export default AppRoutes;
