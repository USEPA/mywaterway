// @flow
/** @jsxImportSource @emotion/react */

import { useEffect } from 'react';
import { css } from '@emotion/react';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
// contexts
import { useEducatorMaterialsContext } from 'contexts/LookupFiles';
// config
import { educatorContentError } from 'config/errorMessages';
// styles
import { errorBoxStyles, infoBoxStyles } from 'components/shared/MessageBoxes';
import { colors, fonts } from 'styles/index';

// NOTE: matching styles used in tabs in `AboutContent` component
const containerStyles = css`
  padding: 2rem;

  h3,
  h4 {
    margin-bottom: 0;
    padding-bottom: 0;
    font-family: ${fonts.primary};
  }

  h3 {
    margin-top: 0;
    font-size: 1.8em;

    & + p {
      margin-top: 0;
    }
  }

  h4 {
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

  i {
    padding-right: 0.75rem;
    color: ${colors.navyBlue()};
  }
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles}
  margin: 1rem;
  text-align: center;
`;

const contentStyles = css`
  margin-top: 1rem;
`;

const modifiedInfoBoxStyles = css`
  ${infoBoxStyles}
  margin-top: 1rem;
  h4 {
    margin-bottom: 0.5em;
  }
`;

function EducatorsContent() {
  useEffect(() => {
    // get the original url
    const href = window.location.href;

    // get the pathname without the leading /
    const pathname = window.location.pathname.slice(1);

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

  if (status === 'fetching') return <LoadingSpinner />;

  if (status === 'failure') {
    return (
      <div css={modifiedErrorBoxStyles}>
        <p>{educatorContentError}</p>
      </div>
    );
  }

  return (
    <div css={containerStyles} className="container">
      <h3 dangerouslySetInnerHTML={{ __html: data.title }} />

      <hr />

      <em>Links below open in a new browser tab.</em>

      <div
        css={contentStyles}
        dangerouslySetInnerHTML={{ __html: data.content }}
      />

      <div
        css={modifiedInfoBoxStyles}
        dangerouslySetInnerHTML={{ __html: data.footer }}
      />
    </div>
  );
}

export default EducatorsContent;
