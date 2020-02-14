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
import DisclaimerModal from 'components/shared/DisclaimerModal';
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

function AquaticLife({ ...props }: Props) {
  return (
    <Page>
      <NavBar title="Explore Topics" />

      <StyledTopic>
        <AquaticLifeIcon />
        <p>Aquatic Life</p>
      </StyledTopic>

      <StyledText className="container">
        <Prompt>
          <em>Find out more about your aquatic life.</em>
        </Prompt>

        <LocationSearch route="/community/{urlSearch}/aquatic-life" />

        <br />

        <p>
          Find out more about the overall status of aquatic life and what
          impairments exist in your local waterbodies.
        </p>
        <p>
          The condition of a waterbody is dynamic and can change at any time,
          and the information in How’s My Waterway should only be used for
          general reference. If available, refer to local or state real-time
          water quality reports.
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
          <TopicButtonLink to="/eating-fish">
            <EatingFishIcon />
            Eating Fish
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

export default AquaticLife;
