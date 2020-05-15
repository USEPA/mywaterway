describe("Drinking Water page", () => {
  beforeEach(() => {
    cy.visit("/drinking-water");
  });

  it(`"Swimming" button links to the swimming page`, () => {
    cy.findByText("Swimming").click();
    cy.url().should("include", "/swimming");
  });

  it(`"Aquatic Life" button links to the aquatic life page`, () => {
    cy.findAllByText("Aquatic Life")
      .filter(":visible")
      .click();
    cy.url().should("include", "/aquatic-life");
  });

  it(`"Eating Fish" button links to the eating fish page`, () => {
    cy.findByText("Eating Fish").click();
    cy.url().should("include", "/eating-fish");
  });

  it(`Searching for a zip code correctly routes to the community drinking water page for the zip code.`, () => {
    const zip = "22201";
    cy.findByPlaceholderText("Search by address", { exact: false }).type(zip);
    cy.findByText("Go").click();
    cy.url().should("include", `/community/${zip}/drinking-water`);
  });

  it("searching with a <script> tag displays an error", () => {
    const search = "<script>var j = 1;</script>";
    cy.findByPlaceholderText("Search by address", { exact: false }).type(
      search
    );
    cy.findByText("Go").click();
    cy.findByText("Invalid search. Please try a new search.").should("exist");
  });
});
