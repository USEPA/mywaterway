describe('Identified Issues Tab', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it('Toggling off the % Assessed Waters switch toggles all of the impairment category switches off', () => {
    // navigate to Identified Issues tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      '020700100102',
    );
    cy.findByText('Go').click();

    cy.waitForLoadFinish();

    cy.findByRole('tab', { name: 'Identified Issues' }).click();

    cy.wait(1000);
    cy.findByLabelText(/of Assessed Waters are impaired/).click({
      force: true,
    });
    cy.findByLabelText(/of Assessed Waters are impaired/).should(
      'have.attr',
      'aria-checked',
      'false',
    );

    // check that all switches are turned off
    cy.findByRole('switch', { name: 'Identified Issues' }).should(
      'have.attr',
      'aria-checked',
      'false',
    );
  });

  it('Clicking the Dischargers switch toggles the switch on', () => {
    // navigate to Identified Issues tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      '020700100102',
    );
    cy.findByText('Go').click();

    cy.waitForLoadFinish();

    cy.findByRole('tab', { name: 'Identified Issues' }).click();

    cy.findByRole('tab', { name: /Permitted Dischargers/ }).click({
      force: true,
    });
    cy.findByRole('switch', { name: /81 Permitted Dischargers/ }).should(
      'have.attr',
      'aria-checked',
      'true',
    );
  });

  it('Clicking a Discharger accordion item expands it', () => {
    // navigate to Identified Issues tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      '020700100204',
    );
    cy.findByText('Go').click();

    cy.waitForLoadFinish();

    // switch to Dischargers tab of Identified Issues tab and check that the discharger accordion item exists and expands when clicked
    cy.findByRole('tab', { name: 'Identified Issues' }).click();
    cy.findByTestId('hmw-dischargers').click();
    cy.findByText('WASHINGTON NAVY YARD').click();
    cy.findByText('Compliance Status:');
  });

  it('Verify checkboxes below tab are checked by default', () => {
    // navigate to Identified issues tab of Community page
    cy.visit('/community/030901011204/identified-issues');

    cy.waitForLoadFinish();

    // verify both current conditions switches are checked
    cy.findAllByLabelText('of Assessed Waters are impaired', { exact: false })
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'true');
    cy.findAllByLabelText('Permitted Dischargers', { exact: false })
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'false');

    // turn off both assessed waters impaired switch
    cy.findAllByLabelText('of Assessed Waters are impaired', { exact: false })
      .filter(':visible')
      .click({ force: true });
    cy.findAllByLabelText('of Assessed Waters are impaired', { exact: false })
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'false');
    cy.findAllByLabelText('Mercury')
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'false');

    // switch to the permitted dischargers tab
    cy.findByRole('tab', { name: 'Permitted Dischargers' }).click();

    // verify assessed waters imparied switches is off and dischargers switch is on
    cy.findAllByLabelText('of Assessed Waters are impaired', { exact: false })
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'false');
    cy.findAllByLabelText('Permitted Dischargers', { exact: false })
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'true');

    // switch back to impaired assessed waters tab and verify switches
    cy.findByRole('tab', { name: 'Impaired Assessed Waters' }).click();
    cy.findAllByLabelText('of Assessed Waters are impaired', { exact: false })
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'true');
    cy.findAllByLabelText('Mercury')
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'true');
  });

  it('Permitted dischargers table filters', () => {
    // navigate to Identified issues tab of Community page
    cy.visit('/community/030901011204/identified-issues');

    cy.waitForLoadFinish();

    // switch to the permitted dischargers tab
    cy.findByRole('tab', { name: 'Permitted Dischargers' }).click();

    // verify defaults
    cy.findByText('(AL3A) INDIAN LAKES ESTATES TAP 69KV');
    cy.findAllByLabelText('All Other Permitted Dischargers')
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'true');

    // turn off other dischargers switch
    cy.findAllByLabelText('All Other Permitted Dischargers')
      .filter(':visible')
      .click({ force: true });
    cy.findAllByLabelText('All Other Permitted Dischargers')
      .filter(':visible')
      .should('have.attr', 'aria-checked', 'false');

    // verify other discharger is not shown in list
    cy.findByText('(AL3A) INDIAN LAKES ESTATES TAP 69KV').should('not.exist');
  });
});
