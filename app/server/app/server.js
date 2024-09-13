const path = require('path');
const logger = require('./server/utilities/logger');
const log = logger.logger;
const browserSyncPort = 9091;
let port = process.env.PORT || 9090;
const { isLocal } = require('./server/utilities/environment');

let app; 
try {
  app = require('./app');
} catch (err) {
  log.error('Error starting server: ' + err.message);
  process.exit();
}

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