describe('Monitoring Tab', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it('Clicking the All Monitoring Locations switch toggles it off and displays 0 locations in the accordion', () => {
    // navigate to Monitoring tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      'San Antonio, TX',
    );
    cy.findByText('Go').click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    cy.findByText('Monitoring').click();
    cy.findByRole('tab', { name: 'Past Water Conditions' }).click();

    // click Toggle All Monitoring Locations switch and check that all switches are toggled off
    cy.findByLabelText('Toggle all monitoring locations').click({
      force: true,
    });

    cy.findByLabelText('Toggle all monitoring locations').should(
      'have.attr',
      'aria-checked',
      'false',
    );
    cy.findByLabelText('Toggle Metals').should(
      'have.attr',
      'aria-checked',
      'false',
    );

    // check that there are no items displayed in accordion
    cy.findByTestId('monitoring-accordion-title').contains('0 of 97');

    // check that clicking the Toggle All switch again toggles all switches back on
    cy.findByLabelText('Toggle all monitoring locations').click({
      force: true,
    });
    cy.findByLabelText('Toggle all monitoring locations').should(
      'have.attr',
      'aria-checked',
      'true',
    );
    cy.findByLabelText('Toggle Metals').should(
      'have.attr',
      'aria-checked',
      'true',
    );
  });

  it('Should update the total measurement counts when flipping the "PFAS" toggle switch', () => {
    // navigate to Monitoring tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      'auburn al',
    );
    cy.findByText('Go').click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // navigate to the Past Water Conditions sub-tab
    cy.findByRole('tab', { name: 'Monitoring' }).click();
    cy.findByRole('tab', { name: 'Past Water Conditions' }).click();

    // turn off all switches
    cy.findByRole('switch', {
      name: 'Toggle all monitoring locations',
    }).click({ force: true });

    cy.findByRole('table', { name: 'Monitoring Location Summary' })
      .find('tbody')
      .find('td')
      .last()
      .should('have.text', '0');

    // flip the PFAS switch
    cy.findByRole('switch', { name: 'Toggle PFAS' }).click({ force: true });

    cy.findByRole('table', { name: 'Monitoring Location Summary' })
      .find('tbody')
      .find('td')
      .last()
      .should('not.have.text', '0');
  });

  it('Should update the mapped locations when flipping the "PFAS" toggle switch', () => {
    // navigate to Monitoring tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      'auburn al',
    );
    cy.findByText('Go').click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // navigate to the Past Water Conditions sub-tab
    cy.findByRole('tab', { name: 'Monitoring' }).click();
    cy.findByRole('tab', { name: 'Past Water Conditions' }).click();

    // turn off all switches
    cy.findByRole('switch', {
      name: 'Toggle all monitoring locations',
    }).click({ force: true });

    // this triggers the virtualized list to load
    cy.scrollTo('bottom');

    const pfasLocation = 'Well ( R 2) CITY OF AUBURN 323500085274801 AL';
    cy.findAllByText(pfasLocation).should('not.exist');

    // flip the PFAS switch
    cy.findByRole('switch', { name: 'Toggle PFAS' }).click({ force: true });

    cy.findAllByText(pfasLocation).should('exist');
  });

  it('Verify CyAN data displayed', () => {
    // navigate to Monitoring tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      '030901011701',
    );
    cy.findByText('Go').click();

    cy.findByText('Monitoring').click();

    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // this triggers the virtualized list to load
    cy.scrollTo('bottom');

    cy.findAllByText('Lake Jackson').click();

    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    cy.findAllByText('Daily Cyanobacteria Estimates for Lake Jackson', {
      exact: false,
    }).should('be.visible');

    cy.findAllByText(
      'Cyanobacteria Concentration Histogram and Maximum for Selected Date:',
      { exact: false },
    ).should('be.visible');
  });
});
