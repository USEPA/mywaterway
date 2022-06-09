// eslint-disable-next-line import/no-anonymous-default-export
export default () => {
  function getLabel(charType, labelMappings) {
    for (let mapping of labelMappings) {
      if (mapping.groupNames.includes(charType)) return mapping.label;
    }
  }

  // eslint-disable-next-line no-restricted-globals
  self.onmessage = function (message) {
    const [records, mappings] = message.data;
    const results = {};
    if (records.length) {
      records.forEach((record) => {
        const id =
          `${record.MonitoringLocationIdentifier}-` +
          `${record.Provider}-` +
          `${record.OrganizationIdentifier}`;
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
          !(
            record.CharacteristicType in stationDataForYear.stationTotalsByGroup
          )
        ) {
          stationDataForYear.stationTotalsByGroup[
            record.CharacteristicType
          ] = 0;
        }
        stationDataForYear.stationTotalsByGroup[record.CharacteristicType] +=
          record.ResultCount;
        const label = getLabel(record.CharacteristicType, mappings);
        if (!(label in stationDataForYear.stationTotalsByLabel)) {
          stationDataForYear.stationTotalsByLabel[label] = 0;
        }
        stationDataForYear.stationTotalsByLabel[label] += record.ResultCount;
      });

      let minYear = Infinity;
      let maxYear = 0;
      const dataBySite = {};
      for (const [year, annualSiteData] of Object.entries(results)) {
        if (year < minYear) minYear = year;
        if (year > maxYear) maxYear = year;
        Object.values(annualSiteData).forEach((site) => {
          const id = site.uniqueId;
          if (!(id in dataBySite)) dataBySite[id] = {};
          dataBySite[id][year] = results[year][id];
        });
      }
      const output = { minYear, maxYear, annualData: dataBySite };
      postMessage(JSON.stringify(output));
    }
  };
};
