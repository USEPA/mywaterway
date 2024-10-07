describe('Community Visual Regression Testing', () => {
  const mapId = '#hmw-map-container';

  it('Verify DC GIS data displays correctly', () => {
    cy.visit('/community/dc/overview');

    cy.waitForLoadFinish();

    // this is needed as a workaround for the delay between the loading spinner
    // disappearing and the waterbodies being drawn on the map
    cy.wait(5000);

    cy.get(mapId).matchSnapshot('verify-dc-gis-display');
  });

  it('Verify the switches on Identified Issues correctly update the GIS data', () => {
    cy.visit('/community/dc/identified-issues');

    cy.waitForLoadFinish();

    // this is needed as a workaround for the delay between the loading spinner
    // disappearing and the waterbodies being drawn on the map
    cy.wait(5000);

    // test all impairment categories on
    cy.get(mapId).matchSnapshot('dc-all-impairment-categories');

    // test no impairment categories on
    cy.findByRole('switch', { name: 'Identified Issues' }).click({
      force: true,
    });
    cy.get(mapId).matchSnapshot('dc-no-impairment-categories');

    // test with only acidity on
    cy.findByLabelText('PCBs').click({ force: true });
    cy.get(mapId).matchSnapshot('dc-pcb-impairment-categories');

    // test with only acidity and metals on
    cy.findByLabelText('Metals').click({ force: true });
    cy.get(mapId).matchSnapshot('dc-pcb-metals-impairment-categories');

    // test with only metals on
    cy.findByLabelText('PCBs').click({ force: true });
    cy.get(mapId).matchSnapshot('dc-metals-impairment-categories');
  });

  it('Verify shading of huc boundaries is turned off when wsio layer is on', () => {
    cy.visit('/community/dc/protect');

    cy.findByText('Watershed Health and Protection');

    cy.waitForLoadFinish();

    cy.get(mapId).matchSnapshot('verify-huc-boundary-shading');

    // turn the wsio layer on
    cy.get('input[aria-label="Watershed Health Scores"]').click({
      force: true,
    });

    // jostle the map view to workaround WSIO service performance issues
    cy.findByTitle('Zoom out').click({ force: true }).click({ force: true });
    cy.findByTitle('Default map view').click({ force: true });

    // this is needed as a workaround for the delay between the loading spinner
    // disappearing and the waterbodies being drawn on the map
    cy.wait(8000);

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

    cy.waitForLoadFinish();

    cy.findByText('FORT CHAPLIN RUN').click();

    cy.findByText('View on Map').click();

    cy.get(mapId).within(($el) => {
      cy.findByText('FORT CHAPLIN RUN (District Waterbody ID: DCTFC01R_00)');

      cy.findByText('District of Columbia (DOEE)');
    });
    cy.get(mapId).matchSnapshot('verify-view-on-map-button-waterbody-popup');
  });

  it('Verify toggling on surrounding streamgages works', () => {
    cy.visit('/community/150503010906/overview');

    cy.waitForLoadFinish();

    // delay to allow features to load
    cy.wait(10000);

    cy.findByTitle('Open Surrounding Features').click({ force: true });
    cy.findByLabelText('Surrounding Features:')
      .findByRole('switch', { name: 'USGS Sensors' })
      .click();

    cy.findByLabelText('Surrounding Features:')
      .findByRole('switch', { name: 'Dischargers' })
      .click();

    cy.findByLabelText('Surrounding Features:')
      .findByRole('switch', { name: 'Past Water Conditions' })
      .click();

    cy.findByTitle('Close Surrounding Features').waitForLoadFinish();

    // delay to draw features after data loaded
    cy.wait(10000);

    cy.get(mapId).matchSnapshot('tucson-surrounding-streamgages');
  });
});

describe('State Visual Regression Testing', () => {
  const assessedChartId = '#hmw-site-specific-chart';
  const surveysChartId = '#hmw-surveys-chart';
  const waterTypeId = '#water-type-swimming';

  it('Verify state waters assessed chart', () => {
    cy.visit('/state/AK/water-quality-overview');

    cy.waitForLoadFinish();

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

    cy.waitForLoadFinish();

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
