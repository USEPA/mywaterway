describe('Educational Materials tab', () => {
  it('Visits the Educators page and checks for existence of links', () => {
    cy.visit('/');

    cy.findByRole('button', { name: 'Educators' }).click();

    cy.findByRole('link', { name: 'Middle School Lesson Plan' })
      .should('be.visible')
      .should(
        'have.attr',
        'href',
        'https://www.epa.gov/waterdata/hows-my-waterway-middle-school-lesson-plan'
      );
  });
});
