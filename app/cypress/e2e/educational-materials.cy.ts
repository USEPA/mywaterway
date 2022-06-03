describe('Educational Materials tab', () => {
  it('Visits the Educators page and checks for existence of links', () => {
    cy.visit('/');

    cy.findByText('Educators').click();

    const linkText =
      'https://www.epa.gov/waterdata/hows-my-waterway-middle-school-lesson-plan';
    cy.findByText(linkText).should('be.visible');
  });
});
