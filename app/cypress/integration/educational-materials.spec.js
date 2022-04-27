describe('Educational Materials tab', () => {
  it('Visits the About page and checks for existence of links', () => {
    cy.visit('/about');
    const linkText =
      'https://www.epa.gov/waterdata/hows-my-waterway-middle-school-lesson-plan';
    cy.findByText(linkText).should('not.be.visible');

    const educationTab = 'Educational Materials';
    cy.findByText(educationTab).click();

    cy.findByText(linkText).should('be.visible');
  });
});
