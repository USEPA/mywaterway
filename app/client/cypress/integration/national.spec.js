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
    cy.url().should('equal', `${document.location.origin}/national`);
  });

  it('Switching the sub-tabs updates the content within the container', () => {
    cy.findByText(
      'of our coasts are healthy based on biological communities',
    ).should('exist');

    // verify first tab contents are hidden
    cy.findByTestId('hmw-national-water-conditions-tab')
      .findByText(
        'of our rivers and streams are healthy based on biological communities',
      )
      .should('not.be.visible');
  });

  it('The US Drinking Water Systems By Type pie chart is displayed', () => {
    cy.findByText(/US Drinking Water Systems By Type/).should('be.visible');
  });

  it('The National Drinking Water table is displayed', () => {
    cy.findByText('Submission Year Quarter', { timeout: 20000 })
      .should('exist')
      .and('be.visible');
  });

  it('Clicking a Glossary Term opens the Glossary panel', () => {
    cy.get('span[data-term="Drinking Water Health-based Violations"]').click();
    cy.get('#glossary')
      .should('exist')
      .and('be.visible');
  });
});

describe('National Water Conditions tab', () => {
  beforeEach(() => {
    cy.visit('/national');
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
    // verify that only "Expand All" is visible

    const text = /^Biological condition tells us how healthy a waterbody is/;

    cy.findAllByTestId('hmw-expand-collapse')
      .filter(':visible')
      .contains('Collapse All')
      .should('not.exist');
    cy.findAllByTestId('hmw-expand-collapse')
      .filter(':visible')
      .contains('Expand All')
      .should('exist');

    // Click "Expand All" and verify that "Collapse All" is now visible
    cy.findAllByTestId('hmw-expand-collapse')
      .filter(':visible')
      .contains('Expand All')
      .click();
    cy.findAllByTestId('hmw-expand-collapse')
      .filter(':visible')
      .contains('Collapse All')
      .should('exist');
    cy.findAllByTestId('hmw-expand-collapse')
      .filter(':visible')
      .contains('Expand All')
      .should('not.exist');

    cy.findByText(text)
      .filter(':visible')
      .should('exist');

    // Click "Collapse All" and verify that "Expand All" is now visible and accordion text is hidden
    cy.findAllByTestId('hmw-expand-collapse')
      .filter(':visible')
      .contains('Collapse All')
      .click();
    cy.findAllByTestId('hmw-expand-collapse')
      .filter(':visible')
      .contains('Collapse All')
      .should('not.exist');
    cy.findAllByTestId('hmw-expand-collapse')
      .filter(':visible')
      .contains('Expand All')
      .should('exist');
    cy.findByText(text).should('not.exist');
  });

  it('Clicking the Nutrient Pollution link opens a new tab', () => {
    // since Cypress doesn't support multiple tabs, we'll do the next best thing
    // (https://docs.cypress.io/guides/references/trade-offs.html#Multiple-tabs)

    cy.get('a[href*="https://www.epa.gov/nutrientpollution"]')
      .filter(':visible')
      .should('have.attr', 'href', 'https://www.epa.gov/nutrientpollution');
    cy.get('a[href*="https://www.epa.gov/nutrientpollution"]')
      .filter(':visible')
      .should('have.attr', 'target', '_blank');
    cy.get('a[href*="https://www.epa.gov/nutrientpollution"]')
      .filter(':visible')
      .should('have.attr', 'rel', 'noopener noreferrer');
  });

  it('Clicking the “Learn more about what EPA is doing to reduce nutrient pollution” link opens a new tab.', () => {
    // since Cypress doesn't support multiple tabs, we'll do the next best thing
    // (https://docs.cypress.io/guides/references/trade-offs.html#Multiple-tabs)

    cy.findByText(
      /^Learn more about what EPA is doing to reduce nutrient pollution/,
    ).should(
      'have.attr',
      'href',
      'https://www.epa.gov/nutrient-policy-data/what-epa-doing-reduce-nutrient-pollution',
    );

    cy.findByText(
      /^Learn more about what EPA is doing to reduce nutrient pollution/,
    ).should('have.attr', 'target', '_blank');

    cy.findByText(
      /^Learn more about what EPA is doing to reduce nutrient pollution/,
    ).should('have.attr', 'rel', 'noopener noreferrer');
  });

  it('Clicking on of the images in the “Learn more about water types” section opens a new tab.', () => {
    // since Cypress doesn't support multiple tabs, we'll do the next best thing
    // (https://docs.cypress.io/guides/references/trade-offs.html#Multiple-tabs)

    cy.get(
      'a[href*="https://www.epa.gov/national-aquatic-resource-surveys/national-rivers-and-streams-assessment-2008-2009-results"]',
    ).should(
      'have.attr',
      'href',
      'https://www.epa.gov/national-aquatic-resource-surveys/national-rivers-and-streams-assessment-2008-2009-results',
    );
    cy.get(
      'a[href*="https://www.epa.gov/national-aquatic-resource-surveys/national-rivers-and-streams-assessment-2008-2009-results"]',
    ).should('have.attr', 'target', '_blank');
    cy.get(
      'a[href*="https://www.epa.gov/national-aquatic-resource-surveys/national-rivers-and-streams-assessment-2008-2009-results"]',
    ).should('have.attr', 'rel', 'noopener noreferrer');
  });

  it('Clicking the “Consumer Confidence Report (CCR)” link opens a new tab.', () => {
    // since Cypress doesn't support multiple tabs, we'll do the next best thing
    // (https://docs.cypress.io/guides/references/trade-offs.html#Multiple-tabs)

    cy.get('a[href*="https://www.epa.gov/ccr"]').should(
      'have.attr',
      'href',
      'https://www.epa.gov/ccr',
    );
    cy.get('a[href*="https://www.epa.gov/ccr"]').should(
      'have.attr',
      'target',
      '_blank',
    );
    cy.get('a[href*="https://www.epa.gov/ccr"]').should(
      'have.attr',
      'rel',
      'noopener noreferrer',
    );
  });
});
