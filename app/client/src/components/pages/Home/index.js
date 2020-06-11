// @flow

import React from 'react';
import styled from 'styled-components';
// components
import type { RouteProps } from 'routes.js';
import Page from 'components/shared/Page';
import LocationSearch from 'components/shared/LocationSearch';
import DrinkingWaterIcon from 'components/shared/Icons/DrinkingWaterIcon';
import SwimmingIcon from 'components/shared/Icons/SwimmingIcon';
import EatingFishIcon from 'components/shared/Icons/EatingFishIcon';
import AquaticLifeIcon from 'components/shared/Icons/AquaticLifeIcon';
import DisclaimerModal from 'components/shared/DisclaimerModal';
// styled components
import {
  StyledButtons,
  StyledButtonLink,
  StyledTopicButtonLink,
  StyledThreeButtonLinks,
  StyledFourButtonLinks,
} from 'components/shared/ButtonLinks';
// styles
import { colors } from 'styles/index.js';

// --- styled components ---
const Container = styled.div`
  margin-bottom: 2.5em;
`;

const SearchBox = styled.div`
  margin-top: 2em;
`;

const BaseHeaderStyles = `
  margin: 0;
  padding: 0;
  font-family: inherit;
  font-size: 1.1875em;
  font-weight: bold;
  line-height: 19px;
`;

const SearchLabel = styled.h1`
  ${BaseHeaderStyles}
`;

const Header = styled.h1`
  ${BaseHeaderStyles}
  margin-top: 2em;
`;

const TopicButtonLink = styled(StyledTopicButtonLink)`
  ${StyledFourButtonLinks}
`;

const PlaceButtonLink = styled(StyledButtonLink)`
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

  ${StyledThreeButtonLinks}
`;

const Disclaimer = styled(DisclaimerModal)`
  margin-top: 2rem;
`;

// --- components ---
type Props = {
  ...RouteProps,
};

function Home({ ...props }: Props) {
  return (
    <Page>
      <Container className="container">
        <SearchBox>
          <LocationSearch
            route="/community/{urlSearch}/overview"
            label={<SearchLabel>Let’s get started!</SearchLabel>}
          />
        </SearchBox>

        <Header>Choose a place to learn about your waters:</Header>

        <StyledButtons>
          <PlaceButtonLink to="/community">Community</PlaceButtonLink>
          <PlaceButtonLink to="/state">State</PlaceButtonLink>
          <PlaceButtonLink to="/national">National</PlaceButtonLink>
        </StyledButtons>

        <Header>Explore Topics:</Header>

        <StyledButtons>
          <TopicButtonLink to="/swimming">
            <SwimmingIcon />
            Swimming
          </TopicButtonLink>
          <TopicButtonLink to="/eating-fish">
            <EatingFishIcon />
            Eating Fish
          </TopicButtonLink>
          <TopicButtonLink to="/aquatic-life">
            <AquaticLifeIcon />
            Aquatic Life
          </TopicButtonLink>
          <TopicButtonLink to="/drinking-water">
            <DrinkingWaterIcon />
            Drinking Water
          </TopicButtonLink>
        </StyledButtons>

        <Disclaimer>
          <p>
            <strong>Disclaimer:</strong> EPA has posted information through this
            application as a convenience to the application’s users. Although
            EPA has made every effort to ensure the accuracy of the information
            posted through this application, users of this application should
            not rely on information relating to environmental laws and
            regulations posted on this application. Application users are solely
            responsible for ensuring that they are in compliance with all
            relevant environmental laws and regulations. In addition, EPA cannot
            attest to the accuracy of data provided by organizations outside of
            the federal government.
          </p>
        </Disclaimer>
      </Container>
    </Page>
  );
}

export default Home;
