describe('Community search', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it('properly routes to the community overview page', () => {
    const zip = '22201';
    cy.findByPlaceholderText('Search by address', { exact: false }).type(zip);
    cy.findByText('Go').click();
    cy.url().should('include', `/community/${zip}/overview`);
  });

  it('Clicking the “Use My Location” button, with geolocation enabled, properly geolocates user and routes to the community overview page for the user’s location', () => {
    cy.mockGeolocation();

    cy.findByText('Use My Location').click();

    cy.url().should('match', /community\/.*\/overview/);
    cy.findByText('Your Waters: What We Know');
  });

  it('Clicking the “Use My Location” button, with geolocation disabled, displays an error and does not route', () => {
    cy.mockGeolocation(true);

    cy.findByText('Use My Location').click();

    cy.url().should('equal', `${window.location.origin}/community`);
    cy.findByText('Error Getting Location');
  });
});
