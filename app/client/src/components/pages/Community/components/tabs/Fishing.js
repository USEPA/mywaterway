// @flow

import React from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import styled from 'styled-components';
// components
import TabErrorBoundary from 'components/shared/ErrorBoundary/TabErrorBoundary';
import { ContentTabs } from 'components/shared/ContentTabs';
import AssessmentSummary from 'components/shared/AssessmentSummary';
import WaterbodyList from 'components/shared/WaterbodyList';
import DisclaimerModal from 'components/shared/DisclaimerModal';
import ShowLessMore from 'components/shared/ShowLessMore';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
// utilities
import { useWaterbodyFeatures, useWaterbodyOnMap } from 'utils/hooks';

// given a state code like AL and an array of state objects from attains states service,
// returns the full name of the state
function convertStateCode(stateCode: string, stateData: Array<Object>) {
  if (stateData.length === 0) return stateCode;
  const matchingState = stateData.filter((s) => s.code === stateCode)[0];
  return matchingState ? matchingState.name : stateCode;
}

// grammatically correct way of separating list items
// used to prepend commas/and before a list item
function addSerialComma(index: number, arrayLength: number) {
  // first item in list
  if (index === 0) return '';
  // not the first or last item in list
  if (index !== 0 && index !== arrayLength - 1) return ', ';
  // last item in list
  if (index === arrayLength - 1) return ' and ';
}

// --- styled components ---
const Container = styled.div`
  padding: 1em;
`;

const Disclaimer = styled(DisclaimerModal)`
  bottom: 1.25rem;
`;

// --- components ---
type Props = {
  // props passed implicitly in Community component
  esriModules: Object,
  infoToggleChecked: boolean,
};

function Fishing({ esriModules, infoToggleChecked }: Props) {
  const {
    watershed,
    fishingInfo,
    statesData, //
  } = React.useContext(LocationSearchContext);

  const waterbodies = useWaterbodyFeatures();

  // redefine waterbodies when a tab changes
  const [currentTabIndex, setCurrentTabIndex] = React.useState(0);

  const [
    attributeName,
    setAttributeName, //
  ] = React.useState('fishconsumption_use');

  React.useEffect(() => {
    // wait until waterbodies data is set from custom useWaterbodyFeatures() hook
    if (!waterbodies) return;

    let attributeName;
    if (currentTabIndex === 0) attributeName = 'fishconsumption_use';
    if (currentTabIndex === 1) attributeName = 'ecological_use';
    setAttributeName(attributeName);
  }, [currentTabIndex, attributeName, waterbodies]);

  useWaterbodyOnMap(attributeName);

  return (
    <Container>
      <ContentTabs>
        <Tabs onChange={(index) => setCurrentTabIndex(index)}>
          <TabList>
            <Tab>Fish Consumption</Tab>
            <Tab>What is the status of aquatic life?</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              {infoToggleChecked && (
                <>
                  <p>
                    Eating fish and shellfish caught in impaired waters can pose
                    health risks. For the {watershed} watershed, be sure to look
                    for posted fish advisories or consult your local or state
                    environmental health department for{' '}
                    {fishingInfo.status === 'success' ? (
                      <>
                        {fishingInfo.data.map((state, index, array) => (
                          <React.Fragment key={index}>
                            {addSerialComma(index, array.length)}
                            <a
                              href={state.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {convertStateCode(
                                state.stateCode,
                                statesData.data,
                              )}
                            </a>
                          </React.Fragment>
                        ))}
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
                      'your state.'
                    )}
                    <ShowLessMore
                      charLimit={0}
                      text={`
                        The information in How’s My Waterway about the safety of
                        eating fish caught recreationally should only be
                        considered as general reference. Please consult with your
                        state for local or state-wide fish advisories.
                      `}
                    />
                  </p>

                  <Disclaimer>
                    <p>
                      Users of this application should not rely on information
                      relating to environmental laws and regulations posted on
                      this application. Application users are solely responsible
                      for ensuring that they are in compliance with all relevant
                      environmental laws and regulations. In addition, EPA
                      cannot attest to the accuracy of data provided by
                      organizations outside of the federal government.
                    </p>
                  </Disclaimer>
                </>
              )}

              <AssessmentSummary
                waterbodies={waterbodies}
                fieldName="fishconsumption_use"
                usageName="fish and shellfish consumption"
              />

              <WaterbodyList
                waterbodies={waterbodies}
                fieldName="fishconsumption_use"
                usageName="Fish and Shellfish Consumption"
                title={`Waterbodies assessed for fish and shellfish consumption in the ${watershed} watershed.`}
              />
            </TabPanel>

            <TabPanel>
              {infoToggleChecked && (
                <>
                  <p>
                    Plants and animals depend on clean water. Impairments can
                    affect the quality of water, which can have adverse effects
                    on plants and animals living in the water.
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
                      Users of this application should not rely on information
                      relating to environmental laws and regulations posted on
                      this application. Application users are solely responsible
                      for ensuring that they are in compliance with all relevant
                      environmental laws and regulations. In addition, EPA
                      cannot attest to the accuracy of data provided by
                      organizations outside of the federal government.
                    </p>
                  </Disclaimer>
                </>
              )}

              <AssessmentSummary
                waterbodies={waterbodies}
                fieldName="ecological_use"
                usageName="aquatic life"
              />

              <WaterbodyList
                waterbodies={waterbodies}
                fieldName="ecological_use"
                usageName="Aquatic Life"
                title={`Waterbodies assessed for aquatic life in the ${watershed} watershed.`}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </ContentTabs>
    </Container>
  );
}

export default function FishingContainer({ ...props }: Props) {
  return (
    <TabErrorBoundary tabName="Fishing">
      <Fishing {...props} />
    </TabErrorBoundary>
  );
}
