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

    cy.waitForLoadFinish();

    // verify waterbodies switch is initially checked and uncheck it
    cy.findAllByLabelText('Waterbodies', { exact: false })
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'true');
    cy.findAllByLabelText('Waterbodies', { exact: false })
      .filter(':visible')
      .click({ force: true });
    cy.findAllByLabelText('Waterbodies', { exact: false })
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'false');

    // verify other switches are off
    cy.findAllByLabelText('Water Monitoring Locations', { exact: false })
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'false');
    cy.findAllByLabelText('Permitted Dischargers', { exact: false })
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'false');

    // switch to monitoring tab
    cy.findByRole('tab', { name: 'Water Monitoring Locations' }).click();

    // verify all water monitoring switches are checked
    cy.findAllByLabelText('Water Monitoring Locations', { exact: false })
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'true');
    cy.findAllByLabelText('USGS Sensors')
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'true');
    cy.findAllByLabelText('Past Water Conditions')
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'true');
    cy.findAllByLabelText('Potential Harmful Algal Blooms (HABs)')
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'true');

    // turn off all water monitoring switches
    cy.findAllByLabelText('USGS Sensors')
      .filter(':visible')
      .click({ force: true });
    cy.findAllByLabelText('Past Water Conditions').filter(':visible').click({
      force: true,
    });
    cy.findAllByLabelText('Potential Harmful Algal Blooms (HABs)')
      .filter(':visible')
      .click({
        force: true,
      });
    cy.findAllByLabelText('USGS Sensors')
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'false');
    cy.findAllByLabelText('Past Water Conditions')
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'false');
    cy.findAllByLabelText('Potential Harmful Algal Blooms (HABs)')
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'false');
    cy.findAllByLabelText('Water Monitoring Locations', { exact: false })
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'false');

    // switch to permitted dischargers and verify switches are on
    cy.findByRole('tab', { name: 'Permitted Dischargers' }).click();
    cy.findAllByLabelText('Permitted Dischargers', { exact: false })
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'true');

    // turn off permitted dischargers switch
    cy.findAllByLabelText('Permitted Dischargers', { exact: false }).click({
      force: true,
      multiple: true,
    });
    cy.findAllByLabelText('Permitted Dischargers', { exact: false })
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'false');

    // go back to waterbodies tab and verify switches are on
    cy.findByRole('tab', { name: 'Waterbodies' }).click();
    cy.findAllByLabelText('Waterbodies', { exact: false })
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'true');

    // switch back to monitoring tab and verify switches are on
    cy.findByRole('tab', { name: 'Water Monitoring Locations' }).click();
    cy.findAllByLabelText('Water Monitoring Locations', { exact: false })
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'true');
    cy.findAllByLabelText('USGS Sensors')
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'true');
    cy.findAllByLabelText('Past Water Conditions')
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'true');
    cy.findAllByLabelText('Potential Harmful Algal Blooms (HABs)')
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'true');

    // switch back to permitted dischargers and verify all switches are checked
    cy.findByRole('tab', { name: 'Permitted Dischargers' }).click();
    cy.findAllByLabelText('Permitted Dischargers', { exact: false })
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'true');
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
      'https://api.epa.gov/expertquery/api/attains/assessmentUnits',
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
