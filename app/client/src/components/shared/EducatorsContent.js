// @flow

import React, { useEffect } from 'react';
import { css } from 'styled-components/macro';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
// contexts
import { useEducatorMaterialsContext } from 'contexts/LookupFiles';
// config
import { educatorContentError } from 'config/errorMessages';
// styles
import { errorBoxStyles, infoBoxStyles } from 'components/shared/MessageBoxes';
import { fonts } from 'styles/index.js';

// NOTE: matching styles used in tabs in `AboutContent` component
const containerStyles = css`
  padding: 2rem;

  & :first-child {
    margin-top: 0;
  }

  h2,
  h3 {
    margin-bottom: 0;
    padding-bottom: 0;
    font-family: ${fonts.primary};
  }

  h2 {
    margin-top: 2rem;
    font-size: 1.8em;

    & + p {
      margin-top: 0;
    }
  }

  h3 {
    font-size: 1.2em;
    font-weight: bold;
  }

  p {
    margin-top: 0.5rem;
    padding-bottom: 0;
    line-height: 1.375;
  }

  ul {
    padding-bottom: 0;
  }

  li {
    line-height: 1.375;
  }

  hr {
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
  }
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles}
  margin-bottom: 1.25rem;
`;

const modifiedInfoBoxStyles = css`
  ${infoBoxStyles}
  margin-top: 1rem;
  h3 {
    margin-bottom: 0.5em;
  }
`;

const disclaimerStyles = css`
  display: inline-block;
`;

function EducatorsContent() {
  useEffect(() => {
    // get the original url
    const href = window.location.href;

    // get the pathname without the leading /
    const pathname = window.location.pathname.substr(1);

    // build the url for the current page
    let newHref = '';
    if (pathname) {
      newHref = href.replace(pathname, 'educators');
    } else {
      newHref = `${href}educators`;
    }

    // change the browser address bar without reloading the page
    window.history.pushState(null, null, newHref);

    // when the user hits the back button change the url back to the original
    return function cleanup() {
      // exit early, if user clicked the banner link or the original path
      // is the current page.
      if (window.location.pathname === '/' || pathname === 'educators') return;

      window.history.pushState(null, null, href);
    };
  }, []);

  const { data, status } = useEducatorMaterialsContext();

  return (
    <div css={containerStyles} className="container">
      <h2>
        <i className="fas fa-graduation-cap" aria-hidden="true" />
        &nbsp; Educational Materials from How’s My Waterway
      </h2>
      <hr />

      {status === 'failure' && (
        <div css={modifiedErrorBoxStyles}>
          <p>{educatorContentError}</p>
        </div>
      )}

      {status === 'fetching' && <LoadingSpinner />}

      {status === 'success' && (
        <ul>
          {data.links.map((link, index) => (
            <li key={index}>
              {link.description}:
              <br />
              <a href={link.url}>{link.url}</a>
            </li>
          ))}
        </ul>
      )}

      <div css={modifiedInfoBoxStyles}>
        <h3>
          <i className="fas fa-graduation-cap" aria-hidden="true" />
          &nbsp; If you’re an educator, we would like to know how you're using{' '}
          <em>How’s My Waterway</em>.
        </h3>
        <p>
          <a
            href="https://www.epa.gov/waterdata/forms/contact-us-about-hows-my-waterway"
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact us
          </a>
          &nbsp;&nbsp;
          <small css={disclaimerStyles}>(opens new browser tab)</small>
        </p>
      </div>
    </div>
  );
}

export default EducatorsContent;
