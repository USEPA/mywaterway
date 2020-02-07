// @flow

import React from 'react';
import styled from 'styled-components';
// components
import { LargeTab } from 'components/shared/ContentTabs/LargeTab.js';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import About from './About';
import Questions from './Questions';

import { ContentTabs } from 'components/shared/ContentTabs';
// styles
import { fonts } from 'styles/index.js';

// --- styled components ---
const Container = styled.div`
  padding: 1rem;

  h3 {
    margin-bottom: 0rem;
    padding-bottom: 0;
  }
  h5 {
    margin-bottom: 0.5;
    padding-bottom: 0;
  }
  hr {
    margin-top: 0.25rem;
    margin-bottom: 1rem;
  }
  p {
    padding-bottom: 2em;
    line-height: 1.375;
  }

  a {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 1.25em;
    line-height: 1.125;
  }

  @media (min-width: 30em) {
    padding: 2rem;

    a {
      font-size: 1.375em;
    }
  }
`;

const StyledTabs = styled(Tabs)`
  [data-reach-tab] {
    padding: 0.875em;
  }

  [data-reach-tab-panel] {
    padding: 1.5em;

    p {
      margin-top: 1rem;
      padding-bottom: 0;
      line-height: 1.375;

      :first-of-type {
        margin-top: 0;
      }
    }

    ul {
      padding-bottom: 0;
    }

    li {
      line-height: 1.375;
    }

    h3 {
      margin: 1.5rem 0 0.625rem;
      padding-bottom: 0;
      font-family: ${fonts.primary};
      font-size: 1.75em;

      & + p {
        margin-top: 0;
      }
    }
    h5 {
      margin: 1.5rem 0 0.625rem;
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
            <LargeTab>
              About How's My Waterway <i class="fas fa-info-circle" />
            </LargeTab>
            <LargeTab>
              Questions and Answers <i class="fas fa-question-circle" />
            </LargeTab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <About />
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
