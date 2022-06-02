describe('Community Visual Regression Testing', () => {
  const mapId = '#hmw-map-container';

  it('Verify DC GIS data displays correctly', () => {
    cy.visit('/community/dc/overview');

    // cy.debouncedWait({
    //   url: 'https://gispub.epa.gov/arcgis/rest/services/OW/ATTAINS_Assessment/MapServer/*/query?f=pbf*',
    //   waitTimeout: 120000,
    // });

    // this is needed as a workaround for the delay between the loading spinner
    // disappearing and the waterbodies being drawn on the map
    cy.wait(20000);

    cy.get(mapId).matchSnapshot('verify-dc-gis-display');
  });

  it('Verify the switches on Identified Issues correctly update the GIS data', () => {
    cy.visit('/community/dc/identified-issues');

    // cy.debouncedWait({
    //   url: 'https://gispub.epa.gov/arcgis/rest/services/OW/ATTAINS_Assessment/MapServer/*/query?f=pbf*',
    //   waitTimeout: 120000,
    // });

    // this is needed as a workaround for the delay between the loading spinner
    // disappearing and the waterbodies being drawn on the map
    cy.wait(20000);

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

  it('Verify shading of huc boundaries is turned off when wsio layer is on', () => {
    cy.visit('/community/dc/protect');

    // cy.debouncedWait({
    //   url: 'https://gispub.epa.gov/arcgis/rest/services/OW/ATTAINS_Assessment/MapServer/*/query?f=pbf*',
    //   waitTimeout: 120000,
    // });

    cy.wait(20000);

    cy.get(mapId).matchSnapshot('verify-huc-boundary-shading');

    // turn the wsio layer on
    cy.get('input[aria-label="Watershed Health Scores"]').click({
      force: true,
    });

    // this is needed as a workaround for the delay between the loading spinner
    // disappearing and the waterbodies being drawn on the map
    cy.wait(5000);

    cy.get(mapId).matchSnapshot('verify-huc-boundary-wsio-no-shading');

    // turn the wsio layer on
    cy.get('input[aria-label="Watershed Health Scores"]').click({
      force: true,
    });

    // this is needed as a workaround for the delay between the loading spinner
    // disappearing and the waterbodies being drawn on the map
    cy.wait(2000);

    cy.get(mapId).matchSnapshot('verify-huc-boundary-shading');
  });

  it('Verify "View on Map" button works', () => {
    cy.visit('/community/dc/overview');

    // cy.debouncedWait({
    //   url: 'https://gispub.epa.gov/arcgis/rest/services/OW/ATTAINS_Assessment/MapServer/*/query?f=pbf*',
    //   waitTimeout: 120000,
    // });

    cy.wait(10000);

    cy.findByText('ANATF - Anacostia River Tidal Fresh').click();

    cy.findByText('View on Map').click();

    cy.get(mapId).within(($el) => {
      cy.findByText(
        'ANATF - Anacostia River Tidal Fresh (State Waterbody ID: MD-ANATF)',
      );

      cy.findByText('Maryland (MDE_EASP)');
    });
    cy.get(mapId).matchSnapshot('verify-view-on-map-button-waterbody-popup');
  });
});

describe('State Visual Regression Testing', () => {
  const assessedChartId = '#hmw-site-specific-chart';
  const surveysChartId = '#hmw-surveys-chart';
  const waterTypeId = '#water-type-swimming';

  it('Verify state waters assessed chart', () => {
    cy.visit('/state/AK/water-quality-overview');

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // wait for animations to settle and check the assessed chart
    cy.wait(10000);
    cy.get(assessedChartId).matchSnapshot(
      'verify-assessed-less-than-1-chart-display',
    );

    cy.visit('/state/AL/water-quality-overview');
    // Select the "Rivers and Streams" water type
    cy.get(waterTypeId).within(($el) => {
      cy.wrap($el).click();
      cy.findByText('Rivers and Streams').click();
    });

    // wait for animations to settle and check the assessed chart
    cy.wait(10000);
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
    cy.wait(10000);
    cy.get(surveysChartId).matchSnapshot('verify-surveys-chart-display');
  });
});
