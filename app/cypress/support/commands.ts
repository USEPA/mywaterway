// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

import '@testing-library/cypress/add-commands';
import { Options } from 'cypress-image-snapshot';
import { addMatchImageSnapshotCommand } from 'cypress-image-snapshot/command';

addMatchImageSnapshotCommand();

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to select DOM element by data-cy attribute.
       * @example cy.dataCy('greeting')
       */
       matchSnapshot(name?: string, options?: Options): Chainable<Element>
       mockGeolocation(shouldFail: boolean, latitude?: number, longitude?: number): Chainable<Element>
       upload(file: any, fileName: string, type?: string): Chainable<Element>
    }
  }
}

/**
 * This enables mocking the geolocation api. The default coordinates are
 * for Washington DC.
 *
 * @param shouldFail (optional) - If set to true the mock location will fail
 * @param latitude (optional) - The latitude to be returned by the mocked location call
 * @param longitude (optional) - The longitude to be returned by the mocked location call
 */
Cypress.Commands.add(
  'mockGeolocation',
  (shouldFail: boolean = false, latitude: number = 38.9072, longitude: number = -77.0369) => {
    cy.window().then(($window) => {
      cy.stub(
        $window.navigator.geolocation,
        'getCurrentPosition',
        (resolve, reject) => {
          if (shouldFail) return reject(Error('1')); // 1: rejected, 2: unable, 3: timeout
          return resolve({ coords: { latitude, longitude } });
        },
      );
    });
  },
);

/**
 * This enables uploading files with Cypress and the react-dropzone node module.
 *
 * @param subject - The react-dropzone element to upload the file with
 * @param file - The file object to upload
 * @param fileName - The name of the file being uploaded
 */
Cypress.Commands.add(
  'upload',
  {
    prevSubject: 'element',
  },
  (subject, file: any, fileName: string, type: string) => {
    // we need access window to create a file below
    cy.window().then((window) => {
      // Convert the file to a blob (if necessary) and upload
      let contents = file;
      if (type === 'blob') {
        contents = Cypress.Blob.base64StringToBlob(file);
      }
      if (type === 'json') {
        contents = JSON.stringify(file);
      }

      // Please note that we need to create a file using window.File,
      // cypress overwrites File and this is not compatible with our change handlers in React Code
      const testFile = new window.File([contents], fileName);

      // trigger the drop event on the react-dropzone component
      cy.wrap(subject).trigger('drop', {
        force: true,
        dataTransfer: { files: [testFile], types: ['Files'] },
      });
    });
  },
);

/**
 * This enables mocking the geolocation api. The default coordinates are
 * for Washington DC.
 *
 * @param subject - The react-dropzone element to upload the file with
 * @param name - Name of the snapshot to be taken
 * @param options (optional) - Additional options for the snapshot
 */
Cypress.Commands.add(
  'matchSnapshot',
  {
    prevSubject: 'element',
  },
  (subject, name: string, options: Options) => {
    cy.wrap(subject).matchImageSnapshot(`${Cypress.browser.family}-${name}`, {
      comparisonMethod: 'ssim',
      failureThresholdType: 'percent',
      failureThreshold: 0.01,
      ...options,
    });
  },
);
