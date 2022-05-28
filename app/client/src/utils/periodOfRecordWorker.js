// @flow

import Papa from 'papaparse';

type AnnualStationData = {|
  uniqueId: string,
  stationTotalMeasurements: number,
  stationTotalMeasurementsPercentile: ?number,
  stationTotalSamples: number,
  stationTotalsByCharacteristic: { [characteristic: string]: number },
  stationTotalsByGroup: { [group: string]: number },
  stationTotalsByLabel: { [label: string]: number },
|};

type AnnualStationsData = { [uniqueId: string]: AnnualStationData };

type AllYearsStationData = { [year: number]: AnnualStationsData };

function fetchParseCsv(url: string) {
  let parseResults = null;
  Papa.parse(url, {
    complete: (results) => (parseResults = results),
    download: true,
    dynamicTyping: true,
    error: (err) => (parseResults = null),
    header: true,
  });
  return parseResults;
}

function getTotalMeasurementPercentiles(year: AnnualStationsData) {
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

onmessage = function (e) {
  const url: string = e.data;
  const records = fetchParseCsv(url);
  const results: AllYearsStationData = {};
  if (records) {
    records.forEach((record) => {
      const id =
        `${record.MonitoringLocationIdentifier}-` +
        `${record.Provider}-` +
        `${record.OrganizationIdentifier}`;
      if (!(record.YearSummarized in results)) {
        results[record.YearSummarized] = {};
      }
      if (!(id in results[record.YearSummarized])) {
        results[record.YearSummarized][id] = {
          uniqueId: id,
          stationTotalMeasurements: 0,
          stationTotalMeasurementsPercentile: null,
          stationTotalSamples: 0,
          stationTotalsByCharacteristic: {},
          stationTotalsByGroup: {},
          stationTotalsByLabel: {},
        };
      }
    });
  }
};
