// flow

import React from 'react';
import { css } from 'styled-components/macro';
// styled components
import {
  introBoxStyles,
  introHeadingStyles,
  introTextStyles,
} from 'components/shared/IntroBox';

const headerStyles = css`
  display: flex;
  flex-flow: row wrap;
  align-items: center;
  justify-content: center;
  margin-top: 0.5em;
  margin-bottom: 1em;
  background-color: transparent;

  h2 {
    margin: 0;
    padding: 0;
  }

  i {
    margin-right: 0.3125em;
    font-size: 1.625em;
    color: #2c72b5;
  }
`;

function StateTribalIntro() {
  return (
    <>
      <div css={introBoxStyles}>
        <header css={headerStyles}>
          <i className="fas fa-tint" aria-hidden="true" />
          <h2 css={introHeadingStyles}>
            States and Tribes Play a Primary Role in Protecting Water Quality
          </h2>
        </header>
        <p css={introTextStyles}>
          States have primary responsibility to implement the Clean Water Act to
          protect waters in their state and Native American Tribes and Nations
          have the opportunity to take on Clean Water Act authority for their
          tribal lands. This includes setting standards, monitoring and
          assessing water quality, and developing goals to safeguard and restore
          those water resources.
        </p>
        <br />
        <p css={introTextStyles}>
          The Safe Drinking Water Act (SDWA) requires EPA to establish and
          enforce standards that public drinking water systems must follow. EPA
          delegates primary enforcement responsibility (also called primacy) for
          public water systems to states and Tribes if they meet certain
          requirements. The information shown on the tribal pages is inclusive
          of assessments performed against tribal thresholds, tribally adopted
          water quality standards, and EPA approved water quality standards.
        </p>
      </div>
    </>
  );
}

export default StateTribalIntro;
