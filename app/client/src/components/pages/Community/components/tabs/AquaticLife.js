// @flow

import React from 'react';
import styled from 'styled-components';
// components
import TabErrorBoundary from 'components/shared/ErrorBoundary/TabErrorBoundary';
import AssessmentSummary from 'components/shared/AssessmentSummary';
import WaterbodyList from 'components/shared/WaterbodyList';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
// utilities
import { useWaterbodyFeatures, useWaterbodyOnMap } from 'utils/hooks';

// --- styled components ---
const Container = styled.div`
  padding: 1em;
`;

// --- components ---
type Props = {
  // props passed implicitly in Community component
  esriModules: Object,
};

function AquaticLife({ esriModules, infoToggleChecked }: Props) {
  const { watershed } = React.useContext(LocationSearchContext);

  const waterbodies = useWaterbodyFeatures();

  useWaterbodyOnMap('ecological_use');

  return (
    <Container>
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
    </Container>
  );
}

export default function AquaticLifeContainer({ ...props }: Props) {
  return (
    <TabErrorBoundary tabName="Aquatic Life">
      <AquaticLife {...props} />
    </TabErrorBoundary>
  );
}
