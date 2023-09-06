// Ignore uncaught exceptions related to the ResizeObserver - loop limit exceeded error. 
// We can safely ignore this. https://stackoverflow.com/questions/49384120/resizeobserver-loop-limit-exceeded
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  return false;
});

describe('Overview Tab', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it('Filters the list of permitted dischargers when permit component switches are toggled', () => {
    // Navigate to the Overview tab of the Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type('dc');
    cy.findByText('Go').click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    cy.findByRole('tab', { name: 'Permitted Dischargers' }).click();

    // Toggle All Permit Components switch and check that no accordion items are displayed
    cy.findByLabelText('All Permit Components').click({
      force: true,
    });
    cy.findByRole('list', { name: 'List of Permitted Dischargers' })
      .findAllByRole('listitem')
      .should('have.length', 0);

    cy.findByLabelText('POTW').click({ force: true });
    cy.findByRole('button', {
      name: 'DISTRICT DEPARTMENT OF ENERGY AND ENVIRONMENT NATURAL RESOURCES ADMINISTRATION',
    }).should('be.visible');
  });
});
