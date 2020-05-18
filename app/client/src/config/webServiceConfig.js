const wqpURL = 'https://www.waterqualitydata.us/';
const ofmpubURL = 'https://ofmpub.epa.gov/';

export const glossaryURL =
  `https://etss.epa.gov/synaptica_rest_services/api/vocabs/name/` +
  `HMW%20Glossary/terms/full`;

export const waterQualityPortal = {
  stationSearch: `${wqpURL}data/Station/search?`,
  resultSearch: `${wqpURL}data/Result/search?`,
  monitoringLocation: `${wqpURL}data/summary/monitoringlocation/`,
  monitoringLocationDetails: `${wqpURL}provider/`,
};

export const echoNPDES = {
  getFacilities: `${ofmpubURL}echo/cwa_rest_services.get_facilities`,
  metadata: `${ofmpubURL}echo/cwa_rest_services.metadata`,
};

export const dwmaps = {
  getPWSHUC12: `${ofmpubURL}apex/sfdw_rest/GetPWSWMHUC12/`,
  GetPWSWMHUC12FIPS: `${ofmpubURL}apex/sfdw_rest/GetPWSWMHUC12FIPS/`,
  getGPRASummary: `${ofmpubURL}apex/sfdw_rest/GetGPRASummary/`,
  getGPRASystemCountsByType: `${ofmpubURL}apex/sfdw_rest/GetGPRASystemCountsByType/`,
};

export const grts = {
  getGRTSHUC12: `${ofmpubURL}apex/grts_rest/grts_rest_apex/GetProjectsByHUC12/`,
  getSSByState: `${ofmpubURL}apex/grts_rest/grts_rest_apex/GetSSByState/`,
};

export const attains = {
  serviceUrlDev: 'http://54.209.48.156/attains-public/api/',
  serviceUrl: 'https://attains.epa.gov/attains-public/api/',
};

export const fishingInformationService = {
  serviceUrl:
    'https://watersgeo.epa.gov/arcgis/rest/services/NLFA/FISH_GEN/MapServer/13/',
  queryStringFirstPart: 'query?where=IS_DEFAULT%3D%27Y%27+and+STATE+in+%28',
  queryStringSecondPart:
    '%29&outFields=*&returnGeometry=false&returnTrueCurves=false&returnIdsOnly=false&returnCountOnly=false&returnZ=false&returnM=false&returnDistinctValues=false&returnExtentsOnly=false&f=json',
};

export const webServiceMapping = [
  //attains
  {
    wildcardUrl: `${attains.serviceUrl}actions*`,
    name: 'attains - actions',
  },
  {
    wildcardUrl: `${attains.serviceUrl}assessments*&excludeAssessments=Y`,
    name: 'attains - assessments (documents only)',
  },
  {
    wildcardUrl: `${attains.serviceUrl}assessments*`,
    name: 'attains - assessments',
  },
  {
    wildcardUrl: `${attains.serviceUrl}assessmentUnits*`,
    name: 'attains - assessment units',
  },
  {
    wildcardUrl: `${attains.serviceUrl}huc12summary?huc=*`,
    name: 'attains - huc12 summary',
  },
  {
    wildcardUrl: `${attains.serviceUrl}plans?huc=*`,
    name: 'attains - plans',
  },
  {
    wildcardUrl: `${attains.serviceUrl}states`,
    name: 'attains - states',
  },
  {
    wildcardUrl: `${attains.serviceUrl}states/*/organizations`,
    name: 'attains - organizations',
  },
  {
    wildcardUrl: `${attains.serviceUrl}surveys*`,
    name: 'attains - surveys',
  },
  {
    wildcardUrl: `${attains.serviceUrl}usesStateSummary*`,
    name: 'attains - usesStateSummary',
  },
  {
    wildcardUrl: `${attains.serviceUrl}domains?domainName=ParameterName`,
    name: 'attains - domain mapping',
  },
  //ofmpub
  {
    wildcardUrl: `${grts.getGRTSHUC12}*`,
    name: 'ofmpub - nonpoint restoration projects',
  },
  {
    wildcardUrl: `${grts.getSSByState}*`,
    name: 'ofmpub - state water stories',
  },
  {
    wildcardUrl: `${dwmaps.getGPRASummary}*`,
    name: 'ofmpub - GPRA summary',
  },
  {
    wildcardUrl: `${dwmaps.getGPRASystemCountsByType}*`,
    name: 'ofmpub - GPRA system counts by type',
  },
  {
    wildcardUrl: `${dwmaps.getPWSHUC12}*/ZCzc/ZCzc`,
    name: 'ofmpub - drinking water withdrawers',
  },
  {
    wildcardUrl: `${dwmaps.getPWSHUC12}*`,
    name: 'ofmpub - drinking water providers',
  },
  {
    wildcardUrl: `${dwmaps.GetPWSWMHUC12FIPS}*/ZCzc/ZCzc`,
    name: 'ofmpub - drinking water withdrawers',
  },
  {
    wildcardUrl: `${dwmaps.GetPWSWMHUC12FIPS}*`,
    name: 'ofmpub - drinking water providers',
  },
  {
    wildcardUrl: `${echoNPDES.getFacilities}*`,
    name: 'ofmpub - echo get facilities',
  },
  {
    wildcardUrl: `${echoNPDES.metadata}*`,
    name: 'ofmpub - echo metadata',
  },
  //water quality portal
  {
    wildcardUrl:
      `${waterQualityPortal.monitoringLocation}` +
      `search?mimeType=geojson&zip=no&huc=*`,
    name: 'wqp - monitoring locations',
  },
  {
    wildcardUrl:
      `${waterQualityPortal.monitoringLocation}` +
      `search?mimeType=geojson&zip=no&siteid=*`,
    name: 'wqp - monitoring location site specific data',
  },
  {
    wildcardUrl: `${waterQualityPortal.monitoringLocationDetails}*`,
    name: 'wqp - monitoring location details',
  },
  {
    wildcardUrl: `${waterQualityPortal.resultSearch}*`,
    name: 'wqp - result search',
  },
  {
    wildcardUrl: `${waterQualityPortal.stationSearch}*`,
    name: 'wqp - station search',
  },
  //glossary
  {
    wildcardUrl: `*${glossaryURL}`, // handle proxy for now
    name: 'glossary',
  },
  // fishing information service
  {
    wildcardUrl: `${fishingInformationService.serviceUrl}*`,
    name: 'fishing info',
  },
];
