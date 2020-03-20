describe('Homepage', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it(`"Community" button links to the community page`, () => {
    cy.findByText('Community').click();
    cy.url().should('include', '/community');
  });

  it(`"State" button links to the state page`, () => {
    cy.findByText('State').click();
    cy.url().should('include', '/state');
  });

  it(`"National" button links to the national page`, () => {
    cy.findByText('National').click();
    cy.url().should('include', '/national');
  });

  it(`"Data" button links to the data page`, () => {
    cy.findByText('Data').click();
    cy.url().should('include', '/data');
  });

  it(`"About" button links to the about page`, () => {
    cy.findByText('About').click();
    cy.url().should('include', '/about');
  });

  it(`"Contact Us" button links to the contact us page in a new window`, () => {
    // since Cypress doesn't support multiple tabs, we'll do the next best thing
    // (https://docs.cypress.io/guides/references/trade-offs.html#Multiple-tabs)
    cy.findByText('Contact Us')
      .should(
        'have.attr',
        'href',
        'https://www.epa.gov/waterdata/forms/contact-us-about-hows-my-waterway',
      )
      .should('have.attr', 'target', '_blank')
      .should('have.attr', 'rel', 'noopener noreferrer');
  });

  it(`"How’s My Waterway?" header text links to home page`, () => {
    cy.findByText('How’s My Waterway?').click();
    cy.url().should('equal', `${document.location.origin}/`);
  });
});
