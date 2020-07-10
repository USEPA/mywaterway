const { URL } = require('url');
const express = require('express');
const request = require('request');
const querystring = require('querystring');
const config = require('../config/proxyConfig.json');
const logger = require('../utilities/logger');
const { Console } = require('console');
const log = logger.logger;

module.exports = function (app) {
  const router = express.Router();

  router.get('/', function (req, res, next) {
    let authoriztedURL = false;
    var parsedUrl;
    let metadataObj = logger.populateMetdataObjFromRequest(req);

    try {
      if (req.originalUrl) {
        parsedUrl = querystring.unescape(req.originalUrl.substring(11)); //get rid of /proxy?url=

        const url = new URL(parsedUrl);
        authoriztedURL = config.urls.includes(url.host.toLowerCase());
      } else {
        let msg = 'Missing proxy request';
        log.warn(logger.formatLogMsg(metadataObj, msg));
        res.status(403).json({ message: msg });
        return;
      }

      if (
        !authoriztedURL &&
        !parsedUrl.toLowerCase().includes('://' + req.hostname.toLowerCase())
      ) {
        let msg = 'Invalid proxy request';
        log.error(
          logger.formatLogMsg(metadataObj, `${msg}. parsedUrl = ${parsedUrl}`),
        );
        res.status(403).json({ message: msg });
        return;
      }
    } catch (err) {
      let msg = 'Invalid URL';
      log.error(
        logger.formatLogMsg(metadataObj, `${msg}. parsedUrl = ${parsedUrl}`),
      );
      res.status(403).json({ message: msg });
      return;
    }

    let request_headers = {};
    if (parsedUrl.toLowerCase().includes('etss.epa.gov')) {
      request_headers.authorization = 'basic ' + process.env.GLOSSARY_AUTH;
    } else {
      if (
        !app.enabled('isLocal') &&
        parsedUrl.toLowerCase().includes('://' + req.hostname.toLowerCase()) &&
        parsedUrl.toLowerCase().includes('/data/')
      ) {
        //change out the URL for the internal s3 bucket that support this instance of the application in Cloud.gov
        var jsonFileName = parsedUrl.split('/data/').pop();
        parsedUrl = app.get('s3_bucket_url') + '/' + jsonFileName;
      }
    }

    request(
      {
        method: req.query.method,
        headers: request_headers,
        uri: parsedUrl,
        timeout: 30000,
      },
      function (err, request_res, body) {
        if (err) {
          log.error(
            logger.formatLogMsg(
              metadataObj,
              `Unsuccessful request. parsedUrl = ${parsedUrl}. Detailed error: ${err}`,
            ),
          );
          res.status(403).json({
            message: 'Unsuccessful request. parsedUrl ' + parsedUrl,
            'Detailed error': err,
          });
        }
      },
    )
      .on('response', function (response) {
        /* The EPA Terminology Services (TS) exposes sensitive 
        information about its underlying technology. While we 
        notified the TS Team about this, they have not had time 
        to address it with the product vendor. Based on this,
        we're going to programmatically remove them. */
        delete response.headers['x-powered-by'];
        delete response.headers['server'];
        delete response.headers['x-aspnet-version'];
        // end of EPA TS work around.
        if (response.statusCode !== 200) {
          log.error(
            logger.formatLogMsg(
              metadataObj,
              `Non-200 returned from web service. parsedUrl = ${parsedUrl}.`,
            ),
          );
        } else {
          log.info(
            logger.formatLogMsg(
              metadataObj,
              `Successful request: ${parsedUrl}`,
            ),
          );
        }
      })
      .pipe(res);
  });

  app.use('/proxy', router);
};
