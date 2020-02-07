// @flow

import React from 'react';
import styled from 'styled-components';
// components
import { LargeTab } from 'components/shared/ContentTabs/LargeTab.js';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import Info from './Info';
import Questions from './Questions';

import { ContentTabs } from 'components/shared/ContentTabs';
// styles
import { fonts } from 'styles/index.js';

// --- styled components ---
const Container = styled.div`
  padding: 1rem;
`;

const StyledTabs = styled(Tabs)`
  [data-reach-tab] {
    padding: 0.875em;
  }

  [data-reach-tab-panel] {
    padding: 1.5em;

    p {
      margin-top: 1rem;
      padding-bottom: 0.5rem;
      line-height: 1.375;

      :first-of-type {
        margin-top: 0;
      }
    }

    hr {
      margin-top: 0;
      margin-bottom: 0.75rem;
    }

    ul {
      padding-bottom: 0;
    }

    li {
      line-height: 1.375;
    }

    h3 {
      margin: 2rem 0 0.25rem;
      padding-bottom: 0;
      font-family: ${fonts.primary};
      font-size: 1.8em;

      & + p {
        margin-top: 0;
      }
    }
    h5 {
      margin: 1rem 0 0.25rem;
      padding-bottom: 0;
      font-family: ${fonts.primary};
      font-size: 1.375em;

      & + p {
        margin-top: 0;
      }
    }
  }

  /* sub tabs */
  [data-reach-tabs] {
    margin-bottom: 0.5rem;
  }
`;

// --- components ---
type Props = {};

function AboutContent({ ...props }: Props) {
  React.useEffect(() => {
    // get the original url
    const href = window.location.href;

    // get the pathname without the leading /
    const pathname = window.location.pathname.substr(1);

    // build the url for the data page
    let newHref = '';
    if (pathname) {
      newHref = href.replace(pathname, 'about');
    } else {
      newHref = `${href}about`;
    }

    // change the browser address bar without reloading the page
    window.history.pushState(null, null, newHref);

    // when the user hits the back button change the url back to the original
    return function cleanup() {
      if (pathname !== 'about') window.history.pushState(null, null, href);
    };
  }, []);

  return (
    <Container className="container">
      <ContentTabs>
        <StyledTabs>
          <TabList>
            <LargeTab>About How's My Waterway</LargeTab>
            <LargeTab>Questions and Answers</LargeTab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Info />
            </TabPanel>
            <TabPanel>
              <Questions />
            </TabPanel>
          </TabPanels>
        </StyledTabs>
      </ContentTabs>
    </Container>
  );
}

export default AboutContent;
