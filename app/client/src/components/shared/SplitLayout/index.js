// @flow

import styled from 'styled-components';

const StyledContainer = styled.div`
  /* match homepage max-width */
  margin: auto;
  max-width: 1164px;
`;

const StyledColumns = styled.div`
  display: flex;
  flex-flow: row wrap;
  padding: 0.75em;
`;

const StyledColumn = styled.div`
  padding: 0.75em;
  width: 100%;

  @media (min-width: 960px) {
    width: 50%;
  }
`;

export { StyledContainer, StyledColumns, StyledColumn };
