describe('Water Quality Overview Sub Tabs', () => {
  beforeEach(() => {
    cy.visit('/state/FL/water-quality-overview');
  });

  it('Navigating to a sub-tab selection that has no data results in “Water Type” dropdown saying “No Available Water Types” and the “Use” dropdown saying “No Available Uses”', () => {
    // verify the water quality overview content loaded prior to other tests
    cy.findByText('Water Quality', { timeout: 20000 }).should('exist');

    // verify a tab without data
    cy.get('.Select__control')
      .filter(':visible')
      .contains('No Available Water Types');
    cy.get('.Select__control')
      .filter(':visible')
      .contains('No Available Uses');

    // verify a tab with data
    cy.findByTestId('hmw-fishing-tab-button').click();
    cy.get('.Select__control')
      .filter(':visible')
      .contains('No Available Water Types')
      .should('not.exist');
    cy.get('.Select__control')
      .filter(':visible')
      .contains('No Available Uses')
      .should('not.exist');
  });

  it('Navigating to a sub-tab selection shows correct charts', () => {
    // verify the water quality overview content loaded prior to other tests
    cy.findByText('Water Quality', { timeout: 20000 }).should('exist');
    cy.get('button:contains(Aquatic Life)[role=tab]').click();

    // wait for the all web services to finish (surveys is usually slow here)
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 20000 }).should(
      'not.exist',
    );

    // Florida > Aquatic Life > Coastal Waters
    // verify the pie chart is not there and the bar chart is
    cy.findByTestId('hmw-ecological-tab-panel')
      .contains('State statistical surveys provide an overall picture')
      .should('not.exist');
    cy.findByTestId('hmw-ecological-tab-panel')
      .contains('Targeted monitoring provides information')
      .should('exist');

    // Florida > Aquatic Life > Rivers and Streams
    // select a dropdown item that has the pie chart
    cy.get('.Select__control:contains(Coastal Waters)')
      .filter(':visible')
      .click();
    cy.findByText('Rivers and Streams').click();

    // verify the pie chart is not there and the bar chart is
    cy.findByTestId('hmw-ecological-tab-panel')
      .contains('State statistical surveys provide an overall picture')
      .should('exist');
    cy.findByTestId('hmw-ecological-tab-panel')
      .contains('Targeted monitoring provides information')
      .should('exist');
  });
});
