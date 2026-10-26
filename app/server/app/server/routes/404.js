const path = require('path');
const express = require('express');

module.exports = function (app) {
  const router = express.Router();

  router.get('/', function (req, res, next) {
    // sendFile dotfile-checks every segment of an absolute path, so pass the
    // directory as root to keep it from rejecting dotted parent directories
    res
      .status(404)
      .sendFile('404.html', { root: path.join(__dirname, '../../public') });
  });

  app.use('/404.html', router);
};
