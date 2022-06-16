// @flow

import { css } from 'styled-components/macro';
// styles
import { fonts } from 'styles/index.js';

const introBoxStyles = css`
  padding: 1.5rem;
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

const introHeadingStyles = css`
  text-align: center;
  font-family: ${fonts.primary};
`;

const introTextStyles = css`
  padding-bottom: 0;
  font-size: 1.25rem;
  font-weight: 300;
  line-height: 1.5;
`;

export { introBoxStyles, introHeadingStyles, introTextStyles };
