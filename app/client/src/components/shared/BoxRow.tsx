import { css } from 'styled-components/macro';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
// types
import type { ReactNode } from 'react';
import type { FlattenSimpleInterpolation } from 'styled-components';

const boxRowStyles = css`
  width: 100%;
  border-bottom: 1px solid #d8dfe2;

  &:last-of-type {
    border-bottom: none;
  }

  &:first-of-type {
    border-bottom: 1px solid #d8dfe2;
  }

  p {
    &.row-content {
      font-size: 1em;
      margin-top: 0;
      padding: 0.5em;
    }
  }

  /* loading icon */
  svg {
    margin: -0.5em;
    height: 1.25em;
  }

  strong {
    margin-right: 0.5em;
  }

  strong,
  span {
    display: inline-block;
    line-height: 1.25;
    margin-top: 0;
    margin-bottom: 0;
  }
`;

const boxRowFlexStyles = css`
  ${boxRowStyles}

  p {
    align-items: flex-end;
    display: flex;
    justify-content: flex-start;
  }
`;

const boxRowGridStyles = css`
  ${boxRowStyles}

  p {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  strong {
    grid-column: 1;
  }

  span {
    grid-column: 2;
  }

  strong,
  span {
    margin-bottom: auto;
    margin-top: auto;
  }
`;

interface Props {
  label: ReactNode | string;
  value: ReactNode | string;
  status?: string;
  styles?: FlattenSimpleInterpolation;
}

export function BoxRowFlex({
  label,
  value,
  styles,
  status = 'success',
}: Props) {
  const mergedStyles = css`
    ${boxRowFlexStyles}
    ${styles}
  `;
  return (
    <BoxRow label={label} value={value} status={status} styles={mergedStyles} />
  );
}

export function BoxRowGrid({
  label,
  value,
  styles,
  status = 'success',
}: Props) {
  const mergedStyles = css`
    ${boxRowGridStyles}
    ${styles}
  `;
  return (
    <BoxRow label={label} value={value} status={status} styles={mergedStyles} />
  );
}

interface BoxRowProps extends Props {
  styles: FlattenSimpleInterpolation;
}

function BoxRow({ label, value, styles, status = 'success' }: BoxRowProps) {
  return (
    <div className="row-container" css={styles}>
      <p className="row-content">
        <strong className="row-label">{label}:</strong>
        {status === 'fetching' && (
          <span className="row-value">
            <LoadingSpinner />
          </span>
        )}
        {status === 'failure' && <span className="row-value">N/A</span>}
        {status === 'success' && <span className="row-value">{value}</span>}
      </p>
    </div>
  );
}
