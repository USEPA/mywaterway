// @flow

import styled from 'styled-components';

const LinkButton = styled.button`
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
    text-decoration: underline;
    color: #4c2c92;
  }
`;

export { LinkButton };
