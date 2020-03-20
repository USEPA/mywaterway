describe('Homepage', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it(`Glossary button toggles slide content`, () => {
    cy.findAllByText('Glossary')
      .filter(':visible')
      .scrollIntoView()
      .click();
    cy.findByPlaceholderText('Search for a term...').should('be.visible');
  });

  it(`Glossary close button closes slide content`, () => {
    cy.findAllByText('Glossary')
      .filter(':visible')
      .scrollIntoView()
      .click();
    cy.findByText('×')
      .scrollIntoView()
      .click();
    cy.findByPlaceholderText('Search for a term...').should('not.be.visible');
  });
});
