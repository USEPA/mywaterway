const { GetObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');
const { readFileSync } = require('fs');
const { resolve } = require('path');
const { setTimeout } = require('timers/promises');
const { getEnvironment } = require('../server/utilities/environment');
const logger = require('../server/utilities/logger');
const {
  getS3Client,
  getS3Config,
  uploadFileS3,
} = require('../server/utilities/s3');

const log = logger.logger;

async function retryFetch(url, retryCount = 0) {
  // fetch the data
  const res = await axios.get(url, {
    timeout: 10_000,
  });
  if (res.status !== 200) {
    if (retryCount < 3) {
      log.info('Non-200 response returned from USGS parameter-codes service, retrying');
      await setTimeout(5_000);
      return updateUsgsParameterCodes(retryCount + 1);
    } else {
      throw new Error('USGS parameter-codes request retry count exceeded');
    }
  }

  return res.data;
}

async function updateUsgsParameterCodes(retryCount = 0) {
  log.info(`Running USGS parameter-codes cron task on instance: ${process.env.CF_INSTANCE_INDEX}`);

  try {
    const { isLocal } = getEnvironment();

    // get the URL of the USGS lookup service
    let services;
    if (isLocal) {
      services = readFileSync(
        resolve(__dirname, '../public/data/config/services.json'),
        'utf8',
      );
    } else {
      const command = new GetObjectCommand({
        Bucket: getS3Config().bucket,
        Key: 'data/config/services.json',
      });
      const s3 = getS3Client();
      services = await (await s3.send(command)).Body.transformToString();
    }
    const parameterCodesUrl = JSON.parse(services).usgs.parameterCodes;

    const limit = 10_000;
    let offset = 0;
    let rowsReturned = -1;
    const responses = [];
    while (rowsReturned !== 0) {
      const res = await retryFetch(`${parameterCodesUrl}?f=json&limit=${limit}&offset=${offset}`);
      offset += limit;
      rowsReturned = res.numberReturned;
      responses.push(res);
    }

    const parameterCodes = responses.flatMap((res) => {
      return res.features.map((item) => ({
        code: item.id,
        name: item.properties.parameter_name,
      }));
    });

    const parameterCodeDictionary = parameterCodes.reduce((acc, currentItem) => {
      // Set the parameter 'code' as the key and the parameter 'name' as the value
      acc[currentItem.code] = currentItem.name;
      return acc;
    }, {}); 
    
    // store the data in public S3 (or local FS)
    await uploadFileS3('usgs-parameter-codes.json', JSON.stringify(parameterCodeDictionary));
  } catch (err) {
    log.error(`Failed to update USGS parameter-codes: ${err}`);
  }
}

module.exports = updateUsgsParameterCodes;

if (require.main === module) {
  log.info('Starting Task: USGS parameter-codes');
  updateUsgsParameterCodes().then(() => log.info('Task Completed: USGS parameter-codes'));
}