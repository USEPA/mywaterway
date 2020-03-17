describe('Drinking Water', () => {
  beforeEach(() => {
    cy.visit('/drinking-water');
  });

  it(`"Swimming" button links to the swimming page`, () => {
    cy.findByText('Swimming').click();
    cy.url().should('include', '/swimming');
  });

  it(`"Eating Fish" button links to the eating fish page`, () => {
    cy.findByText('Eating Fish').click();
    cy.url().should('include', '/eating-fish');
  });
});
