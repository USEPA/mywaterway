describe('Drinking Water', () => {
  beforeEach(() => {
    cy.visit('/drinking-water');
  });

  it(`"Swimming" button links to the swimming page`, () => {
    cy.findByText('Swimming').click();
    cy.url().should('include', '/swimming');
  });

  it(`"Fishing" button links to the fishing page`, () => {
    cy.findByText('Fishing').click();
    cy.url().should('include', '/fishing');
  });
});
