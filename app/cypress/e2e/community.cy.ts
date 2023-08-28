// This is a workaround for making the tests more reliable when running
// cypress in headless mode, particularly for running code coverage.
Cypress.on('uncaught:exception', (_err, _runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  debugger;
  return false;
});

describe('Community page search', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it('properly routes to the community overview page', () => {
    const zip = '22201';
    cy.findByPlaceholderText('Search by address', { exact: false }).type(zip);
    cy.findByText('Go').click();
    cy.url().should('include', `/community/${zip}/overview`);
    cy.findByText('Your Waters: What We Know').should('exist');
  });

  it('searching for gibberish displays an error', () => {
    const search = 'jkljl';
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      search,
    );
    cy.findByText('Go').click();
    cy.url({ timeout: 20000 }).should(
      'equal',
      `${window.location.origin}/community`,
    );
    cy.findByText('Data is not available for this location.', {
      exact: false,
    }).should('exist');
  });

  it('searching with a <script> tag displays an error', () => {
    const search = '<script>var j = 1;</script>';
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      search,
    );
    cy.findByText('Go').click();
    cy.findByText('Invalid search. Please try a new search.').should('exist');
  });

  it('searching for a valid huc properly routes to the community overview page', () => {
    const search = '020700100103';
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      search,
      { force: true },
    );
    cy.findByText('Go').click();
    cy.url().should('include', `/community/${search}/overview`);
    cy.findByText('Your Waters: What We Know').should('exist');
  });

  it('Clicking the “Use My Location” button, with geolocation enabled, properly geolocates user and routes to the community overview page for the user’s location', () => {
    const address = 'Scott Cir NW, Washington, District of Columbia, 20036';
    cy.mockGeolocation(false, 38.9072, -77.0369);
    cy.findByText('Use My Location').click();
    cy.url().should('include', `/community/${encodeURI(address)}/overview`);
    cy.findByText('Your Waters: What We Know').should('exist');
  });

  it('Clicking the “Use My Location” button, with geolocation disabled, displays an error and does not route', () => {
    cy.mockGeolocation(true);
    cy.findByText('Use My Location').click();
    cy.url().should('equal', `${window.location.origin}/community`);
    cy.findByText('Error Getting Location').should('exist');
  });
});

describe('Community page zero waterbodies message', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it('properly displays a message for locations with 0 waterbodies', () => {
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      'Dallas, Texas',
    );
    cy.findByText('Go').click();
    cy.findByText('There are no waterbodies assessed in the', {
      exact: false,
      timeout: 20000,
    }).should('exist');
  });
});

describe('Community page map legend', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it('Clicking the "Mapped Water (NHD)" layer visibility button should populate the legend', () => {
    // navigate to Monitoring tab of Community page
    cy.findByRole('textbox', { name: 'Search' }).type('San Antonio, TX');
    cy.findByRole('button', { name: 'Go' }).click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // workaround for this test failing while running cypress in headless mode.
    cy.wait(2000);

    cy.findByRole('button', { name: 'Open Basemaps and Layers' }).click();
    cy.findAllByRole('switch', { name: 'Mapped Water (NHD)' }).click({ force: true });
    cy.findByRole('button', { name: 'Close Basemaps and Layers' }).click();
    cy.findByRole('button', { name: 'Open Legend' }).click();
    cy.findAllByText('Mapped Water (NHD)').should('be.visible');
  });
});

describe('Community page (small screen)', () => {
  beforeEach(() => {
    cy.viewport(850, 900);
    cy.visit('/community/dc/overview');
  });

  it('small screen displays "Show Map" button and button functions', () => {
    cy.findByText('Show Map').should('exist');
    cy.findByText('Hide Map').should('not.exist');
    cy.findByTestId('hmw-community-map').should('not.be.visible');

    cy.findByText('Show Map').click();
    cy.findByText('Show Map').should('not.exist');
    cy.findByText('Hide Map').should('exist');
    cy.findByTestId('hmw-community-map').should('be.visible');

    cy.findByText('Hide Map').click();
    cy.findByText('Show Map').should('exist');
    cy.findByText('Hide Map').should('not.exist');
    cy.findByTestId('hmw-community-map').should('not.be.visible');
  });
});

describe('Community page Show Additional Text', () => {
  beforeEach(() => {
    cy.visit('/community/San%20Antonio,%20TX/overview');
  });

  it('Clicking Show Text switch toggles intro text', () => {
    const heading = 'Your Waters: What We Know';
    cy.findByText(heading);
    cy.findByLabelText('Show Text').click({ force: true });
    cy.findByText(heading).should('not.exist');
  });

  it('Clicking Show More/Show Less toggles more or less text', () => {
    const less = 'Show less';
    const more = 'Show more';

    cy.findAllByText(more).filter(':visible').click();
    cy.findByText(less);
    cy.findAllByText(more).filter(':visible').should('not.exist');

    cy.findByText(less).click();
    cy.findAllByText(more).filter(':visible');
    cy.findByText(less).should('not.exist');
  });

  it(`Clicking "Expand All/Collapse All" expands/collapses the waterbody list`, () => {
    const text = 'Year Last Reported:';

    cy.findAllByRole('button', { name: /Expand All/i }).filter(':visible');
    cy.findByText(text).should('not.exist');

    cy.findAllByRole('button', { name: /Expand All/i })
      .filter(':visible')
      .click();
    cy.findAllByText(text).should('be.visible');

    cy.findAllByRole('button', { name: /Collapse All/i })
      .filter(':visible')
      .click();
    cy.findByText(text).should('not.exist');
  });
});

describe('Community page Glossary', () => {
  it('Clicking a Glossary term opens Glossary Panel', () => {
    cy.visit('/community/Boston/drinking-water');

    cy.findByText('Community water systems').click();
    cy.findByText('Non-Transient Non-Community Water System (NTNCWS):');
  });
});
