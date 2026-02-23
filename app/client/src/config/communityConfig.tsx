/** @jsxImportSource @emotion/react */

import { css } from '@emotion/react';
// components
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
// contexts
import { useConfigFilesState } from 'contexts/ConfigFiles';
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
  div:first-of-type {
    margin-bottom: 1.5em;
  }

  p {
    padding-bottom: 0;
    margin-bottom: 1.5em;
  }

  [data-show-less-more] {
    display: none;
  }

  .paragraph-list {
    p {
      margin-bottom: 0;
    }

    ul {
      margin-bottom: 1.5em;
    }
  }
`;

function UpperContent({
  tabKey,
}: {
  tabKey: string;
}) {
  const {
    data: {
      upperContent: {
        [tabKey]: { body, disclaimerKey },
      },
    },
  } = useConfigFilesState();

  return (
    <div css={upperContentStyles} data-testid="hmw-upper-content-section">
      <div dangerouslySetInnerHTML={{ __html: body }} />

      {disclaimerKey && <DisclaimerModal disclaimerKey={disclaimerKey} />}
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
    upper: <UpperContent tabKey="eatingFish" />,
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
