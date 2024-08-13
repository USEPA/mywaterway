import { css } from '@emotion/react';

const splitLayoutContainerStyles = css`
  /* match homepage max-width */
  margin: auto;
  max-width: 1164px;
`;

const splitLayoutColumnsStyles = css`
  display: flex;
  flex-flow: row wrap;
  padding: 0.75em;
`;

const splitLayoutColumnStyles = css`
  padding: 0.75em;
  width: 100%;

  @media (min-width: 960px) {
    width: 50%;
  }
`;

export {
  splitLayoutContainerStyles,
  splitLayoutColumnsStyles,
  splitLayoutColumnStyles,
};
