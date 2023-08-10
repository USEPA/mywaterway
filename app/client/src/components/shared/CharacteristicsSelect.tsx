import uniqueId from 'lodash/uniqueId';
import { useContext, useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import { css } from 'styled-components/macro';
// components
import MenuList from 'components/shared/MenuList';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
// utils
import { useMonitoringLocations } from 'utils/hooks';

export default CharacteristicsSelect;
export function CharacteristicsSelect({
  label,
  selected,
  onChange,
}: CharacteristicsSelectProps) {
  const { monitoringPeriodOfRecordStatus } = useContext(LocationSearchContext);
  const { monitoringLocations } = useMonitoringLocations();

  const [inputId] = useState(uniqueId('characteristic-select-'));

  // Gather all available characteristics from the periodOfRecord data
  const allCharacteristicOptions = useMemo(() => {
    if (monitoringPeriodOfRecordStatus !== 'success') return [];

    const uniqueCharacteristics = new Set<string>();
    monitoringLocations.forEach((location) => {
      const siteData = location.dataByYear;
      Object.values(siteData).forEach((yearData) => {
        Object.keys(yearData.totalsByCharacteristic).forEach((characteristic) =>
          uniqueCharacteristics.add(characteristic),
        );
      });
    });
    return Array.from(uniqueCharacteristics)
      .sort((a, b) => a.localeCompare(b))
      .map((charc) => ({ label: charc, value: charc }));
  }, [monitoringPeriodOfRecordStatus, monitoringLocations]);

  useEffect(() => {
    return function cleanup() {
      onChange([]);
    };
  }, [onChange]);

  return (
    <div css={selectContainerStyles}>
      <label css={selectLabelStyles} htmlFor={inputId}>
        {label}
      </label>
      <Select
        components={{ MenuList }}
        css={selectStyles}
        inputId={inputId}
        isDisabled={monitoringPeriodOfRecordStatus === 'failure'}
        isLoading={monitoringPeriodOfRecordStatus === 'pending'}
        isMulti
        onChange={onChange}
        options={allCharacteristicOptions}
        placeholder="Select a characteristic..."
        value={selected}
      />
    </div>
  );
}

type CharacteristicsSelectProps = {
  label: string;
  selected: Option[];
  onChange: (selected: readonly Option[]) => void;
};

type Option = {
  label: string;
  value: string;
};

const selectContainerStyles = css`
  width: 100%;
`;

const selectLabelStyles = css`
  margin-bottom: 0.125rem;
  font-size: 0.875rem;
  font-weight: bold;
`;

const selectStyles = css`
  width: 100%;
`;
