describe('Waterbody Report page', () => {
  it('small screen displays "Show Map" button and button functions', () => {
    const mapId = 'hmw-actions-map';
    const showMap = 'Show Map';
    const hideMap = 'Hide Map';

    cy.viewport(850, 900);
    cy.visit('/waterbody-report/21AWIC/AL03150110-0202-200');

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

  it('entering an invalid waterbody repot url displays "No waterbodies" message', () => {
    const orgId = 'InvalidOrgID';
    const auId = 'InvalidAssessmentUnitID';

    cy.visit(`/waterbody-report/${orgId}/${auId}`);

    cy.findByText(
      'No waterbodies available for the provided Organization ID:',
      { exact: false },
    );
  });

  it('For waterbodies without GIS data, display the "No map data is available" message', () => {
    const orgId = 'AKDECWQ';
    const auId = 'AK-10102-001_00';

    cy.visit(`/waterbody-report/${orgId}/${auId}`);

    cy.findByText('No map data is available.', { exact: false });
  });

  it('Viewing waterbody report for an older year', () => {
    const orgId = 'MDNR';
    const auId = 'MO_1707.02';
    const year = '2018';

    cy.visit(`/waterbody-report/${orgId}/${auId}/${year}`);
    cy.waitForLoadFinish();

    cy.findByText(
      'Please use the following link to view the latest information',
      { exact: false },
    );
  });

  it('The "View Waterbody Report" link should navigate to a waterbody report page', () => {
    const orgId = '21AWIC';
    const auId = 'AL03150110-0202-200';

    cy.visit(`/waterbody-report/${orgId}/${auId}`);

    cy.waitForLoadFinish();

    // test the plan summary link
    const linkText =
      'Development for Pathogens (E. Coli) Tmdl, Parkerson Mill Creek';
    const actionId = '40958';
    cy.findByText(linkText).should(
      'have.attr',
      'href',
      `/plan-summary/${orgId}/${actionId}`,
    );
    cy.findByText(linkText).should('have.attr', 'target', '_blank');
    cy.findByText(linkText).should('have.attr', 'rel', 'noopener noreferrer');
  });

  it('Test waterbody report with empty attains assessments array', () => {
    cy.visit('/waterbody-report/AKDECWQ/AK-10102-001_00');

    cy.waitForLoadFinish({ timeout: 60000 });

    cy.findAllByText('AK-10102-001_00').should('be.visible');
  });

  it('Verify the maps height does not go below 400 pixels', () => {
    // shrink the viewport to test min height
    cy.viewport(1100, 600);

    cy.visit('/waterbody-report/DOEE/DCANA00E_02/2020');

    cy.waitForLoadFinish({ timeout: 60000 });

    // verify the map height is 400 pixels or greater
    cy.get('#waterbody-report-map').invoke('outerHeight').should('be.gt', 399);
  });

  it('Test expert query service failure', () => {
    cy.intercept(
      'https://api.epa.gov/expertquery/api/attains/assessmentUnits/values/reportingCycle',
      {
        statusCode: 500,
        body: {},
      },
    );

    cy.visit('/waterbody-report/DOEE/DCANA00E_02/2020');

    cy.findAllByText(
      'Other Years Reported information is temporarily unavailable, please try again later.',
    );
  });

  it('Test assessments service failure', () => {
    cy.intercept(
      'https://attains.epa.gov/attains-public/api/assessments?organizationId=DOEE&assessmentUnitIdentifier=DCANA00E_02&reportingCycle=2020',
      {
        statusCode: 500,
        body: {},
      },
    );

    cy.visit('/waterbody-report/DOEE/DCANA00E_02/2020');
    cy.waitForLoadFinish();

    cy.findAllByText(
      'Assessment information is temporarily unavailable, please try again later.',
    );
  });

  it('Test assessments no data version 1', () => {
    cy.intercept(
      'https://attains.epa.gov/attains-public/api/assessments?organizationId=DOEE&assessmentUnitIdentifier=DCANA00E_02&reportingCycle=2020',
      {
        statusCode: 200,
        body: {
          count: 0,
          items: [],
        },
      },
    );

    cy.visit('/waterbody-report/DOEE/DCANA00E_02/2020');
    cy.waitForLoadFinish();

    cy.findAllByText('has no data available for 2020.', { exact: false });
  });

  it('Test assessments no data version 2', () => {
    cy.intercept(
      'https://attains.epa.gov/attains-public/api/assessments?organizationId=DOEE&assessmentUnitIdentifier=DCANA00E_02&reportingCycle=2020',
      {
        statusCode: 200,
        body: {
          count: 1,
          items: [
            {
              assessments: [],
            },
          ],
        },
      },
    );

    cy.visit('/waterbody-report/DOEE/DCANA00E_02/2020');
    cy.waitForLoadFinish();

    cy.findAllByText('has no data available for 2020.', { exact: false });
  });

  it('Test assessments no data version 3', () => {
    cy.intercept(
      'https://attains.epa.gov/attains-public/api/assessments?organizationId=DOEE&assessmentUnitIdentifier=DCANA00E_02&reportingCycle=2020',
      {
        statusCode: 200,
        body: {
          items: [
            {
              organizationIdentifier: 'DOEE',
              organizationName: 'District of Columbia',
              organizationTypeText: 'State',
              reportingCycleText: '2020',
              combinedCycles: [],
              reportStatusCode: 'EPA Final Action',
              assessments: [
                {
                  assessmentUnitIdentifier: 'DCANA00E_02',
                  agencyCode: 'S',
                  trophicStatusCode: null,
                  useAttainments: [],
                  parameters: [],
                  probableSources: [],
                  documents: [],
                  rationaleText: null,
                  epaIRCategory: '4A',
                  overallStatus: 'Not Supporting',
                  cycleLastAssessedText: '2018',
                  yearLastMonitoredText: '',
                },
              ],
              delistedWaters: [],
            },
          ],
          count: 1,
        },
      },
    );

    cy.visit('/waterbody-report/DOEE/DCANA00E_02/2020');
    cy.waitForLoadFinish();

    cy.findByText('No evaluated uses provided for this waterbody.');
    cy.findByText(
      'No probable sources of impairment identified for this waterbody.',
    );
  });
});
