// This is a workaround for making the tests more reliable when running
// cypress in headless mode, particularly for running code coverage.
Cypress.on('uncaught:exception', (_err, _runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  debugger;
  return false;
});

describe('Community page links', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it(`"Open Plan Summary" button links to the plan summary page`, () => {
    // navigate to the restoration plans tab of the restore panel
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      'San Antonio, TX',
    );
    cy.findByText('Go').click();
    cy.findByText('Restore').click();
    cy.findByText('Restoration Plans').click();

    // wait for the web services to finish (attains/plans is sometimes slow)
    // the timeout chosen is the same timeout used for the attains/plans fetch
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // test the plan summary link
    const linkText = 'Open Plan Summary';
    cy.findAllByText('Upper San Antonio Watershed').first().click();
    cy.findByText(linkText).should(
      'have.attr',
      'href',
      '/plan-summary/TCEQMAIN/66393',
    );
    cy.findByText(linkText).should('have.attr', 'target', '_blank');
    cy.findByText(linkText).should('have.attr', 'rel', 'noopener noreferrer');
  });

  it('Switching Community page tabs updates route', () => {
    cy.findByText('State & Tribal').click();
    cy.url().should('include', `${window.location.origin}/state-and-tribal`);

    cy.findByText('National').click();
    cy.url().should('include', `${window.location.origin}/national`);

    cy.findByText('Community').click();
    cy.url().should('include', `${window.location.origin}/community`);
  });
});

describe('Community page routes', () => {
  it('Navigate to the community page with a <script> tag in the route', () => {
    cy.visit('/community/%3Cscript%3Evar%20j%20=%201;%3C/script%3E/overview');

    cy.findByText('Sorry, but this web page does not exist.').should('exist');

    cy.url().should('include', '404.html');
  });
});

describe('HTTP Intercepts', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it('Check that if GIS responds with empty features array we query and display data about the missing items.', () => {
    cy.intercept(
      'https://gispub.epa.gov/arcgis/rest/services/OW/ATTAINS_Assessment/MapServer/1/query?f=json&outFields=*',
      {
        statusCode: 200,
        body: { features: [] },
      },
    ).as('attains-lines');

    // navigate to Protect tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type('DC');
    cy.findByText('Go').click();

    cy.wait('@attains-lines', { timeout: 120000 });

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // Verify text explaining some waterbodies have no spatial data exists
    cy.findByText('Some waterbodies are not visible on the map.');
    cy.findAllByText('[Waterbody not visible on map.]', { exact: false });
  });
});
