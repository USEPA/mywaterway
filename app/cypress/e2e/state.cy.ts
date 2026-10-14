describe('State page links', () => {
  beforeEach(() => {
    cy.visit('/state/FL/water-quality-overview');
  });

  it('Clicking the “Show more/Show less” link/button toggles between showing more/less text in the state intro paragraph', () => {
    // verify that only "Show more" is visible
    cy.findByText('Show less').should('not.exist');
    cy.findByText('Show more').should('exist');

    // Click "Show more" and verify that "Show less" is now visible
    cy.findByText('Show more').click();
    cy.findByText('Show less').should('exist');
    cy.findByText('Show more').should('not.exist');

    // Click "Show less" and verify that "Show more" is now visible
    cy.findByText('Show less').click();
    cy.findByText('Show less').should('not.exist');
    cy.findByText('Show more').should('exist');
  });

  it('Clicking the “DISCLAIMER” button displays the disclaimer popup', () => {
    const text = /^The condition of a waterbody is dynamic and can change/;

    // verify opening the disclaimer
    cy.findByText('Disclaimer').click();
    cy.findByText(text).should('exist');

    // verify closing the disclaimer
    cy.findByTitle('Close disclaimer').click();
    cy.findByText(text).should('not.exist');
  });

  it('Clicking the “More Information for <state name>” link opens a new tab for the state', () => {
    const linkText = 'Florida DEP Home Page';

    cy.findByText('More Information for').click();

    // since Cypress doesn't support multiple tabs, we'll do the next best thing
    // (https://docs.cypress.io/guides/references/trade-offs.html#Multiple-tabs)
    cy.findByText(linkText).should(
      'have.attr',
      'href',
      `https://floridadep.gov`,
    );
    cy.findByText(linkText).should('have.attr', 'target', '_blank');
    cy.findByText(linkText).should('have.attr', 'rel', 'noopener noreferrer');
  });

  it('Clicking the “EXIT” link opens a new tab with https://www.epa.gov/home/exit-epa', () => {
    const linkText = 'EXIT';

    cy.waitForLoadFinish();

    cy.findByText('More Information for').click();

    // since Cypress doesn't support multiple tabs, we'll do the next best thing
    // (https://docs.cypress.io/guides/references/trade-offs.html#Multiple-tabs)
    cy.findAllByText(linkText).should(
      'have.attr',
      'href',
      'https://www.epa.gov/home/exit-epa',
    );
    cy.findAllByText(linkText).should('have.attr', 'target', '_blank');
    cy.findAllByText(linkText).should(
      'have.attr',
      'rel',
      'noopener noreferrer',
    );
  });
});

describe('State page routes', () => {
  it('Select a state and click “Go” routes to the state water quality overview page for the state abbreviation', () => {
    cy.visit('/state-and-tribal');

    cy.get('#hmw-state-select').click();
    cy.findByText('Florida').click();
    cy.findByText('Go').click();

    cy.url().should('include', 'state/FL/water-quality-overview');
  });

  it('Directly navigating to a state with a non-existent state abbreviation, navigates back to the state page', () => {
    cy.visit('/state/ZZ');

    cy.url().should('equal', `${window.location.origin}/state-and-tribal`);
  });

  it('Switching state page tabs updates route', () => {
    cy.visit('/state/FL/water-quality-overview');

    cy.url().should('include', 'state/FL/water-quality-overview');

    cy.findByText('Advanced Search').click();
    cy.url().should('include', 'state/FL/advanced-search');

    cy.findByText('State Water Quality Overview').click();
    cy.url().should('include', 'state/FL/water-quality-overview');
  });

  it('Navigate to the state page with a <script> tag in the route', () => {
    cy.visit('/state/%3Cscript%3Evar%20j%20=%201;%3C/script%3E');

    cy.findByText(
      'States and Tribes Play a Primary Role in Protecting Water Quality',
    ).should('exist');

    cy.url().should('include', `${window.location.origin}/state`);
  });

  it('Test the metrics section', () => {
    // test state with metrics data
    cy.visit('/state/AK/water-quality-overview');
    cy.findAllByText((_content, element) => {
      return element.textContent.includes('Alaska by the Numbers');
    });

    // test state without metrics data
    cy.visit('/state/AS/water-quality-overview');
    cy.findAllByText((_content, element) => {
      return element.textContent.includes('American Samoa by the Numbers');
    }).should('not.exist');

    // test page when metrics service fails
    cy.intercept('https://api.epa.gov/attains/metrics?organizationId=AKDECWQ', {
      statusCode: 500,
      body: {},
    }).as('attains-metrics');
    cy.visit('/state/AK/water-quality-overview');
    cy.findByText(
      'State information is temporarily unavailable, please try again later.',
    );
    cy.findAllByText(
      'State survey information is temporarily unavailable, please try again later.',
    );
  });

  it('Reroute to state-and-tribal page if state or tribe not provided in the url', () => {
    cy.visit('/state');
    cy.url().should('include', 'state-and-tribal');

    cy.visit('/tribe');
    cy.url().should('include', 'state-and-tribal');
  });
});

describe('State page Water Quality Overview sub tabs', () => {
  beforeEach(() => {
    cy.visit('/state/FL/water-quality-overview');

    // verify the water quality overview content loaded prior to other tests
    cy.findByText('Water Quality', { timeout: 20000 }).should('exist');
    cy.findByTestId('hmw-ecological-tab-button').click();

    cy.waitForLoadFinish({ timeout: 20000 });
  });

  const fishAdvisoryTestId = 'hmw-fish-advisory-section';
  const location = window.location;
  const origin =
    location.hostname === 'localhost'
      ? `${location.protocol}//${location.hostname}:3002`
      : window.location.origin;

  it('Navigating to a sub-tab selection that has no data results in “Water Type” dropdown saying “No Available Water Types” and the “Use” dropdown saying “No Available Uses”', () => {
    const noWaterTypes = 'No Available Water Types';
    const noUses = 'No Available Uses';

    // verify a tab with data
    cy.findByTestId('hmw-swimming-tab-button').click();
    cy.findByTestId('hmw-swimming-tab-panel')
      .contains(noWaterTypes)
      .should('not.exist');
    cy.findByTestId('hmw-swimming-tab-panel')
      .contains(noUses)
      .should('not.exist');

    // verify a tab without data
    cy.findByTestId('hmw-other-tab-button').click();
    cy.findByTestId('hmw-other-tab-panel').contains(noWaterTypes);
    cy.findByTestId('hmw-other-tab-panel').contains(noUses);
  });

  it('Navigating to a sub-tab selection shows correct charts', () => {
    const surveyResultsText =
      'State statistical surveys provide an overall picture';
    const siteSpecificText = 'Targeted monitoring provides information';

    // Florida > Aquatic Life > Coastal Waters
    // verify the pie chart is not there and the bar chart is

    cy.findByTestId('hmw-ecological-tab-panel')
      .contains(surveyResultsText)
      .should('not.exist');
    cy.findByTestId('hmw-ecological-tab-panel')
      .contains(siteSpecificText)
      .should('exist');

    // Florida > Aquatic Life > Rivers and Streams > Fish and Wildlife Propagation
    // select a dropdown item that has the pie chart
    cy.get('#water-type-ecological').click();
    cy.findByText('Rivers and Streams').click();

    // verify the pie chart is not there and the bar chart is
    cy.findByTestId('hmw-ecological-tab-panel')
      .contains(surveyResultsText)
      .should('exist');
    cy.findByTestId('hmw-ecological-tab-panel')
      .contains(siteSpecificText)
      .should('exist');
  });

  it('Eating Fish sub-tab selection fish advisory link shown', () => {
    // intercept config files and inject fish advisory link
    cy.intercept(`${origin}/api/configFiles`, (req) => {
      req.continue((res) => {
        console.log('res: ', res);
        res.body.statePage.fishAdvisory =
          '<h3 style="display: inline-block; font-size: 1.375em; font-weight: normal;">Fish consumption advisories for <a href="http://www.oehha.ca.gov/fish.html" target="_blank" rel="noopener noreferrer">California</a>.</h3> <a class="exit-disclaimer" href="https://www.epa.gov/home/exit-epa" target="_blank" rel="noopener noreferrer">EXIT</a>';
      });
    }).as('fish-link');

    cy.visit(`/state/CA/water-quality-overview`);
    cy.waitForLoadFinish();

    // go to fishing tab
    cy.findByTestId('hmw-fishing-tab-button').click();

    cy.findAllByTestId(fishAdvisoryTestId)
      .filter(':visible')
      .findByText('Fish consumption advisories for', { exact: false })
      .should('be.visible');

    // check the injected link
    cy.findAllByTestId(fishAdvisoryTestId)
      .filter(':visible')
      .findByText('California')
      .should('be.visible')
      .should('have.attr', 'href', 'http://www.oehha.ca.gov/fish.html')
      .should('have.attr', 'target', '_blank')
      .should('have.attr', 'rel', 'noopener noreferrer');

    // check the injected exit disclaimer
    cy.findAllByTestId(fishAdvisoryTestId)
      .filter(':visible')
      .findByText('EXIT')
      .should('be.visible')
      .should('have.attr', 'href', 'https://www.epa.gov/home/exit-epa')
      .should('have.attr', 'target', '_blank')
      .should('have.attr', 'rel', 'noopener noreferrer');
  });

  it('Eating Fish sub-tab selection no fish advisory link', () => {
    // intercept config files and remove any fish advisory link
    cy.intercept(`${origin}/api/configFiles`, (req) => {
      req.continue((res) => {
        res.body.statePage.fishAdvisory = '';
      });
    }).as('fish-link');

    cy.visit(`/state/CA/water-quality-overview`);
    cy.waitForLoadFinish();

    // go to fishing tab
    cy.findByTestId('hmw-fishing-tab-button').click();

    cy.findAllByTestId(fishAdvisoryTestId).should('be.empty');
  });
});

describe('State page Water Overview tab', () => {
  beforeEach(() => {
    cy.visit('/state/AZ/water-quality-overview');
  });

  const title = 'Arizona Documents';
  const text = 'Documents Related to Integrated Report';

  it(`Display "Drinking Water Information" when water sub-tab clicked on`, () => {
    cy.findByText('Drinking Water').click();
    cy.findAllByText(/Drinking Water Information for/)
      .filter(':visible')
      .should('exist');
  });

  it(`Clicking "Expand All/Collapse All" expands/collapses the state documents and state water stories menu`, () => {
    const documentsText = 'Documents Related to Integrated Report';
    const waterText = '2026 Clean Water Act Assessment (PDF)';

    cy.waitForLoadFinish();

    cy.findAllByText('Expand All').filter(':visible');
    cy.findByText(documentsText).should('not.exist');
    cy.findByText(waterText).should('not.exist');

    cy.findByText('Expand All').click();
    cy.findAllByText(documentsText).should('be.visible');
    cy.findAllByText(waterText).should('be.visible');

    cy.findByText('Collapse All').click();
    cy.findByText(documentsText).should('not.exist');
    cy.findByText(waterText).should('not.exist');
  });

  it(`Clicking "<state name> Documents" opens the documents content`, () => {
    const firstTableLinkText = '2026 Clean Water Act Assessment (PDF)';
    const secondTableLinkText =
      'An Assessment of Arizona’s Intermittent Streams (PDF)';

    // verify text is not visible
    cy.findByText(text).should('not.exist');

    // open accordion and check text is visible
    cy.get('.hmw-accordion').contains(title).click();
    cy.findByText(text).should('be.visible');

    // check for links in first table
    cy.findByText(firstTableLinkText).should(
      'have.attr',
      'href',
      'https://api.epa.gov/attains/documents/cycles/20165/227722',
    );
    cy.findByText(firstTableLinkText).should('have.attr', 'target', '_blank');
    cy.findByText(firstTableLinkText).should(
      'have.attr',
      'rel',
      'noopener noreferrer',
    );

    // check for links in second table
    cy.findByText(secondTableLinkText).should(
      'have.attr',
      'href',
      'http://static.azdeq.gov/wqd/reports/int_streams_2018.pdf',
    );
    cy.findByText(secondTableLinkText).should('have.attr', 'target', '_blank');
    cy.findByText(secondTableLinkText).should(
      'have.attr',
      'rel',
      'noopener noreferrer',
    );

    // close accordion and verify text is not visible
    cy.get('.hmw-accordion').contains(title).click();
    cy.findByText(text).should('not.exist');
  });

  it(`Check for "no documents" message in the documents content`, () => {
    cy.visit('/state/AL/water-quality-overview');

    // verify text is not visible
    cy.findByText(text).should('not.exist');

    // open accordion and check text is visible
    cy.get('.hmw-accordion').contains('Alabama Documents').click();
    cy.findByText(text).should('be.visible');

    cy.findByText(
      'No statewide statistical survey documents available for this state.',
    );
  });

  it(`Clicking "<state name> Water Stories" opens the water stories content.`, () => {
    const title = 'Arizona Water Stories';
    const text1 =
      'Implementing Septic and Cesspool Upgrade Projects Reduces Total Nitrogen Levels in Tonto Creek (PDF)';
    const text2 =
      'Fish Return to Boulder Creek After Legacy Mine Remediation (PDF)';

    // verify text is not visible
    cy.findByText(text1).should('not.exist');

    // open accordion and check text is visible
    cy.get('.hmw-accordion').contains(title).click();
    cy.findByText(text1).should('be.visible');

    cy.findByRole('button', { name: 'View Less Stories' }).should('not.exist');
    cy.findByRole('button', { name: 'View More Stories' }).click();

    // verify more items are shown
    cy.findByText(text2);
    cy.findByRole('button', { name: 'View Less Stories' }).should('be.visible');
    cy.findByRole('button', { name: 'View More Stories' }).should('be.visible');

    // click view less stories and verify items are hidden
    cy.findByRole('button', { name: 'View Less Stories' }).click();
    cy.findByText(text2).should('not.exist');
    cy.findByRole('button', { name: 'View Less Stories' }).should('not.exist');
    cy.findByRole('button', { name: 'View More Stories' }).should('be.visible');

    // close accordion and verify text is not visible
    cy.get('.hmw-accordion').contains(title).click();
    cy.findByText(text1).should('not.exist');
  });
});

describe('State page Advanced Search tab', () => {
  it('Displays search results in a virtualized list', () => {
    cy.visit('/state/AZ/advanced-search');

    cy.waitForLoadFinish();

    cy.findAllByRole('button', { name: 'Search' }).last().click();
    cy.findByRole('button', { name: 'Continue' }).click();

    cy.findByRole('button', { name: 'List' }).click();

    // wait for the waterbody list to load
    cy.waitForLoadFinish();

    cy.findByRole('button', { name: 'Alamo Lake' }).should('exist');

    cy.scrollTo('bottom', { duration: 3000 });

    cy.findByRole('button', { name: 'Alamo Lake' }).should('not.exist');
  });

  it('Advanced search filters', () => {
    cy.visit('/state/HI/advanced-search');

    // select parameter group filter
    cy.findByRole('combobox', { name: 'Parameter Groups' }).click({
      force: true,
    });
    cy.findAllByText('Loading...').should('not.exist');
    cy.findByRole('option', { name: 'Algae' }).click();

    // select use group filter
    cy.findByRole('combobox', { name: 'Use Groups' }).click({ force: true });
    cy.findByRole('option', { name: 'Swimming and Boating' }).click();

    // select watershed filter
    cy.findByRole('combobox', { name: 'Watershed Names (HUC12)' }).type(
      '200700000103',
    );
    cy.findByText('Hanalei River-Frontal Pacific Ocean (200700000103)').click({
      force: true,
    });

    // select waterbody filter
    cy.findByRole('combobox', { name: 'Waterbody Names (IDs):' }).type(
      'HI385259',
    );
    cy.findByText('Hanalei River (HI385259)').click({ force: true });

    // select IR cat filter
    cy.findByRole('radio', {
      name: '303(d) Listed Impaired Waters (Category 5)',
    }).click();

    // select tmdl filter
    cy.findByRole('checkbox', { name: 'Has TMDL' }).click();

    // click search
    cy.findAllByRole('button', { name: 'Search' }).last().click();
    cy.findByRole('button', { name: 'Continue' }).click();

    // verify Hanalei River is found
    cy.findByRole('button', { name: 'List' }).click();
    cy.waitForLoadFinish();
    cy.findByText('State Waterbody ID: HI385259');

    // maybe?? check if items are in map display menus
  });
});

describe('State page service failure tests', () => {
  it(`Documents fail to load due to attains assessments service failure`, () => {
    // test documents failure to load
    cy.intercept(
      {
        hostname: 'api.epa.gov',
        pathname: '/attains/assessments',
        // reportingCycle is left off so it matches whichever cycle is current
        query: {
          organizationId: 'AKDECWQ',
          excludeAssessments: 'Y',
        },
      },
      {
        statusCode: 500,
        body: {},
      },
    ).as('attains-assessments');
    cy.visit('/state/AK/water-quality-overview');

    cy.waitForLoadFinish();
    cy.wait('@attains-assessments');

    cy.get('.hmw-accordion').contains('Alaska Documents').click();
    cy.findByText(
      'Alaska integrated report documents are temporarily unavailable, please try again later.',
    );
  });

  it('Failure to get max record count', () => {
    cy.intercept(
      'https://services.arcgis.com/cJ9YHowT8TU7DUyn/ArcGIS/rest/services/Hydrologic_Units_F3/FeatureServer/6?f=json&onlocalhost=1',
      {
        statusCode: 500,
        body: {},
      },
    ).as('attains-gis-service');

    cy.visit('/state/AZ/advanced-search');
    cy.findByText(
      'State information is temporarily unavailable, please try again later.',
    );
  });

  it('Failure to get summary info', () => {
    cy.intercept(
      {
        hostname: 'services.arcgis.com',
        pathname:
          '/cJ9YHowT8TU7DUyn/arcgis/rest/services/ATTAINS_Assessment/FeatureServer/4/query',
      },
      {
        statusCode: 500,
        body: {},
      },
    ).as('attains-gis-service');

    cy.visit('/state/AL/advanced-search');
    cy.findAllByText(
      'State information is temporarily unavailable, please try again later.',
    );
  });

  it('UsesStateSummary service failure', () => {
    cy.intercept(
      {
        hostname: 'api.epa.gov',
        pathname: '/attains/usesStateSummary',
        query: { organizationId: 'AKDECWQ' },
      },
      {
        statusCode: 500,
        body: {},
      },
    );
    cy.visit('/state/AK/water-quality-overview');

    cy.findByText(
      'State-level assessment data for Alaska is temporarily unavailable, please try again later.',
    );
  });

  it('Surveys service failure', () => {
    cy.intercept('https://api.epa.gov/attains/surveys?organizationId=AKDECWQ', {
      statusCode: 500,
      body: {},
    });
    cy.visit('/state/AK/water-quality-overview');

    cy.findAllByText(
      'State survey information is temporarily unavailable, please try again later.',
    );
  });

  it('Organizations service failure', () => {
    cy.intercept('https://api.epa.gov/attains/states/AK/organizations', {
      statusCode: 500,
      body: {},
    });
    cy.visit('/state/AK/water-quality-overview');

    cy.findAllByText(
      'State information is temporarily unavailable, please try again later.',
    );
  });

  it('Organizations no data for state', () => {
    cy.intercept('https://api.epa.gov/attains/states/AK/organizations', {
      statusCode: 200,
      body: {
        data: [],
        messages: [],
      },
    });
    cy.visit('/state/AK/water-quality-overview');

    cy.findAllByText('No data available for Alaska.');
  });

  it('GRTS Stories service failure', () => {
    cy.intercept(
      'https://ordspub.epa.gov/ords/grts_rest/grts_rest_apex/ss/GetSSByState/AK',
      {
        statusCode: 500,
        body: {},
      },
    );
    cy.visit('/state/AK/water-quality-overview');

    cy.get('.hmw-accordion').contains('Alaska Water Stories').click();
    cy.findAllByText(
      'State water stories are temporarily unavailable, please try again later.',
    );
  });
});
