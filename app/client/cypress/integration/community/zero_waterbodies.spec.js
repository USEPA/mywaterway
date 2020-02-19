describe('Zero waterbody message', () => {
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
