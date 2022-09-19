// @flow

import React from 'react';
import { css } from 'styled-components/macro';
import { Link } from 'react-router-dom';
// components
import Page from 'components/shared/Page';
import NavBar from 'components/shared/NavBar';
import LocationSearch from 'components/shared/LocationSearch';
import DisclaimerModal from 'components/shared/DisclaimerModal';
import {
  AquaticLifeIcon,
  DrinkingWaterIcon,
  EatingFishIcon,
  SwimmingIcon,
} from 'components/shared/Icons';
// styled components
import { searchTitleStyles, topicTitleStyles } from 'components/shared/Topics';
import {
  topicButtonContainer,
  topicButtonLinkStyles,
  threeButtonLinkStyles,
} from 'components/shared/ButtonLinks';

const disclaimerStyles = css`
  bottom: 1.25rem;
`;

const threeTopicButtonLinkStyles = css`
  ${topicButtonLinkStyles}
  ${threeButtonLinkStyles}
`;

function Swimming() {
  return (
    <Page>
      <NavBar title="Explore Topics" />

      <div css={topicTitleStyles}>
        <SwimmingIcon />
        <p>Swimming</p>
      </div>

      <div className="container" css={searchTitleStyles}>
        <LocationSearch
          route="/community/{urlSearch}/swimming"
          label={
            <em>Find out more about water you may potentially swim in.</em>
          }
        />

        <br />

        <p>
          Learn whether your local waters have been deemed safe for swimming and
          other recreational activities. Find out about what impairments exist
          in your local waterbodies. Water quality can change on very short
          notice. When deciding if it is safe to swim in a waterbody, refer to
          any local or state advisories. If available, refer to local or state
          real-time water quality reports.
        </p>

        <DisclaimerModal css={disclaimerStyles}>
          <p>
            Users of this application should not rely on information relating to
            environmental laws and regulations posted on this application.
            Application users are solely responsible for ensuring that they are
            in compliance with all relevant environmental laws and regulations.
            In addition, EPA cannot attest to the accuracy of data provided by
            organizations outside of the federal government.
          </p>
        </DisclaimerModal>

        <hr />

        <h2>Other Topics</h2>

        <div css={topicButtonContainer}>
          <Link to="/eating-fish" css={threeTopicButtonLinkStyles}>
            <EatingFishIcon />
            Eating Fish
          </Link>
          <Link to="/aquatic-life" css={threeTopicButtonLinkStyles}>
            <AquaticLifeIcon />
            Aquatic Life
          </Link>
          <Link to="/drinking-water" css={threeTopicButtonLinkStyles}>
            <DrinkingWaterIcon />
            Drinking Water
          </Link>
        </div>
      </div>
    </Page>
  );
}

export default Swimming;
