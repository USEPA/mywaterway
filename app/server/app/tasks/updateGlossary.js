const { GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');
const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');
const { setTimeout } = require('timers/promises');
const { getEnvironment } = require('../server/utilities/environment');
const logger = require('../server/utilities/logger');
const { getS3Client, getS3Config } = require('../server/utilities/s3');

const log = logger.logger;

async function updateGlossary(retryCount = 0) {
  try {
    const { isLocal } = getEnvironment();

    // get the URL of the glossary service
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
      services = await s3.send(command).Body.transformToString();
    }
    const glossaryUrl = JSON.parse(services).glossaryURL;

    // fetch the glossary data
    const res = await axios.get(glossaryUrl, {
      headers: {
        authorization: `basic ${process.env.GLOSSARY_AUTH}`,
      },
      timeout: 10_000,
    });
    if (res.status !== 200) {
      if (retryCount < 3) {
        log.info('Non-200 response returned from glossary service, retrying');
        await setTimeout(5_000);
        return updateGlossary(retryCount + 1);
      } else {
        throw new Error('Glossary request retry count exceeded');
      }
    }

    // transform the glossary data
    const terms = res.data
      .filter((item) => item['ActiveStatus'] !== 'Deleted')
      .map((item) => ({
        term: item['Name'],
        definition: item['Attributes'].find(
          (attr) => attr['Name'] === 'Editorial Note',
        )['Value'],
      }))
      .filter(
        (item, index, array) =>
          array.findIndex((i) => i.term === item.term) === index,
      );

    // store the glossary data in public S3 (or local FS)
    if (isLocal) {
      writeFileSync(
        resolve(__dirname, '../public/data/glossary.json'),
        JSON.stringify(terms),
      );
    } else {
      const s3 = getS3Client();
      const command = new PutObjectCommand({
        Bucket: getS3Config().bucket,
        Key: 'data/glossary.json',
        ACL: 'public-read',
        ContentType: 'application/json',
        Body: JSON.stringify(terms),
      });
      s3.send(command);
    }
  } catch (err) {
    log.error(`Failed to update glossary terms: ${err}`);
  }
}

module.exports = updateGlossary;

if (require.main === module) {
  log.info('Starting Task: glossary');
  updateGlossary().then(() => log.info('Task Completed: glossary'));
}
