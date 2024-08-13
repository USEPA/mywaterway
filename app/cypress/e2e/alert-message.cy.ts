describe('Alert message tests', () => {
  function setupInterceptors(altResponseBody = null) {
    const location = window.location;
    const origin =
      location.hostname === 'localhost'
        ? `${location.protocol}//${location.hostname}:3002`
        : window.location.origin;

    let responseBody = {
      all: {
        color: '#721c24',
        backgroundColor: '#f8d7da',
        message:
          '<p>There will be <a href="https://www.epa.gov" target="_blank">scheduled maintenance</a> on the <strong>ATTAINS</strong> services on Thursday, July 16th starting at 8am and ending at 11am.</p>',
      },
      community: {
        color: '#0c5460',
        backgroundColor: '#d1ecf1',
        message:
          '<p>This is a message for the <strong>Community</strong> page. Check out <a href="epa.gov">this link</a> for more information</p>',
      },
      state: {
        color: '#721c24',
        backgroundColor: '#f8d7da',
        message: '<p>State page message.</p>',
      },
      'plan-summary': {
        color: '#721c24',
        backgroundColor: '#f8d7da',
        message: 'Plan summary message.',
      },
      'waterbody-report': {
        color: '#721c24',
        backgroundColor: '#f8d7da',
        message: 'Waterbody Report message.',
      },
    };
    if (altResponseBody) responseBody = altResponseBody;

    cy.intercept(`${origin}/api/configFiles`, (req) => {
      req.continue((res) => {
        res.body.notifications = responseBody;
      });
    }).as('notifications-messages');
  }

  const allPagesMessage =
    'There will be scheduled maintenance on the ATTAINS services on Thursday, July 16th starting at 8am and ending at 11am.';
  const urlInterceptPath = '@notifications-messages';

  it('Verify notifications on the home page', () => {
    setupInterceptors();

    cy.visit('/');

    cy.wait(urlInterceptPath);

    cy.findByTestId('all-pages-notifications-banner')
      .should('exist')
      .contains(allPagesMessage);

    cy.findByTestId('specific-page-notifications-banner').should('not.exist');
  });

  it('Verify notifications on the community page', () => {
    setupInterceptors();

    cy.visit('/community/dc/overview');

    cy.wait(urlInterceptPath);

    cy.findByTestId('all-pages-notifications-banner')
      .should('exist')
      .contains(allPagesMessage);

    cy.findByTestId('specific-page-notifications-banner')
      .should('exist')
      .contains(
        'This is a message for the Community page. Check out this link for more information',
      );
  });

  it('Verify notifications on the state page', () => {
    setupInterceptors();

    cy.visit('/state/AL');

    cy.wait(urlInterceptPath);

    cy.findByTestId('all-pages-notifications-banner')
      .should('exist')
      .contains(allPagesMessage);

    cy.findByTestId('specific-page-notifications-banner')
      .should('exist')
      .contains('State page message.');
  });

  it('Verify notifications on the plan summary page', () => {
    setupInterceptors();

    cy.visit('/plan-summary/21AWIC/40958');

    cy.wait(urlInterceptPath);

    cy.findByTestId('all-pages-notifications-banner')
      .should('exist')
      .contains(allPagesMessage);

    cy.findByTestId('specific-page-notifications-banner')
      .should('exist')
      .contains('Plan summary message.');
  });

  it('Verify notifications on the waterbody report page', () => {
    setupInterceptors();

    cy.visit('/waterbody-report/21AWIC/AL03150110-0202-200');

    cy.wait(urlInterceptPath);

    cy.findByTestId('all-pages-notifications-banner')
      .should('exist')
      .contains(allPagesMessage);

    cy.findByTestId('specific-page-notifications-banner')
      .should('exist')
      .contains('Waterbody Report message.');
  });

  it('Verify notification on individual home page works on its own', () => {
    setupInterceptors({
      '': {
        color: '#721c24',
        backgroundColor: '#f8d7da',
        message:
          '<p>There will be <a href="https://www.epa.gov" target="_blank">scheduled maintenance</a> on the <strong>ATTAINS</strong> services on Thursday, July 16th starting at 8am and ending at 11am.</p>',
      },
    });

    cy.visit('/');

    cy.wait(urlInterceptPath);

    cy.findByTestId('all-pages-notifications-banner').should('not.exist');

    cy.findByTestId('specific-page-notifications-banner')
      .should('exist')
      .contains(allPagesMessage);
  });

  it('Verify notification on all page works on its own', () => {
    setupInterceptors({
      all: {
        color: '#721c24',
        backgroundColor: '#f8d7da',
        message:
          '<p>There will be <a href="https://www.epa.gov" target="_blank">scheduled maintenance</a> on the <strong>ATTAINS</strong> services on Thursday, July 16th starting at 8am and ending at 11am.</p>',
      },
    });

    cy.visit('/');

    cy.wait(urlInterceptPath);

    cy.findByTestId('all-pages-notifications-banner')
      .should('exist')
      .contains(allPagesMessage);

    cy.findByTestId('specific-page-notifications-banner').should('not.exist');
  });
});
