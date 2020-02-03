// @flow

import styled, { css } from 'styled-components';
import { Link } from '@reach/router';
// styles
import { colors } from 'styles/index.js';

// --- styled components ---
const StyledButtons = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
`;

const StyledButtonLink = styled(Link)`
  margin-top: 1em;
  padding: 1em;
  border-radius: 0.25em;
  width: 100%;
  font-size: 1.125em;
  text-align: center;

  &:link,
  &:hover,
  &:focus,
  &:visited {
    text-decoration: none;
  }
`;

const StyledTopicButtonLink = styled(StyledButtonLink)`
  padding-bottom: 1.75em;
  font-weight: bold;
  background-color: #0071bb;

  &:link,
  &:visited {
    color: #fff;
  }

  svg {
    display: block;
    margin: auto;
  }

  &:hover,
  &:focus {
    background-color: ${colors.purple()};
  }
`;

const StyledThreeButtonLinks = css`
  @media (min-width: 35em) {
    width: calc((100% / 3) - 0.75em);
  }

  @media (min-width: 45em) {
    width: calc((100% / 3) - 1.25em);
  }
`;

const StyledTwoButtonLinks = css`
  @media (min-width: 35em) {
    width: calc(50% - 0.75em);
  }

  @media (min-width: 45em) {
    width: calc(50% - 1.25em);
  }
`;

export {
  StyledButtons,
  StyledButtonLink,
  StyledTopicButtonLink,
  StyledThreeButtonLinks,
  StyledTwoButtonLinks,
};
