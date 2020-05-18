describe("Data page", () => {
  it("Back button works", () => {
    cy.visit("/community");
    cy.findByPlaceholderText("Search by address", { exact: false }).type(
      "San Antonio, TX"
    );
    cy.findByText("Go").click();

    // wait for the all web services to finish
    cy.findAllByTestId("hmw-loading-spinner", { timeout: 20000 }).should(
      "not.exist"
    );

    cy.findByText("Data").click();
    cy.findByText("About the Data").should("exist");
    cy.url().should("equal", `${document.location.origin}/data`);

    // verify that community search data is still there after clicking the Back button
    cy.findByText("Back").click();
    cy.findByText(
      "Overall condition of waterbodies in the San Pedro Creek watershed."
    ).should("exist");
  });
});
