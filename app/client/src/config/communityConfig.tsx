/** @jsxImportSource @emotion/react */

import React, { Fragment, useContext } from 'react';
// components
import { GlossaryTerm } from '@/components/shared/GlossaryPanel';
import Overview from '@/components/pages/Community.Tabs.Overview';
import DrinkingWater from '@/components/pages/Community.Tabs.DrinkingWater';
import Swimming from '@/components/pages/Community.Tabs.Swimming';
import EatingFish from '@/components/pages/Community.Tabs.EatingFish';
import AquaticLife from '@/components/pages/Community.Tabs.AquaticLife';
import Monitoring from '@/components/pages/Community.Tabs.Monitoring';
import IdentifiedIssues from '@/components/pages/Community.Tabs.IdentifiedIssues';
import Restore from '@/components/pages/Community.Tabs.Restore';
import Protect from '@/components/pages/Community.Tabs.Protect';
import ExtremeWeather from '@/components/pages/Community.Tabs.ExtremeWeather';
import { DisclaimerModal } from '@/components/shared/Modal';
import ShowLessMore from '@/components/shared/ShowLessMore';
// contexts
import { LocationSearchContext } from '@/contexts/locationSearch';
// styles
import { paragraphStyles } from '@/styles';
// images
import overviewIcon from '@/images/overview.png';
import drinkingWaterIcon from '@/images/drinking-water.png';
import swimmingIcon from '@/images/swimming.png';
import eatingfishIcon from '@/images/eating-fish.png';
import aquaticLifeIcon from '@/images/aquatic-life.png';
import monitoringIcon from '@/images/monitoring.png';
import identifiedIssuesIcon from '@/images/identified-issues.png';
import restoreIcon from '@/images/restore.png';
import protectIcon from '@/images/protect.png';
import extremeWeatherIcon from '@/images/extreme-weather.png';

function OverviewUpper() {
  return (
    <>
      <h3>Your Waters: What We Know</h3>

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
        Explore the map and information below to find out about current and past
        water conditions.
        <ShowLessMore
          charLimit={0}
          text=" We define current data as less than one week old, and everything else as past data. The water condition information shown here is estimated using satellite imagery, water quality sensors deployed in the waterbody, and many other diverse monitoring techniques including laboratory analyses."
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

function ExtremeWeatherUpper() {
  return (
    <>
      <div>
        Explore potentially vulnerable waters, infrastructure, and communities
        alongside information on current, historical, and potential future{' '}
        <strong>extreme weather events</strong> (and associated events like
        wildfires) and <strong>climate</strong> for the selected watershed and
        county. Extreme events such as drought and flooding, caused by natural
        phenomena or human activity, typically happen infrequently, vary from
        normal conditions in severity or duration, and can have severe impacts
        on natural and human systems. Changes in climate over many years may
        impact the frequency, intensity, duration, and timing of extreme events
        in certain areas. Explore the map and information below to learn more.
        <ShowLessMore
          charLimit={0}
          text={
            <>
              <span css={paragraphStyles}>
                Extreme weather events impact both the quality and volume of
                clean, safe water available for different uses such as drinking,
                eating fish, recreation, and aquatic life. For example, intense
                storms can increase pollution loads and accelerate erosion and
                sedimentation, and drought dwindles water supplies, both of
                which result in concentrated pollutant loads. Intense
                rainstorms, flooding, drought, wildfire, and extreme
                temperatures also stress and damage the operation of already
                aging infrastructure and can disrupt or displace communities.
                Here are examples of how extreme weather events and associated
                environmental impacts can affect potentially vulnerable waters,
                infrastructure, and communities:{' '}
              </span>
              <span css={paragraphStyles}>
                <strong>Flooding</strong>: Heavy rainfall and intense storms can
                cause flooding and damage critical infrastructure (e.g., sewer
                systems and wastewater treatment facilities) and disrupt or
                displace communities. During a flood, underground storage tank
                (UST) systems may become displaced or damaged and release their
                contents into the environment, causing soil, surface water, and
                groundwater contamination.
              </span>
              <ul>
                <li>
                  <a
                    href="https://www.epa.gov/green-infrastructure/manage-flood-risk"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Manage Flood Risk
                  </a>
                </li>
              </ul>
              <span css={paragraphStyles}>
                <strong>Drought</strong>: Climate change is projected to
                intensify drought across much of the country. During a drought,
                water utilities can face a loss of water supply and increased
                demand from customers. Drought can reduce short term water
                sources, such as reservoir or lake levels, or affect longer-term
                storage, such as mountain snowpack. Drought can also increase
                drinking water treatment costs by concentrating contaminates in
                source waters and thereby diminishing source water quality (see:{' '}
                <a
                  href="https://www.epa.gov/arc-x/climate-adaptation-and-source-water-impacts"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Climate Adaptation and Source Water Impacts
                </a>
                ).
              </span>
              <ul>
                <li>
                  <a
                    href="https://www.epa.gov/natural-disasters/drought"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Drought
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.epa.gov/waterutilityresponse/drought-response-and-recovery-water-utilities"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Drought Response and Recovery for Water Utilities
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.epa.gov/crwu"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Creating Resilient Water Utilities (CRWU)
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.epa.gov/climate-change-water-sector/drought-and-water-scarcity-initiatives"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Drought and Water Scarcity Initiatives
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.epa.gov/water-research/drought-resilience-and-water-conservation"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Drought Resilience and Water Conservation
                  </a>
                </li>
              </ul>
              <span css={paragraphStyles}>
                <strong>Wildfire</strong>: Wildfire frequency, extent, and
                intensity are projected to increase with higher temperatures and
                drought conditions in parts of the United States. During active
                burning, ash and contaminants associated with ash settle on
                streams, lakes, and water reservoirs. Vegetation that holds soil
                in place and retains water is burned away. In the aftermath of a
                large wildfire, rainstorms flush vast quantities of ash,
                sediment, nutrients and contaminants into streams, rivers, and
                downstream reservoirs. The absence of vegetation in the
                watershed can create conditions conducive to erosion and even
                flooding, and naturally occurring and anthropogenic substances
                can impact drinking water quality, discolor recreational waters,
                and may potentially contribute to harmful algal blooms (see:{' '}
                <a
                  href="https://www.epa.gov/sciencematters/wildfires-how-do-they-affect-our-water-supplies"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Wildfires: How Do They Affect Our Water Supplies?
                </a>
                ).
              </span>
              <span css={paragraphStyles}>
                <strong>Extreme heat</strong>: In many areas, increased water
                temperatures (linked to increasing air temperature) will cause
                eutrophication and excess algal growth, which may reduce
                drinking water quality (see:{' '}
                <a
                  href="https://www.epa.gov/arc-x/climate-impacts-water-quality"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Climate Impacts on Water Quality
                </a>
                ).
              </span>
              <span css={paragraphStyles}>
                <strong>Extreme cold</strong>: Water and wastewater utilities
                are vulnerable to extreme cold and winter storms. Freezing
                temperatures and winter storms can damage pipes, restrict water
                intakes, and disrupt water services to communities (see:{' '}
                <a
                  href="https://19january2017snapshot.epa.gov/sites/production/files/2015-06/documents/extreme_cold_and_winter_storms.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Incident Action Checklist – Extreme Cold and Winter Storms
                  (PDF)
                </a>
                ).
              </span>
            </>
          }
        />
      </div>

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
      in{' '}
      <GlossaryTerm term="Significant Violations">
        significant violation
      </GlossaryTerm>{' '}
      of their permit.
    </p>
  );
}

function RestoreUpper() {
  return (
    <p>
      Efforts are underway to restore your community’s water through grants and
      clean-up plans at the local, state, and federal level. View restoration
      plans and EPA funded{' '}
      <GlossaryTerm term="Nonpoint Source Pollution">
        Nonpoint Source
      </GlossaryTerm>{' '}
      restoration projects.
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
      boundariesLayer: true,
      searchIconLayer: true,
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
    upper: <AquaticLifeUpper />,
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
    upper: <DrinkingWaterUpper />,
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
    upper: <MonitoringUpper />,
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
    upper: <ExtremeWeatherUpper />,
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
    upper: <IdentifiedIssuesUpper />,
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
    upper: <RestoreUpper />,
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
    upper: <ProtectUpper />,
    lower: <Protect />,
    layers: {
      boundariesLayer: true,
      searchIconLayer: true,
    },
  },
];

export { tabs };
