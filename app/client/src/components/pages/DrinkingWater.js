// @flow

import React from 'react';
import { css } from 'styled-components/macro';
import { Link } from '@reach/router';
// components
import type { RouteProps } from 'routes.js';
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

// --- components ---
type Props = {
  ...RouteProps,
};

function DrinkingWater({ ...props }: Props) {
  return (
    <Page>
      <NavBar title="Explore Topics" />

      <div css={topicTitleStyles}>
        <DrinkingWaterIcon />
        <p>Drinking Water</p>
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

        <h2>Other Topics</h2>

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
