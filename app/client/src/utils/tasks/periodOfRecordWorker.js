import { fetchParseCsv } from 'utils/fetchUtils';
import { structurePeriodOfRecordData } from 'utils/utils';

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
