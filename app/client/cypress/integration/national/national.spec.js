describe('State Links', () => {
  beforeEach(() => {
    cy.visit('/national');
  });

  it('Clicking the “DISCLAIMER” button displays the disclaimer popup', () => {
    // verify opening the disclaimer
    cy.findByText('Disclaimer').click();
    cy.findByText('EPA has posted information through this', {
      exact: false,
    }).should('exist');

    // verify closing the disclaimer
    cy.findByTitle('Close disclaimer').click();
    cy.findByText('EPA has posted information through this', {
      exact: false,
    }).should('not.exist');
  });

  it('Clicking the "National Drinking Water" tab changes the tab and does not update the Url', () => {
    // verify tab changed correctly
    cy.findByTestId('hmw-national-drinking-water-tab').click();

    // verify National Drinking Water tab title is displayed
    cy.findByTestId('hmw-national-drinking-water-tab')
      .findByText('Explore National Drinking Water Information')
      .should('be.visible');

    // verify Url stayed the same
    cy.url().should('equal', `${document.location.origin}/national`);
  });

  it('Switching the sub-tabs updates the content within the container', () => {
    // verify switching to coasts tab changes the content
    cy.findByTestId('hmw-national-drinking-water-tab').click();

    cy.findByTestId('hmw-national-drinking-water-tab')
      .findByText('of our coasts are healthy based on biological communities')
      .should('exist');

    // verify first tab contents are hidden
    cy.findByTestId('hmw-national-water-conditions-tab')
      .findByText(
        'of our rivers and streams are healthy based on biological communities',
      )
      .should('not.be.visible');
  });

  it('From one of the sub-tabs, clicking “Expand All/Collapse All” expands/collapses the content', () => {
    // verify that only "Expand All" is visible
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

    cy.findByText('Biological condition tells us how healthy a waterbody is.', {
      exact: false,
    })
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
    cy.findByText('Biological condition tells us how healthy a waterbody is', {
      exact: false,
    }).should('not.exist');
  });

  it('Clicking the Nutrient Pollution link opens a new tab', () => {
    // cypress does not allow opening links for an external domain
    // so we are just going to verify the anchor props
    cy.get('a[href*="https://www.epa.gov/nutrientpollution"]').should('exist');

    cy.get('a[href*="https://www.epa.gov/nutrientpollution"]')
      .invoke('attr', 'rel')
      // had an issue where Cypress was only parsing the first part of 'noopener noreferrer' so I switched this to 'contains'
      .should('contain', 'noopener', { exact: false });

    cy.get('a[href*="https://www.epa.gov/nutrientpollution"]')
      .invoke('attr', 'target')
      .should('contain', '_blank', { exact: false });
  });

  it('Clicking the “Learn more about what EPA is doing to reduce nutrient pollution” link opens a new tab.', () => {
    // cypress does not allow opening links for an external domain
    // so we are just going to verify the anchor props
    cy.get(
      'a[href*="https://www.epa.gov/nutrient-policy-data/what-epa-doing-reduce-nutrient-pollution"]',
    ).should('exist');

    cy.get(
      'a[href*="https://www.epa.gov/nutrient-policy-data/what-epa-doing-reduce-nutrient-pollution"]',
    )
      .invoke('attr', 'target')
      .should('equal', '_blank', { exact: false });

    cy.get(
      'a[href*="https://www.epa.gov/nutrient-policy-data/what-epa-doing-reduce-nutrient-pollution"]',
    )
      .invoke('attr', 'rel')
      .should('equal', 'noopener noreferrer', { exact: false });
  });

  it('Clicking on of the images in the “Learn more about water types” section opens a new tab.', () => {
    // cypress does not allow opening links for an external domain
    // so we are just going to verify the anchor props
    cy.get(
      'a[href*="https://www.epa.gov/national-aquatic-resource-surveys/national-rivers-and-streams-assessment-2008-2009-results"]',
    ).should('exist');

    cy.get(
      'a[href*="https://www.epa.gov/national-aquatic-resource-surveys/national-rivers-and-streams-assessment-2008-2009-results"]',
    )
      .invoke('attr', 'target')
      .should('equal', '_blank', { exact: false });

    cy.get(
      'a[href*="https://www.epa.gov/national-aquatic-resource-surveys/national-rivers-and-streams-assessment-2008-2009-results"]',
    )
      .invoke('attr', 'rel')
      .should('equal', 'noopener noreferrer', { exact: false });
  });

  it('Clicking the “Consumer Confidence Report (CCR)” link opens a new tab.', () => {
    // cypress does not allow opening links for an external domain
    // so we are just going to verify the anchor props
    cy.get('a[href*="https://www.epa.gov/ccr"]').should('exist');

    cy.get('a[href*="https://www.epa.gov/ccr"]')
      .invoke('attr', 'target')
      .should('equal', '_blank', { exact: false });

    cy.get('a[href*="https://www.epa.gov/ccr"]')
      .invoke('attr', 'rel')
      .should('equal', 'noopener noreferrer', { exact: false });
  });

  it('The US Drinking Water Systems By Type pie chart is displayed', () => {
    cy.findByTestId('hmw-national-drinking-water-tab').click();
    cy.get('.highcharts-background').should('be.visible');
  });

  it('The National Drinking Water table is displayed', () => {
    cy.findByTestId('hmw-national-drinking-water-tab').click();
    cy.findByTestId('hmw-national-drinking-water-table', { timeout: 20000 })
      .should('exist')
      .and('be.visible');
    cy.findByText('Submission Year Quarter')
      .should('exist')
      .and('be.visible');
  });

  it('Clicking a Glossary Term opens the Glossary panel', () => {
    cy.findByTestId('hmw-national-drinking-water-tab').click();
    cy.get('span[data-term="Drinking Water Health-based Violations"]').click();
    cy.get('#glossary')
      .should('exist')
      .and('be.visible');
  });
});
