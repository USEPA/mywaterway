describe('Water Quality Overview Sub Tabs', () => {
  beforeEach(() => {
    cy.server();
    cy.route('https://attains.epa.gov/attains-public/api/surveys?*').as(
      'surveys',
    );
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
    cy.findByText('Eating Fish').click();
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

    // wait for the surveys service to finish
    cy.wait(20000);

    // Florida > Aquatic Life > Coastal Waters
    // verify the pie chart is not there and the bar chart is
    cy.get('p')
      .filter(':visible')
      .contains('State statistical surveys provide an overall picture')
      .should('not.exist');
    cy.get('p')
      .filter(':visible')
      .contains('Targeted monitoring provides information')
      .should('exist');

    // Florida > Aquatic Life > Rivers and Streams
    // select a dropdown item that has the pie chart
    cy.get('.Select__control:contains(Coastal Waters)')
      .filter(':visible')
      .click();
    cy.findByText('Rivers and Streams').click();

    // allow enough time for the surveys section to be visible
    cy.wait(1000);

    // verify the pie chart is not there and the bar chart is
    cy.get('p')
      .filter(':visible')
      .contains('State statistical surveys provide an overall picture')
      .should('exist');
    cy.get('p')
      .filter(':visible')
      .contains('Targeted monitoring provides information')
      .should('exist');
  });

  // it('Navigating to a sub-tab selection that shows bar chart and pie chart (e.g. )', () => {
  //   // verify the water quality overview content loaded prior to other tests
  //   cy.findByText('Water Quality', { timeout: 20000 }).should('exist');
  //   cy.get('button:contains(Aquatic Life)[role=tab]').click();

  //   // wait for the surveys service to finish
  //   cy.wait(15000);

  //   // select a dropdown item that has the pie chart
  //   cy.get('.Select__control:contains(Coastal Waters)')
  //     .filter(':visible')
  //     .click();
  //   cy.findByText('Rivers and Streams').click();

  //   // verify the pie chart is not there and the bar chart is
  //   cy.get('p')
  //     .filter(':visible')
  //     .contains('State statistical surveys provide an overall picture')
  //     .should('exist');
  //   cy.get('p')
  //     .filter(':visible')
  //     .contains('Targeted monitoring provides information')
  //     .should('exist');
  // });
});
