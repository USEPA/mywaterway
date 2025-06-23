import { defineConfig } from 'cypress';
import { addMatchImageSnapshotPlugin } from 'cypress-image-snapshot/plugin';
import { allureCypress } from 'allure-cypress/reporter';

export default defineConfig({
  chromeWebSecurity: false,
  defaultCommandTimeout: 8000,
  retries: 8,
  video: true,
  viewportHeight: 720,
  viewportWidth: 1280,
  env: {
    failOnSnapshotDiff: false,
    codeCoverage: {
      url: 'http://localhost:3002/__coverage__',
    },
  },
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      require('@cypress/code-coverage/task')(on, config);

      addMatchImageSnapshotPlugin(on, config);
      allureCypress(on, config, {
        resultsDir: 'combined_results_reports/results',
      });

      return config;
    },
    baseUrl: 'http://localhost:3000',
  },
});
