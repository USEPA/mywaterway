// @flow

import React from 'react';
import type { Node } from 'react';
import { navigate } from '@reach/router';
import styled from 'styled-components';
import esriConfig from '@arcgis/core/config';
// components
import NavBar from 'components/shared/NavBar';
import DataContent from 'components/shared/DataContent';
import AboutContent from 'components/shared/AboutContent';
import GlossaryPanel from 'components/shared/GlossaryPanel';
// contexts
import { GlossaryContext } from 'contexts/Glossary';
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import {
  getEnvironmentString,
  logCallToGoogleAnalytics,
} from 'utils/fetchUtils';
// styles
import { colors, fonts } from 'styles/index.js';
// images
import water from './water.jpg';

// --- styled components ---
const TopLinks = styled.div`
  position: relative;
  z-index: 100;
  margin: auto;
  max-width: 1024px; /* match EPA header */
`;

const List = styled.ul`
  padding: 0;
  float: right;
  list-style: none;
`;

const Item = styled.li`
  display: inline-block;
  margin-top: 1rem;
  margin-right: 0.5rem;
`;

const TopLink = styled.a`
  padding: 0.5em 0.75em;
  border: 1px solid transparent;
  border-radius: 0.25em;
  font-size: 0.8125rem;
  font-weight: normal;
  line-height: normal;
  color: white;
  background-color: transparent;
  user-select: none;

  :hover,
  :focus {
    border-color: ${colors.white(0.75)};
    color: white;
    background-color: ${colors.white(0.125)};
    text-decoration: none;
  }

  :visited {
    color: white;
  }

  &[data-disabled='true'] {
    opacity: 0.125;
    pointer-events: none;
  }

  i {
    margin-right: 0.5em;
    font-size: 0.75rem;
  }

  @media (max-width: 25em) {
    height: 48px;
    width: 48px;
    font-size: 0px;

    i {
      width: 48px;
      height: 48px;
      font-size: 16px;
      margin-right: 0em;
      text-align: center;
    }
  }
`;

const Banner = styled.div`
  display: block;
  position: relative;
  z-index: 10;
  height: 10em;
  background-image: linear-gradient(
      ${colors.black(0.875)} 25%,
      ${colors.black(0.625)} 50%,
      ${colors.black(0.375)} 75%
    ),
    url(${water});
  background-size: cover;
  background-position: center;

  @media (min-width: 25em) {
    height: 11em;
  }

  @media (min-width: 50em) {
    height: 13em;
  }
`;

const Container = styled.div`
  position: absolute;
  top: 50%;
  right: 50%;
  transform: translate(50%, -50%);
  width: 100%;
  text-align: center;
  color: white;
  user-select: none;
`;

const Title = styled.span`
  padding: 0.375em;
  font-family: ${fonts.secondary};
  font-size: 1.5em;
  color: white;

  @media (min-width: 25em) {
    font-size: 2em;
  }

  @media (min-width: 50em) {
    font-size: 2.5em;
  }
  &:hover {
    text-decoration: none;
  }
  &:visited {
    color: white;
  }
`;

const Subtitle = styled.p`
  padding: 0.375em;
  font-family: 'Roboto', sans-serif;
  font-size: 0.875em;

  @media (min-width: 25em) {
    font-size: 1em;
  }

  @media (min-width: 50em) {
    font-size: 1.1875em;
  }
`;

// --- components ---
type Props = {
  children: Node,
};

function Page({ children }: Props) {
  const { initialized, glossaryStatus } = React.useContext(GlossaryContext);

  const services = useServicesContext();

  // handles hiding of the data page when the user clicks the browser's back button
  const [dataDisplayed, setDataDisplayed] = React.useState(false);
  const [aboutDisplayed, setAboutDisplayed] = React.useState(false);
  React.useEffect(() => {
    function handleHistoryChange(ev) {
      if (ev.target.origin !== window.location.origin) {
        return;
      }
      if (window.location.pathname !== '/data') setDataDisplayed(false);
      if (window.location.pathname !== '/about') setAboutDisplayed(false);
    }

    window.addEventListener('popstate', handleHistoryChange);

    return function cleanup() {
      window.removeEventListener('popstate', handleHistoryChange);
    };
  }, []);

  const pathParts = window.location.pathname.split('/');
  const pageName = pathParts.length > 1 ? pathParts[1] : '';

  // setup esri interceptors for logging to google analytics
  const [interceptorsInitialized, setInterceptorsInitialized] = React.useState(
    false,
  );
  React.useEffect(() => {
    if (interceptorsInitialized) return;

    var callId = 0;
    var callDurations = {};

    // intercept esri calls to gispub
    const urls = [
      services.data.waterbodyService.points,
      services.data.waterbodyService.lines,
      services.data.waterbodyService.areas,
      services.data.waterbodyService.summary,
      services.data.wbd,
      services.data.mappedWater,
      services.data.locatorUrl,
    ];
    esriConfig.request.interceptors.push({
      urls,

      // Workaround for ESRI CORS cacheing issue, when switching between
      // environments.
      before: function (params) {
        // if this environment has a phony variable use it
        const envString = getEnvironmentString();
        if (envString) {
          params.requestOptions.query[envString] = 1;
        }

        // add the callId to the query so we can tie the response back
        params.requestOptions.query['callId'] = callId;

        // add the call's start time to the dictionary
        callDurations[callId] = performance.now();

        // increment the callId
        callId = callId + 1;
      },

      // Log esri api calls to Google Analytics
      after: function (response) {
        // get the execution time for the call
        const callIdResponse = response.requestOptions.query.callId;
        const startTime = callDurations[callIdResponse];

        logCallToGoogleAnalytics(response.url, 200, startTime);

        // delete the execution time from the dictionary
        delete callDurations[callIdResponse];
      },

      error: function (error) {
        // get the execution time for the call
        const details = error.details;
        const callIdResponse = details.requestOptions.query.callId;
        const startTime = callDurations[callIdResponse];

        logCallToGoogleAnalytics(
          details.url,
          details.httpStatus ? details.httpStatus : error.message,
          startTime,
        );

        // delete the execution time from the dictionary
        delete callDurations[callIdResponse];
      },
    });

    setInterceptorsInitialized(true);
  }, [interceptorsInitialized, services]);

  return (
    <>
      <GlossaryPanel path={pageName} />

      <TopLinks>
        <List>
          <Item>
            <TopLink
              title="Glossary"
              as="button"
              className="js-glossary-toggle"
              data-disabled={!initialized || glossaryStatus === 'fetching'}
            >
              <i className="fas fa-book" aria-hidden="true" />
              Glossary
            </TopLink>
          </Item>

          <Item>
            <TopLink
              title="Data"
              as="button"
              onClick={(ev) => {
                if (window.location.pathname !== '/data') {
                  setAboutDisplayed(false);
                  setDataDisplayed(true);
                }
              }}
            >
              <i className="fas fa-database" aria-hidden="true" />
              Data
            </TopLink>
          </Item>

          <Item>
            <TopLink
              title="About"
              as="button"
              onClick={(ev) => {
                if (window.location.pathname !== '/about') {
                  setDataDisplayed(false);
                  setAboutDisplayed(true);
                }
              }}
            >
              <i className="fas fa-info-circle" aria-hidden="true" />
              About
            </TopLink>
          </Item>

          <Item>
            <TopLink
              title="Contact Us"
              href="https://www.epa.gov/waterdata/forms/contact-us-about-hows-my-waterway"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fas fa-envelope" aria-hidden="true" />
              Contact Us
            </TopLink>
          </Item>
        </List>
      </TopLinks>

      <Banner>
        <Container>
          <Title
            onClick={() => {
              if (dataDisplayed) setDataDisplayed(false);
              if (aboutDisplayed) setAboutDisplayed(false);
              navigate('/');
            }}
          >
            How’s My Waterway?
          </Title>
          <Subtitle>Informing the conversation about your waters.</Subtitle>
        </Container>
      </Banner>

      {aboutDisplayed && (
        <>
          <NavBar
            title="About"
            onBackClick={(ev) => setAboutDisplayed(false)}
          />
          <AboutContent />
        </>
      )}

      {dataDisplayed && (
        <>
          <NavBar
            title="About the Data"
            onBackClick={(ev) => setDataDisplayed(false)}
          />
          <DataContent />
        </>
      )}

      {/* always render Page's children, just toggle the display property
        depending on the state of 'dataDisplayed' */}
      <div
        style={{
          display: dataDisplayed || aboutDisplayed ? 'none' : 'block',
        }}
      >
        {children}
      </div>
    </>
  );
}

export default Page;
