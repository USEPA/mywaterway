/** @jsxImportSource @emotion/react */

import { useEffect } from 'react';
import { css } from '@emotion/react';
import IconGraduationCap from '~icons/fa7-solid/graduation-cap';
// contexts
import { useConfigFilesState } from 'contexts/ConfigFiles';
// styles
import { infoBoxStyles } from 'components/shared/MessageBoxes';
import { colors, fonts } from 'styles/index';

// NOTE: matching styles used in tabs in `AboutContent` component
const containerStyles = css`
  padding: 2rem;

  h3,
  h4 {
    display: flex;
    align-items: center;
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

  svg {
    padding-right: 0.5rem;
    color: ${colors.navyBlue()};
    font-size: 2.25rem;
  }
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

  const configFiles = useConfigFilesState();
  const data = configFiles.data.educators;

  return (
    <div css={containerStyles} className="container">
      <h3>
        <IconGraduationCap aria-hidden="true" />
        <span dangerouslySetInnerHTML={{ __html: data.title }} />
      </h3>

      <hr />

      <em>Links below open in a new browser tab.</em>

      <div
        css={contentStyles}
        dangerouslySetInnerHTML={{ __html: data.content }}
      />

      <div css={modifiedInfoBoxStyles}>
        <h4>
          <IconGraduationCap aria-hidden="true" />
          <span dangerouslySetInnerHTML={{ __html: data.footerTitle }} />
        </h4>
        <span dangerouslySetInnerHTML={{ __html: data.footer }} />
      </div>
    </div>
  );
}

export default EducatorsContent;
