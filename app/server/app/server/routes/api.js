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

    const isLocal = app.enabled('isLocal') || app.enabled('isTest');
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

  router.get('/health', function (req, res, next) {
    res.json({ status: 'UP' });
  });

  // --- get static content from S3
  router.get('/configFiles', (req, res) => {
    // NOTE: static content files found in `app/server/app/public/data` directory
    getFiles(
      req,
      res,
      [
        'data/dataPage.json',
        'data/educators.json',
        'data/attains/eqProfileColumns.json',
        'data/attains/impairmentFields.json',
        'data/attains/parameters.json',
        'data/attains/useFields.json',
        'data/cache/glossary.json',
        'data/community/characteristicGroupMappings.json',
        'data/community/cyan-metadata.json',
        'data/community/extreme-weather.json',
        'data/community/upper-content.json',
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
        'data/tribe/attainsTribeMapping.json',
        'data/tribe/wqxTribeMapping.json',
      ],
      (data) => {
        return {
          dataPage: data[0],
          educators: data[1],
          eqProfileColumns: data[2],
          impairmentFields: data[3],
          parameters: data[4],
          useFields: data[5],
          glossary: data[6],
          characteristicGroupMappings: data[7],
          cyanMetadata: data[8],
          extremeWeather: data[9],
          upperContent: data[10],
          usgsStaParameters: data[11],
          layerProps: data[12],
          services: data[13],
          NARS: data[14],
          notifications: data[15],
          documentOrder: data[16],
          reportStatusMapping: data[17],
          stateNationalUses: data[18],
          surveyMapping: data[19],
          waterTypeOptions: data[20],
          attainsTribeMapping: data[21],
          wqxTribeMapping: data[22],
        };
      },
    );
  });

  // --- get static content from S3
  router.get('/supportedBrowsers', (req, res) => {
    // NOTE: static content files found in `app/server/app/public/data` directory
    getFiles(req, res, ['data/config/supported-browsers.json']);
  });

  router.use((req, res) => {
    res.status(404).json({ message: 'The api route does not exist.' });
  });

  app.use('/api', router);
};
