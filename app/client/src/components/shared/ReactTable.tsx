/** @jsxImportSource @emotion/react */

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  useTable,
  useSortBy,
  useResizeColumns,
  useBlockLayout,
  useFlexLayout,
  useFilters,
} from 'react-table';
// components
import { linkButtonStyles } from 'components/shared/LinkButton';

const inputStyles = css`
  width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: #fff;
  padding: 5px 7px;
  font-size: inherit;
  border-radius: 3px;
  font-weight: 400;
  outline-width: 0;
`;

const clearFiltersContainerStyles = (margin: string) => {
  return css`
    display: flex;
    justify-content: space-between;
    margin: ${margin};

    small {
      align-self: flex-end;
      font-style: italic;
    }
  `;
};

export function generateFilterInput(placeholder = 'Filter column...') {
  return ({ column: { filterValue, setFilter } }) => {
    return (
      <input
        css={inputStyles}
        type="text"
        placeholder={placeholder}
        value={filterValue || ''}
        onClick={(event) => event.stopPropagation()}
        onChange={
          (event) => setFilter(event.target.value || undefined) // Set undefined to remove the filter entirely
        }
        aria-label={placeholder}
      />
    );
  };
}

const containerStyles = css`
  /*These styles are suggested for the table fill all available space in its containing element*/
  display: block;
  /* These styles are required for a horizontaly scrollable table overflow */
  overflow: auto;

  .rt-table {
    border-spacing: 0;
    border: 1px solid rgba(0, 0, 0, 0.1);
    display: inline-block;

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
      overflow-wrap: anywhere;

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
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      justify-content: space-between;
      padding: 2px;

      span:first-of-type {
        display: inline-block;
      }
    }

    .rt-filter {
      padding-top: 10px;
    }

    .rt-th-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      justify-content: space-between;
    }
  }
`;

// --- components ---
type Props = {
  autoResetFilters?: boolean;
  autoResetSortBy?: boolean;
  data: Array<Object>;
  getColumns: Function;
  initialSortBy?: Array<{ id: string; desc?: boolean }>;
  placeholder?: string;
  striped?: boolean;
};

function ReactTable({
  autoResetFilters = true,
  autoResetSortBy = true,
  data,
  getColumns,
  initialSortBy = [],
  placeholder,
  striped = false,
}: Props) {
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
      Filter: generateFilterInput(placeholder),
    }),
    [placeholder],
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    setAllFilters,
  } = useTable(
    {
      autoResetFilters,
      autoResetSortBy,
      columns,
      data,
      defaultColumn,
      initialState: {
        sortBy: initialSortBy,
      },
    },
    useResizeColumns,
    useBlockLayout,
    useFlexLayout,
    useFilters,
    useSortBy,
  );

  // measures the table width
  const measuredTableRef = useRef(null);
  const getWidth = () =>
    setTableWidth(
      (prevWidth) =>
        measuredTableRef.current?.getBoundingClientRect().width ?? prevWidth,
    );
  useLayoutEffect(() => {
    if (!measuredTableRef.current) return;
    setTableWidth(measuredTableRef.current.getBoundingClientRect().width);
    window.addEventListener('resize', getWidth);
    return function cleanup() {
      window.removeEventListener('resize', getWidth);
    };
  }, []);

  const hasFilters = columns.some((column) => column.filterable);

  const clearFiltersLinkButton = (margin: string) => (
    <div css={clearFiltersContainerStyles(margin)}>
      <small>Click a column heading to sort...</small>
      {hasFilters && (
        <button css={linkButtonStyles} onClick={() => setAllFilters([])}>
          Clear Filters
        </button>
      )}
    </div>
  );

  return (
    <>
      {clearFiltersLinkButton('0 0 0.5rem 0')}
      <div css={containerStyles} ref={measuredTableRef} className="ReactTable">
        <div className="rt-table" role="grid" {...getTableProps()}>
          <div className="rt-thead">
            {headerGroups.map((headerGroup) => {
              const { key, ...restHeaderGroupProps } =
                headerGroup.getHeaderGroupProps();
              return (
                <div
                  className="rt-tr"
                  role="row"
                  key={key}
                  {...restHeaderGroupProps}
                >
                  {headerGroup.headers.map((column) => {
                    const { key, ...restColumnProps } = column.getHeaderProps(
                      column.getSortByToggleProps(),
                    );
                    return (
                      <div
                        className="rt-th"
                        role="columnheader"
                        key={key}
                        {...restColumnProps}
                      >
                        <div className="rt-th-content">
                          <div className="rt-col-title">
                            <span>{column.render('Header')}</span>
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
                            <div className="rt-filter">
                              {column.render('Filter')}
                            </div>
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
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="rt-tbody" {...getTableBodyProps()}>
            {rows.map((row, i) => {
              const isEven = i % 2 === 0;
              prepareRow(row);

              const { key, ...restRowProps } = row.getRowProps();
              return (
                <div
                  className={`rt-tr ${striped ? 'rt-striped' : ''} ${
                    isEven ? '-odd' : '-even'
                  }`}
                  role="row"
                  key={key}
                  {...restRowProps}
                >
                  {row.cells.map((cell) => {
                    const { key, ...restCellProps } = cell.getCellProps();
                    return (
                      <div
                        className="rt-td"
                        role="gridcell"
                        key={key}
                        {...restCellProps}
                      >
                        {cell.render('Cell')}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {hasFilters && clearFiltersLinkButton('0.5rem 0 0 0')}
    </>
  );
}

export default ReactTable;
