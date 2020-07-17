import React from 'react';

// Community errors //

// ofmpub.epa.gov - Permitted Discharger Service
export const echoError =
  'The permitted discharger information is temporarily unavailable, please try again later.';

// waterqualitydata.us- Monitoring Location Service
export const monitoringError =
  'Monitoring Location information is temporarily unavailable, please try again later.';

// attains.epa.gov - Huc12summary Service
export const huc12SummaryError =
  'Waterbody information is temporarily unavailable, please try again later.';

// message show on the Community page when number of assessed waterbodies is 0
export const zeroAssessedWaterbodies = (watershed) =>
  `There are no waterbodies assessed in the ${watershed} watershed.`;

// geocode.arcgis.com - Geolocation Service
export const geocodeError =
  'Location information is temporarily unavailable, please try again later. ';

// no data available for selected location
export const noDataAvailableError =
  'Data is not available for this location. Please try a new search.';

// invalid search
export const invalidSearchError = 'Invalid search. Please try a new search.';

// Glossary component fails to load
export const glossaryError =
  'The glossary is temporarily unavailable, please try again later.';

// ofmpub.epa.gov - County Service - County (providers)
export const countyError =
  'The county drinking water provider information is temporarily unavailable, please try again later.';

// ofmpub.epa.gov - County Service - Watershed (withdrawers)
export const withdrawerError =
  'The drinking water withdrawer information for this watershed is temporarily unavailable, please try again later.';

// ofmpub.epa.gov - GRTS Service for protect tab
export const protectNonpointSourceError =
  'The protection projects are temporarily unavailable, please try again later.';

// ofmpub.epa.gov - GRTS Service for restore tab
export const restoreNonpointSourceError =
  'The clean water act section 319 projects are temporarily unavailable, please try again later.';

// attains.epa.gov - Plans Service
export const restorationPlanError =
  'The restoration plans are temporarily unavailable, please try again later.';

// watersgeo.epa.gov - HUC12 Boundary Service
export const watersgeoError =
  'There was an error retrieving local watershed information, please try again later.';

// this is intended to be used if we're showing partial map information if any of the map servers fail but some succeed (lines, areas, points)
// for now, if any of the 3 map servers (lines, areas, points) fail then we display the huc12SummaryError above
export const mapServerError =
  'There was an error retrieving some waterbody information on the map. Please try again later for a complete view.';

// plan-summary errors //

// Attains Actions service error
export const actionsError =
  'Plan information is temporarily unavailable, please try again later.';

// Actions map service errors
export const actionMapError =
  'There was an error retrieving waterbody information on the map, please try again later.';

// Actions map service returns empty for lines/areas/points
export const actionMapNoData = 'No map data is available.';

// No actions found for given OrgID/ActionID
export const noActionsAvailableCombo = (orgId, actionId) =>
  `No plans available for the provided Organization / Plan Identifier combination: ${orgId} / ${actionId}.`;

// National errors //

// NARS JSON file
export const narsError =
  'The National Aquatic Resource Surveys (NARS) data is currently unavailable, please try again later.';

// ofmpub.epa.gov GRPA service
export const grpaError =
  'The EPA Drinking Water Performance and Results information is temporarily unavailable, please try again later.'; // also used on state page

// State errors //

// for where ATTAINS usesStateSummaryService response is an internal error or missing data for a state
export const usesStateSummaryServiceInvalidResponse = (stateName) =>
  `There is no State-level assessment data available${
    stateName && ' for ' + stateName
  }.`; // add conditional check for stateName as it is sometimes undefined

// attains state document service
export const stateDocumentError = (stateName) =>
  `${stateName} integrated report documents are temporarily unavailable, please try again later.`;

export const stateDocumentSortingError =
  'There was an issue sorting the below documents. Because of this, the documents have been sorted alphabetically on document type.';

// this message is displayed in the State Survey Use section when the Survey service is down
export const stateSurveySectionError =
  'State survey information is temporarily unavailable, please try again later.';

// this message is displayed in the State Documents accordion when the Survey service is down
export const stateSurveyError = (stateName) =>
  `${stateName} survey documents are temporarily unavailable, please try again later.`;

// attains state list service
export const stateListError =
  'State information is temporarily unavailable, please try again later.';

// ofmpub.epa.gov stories service
export const stateStoriesError =
  'State water stories are temporarily unavailable, please try again later.';

// if one of the main State services goes down and there is no data to display
export const stateGeneralError =
  'State information is temporarily unavailable, please try again later.';

// if an invalid state is entered
export const stateNoDataError = (stateName) =>
  `No data available ${stateName && 'for ' + stateName}.`; // conditionals in case state name is undefined or an empty string

export const state303dStatusError =
  'There was an issue looking up the 303(d) List Status code. Because of this, the status code may not look familiar.';

// Waterbody Report errors //
export const waterbodyReportError = (type) =>
  `${type} information is temporarily unavailable, please try again later.`; // where type is 'Assessment unit', 'Assessment', or 'Plans'

// Attains Parameter Mapping Errors
export const attainsParameterServiceError =
  'Parameter information is temporarily unavailable, please try again later.';

// Error Boundaries //

// message displayed for Esri map error boundaries
export const mapErrorBoundaryMessage = (
  <p>
    The map is not available. Please{' '}
    <a
      href="https://www.epa.gov/waterdata/forms/contact-us-about-hows-my-waterway"
      target="_blank"
      rel="noopener noreferrer"
    >
      notify the site administrator
    </a>
    .
  </p>
);

// message displayed for individual tab error boundaries
export const tabErrorBoundaryMessage = (tabName) => (
  <p>
    The {tabName} tab data is unavailable at this time. Please{' '}
    <a
      href="https://www.epa.gov/waterdata/forms/contact-us-about-hows-my-waterway"
      target="_blank"
      rel="noopener noreferrer"
    >
      notify the site administrator
    </a>
    .
  </p>
);

// global error message for something that isn't a tab or map error
export const defaultErrorBoundaryMessage = (
  <p>
    Something went wrong. Return to the <a href="/">homepage</a>.
  </p>
);
