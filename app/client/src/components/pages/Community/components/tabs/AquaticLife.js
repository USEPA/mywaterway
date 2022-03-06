// @flow

import React, { useContext } from 'react';
import { css } from 'styled-components/macro';
// components
import TabErrorBoundary from 'components/shared/ErrorBoundary/TabErrorBoundary';
import AssessmentSummary from 'components/shared/AssessmentSummary';
import WaterbodyList from 'components/shared/WaterbodyList';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
// utilities
import { useWaterbodyFeatures, useWaterbodyOnMap } from 'utils/hooks';
import { summarizeAssessments } from 'utils/utils';

const containerStyles = css`
  @media (min-width: 960px) {
    padding: 1em;
  }
`;

function AquaticLife() {
  const { watershed } = useContext(LocationSearchContext);

  const waterbodies = useWaterbodyFeatures();

  useWaterbodyOnMap('ecological_use');

  const summary = summarizeAssessments(waterbodies, 'ecological_use');

  return (
    <div css={containerStyles}>
      <AssessmentSummary
        waterbodies={waterbodies}
        fieldName="ecological_use"
        usageName="aquatic life"
      />

      <WaterbodyList
        waterbodies={waterbodies}
        fieldName="ecological_use"
        title={
          <>
            There {summary.total === 1 ? 'is' : 'are'}{' '}
            <strong>{summary.total.toLocaleString()}</strong>{' '}
            {summary.total === 1 ? 'waterbody' : 'waterbodies'} assessed for
            aquatic life in the <em>{watershed}</em> watershed.
          </>
        }
      />
    </div>
  );
}

export default function AquaticLifeContainer({ ...props }: Props) {
  return (
    <TabErrorBoundary tabName="Aquatic Life">
      <AquaticLife {...props} />
    </TabErrorBoundary>
  );
}
