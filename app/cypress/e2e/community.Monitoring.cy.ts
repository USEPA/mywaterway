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
    cy.findByLabelText('All Monitoring Locations').click({
      force: true,
    });

    cy.findByLabelText('All Monitoring Locations').should(
      'have.attr',
      'aria-checked',
      'false',
    );
    cy.findByLabelText('Metals').should('have.attr', 'aria-checked', 'false');

    // check that there are no items displayed in accordion
    cy.findByTestId('monitoring-accordion-title').contains('0 of 98');

    // check that clicking the Toggle All switch again toggles all switches back on
    cy.findByLabelText('All Monitoring Locations').click({
      force: true,
    });
    cy.findByLabelText('All Monitoring Locations').should(
      'have.attr',
      'aria-checked',
      'true',
    );
    cy.findByLabelText('Metals').should('have.attr', 'aria-checked', 'true');
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
      name: 'All Monitoring Locations',
    }).click({ force: true });

    cy.findByRole('table', { name: 'Monitoring Location Summary' })
      .find('tbody')
      .find('td')
      .last()
      .should('have.text', '0');

    // flip the PFAS switch
    cy.findByRole('switch', { name: 'PFAS' }).click({ force: true });

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
      name: 'All Monitoring Locations',
    }).click({ force: true });

    // this triggers the virtualized list to load
    cy.scrollTo('bottom');

    const pfasLocation = 'Well ( R 2) CITY OF AUBURN 323500085274801 AL';
    cy.findAllByText(pfasLocation).should('not.exist');

    // flip the PFAS switch
    cy.findByRole('switch', { name: 'PFAS' }).click({ force: true });

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

  it('Adjusting the date slider updates info for a monitoring location', () => {
    const monitoringLocation = '01651770';

    cy.findByPlaceholderText('Search by address', { exact: false }).type('dc');

    cy.findByText('Go').click();

    cy.findByRole('tab', { name: 'Monitoring' }).click();

    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    cy.findByRole('tab', { name: 'Past Water Conditions' }).click();

    cy.scrollTo('bottom');

    cy.findByRole('button', { name: monitoringLocation }).click();

    cy.findByRole('button', { name: monitoringLocation })
      .parent()
      .findByText((_content, element) => {
        const match = element.textContent.match(/^\(1951 - 20\d\d\)$/);
        return Boolean(match);
      })
      .should('be.visible');

    // drag the slider handle
    cy.findByRole('slider', { name: '1951' })
      .trigger('mousedown', {
        which: 1,
      })
      .trigger('mousemove', {
        which: 1,
        clientX: 1000,
      })
      .trigger('mouseup', {
        force: true,
        which: 1,
      });

    cy.findByRole('button', { name: monitoringLocation })
      .parent()
      .findByText((_content, element) => {
        const match = element.textContent.match(/^\(1951 - 20\d\d\)$/);
        return Boolean(match);
      })
      .should('not.exist');
  });

  it('Toggling characteristic group checkboxes should change the total measurement count', () => {
    cy.findByPlaceholderText('Search by address', { exact: false }).type('dc');

    cy.findByText('Go').click();

    cy.findByRole('tab', { name: 'Monitoring' }).click();

    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    cy.findByRole('tab', { name: 'Past Water Conditions' }).click();

    cy.scrollTo('bottom');

    cy.findByRole('button', { name: '01651770' }).click();

    cy.findByRole('checkbox', {
      name: 'Toggle all characteristic groups',
    }).click();

    cy.findByRole('table', { name: 'Characteristic Groups Summary' })
      .find('tbody')
      .find('td')
      .last()
      .should('have.text', '0');

    cy.findByRole('checkbox', { name: 'Toggle Other' }).click();

    cy.findByRole('table', { name: 'Characteristic Groups Summary' })
      .find('tbody')
      .find('td')
      .last()
      .should('not.have.text', '0');
  });
});
