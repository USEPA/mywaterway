// @flow

import React from 'react';
import styled from 'styled-components';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
// components
import type { RouteProps } from 'routes.js';
import Page from 'components/shared/Page';
import TabLinks from 'components/shared/TabLinks';
import { ContentTabs } from 'components/shared/ContentTabs';
import { AccordionList, AccordionItem } from 'components/shared/Accordion';
import WaterSystemSummary from 'components/shared/WaterSystemSummary';
import DisclaimerModal from 'components/shared/DisclaimerModal';
// styled components
import {
  StyledIntroBox,
  StyledIntroHeading,
  StyledIntroText,
} from 'components/shared/IntroBox';
import { LargeTab } from 'components/shared/ContentTabs/LargeTab.js';
// styles
import { colors, fonts } from 'styles/index.js';
// images
import nutrientPollutionPhoto from './images/national-nutrient-pollution.jpg';
import riversPhoto from './images/learn-more-rivers.jpg';
import lakesPhoto from './images/learn-more-lakes.jpg';
import coastsPhoto from './images/learn-more-coasts.jpg';
import wetlandsPhoto from './images/learn-more-wetlands.jpg';
import drinkingWaterIcon from 'components/pages/Community/images/drinking-water.png';

// --- styled components ---
const Container = styled.div`
  margin: auto;
  padding: 1rem;
  max-width: 58rem;
`;

const StyledTabs = styled(Tabs)`
  [data-reach-tab] {
    padding: 0.875em;
  }

  [data-reach-tab-panel] {
    padding: 1.5em;

    p {
      margin-top: 1rem;
      padding-bottom: 0;
      line-height: 1.375;

      :first-of-type {
        margin-top: 0;
      }
    }

    ul {
      padding-bottom: 0;
    }

    li {
      line-height: 1.375;
    }

    h3 {
      margin: 1.5rem 0 0.625rem;
      padding-bottom: 0;
      font-family: ${fonts.primary};
      font-size: 1.375em;

      & + p {
        margin-top: 0;
      }
    }
  }

  /* sub tabs */
  [data-reach-tabs] {
    margin-bottom: 0.5rem;
  }
`;

const IntroBox = styled(StyledIntroBox)`
  margin-top: -1.5em;
  margin-left: -1.5em;
  padding: 1.5rem;
  border-bottom: 1px solid #d8dfe2;
  width: calc(100% + 3em);
`;

const AltBox = styled(IntroBox)`
  margin-top: 0;
  border-top: 1px solid #d8dfe2;

  h3 {
    margin-top: 0 !important;
  }
`;

const AccordionContent = styled.div`
  padding: 0.875em;
`;

const FooterText = styled.small`
  display: block;
  margin-top: 1em;
  font-style: italic;
`;

const Article = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;

  p {
    width: 100%;

    @media (min-width: 30em) {
      width: calc(50% - 0.5rem);
    }

    @media (min-width: 40em) {
      width: calc(75% - 0.5rem);
    }
  }

  a {
    margin-top: 1rem;
    width: 100%;

    @media (min-width: 30em) {
      margin-top: 0;
      width: calc(50% - 0.5rem);
    }

    @media (min-width: 40em) {
      width: calc(25% - 0.5rem);
    }
  }
`;

const Links = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;

  a {
    margin-top: 1rem;
    width: 100%;

    :nth-of-type(1) {
      margin-top: 0;
    }

    @media (min-width: 20em) {
      width: calc(50% - 0.5rem);

      :nth-of-type(2) {
        margin-top: 0;
      }
    }

    @media (min-width: 40em) {
      margin-top: 0;
      width: calc(25% - 0.75rem);
    }
  }
`;

const Figure = styled.figure`
  position: relative;
  border-radius: 0.25rem;
  overflow: hidden;

  img {
    width: 100%;
  }

  figcaption {
    display: block;
    position: absolute;
    bottom: 0;
    padding: 0.25rem;
    width: 100%;
    font-size: 0.8125rem;
    text-align: center;
    background-color: ${colors.black(0.66)};
    color: white;
  }
`;

const Disclaimer = styled(DisclaimerModal)`
  margin-top: 1rem;
`;

const Percent = styled.span`
  display: inline-block;
  margin-right: 0.125em;
  font-size: 1.25em;
  font-weight: bold;
  color: #0071bc;
`;

const Icon = styled.img`
  position: relative;
  bottom: 0.125em;
  left: -0.3125em;
  margin-right: -0.3125em;
  max-width: 1.75em;
  max-height: 1.75em;
`;

const Highlights = styled.div`
  ol {
    list-style: none;
    counter-reset: hmw;
    margin-bottom: 1.5em;
    padding-bottom: 0;
    padding-left: 1.875em;
  }

  li {
    counter-increment: hmw;
    margin-bottom: 0.5em;
  }

  li::before {
    content: counter(hmw);
    position: relative;
    left: -0.5em;
    bottom: 0.0625em;
    display: inline-block;
    margin-left: -1.5em; /* width */
    border-radius: 50%;
    width: 1.5em; /* width */
    height: 1.5em; /* width */
    font-size: 0.875em;
    font-weight: bold;
    line-height: 1.5em; /* width */
    text-align: center;
    color: white;
    background-color: #0071bc;
  }

  @media (min-width: 45em) {
    h3 {
      text-align: center;
    }

    ol {
      display: flex;
      justify-content: space-between;
      margin-top: 1em;
    }

    li {
      width: calc((100% - 6.75em) / 3);
    }
  }
`;

const NewTabDisclaimer = styled.p`
  margin-bottom: 0.5em;
  font-style: italic;
`;

// --- components ---
function WaterConditionsPanel() {
  const narsUrl = 'https://www.epa.gov/national-aquatic-resource-surveys';

  return (
    <>
      <IntroBox>
        <StyledIntroHeading>Explore National Water Quality</StyledIntroHeading>
        <StyledIntroText>
          EPA, states, and tribes survey a representative sample of our nation's
          waters to provide an accurate snapshot of water quality, and track
          changes over time.
        </StyledIntroText>
      </IntroBox>

      <h3>Excess nutrients in waterways continue to be an issue</h3>

      <Article>
        <p>
          <a
            href="https://www.epa.gov/nutrientpollution"
            target="_blank"
            rel="noopener noreferrer"
          >
            Excess Nutrients in Waterways
          </a>{' '}
          (opens new browser tab) is one of America’s most widespread water
          quality issues. While nutrients are important, too much of a good
          thing can become a bad thing. Excess nutrients can lead to excessive
          algae growth, which can use up oxygen that aquatic organisms need to
          survive. Too much algae growth can cause fish to die.{' '}
          <a
            href="https://www.epa.gov/nutrient-policy-data/what-epa-doing-reduce-nutrient-pollution"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more about what EPA is doing to reduce excess nutrients in
            waterways
          </a>{' '}
          (opens new browser tab).
        </p>

        <a
          href="https://www.epa.gov/nutrientpollution"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Figure>
            <img
              src={nutrientPollutionPhoto}
              alt="Map of excess nutrients across the United States"
            />
          </Figure>
        </a>
      </Article>

      <h3>Learn about the health of our waters</h3>

      <ContentTabs>
        <Tabs>
          <TabList>
            <Tab data-testid="hmw-national-rivers-and-streams-tab">
              Rivers and Streams
            </Tab>
            <Tab data-testid="hmw-national-lakes-tab">Lakes</Tab>
            <Tab data-testid="hmw-national-coasts-tab">Coasts</Tab>
            <Tab data-testid="hmw-national-wetlands-tab">Wetlands</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <AccordionList>
                <AccordionItem
                  title={
                    <>
                      <Percent>28%</Percent> of our rivers and streams are
                      healthy based on their biological communities when
                      compared to the best 75% of the least-disturbed river and
                      stream reference sites in the same region
                    </>
                  }
                >
                  <AccordionContent>
                    <p>
                      Biological condition tells us how healthy a waterbody is.
                      A healthy waterbody supports aquatic communities – such as
                      insects, crayfish, snails, and worms – that are sensitive
                      to changes in their environment. Their presence or absence
                      gives us an idea of how healthy or impaired waters are.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem
                  title={
                    <>
                      <Percent>46%</Percent> of our rivers and streams have
                      excess nutrients when compared to the worst 5% of the
                      least-disturbed river and stream reference sites
                    </>
                  }
                >
                  <AccordionContent>
                    <p>
                      Nutrients like nitrogen and phosphorus are important, but
                      too much of a good thing can become a bad thing. Excess
                      nutrients can come from fertilizer, wastewater treatment,
                      atmospheric deposition, animal manure, and urban runoff.
                    </p>
                    <p>
                      Excess nutrients can lead to algal blooms and fish kills,
                      causing a loss of fishing and recreational opportunities.
                      High levels of nutrients can also threaten drinking water.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem
                  title={
                    <>
                      <Percent>56%</Percent> of our rivers and streams have
                      healthy riverside vegetation when compared to the best 75%
                      of the least-disturbed river and stream reference sites
                    </>
                  }
                >
                  <AccordionContent>
                    <p>
                      Healthy rivers and streams have surrounding plants –
                      grasses, shrubs, and trees – that help to absorb rainfall,
                      slow stormwater, and filter runoff. Many actions, such as
                      mowing, paving, farming, and construction can damage
                      riverside vegetation.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </AccordionList>

              <FooterText>
                This data is pulled from the National Aquatic Resource Surveys
                (NARS) and the metrics are only for the conterminous US.
              </FooterText>
            </TabPanel>

            <TabPanel>
              <AccordionList>
                <AccordionItem
                  title={
                    <>
                      <Percent>21%</Percent> of lakes have high levels of algal
                      growth
                    </>
                  }
                >
                  <AccordionContent>
                    <p>
                      Algae and plant productivity can tell us about the health
                      of lakes. Some lakes have too many nutrients, which can
                      lead to excessive plant growth, nuisance algae, murky
                      water, odor, fish kills, and lower levels of dissolved
                      oxygen.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem
                  title={
                    <>
                      <Percent>40%</Percent> of our nation's lakes have excess
                      nutrients when compared to the worst 5% of the
                      least-disturbed lake reference sites in the same region
                    </>
                  }
                >
                  <AccordionContent>
                    <p>
                      Sampling shows that excess nutrients is a widespread
                      problem in America’s lakes. While nutrients are important,
                      too much of a good thing can cause problems. Excess
                      nutrients can lead to excessive algae growth, which can
                      use up oxygen that aquatic organisms need to survive.
                    </p>
                    <p>
                      Too much algae growth can cause fish to die, causing a
                      loss of fishing and recreational opportunities.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem
                  title={
                    <>
                      <Percent>39%</Percent> of our nation's lakes have
                      measurable levels of a cyanotoxin
                    </>
                  }
                >
                  <AccordionContent>
                    <p>
                      Microcystin is a cyanotoxin that is produced by
                      naturally-occurring bacteria in surface waters. While
                      detected at more than 1 in 3 lakes, less than 1 in 100 had
                      levels that could pose risks to people swimming or playing
                      in the water.
                    </p>
                    <p>
                      At high levels, cyanotoxins can present a risk to public
                      drinking water systems and to people, pets, and livestock.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </AccordionList>

              <FooterText>
                This data is pulled from the National Aquatic Resource Surveys
                (NARS) and the metrics are only for the conterminous US.
              </FooterText>
            </TabPanel>

            <TabPanel>
              <AccordionList>
                <AccordionItem
                  title={
                    <>
                      <Percent>56%</Percent> of our coasts are healthy based on
                      their biological communities
                    </>
                  }
                >
                  <AccordionContent>
                    <p>
                      Biological condition tells us how healthy a waterbody is.
                      A healthy waterbody supports aquatic communities – such as
                      worms, snails, and clams – that are sensitive to changes
                      in their environment. Their presence or absence gives us
                      an idea of how healthy or impaired our waters are.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem
                  title={
                    <>
                      <Percent>21%</Percent> of our coasts have excess nutrients
                    </>
                  }
                >
                  <AccordionContent>
                    <p>
                      While nutrients are important, having too many nutrients
                      is bad. Excess nutrients come from farm fertilizer,
                      wastewater treatment, atmospheric deposition, animal
                      manure, and urban runoff, and cause problems for water
                      quality.
                    </p>
                    <p>
                      Excess nutrients can lead to algal blooms and fish kills,
                      leading to a loss of fishing, recreational, and tourism
                      opportunities.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem
                  title={
                    <>
                      <Percent>55%</Percent> of our coasts have good quality
                      sediments
                    </>
                  }
                >
                  <AccordionContent>
                    <p>
                      Many contaminants can accumulate in bottom sediments. When
                      present they can negatively impact organisms living in
                      those sediments. As other creatures eat them, the
                      contaminants can become concentrated throughout the food
                      web, potentially affecting fish, marine mammals, and
                      humans who consume contaminated fish and shellfish.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </AccordionList>

              <FooterText>
                This data is pulled from the National Aquatic Resource Surveys
                (NARS) and the metrics are only for the conterminous US.
              </FooterText>
            </TabPanel>

            <TabPanel>
              <AccordionList>
                <AccordionItem
                  title={
                    <>
                      <Percent>48%</Percent> of our national wetland area is
                      healthy based on their biological communities when
                      compared to the best 75% of the least-disturbed reference
                      sites in wetlands in the same region
                    </>
                  }
                >
                  <AccordionContent>
                    <p>
                      Plants are a major component of wetlands – they provide
                      important habitat and food sources for birds, fish, and
                      other wildlife. Because plants are sensitive to changes in
                      their environment, their presence or absence gives us an
                      idea of how healthy or degraded our wetlands are.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem
                  title={
                    <>
                      <Percent>73%</Percent> of our national wetland area has
                      experienced low or moderate levels of plant loss when
                      compared to the best 75% of the least-disturbed reference
                      sites
                    </>
                  }
                >
                  <AccordionContent>
                    <p>
                      Plant loss, removal, and damage causes physical stress to
                      our wetlands. Removal or loss of plants can come from
                      activities like grazing, mowing, and forest clearing.
                    </p>
                    <p>
                      Wetlands with high levels of plant loss may experience
                      increased amounts of sediment, nutrients, and impairments
                      entering and staying in them.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem
                  title={
                    <>
                      <Percent>73%</Percent> of our national wetland area has
                      experienced low or moderate rates of surface hardening
                      when compared to the best 75% of the least-disturbed
                      reference sites
                    </>
                  }
                >
                  <AccordionContent>
                    <p>
                      Wetlands with high levels of surface hardening (e.g.,
                      pavement, soil compaction) are vulnerable to flooding and
                      erosion, and are twice as likely to have poor biological
                      condition.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </AccordionList>

              <FooterText>
                This data is pulled from the National Aquatic Resource Surveys
                (NARS) and the metrics are only for the conterminous US.
              </FooterText>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </ContentTabs>

      <h3>Learn more about waterbody types</h3>

      <NewTabDisclaimer>
        Links below open in a new browser tab.
      </NewTabDisclaimer>

      <Links>
        <a
          href={`${narsUrl}/national-rivers-and-streams-assessment-2008-2009-results`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Figure>
            <img src={riversPhoto} alt="Learn more about Rivers & Streams" />
            <figcaption>Rivers & Stream</figcaption>
          </Figure>
        </a>

        <a
          href={`${narsUrl}/national-lakes-assessment-2012-key-findings`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Figure>
            <img src={lakesPhoto} alt="Learn more about Lakes" />
            <figcaption>Lakes</figcaption>
          </Figure>
        </a>

        <a
          href={`${narsUrl}/national-coastal-condition-assessment-2010-results`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Figure>
            <img src={coastsPhoto} alt="Learn more about Coasts" />
            <figcaption>Coasts</figcaption>
          </Figure>
        </a>

        <a href={`${narsUrl}/nwca`} target="_blank" rel="noopener noreferrer">
          <Figure>
            <img src={wetlandsPhoto} alt="Learn more about Wetlands" />
            <figcaption>Wetlands</figcaption>
          </Figure>
        </a>
      </Links>
    </>
  );
}

function DrinkingWaterPanel() {
  return (
    <>
      <IntroBox>
        <StyledIntroHeading>
          Explore National Drinking Water Information
        </StyledIntroHeading>
        <StyledIntroText>
          The United States enjoys one of the world's most reliable and safest
          supplies of drinking water. Congress passed the Safe Drinking Water
          Act (SDWA) in 1974 to protect public health, including by regulating
          public water systems. SDWA requires EPA to establish and enforce
          standards that public drinking water systems must follow and requires
          states to report drinking water information periodically to EPA.
        </StyledIntroText>
      </IntroBox>

      <Highlights>
        <h3>
          <Icon src={drinkingWaterIcon} alt="Drinking Water" />
          The Basics
        </h3>

        <ol>
          <li>
            EPA, states, and water utilities work together to bring clean, safe
            water into homes and businesses every day.
          </li>
          <li>
            In the US, approximately 90% of the population gets drinking water
            from a public water system (PWS) that stores, distributes, and
            treats the water (as necessary).
          </li>
          <li>
            Additionally, more than 90% of our country's water systems meet EPA
            standards.
          </li>
        </ol>
      </Highlights>

      <AltBox>
        <h3>How do I know my water is safe?</h3>

        <p>
          America’s drinking water is among the safest in the world. If
          customers have questions about their drinking water, they can contact
          their local water supplier to request a{' '}
          <a
            href="https://www.epa.gov/ccr"
            target="_blank"
            rel="noopener noreferrer"
          >
            Consumer Confidence Report (CCR)
          </a>{' '}
          (opens new browser tab). The CCR lists the levels of contaminants that
          have been detected in the water, including those identified by EPA,
          and whether the public water system (PWS) meets state and EPA drinking
          water standards. In addition, the search results in this tool on the
          community page under the Drinking Water tab pull data from the Safe
          Drinking Water Information System (SDWIS) Federal Reporting Services.
        </p>
      </AltBox>

      <h3>EPA has defined three types of public water systems:</h3>

      <WaterSystemSummary state={{ name: 'US', code: 'National' }} />
    </>
  );
}

type Props = {
  ...RouteProps,
};

function National({ ...props }: Props) {
  return (
    <Page>
      <TabLinks />

      <Container>
        <ContentTabs>
          <StyledTabs>
            <TabList>
              <LargeTab data-testid="hmw-national-water-conditions-tab">
                National Water Quality
              </LargeTab>
              <LargeTab data-testid="hmw-national-drinking-water-tab">
                National Drinking Water
              </LargeTab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <WaterConditionsPanel />
              </TabPanel>
              <TabPanel>
                <DrinkingWaterPanel />
              </TabPanel>
            </TabPanels>
          </StyledTabs>
        </ContentTabs>

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

export default National;
