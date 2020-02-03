// @flow

import React from 'react';
import styled from 'styled-components';
// components
import type { RouteProps } from 'routes.js';
import Page from 'components/shared/Page';
import NavBar from 'components/shared/NavBar';
import LocationSearch from 'components/shared/LocationSearch';
import DrinkingWaterIcon from 'components/shared/Icons/DrinkingWaterIcon';
import SwimmingIcon from 'components/shared/Icons/SwimmingIcon';
import FishingIcon from 'components/shared/Icons/FishingIcon';
// styled components
import { StyledText, StyledTopic } from 'components/shared/Topics';
import {
  StyledButtons,
  StyledTopicButtonLink,
  StyledTwoButtonLinks,
} from 'components/shared/ButtonLinks';

// --- styled components ---
const Prompt = styled.p`
  padding-bottom: 0 !important;
`;

const TopicButtonLink = styled(StyledTopicButtonLink)`
  ${StyledTwoButtonLinks}
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
        <Prompt>
          <em>Find out about your Drinking Water.</em>
        </Prompt>

        <LocationSearch route="/community/{urlSearch}/drinking-water" />

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
          <TopicButtonLink to="/fishing">
            <FishingIcon />
            Fishing
          </TopicButtonLink>
        </StyledButtons>
      </StyledText>
    </Page>
  );
}

export default DrinkingWater;
