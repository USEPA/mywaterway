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

async function updateUsgsSiteTypes(retryCount = 0) {
  log.info(
    `Running USGS site-types cron task on instance: ${process.env.CF_INSTANCE_INDEX}`,
  );

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
    const siteTypesUrl = JSON.parse(services).usgs.siteTypes;

    // fetch the data
    const res = await axios.get(`${siteTypesUrl}?f=json&limit=10000`, {
      timeout: 10_000,
    });
    if (res.status !== 200) {
      if (retryCount < 3) {
        log.info(
          'Non-200 response returned from USGS site-types service, retrying',
        );
        await setTimeout(5_000);
        return updateUsgsSiteTypes(retryCount + 1);
      } else {
        throw new Error('USGS site-types request retry count exceeded');
      }
    }

    // transform the USGS site-type data
    const siteTypes = res.data.features.map((item) => ({
      code: item.id,
      name: item.properties.site_type_name,
    }));

    const siteTypeDictionary = siteTypes.reduce((acc, currentItem) => {
      // Set the parameter 'code' as the key and the parameter 'name' as the value
      acc[currentItem.code] = currentItem.name;
      return acc;
    }, {});

    // store the data in public S3 (or local FS)
    await uploadFileS3(
      'usgs-site-types.json',
      JSON.stringify(siteTypeDictionary),
    );
  } catch (err) {
    log.error(`Failed to update USGS site-types: ${err}`);
  }
}

module.exports = updateUsgsSiteTypes;

if (require.main === module) {
  log.info('Starting Task: USGS site-types');
  updateUsgsSiteTypes().then(() => log.info('Task Completed: USGS site-types'));
}
