export interface ActionAttributes extends WaterbodyAttributes {
  layerType: 'actions';
  type?: 'Action';
}

export interface AllotmentAttributes {
  PARCEL_NO: string;
  type?: 'Allotment';
}

export interface AnnualStationData {
  uniqueId: string;
  stationTotalMeasurements: number;
  stationTotalSamples: number;
  stationTotalsByCharacteristic: { [characteristic: string]: number };
  stationTotalsByGroup: { [group: string]: number };
  stationTotalsByLabel: { [label: string]: number };
}

export interface ChangeLocationAttributes {
  changelocationpopup: 'changelocationpopup';
}

export type ClickedHucState =
  | { status: 'fetching' | 'no-data' | 'none' | 'failure'; data: null }
  | { status: 'success'; data: { huc12: string; watershed: string } };

export interface CongressionalDistrictAttributes {
  CDFIPS: string;
  DISTRICTID: string;
  STATE_ABBR: string;
}

export interface CountyAttributes {
  CNTY_FIPS: string;
  STATE_NAME: string;
}

export interface DischargerAttributes {
  CWPName: string;
}

export interface EjScreenAttributes {
  T_OVR64PCT: string;
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

export interface Feature {
  graphic: __esri.Graphic;
}

interface FetchEmptyState {
  status: 'empty' | 'idle' | 'fetching' | 'failure' | 'pending';
  data: {} | [] | null;
}

interface FetchSuccessState<Type> {
  status: 'success';
  data: Type;
}

export type FetchState<Type> = FetchEmptyState | FetchSuccessState<Type>;

export interface ExtendedGraphic extends __esri.Graphic {
  originalGeometry?: __esri.Geometry;
}

export interface ExtendedLayer extends __esri.Layer {
  parent?: __esri.Layer | __esri.Map;
}

export interface MonitoringFeatureUpdate {
  stationTotalMeasurements: number;
  stationTotalsByGroup: { [group: string]: number };
  timeframe: [number, number];
}

export type MonitoringFeatureUpdates = {
  [locationId: string]: MonitoringFeatureUpdate;
} | null;

export interface MonitoringLocationAttributes {
  monitoringType: 'Past Water Conditions';
  siteId: string;
  orgId: string;
  orgName: string;
  locationLongitude: number;
  locationLatitude: number;
  locationName: string;
  locationType: string;
  locationUrl: string;
  stationDataByYear: { [year: string | number]: AnnualStationData } | null;
  stationProviderName: string;
  stationTotalSamples: number;
  stationTotalMeasurements: number;
  stationTotalsByGroup: { [groups: string]: number };
  stationTotalsByLabel: { [label: string]: number } | null;
  timeframe: [number, number] | null;
  uniqueId: string;
}

export interface MonitoringLocationGroups {
  [label: string]: {
    label: string;
    characteristicGroups: Array<string>;
    stations: MonitoringLocationAttributes[];
    toggled: boolean;
  };
}

export interface MonitoringLocationsData {
  features: {
    geometry: {
      coordinates: [number, number];
      type: 'Point';
    };
    properties: {
      CountyName: string;
      HUCEightDigitCode: string;
      MonitoringLocationIdentifier: string;
      MonitoringLocationName: string;
      MonitoringLocationTypeName: string;
      OrganizationFormalName: string;
      OrganizationIdentifier: string;
      ProviderName: string;
      ResolvedMonitoringLocationTypeName: string;
      StateName: string;
      activityCount: string;
      characteristicGroupResultCount: {
        Physical: number;
      };
      resultCount: string;
      siteUrl: string;
    };
    type: 'Feature';
  }[];
  type: 'FeatureCollection';
}

export interface NonProfitAttributes {
  Name?: string;
  type: 'nonprofit';
}

export type ParentLayer = __esri.GroupLayer | SuperLayer;

export type PopupAttributes =
  | ActionAttributes
  | AllotmentAttributes
  | ChangeLocationAttributes
  | CongressionalDistrictAttributes
  | CountyAttributes
  | DischargerAttributes
  | EjScreenAttributes
  | MonitoringLocationAttributes
  | NonProfitAttributes
  | ProtectedAreaAttributes
  | TribeAttributes
  | UpstreamWatershedAttributes
  | UsgsStreamgageAttributes
  | VillageAttributes
  | WaterbodyAttributes
  | WildScenicRiverAttributes
  | WsioHealthIndexAttributes;

export interface ProtectedAreaAttributes {
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
  measurement: number | null;
  datetime: string;
  dailyAverages: Array<{ measurement: number; date: Date }>;
  unitAbbr: string;
  unitName: string;
  multiple?: boolean;
}

export type SuperLayer =
  | __esri.BuildingSceneLayer
  | __esri.KMLLayer
  | __esri.MapImageLayer
  | __esri.SubtypeGroupLayer
  | __esri.TileLayer
  | __esri.WMSLayer
  | __esri.WMTSLayer;

export interface TribeAttributes {
  TRIBE_NAME: string;
}

export interface UpstreamWatershedAttributes {
  xwalk_huc12: string;
}

export interface UsgsStreamgageAttributes {
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

export interface UsgsDailyAveragesData {
  allParamsMean: UsgsPrecipitationData;
  precipitationSum: UsgsPrecipitationData;
}

export interface UsgsPrecipitationData {
  declaredType: 'org.cuahsi.waterml.TimeSeriesResponseType';
  globalScope: true;
  name: 'ns1:timeSeriesResponseType';
  nil: false;
  scope: 'javax.xml.bind.JAXBElement$GlobalScope';
  typeSubstituted: false;
  value: {
    queryInfo: Object;
    timeSeries: {
      name: string;
      sourceInfo: {
        siteName: string;
        siteCode: [
          {
            agencyCode: string;
            network: string;
            value: string; // number
          },
        ];
        timeZoneInfo: Object;
        geoLocation: Object;
        note: [];
        siteType: [];
        siteProperty: Object[];
      };
      values: {
        censorCode: [];
        method: [Object];
        offset: [];
        qualifier: [Object];
        qualityControlLevel: [];
        sample: [];
        source: [];
        value: [
          {
            dateTime: string; // ISO format datetime
            qualifiers: ['P'];
            value: string; // number
          },
        ];
      }[];
      variable: {
        noDataValue: number;
        note: [];
        oid: string;
        options: Object;
        unit: Object;
        valueType: string;
        variableCode: {
          default: boolean;
          network: string;
          value: string;
          variableID: number;
          vocabulary: string;
        }[];
        variableDescription: string;
        variableName: string;
        variableProperty: [];
      };
    }[];
  };
}

export interface UsgsStreamgagesData {
  value: {
    name: string;
    properties: {
      active: boolean;
      agency: string;
      agencyCode: string;
      hydrologicUnit: string;
      monitoringLocationName: string;
      monitoringLocationNumber: string;
      monitoringLocationType: string;
      monitoringLocationUrl: string;
    };
    Locations: {
      location: {
        coordinates: [number, number];
        type: 'Point';
      };
    }[];
    Datastreams: {
      description: string;
      properties: {
        ParameterCode: string;
        WebDescription: string;
      };
      unitOfMeasurement: {
        name: string;
        symbol: string;
      };
      Observations: {
        phenomenonTime: string; // ISO format datetime
        result: string; // number
      }[];
    }[];
  }[];
}

export interface VillageAttributes extends TribeAttributes {
  NAME: string;
}

export interface WaterbodyAttributes {
  assessmentunitidentifier: string;
  assessmentunitname: string;
  organizationid: string;
  orgtype: string;
  overallstatus: string;
}

export interface WidgetLayer extends __esri.Layer {
  portalItem?: __esri.PortalItem;
}

export interface WildScenicRiverAttributes {
  WSR_RIVER_NAME: string;
}

export interface WsioHealthIndexAttributes {
  NAME_HUC12: string;
  PHWA_HEALTH_NDX_ST: string;
}
