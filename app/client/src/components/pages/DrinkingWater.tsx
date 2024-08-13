/** @jsxImportSource @emotion/react */

import { css } from '@emotion/react';
import { Link } from 'react-router-dom';
// components
import Page from 'components/shared/Page';
import NavBar from 'components/shared/NavBar';
import LocationSearch from 'components/shared/LocationSearch';
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

const threeTopicButtonLinkStyles = css`
  ${topicButtonLinkStyles}
  ${threeButtonLinkStyles}
`;

function DrinkingWater() {
  return (
    <Page>
      <NavBar title="Explore Topics" />

      <div css={topicTitleStyles}>
        <DrinkingWaterIcon />
        <h3>Drinking Water</h3>
      </div>

      <div className="container" css={searchTitleStyles}>
        <LocationSearch
          route="/community/{urlSearch}/drinking-water"
          label={<em>Find out about your Drinking Water.</em>}
        />

        <br />

        <p>Learn about:</p>

        <ul>
          <li>Who provides drinking water in your community? </li>
          <li>Find out about the compliance of drinking water systems. </li>
          <li>
            Which public drinking water providers are located in your watershed?
          </li>
        </ul>

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
          <Link to="/eating-fish" css={threeTopicButtonLinkStyles}>
            <EatingFishIcon />
            Eating Fish
          </Link>
        </div>
      </div>
    </Page>
  );
}

export default DrinkingWater;
