/** @jsxImportSource @emotion/react */

import { css } from '@emotion/react';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { HelpTooltip } from 'components/shared/HelpTooltip';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import Slider from 'components/shared/Slider';
import Switch from 'components/shared/Switch';
// contexts
import { useConfigFilesState } from 'contexts/ConfigFiles';
import { LocationSearchContext } from 'contexts/locationSearch';
// styles
import { errorBoxStyles } from 'components/shared/MessageBoxes';
import { disclaimerStyles, iconStyles, toggleTableStyles } from 'styles';
// types
import type { Dispatch, SetStateAction } from 'react';
import type {
  CharacteristicGroupMappings,
  MonitoringLocationAttributes,
  MonitoringLocationGroups,
  MonitoringYearsRange,
} from 'types';
// utilities
import { useMonitoringGroups } from 'utils/hooks';

/*
## Styles
*/

const modifiedDisclaimerStyles = css`
  ${disclaimerStyles};
  padding-bottom: 0;
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles};
  margin-bottom: 1em;
  text-align: center;
`;

const modifiedToggleTableStyles = css`
  ${toggleTableStyles}
  th, td {
    text-align: right;
    width: 33%;
    &:first-of-type {
      text-align: left;
    }
  }
`;

const sliderContainerStyles = css`
  margin: 1em 0;
`;

const subheadingStyles = css`
  font-weight: bold;
  padding-bottom: 0;
  text-align: center;
`;

const tableFooterStyles = css`
  border-bottom: 1px solid #dee2e6;
  background-color: #f0f6f9;

  td {
    border-top: none;
    font-weight: bold;
    width: 50%;
  }

  span {
    display: inline-block;
    margin-bottom: 0.25em;
  }
`;

const toggleStyles = css`
  display: flex;
  align-items: center;
  margin-bottom: 0;

  span {
    margin-left: 0.5rem;
  }
`;

const totalRowStyles = css`
  border-top: 2px solid #dee2e6;
  font-weight: bold;
  background-color: #f0f6f9;
`;

/*
## Helpers
*/
// Dynamically filter the location measurements by the selected year range.
function filterLocationMeasurementsByTimeframe(
  station: MonitoringLocationAttributes,
  timeframe: MonitoringYearsRange | null,
  characteristicGroupMappings: CharacteristicGroupMappings,
) {
  if (!timeframe) return station;
  const stationRecords = station.dataByYear;
  const result: MonitoringLocationAttributes = {
    ...station,
    characteristicsByGroup: {},
    totalMeasurements: 0,
    totalsByCharacteristic: {},
    totalsByGroup: {},
    totalsByLabel: {},
    timeframe: [...timeframe],
  };
  // Include the label in the object even if zero
  characteristicGroupMappings.forEach((mapping) => {
    result.totalsByLabel[mapping.label] = 0;
  });
  for (const year in stationRecords) {
    if (parseInt(year) < timeframe[0]) continue;
    if (parseInt(year) > timeframe[1]) break;
    result.totalMeasurements += stationRecords[year].totalMeasurements;
    // Tally characteristic group counts
    const resultGroups = result.totalsByGroup;
    Object.entries(stationRecords[year].totalsByGroup).forEach(
      ([group, count]) => {
        if (count <= 0) return;
        if (group in resultGroups) resultGroups[group] += count;
        else resultGroups[group] = count;
      },
    );
    // Tally characteristic label counts
    Object.entries(stationRecords[year].totalsByLabel).forEach(
      ([label, count]) => (result.totalsByLabel[label] += count),
    );
    // Tally characteristic counts
    const resultCharcs = result.totalsByCharacteristic;
    Object.entries(stationRecords[year].totalsByCharacteristic).forEach(
      ([charc, count]) => {
        if (count <= 0) return;
        if (charc in resultCharcs) resultCharcs[charc] += count;
        else resultCharcs[charc] = count;
      },
    );
    // Get timeframe characteristics by group
    Object.entries(stationRecords[year].characteristicsByGroup).forEach(
      ([group, charcList]) => {
        result.characteristicsByGroup[group] = Array.from(
          new Set(charcList.concat(result.characteristicsByGroup[group] ?? [])),
        );
      },
    );
  }

  return result;
}

function filterLocationsByCharcGroups(
  locations: MonitoringLocationAttributes[],
  groups: MonitoringLocationGroups,
) {
  const toggledGroups = Object.keys(groups)
    .filter((groupLabel) => groupLabel !== 'All')
    .filter((groupLabel) => groups[groupLabel].toggled === true);
  return locations.filter((station) => {
    return toggledGroups.some((group) => station.totalsByLabel[group] > 0);
  });
}

/*
## Components
*/

export function PastWaterConditionsFilters({
  filteredLocations,
  huc12 = '',
  locationName,
  locationType,
  setFilteredLocations,
  setMonitoringDisplayed,
  wqxIds = [],
}: Props) {
  const configFiles = useConfigFilesState();

  const {
    monitoringPeriodOfRecordStatus,
    monitoringYearsRange,
    selectedMonitoringYearsRange,
    setMonitoringFeatureUpdates,
    setSelectedMonitoringYearsRange,
  } = useContext(LocationSearchContext);

  const annualRecordsReady = monitoringPeriodOfRecordStatus === 'success';

  const { monitoringGroups, setMonitoringGroups } = useMonitoringGroups();

  const updateFeatures = useCallback(
    (locations: MonitoringLocationAttributes[]) => {
      const stationUpdates: Record<string, MonitoringLocationUpdates> = {};
      locations.forEach((location) => {
        stationUpdates[location.uniqueId] = {
          characteristicsByGroup: JSON.stringify(
            location.characteristicsByGroup,
          ),
          totalMeasurements: location.totalMeasurements,
          totalsByCharacteristic: JSON.stringify(
            location.totalsByCharacteristic,
          ),
          totalsByGroup: JSON.stringify(location.totalsByGroup),
          timeframe: JSON.stringify(location.timeframe),
        };
      });
      setMonitoringFeatureUpdates(stationUpdates);
    },
    [setMonitoringFeatureUpdates],
  );

  useEffect(() => {
    return function cleanup() {
      setMonitoringFeatureUpdates(null);
    };
  }, [setMonitoringFeatureUpdates]);

  const [allToggled, setAllToggled] = useState(true);
  const toggleAll = useCallback(() => {
    const updatedGroups = { ...monitoringGroups };
    for (const label in updatedGroups) {
      updatedGroups[label].toggled = !allToggled;
    }
    setMonitoringDisplayed(!allToggled);
    setAllToggled((prev) => !prev);
    setMonitoringGroups(updatedGroups);
  }, [
    allToggled,
    monitoringGroups,
    setMonitoringDisplayed,
    setMonitoringGroups,
  ]);

  const groupToggleHandler = useCallback(
    (groupLabel: string) => {
      return function toggleGroup(_ev: boolean) {
        const updatedGroups = { ...monitoringGroups };
        updatedGroups[groupLabel].toggled = !updatedGroups[groupLabel].toggled;
        setMonitoringGroups(updatedGroups);

        let allOthersToggled = true;
        for (let key in updatedGroups) {
          if (!updatedGroups[key].toggled) allOthersToggled = false;
        }
        setAllToggled(allOthersToggled);

        // only check the toggles that are on the screen (i.e., ignore Bacterial, Sediments, etc.)
        const someToggled = Object.keys(updatedGroups)
          .filter((label) => label !== 'All')
          .some((key) => updatedGroups[key].toggled);
        setMonitoringDisplayed(someToggled);
      };
    },
    [monitoringGroups, setMonitoringDisplayed, setMonitoringGroups],
  );

  const groupToggleHandlers = useMemo(() => {
    const toggles: Record<string, ReturnType<typeof groupToggleHandler>> = {};
    Object.values(monitoringGroups)
      .filter((group) => group.label !== 'All')
      .forEach((group) => {
        toggles[group.label] = groupToggleHandler(group.label);
      });
    return toggles;
  }, [monitoringGroups, groupToggleHandler]);

  // create the filter string for download links based on active toggles
  const buildFilter = useCallback(
    (groups: MonitoringLocationGroups) => {
      let filter = '';

      const selectedNames = Object.keys(groups).filter((label) => {
        return label !== 'All' && groups[label].toggled;
      });

      const groupsCount = Object.values(groups).filter(
        (group) => group.label !== 'All',
      ).length;

      if (selectedNames.length !== groupsCount) {
        for (const name of selectedNames) {
          filter +=
            '&characteristicType=' +
            groups[name].characteristicGroups.join('&characteristicType=');
        }
      }

      if (annualRecordsReady) {
        filter += `&startDateLo=01-01-${selectedMonitoringYearsRange[0]}&startDateHi=12-31-${selectedMonitoringYearsRange[1]}`;
      }

      return filter;
    },
    [annualRecordsReady, selectedMonitoringYearsRange],
  );

  // All stations in the current time range.
  const [locationsFilteredByTime, setLocationsFilteredByTime] = useState<
    MonitoringLocationAttributes[]
  >([]);
  useEffect(() => {
    if (!configFiles) return;

    const newLocationsFilteredByTime = (
      monitoringGroups['All']?.stations ?? []
    ).map((station) =>
      filterLocationMeasurementsByTimeframe(
        station,
        annualRecordsReady ? selectedMonitoringYearsRange : null,
        configFiles.data.characteristicGroupMappings,
      ),
    );
    setLocationsFilteredByTime(newLocationsFilteredByTime);

    const newFilteredLocations = filterLocationsByCharcGroups(
      newLocationsFilteredByTime,
      monitoringGroups,
    );

    // Add filtered data that's relevent to map popups.
    if (annualRecordsReady) {
      updateFeatures(newFilteredLocations);
    }

    setFilteredLocations(newFilteredLocations);
  }, [
    annualRecordsReady,
    configFiles,
    monitoringGroups,
    selectedMonitoringYearsRange,
    setFilteredLocations,
    updateFeatures,
  ]);

  // Update the watershed total measurements and samples counts.
  let toggledLocationsCount = 0;
  let toggledMeasurementsCount = 0;
  filteredLocations.forEach((station) => {
    toggledLocationsCount++;
    Object.keys(monitoringGroups)
      .filter((group) => group !== 'All')
      .forEach((group) => {
        if (monitoringGroups[group].toggled) {
          toggledMeasurementsCount += station.totalsByLabel[group];
        }
      });
  });

  // Build the download URL and portal URL.
  const charGroupFilters = buildFilter(monitoringGroups);
  const downloadUrl =
    `${configFiles.data.services.waterQualityPortal.resultSearch}zip=no` +
    (huc12 ? `&huc=${huc12}` : '') +
    wqxIds.map((id) => `&organization=${id}`).join('') +
    `${charGroupFilters}`;
  const portalUrl =
    `${configFiles.data.services.waterQualityPortal.userInterface}#advanced=true` +
    (huc12 ? `&huc=${huc12}` : '') +
    wqxIds.map((id) => `&organization=${id}`).join('') +
    `${charGroupFilters}&dataProfile=resultPhysChem` +
    `&providers=NWIS&providers=STEWARDS&providers=STORET`;

  const handleDateSliderChange = useCallback(
    (newRange: number[]) => {
      setSelectedMonitoringYearsRange(newRange);
    },
    [setSelectedMonitoringYearsRange],
  );

  return (
    <>
      <div css={sliderContainerStyles}>
        {monitoringPeriodOfRecordStatus === 'failure' && (
          <div css={modifiedErrorBoxStyles}>
            <p>
              Annual Past Water Conditions data is temporarily unavailable,
              please try again later.
            </p>
          </div>
        )}
        {monitoringPeriodOfRecordStatus === 'pending' && <LoadingSpinner />}
        {monitoringPeriodOfRecordStatus === 'success' && (
          <Slider
            max={monitoringYearsRange[1]}
            min={monitoringYearsRange[0]}
            disabled={!monitoringYearsRange[0] || !monitoringYearsRange[1]}
            onChange={handleDateSliderChange}
            range={[
              selectedMonitoringYearsRange[0],
              selectedMonitoringYearsRange[1],
            ]}
            headerElm={
              <p css={subheadingStyles}>
                <HelpTooltip label="Adjust the slider handles to filter location data by the selected year range" />
                &nbsp;&nbsp; Date range for the <em>{locationName}</em>{' '}
                {locationType}{' '}
              </p>
            }
          />
        )}
      </div>

      <table
        css={modifiedToggleTableStyles}
        aria-label="Monitoring Location Summary"
        className="table"
      >
        <thead>
          <tr>
            <th>
              <label css={toggleStyles}>
                <Switch checked={allToggled} onChange={toggleAll} />
                <span>All Monitoring Locations</span>
              </label>
            </th>
            <th colSpan={2}>Location Count</th>
            <th>Measurement Count</th>
          </tr>
        </thead>

        <tbody>
          {Object.values(monitoringGroups)
            .filter(
              (group) => group.label !== 'All' && group.stations.length > 0,
            )
            .sort((a, b) => {
              // sort the switches with Other at the end
              if (a.label === 'Other') return 1;
              if (b.label === 'Other') return -1;
              return a.label > b.label ? 1 : -1;
            })
            .map((group) => {
              // get the number of measurements for this group type
              let measurementCount = 0;
              let locationCount = 0;
              locationsFilteredByTime.forEach((station) => {
                if (station.totalsByLabel[group.label] > 0) {
                  measurementCount += station.totalsByLabel[group.label];
                  locationCount++;
                }
              });

              return (
                <tr key={group.label}>
                  <td>
                    <label css={toggleStyles}>
                      <Switch
                        checked={group.toggled}
                        onChange={groupToggleHandlers?.[group.label]}
                      />
                      <span>{group.label}</span>
                    </label>
                  </td>
                  <td colSpan={2}>{locationCount.toLocaleString()}</td>
                  <td>{measurementCount.toLocaleString()}</td>
                </tr>
              );
            })}

          <tr css={totalRowStyles}>
            <td>
              <div css={toggleStyles}>
                <div style={{ width: '38px' }} />
                <span>Totals</span>
              </div>
            </td>
            <td colSpan={2}>
              {Number(toggledLocationsCount).toLocaleString()}
            </td>
            <td>{Number(toggledMeasurementsCount).toLocaleString()}</td>
          </tr>
        </tbody>

        <tfoot css={tableFooterStyles}>
          <tr>
            <td colSpan={2}>
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-cy="portal"
                style={{ fontWeight: 'normal' }}
              >
                <i
                  css={iconStyles}
                  className="fas fa-filter"
                  aria-hidden="true"
                />
                Advanced Filtering
              </a>
              &nbsp;&nbsp;
              <small css={modifiedDisclaimerStyles}>
                (opens new browser tab)
              </small>
            </td>

            <td colSpan={2}>
              <span>Download All Selected Data</span>
              <span>
                &nbsp;&nbsp;
                {filteredLocations.length > 0 ? (
                  <a href={`${downloadUrl}&mimeType=xlsx`}>
                    <HelpTooltip
                      label="Download XLSX"
                      description="Download selected data as an XLSX file."
                    >
                      <i className="fas fa-file-excel" aria-hidden="true" />
                    </HelpTooltip>
                  </a>
                ) : (
                  <i
                    className="fas fa-file-excel"
                    aria-hidden="true"
                    style={{ color: '#ccc' }}
                  />
                )}
                &nbsp;&nbsp;
                {filteredLocations.length > 0 ? (
                  <a href={`${downloadUrl}&mimeType=csv`}>
                    <HelpTooltip
                      label="Download CSV"
                      description="Download selected data as a CSV file."
                    >
                      <i className="fas fa-file-csv" aria-hidden="true" />
                    </HelpTooltip>
                  </a>
                ) : (
                  <i
                    className="fas fa-file-csv"
                    aria-hidden="true"
                    style={{ color: '#ccc' }}
                  />
                )}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </>
  );
}

/*
## Types
*/

type MonitoringLocationUpdates = {
  characteristicsByGroup: string;
  timeframe: string;
  totalMeasurements: number;
  totalsByCharacteristic: string;
  totalsByGroup: string;
};

type Props = {
  filteredLocations: MonitoringLocationAttributes[];
  huc12?: string;
  locationName: string;
  locationType: 'tribe' | 'watershed';
  setFilteredLocations: Dispatch<
    SetStateAction<MonitoringLocationAttributes[]>
  >;
  setMonitoringDisplayed: Dispatch<SetStateAction<boolean>>;
  wqxIds?: string[];
};

export default PastWaterConditionsFilters;
