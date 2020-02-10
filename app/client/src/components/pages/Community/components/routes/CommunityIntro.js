// @flow

import React from 'react';
import styled from 'styled-components';
// components
import type { RouteProps } from 'routes.js';
// styles
import { fonts } from 'styles/index.js';
// images
import overviewIcon from 'components/pages/Community/images/overview.png';
import drinkingWaterIcon from 'components/pages/Community/images/drinking-water.png';
import swimmingIcon from 'components/pages/Community/images/swimming.png';
import fishingIcon from 'components/pages/Community/images/fishing.png';
import monitoringIcon from 'components/pages/Community/images/monitoring.png';
import identifiedIssuesIcon from 'components/pages/Community/images/identified-issues.png';
import restoreIcon from 'components/pages/Community/images/restore.png';
import protectIcon from 'components/pages/Community/images/protect.png';

// --- styled components ---
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  max-height: 100%;
`;

const Text = styled.div`
  padding: 1.25em;

  h2 {
    margin-top: 0.25em;
    margin-bottom: 0;
    font-family: ${fonts.primary};
    text-align: center;
  }
`;

const Topic = styled.div`
  display: flex;
  align-items: center;
  padding: 0.625em 0;
`;

const TopicIcon = styled.div`
  padding-right: 0.75em;

  img,
  svg {
    max-width: 2.75em;
    max-height: 2.75em;
  }
`;

const TopicText = styled.div`
  flex: 1;
`;

type Props = {
  ...RouteProps,
};

// --- components ---
function CommunityIntro({ ...props }: Props) {
  return (
    <Container>
      <Text>
        <h2>Explore Your Water</h2>

        <p>
          Enter a location in the search box to explore waters in your area and
          find out information about the following:
        </p>

        <Topic>
          <TopicIcon>
            <img src={overviewIcon} alt="Overview" />
          </TopicIcon>
          <TopicText>
            <strong>Overview</strong>
          </TopicText>
        </Topic>

        <Topic>
          <TopicIcon>
            <img src={swimmingIcon} alt="Swimming" />
          </TopicIcon>
          <TopicText>
            <strong>Swimming:</strong> &nbsp; EPA, states, and tribes monitor
            and assess water quality to keep you safe while swimming, wading, or
            boating.
          </TopicText>
        </Topic>

        <Topic>
          <TopicIcon>
            <img src={fishingIcon} alt="Eating Fish" />
          </TopicIcon>
          <TopicText>
            <strong>Fish Consumption:</strong> &nbsp; EPA, states, and tribes
            monitor and assess water quality to determine if fish and shellfish
            are safe to eat.
          </TopicText>
        </Topic>

        <Topic>
          <TopicIcon>
            <img src={fishingIcon} alt="Aquatic Life" />
          </TopicIcon>
          <TopicText>
            <strong>Aquatic Life:</strong> &nbsp; EPA, states, and tribes
            monitor and assess water quality to determine the impact of
            impairments on plants and animals living in the water.
          </TopicText>
        </Topic>

        <Topic>
          <TopicIcon>
            <img src={drinkingWaterIcon} alt="Drinking Water" />
          </TopicIcon>
          <TopicText>
            <strong>Drinking Water:</strong> &nbsp; Who provides drinking water
            in your community?
          </TopicText>
        </Topic>

        <Topic>
          <TopicIcon>
            <img src={monitoringIcon} alt="Monitoring" />
          </TopicIcon>
          <TopicText>
            <strong>Monitoring:</strong> &nbsp; View monitoring locations.
          </TopicText>
        </Topic>

        <Topic>
          <TopicIcon>
            <img src={identifiedIssuesIcon} alt="Identified Issues" />
          </TopicIcon>
          <TopicText>
            <strong>Identified Issues:</strong> &nbsp; View identified water
            quality issues.
          </TopicText>
        </Topic>

        <Topic>
          <TopicIcon>
            <img src={restoreIcon} alt="Restore" />
          </TopicIcon>
          <TopicText>
            <strong>Restore:</strong> &nbsp; View EPA funded nonpoint source
            pollution grants and waterbody restoration plans.
          </TopicText>
        </Topic>

        <Topic>
          <TopicIcon>
            <img src={protectIcon} alt="Protect" />
          </TopicIcon>
          <TopicText>
            <strong>Protect:</strong> &nbsp; How can you help?
          </TopicText>
        </Topic>
      </Text>
    </Container>
  );
}

export default CommunityIntro;
