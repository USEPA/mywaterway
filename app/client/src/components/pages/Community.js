// @flow

import React, { useContext, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { css } from 'styled-components/macro';
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
import { LocationSearchContext } from 'contexts/locationSearch';
import {
  CommunityTabsContext,
  CommunityTabsProvider,
} from 'contexts/CommunityTabs';
import { EsriMapProvider } from 'contexts/EsriMap';
import { MapHighlightProvider } from 'contexts/MapHighlight';
import { useFullscreenState, FullscreenProvider } from 'contexts/Fullscreen';
// config
import { tabs } from 'config/communityConfig.js';
// styles
import { colors, fonts } from 'styles/index.js';

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

  h2 {
    font-family: ${fonts.primary};
    font-size: 1.125em;

    @media (min-width: 560px) {
      font-size: 1.375em;
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

  const { fullscreenActive } = useFullscreenState();

  // CommunityIntro is rendered in Outlet when at the '/community' and '/community/' routes
  const atCommunityIntroRoute =
    window.location.pathname.replace(/\//g, '') === 'community'; // replace slashes "/" with empty string

  // scroll community content into view
  useEffect(() => {
    const content = document.querySelector('[data-content="community"]');
    if (content) content.scrollIntoView();
  }, []);

  // reset searchText and data when navigating away from '/community'
  const { setSearchText, setLastSearchText, errorMessage, resetData } =
    useContext(LocationSearchContext);

  useEffect(() => {
    return function cleanup() {
      fetchedDataDispatch({ type: 'RESET_FETCHED_DATA' });
      resetData();
      setSearchText('');
      setLastSearchText('');
    };
  }, [fetchedDataDispatch, resetData, setLastSearchText, setSearchText]);

  const { setVisibleLayers } = useContext(LocationSearchContext);

  useEffect(() => {
    // don't show any tab based layers if on community landing page
    if (window.location.pathname === '/community' || activeTabIndex === -1) {
      return;
    }

    setVisibleLayers(tabs[activeTabIndex].layers);
  }, [activeTabIndex, setVisibleLayers]);

  // reset data when navigating back to /community
  useEffect(() => {
    if (window.location.pathname === '/community') {
      fetchedDataDispatch({ type: 'RESET_FETCHED_DATA' });
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
    <>
      <LocationSearch
        route={activeTabRoute}
        label={<strong>Let’s get started!</strong>}
      />
    </>
  );

  const lowerTab = tabs[activeTabIndex === -1 ? 0 : activeTabIndex].lower;

  return (
    <Page>
      <TabLinks />
      <WindowSize>
        {({ width, height }) => {
          if (fullscreenActive) {
            return (
              <>
                <LocationMap windowHeight={height} layout="fullscreen" />

                <div style={{ display: 'none' }}>
                  <Outlet />
                </div>

                {!atCommunityIntroRoute && (
                  <div style={{ display: 'none' }}>{lowerTab}</div>
                )}
              </>
            );
          }

          if (width < 960) {
            // narrow screens
            return (
              <div css={columnsStyles} data-content="community">
                <div css={leftColumnStyles} data-column="left">
                  {errorMessage && (
                    <div css={modifiedErrorBoxStyles}>
                      <p>{errorMessage}</p>
                    </div>
                  )}

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
                  {errorMessage && (
                    <div css={modifiedErrorBoxStyles}>
                      <p>{errorMessage}</p>
                    </div>
                  )}

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
        <MapHighlightProvider>
          <FullscreenProvider>
            <Community />
          </FullscreenProvider>
        </MapHighlightProvider>
      </CommunityTabsProvider>
    </EsriMapProvider>
  );
}
