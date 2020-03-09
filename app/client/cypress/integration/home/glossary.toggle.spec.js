describe('Homepage', () => {
  beforeEach(() => {
    cy.visit('/');
  });
  it(`Glossary button toggles slide content`, () => {
    cy.get('button[title="Glossary"]').click();
  });
  it(`Glossary close button closes slide content`, () => {
    cy.get('body').then(($body) => {
      if ($body.find('button[title="Close glossary"]').length > 0) {
        cy.get('button[title="Close glossary"]').then(($header) => {
          if ($header.is(':visible')) {
            cy.findByText('Close glossary').click();
          }
        });
      }
    });
  });
});
