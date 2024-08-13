import { css } from '@emotion/react';
import { fonts } from 'styles';

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

  h3 {
    margin-bottom: 0;
    padding: 0.5rem 0;
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

  h3 {
    padding-bottom: 0.5em;
    font-family: ${fonts.primary};
    font-size: 1.125em;
    padding-bottom: 0;

    @media (min-width: 24em) {
      font-size: 1.375em;
    }

    @media (min-width: 48em) {
      font-size: 1.875em;
    }
  }
`;

export { searchTitleStyles, topicTitleStyles };
