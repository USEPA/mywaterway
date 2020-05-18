// @flow

import React from 'react';
import styled from 'styled-components';
// components
import type { RouteProps } from 'routes.js';
import Page from 'components/shared/Page';
import NavBar from 'components/shared/NavBar';
import LocationSearch from 'components/shared/LocationSearch';
import SwimmingIcon from 'components/shared/Icons/SwimmingIcon';
import EatingFishIcon from 'components/shared/Icons/EatingFishIcon';
import AquaticLifeIcon from 'components/shared/Icons/AquaticLifeIcon';
import DrinkingWaterIcon from 'components/shared/Icons/DrinkingWaterIcon';
// styled components
import { StyledText, StyledTopic } from 'components/shared/Topics';
import {
  StyledButtons,
  StyledTopicButtonLink,
  StyledThreeButtonLinks,
} from 'components/shared/ButtonLinks';

// --- styled components ---
const TopicButtonLink = styled(StyledTopicButtonLink)`
  ${StyledThreeButtonLinks}
`;

// --- components ---
type Props = {
  ...RouteProps,
};

function DrinkingWater({ ...props }: Props) {
  return (
    <Page>
      <NavBar title="Explore Topics" />

      <StyledTopic>
        <DrinkingWaterIcon />
        <p>Drinking Water</p>
      </StyledTopic>

      <StyledText className="container">
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

        <StyledButtons>
          <TopicButtonLink to="/swimming">
            <SwimmingIcon />
            Swimming
          </TopicButtonLink>
          <TopicButtonLink to="/aquatic-life">
            <AquaticLifeIcon />
            Aquatic Life
          </TopicButtonLink>
          <TopicButtonLink to="/eating-fish">
            <EatingFishIcon />
            Eating Fish
          </TopicButtonLink>
        </StyledButtons>
      </StyledText>
    </Page>
  );
}

export default DrinkingWater;
