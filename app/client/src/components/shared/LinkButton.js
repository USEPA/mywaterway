// @flow

import { css } from '@emotion/react';

const linkButtonStyles = css`
  display: inline;
  margin: 0;
  padding: 0;
  border: none;
  font-size: 87.5%;
  text-decoration: none;
  color: #0071bc;
  background-color: transparent;
  cursor: pointer;

  &:hover,
  &:focus {
    background-color: inherit !important;
    color: inherit !important;
    text-decoration: underline;
  }
`;

export { linkButtonStyles };
