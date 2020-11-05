// @flow

import React from 'react';
import type { Node } from 'react';
import WindowSize from '@reach/window-size';
import styled from 'styled-components';
// components
import type { RouteProps } from 'routes.js';
import Page from 'components/shared/Page';
import TabLinks from 'components/shared/TabLinks';
import LocationSearch from 'components/shared/LocationSearch';
import LocationMap from 'components/pages/LocationMap';
import MapVisibilityButton from 'components/shared/MapVisibilityButton';
import { StyledErrorBox } from 'components/shared/MessageBoxes';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
import {
  CommunityTabsContext,
  CommunityTabsProvider,
} from 'contexts/CommunityTabs';
import { EsriMapProvider } from 'contexts/EsriMap';
import { MapHighlightProvider } from 'contexts/MapHighlight';
import { OverviewFiltersProvider } from 'contexts/OverviewFilters';
import { FullscreenContext, FullscreenProvider } from 'contexts/Fullscreen';
// config
import { tabs } from './config.js';
// styles
import { colors } from 'styles/index.js';

// --- styled components ---
const Columns = styled.div`
  display: flex;
`;

const LeftColumn = styled.div`
  padding: 1.25em;
  width: 100%;

  @media (min-width: 960px) {
    width: 50%;
    box-shadow: inset -0.375em -0.375em 0.625em -0.375em ${colors.black(0.25)};
  }

  @media (min-width: 1600px) {
    width: calc(100% / 3 * 2);
  }
`;

const RightColumn = styled.div`
  margin-left: -1.25em;
  width: calc(100% + 2.5em);
  line-height: 1.25;

  @media (min-width: 960px) {
    margin-left: 0;
    width: 50%;
  }

  @media (min-width: 1600px) {
    width: calc(100% / 3);
  }
`;

const ErrorBox = styled(StyledErrorBox)`
  margin-bottom: 1em;
`;

// --- components ---
type Props = {
  children: Node,
  ...RouteProps,
};

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

function Community({ children, ...props }: Props) {
  const { activeTabIndex } = React.useContext(CommunityTabsContext);

  const { fullscreenActive } = React.useContext(FullscreenContext);

  // CommunityIntro is rendered as children when at the '/community' and '/community/' routes
  const atCommunityIntroRoute =
    window.location.pathname.replace(/\//g, '') === 'community'; // replace slashes "/" with empty string

  // scroll community content into view
  React.useEffect(() => {
    const content = document.querySelector('[data-content="community"]');
    if (content) content.scrollIntoView();
  }, []);

  // reset searchText and data when navigating away from '/community'
  const {
    resetData,
    setSearchText,
    setLastSearchText,
    errorMessage,
  } = React.useContext(LocationSearchContext);
  React.useEffect(() => {
    return function cleanup() {
      resetData();
      setSearchText('');
      setLastSearchText('');
    };
  }, [resetData, setLastSearchText, setSearchText]);

  const { setVisibleLayers } = React.useContext(LocationSearchContext);
  React.useEffect(() => {
    // don't show any tab based layers if on community landing page
    if (window.location.pathname === '/community' || activeTabIndex === -1) {
      return;
    }

    setVisibleLayers(tabs[activeTabIndex].layers);
  }, [activeTabIndex, setVisibleLayers]);

  // reset data when navigating back to /community
  React.useEffect(() => {
    if (window.location.pathname === '/community') {
      resetData();
      setSearchText('');
      setLastSearchText('');
    }
  }, [atCommunityIntroRoute, resetData, setSearchText, setLastSearchText]);

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

                <div style={{ display: 'none' }}>{children}</div>
                {!atCommunityIntroRoute && (
                  <div style={{ display: 'none' }}>{lowerTab}</div>
                )}
              </>
            );
          }

          if (width < 960) {
            // narrow screens
            return (
              <Columns data-content="community">
                <LeftColumn data-column="left">
                  {errorMessage && <ErrorBox>{errorMessage}</ErrorBox>}
                  {searchMarkup}
                  <RightColumn data-column="right">
                    {/* children is either CommunityIntro or CommunityTabs (upper tabs) */}
                    {children}
                  </RightColumn>
                  {!atCommunityIntroRoute && (
                    <>
                      <MapVisibilityButton>
                        {(mapShown) => (
                          <div style={{ display: mapShown ? 'block' : 'none' }}>
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
                </LeftColumn>
              </Columns>
            );
          } else {
            // wide screens
            return (
              <Columns data-content="community">
                <LeftColumn data-column="left">
                  {errorMessage && <ErrorBox>{errorMessage}</ErrorBox>}
                  <LocationMap windowHeight={height} layout="wide">
                    {searchMarkup}
                  </LocationMap>
                </LeftColumn>
                <RightColumn data-column="right">
                  {/* children is either CommunityIntro or CommunityTabs (upper tabs) */}
                  {children}
                  {!atCommunityIntroRoute && lowerTab}
                </RightColumn>
              </Columns>
            );
          }
        }}
      </WindowSize>
    </Page>
  );
}

export default function CommunityContainer({ ...props }: Props) {
  return (
    <EsriMapProvider>
      <CommunityTabsProvider>
        <MapHighlightProvider>
          <OverviewFiltersProvider>
            <FullscreenProvider>
              <Community {...props} />
            </FullscreenProvider>
          </OverviewFiltersProvider>
        </MapHighlightProvider>
      </CommunityTabsProvider>
    </EsriMapProvider>
  );
}
