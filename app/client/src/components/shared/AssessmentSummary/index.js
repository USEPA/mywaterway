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

function summarizeAssessments(waterbodies: Array<Object>, fieldName: string) {
  const summary = {
    total: 0,
    unassessed: 0,
    not_supporting: 0,
    fully_supporting: 0,
    insufficient_info: 0,
    not_assessed: 0,
    not_applicable: 0,
  };

  // ids will contain unique assessment unit id's of each waterbody,
  // to ensure we don't count a unique waterbody more than once
  const ids = [];

  waterbodies.forEach((graphic) => {
    const field = graphic.attributes[fieldName];
    const { assessmentunitidentifier: id } = graphic.attributes;

    if (!field || field === 'X') {
      summary.not_applicable++;
    } else {
      if (ids.indexOf(id) === -1) {
        ids.push(id);
        if (field === 'not_supporting' || field === 'fully_supporting') {
          summary.total++;
        }
        summary[field]++;
      }
    }
  });

  return summary;
}

const containerStyles = css`
  margin: 1em;
`;

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
    <div css={containerStyles}>
      <p css={modifiedInfoBoxStyles}>
        <strong>{summary.total.toLocaleString()}</strong> waterbodies have been
        assessed for{' '}
        {glossaryUsageNames.includes(usageName) ? (
          <GlossaryTerm term={usageName}>{usageName}</GlossaryTerm>
        ) : (
          usageName
        )}
      </p>

      {summary.total > 0 && (
        <div css={keyMetricsStyles}>
          <div css={keyMetricStyles}>
            <span css={keyMetricNumberStyles}>
              {summary.fully_supporting.toLocaleString()}
            </span>
            <p css={keyMetricLabelStyles}>Good</p>
          </div>
          <div css={keyMetricStyles}>
            <span css={keyMetricNumberStyles}>
              {summary.not_supporting.toLocaleString()}
            </span>
            <p css={keyMetricLabelStyles}>Impaired</p>
          </div>
          <div css={keyMetricStyles}>
            <span css={keyMetricNumberStyles}>
              {(
                summary.unassessed +
                summary.insufficient_info +
                summary.not_assessed
              ).toLocaleString()}
            </span>
            <p css={keyMetricLabelStyles}>Condition Unknown</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssessmentSummary;
