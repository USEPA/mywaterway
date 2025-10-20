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
        'data/disclaimers.json',
        'data/educators.json',
        'data/attains/eqProfileColumns.json',
        'data/attains/impairmentFields.json',
        'data/attains/parameters.json',
        'data/attains/useFields.json',
        'data/cache/glossary.json',
        'data/cache/usgs-site-types.json',
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
          disclaimers: data[1],
          educators: data[2],
          eqProfileColumns: data[3],
          impairmentFields: data[4],
          parameters: data[5],
          useFields: data[6],
          glossary: data[7],
          usgsSiteTypes: data[8],
          characteristicGroupMappings: data[9],
          cyanMetadata: data[10],
          extremeWeather: data[11],
          upperContent: data[12],
          usgsStaParameters: data[13],
          layerProps: data[14],
          services: data[15],
          NARS: data[16],
          notifications: data[17],
          documentOrder: data[18],
          reportStatusMapping: data[19],
          stateNationalUses: data[20],
          surveyMapping: data[21],
          waterTypeOptions: data[22],
          attainsTribeMapping: data[23],
          wqxTribeMapping: data[24],
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
