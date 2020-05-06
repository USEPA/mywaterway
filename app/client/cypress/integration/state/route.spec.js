describe('State Routes', () => {
  it('Select a state and click “Go” routes to the state water quality overview page for the state abbreviation', () => {
    cy.visit('/state');

    cy.get('#hmw-state-select').click();
    cy.findByText('Florida').click();
    cy.findByText('Go').click();

    cy.url().should('include', 'state/FL/water-quality-overview');
  });

  it('Directly navigating to a state with a non-existent state abbreviation, navigates back to the state page', () => {
    cy.visit('/state/ZZ');

    cy.url().should('equal', `${document.location.origin}/state`);
  });

  it('Switching state page tabs updates route', () => {
    cy.visit('/state/FL');

    cy.url().should('include', 'state/FL/water-quality-overview');

    cy.findByText('Advanced Search').click();
    cy.url().should('include', 'state/FL/advanced-search');

    cy.findByText('State Water Quality Overview').click();
    cy.url().should('include', 'state/FL/water-quality-overview');
  });

  it('Navigate to the state page with a <script> tag in the route', () => {
    cy.visit('/state/%3Cscript%3Evar%20j%20=%201;%3C/script%3E');

    cy.findByText('Sorry, but the url entered was invalid.').should('exist');

    cy.url().should('include', `${document.location.origin}/invalid-url`);
  });
});
