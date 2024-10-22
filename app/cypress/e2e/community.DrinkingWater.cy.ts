describe('Drinking Water page', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it('test tab navigation and tribal filter', () => {
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      '102400080408',
    );
    cy.findByText('Go').click();

    cy.waitForLoadFinish();

    // navigate to Drinking Water tab of Community page
    cy.findByRole('tab', { name: 'Drinking Water' }).click();

    cy.findByText('The yellow outline on the map shows the county', {
      exact: false,
    });
    cy.findByText('HIAWATHA, CITY OF');

    // go to 2nd sub tab
    cy.findByRole('tab', {
      name: 'Who withdraws water for drinking here?',
    }).click();

    cy.findByText(
      'This is the immediate drainage area, not the entire watershed.',
      { exact: false },
    );

    cy.findByText('IOWA TRIBE OF KS & NE');
    cy.findAllByText('PUBLIC WHOLESALE WSD 27')
      .filter(':visible')
      .should('be.visible');

    cy.findAllByLabelText('Tribal Only').filter(':visible').click({
      force: true,
    });

    cy.findByText('IOWA TRIBE OF KS & NE');
    cy.findAllByText('PUBLIC WHOLESALE WSD 27').should('not.be.visible');

    // go to 3rd sub tab
    cy.findByRole('tab', {
      name: 'Which waters have been assessed for drinking water use?',
    }).click();

    cy.findByText('Waterbody Conditions:');
    cy.findByText('Roys Cr');
  });

  it('test filtering ground/surface water', () => {
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      '020700050101',
    );
    cy.findByText('Go').click();

    cy.waitForLoadFinish();

    // navigate to Drinking Water tab of Community page
    cy.findByRole('tab', { name: 'Drinking Water' }).click();

    // go to 2nd sub tab
    cy.findByRole('tab', {
      name: 'Who withdraws water for drinking here?',
    }).click();

    cy.findAllByText('CAMP SHENANDOAH').filter(':visible').should('be.visible');
    cy.findAllByText('MIDDLEBROOK - ACSA')
      .filter(':visible')
      .should('be.visible');

    cy.findAllByLabelText('Surface Water').click({
      force: true,
    });

    cy.findAllByText('CAMP SHENANDOAH').filter(':visible').should('be.visible');
    cy.findAllByText('MIDDLEBROOK - ACSA').should('not.be.visible');

    cy.findAllByLabelText('Surface Water').click({
      force: true,
    });
    cy.findAllByLabelText('Ground Water').click({
      force: true,
    });

    cy.findAllByText('CAMP SHENANDOAH').should('not.be.visible');
    cy.findAllByText('MIDDLEBROOK - ACSA')
      .filter(':visible')
      .should('be.visible');
  });
});
