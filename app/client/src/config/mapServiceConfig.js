const watersGeoBase = 'https://gispub.epa.gov/arcgis/rest/services/';

export const locatorUrl =
  '//geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer';

export const wbd =
  'https://watersgeo.epa.gov/arcgis/rest/services/Support/HydrologicUnits/MapServer/6';

export const counties =
  'https://geopub.epa.gov/arcgis/rest/services/NEPAssist/Boundaries/MapServer/6';

export const mappedWater =
  'https://watersgeo.epa.gov/arcgis/rest/services/NHDPlus/NHDPlus/MapServer';

export const nonprofits =
  'https://services7.arcgis.com/RozrT2Mi6zTs0s5F/arcgis/rest/services/Nonprofits_10_24_18/FeatureServer/0/';

export const waterbodyService = {
  points: `${watersGeoBase}OW/ATTAINS_Assessment/MapServer/0`,
  lines: `${watersGeoBase}OW/ATTAINS_Assessment/MapServer/1`,
  areas: `${watersGeoBase}OW/ATTAINS_Assessment/MapServer/2`,
  summary: `${watersGeoBase}OW/ATTAINS_Assessment/MapServer/4`,
};

export const mapServiceMapping = [
  //Attains_Assessment
  {
    wildcardUrl: `${waterbodyService.summary}?f=json`,
    name: 'Attains_Assessment - get map server summary table max record count',
  },
  {
    wildcardUrl: `${waterbodyService.points}*`,
    name: 'Attains_Assessment - map server (points)',
  },
  {
    wildcardUrl: `${waterbodyService.lines}*`,
    name: 'Attains_Assessment - map server (lines)',
  },
  {
    wildcardUrl: `${waterbodyService.areas}*`,
    name: 'Attains_Assessment - map server (areas)',
  },
  {
    wildcardUrl: `${waterbodyService.summary}*`,
    name: 'Attains_Assessment - map server (summary table)',
  },
  {
    wildcardUrl: `${wbd}*`,
    name: 'Attains_Assessment - map server (watershed boundary dataset)',
  },
  {
    wildcardUrl: `${counties}*`,
    name: 'geopub - NEPAssist counties',
  },
  {
    wildcardUrl: `${mappedWater}*`,
    name: 'watersgeo - NHDPluse mapped water',
  },
  // esri
  {
    wildcardUrl: `${locatorUrl}*`,
    name: 'ESRI geocoder',
  },
  {
    wildcardUrl: `${nonprofits}*`,
    name: 'ESRI services7 - Nonprofits',
  },
];
