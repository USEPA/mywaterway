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
    cy.findByRole('button', { name: 'Data' }).click();
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

  it('Searching for a monitoring location correctly routes to the Monitoring Report page', () => {
    const siteId = 'HBMI_WQX-0.5CBR';

    cy.window().then((win) => {
      cy.stub(win, 'open').as('windowOpen');
    });

    cy.findByPlaceholderText('Search by address', { exact: false }).type(siteId);
    cy.findByRole('menuitem', { name: (name) => name.includes(siteId) }).click();

    cy.get('@windowOpen').should('have.been.called');
    cy.get('@windowOpen').should('have.been.calledWithMatch', /\/monitoring-report/);
  });

  it('Searching for a waterbody correctly routes to the Waterbody Report page', () => {
    const waterbodyId = 'DCAKL00L_00';

    cy.window().then((win) => {
      cy.stub(win, 'open').as('windowOpen');
    });

    cy.findByPlaceholderText('Search by address', { exact: false }).type(waterbodyId);
    cy.findByRole('menuitem', { name: (name) => name.includes(waterbodyId) }).click();

    cy.get('@windowOpen').should('have.been.called');
    cy.get('@windowOpen').should('have.been.calledWithMatch', /\/waterbody-report/);
  });

  it('Searching for a tribal location routes to the correct location on the Community page', () => {
    const tribeName = 'Red Lake Band of Chippewa Indians, Minnesota';

    cy.on('url:changed', (newUrl) => {
      expect(newUrl).to.contain('95.14628076639758');
      expect(newUrl).to.contain('48.00973038592249');
    });

    cy.location('href').then((beforeUrl) => {
      cy.findByPlaceholderText('Search by address', { exact: false }).type(tribeName);
      cy.findByRole('menuitem', { name: (name) => name.includes(tribeName) }).click();
      cy.location('href').should((afterUrl) => {
        expect(afterUrl).to.not.equal(beforeUrl);
      });
    });
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
    cy.findAllByText('Glossary').filter(':visible').click();
    cy.findByPlaceholderText('Search for a term...').should('be.visible');
  });

  it(`Glossary close button closes slide content`, () => {
    cy.findAllByText('Glossary').filter(':visible').click();
    cy.findByRole('button', { name: 'Close glossary' }).click();
    cy.findByPlaceholderText('Search for a term...').should('not.be.visible');
  });
});
