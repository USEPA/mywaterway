// @flow

import React, { useState, useEffect } from 'react';
import type { Node } from 'react';
import { css } from 'styled-components/macro';
import { useNavigate } from 'react-router-dom';
import esriConfig from '@arcgis/core/config';
// components
import NavBar from 'components/shared/NavBar';
import DataContent from 'components/shared/DataContent';
import AboutContent from 'components/shared/AboutContent';
import EducatorsContent from 'components/shared/EducatorsContent';
import GlossaryPanel from 'components/shared/GlossaryPanel';
// contexts
import { useGlossaryState } from 'contexts/Glossary';
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import {
  getEnvironmentString,
  logCallToGoogleAnalytics,
} from 'utils/fetchUtils';
// styles
import { colors, fonts } from 'styles/index.js';
// images
import waterPhoto from 'images/water.jpg';

const topLinksStyles = css`
  position: relative;
  z-index: 100;
  margin: auto;
  max-width: 1024px; /* match EPA header */

  ul {
    position: absolute;
    margin: 0.375rem 0;
    padding: 0;
    width: 100%;
    text-align: center;
    list-style: none;

    @media (min-width: 35em) {
      right: 0;
      margin: 0.375rem;
      width: auto;
    }
  }

  li {
    display: inline-block;
    margin: 0.375rem;
  }

  a,
  a:hover,
  a:focus,
  a:visited {
    color: white;
    text-decoration: none;
  }

  button {
    margin-bottom: 0;
    font-weight: normal;
  }

  a,
  button {
    display: flex;
    align-items: center;
    padding: 0.5em 0.75em;
    border: 1px solid transparent;
    border-radius: 0.25em;
    height: 2rem;
    font-size: 0;
    line-height: normal;
    color: white;
    background-color: transparent;
    user-select: none;

    :hover,
    :focus {
      border-color: ${colors.white(0.75)};
      background-color: ${colors.white(0.125)};
    }

    &[data-disabled='true'] {
      opacity: 0.125;
      pointer-events: none;
    }

    i {
      width: 2rem;
      font-size: 1rem;
      text-align: center;
    }

    @media (min-width: 35em) {
      display: inline-block;
      font-size: 0.8125rem;

      i {
        width: auto;
        margin-right: 0.5em;
        font-size: 0.75rem;
      }
    }
  }
`;

const bannerStyles = css`
  position: relative;
  z-index: 10;
  height: 10em;
  background-image: linear-gradient(
      ${colors.black(0.875)} 25%,
      ${colors.black(0.625)} 50%,
      ${colors.black(0.375)} 75%
    ),
    url(${waterPhoto});
  background-size: cover;
  background-position: center;

  @media (min-width: 25em) {
    height: 11em;
  }

  @media (min-width: 50em) {
    height: 13em;
  }
`;

const textStyles = css`
  position: absolute;
  top: calc(50% + 24px); /* leave room for top links */
  right: 50%;
  transform: translate(50%, -50%);
  width: 100%;
  text-align: center;
  color: white;
  user-select: none;
`;

const titleStyles = css`
  padding: 0.375em;
  font-family: ${fonts.secondary};
  font-size: 1.5em;
  color: white;
  cursor: pointer;

  @media (min-width: 25em) {
    font-size: 2em;
  }

  @media (min-width: 50em) {
    font-size: 2.5em;
  }
`;

const subtitleStyles = css`
  padding: 0.375em;
  font-family: ${fonts.primary};
  font-size: 0.9375em;

  @media (min-width: 25em) {
    font-size: 1.0625em;
  }

  @media (min-width: 50em) {
    font-size: 1.25em;
  }
`;

type Props = {
  children: Node,
};

function Page({ children }: Props) {
  const navigate = useNavigate();

  const { initialized, glossaryStatus } = useGlossaryState();

  const services = useServicesContext();

  // handles hiding of the data page when the user clicks the browser's back button
  const [dataDisplayed, setDataDisplayed] = useState(false);
  const [aboutDisplayed, setAboutDisplayed] = useState(false);
  const [educatorsDisplayed, setEducatorsDisplayed] = useState(false);

  useEffect(() => {
    function handleHistoryChange(ev) {
      const { origin, pathname } = window.location;

      if (ev.target.origin !== origin) return;

      if (pathname !== '/data') setDataDisplayed(false);
      if (pathname !== '/about') setAboutDisplayed(false);
      if (pathname !== '/educators') setEducatorsDisplayed(false);
    }

    window.addEventListener('popstate', handleHistoryChange);

    return function cleanup() {
      window.removeEventListener('popstate', handleHistoryChange);
    };
  }, []);

  const pathParts = window.location.pathname.split('/');
  const pageName = pathParts.length > 1 ? pathParts[1] : '';

  // setup esri interceptors for logging to google analytics
  const [interceptorsInitialized, setInterceptorsInitialized] = useState(false);

  useEffect(() => {
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

      <div css={topLinksStyles}>
        <ul>
          <li>
            <button
              title="Glossary"
              className="js-glossary-toggle"
              data-disabled={!initialized || glossaryStatus === 'fetching'}
            >
              <i className="fas fa-book" aria-hidden="true" />
              Glossary
            </button>
          </li>

          <li>
            <button
              title="Data"
              onClick={(_ev) => {
                if (window.location.pathname !== '/data') {
                  setDataDisplayed(true);
                  setAboutDisplayed(false);
                  setEducatorsDisplayed(false);
                }
              }}
            >
              <i className="fas fa-database" aria-hidden="true" />
              Data
            </button>
          </li>

          <li>
            <button
              title="About"
              onClick={(_ev) => {
                if (window.location.pathname !== '/about') {
                  setDataDisplayed(false);
                  setAboutDisplayed(true);
                  setEducatorsDisplayed(false);
                }
              }}
            >
              <i className="fas fa-info-circle" aria-hidden="true" />
              About
            </button>
          </li>

          <li>
            <button
              title="Educators"
              onClick={(_ev) => {
                if (window.location.pathname !== '/educators') {
                  setDataDisplayed(false);
                  setAboutDisplayed(false);
                  setEducatorsDisplayed(true);
                }
              }}
            >
              <i className="fas fa-graduation-cap" aria-hidden="true" />
              Educators
            </button>
          </li>

          <li>
            <a
              title="Contact Us"
              href="https://www.epa.gov/waterdata/forms/contact-us-about-hows-my-waterway"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fas fa-envelope" aria-hidden="true" />
              Contact Us
            </a>
          </li>
        </ul>
      </div>

      <div css={bannerStyles}>
        <div css={textStyles}>
          <span
            css={titleStyles}
            onClick={(_ev) => {
              if (dataDisplayed) setDataDisplayed(false);
              if (aboutDisplayed) setAboutDisplayed(false);
              if (educatorsDisplayed) setEducatorsDisplayed(false);
              navigate('/');
            }}
          >
            How’s My Waterway?
          </span>

          <p css={subtitleStyles}>
            Informing the conversation about your waters.
          </p>
        </div>
      </div>

      {dataDisplayed && (
        <>
          <NavBar
            title="About the Data"
            onBackClick={(_ev) => setDataDisplayed(false)}
          />

          <DataContent />
        </>
      )}

      {aboutDisplayed && (
        <>
          <NavBar
            title="About"
            onBackClick={(_ev) => setAboutDisplayed(false)}
          />

          <AboutContent />
        </>
      )}

      {educatorsDisplayed && (
        <>
          <NavBar
            title="Educators"
            onBackClick={(_ev) => setEducatorsDisplayed(false)}
          />

          <EducatorsContent />
        </>
      )}

      {/* always render Page's children, just toggle the display property
        depending on the state of 'dataDisplayed' */}
      <div
        style={{
          display:
            dataDisplayed || aboutDisplayed || educatorsDisplayed
              ? 'none'
              : 'block',
        }}
      >
        {children}
      </div>
    </>
  );
}

export default Page;
