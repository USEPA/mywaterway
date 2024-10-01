describe('Restore Tab', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it('Displays a table of watershed plans for a CWA 319 project', () => {
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      '020802031302',
    );
    cy.findByText('Go').click();

    cy.waitForLoadFinish();

    cy.findByRole('tab', { name: 'Restore' }).click();
    cy.findByRole('button', {
      name: 'NPS Implementation - Residential Septic BMP Initiative (RSBI)',
    }).click();

    cy.findByRole('table', { name: 'Watershed Plans' }).should('be.visible');

    cy.findByRole('link', {
      name: 'Slate River and Rock Island Creek TMDL Implementation Plan',
    }).should('exist');
  });

  it('Restoration plans', () => {
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      '020802031302',
    );
    cy.findByText('Go').click();

    cy.waitForLoadFinish();

    cy.findByRole('tab', { name: 'Restore' }).click();
    cy.findByRole('tab', {
      name: 'Restoration Plans',
    }).click();

    cy.findByText('AUSTIN RIVER', {
      exact: false,
    }).click();
    cy.findAllByText('Open Plan Summary').should(
      'have.attr',
      'href',
      `/plan-summary/21VASWCB/33551`,
    );
  });

  it('GRTS Success Stories', () => {
    cy.findByPlaceholderText('Search by address', { exact: false }).type('dc');
    cy.findByText('Go').click();

    cy.waitForLoadFinish();

    cy.findByRole('tab', { name: 'Restore' }).click();
    cy.findByRole('tab', {
      name: 'Success Stories',
    }).click();

    cy.findByText('Alger Park Upland Low Impact Development and Stream', {
      exact: false,
    }).click();
    cy.findByText(
      'The Alger Park Upland Low Impact Development (LID) and Stream',
      { exact: false },
    );

    cy.findAllByText('Full Story (PDF)').should(
      'have.attr',
      'href',
      `https://www.epa.gov/system/files/documents/2022-09/DC_Alger%20Park_1804_508.pdf`,
    );
  });
});
