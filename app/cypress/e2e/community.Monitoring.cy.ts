import {
  createRelativeDailyTimestampRange,
  epochToMonthDay,
  yearDayStringToEpoch,
} from '../../client/src/utils/dateUtils';

// Ignore uncaught exceptions related to the ResizeObserver - loop limit exceeded error.
// We can safely ignore this. https://stackoverflow.com/questions/49384120/resizeobserver-loop-limit-exceeded
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  return false;
});

describe('Monitoring Tab', () => {
  beforeEach(() => {
    cy.visit('/community');
  });

  it('Clicking the All Monitoring Locations switch toggles it off and displays 0 locations in the accordion', () => {
    // navigate to Monitoring tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      'San Antonio, TX',
    );
    cy.findByText('Go').click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    cy.findByText('Water Monitoring').click();
    cy.findByRole('tab', { name: 'Past Water Conditions' }).click();

    // click Toggle All Monitoring Locations switch and check that all switches are toggled off
    cy.findByLabelText('All Monitoring Locations').click({
      force: true,
    });

    cy.findByLabelText('All Monitoring Locations').should(
      'have.attr',
      'aria-checked',
      'false',
    );
    cy.findByLabelText('Metals').should('have.attr', 'aria-checked', 'false');

    // check that there are no items displayed in accordion
    cy.findByTestId('monitoring-accordion-title').contains('0 of 99');

    // check that clicking the Toggle All switch again toggles all switches back on
    cy.findByLabelText('All Monitoring Locations').click({
      force: true,
    });
    cy.findByLabelText('All Monitoring Locations').should(
      'have.attr',
      'aria-checked',
      'true',
    );
    cy.findByLabelText('Metals').should('have.attr', 'aria-checked', 'true');
  });

  it('Should update the total measurement counts when flipping the "PFAS" toggle switch', () => {
    // navigate to Monitoring tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      'auburn al',
    );
    cy.findByText('Go').click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // navigate to the Past Water Conditions sub-tab
    cy.findByRole('tab', { name: 'Water Monitoring' }).click();
    cy.findByRole('tab', { name: 'Past Water Conditions' }).click();

    // turn off all switches
    cy.findByRole('switch', {
      name: 'All Monitoring Locations',
    }).click({ force: true });

    cy.findByRole('table', { name: 'Monitoring Location Summary' })
      .find('tbody')
      .find('td')
      .last()
      .should('have.text', '0');

    // flip the PFAS switch
    cy.findByRole('switch', { name: 'PFAS' }).click({ force: true });

    cy.findByRole('table', { name: 'Monitoring Location Summary' })
      .find('tbody')
      .find('td')
      .last()
      .should('not.have.text', '0');
  });

  it('Should update the mapped locations when flipping the "PFAS" toggle switch', () => {
    // navigate to Monitoring tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      'auburn al',
    );
    cy.findByText('Go').click();

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // navigate to the Past Water Conditions sub-tab
    cy.findByRole('tab', { name: 'Water Monitoring' }).click();
    cy.findByRole('tab', { name: 'Past Water Conditions' }).click();

    // turn off all switches
    cy.findByRole('switch', {
      name: 'All Monitoring Locations',
    }).click({ force: true });

    // this triggers the virtualized list to load
    cy.scrollTo('bottom');

    const pfasLocation = 'Well ( R 2) CITY OF AUBURN 323500085274801 AL';
    cy.findAllByText(pfasLocation).should('not.exist');

    // flip the PFAS switch
    cy.findByRole('switch', { name: 'PFAS' }).click({ force: true });

    cy.findAllByText(pfasLocation).should('exist');
  });

  it('Verify CyAN data displayed', () => {
    // navigate to Monitoring tab of Community page
    cy.findByPlaceholderText('Search by address', { exact: false }).type(
      '030901011204',
    );
    cy.findByText('Go').click();

    cy.findByText('Water Monitoring').click();

    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // this triggers the virtualized list to load
    cy.scrollTo('bottom');

    cy.findAllByText('Lake Weohyakapka').click();

    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    cy.findAllByText('Daily Blue-Green Algae Estimates for Lake Weohyakapka', {
      exact: false,
    }).should('be.visible');

    cy.findAllByText(
      'Blue-Green Algae Concentration Histogram and Maximum for Selected Date:',
      { exact: false },
    ).should('be.visible');
  });

  it('Adjusting the date slider updates info for a monitoring location', () => {
    const monitoringLocation = '01651770';

    cy.findByPlaceholderText('Search by address', { exact: false }).type('dc');

    cy.findByText('Go').click();

    cy.findByRole('tab', { name: 'Water Monitoring' }).click();

    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    cy.findByRole('tab', { name: 'Past Water Conditions' }).click();

    cy.scrollTo('bottom');

    cy.findByRole('button', { name: monitoringLocation }).click();

    cy.findByRole('button', { name: monitoringLocation })
      .parent()
      .findByText((_content, element) => {
        const match = element.textContent.match(/^\(1951 - 20\d\d\)$/);
        return Boolean(match);
      })
      .should('be.visible');

    // drag the slider handle
    cy.findByRole('slider', { name: '1951' })
      .trigger('mousedown', {
        which: 1,
      })
      .trigger('mousemove', {
        which: 1,
        clientX: 1000,
      })
      .trigger('mouseup', {
        force: true,
        which: 1,
      });

    // trigger virtual list to load by scrolling to sort by control
    cy.findAllByText('Sort By:').filter(':visible').click();

    cy.findByRole('button', { name: monitoringLocation })
      .parent()
      .findByText((_content, element) => {
        const match = element.textContent.match(/^\(1951 - 20\d\d\)$/);
        return Boolean(match);
      })
      .should('not.exist');
  });

  it('Toggling characteristic group checkboxes should change the total measurement count', () => {
    cy.findByPlaceholderText('Search by address', { exact: false }).type('dc');

    cy.findByText('Go').click();

    cy.findByRole('tab', { name: 'Water Monitoring' }).click();

    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    cy.findByRole('tab', { name: 'Past Water Conditions' }).click();

    cy.scrollTo('bottom');

    cy.findByRole('button', { name: '01651770' }).click();

    cy.findByRole('checkbox', {
      name: 'Toggle all characteristic groups',
    }).click();

    cy.findByRole('table', { name: 'Characteristic Groups Summary' })
      .find('tbody')
      .find('tr')
      .last()
      .find('td')
      .eq(2)
      .should('have.text', '0');

    cy.findByRole('checkbox', { name: 'Toggle Other' }).click();

    cy.findByRole('table', { name: 'Characteristic Groups Summary' })
      .find('tbody')
      .find('tr')
      .last()
      .find('td')
      .eq(2)
      .should('not.have.text', '0');
  });
});

describe('CyAN date functions', () => {
  before(() => {
    expect(yearDayStringToEpoch, 'yearDayStringToEpoch').to.be.a('function');
    expect(epochToMonthDay, 'epochToMonthDay').to.be.a('function');
    expect(
      createRelativeDailyTimestampRange,
      'createRelativeDailyTimestampRange',
    ).to.be.a('function');
  });

  it('CyAN dates are correctly parsed during time changes and leap years', () => {
    const testCases = [
      {
        // start of DST
        input: ['2022 69', '2022 70', '2022 71', '2022 72', '2022 73'],
        output: ['3/10', '3/11', '3/12', '3/13', '3/14'],
      },
      {
        // end of DST
        input: ['2022 307', '2022 308', '2022 309', '2022 310', '2022 311'],
        output: ['11/3', '11/4', '11/5', '11/6', '11/7'],
      },
      {
        // leap day
        input: ['2020 58', '2020 59', '2020 60', '2020 61', '2020 62'],
        output: ['2/27', '2/28', '2/29', '3/1', '3/2'],
      },
      {
        // non leap year
        input: ['2021 58', '2021 59', '2021 60', '2021 61', '2021 62'],
        output: ['2/27', '2/28', '3/1', '3/2', '3/3'],
      },
    ];

    testCases.forEach((testCase) => {
      testCase.input.forEach((date, i) => {
        expect(epochToMonthDay(yearDayStringToEpoch(date))).to.equal(
          testCase.output[i],
        );
      });
    });
  });

  it('Day ranges are correctly calculated during time changes and leap years', () => {
    const testCases = [
      {
        input: new Date(2022, 2, 16),
        output: ['3/9', '3/10', '3/11', '3/12', '3/13', '3/14', '3/15'],
      },
      {
        input: new Date(2022, 10, 9),
        output: ['11/2', '11/3', '11/4', '11/5', '11/6', '11/7', '11/8'],
      },
      {
        input: new Date(2020, 2, 4),
        output: ['2/26', '2/27', '2/28', '2/29', '3/1', '3/2', '3/3'],
      },
      {
        input: new Date(2021, 2, 4),
        output: ['2/25', '2/26', '2/27', '2/28', '3/1', '3/2', '3/3'],
      },
    ];

    testCases.forEach((testCase) => {
      createRelativeDailyTimestampRange(testCase.input, -7, -1).forEach(
        (timestamp, i) => {
          expect(epochToMonthDay(timestamp)).to.equal(testCase.output[i]);
        },
      );
    });
  });
});
