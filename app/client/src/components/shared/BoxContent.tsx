/** @jsxImportSource @emotion/react */

import { useMemo } from 'react';
import { css } from '@emotion/react';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
// types
import type { ReactNode } from 'react';
import type { SerializedStyles } from '@emotion/react';

/*
## Styles
*/
const contentStyles = css`
  background-color: inherit;
`;

const flexRowStyles = css`
  align-items: baseline;
  border-bottom: 1px solid #d8dfe2;
  display: flex;
  justify-content: flex-start;
  width: 100%;

  &:first-of-type {
    border-bottom: 1px solid #d8dfe2;
  }

  &:last-of-type {
    border-bottom: none;
  }

  .row-label {
    width: auto;
  }
`;

const gridStyles = css`
  ${contentStyles}
  display: grid;
  grid-template-columns: 1fr 1fr;

  .row-cell {
    border-bottom: 1px solid #d8dfe2;
    width: 100%;

    &:nth-of-type(-n + 2) {
      border-bottom: 1px solid #d8dfe2;
    }

    &:nth-last-of-type(-n + 2) {
      border-bottom: none;
    }
  }
`;

const listContentStyles = css`
  border-top: 1px solid #d8dfe2;
  padding-bottom: 1rem;

  .row-cell {
    overflow-wrap: anywhere;
    padding: 0.75rem;
    &:nth-of-type(even) {
      padding-right: 0.75rem;
    }
    &:nth-of-type(odd) {
      padding-left: 0.75rem;
    }
  }

  strong {
    font-weight: 400;
    font-style: italic;
  }
`;

const rowCellStyles = css`
  align-items: baseline;
  display: block;
  font-size: 0.875em;
  gap: 0.3em;
  height: 100%;
  line-height: 1.125;
  padding: 0.5em;

  @media (min-width: 560px) {
    font-size: 1em;
  }

  &:nth-of-type(odd) {
    grid-column: 1;
    padding-left: 0;
  }

  &:nth-of-type(even) {
    grid-column: 2;
    padding-right: 0;
  }

  /* loading icon */
  svg {
    margin: -0.5em;
    height: 1.25em;
  }

  small {
    margin-left: 0.3em;
  }
`;

/*
## Components
*/
interface BoxContentProps {
  layout?: 'grid' | 'flex';
  rows: RowProps[];
  styles?: SerializedStyles;
}

export function BoxContent({
  layout = 'grid',
  rows,
  styles,
}: Readonly<BoxContentProps>) {
  const mergedStyles = css`
    ${layout === 'grid' ? gridStyles : contentStyles}
    ${styles}
  `;

  const keyedRows = useMemo(() => {
    return rows.map((row, i) => ({ ...row, key: i }));
  }, [rows]);

  const BoxRow = layout === 'flex' ? FlexRow : Row;

  return (
    <section css={mergedStyles}>
      {keyedRows.map(
        (item) =>
          item?.label && (
            <BoxRow
              key={item.key}
              label={item.label}
              value={item.value}
              status={item.status ?? 'success'}
            />
          ),
      )}
    </section>
  );
}

// This is a simple wrapper around the BoxContent
// component with common style overrides
export function ListContent({
  layout = 'grid',
  rows,
  styles,
}: Readonly<BoxContentProps>) {
  const mergedStyles = css`
    ${listContentStyles}
    ${styles}
  `;

  return <BoxContent layout={layout} rows={rows} styles={mergedStyles} />;
}

interface RowProps {
  label: NonNullable<ReactNode>;
  value: ReactNode;
  status?: string;
}

function Row({ label, value, status = 'success' }: Readonly<RowProps>) {
  let displayValue = value ?? 'N/A';
  if (status === 'fetching') displayValue = <LoadingSpinner />;
  else if (status === 'failure') displayValue = 'N/A';

  return (
    <>
      <span className="row-cell" css={rowCellStyles}>
        <strong>{label}:</strong>
      </span>
      <span className="row-cell" css={rowCellStyles}>
        {displayValue}
      </span>
    </>
  );
}

interface FlexRowProps extends RowProps {
  styles?: SerializedStyles;
}

export function FlexRow({
  label,
  value,
  status = 'success',
  styles,
}: Readonly<FlexRowProps>) {
  const mergedStyles = css`
    ${flexRowStyles}
    ${styles}
  `;
  return (
    <p className="flex-row" css={mergedStyles}>
      <Row label={label} value={value} status={status} />
    </p>
  );
}
