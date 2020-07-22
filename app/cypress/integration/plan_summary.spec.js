describe('Plan Summary (Actions) page', () => {
  it('small screen displays "Show Map" button and button functions', () => {
    const mapId = 'hmw-actions-map';
    const showMap = 'Show Map';
    const hideMap = 'Hide Map';

    cy.viewport(850, 900);
    cy.visit('/plan-summary/21AWIC/40958');

    cy.findByText(showMap).should('exist');
    cy.findByText(hideMap).should('not.exist');
    cy.findByTestId(mapId).should('not.be.visible');

    cy.findByText(showMap).click();
    cy.findByText(showMap).should('not.exist');
    cy.findByText(hideMap).should('exist');
    cy.findByTestId(mapId).should('be.visible');

    cy.findByText(hideMap).click();
    cy.findByText(showMap).should('exist');
    cy.findByText(hideMap).should('not.exist');
    cy.findByTestId(mapId).should('not.be.visible');
  });

  it('entering an invalid plan-summary (actions) url displays "No plans" message', () => {
    const orgId = 'InvalidOrgID';
    const actionId = 'InvalidActionID';

    cy.visit(`/plan-summary/${orgId}/${actionId}`);

    cy.findByText(
      `No plans available for the provided Organization / Plan Identifier combination: ${orgId} / ${actionId}.`,
    );
  });

  it('For plans without GIS data, display the "No map data is available" message', () => {
    const orgId = '21GAEPD';
    const actionId = '1';

    cy.visit(`/plan-summary/${orgId}/${actionId}`);

    cy.findByText('No map data is available.');
  });

  it('The "View Waterbody Report" link should navigate to a waterbody report page', () => {
    const orgId = '21AWIC';
    const actionId = '40958';
    const reportingCycle = '2018';

    cy.visit(`/plan-summary/${orgId}/${actionId}`);

    // wait for the web services to finish (attains/plans is sometimes slow)
    // the timeout chosen is the same timeout used for the attains/plans fetch
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // test the waterbody report link
    const linkText = 'View Waterbody Report';
    const auId = 'AL03150110-0202-200';
    cy.findByText(`ID: ${auId}`).first().click();
    cy.findByText(linkText).should(
      'have.attr',
      'href',
      `/waterbody-report/${orgId}/${auId}/${reportingCycle}`,
    );
    cy.findByText(linkText).should('have.attr', 'target', '_blank');
    cy.findByText(linkText).should('have.attr', 'rel', 'noopener noreferrer');
  });
});
