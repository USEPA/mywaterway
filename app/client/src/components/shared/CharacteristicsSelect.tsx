import { useContext, useMemo } from 'react';
import Select from 'react-select';
import { css } from 'styled-components/macro';
// components
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import MenuList from 'components/shared/MenuList';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
// utils
import { useMonitoringLocations } from 'utils/hooks';
// styles
import { groupHeadingStyles, reactSelectStyles } from 'styles/index';

export default CharacteristicsSelect;
export function CharacteristicsSelect({
  selected,
  onChange,
}: CharacteristicsSelectProps) {
  const { monitoringPeriodOfRecordStatus } = useContext(LocationSearchContext);
  const { monitoringLocations } = useMonitoringLocations();

  // Gather all available characteristics from the periodOfRecord data
  const allCharacteristicOptions = useMemo(() => {
    if (monitoringPeriodOfRecordStatus !== 'success') return [];

    const uniqueCharacteristics: { [key: string]: Set<string> } = {};
    monitoringLocations.forEach((location) => {
      const siteData = location.dataByYear;
      Object.values(siteData).forEach((yearData) => {
        Object.keys(yearData.totalsByCharacteristic).forEach(
          (characteristic) => {
            if (uniqueCharacteristics.hasOwnProperty(characteristic)) {
              uniqueCharacteristics[characteristic].add(location.siteId);
            } else {
              uniqueCharacteristics[characteristic] = new Set([
                location.siteId,
              ]);
            }
          },
        );
      });
    });
    return [
      {
        label: 'Group',
        options: Object.entries(uniqueCharacteristics)
          .map(([key, value]) => ({
            label: key,
            value: key,
            count: value.size,
          }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      },
    ];
  }, [monitoringPeriodOfRecordStatus, monitoringLocations]);

  const selectedOptions = useMemo(() => {
    return selected.map((s) => ({ label: s, value: s }));
  }, [selected]);

  return (
    <div css={selectContainerStyles}>
      <span css={selectLabelStyles}>
        Filter by{' '}
        <GlossaryTerm term="Characteristics">Characteristics</GlossaryTerm>:
      </span>
      <Select
        aria-label="Filter by Characteristics"
        components={{ MenuList }}
        formatGroupLabel={formatGroupLabel}
        formatOptionLabel={formatOptionLabel}
        isDisabled={monitoringPeriodOfRecordStatus === 'failure'}
        isLoading={monitoringPeriodOfRecordStatus === 'pending'}
        isMulti
        onChange={(options) => onChange(options.map((option) => option.value))}
        options={allCharacteristicOptions}
        placeholder="Select one or more characteristics..."
        styles={{
          ...reactSelectStyles,
          groupHeading: (defaultStyles) => ({
            ...defaultStyles,
            ...groupHeadingStyles,
            padding: 0,
            color: '#000',
            backgroundColor: '#fff',
          }),
          option: (defaultStyles) => ({ ...defaultStyles, padding: 0 }),
        }}
        value={selectedOptions}
      />
    </div>
  );
}

function formatGroupLabel() {
  return (
    <div css={gridHeaderStyles}>
      <div>Characteristic</div>
      <div># of Locations with Characteristic</div>
    </div>
  );
}

function formatOptionLabel(option: OptionType) {
  if (!option.count) return option.label;
  return (
    <div css={gridStyles}>
      <div>{option.label}</div>
      <div>{option.count}</div>
    </div>
  );
}

type CharacteristicsSelectProps = {
  selected: string[];
  onChange: (selected: string[]) => void;
};

type OptionType = {
  count?: number;
  label: string;
  value: string;
};

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
