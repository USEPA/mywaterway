describe('PFAS & PFOA filters on the Community Monitoring tab', () => {
  beforeEach(() => {
    cy.visit('/community');

    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      '45203',
    );
    cy.findByText('Go').click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    cy.findByText('Monitoring').click();

    cy.findAllByText('Sample Locations').filter('button').click();
  });

  it('Should update the total measurement counts when flipping the "PFCs" toggle switch', () => {
    // navigate to Monitoring tab of Community page

    cy.findByText('All Monitoring Sample Locations')
      .siblings()
      .first()
      .find('input')
      .click({
        force: true,
      });

    cy.get('#monitoring-totals').find('td').last().should('have.text', '0');

    cy.findByText('PFCs').siblings().first().find('input').click({
      force: true,
    });

    cy.get('#monitoring-totals').find('td').last().should('not.have.text', '0');
  });

  it('Should update the mapped locations when flipping the "PFCs" toggle switch', () => {});
});
