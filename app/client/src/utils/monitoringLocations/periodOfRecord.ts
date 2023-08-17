import { fetchParseCsv } from 'utils/fetchUtils';
// types
import type { CharacteristicGroupMappings } from 'config/characteristicGroupMappings';
import type { AnnualStationData } from 'types';

export type MonitoringPeriodOfRecordData = {
  minYear: number;
  maxYear: number;
  sites: {
    [siteId: string]: {
      [year: string]: AnnualStationData;
    };
  };
};

interface PeriodOfRecordDatum {
  Provider: string;
  MonitoringLocationIdentifier: string;
  YearSummarized: number;
  CharacteristicType: string;
  CharacteristicName: string;
  ActivityCount: number;
  ResultCount: number;
  OrganizationIdentifier: string;
}

// Helper function to get label of characteristic group
function getCharcLabel(
  charcGroup: string,
  labelMappings: CharacteristicGroupMappings,
) {
  for (let mapping of labelMappings) {
    if (mapping.groupNames.includes(charcGroup)) return mapping.label;
  }
  return 'Other';
}

function incrementTotals(
  station: AnnualStationData,
  record: PeriodOfRecordDatum,
  mappings: CharacteristicGroupMappings,
) {
  station.totalMeasurements += record.ResultCount;
  station.totalSamples += record.ActivityCount;
  // Increment characteristic count
  const charcName = record.CharacteristicName;
  if (!(charcName in station.totalsByCharacteristic)) {
    station.totalsByCharacteristic[charcName] = 0;
  }
  station.totalsByCharacteristic[charcName] += record.ResultCount;
  // Increment group count
  const charcGroup = record.CharacteristicType;
  if (!(charcGroup in station.totalsByGroup)) {
    station.totalsByGroup[charcGroup] = 0;
  }
  station.totalsByGroup[charcGroup] += record.ResultCount;
  // Increment label count
  const charcLabel = getCharcLabel(record.CharacteristicType, mappings);
  if (!(charcLabel in station.totalsByLabel)) {
    station.totalsByLabel[charcLabel] = 0;
  }
  station.totalsByLabel[charcLabel] += record.ResultCount;
  // Update characteristic by group mapping
  if (!(charcGroup in station.characteristicsByGroup)) {
    station.characteristicsByGroup[charcGroup] = [];
  }
  if (!station.characteristicsByGroup[charcGroup].includes(charcName)) {
    station.characteristicsByGroup[charcGroup].push(charcName);
  }
}

export function structurePeriodOfRecordData(
  records: PeriodOfRecordDatum[],
  mappings: CharacteristicGroupMappings,
) {
  let minYear = Infinity;
  let maxYear = 0;
  const results: MonitoringPeriodOfRecordData['sites'] = {};
  records.forEach((record) => {
    const year = record.YearSummarized;
    if (year < minYear) minYear = year;
    if (year > maxYear) maxYear = year;
    const id =
      `${record.MonitoringLocationIdentifier}-` +
      `${record.Provider}-` +
      `${record.OrganizationIdentifier}`;
    // Structure the relevant fields of the
    // returned data, keyed by id
    if (!(id in results)) {
      results[id] = {};
    }
    if (!(year in results[id])) {
      results[id][year] = {
        characteristicsByGroup: {},
        uniqueId: id,
        totalMeasurements: 0,
        totalSamples: 0,
        totalsByCharacteristic: {},
        totalsByGroup: {},
        totalsByLabel: {},
      };
    }
    incrementTotals(results[id][year], record, mappings);
  });
  if (minYear > maxYear) minYear = 0;
  return { minYear, maxYear, sites: results };
}

// This makes sure the listener isn't set twice
if ('function' === typeof importScripts) {
  // eslint-disable-next-line no-restricted-globals
  self.onmessage = function (message) {
    const [target, mappings] = message.data;

    fetchParseCsv(target, { worker: false }) // already in a worker
      .then((records) => {
        if (records.length) {
          const recordsById = structurePeriodOfRecordData(records, mappings);
          postMessage(JSON.stringify({ status: 'success', data: recordsById }));
        }
      })
      .catch((_err) => {
        postMessage(
          JSON.stringify({
            status: 'failure',
            data: { minYear: 0, maxYear: 0, sites: {} },
          }),
        );
      });
  };
}
