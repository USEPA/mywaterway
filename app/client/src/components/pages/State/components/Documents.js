// @flow

import React from 'react';
import styled from 'styled-components';
import {
  useTable,
  useSortBy,
  useResizeColumns,
  useBlockLayout,
  useFlexLayout,
} from 'react-table';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
// utilities
import { getExtensionFromPath } from 'utils/utils';
// styled components
import { StyledErrorBox } from 'components/shared/MessageBoxes';
// data
import {
  integratedReportOrdering,
  surveysOrdering,
} from 'components/pages/State/lookups/documentOrder';
// errors
import { stateDocumentError, stateSurveyError } from 'config/errorMessages';
// styles
import 'styles/react-table.css';

// --- styled components ---
const Container = styled.div`
  p {
    padding-bottom: 1.25rem;
  }

  .ReactTable {
    margin-bottom: 1.25rem;
  }

  em {
    display: block;
    margin-bottom: 1.25rem;
  }

  h3 {
    margin-bottom: 0px;
  }
`;

const ErrorBox = styled(StyledErrorBox)`
  p {
    padding-bottom: 0;
  }
  margin-bottom: 1.25rem;
`;

// --- components (Documents) ---
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
      <em>Select a document below to download a copy of the report.</em>
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

// --- components (DocumentsTable) ---
type DocumentsTableProps = {
  documents: Array<Object>,
  type: string,
};

function DocumentsTable({ documents, type }: DocumentsTableProps) {
  // Initializes the column widths based on the table width
  const [tableWidth, setTableWidth] = React.useState(0);
  const columns = React.useMemo(() => {
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
      },
      {
        accessor: 'agencyCode',
        Header: 'Agency Code',
        width: 125,
      },
    ];
  }, [tableWidth]);

  // default column settings
  const defaultColumn = React.useMemo(
    () => ({
      // When using the useFlexLayout:
      minWidth: 50, // minWidth is only used as a limit for resizing
      width: 150, // width is used for both the flex-basis and flex-grow
      maxWidth: 1000, // maxWidth is only used as a limit for resizing
    }),
    [],
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable(
    {
      columns,
      data: documents,
      defaultColumn,
    },
    useResizeColumns,
    useBlockLayout,
    useFlexLayout,
    useSortBy,
  );

  // measures the table width
  const measuredTableRef = React.useCallback((node) => {
    if (!node) return;
    setTableWidth(node.getBoundingClientRect().width);
  }, []);

  if (documents.length === 0)
    return <p>No {type} documents available for this state.</p>;

  return (
    <div className="ReactTable" ref={measuredTableRef}>
      <div className="rt-table" role="grid" {...getTableProps()}>
        <div className="rt-thead">
          {headerGroups.map((headerGroup) => (
            <div
              className="rt-tr"
              role="row"
              {...headerGroup.getHeaderGroupProps()}
            >
              {headerGroup.headers.map((column) => (
                <div
                  className="rt-th"
                  role="columnheader"
                  {...column.getHeaderProps(column.getSortByToggleProps())}
                >
                  <div>
                    <div className="rt-col-title">
                      {column.render('Header')}
                      <span>
                        {column.isSorted ? (
                          column.isSortedDesc ? (
                            <i className="fas fa-arrow-down" />
                          ) : (
                            <i className="fas fa-arrow-up" />
                          )
                        ) : (
                          ''
                        )}
                      </span>
                    </div>
                  </div>
                  {column.canResize && (
                    <div
                      {...column.getResizerProps()}
                      className={`rt-resizer ${
                        column.isResizing ? 'isResizing' : ''
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="rt-tbody" {...getTableBodyProps()}>
          {rows.map((row, i) => {
            prepareRow(row);
            return (
              <div className="rt-tr" role="row" {...row.getRowProps()}>
                {row.cells.map((cell) => {
                  let content = cell.value;
                  if (cell.column.id === 'documentName') {
                    content = (
                      <a
                        href={row.original.documentURL}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {cell.value} (
                        {getExtensionFromPath(
                          row.original.documentFileName,
                          row.original.documentURL,
                        )}
                        )
                      </a>
                    );
                  }
                  if (cell.column.id === 'agencyCode') {
                    content =
                      cell.value === 'S'
                        ? 'State'
                        : cell.value === 'E'
                        ? 'EPA'
                        : cell.value;
                  }

                  return (
                    <div
                      className="rt-td"
                      role="gridcell"
                      {...cell.getCellProps()}
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Documents;
