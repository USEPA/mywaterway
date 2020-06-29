// @flow

import React from 'react';
import styled from 'styled-components';
import {
  useTable,
  useSortBy,
  useResizeColumns,
  useBlockLayout,
  useFlexLayout,
  useFilters,
} from 'react-table';
// components
import type { RouteProps } from 'routes.js';
import Page from 'components/shared/Page';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import NavBar from 'components/shared/NavBar';
import LoadingSpinner from 'components/shared/LoadingSpinner';
// styled components
import { StyledErrorBox } from 'components/shared/MessageBoxes';
// utilities
import { fetchCheck } from 'utils/fetchUtils';
// config
import { attains } from 'config/webServiceConfig';
// data
import { impairmentFields } from 'config/attainsToHmwMapping';
// // styles
// import 'styles/react-table.css';
// errors
import { attainsParameterServiceError } from 'config/errorMessages';

function compareContextName(objA, objB) {
  return objA['context'].localeCompare(objB['context']);
}

function getMatchingLabel(ATTAINSContext) {
  return impairmentFields.filter((field) => {
    return field.parameterGroup === ATTAINSContext;
  })[0].label;
}

const Input = styled.input`
  width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: #fff;
  padding: 5px 7px;
  font-size: inherit;
  border-radius: 3px;
  font-weight: 400;
  outline-width: 0;
`;

function generateFilterInput({
  column: { filterValue, preFilteredRows, setFilter },
}) {
  return (
    <Input
      type="text"
      placeholder="Filter column..."
      value={filterValue ? filterValue : ''}
      onClick={(event) => event.stopPropagation()}
      onChange={
        (event) => setFilter(event.target.value || undefined) // Set undefined to remove the filter entirely
      }
      aria-label="Filter column..."
    />
  );
}

// --- styled components ---
const Container = styled.div`
  padding: 1rem;

  p {
    padding-bottom: 0;
    line-height: 1.375;
  }

  a {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 1.25em;
    line-height: 1.125;
  }

  @media (min-width: 30em) {
    padding: 2rem;

    a {
      font-size: 1.375em;
    }

    hr {
      margin-top: 2rem;
    }
  }
`;

const ErrorBox = styled(StyledErrorBox)`
  margin: 1.25rem;
`;

// --- components ---
type Props = {
  ...RouteProps,
};

function Attains({ ...props }: Props) {
  const [loading, setLoading] = React.useState(true);
  const [serviceError, setServiceError] = React.useState(false);
  const [attainsData, setAttainsData] = React.useState(null);
  const [matchedMappings, setMatchedMappings] = React.useState([]);

  React.useEffect(() => {
    const url = attains.serviceUrl + 'domains?domainName=ParameterName';

    fetchCheck(url)
      .then((res) => {
        setLoading(false);
        setAttainsData(res.sort(compareContextName)); // sorted alphabetically by ATTAINS context
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
        setServiceError(true);
      });
  }, []);

  React.useEffect(() => {
    // array of arrays - each containing 3 values: the HMW mapping, the ATTAINS context, and the ATTAINS name
    // i.e. ["Excess Algae", "ALGAL GROWTH", "EXCESS ALGAL GROWTH"]
    let data = [];
    if (attainsData) {
      data = attainsData.map((obj) => {
        return {
          hmwMapping: getMatchingLabel(obj.context),
          attainsParameterGroup: obj.context,
          attainsParameterName: obj.name,
        };
      });
    }

    setMatchedMappings(data);
  }, [attainsData]);

  // Initializes the column widths based on the table width
  const [tableWidth, setTableWidth] = React.useState(0);
  const columns = React.useMemo(() => {
    const columnWidth = tableWidth / 3;
    return [
      {
        Header: "How's My Waterway Impairment Category",
        accessor: 'hmwMapping',
        width: columnWidth,
      },
      {
        id: 'parameterGroups',
        Header: 'ATTAINS Parameter Group',
        accessor: 'attainsParameterGroup',
        width: columnWidth,
      },
      {
        Header: 'ATTAINS Parameter Name',
        accessor: 'attainsParameterName',
        width: columnWidth,
      },
    ];
  }, [tableWidth]);

  // default column settings
  const defaultColumn = React.useMemo(
    () => ({
      // When using the useFlexLayout:
      minWidth: 100, // minWidth is only used as a limit for resizing
      width: 150, // width is used for both the flex-basis and flex-grow
      maxWidth: 1000, // maxWidth is only used as a limit for resizing
      Filter: generateFilterInput,
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
      data: matchedMappings,
      defaultColumn,
    },
    useResizeColumns,
    useBlockLayout,
    useFlexLayout,
    useFilters,
    useSortBy,
  );

  // measures the table width
  const measuredTableRef = React.useCallback((node) => {
    if (!node) return;
    setTableWidth(node.getBoundingClientRect().width);
  }, []);

  if (serviceError) {
    return (
      <Page>
        <NavBar title="ATTAINS Information" />
        <ErrorBox>
          <p>{attainsParameterServiceError}</p>
        </ErrorBox>
      </Page>
    );
  }

  // if loading or matching the entries. prevents a flicker of an empty screen while table loads
  if (loading) {
    return (
      <Page>
        <NavBar title="ATTAINS Information" />
        <LoadingSpinner />
      </Page>
    );
  }

  // const createCustomFilter = (filter, row, id) =>
  //   row._original[id].toLowerCase().includes(filter.value.toLowerCase());

  return (
    <Page>
      <NavBar title="ATTAINS Information" />
      <Container className="container">
        <p>
          This page provides a way to compare How’s My Waterway{' '}
          <GlossaryTerm term="Impairment Categories">
            Impairment Categories
          </GlossaryTerm>{' '}
          to ATTAINS{' '}
          <GlossaryTerm term="Parameter Group">Parameter Groups</GlossaryTerm>{' '}
          and ATTAINS{' '}
          <GlossaryTerm term="Parameter Name">Parameter Names</GlossaryTerm>.
          States submit parameter names to EPA which are then put into groups
          with similar parameters. How’s My Waterway takes these parameter
          groups and converts them to public friendly impairment categories. On
          the individual waterbody report pages in How’s My Waterway you will be
          able to find which original parameter name was submitted for a
          specific waterbody.
        </p>
        <br />

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
                        <div className="rt-filter">
                          {column.render('Filter')}
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
                const isEven = i % 2 === 0;
                prepareRow(row);
                return (
                  <div
                    className={`rt-tr ${isEven ? '-odd' : '-even'}`}
                    role="row"
                    {...row.getRowProps()}
                  >
                    {row.cells.map((cell) => {
                      return (
                        <div
                          className="rt-td"
                          role="gridcell"
                          {...cell.getCellProps()}
                        >
                          {cell.value}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* {matchedMappings && (
          <ReactTable
            data={matchedMappings}
            columns={[
              {
                Header: '',
                columns: [
                  {
                    Header: "How's My Waterway Impairment Category",
                    accessor: 'hmwMapping',
                    filterMethod: (filter, row) =>
                      createCustomFilter(filter, row, 'hmwMapping'),
                    Filter: ({ filter, onChange }) =>
                      generateFilterInput(filter, onChange),
                  },
                  {
                    id: 'parameterGroups',
                    Header: 'ATTAINS Parameter Group',
                    accessor: 'attainsParameterGroup',
                    filterMethod: (filter, row) =>
                      createCustomFilter(filter, row, 'attainsParameterGroup'),
                    Filter: ({ filter, onChange }) =>
                      generateFilterInput(filter, onChange),
                  },
                  {
                    Header: 'ATTAINS Parameter Name',
                    accessor: 'attainsParameterName',
                    filterMethod: (filter, row) =>
                      createCustomFilter(filter, row, 'attainsParameterName'),
                    Filter: ({ filter, onChange }) =>
                      generateFilterInput(filter, onChange),
                  },
                ],
              },
            ]}
            filterable={true}
            defaultPageSize={matchedMappings.length} // set number of displayed entries to number of entries
            minRows={0} // hide empty rows that appear once filters have been applied
            showPagination={false}
            className="-striped -highlight"
          />
        )} */}
      </Container>
    </Page>
  );
}

export default Attains;
