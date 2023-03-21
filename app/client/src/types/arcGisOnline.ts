import {
  IFeature,
  ILayer,
  ILayerDefinition,
  IServiceNameAvailable,
} from '@esri/arcgis-rest-types';
import { WidgetLayer } from 'types/index';

export type AddToDefinitionResponseType = {
  layers: {
    id: number;
    layerId?: string | null;
    name: string;
  }[];
  success: boolean;
  tables: {
    id: number;
    name: string;
  }[];
};

export type ApplyEditsParameterType = {
  id?: number;
  adds: IFeature[];
  updates: IFeature[];
  deletes: number[] | number | string[] | string;
};

type ApplyEditsFeatureResultType = {
  globalId?: string | null;
  objectId: number;
  success: boolean;
  uniqueId: number;
};

export type ApplyEditsResponseType = {
  id: number;
  addResults?: ApplyEditsFeatureResultType[];
  deleteResults?: ApplyEditsFeatureResultType[];
  updateResults?: ApplyEditsFeatureResultType[];
};

export type AddItemResponseType = {
  folder: string;
  id: string;
  success: boolean;
};

export type ILayerExtendedType = Partial<ILayer> & {
  disablePopup?: boolean;
  id?: any;
  layerDefinition?: ILayerDefinition;
  layers?: ILayerExtendedType[];
  popupInfo?: any;
  styleUrl?: string;
};

export interface IServiceNameAvailableExtended extends IServiceNameAvailable {
  error?: any;
}

export type LayerType = {
  associatedData?: __esri.FeatureSet | null;
  id: string;
  label: string;
  layer: __esri.Layer;
  requiresFeatureService: boolean;
  toggled: boolean;
  widgetLayer?: WidgetLayer;
};

export type LayersType = {
  [key: string]: LayerType;
};

export type PortalService = {
  access: string;
  accessInformation: any;
  apiKey: string | null;
  applicationProxies: any;
  avgRating: number;
  categories: any[];
  created: Date;
  culture: string;
  description: string | null;
  displayName: string;
  extent: __esri.Extent | null;
  groupCategories: any;
  iconUrl: string;
  id: string;
  isLayer: boolean;
  itemControl: any;
  itemPageUrl: string;
  itemUrl: string;
  licenseInfo: any;
  loadError: any;
  loadStatus: string;
  loadWarnings: any[];
  loaded: boolean;
  modified: Date;
  name: string;
  numComments: number;
  numRatings: number;
  numViews: number;
  owner: string;
  ownerFolder: string | null;
  portal: __esri.Portal;
  screenshots: any[];
  size: number;
  snippet: any;
  sourceJSON: Object;
  spatialReference: __esri.SpatialReference;
  tags: any[];
  thumbnail: any;
  thumbnailUrl: string | null;
  title: string;
  type: string;
  typeKeywords: string[];
  url: string;
  userItemUrl: string;
};

export type ServiceMetaDataType = {
  label: string; // sample type name
  description: string; // sample type description
};
