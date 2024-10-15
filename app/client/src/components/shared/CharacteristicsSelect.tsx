/** @jsxImportSource @emotion/react */

import { useContext, useMemo } from 'react';
// components
import { CountSelect } from 'components/shared/CountSelect';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
// utils
import { useMonitoringLocations } from 'utils/hooks';
// types
import type { Option } from 'types';

export function CharacteristicsSelect({
  selected,
  onChange,
}: Readonly<CharacteristicsSelectProps>) {
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
    return Object.entries(uniqueCharacteristics)
      .map(([key, value]) => ({
        label: key,
        value: key,
        count: value.size,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [monitoringPeriodOfRecordStatus, monitoringLocations]);

  return (
    <CountSelect
      countLabel="Locations with Characteristic"
      glossaryTerm="Characteristics"
      label="characteristic"
      onChange={onChange}
      options={allCharacteristicOptions}
      selected={selected}
      status={monitoringPeriodOfRecordStatus}
    />
  );
}

type CharacteristicsSelectProps = {
  selected: Readonly<Option[]>;
  onChange: (selected: Readonly<Option[]>) => void;
};

export default CharacteristicsSelect;
