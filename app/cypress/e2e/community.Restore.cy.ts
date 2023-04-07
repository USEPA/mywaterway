describe('Restore Tab', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it('Displays a table of watershed plans for a CWA 319 project', () => {
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      '020802031302',
    );
    cy.findByText('Go').click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    cy.findByRole('tab', { name: 'Restore' }).click();
    cy.findByRole('button', {
      name: 'NPS Implementation - Residential Septic BMP Initiative (RSBI)',
    }).click();

    cy.findByRole('table', { name: 'Watershed Plans' }).should('be.visible');

    cy.findByRole('link', {
      name: 'Slate River and Rock Island Creek TMDL Implementation Plan',
    }).should('exist');
  });
});
