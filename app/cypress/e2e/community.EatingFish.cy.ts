describe('Eating Fish page', () => {
  const location = window.location;
  const origin =
    location.hostname === 'localhost'
      ? `${location.protocol}//${location.hostname}:3002`
      : window.location.origin;

  const baseText = 'environmental health department for your';
  const text = 'environmental health department for your state.';

  it('Test fish advisory link in upper tab text from config file', () => {
    const testId = 'hmw-upper-content-section';

    // intercept config files and inject fish advisory link
    cy.intercept(`${origin}/api/configFiles`, (req) => {
      req.continue((res) => {
        res.body.upperContent.eatingFish.body =
          res.body.upperContent.eatingFish.body.replace(
            text,
            `environmental health department for your <a  href=\"http://doee.dc.gov/service/fishing-district\" target=\"_blank\" rel=\"noopener noreferrer\">state</a>. <a class='exit-disclaimer' href='https://www.epa.gov/home/exit-epa' target='_blank' rel='noopener noreferrer'>EXIT</a>`,
          );
      });
    }).as('fish-link');

    cy.visit(`/community/dc/eating-fish`);
    cy.wait('@fish-link');

    // check for text minus the link
    cy.findAllByTestId(testId)
      .filter(':visible')
      .findByText(baseText, { exact: false })
      .should('be.visible');

    // check the injected link
    cy.findAllByTestId(testId)
      .filter(':visible')
      .findByText('state')
      .should('be.visible')
      .should(
        'have.attr',
        'href',
        'http://doee.dc.gov/service/fishing-district',
      )
      .should('have.attr', 'target', '_blank')
      .should('have.attr', 'rel', 'noopener noreferrer');

    // check the injected exit disclaimer
    cy.findAllByTestId(testId)
      .filter(':visible')
      .findByText('EXIT')
      .should('be.visible')
      .should('have.attr', 'href', 'https://www.epa.gov/home/exit-epa')
      .should('have.attr', 'target', '_blank')
      .should('have.attr', 'rel', 'noopener noreferrer');
  });

  it('Test fish advisory section with no links', () => {
    cy.visit('/community/dc/eating-fish');
    cy.findByText(text, { exact: false }).should('be.visible');
  });
});
