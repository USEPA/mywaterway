describe('Zero waterbody message', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it('properly displays a message for locations with 0 waterbodies', () => {
    const location = 'Dallas, Texas';
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      location,
    );
    cy.findByText('Go').click();
    cy.findByText('There are no waterbodies assessed in the').should('exist');
  });
  
});
