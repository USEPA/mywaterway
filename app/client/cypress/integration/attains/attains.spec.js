describe('ATTAINS Page Test', () => {
  it('Data Page Should Link to ATTAINS Page', () => {
    cy.visit('/');
    cy.findByText('Data').click();
    cy.findByText('About the Data').should('exist');
    cy.url().should('equal', `${document.location.origin}/data`);

    cy.findByText('How ATTAINS data are grouped in How’s My Waterway')
      .should('have.attr', 'href', 'attains')
      .should('have.attr', 'target', '_blank')
      .should('have.attr', 'rel', 'noopener noreferrer');
  });

  it('ATTAINS Page Displays a Table', () => {
    cy.visit('/attains');
    // wait for the all web services to finish (surveys is usually slow here)
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 20000 }).should(
      'not.exist',
    );
    cy.findByText("How's My Waterway Impairment Category").should('exist');
  });
});
