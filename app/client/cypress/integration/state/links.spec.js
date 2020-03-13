describe('State Links', () => {
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
    // verify opening the disclaimer
    cy.findByText('Disclaimer').click();
    cy.findByText('The condition of a waterbody is dynamic and can change', {
      exact: false,
    }).should('exist');

    // verify closing the disclaimer
    cy.findByTitle('Close disclaimer').click();
    cy.findByText('The condition of a waterbody is dynamic and can change', {
      exact: false,
    }).should('not.exist');
  });

  it('Clicking the “More Information for <state name>” link opens a new tab for the state', () => {
    const linkText = 'More Information for Florida';

    // since Cypress doesn't support multiple tabs, we'll do the next best thing
    // (https://docs.cypress.io/guides/references/trade-offs.html#Multiple-tabs)
    cy.findByText(linkText)
      .invoke('attr', 'href')
      .should('equal', 'https://floridadep.gov/');
    cy.findByText(linkText)
      .invoke('attr', 'target')
      .should('equal', '_blank');
    cy.findByText(linkText)
      .invoke('attr', 'rel')
      .should('equal', 'noopener noreferrer');
  });

  it('Clicking the “EXIT” link opens a new tab with https://www.epa.gov/home/exit-epa', () => {
    const linkText = 'EXIT';

    // cypress does not allow opening links for an external domain
    // so we are just going to verify the anchor props
    cy.findByText(linkText)
      .invoke('attr', 'href')
      .should('equal', 'https://www.epa.gov/home/exit-epa');
    cy.findByText(linkText)
      .invoke('attr', 'target')
      .should('equal', '_blank');
    cy.findByText(linkText)
      .invoke('attr', 'rel')
      .should('equal', 'noopener noreferrer');
  });
});
