describe('Community small screen', () => {
  beforeEach(() => {
    cy.viewport(850, 900);
    cy.visit('/community/dc/overview');
  });

  it('small screen displays "Show Map" button and button functions', () => {
    cy.findByText('Show Map').should('exist');
    cy.findByText('Hide Map').should('not.exist');
    cy.findByTestId('hmw-community-map').should('not.be.visible');

    cy.findByText('Show Map').click();
    cy.findByText('Show Map').should('not.exist');
    cy.findByText('Hide Map').should('exist');
    cy.findByTestId('hmw-community-map').should('be.visible');

    cy.findByText('Hide Map').click();
    cy.findByText('Show Map').should('exist');
    cy.findByText('Hide Map').should('not.exist');
    cy.findByTestId('hmw-community-map').should('not.be.visible');
  });
});
