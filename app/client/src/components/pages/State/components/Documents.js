// @flow

import React from 'react';
import styled from 'styled-components';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import Table from 'components/shared/Table';
// styled components
import { StyledErrorBox } from 'components/shared/MessageBoxes';
// data
import {
  integratedReportOrdering,
  surveysOrdering,
} from 'components/pages/State/lookups/documentOrder';
// errors
import { stateDocumentError, stateSurveyError } from 'config/errorMessages';

// --- styled components ---
const Container = styled.div`
  p {
    padding-bottom: 1.25rem;
  }

  .ReactTable {
    margin-bottom: 1.25rem;
  }
`;

const ErrorBox = styled(StyledErrorBox)`
  p {
    padding-bottom: 0;
  }
  margin-bottom: 1.25rem;
`;

// --- components ---
type Props = {
  activeState: { code: string, name: string },
  surveyLoading: boolean,
  surveyDocuments: Object,
  assessmentsLoading: boolean,
  documentServiceError: boolean,
  surveyServiceError: boolean,
};

function Documents({
  activeState,
  surveyLoading,
  surveyDocuments,
  assessmentsLoading,
  assessmentDocuments,
  documentServiceError,
  surveyServiceError,
}: Props) {
  const [surveyDocumentsRanked, setSurveyDocumentsRanked] = React.useState([]);
  const [
    assessmentDocumentsRanked,
    setAssessmentDocumentsRanked,
  ] = React.useState([]);

  React.useEffect(() => {
    const documentsRanked = getDocumentTypeOrder(
      surveyDocuments,
      surveysOrdering,
    );

    setSurveyDocumentsRanked(documentsRanked);
  }, [surveyDocuments]);

  React.useEffect(() => {
    const documentsRanked = getDocumentTypeOrder(
      assessmentDocuments,
      integratedReportOrdering,
    );

    setAssessmentDocumentsRanked(documentsRanked);
  }, [assessmentDocuments]);

  const getDocumentTypeOrder = (documents: Array<Object>, ranks: Object) => {
    let documentsRanked = [];
    documents.forEach((document) => {
      // get document ordering
      let order = 999; // large initial order
      if (document.documentTypes.length === 0) {
        const documentRanked = {
          ...document,
          order: order,
          documentTypeLabel: '',
        };
        documentsRanked.push(documentRanked);
      } else {
        document.documentTypes.forEach((documentType) => {
          const documentRanked = {
            ...document,
            order: ranks[documentType.documentTypeCode],
            documentTypeLabel: documentType.documentTypeCode,
          };
          documentsRanked.push(documentRanked);
        });
      }
    });

    return documentsRanked;
  };

  function DocumentsTable({ documents, type }) {
    if (documents.length === 0)
      return <p>No {type} documents available for this state.</p>;

    return (
      <Table
        dataIdColumn="documentURL"
        data={documents}
        header={[
          {
            accessor: 'documentTypeLabel',
            Header: 'Document Types',
            style: { textAlign: 'center' },
            Cell: (props) => props.value,
          },
          {
            accessor: 'documentName',
            Header: 'Document',
            style: { textAlign: 'center' },
            Cell: (props) => (
              <a
                href={props.original.documentURL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {props.value}
              </a>
            ),
          },
          {
            accessor: 'agencyCode',
            Header: 'Agency Code',
            style: { textAlign: 'center' },
            minWidth: 50,
            Cell: (props) =>
              props.value === 'S'
                ? 'State'
                : props.value === 'E'
                ? 'EPA'
                : props.value,
          },
          {
            accessor: 'documentDescription',
            Header: 'Document Description',
            style: { textAlign: 'center' },
          },
        ]}
      />
    );
  }

  const assessmentDocumentsSorted = assessmentDocumentsRanked.sort((a, b) => {
    // sort by document type
    if (a.order !== b.order) {
      return a.order - b.order;
    }

    // then by document name
    else return a.documentName.localeCompare(b.documentName);
  });

  const surveyDocumentsSorted = surveyDocumentsRanked.sort((a, b) => {
    // sort by document type
    if (a.order !== b.order) {
      return a.order - b.order;
    }

    // then by document name
    else return a.documentName.localeCompare(b.documentName);
  });

  if (activeState.code === '') return null;

  return (
    <Container>
      <h3>Documents Related to Integrated Report</h3>

      {assessmentsLoading ? (
        <LoadingSpinner />
      ) : documentServiceError ? (
        <ErrorBox>
          <p>{stateDocumentError(activeState.name)}</p>
        </ErrorBox>
      ) : (
        <DocumentsTable
          documents={assessmentDocumentsSorted}
          type="integrated report"
        />
      )}

      <h3>Documents Related to Statewide Statistical Surveys</h3>

      {surveyLoading ? (
        <LoadingSpinner />
      ) : surveyServiceError ? (
        <ErrorBox>
          <p>{stateSurveyError(activeState.name)}</p>
        </ErrorBox>
      ) : (
        <DocumentsTable
          documents={surveyDocumentsSorted}
          type="statewide statistical survey"
        />
      )}
    </Container>
  );
}

export default Documents;
