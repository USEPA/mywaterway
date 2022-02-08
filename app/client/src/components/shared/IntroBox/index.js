// @flow

import styled, { css } from 'styled-components';
// styles
import { fonts } from 'styles/index.js';

const StyledIntroBox = styled.div`
  background-color: whitesmoke;
  padding: 2rem;
`;

const StyledIntroHeading = styled.h2`
  text-align: center;
  font-family: ${fonts.primary};
`;

const StyledIntroText = styled.p`
  padding-bottom: 0;
  font-size: 1.25rem;
  font-weight: 300;
  line-height: 1.5;
`;

const introBoxStyles = css`
  background-color: whitesmoke;

  h2 {
    padding-bottom: 0;
    font-family: ${fonts.primary};
    text-align: center;
  }

  p {
    margin-top: 1rem;
    padding-bottom: 0;
    font-weight: 300;
    font-size: 1.25rem;
    line-height: 1.375;
  }
`;

export {
  StyledIntroBox, // TODO: remove
  StyledIntroHeading, // TODO: remove
  StyledIntroText, // TODO: remove
  introBoxStyles,
};
