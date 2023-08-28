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
import { reactSelectStyles } from 'styles/index.js';

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

  const selectedOptions = useMemo(() => {
    return selected.map((s) => ({ label: s, value: s }));
  }, [selected]);

  return (
    <div css={selectContainerStyles}>
      <span css={selectLabelStyles}>
        Filter by <GlossaryTerm term="Characteristic">Characteristics</GlossaryTerm>:
      </span>
      <Select
        aria-label="Filter by Characteristics"
        components={{ MenuList }}
        isDisabled={monitoringPeriodOfRecordStatus === 'failure'}
        isLoading={monitoringPeriodOfRecordStatus === 'pending'}
        isMulti
        onChange={(options) => onChange(options.map((option) => option.value))}
        options={allCharacteristicOptions}
        placeholder="Select one or more characteristics..."
        styles={reactSelectStyles}
        value={selectedOptions}
      />
    </div>
  );
}

type CharacteristicsSelectProps = {
  selected: string[];
  onChange: (selected: string[]) => void;
};

const selectContainerStyles = css`
  width: 100%;
`;

const selectLabelStyles = css`
  display: inline-block;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
  font-weight: bold;
`;
