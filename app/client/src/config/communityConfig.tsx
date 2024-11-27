/** @jsxImportSource @emotion/react */

import { css } from '@emotion/react';
import React, { Fragment, useContext } from 'react';
// components
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import Overview from 'components/pages/Community.Tabs.Overview';
import DrinkingWater from 'components/pages/Community.Tabs.DrinkingWater';
import Swimming from 'components/pages/Community.Tabs.Swimming';
import EatingFish from 'components/pages/Community.Tabs.EatingFish';
import AquaticLife from 'components/pages/Community.Tabs.AquaticLife';
import Monitoring from 'components/pages/Community.Tabs.Monitoring';
import IdentifiedIssues from 'components/pages/Community.Tabs.IdentifiedIssues';
import Restore from 'components/pages/Community.Tabs.Restore';
import Protect from 'components/pages/Community.Tabs.Protect';
import ExtremeWeather from 'components/pages/Community.Tabs.ExtremeWeather';
import { DisclaimerModal } from 'components/shared/Modal';
import ShowLessMore from 'components/shared/ShowLessMore';
// contexts
import { useConfigFilesState } from 'contexts/ConfigFiles';
import { LocationSearchContext } from 'contexts/locationSearch';
// styles
import { paragraphStyles } from 'styles';
// images
import overviewIcon from 'images/overview.png';
import drinkingWaterIcon from 'images/drinking-water.png';
import swimmingIcon from 'images/swimming.png';
import eatingfishIcon from 'images/eating-fish.png';
import aquaticLifeIcon from 'images/aquatic-life.png';
import monitoringIcon from 'images/monitoring.png';
import identifiedIssuesIcon from 'images/identified-issues.png';
import restoreIcon from 'images/restore.png';
import protectIcon from 'images/protect.png';
import extremeWeatherIcon from 'images/extreme-weather.png';

const upperContentStyles = css`
  [data-show-less-more] {
    display: none;
  }

  .paragraph-styles {
    ${paragraphStyles}
  }
`;

function EatingFishUpper() {
  const { watershed, fishingInfo, statesData } = useContext(
    LocationSearchContext,
  );

  return (
    <>
      <p>
        EPA, states, and tribes monitor and assess water quality to determine if
        fish and shellfish are safe to eat.
      </p>

      <p>
        Eating fish and shellfish caught in impaired waters can pose health
        risks. For the <em>{watershed.name}</em> watershed, be sure to look for
        posted fish advisories or consult your local or state environmental
        health department for{' '}
        {fishingInfo.status === 'success' ? (
          <>
            {fishingInfo.data.map((state, index) => {
              let seperator = ', ';
              if (index === 0) seperator = '';
              else if (index === fishingInfo.data.length - 1)
                seperator = ' and ';

              const matchedState = statesData.data.find((s) => {
                return s.code === state.stateCode;
              });

              return (
                <Fragment key={state.stateCode}>
                  {seperator}
                  <a href={state.url} target="_blank" rel="noopener noreferrer">
                    {matchedState ? matchedState.name : state.stateCode}
                  </a>
                </Fragment>
              );
            })}
            .{' '}
            <a
              className="exit-disclaimer"
              href="https://www.epa.gov/home/exit-epa"
              target="_blank"
              rel="noopener noreferrer"
            >
              EXIT
            </a>
          </>
        ) : (
          <>your state.</>
        )}
        <ShowLessMore
          charLimit={0}
          text=" The information in How’s My Waterway about the safety of eating
            fish caught recreationally should only be considered as general
            reference. Please consult with your state for local or state-wide
            fish advisories."
        />
      </p>

      <DisclaimerModal>
        <p>
          Users of this application should not rely on information relating to
          environmental laws and regulations posted on this application.
          Application users are solely responsible for ensuring that they are in
          compliance with all relevant environmental laws and regulations. In
          addition, EPA cannot attest to the accuracy of data provided by
          organizations outside of the federal government.
        </p>
      </DisclaimerModal>
    </>
  );
}

function UpperContent({ tabKey }: { tabKey: string }) {
  const {
    data: {
      upperContent: {
        [tabKey]: { body, disclaimer },
      },
    },
  } = useConfigFilesState();

  return (
    <div css={upperContentStyles}>
      <div dangerouslySetInnerHTML={{ __html: body }} />

      {disclaimer && (
        <DisclaimerModal>
          <div
            dangerouslySetInnerHTML={{
              __html: disclaimer,
            }}
          />
        </DisclaimerModal>
      )}
    </div>
  );
}

const tabs = [
  {
    title: 'Overview',
    route: '/community/{urlSearch}/overview',
    icon: overviewIcon,
    upper: <UpperContent tabKey="overview" />,
    lower: <Overview />,
    layers: {
      boundariesLayer: true,
      searchIconLayer: true,
      waterbodyLayer: true,
    },
  },
  {
    title: 'Swimming',
    route: '/community/{urlSearch}/swimming',
    icon: swimmingIcon,
    upper: <UpperContent tabKey="swimming" />,
    lower: <Swimming />,
    layers: {
      boundariesLayer: true,
      searchIconLayer: true,
      waterbodyLayer: true,
    },
  },
  {
    title: 'Eating Fish',
    route: '/community/{urlSearch}/eating-fish',
    icon: eatingfishIcon,
    upper: <EatingFishUpper />,
    lower: <EatingFish />,
    layers: {
      boundariesLayer: true,
      searchIconLayer: true,
      waterbodyLayer: true,
    },
  },
  {
    title: 'Aquatic Life',
    route: '/community/{urlSearch}/aquatic-life',
    icon: aquaticLifeIcon,
    upper: <UpperContent tabKey="aquaticLife" />,
    lower: <AquaticLife />,
    layers: {
      boundariesLayer: true,
      searchIconLayer: true,
      waterbodyLayer: true,
    },
  },
  {
    title: 'Drinking Water',
    route: '/community/{urlSearch}/drinking-water',
    icon: drinkingWaterIcon,
    upper: <UpperContent tabKey="drinkingWater" />,
    lower: <DrinkingWater />,
    layers: {
      boundariesLayer: false,
      searchIconLayer: true,
      providersLayer: true,
    },
  },
  {
    title: 'Water Monitoring',
    route: '/community/{urlSearch}/monitoring',
    icon: monitoringIcon,
    upper: <UpperContent tabKey="monitoring" />,
    lower: <Monitoring />,
    layers: {
      boundariesLayer: true,
      cyanLayer: true,
      searchIconLayer: true,
      usgsStreamgagesLayer: true,
    },
  },
  {
    title: 'Extreme Weather',
    route: '/community/{urlSearch}/extreme-weather',
    icon: extremeWeatherIcon,
    upper: <UpperContent tabKey="extremeWeather" />,
    lower: <ExtremeWeather />,
    layers: {
      boundariesLayer: true,
      searchIconLayer: true,
      providersLayer: true,
      waterbodyLayer: true,
    },
  },
  {
    title: 'Identified Issues',
    route: '/community/{urlSearch}/identified-issues',
    icon: identifiedIssuesIcon,
    upper: <UpperContent tabKey="identifiedIssues" />,
    lower: <IdentifiedIssues />,
    layers: {
      boundariesLayer: true,
      issuesLayer: true,
      searchIconLayer: true,
    },
  },
  {
    title: 'Restore',
    route: '/community/{urlSearch}/restore',
    icon: restoreIcon,
    upper: <UpperContent tabKey="restore" />,
    lower: <Restore />,
    layers: {
      boundariesLayer: true,
      searchIconLayer: true,
    },
  },
  {
    title: 'Protect',
    route: '/community/{urlSearch}/protect',
    icon: protectIcon,
    upper: <UpperContent tabKey="protect" />,
    lower: <Protect />,
    layers: {
      boundariesLayer: true,
      searchIconLayer: true,
    },
  },
];

export { tabs };
