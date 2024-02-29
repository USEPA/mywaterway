describe('Data page', () => {
  it('Back button works', () => {
    cy.visit('/community');
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      'San Antonio, TX',
    );
    cy.findByText('Go').click();

    // wait for the all web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    cy.findByText('Data').click();
    cy.findByText('About the Data').should('exist');
    cy.url().should('equal', `${window.location.origin}/data`);

    // verify that community search data is still there after clicking the Back button
    cy.findByText('Back').click();
    cy.findByTestId('overview-waterbodies-accordion-title').contains(
      'Overall condition of 8 waterbodies in the San Pedro Creek watershed.',
    );
  });

  it('Test navigating to data page', () => {
    cy.visit('/data');

    // verify the page loads
    cy.findByText(
      'retrieves data from various systems at the Environmental Protection Agency (EPA) and other federal agencies',
      { exact: false },
    );

    // check the attains link
    cy.findAllByText(
      'Assessment, Total Maximum Daily Load Tracking and Implementation System (ATTAINS)',
    );
    cy.findByText('ATTAINS Data/System').should(
      'have.attr',
      'href',
      'https://www.epa.gov/waterdata/attains',
    );
  });

  it('Test contents scrolling', () => {
    function scrollTest(item) {
      const padding = -14;

      // press the item in table of contents
      cy.get(`button:contains("${item}")`).click();

      // verify the scroll worked
      cy.get(`h3:contains("${item}")`)
        .then((elm) => elm[0].offsetTop)
        .then((offset) =>
          cy
            .window()
            .its('scrollY')
            .should('equal', offset + padding),
        );
    }

    // go to the data page
    cy.visit('/data');

    // This is a workaround for the last item in the list. The last item does
    // not scroll far enough for the item to be at the top of the screen.
    // This adds some empty space to the bottom of the page/footer to ensure
    // the window can scroll far enough that the item is at the top of the page.
    cy.get('footer').within((elms) => {
      const spacing = document.createElement('div');
      spacing.style.height = '500px';
      elms[0].appendChild(spacing);
    });

    // test scrolling
    scrollTest(
      'Assessment, Total Maximum Daily Load Tracking and Implementation System (ATTAINS)',
    );
    scrollTest('Cyanobacteria Assessment Network (CyAN)');
    scrollTest('Enforcement and Compliance History Online (ECHO)');
    scrollTest('Grants Reporting and Tracking System (GRTS)');
    scrollTest('Protected Areas');
    scrollTest('Safe Drinking Water Information System (SDWIS)');
    scrollTest('USGS Sensors (USGS Stream Gages)');
    scrollTest('Water Quality Portal (WQP)');
    scrollTest(
      'Watershed Assessment, Tracking & Environmental Results System (WATERS)',
    );
    scrollTest('Watershed Index Online (WSIO)');
    scrollTest('Wild and Scenic Rivers');

    // loop through and verify the "Top of Page" buttons all scroll to
    // the nav bar
    cy.get('button:contains("Top of Page")').then((buttons) => {
      // loop through the "Top of Page" buttons
      for (let i = 0; i < buttons.length; i++) {
        // click the button
        cy.wrap(buttons[i])
          .then((elm) => elm.click())
          .then(() => {
            // verify the page scrolled to the nav bar
            cy.get('#hmw-nav-bar')
              .then((elm) => elm[0].offsetTop)
              .then((offset) =>
                cy
                  .window()
                  .its('scrollY')
                  .should('equal', offset - 16),
              );
          });
      }
    });
  });
});
