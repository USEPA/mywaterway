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
