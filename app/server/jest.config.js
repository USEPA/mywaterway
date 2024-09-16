module.exports = {
  setupFiles: ['./jest_setup.js'],
  roots: ['tests'],
  testPathIgnorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.nyc_output/',
    'coverage/',
  ],
};
