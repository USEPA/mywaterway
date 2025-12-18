import { colors } from 'styles/index';
import { css } from '@emotion/react';

const linkButtonStyles = css`
  display: inline-flex;
  gap: 4px;
  align-items: center;
  margin: 0;
  padding: 0;
  border: none;
  font-size: 87.5%;
  text-decoration: underline;
  color: #0071bc;
  background-color: transparent;
  cursor: pointer;

  &:hover,
  &:focus {
    background-color: inherit !important;
    color: ${colors.navyBlue()} !important;
    text-decoration: underline;
  }
`;

export { linkButtonStyles };
