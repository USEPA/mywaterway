// @flow

import React from 'react';
import styled from 'styled-components';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
// styled components
import {
  StyledMetrics,
  StyledMetric,
  StyledNumber,
  StyledLabel,
} from 'components/shared/KeyMetrics';
import { StyledInfoBox } from 'components/shared/MessageBoxes';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';

function summarizeAssessments(waterbodies: Array<Object>, fieldName: string) {
  const summary = {
    total: 0,
    unassessed: 0,
    'Not Supporting': 0,
    'Fully Supporting': 0,
    'Insufficient Information': 0,
    'Not Assessed': 0,
    'Not Applicable': 0,
  };

  // ids will contain unique assessment unit id's of each waterbody,
  // to ensure we don't count a unique waterbody more than once
  const ids = [];

  waterbodies.forEach(graphic => {
    const field = graphic.attributes[fieldName];
    const { assessmentunitidentifier: id } = graphic.attributes;

    if (!field || field === 'X') {
      summary['Not Applicable']++;
    } else {
      if (ids.indexOf(id) === -1) {
        ids.push(id);
        if (field === 'Not Supporting' || field === 'Fully Supporting') {
          summary.total++;
        }
        summary[field]++;
      }
    }
  });

  return summary;
}

// --- styled components ---
const Container = styled.div`
  margin: 1em;
`;

const Total = styled.p`
  padding-bottom: 0.5em;
  text-align: center;
`;

const InfoBoxContainer = styled.div`
  padding-bottom: 1em;
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
    <Container>
      <InfoBoxContainer>
        <StyledInfoBox>
          <Total>
            <strong>{summary.total.toLocaleString()}</strong> waterbodies have
            been assessed for{' '}
            {glossaryUsageNames.indexOf(usageName) !== -1 ? (
              <GlossaryTerm term={usageName}>{usageName}</GlossaryTerm>
            ) : (
              usageName
            )}
          </Total>
        </StyledInfoBox>
      </InfoBoxContainer>
      {summary.total > 0 && (
        <StyledMetrics>
          <StyledMetric>
            <StyledNumber>
              {summary['Fully Supporting'].toLocaleString()}
            </StyledNumber>
            <StyledLabel>Good</StyledLabel>
          </StyledMetric>
          <StyledMetric>
            <StyledNumber>
              {summary['Not Supporting'].toLocaleString()}
            </StyledNumber>
            <StyledLabel>Impaired</StyledLabel>
          </StyledMetric>
          <StyledMetric>
            <StyledNumber>
              {(
                summary.unassessed +
                summary['Insufficient Information'] +
                summary['Not Assessed']
              ).toLocaleString()}
            </StyledNumber>
            <StyledLabel>Condition Unknown</StyledLabel>
          </StyledMetric>
        </StyledMetrics>
      )}
    </Container>
  );
}

export default AssessmentSummary;
