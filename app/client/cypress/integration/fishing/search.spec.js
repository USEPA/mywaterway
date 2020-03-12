describe('Fishing', () => {
  beforeEach(() => {
    cy.visit('/fishing');
  });

  it(`Searching for a zip code correctly routes to the community fishing page for the zip code.`, () => {
    const zip = '22201';
    cy.findByPlaceholderText('Search by address', { exact: false }).type(zip);
    cy.findByText('Go').click();
    cy.url().should('include', `/community/${zip}/fishing`);
  });
});
