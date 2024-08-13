const axios = require('axios');
const express = require('express');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const logger = require('../utilities/logger');
const log = logger.logger;

function logError(error, metadataObj, isLocal) {
  if (isLocal) {
    log.error(error);
    return;
  }

  if (typeof error.toJSON === 'function') {
    log.debug(logger.formatLogMsg(metadataObj, error.toJSON()));
  }

  const errorStatus = error.response?.status;
  const errorMethod = error.response?.config?.method?.toUpperCase();
  const errorUrl = error.response?.config?.url;
  const message = `S3 Error: ${errorStatus} ${errorMethod} ${errorUrl}`;
  log.error(logger.formatLogMsg(metadataObj, message));
}

// local development: read files directly from disk
// Cloud.gov: fetch files from the public s3 bucket
async function getFile(
  s3BucketUrl,
  filename,
  isLocal,
  responseType = undefined,
) {
  return isLocal
    ? readFile(path.resolve(__dirname, '../../public', filename))
    : axios({
        method: 'get',
        url: `${s3BucketUrl}/${filename}`,
        timeout: 10000,
        responseType,
      });
}

// local development: no further processing of strings needed
// Cloud.gov: get data from responses
function parseResponse(res, isLocal) {
  if (Array.isArray(res)) {
    return isLocal ? res.map((r) => JSON.parse(r)) : res.map((r) => r.data);
  } else {
    return isLocal ? JSON.parse(res) : res.data;
  }
}

module.exports = function (app) {
  const router = express.Router();

  function getFiles(req, res, filenames, dataMapper) {
    const metadataObj = logger.populateMetdataObjFromRequest(req);

    const isLocal = app.enabled('isLocal');
    const s3BucketUrl = app.get('s3_bucket_url');

    const promise =
      filenames.length > 1
        ? Promise.all(
            filenames.map((filename) => {
              return getFile(s3BucketUrl, filename, isLocal);
            }),
          )
        : getFile(s3BucketUrl, filenames[0], isLocal);

    promise
      .then((stringsOrResponses) => {
        return parseResponse(stringsOrResponses, isLocal);
      })
      .then((data) => {
        if (dataMapper) return dataMapper(data);
        return data;
      })
      .then((data) => res.json(data))
      .catch((error) => {
        logError(error, metadataObj, isLocal);

        return res
          .status(error?.response?.status || 500)
          .json({ message: 'Error getting static content from S3 bucket' });
      });
  }

  // --- get static content from S3
  router.get('/configFiles', (req, res) => {
    // NOTE: static content files found in `app/server/app/public/data` directory
    getFiles(
      req,
      res,
      [
        'data/dataPage.json',
        'data/educators.json',
        'data/attains/impairmentFields.json',
        'data/attains/parameters.json',
        'data/attains/useFields.json',
        'data/cache/glossary.json',
        'data/community/characteristicGroupMappings.json',
        'data/community/cyan-metadata.json',
        'data/community/extreme-weather.json',
        'data/community/usgs-sta-parameters.json',
        'data/config/layerProps.json',
        'data/config/services.json',
        'data/national/NARS.json',
        'data/notifications/messages.json',
        'data/state/documentOrder.json',
        'data/state/reportStatusMapping.json',
        'data/state/stateNationalUses.json',
        'data/state/surveyMapping.json',
        'data/state/waterTypeOptions.json',
        'data/tribe/tribeMapping.json',
      ],
      (data) => {
        return {
          dataPage: data[0],
          educators: data[1],
          impairmentFields: data[2],
          parameters: data[3],
          useFields: data[4],
          glossary: data[5],
          characteristicGroupMappings: data[6],
          cyanMetadata: data[7],
          extremeWeather: data[8],
          usgsStaParameters: data[9],
          layerProps: data[10],
          services: data[11],
          NARS: data[12],
          notifications: data[13],
          documentOrder: data[14],
          reportStatusMapping: data[15],
          stateNationalUses: data[16],
          surveyMapping: data[17],
          waterTypeOptions: data[18],
          tribeMapping: data[19],
        };
      },
    );
  });

  // --- get static content from S3
  router.get('/supportedBrowsers', (req, res) => {
    // NOTE: static content files found in `app/server/app/public/data` directory
    getFiles(req, res, ['data/config/supported-browsers.json']);
  });

  app.use('/api', router);

  app.get('/api/*', (req, res) => {
    res.status(404).json({ message: 'The api route does not exist.' });
  });
};
