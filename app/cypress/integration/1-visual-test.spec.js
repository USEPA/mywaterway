describe('Community Visual Regression Testing', () => {
  const mapId = '#base-container';

  it('Verify DC GIS data displays correctly', () => {
    cy.visit('/community/dc/overview');

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // this is needed as a workaround for the delay between the loading spinner
    // disappearing and the waterbodies being drawn on the map
    cy.wait(3000);

    cy.get(mapId).matchSnapshot('verify-dc-gis-display');
  });

  it('Verify the switches on Identified Issues correctly update the GIS data', () => {
    cy.visit('/community/dc/identified-issues');

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // test all impairment categories on
    cy.get(mapId).matchSnapshot('dc-all-impairment-categories');

    // test no impairment categories on
    cy.get('input[aria-label="Toggle all impairment categories"]').click({
      force: true,
    });
    cy.get(mapId).matchSnapshot('dc-no-impairment-categories');

    // test with only acidity on
    cy.get('input[aria-label="Acidity"]').click({
      force: true,
    });
    cy.get(mapId).matchSnapshot('dc-acidity-impairment-categories');

    // test with only acidity and metals on
    cy.get('input[aria-label="Metals"]').click({
      force: true,
    });
    cy.get(mapId).matchSnapshot('dc-acidity-metals-impairment-categories');

    // test with only metals on
    cy.get('input[aria-label="Acidity"]').click({
      force: true,
    });
    cy.get(mapId).matchSnapshot('dc-metals-impairment-categories');
  });
});

describe('State Visual Regression Testing', () => {
  const assessedChartId = '#hmw-site-specific-chart';
  const surveysChartId = '#hmw-surveys-chart';
  const waterTypeId = '#water-type-swimming';

  it('Verify state waters assessed chart', () => {
    cy.visit('/state/AL/water-quality-overview');

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // wait for animations to settle and check the assessed chart
    cy.wait(1000);
    cy.get(assessedChartId).matchSnapshot(
      'verify-assessed-less-than-1-chart-display',
    );

    // Select the "Rivers and Streams" water type
    cy.get(waterTypeId).within(($el) => {
      cy.wrap($el).click();
      cy.findByText('Rivers and Streams').click();
    });

    // wait for animations to settle and check the assessed chart
    cy.wait(1000);
    cy.get(assessedChartId).matchSnapshot('verify-assessed-chart-display');
  });

  it('Verify state surveys chart', () => {
    cy.visit('/state/KS/water-quality-overview');

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // Select the "Rivers and Streams" water type
    cy.get(waterTypeId).within(($el) => {
      cy.wrap($el).click();
      cy.findByText('Rivers and Streams').click();
    });

    // wait for animations to settle and check the assessed chart
    cy.wait(2000);
    cy.get(surveysChartId).matchSnapshot('verify-surveys-chart-display');
  });
});