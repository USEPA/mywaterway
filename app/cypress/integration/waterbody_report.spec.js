describe("Waterbody Report page", () => {
  it('small screen displays "Show Map" button and button functions', () => {
    const mapId = "hmw-actions-map";
    const showMap = "Show Map";
    const hideMap = "Hide Map";

    cy.viewport(850, 900);
    cy.visit("/waterbody-report/21AWIC/AL03150110-0202-200");

    cy.findByText(showMap).should("exist");
    cy.findByText(hideMap).should("not.exist");
    cy.findByTestId(mapId).should("not.be.visible");

    cy.findByText(showMap).click();
    cy.findByText(showMap).should("not.exist");
    cy.findByText(hideMap).should("exist");
    cy.findByTestId(mapId).should("be.visible");

    cy.findByText(hideMap).click();
    cy.findByText(showMap).should("exist");
    cy.findByText(hideMap).should("not.exist");
    cy.findByTestId(mapId).should("not.be.visible");
  });

  it('entering an invalid waterbody repot url displays "No waterbodies" message', () => {
    const orgId = "InvalidOrgID";
    const auId = "InvalidAssessmentUnitID";

    cy.visit(`/waterbody-report/${orgId}/${auId}`);

    cy.findByText(
      "No waterbodies available for the provided Organization ID:",
      { exact: false }
    );
  });

  it('For waterbodies without GIS data, display the "has no data available" message', () => {
    const orgId = "21GAEPD";
    const auId = "GAR_A-33_5_00";

    cy.visit(`/waterbody-report/${orgId}/${auId}`);

    cy.findByText("has no data available.", { exact: false });
  });

  it('The "View Waterbody Report" link should navigate to a waterbody report page', () => {
    const orgId = "21AWIC";
    const auId = "AL03150110-0202-200";

    cy.visit(`/waterbody-report/${orgId}/${auId}`);

    // wait for the web services to finish (attains/plans is sometimes slow)
    // the timeout chosen is the same timeout used for the attains/plans fetch
    cy.findAllByTestId("hmw-loading-spinner", { timeout: 120000 }).should(
      "not.exist"
    );

    // test the plan summary link
    const linkText =
      "Development for Pathogens (E. Coli) Tmdl, Parkerson Mill Creek";
    const actionId = "40958";
    cy.findByText(linkText).should(
      "have.attr",
      "href",
      `/plan-summary/${orgId}/${actionId}`
    );
    cy.findByText(linkText).should("have.attr", "target", "_blank");
    cy.findByText(linkText).should("have.attr", "rel", "noopener noreferrer");
  });
});
