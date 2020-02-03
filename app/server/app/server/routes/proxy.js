const { URL } = require('url');
const express = require('express');
const request = require('request');
const querystring = require('querystring');
const config = require('../config/proxyConfig.json');
const logger = require('../utilities/logger');
const log = logger.logger;

module.exports = function(app) {
  const router = express.Router();

  router.get('/', function(req, res, next) {
    let authoriztedURL = false;
    let parsedUrl;
    let metadataObj = logger.populateMetdataObjFromRequest(req);

    try {
      if (req.originalUrl) {
        parsedUrl = querystring.unescape(req.originalUrl.substring(11)); //get rid of /proxy?url=

        const url = new URL(parsedUrl);
        authoriztedURL = config.urls.includes(url.host.toLowerCase());
      } else {
        let msg = 'Missing proxy request';
        log.warn(logger.formatLogMsg(metadataObj, msg));
        res.status(403).send(msg);
        return;
      }

      if (!authoriztedURL) {
        let msg = 'Invalid proxy request';
        log.error(
          logger.formatLogMsg(metadataObj, `${msg}. parsedUrl = ${parsedUrl}`),
        );
        res.status(403).send(msg);
        return;
      }
    } catch (err) {
      let msg = 'Invalid URL';
      log.error(
        logger.formatLogMsg(metadataObj, `${msg}. parsedUrl = ${parsedUrl}`),
      );
      res.status(403).send(msg);
      return;
    }

    let request_headers = {};
    if (parsedUrl.includes('etss.epa.gov')) {
      //if its a terminology request
      request_headers.authorization = 'basic ' + process.env.GLOSSARY_AUTH;
    }

    request(
      {
        method: req.query.method,
        headers: request_headers,
        uri: parsedUrl,
        timeout: 30000,
      },
      function(err, request_res, body) {
        if (err) {
          log.error(
            logger.formatLogMsg(
              metadataObj,
              `Unsuccessful request. parsedUrl = ${parsedUrl}. Detailed error: ${err}`,
            ),
          );
          res
            .status(403)
            .send(
              `Unsuccessful request. parsedUrl = ${parsedUrl}. Detailed error: ${err}`,
            );
        }
      },
    )
      .on('response', function(response) {
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
