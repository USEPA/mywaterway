describe('Data Page Tests', () => {
  it('Data Page Back Button Works', () => {
    cy.visit('/');
    cy.findByText('Let’s get started!').should('exist');
    cy.url().should('equal', `${document.location.origin}/`);

    cy.findByText('Data').click();
    cy.findByText('About the Data').should('exist');
    cy.url().should('equal', `${document.location.origin}/data`);

    cy.findByText('Back').click();
    cy.findByText('Let’s get started!').should('exist');
    cy.url().should('equal', `${document.location.origin}/`);
  });
});
