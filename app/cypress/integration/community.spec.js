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
    cy.findAllByText('Upper San Antonio River WPP')
      .first()
      .click();
    cy.findByText(linkText).should(
      'have.attr',
      'href',
      '/plan-summary/TCEQMAIN/1',
    );
    cy.findByText(linkText).should('have.attr', 'target', '_blank');
    cy.findByText(linkText).should('have.attr', 'rel', 'noopener noreferrer');
  });
});

describe('Community page routes', () => {
  it('Navigate to the community page with a <script> tag in the route', () => {
    cy.visit('/community/%3Cscript%3Evar%20j%20=%201;%3C/script%3E/overview');

    cy.findByText('Sorry, but the url entered was invalid.').should('exist');

    cy.url().should('include', `${document.location.origin}/invalid-url`);
  });
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
    cy.url().should('equal', `${window.location.origin}/community`);
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
