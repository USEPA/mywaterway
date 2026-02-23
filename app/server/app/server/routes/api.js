const express = require('express');
const updateConfigCache = require('../../tasks/updateConfigCache');
const configCache = require('../utilities/configCache');

async function sendCachedData(res, key, message) {
  const data = configCache.get(key);
  if (!data) {
    try {
      await updateConfigCache();
    } catch (err) {
      return res.status(500).json({ message });
    }
  }

  res.set({
    'Content-Type': 'application/json',
    'Content-Encoding': 'gzip',
  });
  res.send(data);
}

module.exports = function (app) {
  const router = express.Router();

  router.get('/health', function (req, res, next) {
    res.json({ status: 'UP' });
  });

  // --- get static content from S3
  router.get('/configFiles', (req, res) => {
    sendCachedData(res, 'configFiles', 'Failed to get config file cache...');
  });

  // --- get static content from S3
  router.get('/supportedBrowsers', (req, res) => {
    sendCachedData(res, 'supportedBrowsers', 'Failed to get supported browsers cache...');
  });

  router.use((req, res) => {
    res.status(404).json({ message: 'The api route does not exist.' });
  });

  app.use('/api', router);
};
