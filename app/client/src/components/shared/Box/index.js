// @flow

import styled, { css } from 'styled-components';
// styles
import { fonts } from 'styles/index.js';

const StyledBox = styled.div`
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

  h3,
  h4 {
    margin-top: 0;
    margin-bottom: 0.375rem;
    padding-bottom: 0;
    font-family: ${fonts.primary};
    font-size: 1rem;

    + p {
      margin-top: 0;
    }
  }

  h3 {
    font-weight: bold;
  }

  h4 {
    color: #526571;
  }
`;

const StyledBoxHeading = styled.h2`
  margin-bottom: 0.4375rem;
  padding: 0.4375rem 0.875rem;
  border-bottom: 1px solid #aebac3;
  font-family: ${fonts.primary};
  font-size: 1.125rem;
  font-weight: bold;
  color: #526571;
  background-color: whitesmoke;
`;

const StyledBoxSection = styled.div`
  padding: 0.4375rem 0.875rem;
`;

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

  h3,
  h4 {
    margin-top: 0;
    margin-bottom: 0.375rem;
    padding-bottom: 0;
    font-family: ${fonts.primary};
    font-size: 1rem;

    + p {
      margin-top: 0;
    }
  }

  h3 {
    font-weight: bold;
  }

  h4 {
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

export {
  StyledBox, // TODO: remove
  StyledBoxHeading, // TODO: remove
  StyledBoxSection, // TODO: remove
  boxStyles,
  boxHeadingStyles,
  boxSectionStyles,
};
