const zlib = require('node:zlib');
const { promisify } = require('node:util');
const gzip = promisify(zlib.gzip);

const cache = {
  configFiles: null,
  supportedBrowsers: null,
};

module.exports = {
  set: async (key, jsonObject) => {
    const jsonString = JSON.stringify(jsonObject);
    cache[key] = await gzip(jsonString);
  },
  get: (key) => cache[key],
  exists: (key) => cache[key] !== null,
};
