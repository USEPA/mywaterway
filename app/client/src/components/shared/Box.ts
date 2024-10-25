import { css } from '@emotion/react';
// styles
import { fonts } from 'styles/index';

const boxStyles = css`
  margin-bottom: 1.5em;
  padding-bottom: 0.4375rem;
  border: 1px solid #aebac3;

  p {
    margin-top: 1rem;
    padding-bottom: 0;
  }

  p,
  li {
    font-size: 0.875rem;
    line-height: 1.375;
  }

  h4,
  h5 {
    margin-top: 0;
    margin-bottom: 0.375rem;
    padding-bottom: 0;
    font-family: ${fonts.primary};
    font-size: 1rem;

    + p {
      margin-top: 0;
    }
  }

  h4 {
    font-weight: bold;
  }

  h5 {
    color: #526571;
  }
`;

const boxHeadingStyles = css`
  margin-bottom: 0.4375rem;
  padding: 0.4375rem 0.875rem;
  border-bottom: 1px solid #aebac3;
  font-family: ${fonts.primary};
  font-size: 1.125rem;
  font-weight: bold;
  color: #526571;
  background-color: whitesmoke;
`;

const boxSectionStyles = css`
  padding: 0.4375rem 0.875rem;
`;

export { boxStyles, boxHeadingStyles, boxSectionStyles };
