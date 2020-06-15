// flow

import React from 'react';
import styled from 'styled-components';
// components
import type { RouteProps } from 'routes.js';
// styled components
import {
  StyledIntroBox,
  StyledIntroHeading,
  StyledIntroText,
} from 'components/shared/IntroBox';

// --- styled components ---
const Header = styled.header`
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

// --- components ---
type Props = {
  ...RouteProps,
};

function StateIntro({ ...props }: Props) {
  return (
    <>
      <StyledIntroBox>
        <Header>
          <i className="fas fa-tint" aria-hidden="true" />
          <StyledIntroHeading>
            States Play a Primary Role in Protecting Water Quality
          </StyledIntroHeading>
        </Header>
        <StyledIntroText>
          States have primary responsibility to implement the Clean Water Act to
          protect waters in their state. This includes setting standards,
          monitoring and assessing water quality, and developing goals to
          safeguard and restore those water resources.
        </StyledIntroText>
        <br />
        <StyledIntroText>
          The Safe Drinking Water Act (SDWA) requires EPA to establish and
          enforce standards that public drinking water systems must follow. EPA
          delegates primary enforcement responsibility (also called primacy) for
          public water systems to states and Indian Tribes if they meet certain
          requirements.
        </StyledIntroText>
      </StyledIntroBox>
    </>
  );
}

export default StateIntro;
