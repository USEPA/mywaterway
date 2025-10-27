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
    // NOTE: static content files found in `app/server/app/public/content` directory
    getFiles(
      req,
      res,
      [
        'content/dataPage.json',
        'content/disclaimers.json',
        'content/educators.json',
        'content/attains/eqProfileColumns.json',
        'content/attains/impairmentFields.json',
        'content/attains/parameters.json',
        'content/attains/useFields.json',
        'content/cache/glossary.json',
        'content/cache/usgs-parameter-codes.json',
        'content/cache/usgs-site-types.json',
        'content/community/characteristicGroupMappings.json',
        'content/community/cyan-metadata.json',
        'content/community/extreme-weather.json',
        'content/community/upper-content.json',
        'content/community/usgs-sta-parameters.json',
        'content/config/layerProps.json',
        'content/config/services.json',
        'content/national/NARS.json',
        'content/notifications/messages.json',
        'content/state/documentOrder.json',
        'content/state/reportStatusMapping.json',
        'content/state/stateNationalUses.json',
        'content/state/surveyMapping.json',
        'content/state/waterTypeOptions.json',
        'content/tribe/attainsTribeMapping.json',
        'content/tribe/wqxTribeMapping.json',
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
          usgsParameterCodes: data[8],
          usgsSiteTypes: data[9],
          characteristicGroupMappings: data[10],
          cyanMetadata: data[11],
          extremeWeather: data[12],
          upperContent: data[13],
          usgsStaParameters: data[14],
          layerProps: data[15],
          services: data[16],
          NARS: data[17],
          notifications: data[18],
          documentOrder: data[19],
          reportStatusMapping: data[20],
          stateNationalUses: data[21],
          surveyMapping: data[22],
          waterTypeOptions: data[23],
          attainsTribeMapping: data[24],
          wqxTribeMapping: data[25],
        };
      },
    );
  });

  // --- get static content from S3
  router.get('/supportedBrowsers', (req, res) => {
    // NOTE: static content files found in `app/server/app/public/content` directory
    getFiles(req, res, ['content/config/supported-browsers.json']);
  });

  router.use((req, res) => {
    res.status(404).json({ message: 'The api route does not exist.' });
  });

  app.use('/api', router);
};
