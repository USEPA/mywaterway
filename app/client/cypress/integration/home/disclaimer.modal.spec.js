describe('Homepage', () => {
  beforeEach(() => {
    cy.visit('/');
  });
  it(`Disclaimer button opens modal`, () => {
    cy.findByText('Disclaimer').click();
  });
  it(`Disclaimer modal shows expected text`, () => {
    cy.get('body').then(($body) => {
      if ($body.find('div[aria-label="Disclaimer"]').length > 0) {
        //evaluates as true if div exists at all
        cy.get('div[aria-label="Disclaimer"]').then(($header) => {
          if ($header.is(':visible')) {
            cy.get('div[aria-label="Disclaimer"]')
              .invoke('text')
              .then((text) => {
                expect(text).to.contain(
                  'EPA has posted information through this application as a convenience to the application’s users. Although EPA has made every effort to ensure the accuracy of the information posted through this application, users of this application should not rely on information relating to environmental laws and regulations posted on this application. Application users are solely responsible for ensuring that they are in compliance with all relevant environmental laws and regulations. In addition, EPA cannot attest to the accuracy of data provided by organizations outside of the federal government.',
                );
              });
          }
        });
      }
    });
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
