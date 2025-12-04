/** @jsxImportSource @emotion/react */

import { css } from '@emotion/react';
import { Link } from 'react-router';
// components
import Page from 'components/shared/Page';
import NavBar from 'components/shared/NavBar';
import LocationSearch from 'components/shared/LocationSearch';
import { DisclaimerModal } from 'components/shared/Modal';
import {
  AquaticLifeIcon,
  DrinkingWaterIcon,
  EatingFishIcon,
  SwimmingIcon,
} from 'components/shared/Icons';
// styled components
import { searchTitleStyles, topicTitleStyles } from 'components/shared/Topics';
import {
  topicButtonContainer,
  topicButtonLinkStyles,
  threeButtonLinkStyles,
} from 'components/shared/ButtonLinks';

const disclaimerStyles = css`
  bottom: 1.25rem;
`;

const threeTopicButtonLinkStyles = css`
  ${topicButtonLinkStyles}
  ${threeButtonLinkStyles}
`;

function EatingFish() {
  return (
    <Page>
      <NavBar title="Explore Topics" />

      <div css={topicTitleStyles}>
        <EatingFishIcon />
        <h3>Eating Fish</h3>
      </div>

      <div className="container" css={searchTitleStyles}>
        <LocationSearch
          route="/community/{urlSearch}/eating-fish"
          label={<em>Find out more about your fish.</em>}
        />
        <br />
        <p>
          Learn whether fish caught in your local waters are deemed safe to eat.
          The information in How’s My Waterway about the safety of eating fish
          caught recreationally should only be considered as general reference.
          Please consult with your state for local or state-wide fish
          advisories.
        </p>
        <DisclaimerModal
          disclaimerKey="eatingFish"
          buttonStyles={disclaimerStyles}
        />

        <hr />

        <h3>Other Topics</h3>

        <div css={topicButtonContainer}>
          <Link to="/swimming" css={threeTopicButtonLinkStyles}>
            <SwimmingIcon />
            Swimming
          </Link>
          <Link to="/aquatic-life" css={threeTopicButtonLinkStyles}>
            <AquaticLifeIcon />
            Aquatic Life
          </Link>
          <Link to="/drinking-water" css={threeTopicButtonLinkStyles}>
            <DrinkingWaterIcon />
            Drinking Water
          </Link>
        </div>
      </div>
    </Page>
  );
}

export default EatingFish;
