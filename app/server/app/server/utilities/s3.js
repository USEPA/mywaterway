const { S3Client } = require('@aws-sdk/client-s3');
const logger = require('./logger');

const log = logger.logger;

exports.getS3Client = function () {
  const { accessKeyId, region, secretAccessKey } = getS3Config();
  return new S3Client({
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    region,
  });
};

exports.getS3Config = function () {
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
    secretAccessKey: s3_object.credentials.secretAccessKey,
  };
};
