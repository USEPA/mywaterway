describe('State page links', () => {
  beforeEach(() => {
    cy.visit('/state/FL');
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
    const linkText = 'More Information for Florida';

    // since Cypress doesn't support multiple tabs, we'll do the next best thing
    // (https://docs.cypress.io/guides/references/trade-offs.html#Multiple-tabs)
    cy.findByText(linkText).should(
      'have.attr',
      'href',
      'https://floridadep.gov/',
    );
    cy.findByText(linkText).should('have.attr', 'target', '_blank');
    cy.findByText(linkText).should('have.attr', 'rel', 'noopener noreferrer');
  });

  it('Clicking the “EXIT” link opens a new tab with https://www.epa.gov/home/exit-epa', () => {
    const linkText = 'EXIT';

    // since Cypress doesn't support multiple tabs, we'll do the next best thing
    // (https://docs.cypress.io/guides/references/trade-offs.html#Multiple-tabs)
    cy.findByText(linkText).should(
      'have.attr',
      'href',
      'https://www.epa.gov/home/exit-epa',
    );
    cy.findByText(linkText).should('have.attr', 'target', '_blank');
    cy.findByText(linkText).should('have.attr', 'rel', 'noopener noreferrer');
  });
});

describe('State page routes', () => {
  it('Select a state and click “Go” routes to the state water quality overview page for the state abbreviation', () => {
    cy.visit('/state');

    cy.get('#hmw-state-select').click();
    cy.findByText('Florida').click();
    cy.findByText('Go').click();

    cy.url().should('include', 'state/FL/water-quality-overview');
  });

  it('Directly navigating to a state with a non-existent state abbreviation, navigates back to the state page', () => {
    cy.visit('/state/ZZ');

    cy.url().should('equal', `${document.location.origin}/state`);
  });

  it('Switching state page tabs updates route', () => {
    cy.visit('/state/FL');

    cy.url().should('include', 'state/FL/water-quality-overview');

    cy.findByText('Advanced Search').click();
    cy.url().should('include', 'state/FL/advanced-search');

    cy.findByText('State Water Quality Overview').click();
    cy.url().should('include', 'state/FL/water-quality-overview');
  });

  it('Navigate to the state page with a <script> tag in the route', () => {
    cy.visit('/state/%3Cscript%3Evar%20j%20=%201;%3C/script%3E');

    cy.findByText('Sorry, but the url entered was invalid.').should('exist');

    cy.url().should('include', `${document.location.origin}/invalid-url`);
  });
});

describe('State page Water Quality Overview sub tabs', () => {
  beforeEach(() => {
    cy.visit('/state/FL/water-quality-overview');

    // verify the water quality overview content loaded prior to other tests
    cy.findByText('Water Quality', { timeout: 20000 }).should('exist');
    cy.findByTestId('hmw-ecological-tab-button').click();

    // wait for the all web services to finish (surveys is usually slow here)
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 20000 }).should(
      'not.exist',
    );
  });

  it('Navigating to a sub-tab selection that has no data results in “Water Type” dropdown saying “No Available Water Types” and the “Use” dropdown saying “No Available Uses”', () => {
    const noWaterTypes = 'No Available Water Types';
    const noUses = 'No Available Uses';

    // verify a tab without data
    cy.findByTestId('hmw-swimming-tab-button').click();
    cy.findByTestId('hmw-swimming-tab-panel').contains(noWaterTypes);
    cy.findByTestId('hmw-swimming-tab-panel').contains(noUses);

    // verify a tab with data
    cy.findByTestId('hmw-fishing-tab-button').click();
    cy.findByTestId('hmw-fishing-tab-panel')
      .contains(noWaterTypes)
      .should('not.exist');
    cy.findByTestId('hmw-fishing-tab-panel')
      .contains(noUses)
      .should('not.exist');
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

    // Florida > Aquatic Life > Rivers and Streams
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
});

describe('State page Water Overview tab', () => {
  beforeEach(() => {
    cy.visit('/state/AK/water-quality-overview');
  });

  it(`Display "Drinking Water Information" when water sub-tab clicked on`, () => {
    cy.findByText('Drinking Water').click();
    cy.findAllByText(/Drinking Water Information for/)
      .filter(':visible')
      .should('exist');
  });

  it(`Clicking "Expand All/Collapse All" expands/collapses the state documents and state water stories menu`, () => {
    const documentsText = 'Documents Related to Integrated Report';
    const waterText =
      'Upgrading Boat Motors Reduces Hydrocarbon Pollution in Kenai River (PDF)';

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
    const title = 'Alaska Documents';
    const text = 'Documents Related to Integrated Report';

    // verify text is not visible
    cy.findByText(text).should('not.be.visible');

    // open accordion and check text is visible
    cy.get('.hmw-accordion').contains(title).click();
    cy.findByText(text).should('be.visible');

    // close accordion and verify text is not visible
    cy.get('.hmw-accordion').contains(title).click();
    cy.findByText(text).should('not.be.visible');
  });

  it(`Clicking "<state name> Water Stories" opens the water stories content.`, () => {
    const title = 'Alaska Water Stories';
    const text =
      'Upgrading Boat Motors Reduces Hydrocarbon Pollution in Kenai River (PDF)';

    // verify text is not visible
    cy.findByText(text).should('not.be.visible');

    // open accordion and check text is visible
    cy.get('.hmw-accordion').contains(title).click();
    cy.findByText(text).should('be.visible');

    // close accordion and verify text is not visible
    cy.get('.hmw-accordion').contains(title).click();
    cy.findByText(text).should('not.be.visible');
  });
});
