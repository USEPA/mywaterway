// @flow

import React, { useContext } from 'react';
import { css } from 'styled-components/macro';
// components
import AssessmentSummary from 'components/shared/AssessmentSummary';
import WaterbodyList from 'components/shared/WaterbodyList';
import TabErrorBoundary from 'components/shared/ErrorBoundary/TabErrorBoundary';
// styled components
import { errorBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
// utilities
import { useWaterbodyFeatures, useWaterbodyOnMap } from 'utils/hooks';
import { summarizeAssessments } from 'utils/utils';
// errors
import { huc12SummaryError } from 'config/errorMessages';

const containerStyles = css`
  padding: 1em;
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles};
  margin-bottom: 1em;
  text-align: center;
`;

function Swimming() {
  const { watershed, cipSummary } = useContext(LocationSearchContext);

  // set the waterbody features
  const waterbodies = useWaterbodyFeatures();

  // draw the waterbody (swimming) on the map
  useWaterbodyOnMap('recreation_use');

  const summary = summarizeAssessments(waterbodies, 'recreation_use');

  return (
    <div css={containerStyles}>
      {cipSummary.status === 'failure' && (
        <div css={modifiedErrorBoxStyles}>
          <p>{huc12SummaryError}</p>
        </div>
      )}

      {cipSummary.status !== 'failure' && (
        <>
          <AssessmentSummary
            waterbodies={waterbodies}
            fieldName="recreation_use"
            usageName="swimming and boating"
          />

          <WaterbodyList
            waterbodies={waterbodies}
            fieldName="recreation_use"
            title={
              <>
                <strong>{summary.total.toLocaleString()}</strong> waterbodies
                assessed for swimming and boating in the <em>{watershed}</em>{' '}
                watershed.
              </>
            }
          />
        </>
      )}
    </div>
  );
}

export default function SwimmingContainer({ ...props }: Props) {
  return (
    <TabErrorBoundary tabName="Swimming">
      <Swimming {...props} />
    </TabErrorBoundary>
  );
}
