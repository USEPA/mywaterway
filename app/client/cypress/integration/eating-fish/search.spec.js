describe('Eating Fish', () => {
  beforeEach(() => {
    cy.visit('/eating-fish');
  });

  it(`Searching for a zip code correctly routes to the community eating-fish page for the zip code.`, () => {
    const zip = '22201';
    cy.findByPlaceholderText('Search by address', { exact: false }).type(zip);
    cy.findByText('Go').click();
    cy.url().should('include', `/community/${zip}/eating-fish`);
  });
});
