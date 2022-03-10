// @flow

import React, { useCallback, useMemo, useState } from 'react';
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

// --- styles ---
const Styles = styled.div`
  /*These styles are suggested for the table fill all available space in its containing element*/
  display: block;
  /* These styles are required for a horizontaly scrollable table overflow */
  overflow: auto;

  .rt-table {
    border-spacing: 0;
    border: 1px solid rgba(0, 0, 0, 0.1);

    .rt-thead {
      background-color: #f1f1f1;

      .rt-tr {
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      }
    }

    .rt-tbody {
      .rt-tr {
        border-bottom: 1px solid rgba(0, 0, 0, 0.02);
      }

      .rt-tr.rt-striped.-odd {
        background-color: rgba(0, 0, 0, 0.03);
      }
    }

    .rt-tr:last-child .rt-td {
      border-bottom: 0;
    }

    .rt-th,
    .rt-td {
      margin: 0;
      overflow: hidden;

      /* This is required for the absolutely positioned resizer */
      position: relative;

      :last-child {
        border-right: 0;
      }
    }

    .rt-th {
      padding: 5px;
      font-weight: 700;
      border-right: 1px solid rgba(0, 0, 0, 0.05);

      span {
        float: right;
      }
    }

    .rt-td {
      padding: 7px 5px;
      border-right: 1px solid rgba(0, 0, 0, 0.02);
    }

    .rt-resizer {
      right: 0;
      width: 10px;
      height: 100%;
      position: absolute;
      top: 0;
      z-index: 1;
      cursor: col-resize !important;
      /* prevents from scrolling while dragging on touch devices */
      touch-action: none;
      /* prevents highlighting text while resizing */
      user-select: none;
    }

    .rt-col-title {
      padding: 2px;
    }

    .rt-filter {
      padding-top: 10px;
    }
  }
`;

// --- components ---
type Props = {
  data: Array<Object>,
  getColumns: Function,
  striped: ?boolean,
};

function ReactTable({ data, getColumns, striped = false }: Props) {
  // Initializes the column widths based on the table width
  const [tableWidth, setTableWidth] = useState(0);
  const columns = useMemo(() => {
    return getColumns(tableWidth);
  }, [tableWidth, getColumns]);

  // default column settings
  const defaultColumn = useMemo(
    () => ({
      // When using the useFlexLayout:
      minWidth: 50, // minWidth is only used as a limit for resizing
      width: 150, // width is used for both the flex-basis and flex-grow
      maxWidth: 1000, // maxWidth is only used as a limit for resizing
      Filter: generateFilterInput,
    }),
    [],
  );

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable(
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
  const measuredTableRef = useCallback((node) => {
    if (!node) return;
    setTableWidth(node.getBoundingClientRect().width);
  }, []);

  return (
    <Styles ref={measuredTableRef} className="ReactTable">
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
                className={`rt-tr ${striped ? 'rt-striped' : ''} ${
                  isEven ? '-odd' : '-even'
                }`}
                role="row"
                {...row.getRowProps()}
              >
                {row.cells.map((cell) => {
                  const column = cell.column;
                  return (
                    <div
                      className="rt-td"
                      role="gridcell"
                      {...cell.getCellProps()}
                    >
                      {column.Render ? column.Render(cell) : cell.value}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </Styles>
  );
}

export default ReactTable;
