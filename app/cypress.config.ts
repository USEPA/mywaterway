import { defineConfig } from 'cypress';
import { addMatchImageSnapshotPlugin } from '@simonsmith/cypress-image-snapshot/plugin';
import { allureCypress } from 'allure-cypress/reporter';

export default defineConfig({
  chromeWebSecurity: false,
  defaultCommandTimeout: 8000,
  retries: 8,
  video: true,
  viewportHeight: 720,
  viewportWidth: 1280,
  expose: {
    failOnSnapshotDiff: false,
    codeCoverage: {
      url: 'http://localhost:3002/__coverage__',
    },
  },
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      // Cypress adds --disable-gpu on Linux, and Chromium 136 dropped the
      // implicit software-WebGL fallback, leaving ArcGIS with no WebGL2
      // context. --enable-gpu is for run mode, which is headless.
      on('before:browser:launch', (browser, launchOptions) => {
        // Electron takes preferences rather than args.
        if (browser.family !== 'chromium' || browser.name === 'electron') {
          return launchOptions;
        }
        launchOptions.args = launchOptions.args.filter(
          (arg) => arg !== '--disable-gpu',
        );
        launchOptions.args.push('--enable-gpu');
        return launchOptions;
      });

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
