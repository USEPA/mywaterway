export interface ActionAttributes extends WaterbodyAttributes {
  layerType: 'actions';
  type?: 'Action';
}

export interface AllotmentAttributes {
  PARCEL_NO: string;
  type?: 'Allotment';
}

export interface AnnualStationData {
  characteristicsByGroup: { [group: string]: string[] };
  uniqueId: string;
  totalMeasurements: number;
  totalSamples: number;
  totalsByCharacteristic: { [characteristic: string]: number };
  totalsByGroup: { [group: string]: number };
  totalsByLabel: { [label: string]: number };
}

interface AssessmentUseAttainment {
  agencyCode: string;
  assessmentMetadata?: {
    assessmentActivity?: {
      assessmentDate: string;
      assessorName?: string;
    };
    assessmentBasisCode?: string;
    assessmentMethodTypes: {
      methodTypeCode: string;
      methodTypeContext: string;
      methodTypeName: string;
    }[];
    assessmentTypes?: {
      assessmentConfidenceCode: string;
      assessmentTypeCode: string;
    }[];
    monitoringActivity?: {
      monitoringEndDate?: string;
      monitoringStartDate?: string;
    };
  };
  threatenedIndicator: string;
  trendCode?: string;
  useAttainmentCode: string;
  useAttainmentCodeName: string;
  useName: string;
}

export interface AssessmentUseAttainmentByGroup {
  [useGroup: string]: AssessmentUseAttainment[];
}

export type AssessmentUseAttainmentState =
  | { status: 'fetching'; data: null }
  | { status: 'failure'; data: null }
  | { status: 'success'; data: AssessmentUseAttainmentByGroup };

export interface ChangeLocationAttributes {
  changelocationpopup: 'changelocationpopup';
}

export type ClickedHucState =
  | { status: 'fetching' | 'no-data' | 'none' | 'failure'; data: null }
  | { status: 'success'; data: WatershedAttributes };

export interface CongressionalDistrictAttributes {
  CDFIPS: string;
  DISTRICTID: string;
  STATE_ABBR: string;
}

export interface CountyAttributes {
  CNTY_FIPS: string;
  STATE_NAME: string;
}

export interface CyanWaterbodyAttributes {
  AREASQKM: number;
  FID: number;
  geometry: __esri.Polygon;
  GNIS_NAME: string;
  locationName: string;
  monitoringType: 'Blue-Green Algae';
  oid: number;
  orgName: 'Cyanobacteria Assessment Network (CyAN)';
}

export interface DischargerAttributes {
  CWPFormalEaCnt: string | null;
  CWPInspectionCount: string | null;
  CWPName: string;
  CWPPermitStatusDesc: string;
  CWPPermitTypeDesc: string;
  CWPSNCStatus: string | null;
  CWPStatus: string;
  FacLat: string;
  FacLong: string;
  PermitComponents: string | null;
  RegistryID: string;
  SourceID: string;
  uniqueId: string;
}

export interface DischargerPermitComponents {
  [label: string]: {
    label: string;
    dischargers: DischargerAttributes[];
    toggled: boolean;
  };
}

export interface EjScreenAttributes {
  T_OVR64PCT: string;
}

export interface Feature {
  graphic: __esri.Graphic;
}

interface FetchEmptyState {
  status: FetchEmptyStatus;
  data: {} | [] | null;
}

type FetchEmptyStatus = 'empty' | 'idle' | 'fetching' | 'failure' | 'pending';

export interface FetchSuccessState<Type> {
  status: 'success';
  data: Type;
}

export type FetchState<Type> = FetchEmptyState | FetchSuccessState<Type>;

export type FetchStateWithDefault<Type> = {
  status: Exclude<FetchStatus, 'empty' | 'fetching'>;
  data: Type;
};

export type FetchStatus = FetchEmptyStatus | 'success';

export type EffluentToggleObject = {
  compliant: boolean;
  violating: boolean;
};

export interface ExtendedGraphic extends __esri.Graphic {
  originalGeometry?: __esri.Geometry;
}

export interface Huc12SummaryData {
  count: number;
  items: {
    assessedCatchmentAreaPercent: number;
    assessedCatchmentAreaSqMi: number;
    assessedGoodCatchmentAreaPercent: number;
    assessedGoodCatchmentAreaSqMi: number;
    assessedUnknownCatchmentAreaPercent: number;
    assessedUnknownCatchmentAreaSqMi: number;
    assessmentUnitCount: number;
    assessmentUnits: {
      assessmentUnitId: string;
    }[];
    containImpairedWatersCatchmentAreaPercent: number;
    containImpairedWatersCatchmentAreaSqMi: number;
    containRestorationCatchmentAreaPercent: number;
    containRestorationCatchmentAreaSqMi: number;
    huc12: string;
    summaryByIRCategory: {
      assessmentUnitCount: number;
      catchmentSizePercent: number;
      catchmentSizeSqMi: number;
      epaIRCategoryName: string;
    }[];
    summaryByParameterImpairments: {
      assessmentUnitCount: number;
      catchmentSizePercent: number;
      catchmentSizeSqMi: number;
      parameterGroupName: string;
    }[];
    summaryByUse: {
      useAttainmentSummary: {
        assessmentUnitCount: number;
        catchmentSizePercent: number;
        catchmentSizeSqMi: number;
        useAttainment: string;
      }[];
      useGroupName: string;
      useName: string;
    }[];
    summaryByUseGroup: {
      useAttainmentSummary: {
        assessmentUnitCount: number;
        catchmentSizePercent: number;
        catchmentSizeSqMi: number;
        useAttainment: string;
      }[];
      useGroupName: string;
    }[];
    summaryRestorationPlans: {
      assessmentUnitCount: number;
      catchmentSizePercent: number;
      catchmentSizeSqMi: number;
      summaryTypeName: string;
    }[];
    summaryVisionRestorationPlans: {
      assessmentUnitCount: number;
      catchmentSizePercent: number;
      catchmentSizeSqMi: number;
      summaryTypeName: string;
    }[];
    totalCatchmentAreaSqMi: number;
    totalHucAreaSqMi: number;
  }[];
}

export type ImpairmentFields = {
  value: string;
  parameterGroup: string;
  label: string;
  term: string;
  sentence: JSX.Element | null;
}[];

export type LookupFile = {
  status: 'fetching' | 'success' | 'failure';
  data: any;
};

export interface MonitoringFeatureUpdate {
  characteristicsByGroup: { [group: string]: string[] };
  totalMeasurements: number;
  totalsByCharacteristic: { [characteristic: string]: number };
  totalsByGroup: { [group: string]: number };
  timeframe: [number, number];
}

export type MonitoringFeatureUpdates = {
  [locationId: string]: MonitoringFeatureUpdate;
} | null;

export interface MonitoringLocationAttributes {
  characteristicsByGroup: { [group: string]: string[] };
  county: string;
  monitoringType: 'Past Water Conditions';
  siteId: string;
  orgId: string;
  orgName: string;
  locationLongitude: number;
  locationLatitude: number;
  locationName: string;
  locationType: string;
  locationUrl: string;
  locationUrlPartial: string;
  state: string;
  dataByYear: { [year: string | number]: AnnualStationData };
  providerName: string;
  totalSamples: number;
  totalMeasurements: number;
  totalsByCharacteristic: { [characteristic: string]: number };
  totalsByGroup: { [group: string]: number };
  totalsByLabel: { [label: string]: number };
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
  features: Array<{
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
  }>;
  type: 'FeatureCollection';
}

export type MonitoringYearsRange = [number, number];

export interface NonProfitAttributes {
  Name?: string;
  type: 'nonprofit';
}

export type ParameterToggleObject = { [key: string]: boolean };

export type ParentLayer = __esri.GroupLayer | SuperLayer;

export type PermittedDischargersData = {
  Results:
    | {
        BadSystemIDs: null;
        BioCVRows: string;
        BioV3Rows: string;
        CVRows: string;
        FEARows: string;
        Facilities: DischargerAttributes[];
        INSPRows: string;
        IndianCountryRows: string;
        InfFEARows: string;
        Message: string;
        PageNo: string;
        QueryID: string;
        QueryRows: string;
        SVRows: string;
        TotalPenalties: string;
        V3Rows: string;
        Version: string;
      }
    | {
        Error: {
          ErrorMessage: string;
        };
      };
};

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
  | StorageTankAttributes
  | TribeAttributes
  | UpstreamWatershedAttributes
  | UsgsStreamgageAttributes
  | VillageAttributes
  | WaterbodyAttributes
  | WatershedAttributes
  | WildScenicRiverAttributes
  | WsioHealthIndexAttributes
  | CyanWaterbodyAttributes;

export interface ProtectedAreaAttributes {
  GAPCdSrc: string;
  Loc_Nm: string;
}

export interface ServicesData {
  attains: { serviceUrl: string };
  cyan: {
    application: string;
    cellConcentration: string;
    dataDownload: string;
    images: string;
    properties: string;
    waterbodies: string;
  };
  echoNPDES: {
    getFacilities: string;
    metadata: string;
  };
  printService: string;
  upstreamWatershed: string;
  usgsDailyValues: string;
  usgsSensorThingsAPI: string;
  usgsWaterAlert: string;
  waterQualityPortal: {
    resultSearch: string;
    userInterface: string;
    monitoringLocation: string;
  };
  wbd: string;
}

export type ServicesState =
  | { status: 'fetching'; data: null }
  | { status: 'failure'; data: string }
  | { status: 'success'; data: ServicesData };

export type StorageTankAttributes = {
  Closed_USTs: number;
  Facility_ID: string;
  Name: string;
  Open_USTs: number;
  TOS_USTs: number;
};

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
  monitoringType: 'USGS Sensors';
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
  uniqueId: string;
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

export type WaterbodyCondition =
  | 'good'
  | 'polluted'
  | 'unassessed'
  | 'nostatus'
  | 'hidden';

interface PortalLayer extends __esri.Layer {
  portalItem?: __esri.PortalItem;
}

export type PortalLayerTypes =
  | 'Feature Service'
  | 'Image Service'
  | 'KML'
  | 'Map Service'
  | 'Vector Tile Service'
  | 'WMS';

export interface WatershedAttributes {
  areaacres: number;
  areasqkm: number;
  huc12: string;
  name: string;
}

export type WidgetLayer =
  | {
      type: 'portal';
      layerType: PortalLayerTypes;
      id: string;
      layer: PortalLayer;
      url: string;
    }
  | {
      type: 'url';
      layer: __esri.Layer;
      layerType: string;
      url: string;
      urlType: 'ArcGIS' | 'CSV' | 'GeoRSS' | 'KML' | 'WCS' | 'WFS' | 'WMS';
    }
  | {
      type: 'file';
      fields: __esri.FieldProperties[];
      layer: __esri.Layer;
      layerId: string;
      layerType?: string;
      objectIdField: string;
      outFields: string[];
      popupTemplate: __esri.PopupTemplateProperties;
      renderer: __esri.RendererProperties;
      source: __esri.Graphic[];
      title: string;
      rawLayer: any;
    };

export interface WildScenicRiverAttributes {
  WSR_RIVER_NAME: string;
}

export interface WsioHealthIndexAttributes {
  NAME_HUC12: string;
  PHWA_HEALTH_NDX_ST: string;
}
