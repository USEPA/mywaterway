// @flow

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
import DisclaimerModal from 'components/shared/DisclaimerModal';
import ShowLessMore from 'components/shared/ShowLessMore';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
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

function OverviewUpper() {
  return (
    <>
      <h2>Your Waters: What We Know</h2>

      <p>
        Waters in your community are connected within a local{' '}
        <GlossaryTerm term="Watershed">watershed</GlossaryTerm>. The{' '}
        <strong>dashed outline on the map shows your watershed.</strong>
      </p>

      <p>
        Water quality is monitored for physical, chemical and biological
        factors. The monitoring results are assessed against EPA approved water
        quality standards or thresholds. Water can be impaired, meaning it is
        not able to be used for certain purposes.
        <ShowLessMore
          charLimit={0}
          text=" The condition of a waterbody is dynamic and can change at any
            time, and the information in How’s My Waterway should only be used
            for general reference. If available, refer to local or state
            real-time water quality reports."
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

function SwimmingUpper() {
  return (
    <>
      <p>
        EPA, states, and tribes monitor and assess water quality to keep you
        safe while swimming and playing in or on the water.
        <ShowLessMore
          charLimit={0}
          text=" Water quality can change on very short notice. When deciding if
            it is safe to swim in a waterbody, refer to any local or state
            advisories. If available, refer to local or state real-time water
            quality reports."
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
        risks. For the <em>{watershed}</em> watershed, be sure to look for
        posted fish advisories or consult your local or state environmental
        health department for{' '}
        {fishingInfo.status === 'success' ? (
          <>
            {fishingInfo.data.map((state, index) => {
              const seperator =
                index === 0
                  ? ''
                  : index === fishingInfo.data.length - 1
                  ? ' and '
                  : ', ';

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

function AquaticLifeUpper() {
  return (
    <>
      <p>
        EPA, states, and tribes monitor and assess water quality to determine
        the impact of impairments on plants and animals living in the water.
      </p>

      <p>
        Plants and animals depend on clean water. Impairments can affect the
        quality of water, which can have adverse effects on plants and animals
        living in the water.
        <ShowLessMore
          charLimit={0}
          text=" The condition of a waterbody is dynamic and can change at any
            time, and the information in How’s My Waterway should only be used
            for general reference. If available, refer to local or state
            real-time water quality reports."
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

function DrinkingWaterUpper() {
  return (
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
          text=" Drinking water quality is based on water that has been treated
            to ensure it is ready for human consumption which differs from raw
            water in streams and reservoirs."
        />
      </p>
    </>
  );
}

function MonitoringUpper() {
  return (
    <>
      <p>
        Water is monitored by state, federal, tribal, and local agencies.
        Universities, volunteers and others also help detect water quality
        concerns.
      </p>

      <p>
        Water quality monitoring locations are shown on the map as both purple
        circles and yellow squares.
        <ShowLessMore
          charLimit={0}
          text=" The yellow squares represent monitoring locations that provide real time water quality measurements for a subset of categories – such as water level, water temperature, dissolved oxygen saturation, and other water quality indicators. The purple circles represent monitoring locations where all other past water conditions data is available for all monitored water quality parameters. These locations may have monitoring data available from as recently as last week, to multiple decades old, or anywhere in between, depending on the location."
        />
      </p>

      <DisclaimerModal>
        <p>
          The condition of a waterbody is dynamic and can change at any time,
          and the information in How’s My Waterway should only be used for
          general reference. This monitoring section only displays data that has
          been shared with EPA and doesn’t represent all data collected on a
          specific waterbody. For the most current data, refer to local or state
          real-time water quality reports.
        </p>

        <p>
          Furthermore, users of this application should not rely on information
          relating to environmental laws and regulations posted on this
          application. Application users are solely responsible for ensuring
          that they are in compliance with all relevant environmental laws and
          regulations. In addition, EPA cannot attest to the accuracy of data
          provided by organizations outside of the federal government.
        </p>
      </DisclaimerModal>
    </>
  );
}

function IdentifiedIssuesUpper() {
  return (
    <p>
      Waters can be impacted by a variety of impairments. Below you can see
      impairments degrading certain uses of these waters and those dischargers
      in significant violation of their permit.
    </p>
  );
}

function RestoreUpper() {
  return (
    <p>
      Efforts are underway to restore your community’s water through grants and
      clean-up plans at the local, state, and federal level. View restoration
      plans and EPA funded restoration projects.
    </p>
  );
}

function ProtectUpper() {
  return (
    <p>
      You can help keep your water clean. Together we can protect water for
      future generations.
    </p>
  );
}

const tabs = [
  {
    title: 'Overview',
    route: '/community/{urlSearch}/overview',
    icon: overviewIcon,
    upper: <OverviewUpper />,
    lower: <Overview />,
    layers: {
      dischargersLayer: false,
      monitoringLocationsLayer: false,
      usgsStreamgagesLayer: false,
      waterbodyLayer: true,
    },
  },
  {
    title: 'Swimming',
    route: '/community/{urlSearch}/swimming',
    icon: swimmingIcon,
    upper: <SwimmingUpper />,
    lower: <Swimming />,
    layers: {
      monitoringLocationsLayer: false,
      usgsStreamgagesLayer: false,
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
      monitoringLocationsLayer: false,
      usgsStreamgagesLayer: false,
      waterbodyLayer: true,
    },
  },
  {
    title: 'Aquatic Life',
    route: '/community/{urlSearch}/aquatic-life',
    icon: aquaticLifeIcon,
    upper: <AquaticLifeUpper />,
    lower: <AquaticLife />,
    layers: {
      monitoringLocationsLayer: false,
      usgsStreamgagesLayer: false,
      waterbodyLayer: true,
    },
  },
  {
    title: 'Drinking Water',
    route: '/community/{urlSearch}/drinking-water',
    icon: drinkingWaterIcon,
    upper: <DrinkingWaterUpper />,
    lower: <DrinkingWater />,
    layers: {
      boundariesLayer: false,
      monitoringLocationsLayer: false,
      usgsStreamgagesLayer: false,
      waterbodyLayer: false,
      providersLayer: true,
    },
  },
  {
    title: 'Monitoring',
    route: '/community/{urlSearch}/monitoring',
    icon: monitoringIcon,
    upper: <MonitoringUpper />,
    lower: <Monitoring />,
    layers: {
      cyanLayer: true,
      dischargersLayer: false,
      monitoringLocationsLayer: false,
      usgsStreamgagesLayer: true,
      waterbodyLayer: false,
    },
  },
  {
    title: 'Identified Issues',
    route: '/community/{urlSearch}/identified-issues',
    icon: identifiedIssuesIcon,
    upper: <IdentifiedIssuesUpper />,
    lower: <IdentifiedIssues />,
    layers: {
      issuesLayer: true,
      dischargersLayer: true,
      monitoringLocationsLayer: false,
      usgsStreamgagesLayer: false,
    },
  },
  {
    title: 'Restore',
    route: '/community/{urlSearch}/restore',
    icon: restoreIcon,
    upper: <RestoreUpper />,
    lower: <Restore />,
    layers: {
      monitoringLocationsLayer: false,
      usgsStreamgagesLayer: false,
      waterbodyLayer: false,
    },
  },
  {
    title: 'Protect',
    route: '/community/{urlSearch}/protect',
    icon: protectIcon,
    upper: <ProtectUpper />,
    lower: <Protect />,
    layers: {
      monitoringLocationsLayer: false,
      usgsStreamgagesLayer: false,
      wsioHealthIndexLayer: false,
      wildScenicRiversLayer: false,
      protectedAreasLayer: false,
      waterbodyLayer: false,
    },
  },
];

export { tabs };
