// This is a workaround for making the tests more reliable when running
// cypress in headless mode, particularly for running code coverage.
Cypress.on("uncaught:exception", (_err, _runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  debugger;
  return false;
});

describe("Entering URL parameters for a nonexistent location", () => {
  const provider = "STORET";
  const orgId = "31ORWUNT";
  const gibberishSiteId = "sdfsdfasdf";

  it("Should display a 'site not found' error message when no data is returned", () => {
    cy.visit(`/location/${provider}/${orgId}/${orgId}-${gibberishSiteId}`);
    cy.contains(
      `The monitoring location ${orgId}-${gibberishSiteId} could not be found.`
    ).should("be.visible");
  });
  it("Should display a 'information unavailable' error message when the parameters are invalid", () => {
    cy.visit(`/location/${provider}/${orgId}/${gibberishSiteId}`);
    cy.findByText(
      `Sample locations information is temporarily unavailable, please try again later.`
    ).should("be.visible");
  });
});

describe("Entering URL parameters for an existent site", () => {
  const provider = "STORET";
  const orgId = "CBP_WQX";
  const siteId = "01651770";

  beforeEach(() => {
    cy.visit(`/location/${provider}/${orgId}/${orgId}-${siteId}`);
  });

  it("Should display the trimmed site ID", () => {
    cy.contains(`Site ID: ${siteId}`).should("be.visible");
    cy.contains(`Site ID: ${orgId}-${siteId}`).should("not.exist");
  });

  it("Should instruct the user to select a characteristic for the graph", () => {
    cy.findByText(
      "Select a characteristic from the table above to graph its results."
    ).should("be.visible");
  });
});

describe("Selecting a characteristic from the table", () => {
  const provider = "NWIS";
  const orgId = "USGS-MD";
  const siteId = "USGS-391800076303201";

  beforeEach(() => {
    cy.visit(`/location/${provider}/${orgId}/${siteId}`);
  });

  /* it("Should display a graph when a characteristic with measured results is selected", () => {
    cy.findByLabelText("Total dissolved solids").click({ force: true });
    cy.findByLabelText("XYChart").should("be.visible");
  }); */
});
