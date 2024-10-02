describe('Educational Materials tab', () => {
  it('Back button works and browser back button works', () => {
    cy.visit('/community');
    cy.findByRole('textbox', { name: 'Search' }).type('San Antonio, TX');
    cy.findByRole('button', { name: 'Go' }).click();

    cy.waitForLoadFinish();

    cy.findByRole('button', { name: 'Educators' }).click();
    cy.url().should('equal', `${window.location.origin}/educators`);

    // verify that community search data is still there after clicking the Back button
    cy.findByRole('button', { name: 'Back' }).click();
    cy.findByTestId('overview-waterbodies-accordion-title').contains(
      'Overall condition of 8 waterbodies in the San Pedro Creek watershed.',
    );

    // test browser back button
    cy.findByRole('button', { name: 'Educators' }).click();
    cy.url().should('equal', `${window.location.origin}/educators`);
    cy.go('back');
    cy.url().should(
      'equal',
      `${window.location.origin}/community/San%20Antonio,%20TX/overview`,
    );
  });

  it('Visits the Educators page and checks for existence of links', () => {
    cy.visit('/');

    cy.findByRole('button', { name: 'Educators' }).click();

    cy.findByRole('link', {
      name: `How’s My Waterway Middle School Lesson Plan`,
    })
      .should('be.visible')
      .should(
        'have.attr',
        'href',
        'https://www.epa.gov/waterdata/hows-my-waterway-middle-school-lesson-plan',
      );

    cy.findByRole('button', { name: 'Back' }).click();
    cy.findByRole('button', { name: 'Educators' }).click();
  });
});
