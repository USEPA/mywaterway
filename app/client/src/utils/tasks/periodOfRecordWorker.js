import Papa from 'papaparse';
import { structurePeriodOfRecordData } from 'utils/utils';

// This makes sure the listener isn't set twice
if ('function' === typeof importScripts) {
  // eslint-disable-next-line no-restricted-globals
  self.onmessage = function (message) {
    const [target, mappings] = message.data;

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
