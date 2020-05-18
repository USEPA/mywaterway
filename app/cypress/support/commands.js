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

import "@testing-library/cypress/add-commands";

/**
 * This enables mocking the geolocation api. The default coordinates are
 * for Washington DC.
 *
 * @param shouldFail (optional) - If set to true the mock location will fail
 * @param latitude (optional) - The latitude to be returned by the mocked location call
 * @param longitude (optional) - The longitude to be returned by the mocked location call
 */
Cypress.Commands.add(
  "mockGeolocation",
  (shouldFail = false, latitude = 38.9072, longitude = -77.0369) => {
    cy.window().then($window => {
      cy.stub(
        $window.navigator.geolocation,
        "getCurrentPosition",
        (resolve, reject) => {
          if (shouldFail) return reject(Error({ code: 1 })); // 1: rejected, 2: unable, 3: timeout
          return resolve({ coords: { latitude, longitude } });
        }
      );
    });
  }
);
