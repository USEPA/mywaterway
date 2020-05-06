describe('Community Routes', () => {
  it('Navigate to the community page with a <script> tag in the route', () => {
    cy.visit('/community/%3Cscript%3Evar%20j%20=%201;%3C/script%3E/overview');

    cy.findByText('Sorry, but the url entered was invalid.').should('exist');

    cy.url().should('include', `${document.location.origin}/invalid-url`);
  });
});