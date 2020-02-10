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
  StyledTwoButtonLinks,
} from 'components/shared/ButtonLinks';

// --- styled components ---
const Disclaimer = styled(DisclaimerModal)`
  bottom: 1.25rem;
`;

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

function Swimming({ ...props }: Props) {
  return (
    <Page>
      <NavBar title="Explore Topics" />

      <StyledTopic>
        <SwimmingIcon />
        <p>Swimming</p>
      </StyledTopic>

      <StyledText className="container">
        <Prompt>
          <em>Find out more about water you may potentially swim in.</em>
        </Prompt>

        <LocationSearch route="/community/{urlSearch}/swimming" />

        <br />

        <p>
          Learn whether your local waters have been deemed safe for swimming and
          other recreational activities. Find out about what impairments exist
          in your local waterbodies.
          <ShowLessMore
            text={`
            Water quality can change on very short notice. When deciding if it is
            safe to swim in a water body, refer to any local or state advisories.
            If available, refer to local or state real-time water quality reports.`}
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
          <TopicButtonLink to="/eating-fish">
            <FishingIcon />
            Fishing
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

export default Swimming;
