// @flow

import { css } from '@emotion/react';

const searchTitleStyles = css`
  padding: 1rem;
  line-height: 1.375;

  p {
    padding-bottom: 1.25em;
  }

  ul,
  ol {
    padding-bottom: 0.75em;
  }

  li {
    padding-bottom: 0.5em;
  }

  h2 {
    margin-bottom: 0;
    padding-top: 0.5rem;
    font-size: 1.5rem;
  }

  @media (min-width: 30em) {
    padding: 2rem;
  }
`;

const topicTitleStyles = css`
  padding: 1em;
  text-align: center;
  color: #fff;
  background-color: #0070ba;

  p {
    padding-bottom: 0.5em;
    font-size: 1.125em;

    @media (min-width: 24em) {
      font-size: 1.375em;
    }

    @media (min-width: 48em) {
      font-size: 1.875em;
    }
  }
`;

export { searchTitleStyles, topicTitleStyles };
