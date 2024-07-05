// @flow
/** @jsxImportSource @emotion/react */

import { useEffect } from 'react';
import { css } from '@emotion/react';
// components
import { linkButtonStyles } from 'components/shared/LinkButton';
import LoadingSpinner from 'components/shared/LoadingSpinner';
// config
import { dataContentError } from 'config/errorMessages';
// contexts
import { useDataSourcesContext } from 'contexts/LookupFiles';
// styles
import {
  errorBoxStyles,
  infoBoxStyles,
  textBoxStyles,
} from 'components/shared/MessageBoxes';
import { fonts } from 'styles/index';

function scrollToItem(id: string) {
  const item = document.getElementById(id);
  if (item) item.scrollIntoView();
}

const marginBoxStyles = (styles) => css`
  ${styles}
  margin: 0.5em 0;
  width: fit-content;
`;

const containerStyles = css`
  padding: 1rem;

  p {
    padding-bottom: 0;
    line-height: 1.375;
  }

  ul {
    padding-bottom: 0;
  }

  li {
    margin-bottom: 0.25em;
  }

  i {
    padding-right: 0.75rem;
  }

  @media (min-width: 30em) {
    padding: 2rem;

    hr {
      margin-top: 2rem;
    }
  }
`;

const contentsTitleStyles = css`
  padding-bottom: 16px !important;
  text-decoration: underline;
`;

const modifiedInfoBoxStyles = css`
  ${infoBoxStyles}
  display: inline-block;
  margin-top: 2rem;
  width: 100%;

  h3 {
    font-size: 1.2em;
    font-weight: bold;
    font-family: ${fonts.primary};
    margin-bottom: 0.5em;
    padding-bottom: 0;
  }
`;

const modifiedLinkButtonStyles = css`
  ${linkButtonStyles}
  font-size: 16px;
  font-weight: 400;
  text-align: left;
`;

const pageErrorBoxStyles = css`
  ${errorBoxStyles};
  margin: 1rem;
  text-align: center;
`;

const titleStyles = css`
  display: inline;
  line-height: 1.125;
  font-family: ${fonts.primary};

  @media (min-width: 30em) {
    font-size: 1.375em;
  }
`;

const questionStyles = css`
  display: block;
  margin-bottom: 0.25rem;
  font-size: 1.125em;
  line-height: 1.125;
  font-family: ${fonts.primary};
  font-weight: bold;
  padding-bottom: 0;
`;

const itemStyles = css`
  margin-top: 1rem;

  @media (min-width: 30em) {
    margin-top: 2rem;
  }

  a,
  i {
    display: inline;
  }
`;

function DataContent() {
  useEffect(() => {
    // get the original url
    const href = window.location.href;

    // get the pathname without the leading /
    const pathname = window.location.pathname.slice(1);

    // build the url for the data page
    let newHref = '';
    if (pathname) {
      newHref = href.replace(pathname, 'data');
    } else {
      newHref = `${href}data`;
    }

    // change the browser address bar without reloading the page
    window.history.pushState(null, null, newHref);

    // when the user hits the back button change the url back to the original
    return function cleanup() {
      // exit early, if user clicked the banner link or the original path
      // is the data page.
      if (window.location.pathname === '/' || pathname === 'data') return;

      window.history.pushState(null, null, href);
    };
  }, []);

  const { data, status } = useDataSourcesContext();

  if (status === 'fetching') return <LoadingSpinner />;

  if (status === 'failure') {
    return (
      <div css={pageErrorBoxStyles}>
        <p>{dataContentError}</p>
      </div>
    );
  }

  return (
    <div css={containerStyles} className="container">
      <p dangerouslySetInnerHTML={{ __html: data.intro }} />

      <hr />

      <p css={contentsTitleStyles}>
        <strong>Contents</strong>
      </p>
      <ul>
        {data.content.map(({ id, title }) => (
          <li key={id}>
            <button
              css={modifiedLinkButtonStyles}
              onClick={() => scrollToItem(id)}
            >
              {title}
            </button>
          </li>
        ))}
      </ul>

      <hr />

      <em>Links below open in a new browser tab.</em>

      {data.content.map(
        (
          {
            description,
            extraContent,
            id,
            includeExit,
            linkHref,
            linkLabel,
            shortName,
            siteLocation,
            title,
          },
          i,
        ) => (
          <div key={id}>
            <div css={itemStyles} id={id}>
              <i className="fas fa-database" aria-hidden="true" />{' '}
              <h3 css={titleStyles}>{title}</h3>
              <div css={marginBoxStyles(textBoxStyles)}>
                <a href={linkHref} target="_blank" rel="noopener noreferrer">
                  {linkLabel}
                </a>
                {includeExit && (
                  <a
                    className="exit-disclaimer"
                    href="https://www.epa.gov/home/exit-epa"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    EXIT
                  </a>
                )}
              </div>
              <p dangerouslySetInnerHTML={{ __html: description }} />
              <br />
              <h4 css={questionStyles}>
                Where do I find {shortName} data in How’s My Waterway?
              </h4>
              <p dangerouslySetInnerHTML={{ __html: siteLocation }} />
              {extraContent !== null && (
                <div dangerouslySetInnerHTML={{ __html: extraContent }} />
              )}
              <ScrollToTop />
            </div>

            {i < data.content.length - 1 && <hr />}
          </div>
        ),
      )}
      <div
        css={modifiedInfoBoxStyles}
        dangerouslySetInnerHTML={{ __html: data.footer }}
      />
    </div>
  );
}

const scrollToTopContainerStyles = css`
  padding-top: 10px;
  color: #0071bc;
`;

// --- components - ScrollToTop

function ScrollToTop() {
  return (
    <div css={scrollToTopContainerStyles}>
      <div style={{ float: 'right' }}>
        <i className="fas fa-arrow-up" aria-hidden="true"></i>
        <button
          css={modifiedLinkButtonStyles}
          onClick={() => scrollToItem('hmw-nav-bar')}
        >
          Top of Page
        </button>
      </div>
    </div>
  );
}

export default DataContent;
