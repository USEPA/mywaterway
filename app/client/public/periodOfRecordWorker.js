// Helper function to get label of characteristic group
function getLabel(charType, labelMappings) {
  for (let mapping of labelMappings) {
    if (mapping.groupNames.includes(charType)) return mapping.label;
  }
  return 'Other';
}

function incrementTotals(station, record, mappings) {
  station.stationTotalMeasurements += record.ResultCount;
  station.stationTotalSamples += record.ActivityCount;
  if (!(record.CharacteristicName in station.stationTotalsByCharacteristic)) {
    station.stationTotalsByCharacteristic[record.CharacteristicName] = 0;
  }
  station.stationTotalsByCharacteristic[record.CharacteristicName] +=
    record.ResultCount;
  if (!(record.CharacteristicType in station.stationTotalsByGroup)) {
    station.stationTotalsByGroup[record.CharacteristicType] = 0;
  }
  station.stationTotalsByGroup[record.CharacteristicType] += record.ResultCount;
  const label = getLabel(record.CharacteristicType, mappings);
  if (!(label in station.stationTotalsByLabel)) {
    station.stationTotalsByLabel[label] = 0;
  }
  station.stationTotalsByLabel[label] += record.ResultCount;
}

function structureByYear(records, mappings) {
  const results = {};
  records.forEach((record) => {
    const id =
      `${record.MonitoringLocationIdentifier}-` +
      `${record.Provider}-` +
      `${record.OrganizationIdentifier}`;
    // Structure the relevant fields of the
    // returned data, keyed by year
    if (!(record.YearSummarized in results)) {
      results[record.YearSummarized] = {};
    }
    let stationDataForYear =
      id in results[record.YearSummarized]
        ? results[record.YearSummarized][id]
        : null;
    if (!stationDataForYear) {
      stationDataForYear = {
        uniqueId: id,
        stationTotalMeasurements: 0,
        stationTotalSamples: 0,
        stationTotalsByCharacteristic: {},
        stationTotalsByGroup: {},
        stationTotalsByLabel: {},
      };
      results[record.YearSummarized][id] = stationDataForYear;
    }
    incrementTotals(stationDataForYear, record, mappings);
  });
  return results;
}

function structureByUniqueId(recordsByYear) {
  let minYear = Infinity;
  let maxYear = 0;
  const dataBySite = {};
  for (const [year, annualSiteData] of Object.entries(recordsByYear)) {
    if (year < minYear) minYear = year;
    if (year > maxYear) maxYear = year;
    Object.values(annualSiteData).forEach((site) => {
      const id = site.uniqueId;
      if (!(id in dataBySite)) dataBySite[id] = {};
      dataBySite[id][year] = recordsByYear[year][id];
    });
  }
  return { minYear, maxYear, annualData: dataBySite };
}

// This makes sure the listener isn't set twice
if ('function' === typeof importScripts) {
  // eslint-disable-next-line no-restricted-globals
  self.onmessage = function (message) {
    const [target, origin, mappings] = message.data;
    importScripts(`${origin}/papaparse.min.js`);

    // Use Papa Parse to parse CSV from the service URL
    function fetchParseCsv(url) {
      return new Promise((resolve, reject) => {
        Papa.parse(url, {
          complete: (results) => resolve(results.data),
          download: true,
          dynamicTyping: true,
          error: (err) => reject(err),
          header: true,
          worker: true,
        });
      });
    }

    fetchParseCsv(target)
      .then((records) => {
        if (records.length) {
          const recordsByYear = structureByYear(records, mappings);
          const recordsById = structureByUniqueId(recordsByYear);
          postMessage(JSON.stringify(recordsById));
        }
      })
      .catch((_err) => {
        const noData = { minYear: 0, maxYear: 0, annualData: {} };
        postMessage(JSON.stringify(noData));
      });
  };
}
