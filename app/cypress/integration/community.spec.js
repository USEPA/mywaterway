describe('Community page links', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it(`"Open Plan Summary" button links to the plan summary page`, () => {
    // navigate to the restoration plans tab of the restore panel
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      'San Antonio, TX',
    );
    cy.findByText('Go').click();
    cy.findByText('Restore').click();
    cy.findByText('Restoration Plans').click();

    // wait for the web services to finish (attains/plans is sometimes slow)
    // the timeout chosen is the same timeout used for the attains/plans fetch
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // test the plan summary link
    const linkText = 'Open Plan Summary';
    cy.findAllByText('Upper San Antonio River WPP').first().click();
    cy.findByText(linkText).should(
      'have.attr',
      'href',
      '/plan-summary/TCEQMAIN/1',
    );
    cy.findByText(linkText).should('have.attr', 'target', '_blank');
    cy.findByText(linkText).should('have.attr', 'rel', 'noopener noreferrer');
  });

  it('Switching Community page tabs updates route', () => {
    cy.findByText('State').click();
    cy.url().should('include', `${window.location.origin}/state`);

    cy.findByText('National').click();
    cy.url().should('include', `${window.location.origin}/national`);

    cy.findByText('Community').click();
    cy.url().should('include', `${window.location.origin}/community`);
  });
});

describe('Community page routes', () => {
  it('Navigate to the community page with a <script> tag in the route', () => {
    cy.visit('/community/%3Cscript%3Evar%20j%20=%201;%3C/script%3E/overview');

    cy.findByText('Sorry, but the url entered was invalid.').should('exist');

    cy.url().should('include', `${window.location.origin}/invalid-url`);
  });
});

describe('Community page search', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it('properly routes to the community overview page', () => {
    const zip = '22201';
    cy.findByPlaceholderText('Search by address', { exact: false }).type(zip);
    cy.findByText('Go').click();
    cy.url().should('include', `/community/${zip}/overview`);
    cy.findByText('Your Waters: What We Know').should('exist');
  });

  it('searching for gibberish displays an error', () => {
    const search = 'jkljl';
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      search,
    );
    cy.findByText('Go').click();
    cy.url({ timeout: 20000 }).should(
      'equal',
      `${window.location.origin}/community`,
    );
    cy.findByText('Data is not available for this location.', {
      exact: false,
    }).should('exist');
  });

  it('searching with a <script> tag displays an error', () => {
    const search = '<script>var j = 1;</script>';
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      search,
    );
    cy.findByText('Go').click();
    cy.findByText('Invalid search. Please try a new search.').should('exist');
  });

  it('searching for a valid huc properly routes to the community overview page', () => {
    const search = '020700100103';
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      search,
      { force: true },
    );
    cy.findByText('Go').click();
    cy.url().should('include', `/community/${search}/overview`);
    cy.findByText('Your Waters: What We Know').should('exist');
  });

  it('Clicking the “Use My Location” button, with geolocation enabled, properly geolocates user and routes to the community overview page for the user’s location', () => {
    const address = 'Scott Cir NW, Washington, District of Columbia, 20036';
    cy.mockGeolocation(false, 38.9072, -77.0369);
    cy.findByText('Use My Location').click();
    cy.url().should('include', `/community/${encodeURI(address)}/overview`);
    cy.findByText('Your Waters: What We Know').should('exist');
  });

  it('Clicking the “Use My Location” button, with geolocation disabled, displays an error and does not route', () => {
    cy.mockGeolocation(true);
    cy.findByText('Use My Location').click();
    cy.url().should('equal', `${window.location.origin}/community`);
    cy.findByText('Error Getting Location').should('exist');
  });
});

describe('Community page zero waterbodies message', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it('properly displays a message for locations with 0 waterbodies', () => {
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      'Dallas, Texas',
    );
    cy.findByText('Go').click();
    cy.findByText('There are no waterbodies assessed in the', {
      exact: false,
      timeout: 20000,
    }).should('exist');
  });
});

describe('Community page map legend', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it('Clicking the "Mapped Water (all)" layer visibility button should populate the legend', () => {
    // navigate to Monitoring tab of Community page
    cy.findByRole('textbox', { name: 'Search' }).type('San Antonio, TX');
    cy.findByRole('button', { name: 'Go' }).click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    cy.findByRole('button', { name: 'Expand' }).click();
    cy.findAllByRole('switch', { name: 'Mapped Water (all)' }).click();
    cy.findByRole('button', { name: 'Collapse' }).click();
    cy.findByRole('button', { name: 'Toggle Legend' }).click();
    cy.findAllByText('Mapped Water (all)').should('be.visible');
  });
});

describe('Community page (small screen)', () => {
  beforeEach(() => {
    cy.viewport(850, 900);
    cy.visit('/community/dc/overview');
  });

  it('small screen displays "Show Map" button and button functions', () => {
    cy.findByText('Show Map').should('exist');
    cy.findByText('Hide Map').should('not.exist');
    cy.findByTestId('hmw-community-map').should('not.be.visible');

    cy.findByText('Show Map').click();
    cy.findByText('Show Map').should('not.exist');
    cy.findByText('Hide Map').should('exist');
    cy.findByTestId('hmw-community-map').should('be.visible');

    cy.findByText('Hide Map').click();
    cy.findByText('Show Map').should('exist');
    cy.findByText('Hide Map').should('not.exist');
    cy.findByTestId('hmw-community-map').should('not.be.visible');
  });
});

describe('Community page Show Additional Text', () => {
  beforeEach(() => {
    cy.visit('/community/San%20Antonio,%20TX/overview');
  });

  it('Clicking Show Text switch toggles intro text', () => {
    const heading = 'Your Waters: What We Know';
    cy.findByText(heading);
    cy.findByLabelText('Show Text').click({ force: true });
    cy.findByText(heading).should('not.exist');
  });

  it('Clicking Show More/Show Less toggles more or less text', () => {
    const less = 'Show less';
    const more = 'Show more';

    cy.findAllByText(more).filter(':visible').click();
    cy.findByText(less);
    cy.findAllByText(more).filter(':visible').should('not.exist');

    cy.findByText(less).click();
    cy.findAllByText(more).filter(':visible');
    cy.findByText(less).should('not.exist');
  });

  it(`Clicking "Expand All/Collapse All" expands/collapses the waterbody list`, () => {
    const text = 'Year Last Reported:';

    cy.findAllByText('Expand All').filter(':visible');
    cy.findByText(text).should('not.exist');

    cy.findByText('Expand All').click();
    cy.findAllByText(text).should('be.visible');

    cy.findByText('Collapse All').click();
    cy.findByText(text).should('not.exist');
  });
});

describe('Community page Glossary', () => {
  it('Clicking a Glossary term opens Glossary Panel', () => {
    cy.visit('/community/Boston/drinking-water');

    cy.findByText('Community water systems').click();
    cy.findByText('Non-Transient Non-Community Water System (NTNCWS):');
  });
});

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

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    cy.findByText('Identified Issues').click();

    cy.findByLabelText('Toggle Issues Layer').click({ force: true });
    cy.findByLabelText('Toggle Issues Layer').should(
      'have.attr',
      'aria-checked',
      'false',
    );

    // check that all switches are turned off
    cy.findByLabelText('Toggle all impairment categories').should(
      'have.attr',
      'aria-checked',
      'false',
    );
  });

  it('Clicking the Dischargers switch toggles the switch off', () => {
    // navigate to Identified Issues tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      '020700100102',
    );
    cy.findByText('Go').click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    cy.findByText('Identified Issues').click();

    cy.findByLabelText('Toggle Dischargers Layer').click({ force: true });
    cy.findByLabelText('Toggle Dischargers Layer').should(
      'have.attr',
      'aria-checked',
      'false',
    );
  });

  it('Clicking a Discharger accordion item expands it', () => {
    // navigate to Identified Issues tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      '020700100305',
    );
    cy.findByText('Go').click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // switch to Dischargers tab of Identified Issues tab and check that the discharger accordion item exists and expands when clicked
    cy.findByText('Identified Issues').click();
    cy.findByTestId('hmw-dischargers').click();
    cy.findByText("CHELTENHAM BOY'S VILLAGE WWTP").click();
    cy.findByText('Compliance Status:');
  });
});

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
    cy.findByTestId('monitoring-accordion-title').contains('0 of 96', {
      exact: false,
    });

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
      '45203',
    );
    cy.findByText('Go').click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    cy.findByText('Monitoring').click();

    // navigate to the Past Water Conditions sub-tab
    cy.findAllByText('Past Water Conditions').filter('button').click();

    // turn off all switches
    cy.findByText('All Monitoring Locations')
      .siblings()
      .first()
      .find('input')
      .click({
        force: true,
      });

    cy.findByRole('table', { name: 'Monitoring Totals' })
      .find('td')
      .last()
      .should('have.text', '0');

    // flip the PFAS switch
    cy.findByText('PFAS').siblings().first().find('input').click({
      force: true,
    });

    cy.findByRole('table', { name: 'Monitoring Totals' })
      .find('td')
      .last()
      .should('not.have.text', '0');
  });

  it('Should update the mapped locations when flipping the "PFAS" toggle switch', () => {
    // navigate to Monitoring tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      '45203',
    );
    cy.findByText('Go').click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    cy.findByText('Monitoring').click();

    // navigate to the Past Water Conditions sub-tab
    cy.findAllByText('Past Water Conditions').filter('button').click();

    // turn off all switches
    cy.findByText('All Monitoring Locations')
      .siblings()
      .first()
      .find('input')
      .click({
        force: true,
      });

    cy.findAllByText('Ohio: Middle').should('not.exist');

    // flip the PFAS switch
    cy.findByText('PFAS').siblings().first().find('input').click({
      force: true,
    });

    cy.findAllByText('Ohio: Middle').should('exist');
  });
});

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
    cy.get('.hmw-accordion').then((elms) => {
      cy.wrap(elms[3]).click();
    });
    cy.findByText('Cypress Creek WPP Imp - Years 1-3');

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
    cy.get('.hmw-accordion').then((elms) => {
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

    cy.get('.hmw-accordion').first().click();
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

    cy.get('.hmw-accordion').then((elms) => {
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

    cy.get('.hmw-accordion').then((elms) => {
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

describe('HTTP Intercepts', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it('Check that if GIS responds with empty features array we query and display data about the missing items.', () => {
    cy.intercept(
      'https://gispub.epa.gov/arcgis/rest/services/OW/ATTAINS_Assessment/MapServer/1/query?f=json&outFields=*',
      {
        statusCode: 200,
        body: { features: [] },
      },
    ).as('attains-lines');

    // navigate to Protect tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type('DC');
    cy.findByText('Go').click();

    cy.wait('@attains-lines', { timeout: 120000 });

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // Verify text explaining some waterbodies have no spatial data exists
    cy.findByText('Some waterbodies are not visible on the map.');
    cy.findAllByText('[Waterbody not visible on map.]', { exact: false });
  });
});
