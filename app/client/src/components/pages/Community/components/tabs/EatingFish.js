// @flow

import React from 'react';
import styled from 'styled-components';
// components
import TabErrorBoundary from 'components/shared/ErrorBoundary/TabErrorBoundary';
import AssessmentSummary from 'components/shared/AssessmentSummary';
import WaterbodyList from 'components/shared/WaterbodyList';
import DisclaimerModal from 'components/shared/DisclaimerModal';
import ShowLessMore from 'components/shared/ShowLessMore';
// contexts
import { CommunityTabsContext } from 'contexts/CommunityTabs';
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
  padding: 0 1em 1em;
`;

const Disclaimer = styled(DisclaimerModal)`
  bottom: 1.25rem;
`;

// --- components ---
function EatingFish() {
  const { infoToggleChecked } = React.useContext(CommunityTabsContext);

  const {
    watershed,
    fishingInfo,
    statesData, //
  } = React.useContext(LocationSearchContext);

  const waterbodies = useWaterbodyFeatures();

  useWaterbodyOnMap('fishconsumption_use');

  return (
    <Container>
      {infoToggleChecked && (
        <>
          <p>
            Eating fish and shellfish caught in impaired waters can pose health
            risks. For the {watershed} watershed, be sure to look for posted
            fish advisories or consult your local or state environmental health
            department for{' '}
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
                      {convertStateCode(state.stateCode, statesData.data)}
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
              Users of this application should not rely on information relating
              to environmental laws and regulations posted on this application.
              Application users are solely responsible for ensuring that they
              are in compliance with all relevant environmental laws and
              regulations. In addition, EPA cannot attest to the accuracy of
              data provided by organizations outside of the federal government.
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
        subTitle="All links below open a new browser tab."
      />
    </Container>
  );
}

export default function EatingFishContainer({ ...props }: Props) {
  return (
    <TabErrorBoundary tabName="Eating Fish">
      <EatingFish {...props} />
    </TabErrorBoundary>
  );
}
