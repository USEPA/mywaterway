const { URL } = require('url');
const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const config = require('../config/proxyConfig.json');
const logger = require('../utilities/logger');
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

    try {
      let request_headers = {};
      if (parsedUrl.toLowerCase().includes('etss.epa.gov')) {
        request_headers.authorization = 'basic ' + process.env.GLOSSARY_AUTH;
      } else {
        if (
          !app.enabled('isLocal') &&
          parsedUrl
            .toLowerCase()
            .includes('://' + req.hostname.toLowerCase()) &&
          parsedUrl.toLowerCase().includes('/data/')
        ) {
          //change out the URL for the internal s3 bucket that support this instance of the application in Cloud.gov
          var jsonFileName = parsedUrl.split('/data/').pop();
          parsedUrl = app.get('s3_bucket_url') + '/data/' + jsonFileName;
        }
      }

      function deleteTSHeaders(response) {
        /* The EPA Terminology Services (TS) exposes sensitive 
          information about its underlying technology. While we 
          notified the TS Team about this, they have not had time 
          to address it with the product vendor. Based on this,
          we're going to programmatically remove them. */
        delete response.headers['x-powered-by'];
        delete response.headers['server'];
        delete response.headers['x-aspnet-version'];
        // end of EPA TS work around.

        // Disable cache for all proxy requests
        response.headers['cache-control'] = 'no-cache';
      }

      axios({
        method: req.query.method,
        url: parsedUrl,
        headers: request_headers,
        timeout: 10000,
      })
        .then((response) => {
          if (response.status !== 200) {
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

          deleteTSHeaders(response);
          res
            .status(response.status)
            .header(response.headers)
            .send(response.data);
        })
        .catch((err) => {
          log.error(
            logger.formatLogMsg(
              metadataObj,
              `Unsuccessful request. parsedUrl = ${parsedUrl}. Detailed error: ${err}`,
            ),
          );
          if (res.headersSent) {
            log.error(
              logger.formatLogMsg(
                metadataObj,
                `Odd header already sent check = ${parsedUrl}. Detailed error: ${err}`,
              ),
            );
          }

          deleteTSHeaders(err.response);
          res
            .status(err.response.status)
            .header(err.response.headers)
            .send(err.response.data);
        });
    } catch (err) {
      let msg = 'URL Request Error';
      log.error(
        logger.formatLogMsg(metadataObj, `${msg}. parsedUrl = ${parsedUrl}`),
      );
      res.status(403).json({ message: msg });
      return;
    }
  });

  app.use('/proxy', router);
};
