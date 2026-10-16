import { fetchParseCsv } from './fetchUtils';

// This makes sure the listener isn't set twice
if ('function' === typeof importScripts) {
  // eslint-disable-next-line no-restricted-globals
  self.onmessage = function (message) {
    fetchParseCsv(message.data)
      .then((records) => postMessage({ status: 'success', records }))
      .catch((_err) => postMessage({ status: 'failure', records: null }));
  };
}
