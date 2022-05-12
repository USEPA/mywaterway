// @flow

import React from 'react';
import { css } from 'styled-components/macro';
// components
import EducatorsContent from 'components/shared/EducatorsContent';
import NavBar from 'components/shared/NavBar';
import Page from 'components/shared/Page';
// styles
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
    margin-top: 1rem;
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

function Educators() {
  return (
    <Page>
      <NavBar title="Educators" />
      <div css={containerStyles} className="container">
        <EducatorsContent />
      </div>
    </Page>
  );
}

export default Educators;
