import { getMedian } from '../../client/src/utils/utils';

// This is a workaround for making the tests more reliable when running
// cypress in headless mode, particularly for running code coverage.
Cypress.on('uncaught:exception', (_err, _runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  debugger;
  return false;
});

const provider = 'STORET';
const orgId = 'IL_EPA_WQX';
const siteId = 'IL_EPA_WQX-C-19';

describe('Entering URL parameters for a nonexistent location', () => {
  const gibberishSiteId = 'sdfsdfasdf';

  it("Should display a 'location could not be found' error message when the parameters are for a nonexistent location", () => {
    cy.visit(`/monitoring-report/${provider}/${orgId}/${gibberishSiteId}`);
    cy.contains(
      `The monitoring location ${gibberishSiteId} could not be found.`,
    ).should('be.visible');
  });
});

describe('Entering URL parameters for an existent site', () => {
  beforeEach(() => {
    cy.visit(`/monitoring-report/${provider}/${orgId}/${siteId}`);
  });

  it('Should display the organization name', () => {
    cy.findByText('illinois epa').should('be.visible');
  });

  it('Should instruct the user to select a characteristic for the graph', () => {
    cy.findByText(
      'Select the checkboxes in the table below to plot the measurements of the corresponding characteristics. Up to 4 plots can be displayed at one time.',
    ).should('be.visible');
  });
});

describe('The characteristic chart section', () => {
  beforeEach(() => {
    cy.visit(`/monitoring-report/${provider}/${orgId}/${siteId}`);
  });

  it('Should display a graph when a characteristic with measured results is selected', () => {
    cy.findByLabelText('Select Total dissolved solids').check({ force: true });
    cy.findByLabelText('XYChart').should('be.visible');
  });

  it('Should display an info message when a characteristic without results is selected', () => {
    cy.findByLabelText('Select Antimony').check({ force: true });
    cy.findByText(
      'No measurements available to be charted for this characteristic.', { exact: false }
    ).should('be.visible');
  });
});

describe('The Site ID tooltip', () => {
  it('Should be displayed when focusing the help icon', () => {
    cy.visit(`/monitoring-report/${provider}/${orgId}/${siteId}`);
    cy.findByText('Site ID').click();
    cy.findByText('A Site ID is a designator used to describe', {
      exact: false,
    });
  });
});

describe('Unit test statistic functions', () => {
  before(() => {
    expect(getMedian, 'getMedian').to.be.a('function');
  });

  it('Properly calculates a median value', () => {
    const values = [0, 5, 12, 1, 68, 33, 3, 300, 24];
    expect(getMedian(values)).to.eq(12);
  });
});

describe('The Download Data section', () => {
  beforeEach(() => {
    cy.visit(`/monitoring-report/${provider}/${orgId}/${siteId}`);
  });

  it('Un-checks children when a parent checkbox is un-checked', () => {
    cy.findByRole('checkbox', { name: 'Not Assigned' }).click();
    cy.findByRole('button', { name: /Not Assigned/ }).click();
    cy.findByRole('checkbox', { name: 'Cyanide, available' }).should(
      'not.be.checked',
    );
  });
});
