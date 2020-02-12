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
import DisclaimerModal from 'components/shared/DisclaimerModal';
import ShowLessMore from 'components/shared/ShowLessMore';
// styled components
import { StyledText, StyledTopic } from 'components/shared/Topics';
import {
  StyledButtons,
  StyledTopicButtonLink,
  StyledThreeButtonLinks,
} from 'components/shared/ButtonLinks';

// --- styled components ---
const Disclaimer = styled(DisclaimerModal)`
  bottom: 1.25rem;
`;

const Prompt = styled.p`
  padding-bottom: 0 !important;
`;

const TopicButtonLink = styled(StyledTopicButtonLink)`
  ${StyledThreeButtonLinks}
`;

// --- components ---
type Props = {
  ...RouteProps,
};

function EatingFish({ ...props }: Props) {
  return (
    <Page>
      <NavBar title="Explore Topics" />

      <StyledTopic>
        <FishingIcon />
        <p>Eating Fish</p>
      </StyledTopic>

      <StyledText className="container">
        <Prompt>
          <em>Find out more about your fish.</em>
        </Prompt>

        <LocationSearch route="/community/{urlSearch}/eating-fish" />

        <br />

        <p>
          Learn whether fish caught in your local waters are deemed safe to eat.
          <ShowLessMore
            text={`
            The information in How’s My Waterway about the safety of eating
            fish caught recreationally should only be considered as general
            reference. Please consult with your state for local or state-wide
            fish advisories.`}
            charLimit={0}
          />
        </p>

        <Disclaimer>
          <p>
            Users of this application should not rely on information relating to
            environmental laws and regulations posted on this application.
            Application users are solely responsible for ensuring that they are
            in compliance with all relevant environmental laws and regulations.
            In addition, EPA cannot attest to the accuracy of data provided by
            organizations outside of the federal government.
          </p>
        </Disclaimer>

        <hr />

        <h2>Other Topics</h2>

        <StyledButtons>
          <TopicButtonLink to="/swimming">
            <SwimmingIcon />
            Swimming
          </TopicButtonLink>
          <TopicButtonLink to="/aquatic-life">
            <FishingIcon />
            Aquatic Life
          </TopicButtonLink>
          <TopicButtonLink to="/drinking-water">
            <DrinkingWaterIcon />
            Drinking Water
          </TopicButtonLink>
        </StyledButtons>
      </StyledText>
    </Page>
  );
}

export default EatingFish;
