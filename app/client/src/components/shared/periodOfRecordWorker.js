// @flow

import Papa from 'papaparse';
// config
import { characteristicGroupMappings as labelMappings } from 'config/characteristicGroupMappings';

function fetchParseCsv(url) {
  let parseResults = null;
  Papa.parse(url, {
    complete: (results) => (parseResults = results),
    download: true,
    dynamicTyping: true,
    error: (e) => {
      parseResults = null;
      return new Error('Papa Parse error');
    },
    header: true,
  });
  return parseResults;
}

function getTotalMeasurementPercentiles(year) {
  // sort ascending order
  if (year) {
    const stationsSorted = Object.values(year);
    stationsSorted.sort((a, b) => {
      return a.stationTotalMeasurements - b.stationTotalMeasurements;
    });

    // build a simple array of stationTotalMeasurements
    const measurementsArray = stationsSorted.map((station) => {
      return station.stationTotalMeasurements;
    });

    // calculate percentiles
    measurementsArray.forEach((measurement, index) => {
      // get the rank and then move them into 4 buckets
      let rank = percentRank(measurementsArray, measurement);
      if (rank < 0.25) rank = 0.24;
      if (rank >= 0.25 && rank < 0.5) rank = 0.49;
      if (rank >= 0.5 && rank < 0.75) rank = 0.74;
      if (rank >= 0.75 && rank <= 1) rank = 1;

      stationsSorted[index].stationTotalMeasurementsPercentile = rank;
    });
  }
}

// Returns the percentile of the given value in a sorted numeric array.
function percentRank(array, value) {
  const count = array.length;

  for (let i = 0; i < count; i++) {
    if (value <= array[i]) {
      while (i < count && value === array[i]) i++;
      if (i === 0) return 0;
      if (value !== array[i - 1]) {
        i += (value - array[i - 1]) / (array[i] - array[i - 1]);
      }
      return i / count;
    }
  }
  return 1;
}

function getLabel(charType) {
  for (let mapping of labelMappings) {
    if (mapping.groupNames.includes(charType)) return mapping.label;
  }
}

// eslint-disable-next-line no-restricted-globals
self.onmessage = function (e) {
  const url = e.data;
  const records = fetchParseCsv(url);
  const results = {};
  if (records) {
    records.forEach((record) => {
      const id =
        `${record.MonitoringLocationIdentifier}-` +
        `${record.Provider}-` +
        `${record.OrganizationIdentifier}`;
      if (!(record.YearSummarized in results)) {
        results[record.YearSummarized] = {};
      }
      let stationDataForYear = results[record.YearSummarized][id];
      if (!(id in results[record.YearSummarized])) {
        stationDataForYear = {
          uniqueId: id,
          stationTotalMeasurements: 0,
          stationTotalMeasurementsPercentile: null,
          stationTotalSamples: 0,
          stationTotalsByCharacteristic: {},
          stationTotalsByGroup: {},
          stationTotalsByLabel: {},
        };
      }
      stationDataForYear.stationTotalMeasurements += record.ResultCount;
      stationDataForYear.stationTotalSamples += record.ActivityCount;
      if (
        !(
          record.CharacteristicName in
          stationDataForYear.stationTotalsByCharacteristic
        )
      ) {
        stationDataForYear.stationTotalsByCharacteristic[
          record.CharacteristicName
        ] = 0;
      }
      stationDataForYear.stationTotalsByCharacteristic[
        record.CharacteristicName
      ] += record.ResultCount;
      if (
        !(record.CharacteristicType in stationDataForYear.stationTotalsByGroup)
      ) {
        stationDataForYear.stationTotalsByGroup[record.CharacteristicType] = 0;
      }
      stationDataForYear.stationTotalsByGroup[record.CharacteristicType] +=
        record.ResultCount;
      const label = getLabel(record.CharacteristicType);
      if (!(label in stationDataForYear.stationTotalsByLabel)) {
        stationDataForYear.stationTotalsByLabel[label] = 0;
      }
      stationDataForYear.stationTotalsByLabel[label] += record.ResultCount;
    });
    Object.keys(results).forEach((year) =>
      getTotalMeasurementPercentiles(results[year]),
    );
    postMessage(JSON.stringify(results));
  }
};
