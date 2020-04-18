describe('Homepage', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('Clicking the “DISCLAIMER” button displays the disclaimer popup', () => {
    const text = /^EPA has posted information through this application/;

    // verify opening the disclaimer
    cy.findByText('Disclaimer').click();
    cy.findByText(text).should('exist');

    // verify closing the disclaimer
    cy.findByTitle('Close disclaimer').click();
    cy.findByText(text).should('not.exist');
  });
});
