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

// --- components ---
type Props = {
  data: Array<Object>,
  getColumns: Function,
};

function ReactTable({ data, getColumns }: Props) {
  // Initializes the column widths based on the table width
  const [tableWidth, setTableWidth] = React.useState(0);
  const columns = React.useMemo(() => {
    return getColumns(tableWidth);
  }, [tableWidth, getColumns]);

  // default column settings
  const defaultColumn = React.useMemo(
    () => ({
      // When using the useFlexLayout:
      minWidth: 50, // minWidth is only used as a limit for resizing
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
      data,
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
                    {column.filterable && (
                      <div className="rt-filter">{column.render('Filter')}</div>
                    )}
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
  );
}

export default ReactTable;
