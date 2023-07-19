// @flow

import React from 'react';
import { css } from 'styled-components/macro';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
// components
import Page from 'components/shared/Page';
import TabLinks from 'components/shared/TabLinks';
import { tabsStyles } from 'components/shared/ContentTabs';
import { AccordionList, AccordionItem } from 'components/shared/Accordion';
import WaterSystemSummary from 'components/shared/WaterSystemSummary';
import { DisclaimerModal } from 'components/shared/Modal';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { introBoxStyles } from 'components/shared/IntroBox';
import { errorBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import { useNarsContext } from 'contexts/LookupFiles';
// styles
import { colors, fonts } from 'styles/index.js';
// images
import nutrientPollutionPhoto from 'images/national-nutrient-pollution.jpg';
import riversPhoto from 'images/learn-more-rivers.jpg';
import lakesPhoto from 'images/learn-more-lakes.jpg';
import coastsPhoto from 'images/learn-more-coasts.jpg';
import wetlandsPhoto from 'images/learn-more-wetlands.jpg';
import drinkingWaterIcon from 'images/drinking-water.png';
// errors
import { narsError } from 'config/errorMessages';

const containerStyles = css`
  margin: auto;
  padding: 1rem;
  max-width: 58rem;

  .hmw-percent {
    display: inline-block;
    margin-right: 0.125em;
    font-size: 1.25em;
    font-weight: bold;
    color: ${colors.blue()};
  }

  small {
    font-weight: inherit;
  }
`;

const modifiedTabsStyles = css`
  ${tabsStyles}
  margin-bottom: 1rem;

  [data-reach-tab] {
    padding: 0.875em;
    font-size: 0.875em;

    @media (min-width: 480px) {
      font-size: 1em;
    }
  }

  [data-reach-tab-panel] {
    padding: 1.5em;

    p {
      padding-bottom: 0;
      line-height: 1.375;

      + p {
        margin-top: 1rem;
      }
    }

    li {
      line-height: 1.375;
    }

    h3 {
      margin-top: 1.5rem;
      margin-bottom: 0.625rem;
      padding-bottom: 0;
      font-family: ${fonts.primary};
      font-size: 1.375em;
    }
  }
`;

const modifiedIntroBoxStyles = css`
  ${introBoxStyles}

  margin-top: -1.5em;
  margin-left: -1.5em;
  border-bottom: 1px solid #d8dfe2;
  width: calc(100% + 3em);
`;

const altBoxStyles = css`
  ${modifiedIntroBoxStyles}

  margin-top: 0;
  border-top: 1px solid #d8dfe2;

  h3 {
    margin-top: 0 !important;
  }
`;

const columnsStyles = css`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
`;

const leftColumnStyles = css`
  @media (min-width: 640px) {
    width: calc(50% - 0.5rem);
  }

  @media (min-width: 800px) {
    width: calc(75% - 0.5rem);
  }
`;

const rightColumnStyles = css`
  margin-top: 1rem;

  @media (min-width: 640px) {
    margin-top: 0;
    width: calc(50% - 0.5rem);
  }

  @media (min-width: 800px) {
    width: calc(25% - 0.5rem);
  }
`;

const figureStyles = css`
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
    color: white;
    background-color: ${colors.black(0.6875)};
  }
`;

const accordionContentStyles = css`
  padding: 0.4375em 0.875em 0.875em;
`;

const footnoteStyles = css`
  margin-top: 0.5em !important;
  font-style: italic;
  line-height: 1 !important;
`;

const disclaimerStyles = css`
  display: inline-block;
  margin-bottom: 0.5em;
`;

const linksStyles = css`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;

  a {
    margin-top: 1rem;
    width: 100%;

    :nth-of-type(1) {
      margin-top: 0;
    }

    @media (min-width: 320px) {
      width: calc(50% - 0.5rem);

      :nth-of-type(2) {
        margin-top: 0;
      }
    }

    @media (min-width: 640px) {
      margin-top: 0;
      width: calc(25% - 0.75rem);
    }
  }
`;

const highlightsStyles = css`
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
    background-color: ${colors.blue()};
  }

  @media (min-width: 720px) {
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

const iconStyles = css`
  position: relative;
  bottom: 0.125em;
  left: -0.3125em;
  margin-right: -0.3125em;
  max-width: 1.75em;
  max-height: 1.75em;
`;

function NationalWaterQualityPanel() {
  const { status, data } = useNarsContext();

  if (status === 'fetching') {
    return <LoadingSpinner />;
  }

  if (status === 'failure') {
    return (
      <div css={errorBoxStyles}>
        <p>{narsError}</p>
      </div>
    );
  }

  if (status === 'success' && Object.keys(data).length === 0) {
    return (
      <div css={errorBoxStyles}>
        <p>{narsError}</p>
      </div>
    );
  }

  return (
    <>
      <div css={modifiedIntroBoxStyles}>
        <h2>{data.intro.title}</h2>
        <div dangerouslySetInnerHTML={{ __html: data.intro.content }} />
      </div>

      <h3>{data.columns.title}</h3>

      <div css={columnsStyles}>
        <div
          css={leftColumnStyles}
          dangerouslySetInnerHTML={{ __html: data.columns.content }}
        />

        <div css={rightColumnStyles}>
          <a
            href={data.columns.photoLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            <figure css={figureStyles}>
              <img
                src={nutrientPollutionPhoto}
                alt="Map of excess nutrients across the United States"
              />
            </figure>
          </a>
        </div>
      </div>

      <h3>Learn about the health of our waters</h3>

      <div css={tabsStyles}>
        <Tabs>
          <TabList>
            {data.tabs.map((tab, tabIndex) => {
              const tabId = tab.title.replace(/\W+/g, '-').toLowerCase();
              return (
                <Tab data-testid={`hmw-national-${tabId}-tab`} key={tabIndex}>
                  {tab.title}
                </Tab>
              );
            })}
          </TabList>

          <TabPanels>
            {data.tabs.map((tab, tabIndex) => (
              <TabPanel key={tabIndex}>
                <AccordionList>
                  {tab.content.map((category, categoryIndex) => (
                    <AccordionItem
                      key={categoryIndex}
                      title={
                        <span
                          dangerouslySetInnerHTML={{ __html: category.title }}
                        />
                      }
                    >
                      <div
                        css={accordionContentStyles}
                        dangerouslySetInnerHTML={{ __html: category.content }}
                      />
                    </AccordionItem>
                  ))}
                </AccordionList>

                {tab.footnotes.map((footnote, footnoteIndex) => (
                  <p css={footnoteStyles} key={footnoteIndex}>
                    <small dangerouslySetInnerHTML={{ __html: footnote }} />
                  </p>
                ))}
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </div>

      <h3>Learn more about waterbody types</h3>

      <p>
        <em css={disclaimerStyles}>Links below open in a new browser tab.</em>
      </p>

      <div css={linksStyles}>
        <a href={data.links.rivers} target="_blank" rel="noopener noreferrer">
          <figure css={figureStyles}>
            <img src={riversPhoto} alt="Learn more about Rivers & Streams" />
            <figcaption>Rivers & Stream</figcaption>
          </figure>
        </a>

        <a href={data.links.lakes} target="_blank" rel="noopener noreferrer">
          <figure css={figureStyles}>
            <img src={lakesPhoto} alt="Learn more about Lakes" />
            <figcaption>Lakes</figcaption>
          </figure>
        </a>

        <a href={data.links.coasts} target="_blank" rel="noopener noreferrer">
          <figure css={figureStyles}>
            <img src={coastsPhoto} alt="Learn more about Coasts" />
            <figcaption>Coasts</figcaption>
          </figure>
        </a>

        <a href={data.links.wetlands} target="_blank" rel="noopener noreferrer">
          <figure css={figureStyles}>
            <img src={wetlandsPhoto} alt="Learn more about Wetlands" />
            <figcaption>Wetlands</figcaption>
          </figure>
        </a>
      </div>
    </>
  );
}

function NationalDrinkingWaterPanel() {
  return (
    <>
      <div css={modifiedIntroBoxStyles}>
        <h2>Explore National Drinking Water Information</h2>

        <p>
          The United States enjoys one of the world's most reliable and safest
          supplies of drinking water. Congress passed the Safe Drinking Water
          Act (SDWA) in 1974 to protect public health, including by regulating
          public water systems. SDWA requires EPA to establish and enforce
          standards that public drinking water systems must follow and requires
          states to report drinking water information periodically to EPA.
        </p>
      </div>

      <div css={highlightsStyles}>
        <h3>
          <img css={iconStyles} src={drinkingWaterIcon} alt="Drinking Water" />
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
      </div>

      <div css={altBoxStyles}>
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
          <small>(opens new browser tab)</small>. The CCR lists the levels of
          contaminants that have been detected in the water, including those
          identified by EPA, and whether the public water system (PWS) meets
          state and EPA drinking water standards. In addition, the search
          results in this tool on the community page under the Drinking Water
          tab pull data from the Safe Drinking Water Information System (SDWIS)
          Federal Reporting Services.
        </p>
      </div>

      <h3>EPA has defined three types of public water systems:</h3>

      <WaterSystemSummary state={{ label: 'US', value: 'National' }} />
    </>
  );
}

function National() {
  return (
    <Page>
      <TabLinks />

      <div css={containerStyles}>
        <div css={modifiedTabsStyles}>
          <Tabs>
            <TabList>
              <Tab data-testid="hmw-national-water-quality-tab">
                National Water Quality
              </Tab>
              <Tab data-testid="hmw-national-drinking-water-tab">
                National Drinking Water
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <NationalWaterQualityPanel />
              </TabPanel>
              <TabPanel>
                <NationalDrinkingWaterPanel />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </div>

        <DisclaimerModal>
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
        </DisclaimerModal>
      </div>
    </Page>
  );
}

export default National;
