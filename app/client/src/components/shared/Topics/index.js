// @flow

import styled from 'styled-components';

// --- styled components ---
const StyledText = styled.div`
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

const StyledTopic = styled.div`
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

export { StyledText, StyledTopic };
