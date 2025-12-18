/** @jsxImportSource @emotion/react */

import * as query from '@arcgis/core/rest/query';
import { useContext, useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import { useOutletContext, useParams, useNavigate } from 'react-router';
import { Tab, Tabs, TabList, TabPanel, TabPanels } from '@reach/tabs';
import { useWindowSize } from '@reach/window-size';
import IconMapMarkedAlt from '~icons/fa7-solid/map-marked-alt';
// components
import { tabsStyles, tabPanelStyles } from 'components/shared/ContentTabs';
import WaterQualityOverview from 'components/pages/StateTribal.Tabs.WaterQualityOverview';
import AdvancedSearch from 'components/pages/StateTribal.Tabs.AdvancedSearch';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import TribalMapList from 'components/shared/TribalMapList';
// styled components
import { largeTabStyles } from 'components/shared/ContentTabs.LargeTab.js';
import { h2Styles } from 'styles/stateTribal';
// contexts
import { useConfigFilesState } from 'contexts/ConfigFiles';
import { StateTribalTabsContext } from 'contexts/StateTribalTabs';

const headingStyles = css`
  ${h2Styles}
  margin-top: 0 !important;
  display: flex;
  align-items: center;

  svg {
    margin-right: 0.3125em;
    color: #2c72b5;
  }
`;

function StateTribalTabs() {
  const { stateCode, tabName } = useParams();
  const navigate = useNavigate();

  const services = useConfigFilesState().data.services;

  const {
    activeState,
    activeTabIndex,
    setActiveState,
    setActiveTabIndex,
    setErrorType,
  } = useContext(StateTribalTabsContext);

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
      const findStateTribeMapping = async (code: string) => {
        const findByAttainsIdOrStateCode = (c: string) =>
          [...tribes.data, ...states.data].find((stateTribe) => {
            return stateTribe.value === c.toUpperCase();
          });

        const findByEpaId = (c: number) =>
          tribes.data.find((tribe) => tribe.epaId === c);

        const queryTribalLayerByEpaId = async (c: number) => {
          for (let i = 1; i <= 5; i++) {
            const response = await query.executeQueryJSON(
              `${services.tribal}/${i}`,
              {
                where: `EPA_ID = ${c}`,
                outFields: ['*'],
                returnGeometry: false,
              },
            );
            if (response.features.length > 0) {
              const feature = response.features[0];
              return {
                attainsId: null,
                biaTribeCode: feature.attributes.BIA_CODE,
                epaId: feature.attributes.EPA_ID,
                epaRegion: feature.attributes.REGION,
                label: feature.attributes.TRIBE_NAME,
                name: feature.attributes.TRIBE_NAME,
                source: 'Tribe' as const,
                state: feature.attributes.STATE,
                stateList: [feature.attributes.STATE],
                value: feature.attributes.EPA_ID,
              };
            }
          }
        };

        let match = null;

        // Try to find the matching state or tribe mapping by ATTAINS ID or state code
        match = findByAttainsIdOrStateCode(code);

        if (!match) {
          const epaId = Number(code);
          if (!Number.isNaN(epaId)) {
            // If no match, try to find the mapping by EPA ID
            match = findByEpaId(epaId);

            // If still no match, query the tribal layers by EPA ID and generate a mapping
            if (!match) match = await queryTribalLayerByEpaId(epaId);
          }
        }

        return match;
      };

      findStateTribeMapping(stateCode)
        .then((match) => {
          if (match) setActiveState(match);
          else {
            setErrorType('invalid-org-id');
            navigate('/state-and-tribal', { replace: true });
          }
        })
        .catch((err) => {
          console.error(err);
          setErrorType('service-error');
          navigate('/state-and-tribal', { replace: true });
        });
    }
  }, [
    activeState.value,
    navigate,
    services,
    setActiveState,
    setErrorType,
    stateCode,
    states,
    tribes,
  ]);

  // reset the error after a successful search
  useEffect(() => {
    if (activeState.value) setErrorType('');
  }, [activeState.value, setErrorType]);

  const tabListRef = useRef();

  const { height } = useWindowSize();

  const mapContent = (
    <TribalMapList windowHeight={height} activeState={activeState} />
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

    return (
      <div>
        <h2 css={headingStyles}>
          <IconMapMarkedAlt aria-hidden="true" />
          <strong>{activeState.label}</strong> at a Glance
        </h2>
        <div>{mapContent}</div>
        {activeState.attainsId && (
          <>
            <hr />
            <WaterQualityOverview />
          </>
        )}
      </div>
    );
  }

  return (
    <Tabs
      css={tabsStyles}
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
