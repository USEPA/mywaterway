const { defineConfig } = require("cypress");

module.exports = defineConfig({
  defaultCommandTimeout: 8000,
  viewportWidth: 1280,
  viewportHeight: 720,
  chromeWebSecurity: false,
  retries: 1,
  env: {
    failOnSnapshotDiff: false,
  },
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      require("@cypress/code-coverage/task")(on, config);

      const {
        addMatchImageSnapshotPlugin,
      } = require("cypress-image-snapshot/plugin");
      addMatchImageSnapshotPlugin(on, config);

      return config;
    },
    baseUrl: "http://localhost:3000",
  },
});
