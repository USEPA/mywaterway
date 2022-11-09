describe('Homepage links', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it(`"Community" button links to the community page`, () => {
    cy.findByText('Community').click();
    cy.url().should('include', '/community');
  });

  it(`"State & Tribal" button links to the state & tribal page`, () => {
    cy.findByText('State & Tribal').click();
    cy.url().should('include', '/state-and-tribal');
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
    cy.url().should('equal', `${window.location.origin}/`);
  });
});

describe('Homepage search', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it(`Searching for a zip code correctly routes to the community overview page for the zip code.`, () => {
    const zip = '22201';
    cy.findByPlaceholderText('Search by address', { exact: false }).type(zip);
    cy.findByText('Go').click();
    cy.url().should('include', `/community/${zip}/overview`);
  });

  it('searching with a <script> tag displays an error', () => {
    const search = '<script>var j = 1;</script>';
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      search,
    );
    cy.findByText('Go').click();
    cy.findByText('Invalid search. Please try a new search.').should('exist');
  });
});

describe('Homepage disclaimer and glossary', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('Clicking the “DISCLAIMER” button displays the disclaimer popup', () => {
    const text = /^EPA has posted information through this application/;

    // verify opening the disclaimer
    cy.findByText('Disclaimer').click();
    cy.findByText(text).should('exist');

    // verify closing the disclaimer
    cy.findByTitle('Close disclaimer').click();
    cy.findByText(text).should('not.exist');
  });

  it(`Glossary button toggles slide content`, () => {
    cy.findAllByText('Glossary').filter('[data-disabled="false"]').click();
    cy.findByPlaceholderText('Search for a term...').should('be.visible');
  });

  it(`Glossary close button closes slide content`, () => {
    cy.findAllByText('Glossary').filter('[data-disabled="false"]').click();
    cy.findByText('×').click();
    cy.findByPlaceholderText('Search for a term...').should('not.be.visible');
  });
});
