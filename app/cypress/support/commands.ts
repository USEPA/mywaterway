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
      isInsideViewport(): Chainable<Element>;
      login(): Chainable<Element>;
      matchSnapshot(name?: string, options?: Options): Chainable<Element>;
      mockGeolocation(
        shouldFail: boolean,
        latitude?: number,
        longitude?: number,
      ): Chainable<Element>;
      upload(file: any, fileName: string, type?: string): Chainable<Element>;
      waitForLoadFinish({
        skipExists,
        timeout,
      }?: {
        skipExists?: boolean;
        timeout?: number;
      }): Chainable<Element>;
    }
  }
}

/**
 * This overrides the cy.visit command and injects css specifically for Cypress.
 * The main reason for this is to hide the creat react app error overlay.
 *
 * @param originalFn - The original visit function
 * @param url - The url to visit
 * @param options (optional) - Options for visit
 */
Cypress.Commands.overwrite(
  'visit',
  (
    originalFn: (
      url: string,
      options?: Partial<Cypress.VisitOptions>,
    ) => Cypress.Chainable<Cypress.AUTWindow>,
    url: string,
    options,
  ) => {
    originalFn(url, options);

    // wait until we are at the provided url
    cy.location().should((loc) => {
      expect(loc.pathname).to.eq(url);
    });

    // inject css styles
    cy.get('#cypress-override-styles').then((style) => {
      style.html(`
        #webpack-dev-server-client-overlay {
          display: none;
        }
      `);
    });
  },
);

/**
 * Checks if the element is inside the viewport.
 *
 * @param subject - The react-dropzone element to upload the file with
 */
Cypress.Commands.add('isInsideViewport', { prevSubject: true }, (subject) => {
  const rect = subject[0].getBoundingClientRect();
  return cy.window().then((window) => {
    expect(rect.top).to.be.within(0, window.innerHeight);
    expect(rect.right).to.be.within(0, window.innerWidth);
    expect(rect.bottom).to.be.within(0, window.innerHeight);
    expect(rect.left).to.be.within(0, window.innerWidth);
  });
});

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
  (
    shouldFail: boolean = false,
    latitude: number = 38.9072,
    longitude: number = -77.0369,
  ) => {
    cy.window().then(($window) => {
      cy.stub($window.navigator.geolocation, 'getCurrentPosition').callsFake(
        (successCallback, errorCallback) => {
          if (shouldFail) return errorCallback({ code: 1 }); // 1: rejected, 2: unable, 3: timeout
          return successCallback({ coords: { latitude, longitude } });
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
    cy.wrap(subject).matchImageSnapshot(name, {
      comparisonMethod: 'ssim',
      failureThresholdType: 'percent',
      failureThreshold: 0.01,
      ...options,
    });
  },
);

/**
 * Waits for loading spinners to show up and disappear.
 */
Cypress.Commands.add(
  'waitForLoadFinish',
  (params = { skipExists: false, timeout: 120000 }) => {
    const { skipExists, timeout } = params;
    // wait for the web services to finish
    if (!skipExists)
      cy.findAllByTestId('hmw-loading-spinner', { timeout }).should('exist');
    cy.findAllByTestId('hmw-loading-spinner', { timeout }).should('not.exist');
  },
);

/**
 * Logs into ArcGIS Online. In order for this to work, you need to
 * login to AGO on mywaterway-dev.app.cloud.gov by publishing
 * something to your AGO account. Then copy the esriJSAPIOAuth
 * from the session storage into the cypress.env.json file.
 */
Cypress.Commands.add('login', () => {
  sessionStorage.setItem(
    'esriJSAPIOAuth',
    JSON.stringify({ '/': Cypress.env()['/'] }),
  );
});
