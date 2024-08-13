/** @jsxImportSource @emotion/react */

import { css } from '@emotion/react';
import { useContext } from 'react';
// components
import TabErrorBoundary from '@/components/shared/ErrorBoundary.TabErrorBoundary';
import AssessmentSummary from '@/components/shared/AssessmentSummary';
import WaterbodyList from '@/components/shared/WaterbodyList';
// contexts
import { LocationSearchContext } from '@/contexts/locationSearch';
// utilities
import { useWaterbodyFeatures, useWaterbodyOnMap } from '@/utils/hooks';
import { summarizeAssessments } from '@/utils/utils';

const containerStyles = css`
  @media (min-width: 960px) {
    padding: 1em;
  }
`;

function EatingFish() {
  const { watershed } = useContext(LocationSearchContext);

  const waterbodies = useWaterbodyFeatures();

  useWaterbodyOnMap('fishconsumption_use');

  const summary = summarizeAssessments(waterbodies, 'fishconsumption_use');

  return (
    <div css={containerStyles}>
      <AssessmentSummary
        waterbodies={waterbodies}
        fieldName="fishconsumption_use"
        usageName="fish and shellfish consumption"
      />

      <WaterbodyList
        waterbodies={waterbodies}
        fieldName="fishconsumption_use"
        title={
          <>
            There {summary.total === 1 ? 'is' : 'are'}{' '}
            <strong>{summary.total.toLocaleString()}</strong>{' '}
            {summary.total === 1 ? 'waterbody' : 'waterbodies'} assessed for
            fish and shellfish consumption in the <em>{watershed.name}</em>{' '}
            watershed.
          </>
        }
      />
    </div>
  );
}

export default function EatingFishContainer() {
  return (
    <TabErrorBoundary tabName="Eating Fish">
      <EatingFish />
    </TabErrorBoundary>
  );
}
