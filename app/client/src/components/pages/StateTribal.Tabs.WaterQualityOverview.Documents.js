// @flow

import React, { useEffect, useState } from 'react';
import { css } from 'styled-components/macro';
// components
import DynamicExitDisclaimer from 'components/shared/DynamicExitDisclaimer';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import ReactTable from 'components/shared/ReactTable';
// contexts
import { useDocumentOrderContext } from 'contexts/LookupFiles';
// utilities
import { getExtensionFromPath } from 'utils/utils';
// styled components
import { errorBoxStyles, infoBoxStyles } from 'components/shared/MessageBoxes';
// errors
import {
  stateDocumentError,
  stateDocumentSortingError,
  stateSurveyError,
} from 'config/errorMessages';

// Sorts the documents differently depending on the status provided.
// If the status is success, the documents will be sorted using the ordering in the
//  document order lookup file and then alphabetically on the document name column.
// If the status is failure, the documents will be sorted alphabetically on the
//  document types column and then and then alphabetically on the document name column.
function sortDocuments(documents, status) {
  return documents.sort((a, b) => {
    // sort document type order numerically if the documentOrder lookup was successful
    if (status === 'success' && a.order !== b.order) {
      return a.order - b.order;
    }

    // sort document type alphabetically if the documentOrder lookup failed
    if (status === 'failure' && a.documentTypeLabel !== b.documentTypeLabel) {
      return a.documentTypeLabel.localeCompare(b.documentTypeLabel);
    }

    // then by document name
    else return a.documentName.localeCompare(b.documentName);
  });
}

const containerStyles = css`
  p {
    padding-bottom: 1.25rem;
  }

  .ReactTable {
    margin-bottom: 1.25rem;
  }

  em {
    display: block;
    margin-bottom: 0.5em;
  }

  h3 {
    margin-bottom: 0px;
  }
`;

const modifiedInfoBoxStyles = css`
  ${infoBoxStyles}
  margin-bottom: 0.5em;
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles}

  p {
    padding-bottom: 0;
  }
  margin-bottom: 1.25rem;
`;

// --- components (Documents) ---
type Props = {
  activeState: {
    value: string,
    label: string,
    source: 'All' | 'State' | 'Tribe',
  },
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
  const [surveyDocumentsRanked, setSurveyDocumentsRanked] = useState([]);
  const [assessmentDocumentsRanked, setAssessmentDocumentsRanked] = useState(
    [],
  );

  const documentOrder = useDocumentOrderContext();

  useEffect(() => {
    if (documentOrder.status === 'fetching') return;

    const rankings =
      documentOrder.status === 'success'
        ? documentOrder.data.surveysOrdering
        : {};
    const documentsRanked = getDocumentTypeOrder(surveyDocuments, rankings);

    setSurveyDocumentsRanked(documentsRanked);
  }, [surveyDocuments, documentOrder]);

  useEffect(() => {
    if (documentOrder.status === 'fetching') return;

    const rankings =
      documentOrder.status === 'success'
        ? documentOrder.data.integratedReportOrdering
        : {};
    const documentsRanked = getDocumentTypeOrder(assessmentDocuments, rankings);

    setAssessmentDocumentsRanked(documentsRanked);
  }, [assessmentDocuments, documentOrder]);

  const getDocumentTypeOrder = (documents: Array<Object>, ranks: Object) => {
    let documentsRanked = [];
    documents.forEach((document) => {
      // get document ordering
      let order = 999; // large initial order
      if (!document.documentTypes || document.documentTypes.length === 0) {
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

  const assessmentDocumentsSorted = sortDocuments(
    assessmentDocumentsRanked,
    documentOrder.status,
  );

  const surveyDocumentsSorted = sortDocuments(
    surveyDocumentsRanked,
    documentOrder.status,
  );

  if (activeState.value === '') return null;

  return (
    <div css={containerStyles}>
      <h3>Documents Related to Integrated Report</h3>
      <em>Select a document below to download a copy of the report.</em>
      {assessmentsLoading || documentOrder.status === 'fetching' ? (
        <LoadingSpinner />
      ) : documentServiceError ? (
        <div css={modifiedErrorBoxStyles}>
          <p>{stateDocumentError(activeState.label)}</p>
        </div>
      ) : (
        <>
          {documentOrder.status === 'failure' && (
            <div css={modifiedInfoBoxStyles}>{stateDocumentSortingError}</div>
          )}
          <DocumentsTable
            documents={assessmentDocumentsSorted}
            type="integrated report"
          />
        </>
      )}

      {activeState.source !== 'Tribe' && (
        <>
          <h3>Documents Related to Statewide Statistical Surveys</h3>

          {surveyLoading || documentOrder.status === 'fetching' ? (
            <LoadingSpinner />
          ) : surveyServiceError ? (
            <div css={modifiedErrorBoxStyles}>
              <p>{stateSurveyError(activeState.label)}</p>
            </div>
          ) : (
            <>
              {documentOrder.status === 'failure' && (
                <div css={modifiedInfoBoxStyles}>
                  {stateDocumentSortingError}
                </div>
              )}
              <DocumentsTable
                documents={surveyDocumentsSorted}
                type="statewide statistical survey"
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

// --- components (DocumentsTable) ---
type DocumentsTableProps = {
  documents: Array<Object>,
  type: string,
};

function DocumentsTable({ documents, type }: DocumentsTableProps) {
  if (documents.length === 0)
    return <p>No {type} documents available for this state.</p>;

  return (
    <ReactTable
      data={documents}
      getColumns={(tableWidth) => {
        let docNameWidth = 0;

        // make the document name column take up the remaining widht of the table
        // table width - document type width - agency code width - border
        if (tableWidth > 425) docNameWidth = tableWidth - 300 - 125 - 3;

        // ensure the document name column is atleast 372px wide
        if (docNameWidth < 372) docNameWidth = 372;

        return [
          {
            accessor: 'documentTypeLabel',
            Header: 'Document Types',
            width: 300,
          },
          {
            accessor: 'documentName',
            Header: 'Document',
            width: docNameWidth,
            Render: (cell) => {
              return (
                <>
                  <a
                    href={cell.row.original.documentURL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {cell.value} (
                    {getExtensionFromPath(
                      cell.row.original.documentFileName,
                      cell.row.original.documentURL,
                    )}
                    )
                  </a>
                  <DynamicExitDisclaimer url={cell.row.original.documentURL} />
                </>
              );
            },
          },
          {
            accessor: 'agencyCode',
            Header: 'Agency Code',
            width: 125,
            Render: (cell) => {
              if (cell.value === 'S') return 'State';
              if (cell.value === 'E') return 'EPA';
              return cell.value;
            },
          },
        ];
      }}
    />
  );
}

export default Documents;
