export interface Action extends Waterbody {
  layerType: 'actions';
}

export interface Allotment {
  PARCEL_NO: string;
}

export interface AnnualStationData {
  uniqueId: string;
  stationTotalMeasurements: number;
  stationTotalSamples: number;
  stationTotalsByCharacteristic: { [characteristic: string]: number };
  stationTotalsByGroup: { [group: string]: number };
  stationTotalsByLabel: { [label: string]: number };
}

export type ClickedHucState =
  | { status: 'fetching' | 'no-data' | 'none' | 'failure'; data: null }
  | { status: 'success'; data: { huc12: string; watershed: string } };

export interface CongressionalDistrict {
  CDFIPS: string;
  DISTRICTID: string;
  STATE_ABBR: string;
}

export interface County {
  CNTY_FIPS: string;
  STATE_NAME: string;
}

export interface Discharger {
  CWPName: string;
}

export interface EjScreen {
  T_OVR64PCT: string;
}

export interface EventHandler {
  remove: () => void;
}

export interface Facility {
  CWPName: string;
  CWPNAICSCodes: string | null;
  E90Exceeds1yr?: string;
  FacLat: string;
  FacLong: string;
  CWPPermitStatusDesc: string;
  CWPStatus: string;
  CWPSNCStatus: string | null;
  CWPQtrsWithNC: string;
  CWPViolStatus: string;
  CWPInspectionCount: string | null;
  CWPFormalEaCnt: string | null;
  Over80CountUs: string;
  RegistryID: string;
  SourceID: string;
}

export interface Feature extends __esri.Graphic {
  layer: Layer;
}

export interface Layer extends __esri.Layer {
  parent?: __esri.Layer;
  renderer?: {
    classBreakInfos?: Array<{
      minValue: number;
      maxValue: number;
      symbol: Object;
    }>;
    defaultSymbol?: Object;
    field?: string;
    field2?: string;
    field3?: string;
    fieldDelimiter?: string;
    symbol: Object;
    type: string;
    uniqueValueInfos?: Array<{ value: string; symbol: Object }>;
  };
}

export interface MonitoringFeatureUpdate {
  stationTotalMeasurements: number;
  stationTotalsByGroup: { [group: string]: number };
  timeframe: [number, number];
}

export type MonitoringFeatureUpdates = {
  [locationId: string]: MonitoringFeatureUpdate;
} | null;

export interface MonitoringLocation {
  monitoringType: 'Past Water Conditions';
  siteId: string;
  orgId: string;
  orgName: string;
  locationLongitude: number;
  locationLatitude: number;
  locationName: string;
  locationType: string;
  locationUrl: string;
  stationDataByYear?: { [year: string | number]: AnnualStationData };
  stationProviderName: string;
  stationTotalSamples: number;
  stationTotalMeasurements: number;
  stationTotalsByGroup: { [groups: string]: number };
  stationTotalsByLabel: { [label: string]: number };
  timeframe: [number, number] | null;
  uniqueId: string;
}

export interface NonProfit {
  Name?: string;
  type: 'nonprofit';
}

export type ParentLayer =
  | __esri.GroupLayer
  | __esri.MapImageLayer
  | __esri.TileLayer;

export type PopupAttributes =
  | Action
  | Allotment
  | CongressionalDistrict
  | County
  | Discharger
  | EjScreen
  | MonitoringLocation
  | NonProfit
  | ProtectedArea
  | Tribe
  | UsgsStreamgage
  | Village
  | Waterbody
  | WildScenicRiver
  | WsioHealthIndex;

export interface ProtectedArea {
  GAPCdSrc: string;
  Loc_Nm: string;
}

export interface ScaledLayer extends __esri.Layer {
  minScale?: number;
  maxScale?: number;
}

interface ServicesData {
  attains: { serviceUrl: string };
  upstreamWatershed: string;
  waterQualityPortal: {
    resultSearch: string;
    userInterface: string;
  };
}

export type ServicesState =
  | { status: 'fetching'; data: null }
  | { status: 'failure'; data: string }
  | { status: 'success'; data: ServicesData };

export interface StreamgageMeasurement {
  parameterCategory: string;
  parameterOrder: number;
  parameterName: string;
  parameterUsgsName: string;
  parameterCode: string;
  measurement: number;
  datetime: string;
  dailyAverages: Array<{ measurement: number; date: Date }>;
  unitAbbr: string;
  unitName: string;
  multiple?: boolean;
}

export interface Tribe {
  TRIBE_NAME: string;
}

export interface UsgsStreamgage {
  monitoringType: 'Current Water Conditions';
  siteId: string;
  orgId: string;
  orgName: string;
  locationLongitude: number;
  locationLatitude: number;
  locationName: string;
  locationType: string;
  locationUrl: string;
  streamgageMeasurements: {
    primary: StreamgageMeasurement[];
    secondary: StreamgageMeasurement[];
  };
}

export interface Village extends Tribe {
  NAME: string;
}

export interface Waterbody {
  assessmentunitidentifier: string;
  assessmentunitname: string;
  organizationid: string;
  orgtype: string;
  overallstatus: string;
}

export interface WidgetLayer extends __esri.Layer {
  portalItem?: __esri.PortalItem;
}

export interface WildScenicRiver {
  WSR_RIVER_NAME: string;
}

export interface WsioHealthIndex {
  NAME_HUC12: string;
  PHWA_HEALTH_NDX_ST: string;
}
