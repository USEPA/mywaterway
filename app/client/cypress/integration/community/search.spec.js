describe('Community search', () => {
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
