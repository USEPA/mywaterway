const os = require('node:os');

module.exports = {
  setupFiles: ['./jest_setup.js'],
  roots: ['tests'],
  testEnvironment: 'allure-jest/node',
  testEnvironmentOptions: {
    resultsDir: '../combined_results_reports/results',
    environmentInfo: {
      os_platform: os.platform(),
      os_release: os.release(),
      os_version: os.version(),
      node_version: process.version,
    },
  },
  testPathIgnorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.nyc_output/',
    'coverage/',
  ],
};
