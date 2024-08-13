import { css } from '@emotion/react';
// styles
import { colors } from '@/styles/index';

const topicButtonContainer = css`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
`;

const buttonLinkStyles = css`
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

const topicButtonLinkStyles = css`
  ${buttonLinkStyles}
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
    background-color: ${colors.navyBlue()};
  }
`;

const fourButtonLinkStyles = css`
  @media (min-width: 35em) {
    width: calc(25% - 0.75em);
  }

  @media (min-width: 45em) {
    width: calc(25% - 1.25em);
  }
`;

const threeButtonLinkStyles = css`
  @media (min-width: 35em) {
    width: calc((100% / 3) - 0.75em);
  }

  @media (min-width: 45em) {
    width: calc((100% / 3) - 1.25em);
  }
`;

const twoButtonLinkStyles = css`
  @media (min-width: 35em) {
    width: calc(50% - 0.75em);
  }

  @media (min-width: 45em) {
    width: calc(50% - 1.25em);
  }
`;

export {
  topicButtonContainer,
  buttonLinkStyles,
  topicButtonLinkStyles,
  fourButtonLinkStyles,
  threeButtonLinkStyles,
  twoButtonLinkStyles,
};
