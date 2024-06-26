describe('Tribe page links', () => {
  beforeEach(() => {
    cy.visit('/tribe/REDLAKE');
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
    cy.findAllByText('Disclaimer').filter(':visible').click();
    cy.findByText(text).should('exist');

    // verify closing the disclaimer
    cy.findByTitle('Close disclaimer').click();
    cy.findByText(text).should('not.exist');
  });

  it('Clicking the “More Information for <tribe name>” link opens a new tab for the tribe', () => {
    const linkText = 'Red Lake Nation';

    cy.findByText('More Information for').click();

    // since Cypress doesn't support multiple tabs, we'll do the next best thing
    // (https://docs.cypress.io/guides/references/trade-offs.html#Multiple-tabs)
    cy.findByText(linkText).should(
      'have.attr',
      'href',
      `https://www.redlakenation.org/`,
    );
    cy.findByText(linkText).should('have.attr', 'target', '_blank');
    cy.findByText(linkText).should('have.attr', 'rel', 'noopener noreferrer');
  });

  it('Clicking the “EXIT” link opens a new tab with https://www.epa.gov/home/exit-epa', () => {
    const linkText = 'EXIT';

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

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

describe('Tribe page routes', () => {
  it('Select a tribe and click “Go” routes to the tribe for the tribe organization id', () => {
    cy.visit('/state-and-tribal');

    cy.get('#hmw-state-select').click();
    cy.findByText('Red Lake Band of Chippewa Indians, Minnesota').click();
    cy.findByText('Go').click();

    cy.url().should('include', 'tribe/REDLAKE');
  });

  it('Directly navigating to a tribe with a non-existent tribe organizaion id, navigates back to the state-and-tribal page', () => {
    cy.visit('/tribe/ZZZ');

    cy.url().should('equal', `${window.location.origin}/state-and-tribal`);
  });

  it('Navigate to the tribe page with a <script> tag in the route', () => {
    cy.visit('/tribe/%3Cscript%3Evar%20j%20=%201;%3Cscript%3E');

    cy.findByText(
      'States and Tribes Play a Primary Role in Protecting Water Quality',
    ).should('exist');

    cy.url().should('include', `${window.location.origin}/state-and-tribal`);
  });
});

describe('Tribe page Water Quality Overview sub tabs', () => {
  beforeEach(() => {
    cy.visit('/tribe/REDLAKE');

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

    // verify a tab with data
    cy.findByTestId('hmw-swimming-tab-button').click();
    cy.findByTestId('hmw-swimming-tab-panel')
      .contains(noWaterTypes)
      .should('not.exist');
    cy.findByTestId('hmw-swimming-tab-panel')
      .contains(noUses)
      .should('not.exist');

    // verify a tab without data
    cy.findByTestId('hmw-fishing-tab-button').click();
    cy.findByTestId('hmw-fishing-tab-panel').contains(noWaterTypes);
    cy.findByTestId('hmw-fishing-tab-panel').contains(noUses);
  });

  it('Navigating to a sub-tab selection shows correct charts', () => {
    const siteSpecificText = 'Targeted monitoring provides information';

    // Red Lake > Aquatic Life > Coastal Waters
    // verify the pie chart is not there and the bar chart is
    cy.findByTestId('hmw-ecological-tab-panel')
      .contains(siteSpecificText)
      .should('exist');

    // Red Lake > Aquatic Life > Rivers and Streams > Fish and Wildlife Propagation
    // select a dropdown item that has the pie chart
    cy.get('#water-type-ecological').click();
    cy.findByText('Rivers and Streams').click();

    // verify the pie chart is not there and the bar chart is
    cy.findByTestId('hmw-ecological-tab-panel')
      .contains(siteSpecificText)
      .should('exist');
  });

  it('Clicking Map and List buttons show correct content', () => {
    // verify map is visible and the list view is hidden
    cy.findByTitle('Open Basemaps and Layers').should('be.visible');
    cy.findByText('Alaska Lake').should('not.exist');

    // click "List" tab
    cy.findByRole('button', { name: 'List' }).click();

    // verify the map is hidden and the list view is visible
    cy.findByTitle('Open Basemaps and Layers').should('not.exist');
    cy.findAllByText('Alaska Lake').should('be.visible');

    // click "Map" tab
    cy.findByRole('button', { name: 'Map' }).click();

    // verify map is visible and the list view is hidden
    cy.findByTitle('Open Basemaps and Layers').should('be.visible');
    cy.findByText('Alaska Lake').should('not.exist');
  });
});

describe('Tribe page Water Overview', () => {
  beforeEach(() => {
    cy.visit('/tribe/REDLAKE');
  });

  it(`Do not display "Drinking Water Information" when water sub-tab clicked on`, () => {
    cy.findByText('Drinking Water').click();
    cy.findAllByText(/Drinking Water Information for/).should('not.be.visible');
  });

  it(`Clicking "Expand All/Collapse All" expands/collapses the state documents menu`, () => {
    const documentsText = 'Documents Related to Assessment';

    cy.findAllByText('Expand All').filter(':visible');
    cy.findByText(documentsText).should('not.exist');

    cy.findByText('Expand All').click();
    cy.findAllByText(documentsText).should('be.visible');

    cy.findByText('Collapse All').click();
    cy.findByText(documentsText).should('not.exist');
  });

  it(`Clicking "<tribe name> Documents" opens the documents content`, () => {
    const title = 'Red Lake Band of Chippewa Indians, Minnesota Documents';
    const text = 'Documents Related to Assessment';
    const linkText = 'Red Lake Nation Assessment Methodology (DOCX)';

    // verify text is not visible
    cy.findByText(text).should('not.exist');

    // open accordion and check text is visible
    cy.get('.hmw-accordion').contains(title).click();
    cy.findByText(text).should('be.visible');

    // check for links in table
    cy.findByText(linkText).should(
      'have.attr',
      'href',
      `https://attains.epa.gov/attains-public/api/documents/cycles/12864/210250`,
    );
    cy.findByText(linkText).should('have.attr', 'target', '_blank');
    cy.findByText(linkText).should('have.attr', 'rel', 'noopener noreferrer');

    // close accordion and verify text is not visible
    cy.get('.hmw-accordion').contains(title).click();
    cy.findByText(text).should('not.exist');
  });

  it(`"Water Stories" not available on the tribe pages.`, () => {
    cy.findByText('Water Stories', { exact: false }).should('not.exist');
  });
});
