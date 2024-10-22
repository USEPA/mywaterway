describe('Extreme Weather tab', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it('test tab basic functions on tab', () => {
    cy.findByPlaceholderText('Search by address', { exact: false }).type('dc');
    cy.findByText('Go').click();

    cy.waitForLoadFinish();

    // navigate to Extreme Weather tab of Community page
    cy.findByRole('tab', { name: 'Extreme Weather' }).click();

    cy.findByText(
      'Explore potentially vulnerable waters, infrastructure, and communities alongside',
      {
        exact: false,
      },
    );

    cy.findByRole('combobox', { name: 'County' }).click({ force: true });
    cy.findByText("Prince George's County").click();
    cy.findByText('Change in annual consecutive (dry days):', { exact: false });

    cy.findByText('Annual days with no rain (dry days): 189.6');
    cy.findByRole('combobox', { name: 'Timeframe' }).click({ force: true });
    cy.findByRole('option', { name: 'Mid Century (2035 - 2064)' }).click();
    cy.findByText('Annual days with no rain (dry days): 190.8');

    cy.findByRole('radio', { name: 'Fire' }).should('not.be.checked');
    cy.findByRole('radio', { name: 'Drought' }).should('not.be.checked');

    cy.findByRole('radio', { name: 'Fire' }).click();
    cy.findByRole('radio', { name: 'Fire' }).should('be.checked');
    cy.findByRole('radio', { name: 'Drought' }).should('not.be.checked');

    cy.findByRole('radio', { name: 'Drought' }).click();
    cy.findByRole('radio', { name: 'Fire' }).should('not.be.checked');
    cy.findByRole('radio', { name: 'Drought' }).should('be.checked');

    cy.findByRole('button', { name: 'Clear Selection' }).click();
    cy.findByRole('radio', { name: 'Fire' }).should('not.be.checked');
    cy.findByRole('radio', { name: 'Drought' }).should('not.be.checked');
  });
});
