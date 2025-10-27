const { PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { mkdirSync, writeFileSync } = require('fs');
const { resolve } = require('path');
const { getEnvironment } = require('./environment');
const logger = require('./logger');

const log = logger.logger;

function getS3Client() {
  const { accessKeyId, region, secretAccessKey } = getS3Config();
  return new S3Client({
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    region,
  });
}

function getS3Config() {
  if (!process.env.VCAP_SERVICES) {
    let msg = 'VCAP_SERVICES environmental variable NOT set, exiting system.';
    log.error(msg);
    process.exit();
  }

  if (!process.env.S3_PUB_BIND_NAME) {
    let msg =
      'S3_PUB_BIND_NAME environmental variable NOT set, exiting system.';
    log.error(msg);
    process.exit();
  }

  let vcap_services = JSON.parse(process.env.VCAP_SERVICES);
  let S3_PUB_BIND_NAME = process.env.S3_PUB_BIND_NAME;

  let s3_object = null;
  if (!vcap_services.hasOwnProperty('s3')) {
    let msg =
      'VCAP_SERVICES environmental variable does not include bind to s3, exiting system.';
    log.error(msg);
    process.exit();
  } else {
    s3_object = vcap_services.s3.find(
      (obj) => obj.instance_name == S3_PUB_BIND_NAME,
    );
  }

  if (
    s3_object == null ||
    !s3_object.hasOwnProperty('credentials') ||
    !s3_object.credentials.hasOwnProperty('bucket') ||
    !s3_object.credentials.hasOwnProperty('region') ||
    !s3_object.credentials.hasOwnProperty('access_key_id') ||
    !s3_object.credentials.hasOwnProperty('secret_access_key')
  ) {
    let msg =
      'VCAP_SERVICES environmental variable does not include the proper s3 information, exiting system.';
    log.error(msg);
    process.exit();
  }

  return {
    bucket: s3_object.credentials.bucket,
    region: s3_object.credentials.region,
    accessKeyId: s3_object.credentials.access_key_id,
    secretAccessKey: s3_object.credentials.secret_access_key,
  };
}

// Uploads file to public S3 bucket
async function uploadFileS3(filePath, fileToUpload, subFolder = 'cache') {
  const { isLocal } = getEnvironment();
  try {
    // local development: write files directly to disk on the client app side
    // Cloud.gov: upload files to the public s3 bucket
    if (isLocal) {
      const subFolderPath = resolve(
        __dirname,
        `../../public/content/${subFolder}`,
      );

      // create the sub folder if it doesn't already exist
      mkdirSync(subFolderPath, { recursive: true });

      // write the file
      writeFileSync(`${subFolderPath}/${filePath}`, fileToUpload);
    } else {
      // setup public s3 bucket
      const s3 = getS3Client();

      // upload the file
      const command = new PutObjectCommand({
        Bucket: getS3Config().bucket,
        Key: `content/${subFolder}/${filePath}`,
        ACL: 'public-read',
        ContentType: 'application/json',
        Body: fileToUpload,
      });
      return s3.send(command);
    }
  } catch (err) {
    log.warn(`Error saving "${filePath}" to public S3 bucket`);
  }
}

module.exports = {
  getS3Client,
  getS3Config,
  uploadFileS3,
};
