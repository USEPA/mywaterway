const axios = require('axios');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const configCache = require('../server/utilities/configCache');
const { getEnvironment } = require('../server/utilities/environment');
const logger = require('../server/utilities/logger');
const log = logger.logger;

// local development: read files directly from disk
// Cloud.gov: fetch files from the public s3 bucket
async function getFile(
  s3BucketUrl,
  filename,
  isLocal,
  responseType = undefined,
) {
  return isLocal
    ? readFile(path.resolve(__dirname, '../public', filename))
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

function getFiles(s3BucketUrl, filenames, dataMapper) {
  return new Promise((resolve, reject) => {
    const { isLocal, isTest } = getEnvironment();
    const isLocalTest = isLocal || isTest;

    const promise =
      filenames.length > 1
        ? Promise.all(
            filenames.map((filename) => {
              return getFile(s3BucketUrl, filename, isLocalTest);
            }),
          )
        : getFile(s3BucketUrl, filenames[0], isLocalTest);

    promise
      .then((stringsOrResponses) => {
        return parseResponse(stringsOrResponses, isLocalTest);
      })
      .then((data) => {
        if (dataMapper) resolve(dataMapper(data));
        resolve(data);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

// --- get static content from S3
// NOTE: static content files found in `app/server/app/public/content` directory
async function updateCache(s3BucketUrl) {
  log.info(
    `START config file cache update cron task on instance: ${process.env.CF_INSTANCE_INDEX}`,
  );

  try {
    const start = performance.now();

    const promises = [];
    promises.push(
      getFiles(
        s3BucketUrl,
        [
          'content/dataPage.json',
          'content/disclaimers.json',
          'content/educators.json',
          'content/attains/eqProfileColumns.json',
          'content/attains/impairmentFields.json',
          'content/attains/parameters.json',
          'content/attains/useFields.json',
          'content/cache/glossary.json',
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
          'content/state/page.json',
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
            statePage: data[19],
            reportStatusMapping: data[20],
            stateNationalUses: data[21],
            surveyMapping: data[22],
            waterTypeOptions: data[23],
            attainsTribeMapping: data[24],
            wqxTribeMapping: data[25],
          };
        },
      ).then((res) => configCache.set('configFiles', res)),
      getFiles(s3BucketUrl, ['content/config/supported-browsers.json']).then(
        (res) => configCache.set('supportedBrowsers', res),
      ),
    );

    await Promise.all(promises);

    log.info(
      `END config file cache update cron task on instance: ${process.env.CF_INSTANCE_INDEX} | took: ${performance.now() - start}ms`,
    );
  } catch (err) {
    log.error(`Failed to update config files cache: ${err}`);
  }
}

module.exports = updateCache;
