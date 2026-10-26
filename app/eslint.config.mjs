import cypress from 'eslint-plugin-cypress';

export default [
  {
    ...cypress.configs.recommended,
    files: ['cypress/**/*.{js,mjs,ts}'],
  },
];
