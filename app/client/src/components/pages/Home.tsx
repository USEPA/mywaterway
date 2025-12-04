/** @jsxImportSource @emotion/react */

import { css } from '@emotion/react';
import { Link } from 'react-router';
// components
import Page from 'components/shared/Page';
import LocationSearch from 'components/shared/LocationSearch';
import {
  AquaticLifeIcon,
  DrinkingWaterIcon,
  EatingFishIcon,
  SwimmingIcon,
} from 'components/shared/Icons';
import { DisclaimerModal } from 'components/shared/Modal';
// styled components
import {
  topicButtonContainer,
  buttonLinkStyles,
  topicButtonLinkStyles,
  threeButtonLinkStyles,
  fourButtonLinkStyles,
} from 'components/shared/ButtonLinks';
// styles
import { colors } from 'styles/index';

const containerStyles = css`
  margin-bottom: 2.5em;
`;

const searchBoxStyles = css`
  margin-top: 2em;
`;

const baseHeaderStyles = `
  margin: 0;
  padding: 0;
  font-family: inherit;
  font-size: 1.1875em;
  font-weight: bold;
  line-height: 19px;
`;

const searchLabelStyles = css`
  ${baseHeaderStyles}
`;

const headerStyles = css`
  ${baseHeaderStyles}
  margin-top: 2em;
`;

const fourTopicButtonLinkStyles = css`
  ${topicButtonLinkStyles}
  ${fourButtonLinkStyles}
`;

const placeButtonLinkStyles = css`
  ${buttonLinkStyles}
  padding-bottom: 1.25em;
  border-top-width: 0.5em;
  border-top-style: solid;
  border-top-color: ${colors.teal()};
  background-color: ${colors.graye};
  box-shadow: 1px 0 8px 2px ${colors.black(0.1875)};

  &:hover,
  &:focus {
    background-color: white;
  }

  &:link,
  &:visited {
    color: #222;
  }

  @media (min-width: 35em) {
    font-size: 1.25em;
  }

  ${threeButtonLinkStyles}
`;

const disclaimerStyles = css`
  margin-top: 2rem;
`;

function Home() {
  return (
    <Page>
      <div className="container" css={containerStyles}>
        <div css={searchBoxStyles}>
          <LocationSearch
            route="/community/{urlSearch}/overview"
            label={<h2 css={searchLabelStyles}>Let’s get started!</h2>}
          />
        </div>

        <h2 css={headerStyles}>Choose a place to learn about your waters:</h2>

        <div css={topicButtonContainer}>
          <Link to="/community" css={placeButtonLinkStyles}>
            Community
          </Link>
          <Link to="/state-and-tribal" css={placeButtonLinkStyles}>
            State & Tribal
          </Link>
          <Link to="/national" css={placeButtonLinkStyles}>
            National
          </Link>
        </div>

        <h2 css={headerStyles}>Explore Topics:</h2>

        <div css={topicButtonContainer}>
          <Link to="/swimming" css={fourTopicButtonLinkStyles}>
            <SwimmingIcon />
            Swimming
          </Link>
          <Link to="/eating-fish" css={fourTopicButtonLinkStyles}>
            <EatingFishIcon />
            Eating Fish
          </Link>
          <Link to="/aquatic-life" css={fourTopicButtonLinkStyles}>
            <AquaticLifeIcon />
            Aquatic Life
          </Link>
          <Link to="/drinking-water" css={fourTopicButtonLinkStyles}>
            <DrinkingWaterIcon />
            Drinking Water
          </Link>
        </div>

        <DisclaimerModal buttonStyles={disclaimerStyles} disclaimerKey="home" />
      </div>
    </Page>
  );
}

export default Home;
