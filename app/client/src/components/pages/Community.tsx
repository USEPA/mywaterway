/** @jsxImportSource @emotion/react */

import { useContext, useEffect, useRef } from 'react';
import { Outlet } from 'react-router';
import { css } from '@emotion/react';
import { WindowSize } from '@reach/window-size';
// components
import Page from 'components/shared/Page';
import TabLinks from 'components/shared/TabLinks';
import LocationSearch from 'components/shared/LocationSearch';
import LocationMap from 'components/shared/LocationMap';
import MapVisibilityButton from 'components/shared/MapVisibilityButton';
import { errorBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import { useFetchedDataDispatch } from 'contexts/FetchedData';
import { LayersProvider, useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
import {
  CommunityTabsContext,
  CommunityTabsProvider,
} from 'contexts/CommunityTabs';
import { EsriMapProvider } from 'contexts/EsriMap';
import { MapHighlightProvider } from 'contexts/MapHighlight';
import { useSurroundingsState } from 'contexts/Surroundings';
// config
import { tabs } from 'config/communityConfig.jsx';
// styles
import { colors, fonts } from 'styles/index';

const columnsStyles = css`
  display: flex;
  line-height: 1.25;

  p,
  li {
    font-size: 0.875em;

    @media (min-width: 560px) {
      font-size: 1em;
    }
  }
`;

const leftColumnStyles = css`
  padding: 1em;
  width: 100%;

  @media (min-width: 960px) {
    width: 50%;
    box-shadow: inset -0.375em -0.375em 0.625em -0.375em ${colors.black(0.25)};
  }

  @media (min-width: 1600px) {
    width: calc(100% / 3 * 2);
  }
`;

const rightColumnStyles = css`
  margin-left: -1em;
  width: calc(100% + 2em);
  line-height: 1.25;

  h3 {
    font-family: ${fonts.primary};
    font-size: 1.125em;

    @media (min-width: 560px) {
      font-size: 1.375em;
    }
  }

  @media (min-width: 960px) {
    margin-left: 0;
    width: 50%;
  }

  @media (min-width: 1600px) {
    width: calc(100% / 3);
  }
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles};
  margin-bottom: 1em;
  text-align: center;
`;

const mapContainerStyles = css`
  margin-bottom: 1em;
`;

/*
  default narrow screens layout (single column):
  *******************************************
  **  Prompt/Search                        **
  **  Intro content or Tabs (upper)        **
  **  Map               (if not on intro)  **
  **  Lower Tab content (if not on intro)  **
  *******************************************

  wide screens layout (two columns):
  **********************************************************************
  **  Prompt/Search          **  Intro content or Tabs (upper)        **
  **  Map (if not on intro)  **  Lower Tab content (if not on intro)  **
  **********************************************************************
*/

function Community() {
  const fetchedDataDispatch = useFetchedDataDispatch();

  const { activeTabIndex } = useContext(CommunityTabsContext);

  // CommunityIntro is rendered in Outlet when at the '/community' and '/community/' routes
  const atCommunityIntroRoute =
    window.location.pathname.replace(/\//g, '') === 'community'; // replace slashes "/" with empty string

  // scroll community content into view
  useEffect(() => {
    const content = document.querySelector('[data-content="community"]');
    if (content) content.scrollIntoView();
  }, []);

  // reset searchText and data when navigating away from '/community'
  const {
    resetData,
    setErrorMessage,
    setLastSearchText,
    setNoGeocodeResults,
    setSearchText,
  } = useContext(LocationSearchContext);

  const { updateVisibleLayers } = useLayers();

  useEffect(() => {
    return function cleanup() {
      fetchedDataDispatch({ type: 'reset' });
      resetData();
      setNoGeocodeResults(false);
      setErrorMessage('');
      setSearchText('');
      setLastSearchText('');
    };
  }, [
    fetchedDataDispatch,
    resetData,
    setErrorMessage,
    setLastSearchText,
    setNoGeocodeResults,
    setSearchText,
  ]);

  // Carry over surrounding features layer visibility between tabs.
  // A ref is used to prevent state updates when surrounding layers are toggled.
  const { visible: surroundingsVisible } = useSurroundingsState();
  const surroundingsVisibleRef = useRef(surroundingsVisible);

  useEffect(() => {
    surroundingsVisibleRef.current = surroundingsVisible;
  }, [surroundingsVisible]);

  useEffect(() => {
    // don't show any tab based layers if on community landing page
    if (window.location.pathname === '/community' || activeTabIndex === -1) {
      return;
    }

    updateVisibleLayers(
      {
        ...surroundingsVisibleRef.current,
        ...tabs[activeTabIndex].layers,
      },
      false,
    );
  }, [activeTabIndex, updateVisibleLayers]);

  // reset data when navigating back to /community
  useEffect(() => {
    if (window.location.pathname === '/community') {
      fetchedDataDispatch({ type: 'reset' });
      resetData();
      setSearchText('');
      setLastSearchText('');
    }
  }, [
    fetchedDataDispatch,
    atCommunityIntroRoute,
    resetData,
    setSearchText,
    setLastSearchText,
  ]);

  // jsx
  const activeTabRoute = tabs[activeTabIndex === -1 ? 0 : activeTabIndex].route;
  const searchMarkup = (
    <LocationSearch
      route={activeTabRoute}
      label={<strong>Let’s get started!</strong>}
    />
  );

  const lowerTab = tabs[activeTabIndex === -1 ? 0 : activeTabIndex].lower;

  return (
    <Page>
      <TabLinks />
      <WindowSize>
        {({ width, height }) => {
          if (width < 960) {
            // narrow screens
            return (
              <div css={columnsStyles} data-content="community">
                <div css={leftColumnStyles} data-column="left">
                  {searchMarkup}

                  <div css={rightColumnStyles} data-column="right">
                    {/* Outlet is either CommunityIntro or CommunityTabs (upper tabs) */}
                    <Outlet />
                  </div>

                  {!atCommunityIntroRoute && (
                    <>
                      <MapVisibilityButton>
                        {(mapShown) => (
                          <div
                            css={mapContainerStyles}
                            style={{ display: mapShown ? 'block' : 'none' }}
                          >
                            <LocationMap
                              windowHeight={height}
                              layout="narrow"
                            />
                          </div>
                        )}
                      </MapVisibilityButton>

                      {lowerTab}
                    </>
                  )}
                </div>
              </div>
            );
          } else {
            // wide screens
            return (
              <div css={columnsStyles} data-content="community">
                <div css={leftColumnStyles} data-column="left">
                  <LocationMap windowHeight={height} layout="wide">
                    {searchMarkup}
                  </LocationMap>
                </div>

                <div css={rightColumnStyles} data-column="right">
                  {/* Outlet is either CommunityIntro or CommunityTabs (upper tabs) */}
                  <Outlet />

                  {!atCommunityIntroRoute && lowerTab}
                </div>
              </div>
            );
          }
        }}
      </WindowSize>
    </Page>
  );
}

export default function CommunityContainer() {
  return (
    <EsriMapProvider>
      <CommunityTabsProvider>
        <LayersProvider>
          <MapHighlightProvider>
            <Community />
          </MapHighlightProvider>
        </LayersProvider>
      </CommunityTabsProvider>
    </EsriMapProvider>
  );
}
