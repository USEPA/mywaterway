const path = require('path');
const express = require('express');
const helmet = require('helmet');
const favicon = require('serve-favicon');
const basicAuth = require('express-basic-auth');
const logger = require('./server/utilities/logger');
const log = logger.logger;

const app = express();
const browserSyncPort = 9091;
let port = process.env.PORT || 9090;

app.use(helmet());
app.use(
  helmet.hsts({
    maxAge: 31536000,
  }),
);

/****************************************************************
 Instruct web browsers to disable caching
 ****************************************************************/
app.use(function (req, res, next) {
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate',
  );
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

/****************************************************************
 Revoke unneeded and potentially harmful HTTP methods
 ****************************************************************/
app.use(function (req, res, next) {
  var whiteList = ['GET', 'POST'];
  if (whiteList.indexOf(req.method) != -1) next();
  else {
    res.sendStatus(401);
    var metadataObj = logger.populateMetdataObjFromRequest(req);
    log.error(
      logger.formatLogMsg(
        metadataObj,
        `Attempted use of unsupported HTTP method. HTTP method = ${req.method}`,
      ),
    );
  }
});

/****************************************************************
 Is Glossary/Terminology Services authorization variable set?
****************************************************************/
if (process.env.GLOSSARY_AUTH) {
  log.info('GLOSSARY_AUTH environmental variable found, continuing.');
} else {
  let msg =
    'Glossary/Terminology Services authorization variable NOT set, exiting system.';
  log.error(msg);
  process.exit();
}

/****************************************************************
 Which environment
****************************************************************/
var isLocal = false;
var isDevelopment = false;
var isStaging = false;

if (process.env.NODE_ENV) {
  isLocal = 'local' === process.env.NODE_ENV.toLowerCase();
  isDevelopment = 'development' === process.env.NODE_ENV.toLowerCase();
  isStaging = 'staging' === process.env.NODE_ENV.toLowerCase();
}

if (isLocal) {
  log.info('Environment = local');
  app.enable('isLocal');
}
if (isDevelopment) log.info('Environment = development');
if (isStaging) log.info('Environment = staging');
if (!isLocal && !isDevelopment && !isStaging)
  log.info('Environment = staging or production');

/****************************************************************
 Setup basic auth for non-production environments
****************************************************************/
if (isDevelopment || isStaging) {
  if (process.env.HMW_BASIC_USER_NAME) {
    log.info('HMW_BASIC_USER_NAME environmental variable found, continuing.');
  } else {
    let msg = 'HMW_BASIC_USER_NAME variable NOT set, exiting system.';
    log.error(msg);
    process.exit();
  }

  if (process.env.HMW_BASIC_USER_PWD) {
    log.info('HMW_BASIC_USER_PWD environmental variable found, continuing.');
  } else {
    let msg = 'HMW_BASIC_USER_PWD variable NOT set, exiting system.';
    log.error(msg);
    process.exit();
  }

  let users = {};
  users[process.env.HMW_BASIC_USER_NAME] = process.env.HMW_BASIC_USER_PWD;

  app.use(
    basicAuth({
      users: users,
      challenge: true,
      unauthorizedResponse: getUnauthorizedResponse,
    }),
  );
}

/****************************************************************
Enable CORS for local environment proxy use
****************************************************************/
if (isLocal) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept',
    );
    res.header('X-Frame-Options', 'allow-from http://localhost:3000/');
    next();
  });
}

function getUnauthorizedResponse(req) {
  return req.auth ? 'Invalid credentials' : 'No credentials provided';
}

/****************************************************************
For Cloud.gov enviroments, get s3 endpoint location
****************************************************************/
if (!isLocal) {
  if (process.env.VCAP_SERVICES) {
    log.info('VCAP_SERVICES environmental variable found, continuing.');
  } else {
    let msg = 'VCAP_SERVICES environmental variable NOT set, exiting system.';
    log.error(msg);
    process.exit();
  }

  if (process.env.S3_PUB_BIND_NAME) {
    log.info('S3_PUB_BIND_NAME environmental variable found, continuing.');
  } else {
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
    !s3_object.credentials.hasOwnProperty('region')
  ) {
    let msg =
      'VCAP_SERVICES environmental variable does not include the proper s3 information, exiting system.';
    log.error(msg);
    process.exit();
  }

  var s3_bucket_url =
    'https://' +
    s3_object.credentials.bucket +
    '.s3-' +
    s3_object.credentials.region +
    '.amazonaws.com';
  log.info('Calculated s3 bucket URL = ' + s3_bucket_url);
  app.set('s3_bucket_url', s3_bucket_url);
}

/****************************************************************
 Setup server and routes
****************************************************************/
// serve static assets normally
app.use(express.static(__dirname + '/public'));

// setup server routes
require('./server/routes')(app);

// setup client routes (built React app)
app.get('*', function (req, res) {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.use(favicon(path.join(__dirname, 'public/favicon.ico')));

// for local testing of the production flow, use the same port as browersync to avoid
// different port usage to confuse testers/developers
if (port === 9090 && !isLocal) port = browserSyncPort;

app.listen(port, function () {
  if (isLocal) {
    const browserSync = require('browser-sync');

    log.info(`Application listening on port ${browserSyncPort}`);

    browserSync({
      files: [path.join(__dirname, '/public/**')],
      online: false,
      open: false,
      port: browserSyncPort,
      proxy: 'localhost:' + port,
      ui: false,
    });
  } else {
    log.info(`Application listening on port ${port}`);
  }
});

/****************************************************************
 Worse case error handling for 404 and 500 issues
 ****************************************************************/
/* Note, the React app should be handling 404 at this point 
   but we're leaving the below 404 check in for now */
app.use(function (req, res, next) {
  res.sendFile(path.join(__dirname, 'public', '400.html'));
});

app.use(function (err, req, res, next) {
  res.sendFile(path.join(__dirname, 'public', '500.html'));
});
