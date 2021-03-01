// @flow

import styled from 'styled-components';

const LinkButton = styled.button`
  display: inline;
  margin-bottom: 0;
  margin-left: 0.25rem;
  padding: 0;
  border: none;
  font-size: 87.5%;
  text-decoration: underline;
  color: #0071bc;
  background-color: transparent;
  cursor: pointer;

  &:hover,
  &:focus {
    text-decoration: none;
    color: #4c2c92;
  }
`;

export { LinkButton };
