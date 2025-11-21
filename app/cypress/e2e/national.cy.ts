describe('National Water Quality tab', () => {
  beforeEach(() => {
    cy.visit('/national');
  });

  it('Switching the sub-tabs updates the content within the container', () => {
    const riversAndStreamsText =
      /of our rivers and streams are in good condition for biological communities/;
    const coastsText =
      /of Great Lakes nearshore waters are healthy based on their biological communities./;

    // verify Rivers and Streams tab content is displayed and Coasts tab content is hidden
    cy.findByText(riversAndStreamsText).should('be.visible');
    cy.findByText(coastsText).should('not.be.visible');

    cy.findByTestId('hmw-national-coastal-tab').click();

    // verify Rivers and Streams tab content is hidden and Coasts tab content is displayed
    cy.findByText(riversAndStreamsText).should('not.be.visible');
    cy.findByText(coastsText).should('be.visible');
  });

  it('Clicking the “DISCLAIMER” button displays the disclaimer popup', () => {
    const text = /^EPA has posted information through this/;

    // verify opening the disclaimer
    cy.findByText('Disclaimer').click();
    cy.findByText(text).should('exist');

    // verify closing the disclaimer
    cy.findByTitle('Close disclaimer').click();
    cy.findByText(text).should('not.exist');
  });

  it('From one of the sub-tabs, clicking “Expand All/Collapse All” expands/collapses the content', () => {
    const text =
      /of river and stream miles had healthy biological communities based on fish abundance/;

    // verify that accordion is initially collapsed
    cy.findAllByText('Expand All').filter(':visible');
    cy.findByText(text).should('not.exist');
    // click button, and verify that accordion is expanded
    cy.findAllByText('Expand All')
      .filter(':visible')
      .click()
      .contains('Collapse All');
    cy.findByText(text).should('be.visible');
    // click button again, and verify that accordion is collapsed
    cy.findByText('Collapse All').click();
    cy.findByText(text).should('not.exist');
  });

  it('Clicking the "Excess Nutrients in Waterways" link opens a new tab', () => {
    // since Cypress doesn't support multiple tabs, we'll do the next best thing
    // (https://docs.cypress.io/guides/references/trade-offs.html#Multiple-tabs)
    cy.findByText(/Excess Nutrients in Waterways/)
      .should('have.attr', 'href', 'https://www.epa.gov/nutrientpollution')
      .should('have.attr', 'target', '_blank')
      .should('have.attr', 'rel', 'noopener noreferrer');
  });

  it('Clicking the “Learn more about what EPA is doing to reduce excess nutrients in waterways” link opens a new tab.', () => {
    // since Cypress doesn't support multiple tabs, we'll do the next best thing
    // (https://docs.cypress.io/guides/references/trade-offs.html#Multiple-tabs)
    cy.findByText(
      /Learn more about what EPA is doing to reduce excess nutrients in waterways/,
    )
      .should(
        'have.attr',
        'href',
        'https://www.epa.gov/nutrient-policy-data/what-epa-doing-reduce-nutrient-pollution',
      )
      .should('have.attr', 'target', '_blank')
      .should('have.attr', 'rel', 'noopener noreferrer');
  });

  it('Clicking on of the images in the “Learn more about water types” section opens a new tab.', () => {
    // since Cypress doesn't support multiple tabs, we'll do the next best thing
    // (https://docs.cypress.io/guides/references/trade-offs.html#Multiple-tabs)
    cy.findByAltText(/Learn more about Rivers & Streams/)
      .parent()
      .parent()
      .should(
        'have.attr',
        'href',
        'https://www.epa.gov/national-aquatic-resource-surveys/nrsa',
      )
      .should('have.attr', 'target', '_blank')
      .should('have.attr', 'rel', 'noopener noreferrer');
  });

  it('Failure to load NARS data', () => {
    // empty out the NARS data from the configFiles service and
    // have configFiles return bare minimum for app to load
    cy.intercept('http://localhost:3002/api/configFiles', {
      statusCode: 200,
      body: {
        disclaimers: {
          national: {
            content: '',
          },
        },
        services: {
          waterbodyService: {},
          dwmaps: {},
          googleAnalyticsMapping: [],
        },
        NARS: [],
      },
    }).as('hmw-configFiles');

    cy.visit('/national');

    cy.findByText(
      'The National Aquatic Resource Surveys (NARS) data is currently unavailable, please try again later.',
    );
  });
});

describe('National Drinking Water tab', () => {
  beforeEach(() => {
    cy.visit('/national');
    cy.findByTestId('hmw-national-drinking-water-tab').click();
  });

  it('Clicking the "National Drinking Water" tab changes the tab and does not update the Url', () => {
    // verify National Drinking Water tab title is displayed
    cy.findByText('Explore National Drinking Water Information').should(
      'be.visible',
    );

    // verify Url stayed the same
    cy.url().should('equal', `${window.location.origin}/national`);
  });

  it('The US Drinking Water Systems By Type pie chart is displayed', () => {
    cy.findAllByText(/US Drinking Water Systems By Type/).should('be.visible');
  });

  it('The National Drinking Water table is displayed', () => {
    cy.findByText('Submission Year Quarter', { timeout: 20000 }).should(
      'be.visible',
    );
  });

  it('Clicking the “Consumer Confidence Report (CCR)” link opens a new tab.', () => {
    // since Cypress doesn't support multiple tabs, we'll do the next best thing
    // (https://docs.cypress.io/guides/references/trade-offs.html#Multiple-tabs)

    cy.findByText('Consumer Confidence Report (CCR)')
      .should('have.attr', 'href', 'https://www.epa.gov/ccr')
      .should('have.attr', 'target', '_blank')
      .should('have.attr', 'rel', 'noopener noreferrer');
  });

  it('Clicking a Glossary Term opens the Glossary panel', () => {
    cy.findAllByText(/Drinking Water Health-based Violations/)
      .filter(':visible')
      .click();
    cy.findByText(/Violations of maximum contaminant levels/).should(
      'be.visible',
    );
  });
});

describe('National Drinking Water tab service failures', () => {
  it('GPRA GetGPRASystemCountsByType service failure', () => {
    cy.intercept(
      'https://sdwis.epa.gov/ords/sfdw_rest/sfdw_rest/sfdw_rest/GetGPRASystemCountsByType/National',
      {
        statusCode: 500,
        body: {},
      },
    );

    cy.visit('/national');
    cy.findByTestId('hmw-national-drinking-water-tab').click();

    cy.findByText(
      'The EPA Drinking Water Performance and Results information is temporarily unavailable, please try again later.',
    );
  });

  it('GPRA GetGPRASummary service failure', () => {
    cy.intercept(
      'https://sdwis.epa.gov/ords/sfdw_rest/sfdw_rest/sfdw_rest/GetGPRASummary/National',
      {
        statusCode: 500,
        body: {},
      },
    );

    cy.visit('/national');
    cy.findByTestId('hmw-national-drinking-water-tab').click();

    cy.findByText(
      'The EPA Drinking Water Performance and Results information is temporarily unavailable, please try again later.',
    );
  });
});
