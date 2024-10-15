/** @jsxImportSource @emotion/react */

import { useMemo } from 'react';
import { css } from '@emotion/react';
// components
import PaginatedSelect from 'components/shared/PaginatedSelect';
// utils
import { useMonitoringLocations } from 'utils/hooks';
// styles
import { groupHeadingStyles } from 'styles/index';
// types
import type { Option } from 'types';

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

function formatGroupLabel() {
  return (
    <div css={gridHeaderStyles}>
      <div>Organization</div>
      <div># of Locations in Organization</div>
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

export function OrganizationsSelect({
  selected,
  onChange,
}: Readonly<OrganizationsSelectProps>) {
  const { monitoringLocations, monitoringLocationsStatus } =
    useMonitoringLocations();

  const organizationOptions = useMemo(() => {
    if (monitoringLocationsStatus !== 'success') return [];

    return [
      {
        label: 'Group',
        options: Object.values(
          monitoringLocations.reduce<Record<string, Option>>(
            (acc, location) => {
              if (!acc.hasOwnProperty(location.orgId)) {
                acc[location.orgId] = {
                  label: location.orgName,
                  value: location.orgId,
                  count: 1,
                };
              } else {
                acc[location.orgId].count!++;
              }
              return acc;
            },
            {},
          ),
        ).sort((a, b) => a.label.localeCompare(b.label)),
      },
    ];
  }, [monitoringLocations]);

  const displayedSelected = selected.map((option) => ({
    label: option.label,
    value: option.value,
  }));

  return (
    <div css={selectContainerStyles}>
      <span css={selectLabelStyles}>Filter by Organizations:</span>
      <PaginatedSelect
        aria-label="Filter by Organizations"
        formatGroupLabel={formatGroupLabel}
        formatOptionLabel={formatOptionLabel}
        isDisabled={monitoringLocationsStatus === 'failure'}
        isLoading={monitoringLocationsStatus === 'pending'}
        onChange={onChange}
        options={organizationOptions}
        placeholder="Select one or more organizations..."
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

type OrganizationsSelectProps = {
  selected: Readonly<Option[]>;
  onChange: (selected: Readonly<Option[]>) => void;
};

export default OrganizationsSelect;
