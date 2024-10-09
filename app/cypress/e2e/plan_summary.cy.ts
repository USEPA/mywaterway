describe('Plan Summary (Actions) page', () => {
  it('small screen displays "Show Map" button and button functions', () => {
    const mapId = 'hmw-actions-map';
    const showMap = 'Show Map';
    const hideMap = 'Hide Map';

    cy.viewport(850, 900);
    cy.visit('/plan-summary/21AWIC/40958');

    cy.findByText(showMap).should('exist');
    cy.findByText(hideMap).should('not.exist');
    cy.findByTestId(mapId).should('not.be.visible');

    cy.findByText(showMap).click();
    cy.findByText(showMap).should('not.exist');
    cy.findByText(hideMap).should('exist');
    cy.findByTestId(mapId).should('be.visible');

    cy.findByText(hideMap).click();
    cy.findByText(showMap).should('exist');
    cy.findByText(hideMap).should('not.exist');
    cy.findByTestId(mapId).should('not.be.visible');
  });

  it('entering an invalid plan-summary (actions) url displays "No plans" message', () => {
    const orgId = 'InvalidOrgID';
    const actionId = 'InvalidActionID';

    cy.visit(`/plan-summary/${orgId}/${actionId}`);

    cy.findByText(
      `No plans available for the provided Organization / Plan Identifier combination: ${orgId} / ${actionId}.`,
    );
  });

  it('For plans without GIS data, display the "No map data is available" message', () => {
    const orgId = '21GAEPD';
    const actionId = '1';

    cy.visit(`/plan-summary/${orgId}/${actionId}`);

    cy.waitForLoadFinish();

    cy.findByText('No map data is available.');
  });

  it('The "View Waterbody Report" link should navigate to a waterbody report page', () => {
    const orgId = '21AWIC';
    const actionId = '40958';
    const reportingCycle = '2022';

    cy.visit(`/plan-summary/${orgId}/${actionId}`);

    cy.waitForLoadFinish();

    // test the waterbody report link
    const linkText = 'View Waterbody Report';
    const auId = 'AL03150110-0202-200';
    cy.findByText(`State Waterbody ID: ${auId}`).first().click();
    cy.findByText(linkText).should(
      'have.attr',
      'href',
      `/waterbody-report/${orgId}/${auId}/${reportingCycle}`,
    );
    cy.findByText(linkText).should('have.attr', 'target', '_blank');
    cy.findByText(linkText).should('have.attr', 'rel', 'noopener noreferrer');
  });

  it('Verify the maps height does not go below 400 pixels', () => {
    // shrink the viewport to test min height
    cy.viewport(1100, 600);

    cy.visit('/plan-summary/CA_SWRCB/66264');

    cy.waitForLoadFinish({ timeout: 20000 });

    // verify the map height is 400 pixels or greater
    cy.get('#plan-summary-map').invoke('outerHeight').should('be.gt', 399);
  });

  it('Attains actions service failure', () => {
    cy.intercept(
      'https://attains.epa.gov/attains-public/api/actions?ActionIdentifier=40594&organizationIdentifier=DOEE',
      {
        statusCode: 500,
        body: {},
      },
    ).as('attains-actions');

    cy.visit('/plan-summary/DOEE/40594');

    cy.findByText(
      'Plan information is temporarily unavailable, please try again later.',
    );
  });

  it('Displays links to download waterbody data', () => {
    let orgIdA = '21AWIC';
    let actionIdA = '40958';

    cy.visit(`/plan-summary/${orgIdA}/${actionIdA}`);

    // wait for the web services to finish (attains/plans is sometimes slow)
    // the timeout chosen is the same timeout used for the attains/plans fetch
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // Check the request made to Expert Query when downloading CSV data for the plan.
    cy.intercept('POST', 'https://api.epa.gov/expertquery/api/attains/tmdl').as(
      'eq-tmdl-data',
    );
    cy.findByRole('button', {
      name: /Download selected data as a CSV file/,
    }).click();
    cy.wait('@eq-tmdl-data', { timeout: 120000 }).then((interception) => {
      expect(interception.request.body)
        .to.have.property('options')
        .to.have.property('format', 'csv');
      expect(interception.request.body)
        .to.have.property('filters')
        .to.have.property('actionId', actionIdA);
      expect(interception.request.body)
        .to.have.property('columns')
        .that.is.an('array');
    });

    // Verify the link to the EQ portal is visible and has the correct href.
    cy.findByRole('link', { name: /Advanced Filtering/ })
      .invoke('attr', 'href')
      .then((href) => {
        const regex = new RegExp(`\\/tmdl\\?actionId=${actionIdA}`);
        expect(regex.test(href)).to.be.true;
      });

    const orgIdB = '21FL303D';
    const actionIdB = 'FL68645_4B';

    cy.visit(`/plan-summary/${orgIdB}/${actionIdB}`);

    // wait for the web services to finish (attains/plans is sometimes slow)
    // the timeout chosen is the same timeout used for the attains/plans fetch
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // Check the request made to Expert Query. This should be made to the Actions service.
    cy.intercept(
      'POST',
      'https://api.epa.gov/expertquery/api/attains/actions',
    ).as('eq-actions-data');
    cy.findByRole('button', {
      name: /Download selected data as an XLSX file/,
    }).click();
    cy.wait('@eq-actions-data', { timeout: 120000 }).then((interception) => {
      expect(interception.request.body)
        .to.have.property('options')
        .to.have.property('format', 'xlsx');
      expect(interception.request.body)
        .to.have.property('filters')
        .to.have.property('actionId', actionIdB);
    });
  });
});
