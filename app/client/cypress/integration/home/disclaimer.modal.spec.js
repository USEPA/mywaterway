describe('Homepage', () => {
  beforeEach(() => {
    cy.visit('/');
  });
  it(`Disclaimer button opens modal`, () => {
    cy.findByText('Disclaimer').click();
  });
  it(`Disclaimer close button closes modal`, () => {
    cy.get('body').then(($body) => {
      if ($body.find('button[title="Close disclaimer"]').length > 0) {
        cy.get('button[title="Close disclaimer"]').then(($header) => {
          if ($header.is(':visible')) {
            cy.findByText('Close disclaimer').click();
          }
        });
      }
    });
  });
});
