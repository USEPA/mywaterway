// @flow
/** @jsxImportSource @emotion/react */

import { css } from '@emotion/react';
// components
import DynamicExitDisclaimer from 'components/shared/DynamicExitDisclaimer';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import ReactTable from 'components/shared/ReactTable';
// contexts
import { useConfigFilesState } from 'contexts/ConfigFiles';
// utilities
import { getExtensionFromPath } from 'utils/utils';
// styled components
import { errorBoxStyles } from 'components/shared/MessageBoxes';
import { h3Styles } from 'styles/stateTribal';
// errors
import { stateDocumentError, stateSurveyError } from 'config/errorMessages';

// Sorts the documents differently depending on the status provided.
// If the status is success, the documents will be sorted using the ordering in the
//  document order lookup file and then alphabetically on the document name column.
// If the status is failure, the documents will be sorted alphabetically on the
//  document types column and then and then alphabetically on the document name column.
function sortDocuments(documents) {
  return documents.sort((a, b) => {
    // sort document type order numerically if the documentOrder lookup was successful
    if (a.order !== b.order) {
      return a.order - b.order;
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
    ${h3Styles}
    margin-bottom: 0px;
  }
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles}

  p {
    padding-bottom: 0;
  }
  margin-bottom: 1.25rem;
`;

// --- components (Documents) ---
type ActiveState = {
  value: string,
  label: string,
  source: 'All' | 'State' | 'Tribe',
};

type Props = {
  activeState: ActiveState,
  organizationData: Object,
  surveyLoading: boolean,
  surveyDocuments: Object,
  surveyServiceError: boolean,
};

function Documents({
  activeState,
  organizationData,
  surveyLoading,
  surveyDocuments,
  surveyServiceError,
}: Props) {
  const configFiles = useConfigFilesState();

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

  // rank survey documents
  let surveyDocumentsRanked = [];
  surveyDocumentsRanked = getDocumentTypeOrder(
    surveyDocuments,
    configFiles.data.documentOrder.surveysOrdering,
  );

  // rank assessment documents
  let assessmentDocumentsRanked = [];
  if (
    organizationData.status === 'success' &&
    organizationData.data?.documents
  ) {
    assessmentDocumentsRanked = getDocumentTypeOrder(
      organizationData.data.documents,
      configFiles.data.documentOrder.integratedReportOrdering,
    );
  }

  const assessmentDocumentsSorted = sortDocuments(assessmentDocumentsRanked);

  const surveyDocumentsSorted = sortDocuments(surveyDocumentsRanked);

  if (activeState.value === '') return null;

  const docType =
    activeState.source === 'Tribe' ? 'Assessment' : 'Integrated Report';

  return (
    <div css={containerStyles}>
      <h3>Documents Related to {docType}</h3>

      {organizationData.status === 'fetching' && <LoadingSpinner />}
      {organizationData.status === 'failure' && (
        <div css={modifiedErrorBoxStyles}>
          <p>{stateDocumentError(activeState.label, docType.toLowerCase())}</p>
        </div>
      )}
      {organizationData.status === 'success' && (
        <>
          <DocumentsTable
            activeState={activeState}
            documents={assessmentDocumentsSorted}
            type={docType.toLowerCase()}
          />
        </>
      )}

      {activeState.source !== 'Tribe' && (
        <>
          <h3>Documents Related to Statewide Statistical Surveys</h3>

          {surveyLoading ? (
            <LoadingSpinner />
          ) : surveyServiceError ? (
            <div css={modifiedErrorBoxStyles}>
              <p>{stateSurveyError(activeState.label)}</p>
            </div>
          ) : (
            <>
              <DocumentsTable
                activeState={activeState}
                documents={surveyDocumentsSorted}
                hideInfoMessage={assessmentDocumentsSorted.length > 0}
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
  activeState: ActiveState,
  documents: Array<Object>,
  hideInfoMessage?: boolean,
  type: string,
};

function DocumentsTable({
  activeState,
  documents,
  hideInfoMessage,
  type,
}: DocumentsTableProps) {
  if (documents.length === 0) {
    return (
      <p>
        No {type} documents available for this{' '}
        {activeState.source.toLowerCase()}.
      </p>
    );
  }

  return (
    <>
      {!hideInfoMessage && (
        <em>Select a document below to download a copy of the report.</em>
      )}

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
              Cell: (cell) => {
                const { documentFileName, documentURL } = cell.row.original;
                return (
                  <DocumentLink
                    filename={documentFileName}
                    url={documentURL}
                    value={cell.value}
                  />
                );
              },
            },
            {
              accessor: 'agencyCode',
              Header: 'Agency Code',
              width: 125,
              Cell: (cell) => {
                if (cell.value === 'S') return 'State';
                if (cell.value === 'E') return 'EPA';
                return cell.value;
              },
            },
          ];
        }}
      />
    </>
  );
}

function DocumentLink({ filename, url, value }) {
  return (
    <>
      <a href={url} target="_blank" rel="noopener noreferrer">
        {value} ({getExtensionFromPath(filename, url)})
      </a>
      <DynamicExitDisclaimer url={url} />
    </>
  );
}

export default Documents;
