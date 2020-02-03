// @flow

import React from 'react';
import styled from 'styled-components';
// components
import AssessmentSummary from 'components/shared/AssessmentSummary';
import WaterbodyList from 'components/shared/WaterbodyList';
import TabErrorBoundary from 'components/shared/ErrorBoundary/TabErrorBoundary';
// styled components
import { StyledErrorBox } from 'components/shared/MessageBoxes';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
// utilities
import { useWaterbodyFeatures, useWaterbodyOnMap } from 'utils/hooks';
// errors
import { huc12SummaryError } from 'config/errorMessages';

// --- components ---
type Props = {
  // props passed implicitly in Community component
  esriModules: Object,
  infoToggleChecked: boolean,
};

const ErrorBox = styled(StyledErrorBox)`
  margin: 1rem;
`;

function Swimming({ esriModules, infoToggleChecked }: Props) {
  const { watershed, cipSummary } = React.useContext(LocationSearchContext);

  // set the waterbody features
  const waterbodies = useWaterbodyFeatures();

  // draw the waterbody (swimming) on the map
  useWaterbodyOnMap('recreation_use');

  // if huc12summaryservice is down
  if (cipSummary.status === 'failure')
    return (
      <ErrorBox>
        <p>{huc12SummaryError}</p>
      </ErrorBox>
    );

  return (
    <>
      <AssessmentSummary
        waterbodies={waterbodies}
        fieldName="recreation_use"
        usageName="swimming and boating"
      />

      <WaterbodyList
        waterbodies={waterbodies}
        fieldName="recreation_use"
        usageName="Swimming and Boating"
        title={`Waterbodies assessed for swimming and boating in the ${watershed} watershed.`}
      />
    </>
  );
}

export default function SwimmingContainer({ ...props }: Props) {
  return (
    <TabErrorBoundary tabName="Swimming">
      <Swimming {...props} />
    </TabErrorBoundary>
  );
}
