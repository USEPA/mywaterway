// @flow

import React from 'react';
import styled from 'styled-components';
// components
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import Overview from './components/tabs/Overview';
import DrinkingWater from './components/tabs/DrinkingWater';
import Swimming from './components/tabs/Swimming';
import EatingFish from './components/tabs/EatingFish';
import AquaticLife from './components/tabs/AquaticLife';
import Monitoring from './components/tabs/Monitoring';
import IdentifiedIssues from './components/tabs/IdentifiedIssues';
import Restore from './components/tabs/Restore';
import Protect from './components/tabs/Protect';
import DisclaimerModal from 'components/shared/DisclaimerModal';
import ShowLessMore from 'components/shared/ShowLessMore';
// images
import overviewIcon from './images/overview.png';
import drinkingWaterIcon from './images/drinking-water.png';
import swimmingIcon from './images/swimming.png';
import eatingfishIcon from './images/eating-fish.png';
import aquaticLifeIcon from './images/aquatic-life.png';
import monitoringIcon from './images/monitoring.png';
import identifiedIssuesIcon from './images/identified-issues.png';
import restoreIcon from './images/restore.png';
import protectIcon from './images/protect.png';
// styles
import { fonts } from 'styles/index.js';

// --- styled components ---
const Disclaimer = styled(DisclaimerModal)`
  /* */
`;

const Heading = styled.h2`
  margin-top: 0 !important;
  margin-bottom: 17px !important;
  font-family: ${fonts.primary};
  font-size: 1.375em;
  margin-bottom: 17px;
`;

// --- upper tabs content ---
const overviewUpper = (
  <>
    <Heading>Your Waters: What We Know</Heading>
    <p>
      Waters in your community are connected within a local{' '}
      <GlossaryTerm term="Watershed">watershed</GlossaryTerm>. The{' '}
      <strong>dashed outline on the map shows your watershed.</strong>
    </p>
    <p>
      Water quality is monitored for physical, chemical and biological factors.
      The monitoring results are assessed against EPA approved water quality
      standards or thresholds. Water can be impaired, meaning it is not able to
      be used for certain purposes.
      <ShowLessMore
        charLimit={0}
        text={`
            The condition of a waterbody is dynamic and can change at any time, and
            the information in How’s My Waterway should only be used for general
            reference. If available, refer to local or state real-time water quality
            reports.
        `}
      />
    </p>
    <Disclaimer>
      <p>
        Users of this application should not rely on information relating to
        environmental laws and regulations posted on this application.
        Application users are solely responsible for ensuring that they are in
        compliance with all relevant environmental laws and regulations. In
        addition, EPA cannot attest to the accuracy of data provided by
        organizations outside of the federal government.
      </p>
    </Disclaimer>
  </>
);

const drinkingUpper = (
  <>
    <p>
      Drinking water comes from aquifers, streams, rivers, and lakes.
      Approximately 150,000{' '}
      <GlossaryTerm term="Drinking Water System Type">
        public water systems
      </GlossaryTerm>{' '}
      provide drinking water to most Americans. Under the Safe Drinking Water
      Act, EPA sets standards for drinking water quality and with its partners
      implements various technical and financial programs to ensure drinking
      water safety.
      <ShowLessMore
        charLimit={0}
        text={`
        Drinking water quality is based on water that has been
        treated to ensure it is ready for human consumption which differs from raw
        water in streams and reservoirs.
        `}
      />
    </p>
  </>
);

const swimmingUpper = (
  <>
    <p>
      EPA, states, and tribes monitor and assess water quality to keep you safe
      while swimming and playing in or on the water.
      <ShowLessMore
        charLimit={0}
        text={`
          Water quality can change on very short notice. When deciding if it is
          safe to swim in a water body, refer to any local or state advisories. If
          available, refer to local or state real-time water quality reports.
        `}
      />
    </p>
    <Disclaimer>
      <p>
        Users of this application should not rely on information relating to
        environmental laws and regulations posted on this application.
        Application users are solely responsible for ensuring that they are in
        compliance with all relevant environmental laws and regulations. In
        addition, EPA cannot attest to the accuracy of data provided by
        organizations outside of the federal government.
      </p>
    </Disclaimer>
  </>
);

const fishingUpper = (
  <>
    <p>
      EPA, states, and tribes monitor and assess water quality to determine if
      fish and shellfish are safe to eat.
    </p>
  </>
);

const aquaticUpper = (
  <>
    <p>
      EPA, states, and tribes monitor and assess water quality to determine the
      impact of impairments on plants and animals living in the water.
    </p>
    <p>
      Plants and animals depend on clean water. Impairments can affect the
      quality of water, which can have adverse effects on plants and animals
      living in the water.
      <ShowLessMore
        charLimit={0}
        text={`
                The condition of a waterbody is dynamic and can change at
                any time, and the information in How’s My Waterway should
                only be used for general reference. If available, refer to
                local or state real-time water quality reports.
              `}
      />
    </p>

    <Disclaimer>
      <p>
        Users of this application should not rely on information relating to
        environmental laws and regulations posted on this application.
        Application users are solely responsible for ensuring that they are in
        compliance with all relevant environmental laws and regulations. In
        addition, EPA cannot attest to the accuracy of data provided by
        organizations outside of the federal government.
      </p>
    </Disclaimer>
  </>
);

const monitoringUpper = (
  <>
    <p>
      Water is monitored by state, federal, tribal, and local agencies.
      Universities, volunteers and others also help detect water quality
      concerns.
    </p>
    <Disclaimer>
      <p>
        The condition of a waterbody is dynamic and can change at any time, and
        the information in How’s My Waterway should only be used for general
        reference. This monitoring section only displays data that has been
        shared with EPA and doesn’t represent all data collected on a specific
        waterbody. For the most current data, refer to local or state real-time
        water quality reports.
      </p>
      <p>
        Furthermore, users of this application should not rely on information
        relating to environmental laws and regulations posted on this
        application. Application users are solely responsible for ensuring that
        they are in compliance with all relevant environmental laws and
        regulations. In addition, EPA cannot attest to the accuracy of data
        provided by organizations outside of the federal government.
      </p>
    </Disclaimer>
  </>
);

const identifiedUpper = (
  <>
    <p>
      Waters can be impacted by a variety of impairments.  Below you can see
      impairments degrading certain uses of these waters and those dischargers
      in significant violation of their permit.
    </p>
  </>
);

const restoreUpper = (
  <>
    <p>
      Efforts are underway to restore your community’s water through grants and
      clean-up plans at the local, state, and federal level. View restoration
      plans and EPA funded restoration projects.
    </p>
  </>
);

const protectUpper = (
  <>
    <p>
      You can help keep your water clean. Together we can protect water for
      future generations.
    </p>
  </>
);

// --- tabs config ---
const tabs = [
  {
    title: 'Overview',
    route: '/community/{urlSearch}/overview',
    icon: overviewIcon,
    upper: overviewUpper,
    lower: <Overview />,
    layers: {
      waterbodyLayer: true,
      monitoringStationsLayer: false,
      usgsStreamgagesLayer: false,
      dischargersLayer: false,
    },
  },
  {
    title: 'Swimming',
    route: '/community/{urlSearch}/swimming',
    icon: swimmingIcon,
    upper: swimmingUpper,
    lower: <Swimming />,
    layers: { waterbodyLayer: true },
  },
  {
    title: 'Eating Fish',
    route: '/community/{urlSearch}/eating-fish',
    icon: eatingfishIcon,
    upper: fishingUpper,
    lower: <EatingFish />,
    layers: { waterbodyLayer: true },
  },
  {
    title: 'Aquatic Life',
    route: '/community/{urlSearch}/aquatic-life',
    icon: aquaticLifeIcon,
    upper: aquaticUpper,
    lower: <AquaticLife />,
    layers: { waterbodyLayer: true },
  },
  {
    title: 'Drinking Water',
    route: '/community/{urlSearch}/drinking-water',
    icon: drinkingWaterIcon,
    upper: drinkingUpper,
    lower: <DrinkingWater />,
    layers: {
      boundariesLayer: false,
      waterbodyLayer: false,
      providersLayer: true,
    },
  },
  {
    title: 'Monitoring',
    route: '/community/{urlSearch}/monitoring',
    icon: monitoringIcon,
    upper: monitoringUpper,
    lower: <Monitoring />,
    layers: {
      dischargersLayer: false,
      monitoringStationsLayer: true,
      waterbodyLayer: false,
    },
  },
  {
    title: 'Identified Issues',
    route: '/community/{urlSearch}/identified-issues',
    icon: identifiedIssuesIcon,
    upper: identifiedUpper,
    lower: <IdentifiedIssues />,
    layers: { issuesLayer: true, dischargersLayer: true },
  },
  {
    title: 'Restore',
    route: '/community/{urlSearch}/restore',
    icon: restoreIcon,
    upper: restoreUpper,
    lower: <Restore />,
    layers: {
      waterbodyLayer: false,
    },
  },
  {
    title: 'Protect',
    route: '/community/{urlSearch}/protect',
    icon: protectIcon,
    upper: protectUpper,
    lower: <Protect />,
    layers: {
      wsioHealthIndexLayer: false,
      wildScenicRiversLayer: false,
      protectedAreasLayer: false,
      waterbodyLayer: false,
    },
  },
];

export { tabs };
