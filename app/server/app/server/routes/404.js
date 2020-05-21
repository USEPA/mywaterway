const express = require('express');

module.exports = function (app) {
  const router = express.Router();

  router.get('/', function (req, res, next) {
    res
      .status(404)
      .sendFile(path.join(__dirname, 'public_other_pages', '400.html'));
  });

  app.use('/404', router);
};
