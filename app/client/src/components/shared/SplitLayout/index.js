// @flow

import styled, { css } from 'styled-components';

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

const splitLayoutContainerStyles = css`
  /* match homepage max-width */
  margin: auto;
  max-width: 1164px;
`;

const splitLayoutColumnsStyles = css`
  display: flex;
  flex-flow: row wrap;
  padding: 0.75em;
`;

const splitLayoutColumnStyles = css`
  padding: 0.75em;
  width: 100%;

  @media (min-width: 960px) {
    width: 50%;
  }
`;

export {
  StyledContainer, // TODO: remove
  StyledColumns, // TODO: remove
  StyledColumn, // TODO: remove
  splitLayoutContainerStyles,
  splitLayoutColumnsStyles,
  splitLayoutColumnStyles,
};
