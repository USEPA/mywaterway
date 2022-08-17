import { css } from 'styled-components/macro';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
// types
import type { ReactNode } from 'react';
import type { FlattenSimpleInterpolation } from 'styled-components';

/*
## Styles
*/
const contentStyles = css`
  background-color: inherit;
`;

const flexRowStyles = css`
  align-items: flex-end;
  border-bottom: 1px solid #d8dfe2;
  display: flex;
  justify-content: flex-start;
  width: 100%;

  &:last-of-type {
    border-bottom: none;
  }

  &:first-of-type {
    border-bottom: 1px solid #d8dfe2;
  }

  strong {
    width: auto;
  }
`;

const gridStyles = css`
  ${contentStyles}
  display: grid;
  grid-template-columns: auto 1fr;

  span,
  strong {
    border-bottom: 1px solid #d8dfe2;
    width: 100%;

    &:last-of-type {
      border-bottom: none;
    }

    &:first-of-type {
      border-bottom: 1px solid #d8dfe2;
    }
  }
`;

const rowStyles = css`
  align-items: flex-end;
  display: inline-flex;
  font-size: 1em;
  height: 100%;
  line-height: 1.25;
  margin: auto 0;
  padding: 0.5em 0;
`;

const rowLabelStyles = css`
  ${rowStyles}
  grid-column: 1;
  padding-right: 0.5em;
`;

const rowValueStyles = css`
  ${rowStyles}
  grid-column: 2;

  /* loading icon */
  svg {
    margin: -0.5em;
    height: 1.25em;
  }
`;

/*
## Components
*/
interface BoxContentProps {
  layout?: 'grid' | 'flex';
  rows: RowProps[];
  styles?: FlattenSimpleInterpolation;
}

export function BoxContent({ layout = 'grid', rows, styles }: BoxContentProps) {
  const mergedStyles = css`
    ${layout === 'grid' ? gridStyles : contentStyles}
    ${styles}
  `;
  const BoxRow = layout === 'flex' ? FlexRow : Row;
  return (
    <section css={mergedStyles}>
      {rows.map(({ label, value, status = 'success' }) => (
        <BoxRow label={label} value={value} status={status} />
      ))}
    </section>
  );
}

interface RowProps {
  label: ReactNode | string;
  value: ReactNode | string;
  status?: string;
}

function Row({ label, value, status = 'success' }: RowProps) {
  let displayValue = value || 'N/A';
  if (status === 'fetching') displayValue = <LoadingSpinner />;
  else if (status === 'failure') displayValue = 'N/A';

  return (
    <>
      <strong className="row-label" css={rowLabelStyles}>
        {label}:
      </strong>
      <span className="row-value" css={rowValueStyles}>
        {displayValue}
      </span>
    </>
  );
}

interface FlexRowProps extends RowProps {
  styles?: FlattenSimpleInterpolation;
}

export function FlexRow({
  label,
  value,
  status = 'success',
  styles,
}: FlexRowProps) {
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
