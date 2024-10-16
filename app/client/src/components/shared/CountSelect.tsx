/** @jsxImportSource @emotion/react */

import { useMemo } from 'react';
import { css } from '@emotion/react';
// components
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import PaginatedSelect from 'components/shared/PaginatedSelect';
// styles
import { groupHeadingStyles } from 'styles/index';
// types
import type { FetchStatus, Option } from 'types';
// utils
import { titleCase } from 'utils/utils';

const gridStyles = css`
  display: grid;
  grid-template-columns: repeat(2, 75% 25%);

  div {
    display: flex;
    align-items: center;
    padding: 8px 12px;
  }

  div:last-of-type {
    text-align: right;
    justify-content: flex-end;
  }
`;

const gridHeaderStyles = css`
  ${gridStyles}

  border-bottom: 2px solid #dee2e6;
  font-weight: bold;
`;

const selectContainerStyles = css`
  width: 100%;
`;

const selectLabelStyles = css`
  display: inline-block;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
  font-weight: bold;
`;

function formatGroupLabel(label: string, countLabel: string) {
  return () => (
    <div css={gridHeaderStyles}>
      <div>{titleCase(label)}</div>
      <div># of {countLabel}</div>
    </div>
  );
}

function formatOptionLabel(option: Option) {
  if (!option.count) return option.label;
  return (
    <div css={gridStyles}>
      <div>{option.label}</div>
      <div>{option.count}</div>
    </div>
  );
}

export function CountSelect({
  countLabel,
  glossaryTerm,
  label,
  onChange,
  options,
  selected,
  status,
}: Readonly<CountSelectProps>) {
  const groupedOptions = useMemo(() => {
    return [
      {
        label: 'Group',
        options,
      },
    ];
  }, [options]);

  const displayedSelected = selected.map((option) => ({
    label: option.label,
    value: option.value,
  }));

  return (
    <div css={selectContainerStyles}>
      <span css={selectLabelStyles}>
        Filter by{' '}
        {glossaryTerm ? (
          <GlossaryTerm term={glossaryTerm}>{titleCase(label)}s</GlossaryTerm>
        ) : (
          `${titleCase(label)}s`
        )}
        :
      </span>
      <PaginatedSelect
        aria-label={`Filter by ${titleCase(label)}s`}
        formatGroupLabel={formatGroupLabel(label, countLabel)}
        formatOptionLabel={formatOptionLabel}
        isDisabled={status === 'failure'}
        isLoading={status === 'pending'}
        onChange={onChange}
        options={groupedOptions}
        placeholder={`Select one or more ${label}s...`}
        styles={{
          groupHeading: (defaultStyles) => ({
            ...defaultStyles,
            ...groupHeadingStyles,
            padding: 0,
            color: '#000',
            backgroundColor: '#fff',
          }),
          option: (defaultStyles) => ({ ...defaultStyles, padding: 0 }),
        }}
        value={displayedSelected}
      />
    </div>
  );
}

type CountSelectProps = {
  countLabel: string;
  glossaryTerm?: string;
  label: string;
  onChange: (selected: Readonly<Option[]>) => void;
  options: Readonly<Option[]>;
  selected: Readonly<Option[]>;
  status: FetchStatus;
};

export default CountSelect;
