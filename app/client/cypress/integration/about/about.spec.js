describe('About Page Tests', () => {
  it('About Page Back Button Works', () => {
    cy.visit('/');
    cy.findByText('Let’s get started!').should('exist');
    cy.url().should('equal', `${document.location.origin}/`);

    cy.findByText('About').click();
    cy.findByText('About How’s My Waterway').should('exist');
    cy.url().should('equal', `${document.location.origin}/about`);

    cy.findByText('Back').click();
    cy.findByText('Let’s get started!').should('exist');
    cy.url().should('equal', `${document.location.origin}/`);
  });
});
