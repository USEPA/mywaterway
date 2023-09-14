describe('Protect Tab', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it('Check that Protection Projects are displayed', () => {
    // navigate to Protect tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      '121002030202',
    );
    cy.findByText('Go').click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // check that the Protection Projects in the Protect tab contains a GRTS project
    cy.findByText('Protect').click();
    cy.findByText('Watershed Health and Protection').click();
    cy.get('.hmw-accordion').filter(':visible').then((elms) => {
      cy.wrap(elms[3]).click();
    });
    cy.findAllByText('Cypress Creek WPP Imp - Years 1-3');

    // navigate to Protect tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false })
      .clear()
      .type('040302020807');
    cy.findByText('Go').click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // check that the Protection Projects in the Protect tab contains a ATTAINS project
    cy.findByText('Upper Fox Wolf TMDL as Protection Plan');
  });

  it('Check that a message is displayed for a location with no Protection Projects', () => {
    // navigate to Protect tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      'San Antonio, TX',
    );
    cy.findByText('Go').click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    cy.findByText('Protect').click();
    cy.findByText('You can help keep your water clean.', { exact: false });
    cy.findByText('Watershed Health and Protection').click();
    cy.get('.hmw-accordion').filter(':visible').then((elms) => {
      cy.wrap(elms[3]).click();
    });
    cy.findByText('There are no EPA funded protection projects in the', {
      exact: false,
    });
  });

  it('Check the watershed health scores section', () => {
    // navigate to Protect tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      '121002030202',
    );
    cy.findByText('Go').click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // check that the Protection Projects in the Protect tab contains a project
    cy.findByText('Protect').click();

    cy.get('.hmw-accordion').filter(':visible').first().click();
    cy.findByText('Where might the healthier watersheds be located', {
      exact: false,
    });
  });

  it('Check the wild and scenic rivers section', () => {
    // navigate to Protect tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      '121002030202',
    );
    cy.findByText('Go').click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // check that the Protection Projects in the Protect tab contains a project
    cy.findByText('Protect').click();

    cy.get('.hmw-accordion').filter(':visible').then((elms) => {
      cy.wrap(elms[1]).click();
    });
    cy.findByText(
      'was created by Congress in 1968 to preserve certain rivers with outstanding',
      {
        exact: false,
      },
    );
  });

  it('Check the protected areas section', () => {
    // navigate to Protect tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      '121002030202',
    );
    cy.findByText('Go').click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // check that the Protection Projects in the Protect tab contains a project
    cy.findByText('Protect').click();

    cy.get('.hmw-accordion').filter(':visible').then((elms) => {
      cy.wrap(elms[2]).click();
    });
    cy.findByText(
      'The Protected Areas Database (PAD-US) is America’s official national inventory of U.S.',
      {
        exact: false,
      },
    );
  });
});
