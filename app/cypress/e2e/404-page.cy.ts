describe('404 page', () => {
  it('Verify client side 404 page redirects to server side 404 page', () => {
    cy.visit('/thisDoesNotExist');

    cy.url().should(
      'equal',
      'http://localhost:3002/404.html?src=http://localhost:3000/thisDoesNotExist',
    );
  });
});
