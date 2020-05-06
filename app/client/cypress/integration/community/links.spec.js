describe('Community page links', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it(`"Open Plan Summary" button links to the plan summary page`, () => {
    // navigate to the restoration plans tab of the restore panel
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      'San Antonio, TX',
    );
    cy.findByText('Go').click();
    cy.findByText('Restore').click();
    cy.findByText('Restoration Plans').click();

    // wait for the web services to finish (attains/plans is sometimes slow)
    // the timeout chosen is the same timeout used for the attains/plans fetch
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // test the plan summary link
    const linkText = 'Open Plan Summary';
    cy.findAllByText('Upper San Antonio River WPP')
      .first()
      .click();
    cy.findByText(linkText).should(
      'have.attr',
      'href',
      '/plan-summary/TCEQMAIN/1',
    );
    cy.findByText(linkText).should('have.attr', 'target', '_blank');
    cy.findByText(linkText).should('have.attr', 'rel', 'noopener noreferrer');
  });
});
