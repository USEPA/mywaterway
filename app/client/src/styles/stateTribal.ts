import { css } from '@emotion/react';
import { fonts } from 'styles';

export const h2Styles = css`
  margin-top: 0.75rem;
  font-family: ${fonts.primary};
  font-size: 1.625em;
  font-weight: normal;

  i {
    margin-right: 0.3125em;
    color: #2c72b5;
  }
`;

export const h3Styles = css`
  font-family: ${fonts.primary};
  font-size: 1.375em;
  font-weight: normal;
`;

export const h4Styles = css`
  margin-bottom: 0.75rem;
  padding-bottom: 0;
  font-size: 1.125em;
  color: #526571;
  font-family: ${fonts.primary};
`;
