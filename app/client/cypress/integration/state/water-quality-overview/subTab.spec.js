describe('Water Quality Overview Sub Tabs', () => {
  beforeEach(() => {
    cy.visit('/state/FL/water-quality-overview');

    // verify the water quality overview content loaded prior to other tests
    cy.findByText('Water Quality', { timeout: 20000 }).should('exist');
    cy.findByTestId('hmw-ecological-tab-button').click();

    // wait for the all web services to finish (surveys is usually slow here)
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 20000 }).should(
      'not.exist',
    );
  });

  it('Navigating to a sub-tab selection that has no data results in “Water Type” dropdown saying “No Available Water Types” and the “Use” dropdown saying “No Available Uses”', () => {
    const noWaterTypes = 'No Available Water Types';
    const noUses = 'No Available Uses';

    // verify a tab without data
    cy.findByTestId('hmw-swimming-tab-button').click();
    cy.findByTestId('hmw-swimming-tab-panel').contains(noWaterTypes);
    cy.findByTestId('hmw-swimming-tab-panel').contains(noUses);

    // verify a tab with data
    cy.findByTestId('hmw-fishing-tab-button').click();
    cy.findByTestId('hmw-fishing-tab-panel')
      .contains(noWaterTypes)
      .should('not.exist');
    cy.findByTestId('hmw-fishing-tab-panel')
      .contains(noUses)
      .should('not.exist');
  });

  it('Navigating to a sub-tab selection shows correct charts', () => {
    const surveyResultsText =
      'State statistical surveys provide an overall picture';
    const siteSpecificText = 'Targeted monitoring provides information';

    // Florida > Aquatic Life > Coastal Waters
    // verify the pie chart is not there and the bar chart is
    cy.findByTestId('hmw-ecological-tab-panel')
      .contains(surveyResultsText)
      .should('not.exist');
    cy.findByTestId('hmw-ecological-tab-panel')
      .contains(siteSpecificText)
      .should('exist');

    // Florida > Aquatic Life > Rivers and Streams
    // select a dropdown item that has the pie chart
    cy.get('#water-type-ecological').click();
    cy.findByText('Rivers and Streams').click();

    // verify the pie chart is not there and the bar chart is
    cy.findByTestId('hmw-ecological-tab-panel')
      .contains(surveyResultsText)
      .should('exist');
    cy.findByTestId('hmw-ecological-tab-panel')
      .contains(siteSpecificText)
      .should('exist');
  });
});
