describe('Swimming', () => {
  beforeEach(() => {
    cy.visit('/swimming');
  });

  it(`"Fishing" button links to the fishing page`, () => {
    cy.findByText('Fishing').click();
    cy.url().should('include', '/fishing');
  });

  it(`"Drinking Water" button links to the drinking water page`, () => {
    cy.findByText('Drinking Water').click();
    cy.url().should('include', '/drinking-water');
  });
});
