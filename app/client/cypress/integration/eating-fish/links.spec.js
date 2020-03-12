describe('Eating Fish', () => {
  beforeEach(() => {
    cy.visit('/eating-fish');
  });

  it(`"Swimming" button links to the swimming page`, () => {
    cy.findByText('Swimming').click();
    cy.url().should('include', '/swimming');
  });

  it(`"Drinking Water" button links to the drinking water page`, () => {
    cy.findByText('Drinking Water').click();
    cy.url().should('include', '/drinking-water');
  });
});
