import React from 'react';

// Community errors //

// echodata.epa.gov - Permitted Discharger Service
export const echoError =
  'The permitted discharger information is temporarily unavailable, please try again later.';

// cyan.epa.gov
export const cyanError =
  'CyAN data is temporarily unavailable, please try again later.';

// labs.waterdata.usgs.gov - Monitoring Location Service
export const streamgagesError =
  'USGS streamgage information is temporarily unavailable, please try again later.';

// waterqualitydata.us - Monitoring Location Service
export const monitoringError =
  'Sample locations information is temporarily unavailable, please try again later.';

// waterqualitydata.us - Result Search (downloads)
export const monitoringDownloadError =
  'There was an error downloading the monitoring location data, please try again later.';

// attains.epa.gov - Huc12summary Service
export const huc12SummaryError =
  'Waterbody information is temporarily unavailable, please try again later.';

// message show on the Community page when number of assessed waterbodies is 0
export const zeroAssessedWaterbodies = (watershed, type = 'watershed') =>
  `There are no waterbodies assessed in the ${watershed} ${type}.`;

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

// services.arcgis.com - County Service - County (providers)
export const countyError =
  'The county drinking water provider information is temporarily unavailable, please try again later.';

// sdwis.epa.gov - County Service - Watershed (withdrawers)
export const withdrawerError =
  'The drinking water withdrawer information for this watershed is temporarily unavailable, please try again later.';

// grts.epa.gov - GRTS Service for protect tab
export const protectNonpointSourceError =
  'The protection projects are temporarily unavailable, please try again later.';

// grts.epa.gov - GRTS Service for restore tab
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

// usgs.gov - for protect tab
export const protectedAreasDatabaseError =
  'The Protected Areas Database is temporarily unavailable, please try again later.';

// Wild and Scenic Rivers - for protect tab
export const wildScenicRiversError =
  'The Wild and Scenic Rivers data is temporarily unavailable, please try again later.';

// gispub WSIO - for protect tab
export const wsioHealthIndexError =
  'The WSIO Health Index data is temporarily unavailable, please try again later.';

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

// sdwis.epa.gov GRPA service
export const grpaError =
  'The EPA Drinking Water Performance and Results information is temporarily unavailable, please try again later.'; // also used on state page

// State errors //

// for where ATTAINS usesStateSummaryService response is an internal error or missing data for a state
export const usesStateSummaryServiceInvalidResponse = (source, name) =>
  `There is no ${source}-level assessment data available${
    name && ' for ' + name
  }.`; // add conditional check for stateName as it is sometimes undefined

// attains state document service
export const stateDocumentError = (stateName, type) =>
  `${stateName} ${type} documents are temporarily unavailable, please try again later.`;

export const stateDocumentSortingError =
  'There was an issue sorting the below documents. Because of this, the documents have been sorted alphabetically on document type.';

// this message is displayed in the State Survey Use section when the Survey service is down
export const stateSurveySectionError = (source) =>
  `${source} survey information is temporarily unavailable, please try again later.`;

// this message is displayed in the State Documents accordion when the Survey service is down
export const stateSurveyError = (stateName) =>
  `${stateName} survey documents are temporarily unavailable, please try again later.`;

// attains state list service
export const stateListError = (source) =>
  `${source} list information is temporarily unavailable, please try again later.`;

// grts.epa.gov stories service
export const stateStoriesError =
  'State water stories are temporarily unavailable, please try again later.';

// if one of the main State services goes down and there is no data to display
export const stateGeneralError = (source = 'State') =>
  `${source} information is temporarily unavailable, please try again later.`;

// if an invalid state is entered
export const stateNoDataError = (stateName) =>
  `No data available${stateName && ' for ' + stateName}.`; // conditionals in case state name is undefined or an empty string

export const stateNoGisDataError = (stateName) =>
  `No map data available${stateName && ' for ' + stateName}.`; // conditionals in case state name is undefined or an empty string

export const status303dError =
  'There was an issue looking up the 303(d) List Status code. Because of this, the status code may not look familiar.';

export const status303dShortError = 'Error getting 303(d) List Status';

export const yearLastReportedShortError = 'Error getting Year Last Reported';

// this message is displayed in the State metrics section and more information section when the metrics service is down
export const stateMetricsError = (source) =>
  `${source} metrics information is temporarily unavailable, please try again later.`;

// geopub.epa.gov - Tribal Service
export const tribalBoundaryErrorMessage =
  'Tribal boundary information is temporarily unavailable, please try again later.';

// Waterbody Report errors //
export const waterbodyReportError = (type) =>
  `${type} information is temporarily unavailable, please try again later.`; // where type is 'Assessment unit', 'Assessment', or 'Plans'

// Attains Parameter Mapping Errors
export const attainsParameterServiceError =
  'Parameter information is temporarily unavailable, please try again later.';

// WatersGEO Fishing Advisory Service Error
export const fishingAdvisoryError =
  'Fishing Advisory information is not available at this time. Please try again later.';

// Add Data Widget //
export const webServiceErrorMessage = 'An error occurred in the web service';

export const unsupportedLayerMessage = (layerType) =>
  `The "${layerType}" layer type is unsupported`;

export const urlAlreadyAddedMessage = (url) =>
  `The "${url}" has already been added. If you want to change the type, please remove the layer first and re-add it.`;

export const urlLayerFailureMessage = (url) =>
  `Failed to add the layer at the following url: ${url}`;

export const urlLayerSuccessMessage =
  'The layer was successfully added to the map';

export const fileReadErrorMessage = (filename) =>
  `Failed to read the ${filename} file. Check the console log for details.`;

export const importErrorMessage = 'Unable to import this dataset.';

export const invalidFileTypeMessage = (filename) =>
  `${filename} is an invalid file type. The accepted file types are .zip, .csv, .kml, .gpx, .goe.json and .geojson`;

export const noDataMessage = (filename) =>
  `The ${filename} file did not have any data to display on the map`;

export const uploadSuccessMessage = (filename, layerName = '') => {
  return filename === layerName
    ? `"${filename}" was successfully uploaded`
    : `"${filename}" was successfully uploaded as "${layerName}"`;
};

// Legend //
export const legendUnavailableError = (layerName) =>
  `The legend for ${layerName} is temporarily unavailble, please try again later.`;

// Error Boundaries //
export const servicesLookupServiceError =
  "How's My Waterway is temporarily unavailable, please try again later.";

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

export const dataContentError = (
  <>
    Information about data used in <em>How's My Waterway</em> is temporarily
    unavailable, please try again later.
  </>
);

// message displayed when the Esri map fails to load due to incompatible browsers and devices
export const esriMapLoadingFailure = `The How's My Waterway Map is unavailable. Your web browser is
incompatible or outdated.`;

export const educatorContentError =
  'Educator materials are temporarily unavailable, please try again later.';
