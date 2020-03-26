describe('Homepage', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it(`Glossary button toggles slide content`, () => {
    cy.findAllByText('Glossary')
      .filter('[data-disabled="false"]')
      .click();
    cy.findByPlaceholderText('Search for a term...').should('be.visible');
  });

  it(`Glossary close button closes slide content`, () => {
    cy.findAllByText('Glossary')
      .filter('[data-disabled="false"]')
      .click();
    cy.findByText('×').click();
    cy.findByPlaceholderText('Search for a term...').should('not.be.visible');
  });
});
