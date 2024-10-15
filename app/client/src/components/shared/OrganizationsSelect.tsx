/** @jsxImportSource @emotion/react */

import { useMemo } from 'react';
// components
import CountSelect from 'components/shared/CountSelect';
// utils
import { useMonitoringLocations } from 'utils/hooks';
// types
import type { Option } from 'types';

export function OrganizationsSelect({
  selected,
  onChange,
}: Readonly<OrganizationsSelectProps>) {
  const { monitoringLocations, monitoringLocationsStatus } =
    useMonitoringLocations();

  const organizationOptions = useMemo(() => {
    if (monitoringLocationsStatus !== 'success') return [];

    return Object.values(
      monitoringLocations.reduce<Record<string, Option>>((acc, location) => {
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
      }, {}),
    ).sort((a, b) => a.label.localeCompare(b.label));
  }, [monitoringLocations]);

  return (
    <CountSelect
      countLabel="Locations in Organization"
      label="organization"
      onChange={onChange}
      options={organizationOptions}
      selected={selected}
      status={monitoringLocationsStatus}
    />
  );
}

type OrganizationsSelectProps = {
  selected: Readonly<Option[]>;
  onChange: (selected: Readonly<Option[]>) => void;
};

export default OrganizationsSelect;
