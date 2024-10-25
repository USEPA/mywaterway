describe('Overview Tab', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it('Filters the list of permitted dischargers when permit component switches are toggled', () => {
    // Navigate to the Overview tab of the Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type('dc');
    cy.findByText('Go').click();

    cy.waitForLoadFinish();

    cy.findByRole('tab', { name: 'Permitted Dischargers' }).click();

    // Toggle All Permit Components switch and check that no accordion items are displayed
    cy.findByLabelText('All Permit Components').click({
      force: true,
    });
    cy.findByRole('list', { name: 'List of Permitted Dischargers' })
      .findAllByRole('listitem')
      .should('have.length', 0);

    cy.findByLabelText('POTW').click({ force: true });
    cy.findByRole('button', {
      name: 'DISTRICT DEPARTMENT OF ENERGY AND ENVIRONMENT NATURAL RESOURCES ADMINISTRATION',
    }).should('be.visible');
  });

  it('Verify switches are checked by default', () => {
    // navigate to Monitoring tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      '030901011204',
    );
    cy.findByText('Go').click();

    function checkSwitch(label: string, value: string) {
      cy.findAllByLabelText(label, { exact: false })
        .filter(':visible')
        .filter('input')
        .should('have.attr', 'aria-checked', value);
    }

    function clickSwitch(label: string) {
      cy.findAllByLabelText(label, { exact: false })
        .filter(':visible')
        .filter('input')
        .click({ force: true });
    }

    cy.waitForLoadFinish();

    // verify waterbodies switch is initially checked and uncheck it
    checkSwitch('Waterbodies', 'true');
    clickSwitch('Waterbodies');
    checkSwitch('Waterbodies', 'false');

    // verify other switches are off
    checkSwitch('Water Monitoring Locations', 'false');
    checkSwitch('Permitted Dischargers', 'false');

    // switch to monitoring tab
    cy.findByRole('tab', { name: 'Water Monitoring Locations' }).click();

    // verify all water monitoring switches are checked
    checkSwitch('Water Monitoring Locations', 'true');
    checkSwitch('USGS Sensors', 'true');
    checkSwitch('Past Water Conditions', 'true');
    checkSwitch('Potential Harmful Algal Blooms (HABs)', 'true');

    // turn off all water monitoring switches
    clickSwitch('USGS Sensors');
    clickSwitch('Past Water Conditions');
    clickSwitch('Potential Harmful Algal Blooms (HABs)');
    checkSwitch('USGS Sensors', 'false');
    checkSwitch('Past Water Conditions', 'false');
    checkSwitch('Potential Harmful Algal Blooms (HABs)', 'false');
    checkSwitch('Water Monitoring Locations', 'false');

    // switch to permitted dischargers and verify switches are on
    cy.findByRole('tab', { name: 'Permitted Dischargers' }).click();
    checkSwitch('Permitted Dischargers', 'true');

    // turn off permitted dischargers switch
    clickSwitch('Permitted Dischargers');
    checkSwitch('Permitted Dischargers', 'false');

    // go back to waterbodies tab and verify switches are on
    cy.findByRole('tab', { name: 'Waterbodies' }).click();
    checkSwitch('Waterbodies', 'true');

    // switch back to monitoring tab and verify switches are on
    cy.findByRole('tab', { name: 'Water Monitoring Locations' }).click();
    checkSwitch('Water Monitoring Locations', 'true');
    checkSwitch('USGS Sensors', 'true');
    checkSwitch('Past Water Conditions', 'true');
    checkSwitch('Potential Harmful Algal Blooms (HABs)', 'true');

    // switch back to permitted dischargers and verify all switches are checked
    cy.findByRole('tab', { name: 'Permitted Dischargers' }).click();
    checkSwitch('Permitted Dischargers', 'true');
  });

  it('Displays links to download waterbody data', () => {
    // Navigate to the Overview tab of the Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type('dc');
    cy.findByText('Go').click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    cy.findByRole('tab', { name: 'Waterbodies' }).click();

    cy.findByText('Download All Waterbody Data').should('be.visible');
    cy.findByRole('button', {
      name: /Download selected data as an XLSX file/,
    }).should('be.visible');

    // Check the request made to Expert Query when downloading CSV data for all waterbodies in the list.
    cy.intercept(
      'POST',
      'https://api.epa.gov/expertquery/api/attains/assessments',
    ).as('eq-data');
    cy.findByRole('button', {
      name: /Download selected data as a CSV file/,
    }).click();
    cy.wait('@eq-data', { timeout: 120000 }).then((interception) => {
      expect(interception.request.body)
        .to.have.property('options')
        .to.have.property('format', 'csv');
      expect(interception.request.body)
        .to.have.property('filters')
        .to.have.property('assessmentUnitId')
        .that.is.an('array');
      expect(interception.request.body)
        .to.have.property('columns')
        .that.is.an('array');
    });

    // Check the request made to Expert Query when downloading XLSX data for a single waterbody in the list.
    cy.findByRole('list', { name: 'List of Waterbodies' })
      .findAllByRole('listitem')
      .first()
      .within(() => {
        cy.findByRole('button').click();
        cy.findByRole('button', {
          name: /Download selected data as an XLSX file/,
        }).click();
        cy.wait('@eq-data', { timeout: 120000 }).then((interception) => {
          expect(interception.request.body)
            .to.have.property('options')
            .to.have.property('format', 'xlsx');
          expect(interception.request.body)
            .to.have.property('filters')
            .to.have.property('assessmentUnitId')
            .that.is.an('array')
            .and.have.lengthOf(1);
          expect(interception.request.body)
            .to.have.property('filters')
            .to.have.property('reportingCycle');
          expect(interception.request.body)
            .to.have.property('columns')
            .that.is.an('array');
        });
      });
  });
});
