// @flow

import React from 'react';
import { css } from 'styled-components/macro';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import {
  keyMetricsStyles,
  keyMetricStyles,
  keyMetricNumberStyles,
  keyMetricLabelStyles,
} from 'components/shared/KeyMetrics';
import { infoBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
// utils
import { summarizeAssessments } from 'utils/utils';

const modifiedInfoBoxStyles = css`
  ${infoBoxStyles};
  margin-bottom: 1em;
  text-align: center;
`;

// --- components ---
type Props = {
  waterbodies: Array<Object>,
  fieldName: string,
  usageName: string,
};

function AssessmentSummary({ waterbodies, fieldName, usageName }: Props) {
  const { cipSummary } = React.useContext(LocationSearchContext);

  if (cipSummary.status === 'failure') return null;

  if (!waterbodies) return <LoadingSpinner />;

  const summary = summarizeAssessments(waterbodies, fieldName);

  const glossaryUsageNames = ['aquatic life', 'fish and shellfish consumption'];

  return (
    <>
      <div css={modifiedInfoBoxStyles}>
        <p>
          <strong>{summary.total.toLocaleString()}</strong>{' '}
          {summary.total === 1 ? 'waterbody has' : 'waterbodies have'} been
          assessed for{' '}
          {glossaryUsageNames.includes(usageName) ? (
            <GlossaryTerm term={usageName}>{usageName}</GlossaryTerm>
          ) : (
            usageName
          )}
        </p>
      </div>

      {summary.total > 0 && (
        <div css={keyMetricsStyles}>
          <div css={keyMetricStyles}>
            <span css={keyMetricNumberStyles}>
              {summary['Fully Supporting'].toLocaleString()}
            </span>
            <p css={keyMetricLabelStyles}>Good</p>
          </div>
          <div css={keyMetricStyles}>
            <span css={keyMetricNumberStyles}>
              {summary['Not Supporting'].toLocaleString()}
            </span>
            <p css={keyMetricLabelStyles}>Impaired</p>
          </div>
          <div css={keyMetricStyles}>
            <span css={keyMetricNumberStyles}>
              {(
                summary.unassessed +
                summary['Insufficient Information'] +
                summary['Not Assessed']
              ).toLocaleString()}
            </span>
            <p css={keyMetricLabelStyles}>Condition Unknown</p>
          </div>
        </div>
      )}
    </>
  );
}

export default AssessmentSummary;
