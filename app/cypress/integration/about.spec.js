describe('About page', () => {
  it('Back button works', () => {
    cy.visit('/community');
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      'San Antonio, TX',
    );
    cy.findByText('Go').click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    cy.findByText('About').click();
    cy.findByText('About How’s My Waterway').should('exist');
    cy.url().should('equal', `${window.location.origin}/about`);

    // verify that community search data is still there after clicking the Back button
    cy.findByText('Back').click();
    cy.findByTestId('overview-waterbodies-accordion-title').contains(
      'Overall condition of 8 waterbodies in the San Pedro Creek watershed.',
    );
  });

  it('Test navigating to about page', () => {
    const text =
      'was designed to provide the general public with information about the condition of their local waters';

    cy.visit('/about');

    // verify the app navigates to the page
    cy.findByText(text, { exact: false });

    // check the Questions and Answers tab
    cy.findByText('Questions and Answers').click();
    cy.findByText(
      'is an EPA tool that helps users find information on the condition of their waters',
      { exact: false },
    );

    // go back to the About HMW page
    cy.findByText("About How's My Waterway").click();
    cy.findByText(text, { exact: false });
  });
});
