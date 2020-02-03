describe('Homepage', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it(`"Community" button links to the community page`, () => {
    cy.findByText('Community').click();
    cy.url().should('include', '/community');
  });

  it(`"State" button links to the state page`, () => {
    cy.findByText('State').click();
    cy.url().should('include', '/state');
  });

  it(`"National" button links to the national page`, () => {
    cy.findByText('National').click();
    cy.url().should('include', '/national');
  });
});
