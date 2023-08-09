import { useContext, useMemo } from 'react';
import Select from 'react-select';
// components
import MenuList from 'components/shared/MenuList';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
// utils
import { useMonitoringLocations } from 'utils/hooks';

export default CharacteristicsSelect;
export function CharacteristicsSelect({
  selected,
  onChange,
}: CharacteristicsSelectProps) {
  const { monitoringCharacteristicsStatus } = useContext(LocationSearchContext);
  const { monitoringLocations } = useMonitoringLocations();

  // Gather all available characteristics from the periodOfRecord data
  const allCharacteristicOptions = useMemo(() => {
    if (monitoringCharacteristicsStatus !== 'success') return [];

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
  }, [monitoringCharacteristicsStatus, monitoringLocations]);

  return (
    <Select
      components={{ MenuList }}
      isDisabled={monitoringCharacteristicsStatus === 'failure'}
      isLoading={monitoringCharacteristicsStatus === 'pending'}
      isMulti
      onChange={onChange}
      options={allCharacteristicOptions}
      placeholder="Select a characteristic..."
      value={selected}
    />
  );
}

type CharacteristicsSelectProps = {
  selected: Option[];
  onChange: (selected: readonly Option[]) => void;
};

type Option = {
  label: string;
  value: string;
};
