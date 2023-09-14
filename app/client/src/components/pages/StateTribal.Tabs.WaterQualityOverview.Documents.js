// @flow

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
  const documentOrder = useDocumentOrderContext();

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
  if (documentOrder.status !== 'fetching') {
    const rankings =
      documentOrder.status === 'success'
        ? documentOrder.data.surveysOrdering
        : {};
    surveyDocumentsRanked = getDocumentTypeOrder(surveyDocuments, rankings);
  }

  // rank assessment documents
  let assessmentDocumentsRanked = [];
  if (
    documentOrder.status !== 'fetching' &&
    organizationData.status === 'success' &&
    organizationData.data?.documents
  ) {
    const rankings =
      documentOrder.status === 'success'
        ? documentOrder.data.integratedReportOrdering
        : {};
    assessmentDocumentsRanked = getDocumentTypeOrder(
      organizationData.data.documents,
      rankings,
    );
  }

  const assessmentDocumentsSorted = sortDocuments(
    assessmentDocumentsRanked,
    documentOrder.status,
  );

  const surveyDocumentsSorted = sortDocuments(
    surveyDocumentsRanked,
    documentOrder.status,
  );

  if (activeState.value === '') return null;

  const docType =
    activeState.source === 'Tribe' ? 'Assessment' : 'Integrated Report';

  return (
    <div css={containerStyles}>
      <h3>Documents Related to {docType}</h3>

      {(organizationData.status === 'fetching' ||
        documentOrder.status === 'fetching') && <LoadingSpinner />}
      {organizationData.status === 'failure' && (
        <div css={modifiedErrorBoxStyles}>
          <p>{stateDocumentError(activeState.label, docType.toLowerCase())}</p>
        </div>
      )}
      {organizationData.status === 'success' && (
        <>
          {documentOrder.status === 'failure' && (
            <div css={modifiedInfoBoxStyles}>{stateDocumentSortingError}</div>
          )}
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
              Render: (cell) => {
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
              Render: (cell) => {
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
