// @flow

import { css } from 'styled-components/macro';

const boxStyles = css`
  padding: 0.5em 0.75em !important;
  border-width: 1px;
  border-style: solid;
  border-radius: 0.25em;

  p {
    margin-top: 0.75em;
    padding-bottom: 0;

    :first-of-type {
      margin-top: 0;
    }
  }
`;

const textBoxStyles = css`
  ${boxStyles};
  border-color: #ded9d9;
  color: #444;
  background-color: #f9f9f9;
`;

const infoBoxStyles = css`
  ${boxStyles};
  border-color: #bee5eb;
  color: #0c5460;
  background-color: #d1ecf1;
`;

const successBoxStyles = css`
  ${boxStyles};
  border-color: #c3e6cb;
  color: #155724;
  background-color: #d4edda;
`;

const errorBoxStyles = css`
  ${boxStyles};
  border-color: #f5c6cb;
  color: #721c24;
  background-color: #f8d7da;
`;

const noteBoxStyles = css`
  ${boxStyles};
  border-color: #d8dfe2;
  color: #444;
  background-color: #f0f6f9;
`;

export {
  textBoxStyles,
  infoBoxStyles,
  successBoxStyles,
  errorBoxStyles,
  noteBoxStyles,
};
