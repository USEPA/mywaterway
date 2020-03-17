describe('Swimming', () => {
  beforeEach(() => {
    cy.visit('/swimming');
  });

  it(`"Eating Fish" button links to the eating fish page`, () => {
    cy.findByText('Eating Fish').click();
    cy.url().should('include', '/eating-fish');
  });

  it(`"Drinking Water" button links to the drinking water page`, () => {
    cy.findByText('Drinking Water').click();
    cy.url().should('include', '/drinking-water');
  });
});
