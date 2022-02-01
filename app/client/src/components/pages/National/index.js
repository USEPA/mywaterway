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
import LoadingSpinner from 'components/shared/LoadingSpinner';
// contexts
import { useNarsContext } from 'contexts/LookupFiles';
// styled components
import {
  StyledIntroBox,
  StyledIntroHeading,
  StyledIntroText,
} from 'components/shared/IntroBox';
import { LargeTab } from 'components/shared/ContentTabs/LargeTab.js';
import { StyledErrorBox } from 'components/shared/MessageBoxes';
// utilities
import { createMarkup } from 'utils/utils';
// styles
import { colors, fonts } from 'styles/index.js';
// images
import nutrientPollutionPhoto from './images/national-nutrient-pollution.jpg';
import riversPhoto from './images/learn-more-rivers.jpg';
import lakesPhoto from './images/learn-more-lakes.jpg';
import coastsPhoto from './images/learn-more-coasts.jpg';
import wetlandsPhoto from './images/learn-more-wetlands.jpg';
import drinkingWaterIcon from 'components/pages/Community/images/drinking-water.png';
// errors
import { narsError } from 'config/errorMessages';

// --- styled components ---
const Container = styled.div`
  margin: auto;
  padding: 1rem;
  max-width: 58rem;

  .hmw-percent {
    display: inline-block;
    margin-right: 0.125em;
    font-size: 1.25em;
    font-weight: bold;
    color: #0071bc;
  }
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
  const NARS = useNarsContext();

  const narsTabContent = (data) => {
    return data.map((category, index) => (
      <AccordionItem
        key={index}
        title={<span dangerouslySetInnerHTML={createMarkup(category.title)} />}
      >
        <AccordionContent
          dangerouslySetInnerHTML={createMarkup(category.content)}
        />
      </AccordionItem>
    ));
  };

  if (NARS.status === 'fetching') return <LoadingSpinner />;

  if (NARS.status === 'failure') {
    return <StyledErrorBox>{narsError}</StyledErrorBox>;
  }

  if (NARS.status === 'success' && Object.keys(NARS.data).length === 0) {
    return <StyledErrorBox>{narsError}</StyledErrorBox>;
  }

  return (
    <>
      <IntroBox>
        <StyledIntroHeading>{NARS.data.topTitle}</StyledIntroHeading>
        <StyledIntroText
          dangerouslySetInnerHTML={createMarkup(NARS.data.topContent)}
        />
      </IntroBox>
      <h3>{NARS.data.subTitle}</h3>

      <Article>
        <p dangerouslySetInnerHTML={createMarkup(NARS.data.subContent)} />

        <a
          href={NARS.data.excessNutrientsImageUrl}
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
            {NARS.data.tabbedContent.map((tab, index) => (
              <Tab data-testid={tab.dataTestid} key={index}>
                {tab.name}
              </Tab>
            ))}
          </TabList>

          <TabPanels>
            {NARS.data.tabbedContent.map((tab, indexX) => (
              <TabPanel key={indexX}>
                <AccordionList>{narsTabContent(tab.content)}</AccordionList>

                {tab.footnotes.map((footnote, indexY) => (
                  <FooterText
                    dangerouslySetInnerHTML={createMarkup(footnote)}
                    key={indexY}
                  />
                ))}
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </ContentTabs>

      <h3>Learn more about waterbody types</h3>

      <NewTabDisclaimer>
        Links below open in a new browser tab.
      </NewTabDisclaimer>

      <Links>
        <a
          href={NARS.data.riversStreamsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Figure>
            <img src={riversPhoto} alt="Learn more about Rivers & Streams" />
            <figcaption>Rivers & Stream</figcaption>
          </Figure>
        </a>

        <a href={NARS.data.lakesUrl} target="_blank" rel="noopener noreferrer">
          <Figure>
            <img src={lakesPhoto} alt="Learn more about Lakes" />
            <figcaption>Lakes</figcaption>
          </Figure>
        </a>

        <a href={NARS.data.coastsUrl} target="_blank" rel="noopener noreferrer">
          <Figure>
            <img src={coastsPhoto} alt="Learn more about Coasts" />
            <figcaption>Coasts</figcaption>
          </Figure>
        </a>

        <a
          href={NARS.data.wetlandsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
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
