const { URL } = require('url');
const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const config = require('../config/proxyConfig.json');
const logger = require('../utilities/logger');
const log = logger.logger;

module.exports = function (app) {
  const router = express.Router();

  // only expose proxy in local environment
  if (!app.enabled('isLocal') && !app.enabled('isTest')) return;

  router.get('/', function (req, res, next) {
    let authoriztedURL = false;
    let parsedUrl = '';
    let metadataObj = logger.populateMetdataObjFromRequest(req);
    let lowerCaseUrl = '';
    let message = '';
    let messageWithUrl = '';

    try {
      if (req.originalUrl) {
        parsedUrl = querystring.unescape(req.originalUrl.substring(11)); //get rid of /proxy?url=

        const url = new URL(parsedUrl);
        authoriztedURL = config.urls.includes(url.host.toLowerCase());
      }

      lowerCaseUrl = parsedUrl.toLowerCase();
      if (
        !authoriztedURL &&
        !lowerCaseUrl.includes('://' + req.hostname.toLowerCase())
      ) {
        message = 'Invalid proxy request';
        messageWithUrl = `${message}. parsedUrl = ${parsedUrl}`;
        log.error(logger.formatLogMsg(metadataObj, messageWithUrl));
        res.status(403).json({ message });
        return;
      }
    } catch (err) {
      message = 'Invalid URL';
      messageWithUrl = `${message}. parsedUrl = ${parsedUrl}`;
      log.error(logger.formatLogMsg(metadataObj, messageWithUrl));
      res.status(403).json({ message });
      return;
    }

    try {
      let headers = {};
      let responseType;
      if (lowerCaseUrl.includes('cyan.epa.gov/waterbody/image/')) {
        responseType = 'stream';
      }

      function deleteTSHeaders(response) {
        if (!response) return;

        /* This is a workaround for an issue where service responses don't 
          include headers. */
        if (!response.headers) response.headers = {};

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

        // This is a workaround for the attains dev services (54.209.48.156 or serviceUrlDev)
        // never returning a response.
        delete response.headers['transfer-encoding'];
      }

      axios({
        method: req.query.method,
        url: parsedUrl,
        headers,
        timeout: 10000,
        responseType,
      })
        .then((response) => {
          if (response.status !== 200) {
            messageWithUrl = `Non-200 returned from web service. parsedUrl = ${parsedUrl}.`;
            log.error(logger.formatLogMsg(metadataObj, messageWithUrl));
          } else {
            messageWithUrl = `Successful request: ${parsedUrl}`;
            log.info(logger.formatLogMsg(metadataObj, messageWithUrl));
          }

          deleteTSHeaders(response);
          if (responseType === 'stream') {
            res.set(response.headers);
            response.data.pipe(res);
          } else {
            res
              .status(response.status)
              .header(response.headers)
              .send(response.data);
          }
        })
        .catch((err) => {
          messageWithUrl = `Unsuccessful request. parsedUrl = ${parsedUrl}. Detailed error: ${err}`;
          log.error(logger.formatLogMsg(metadataObj, messageWithUrl));
          if (res.headersSent) {
            messageWithUrl = `Odd header already sent check = ${parsedUrl}. Detailed error: ${err}`;
            log.error(logger.formatLogMsg(metadataObj, messageWithUrl));
          }

          message = 'Proxy Request Error';
          messageWithUrl = `${message}. parsedUrl = ${parsedUrl}`;
          log.error(logger.formatLogMsg(metadataObj, messageWithUrl));
          res.status(503).json({ message });
        });
    } catch (err) {
      message = 'Proxy Server Error';
      messageWithUrl = `${message}. parsedUrl = ${parsedUrl}`;
      log.error(logger.formatLogMsg(metadataObj, messageWithUrl));
      res.status(500).json({ message });
      return;
    }
  });

  router.get('/*', (req, res) => {
    res.status(404).json({ message: 'The api route does not exist.' });
  });
  router.post('/*', (req, res) => {
    res.status(404).json({ message: 'The api route does not exist.' });
  });

  app.use('/proxy', router);
};
