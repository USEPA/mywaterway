export type EditsType = {
  count: number;
  edits: (ScenarioEditsType | LayerEditsType)[];
};

export type EditType =
  | 'add'
  | 'update'
  | 'delete'
  | 'arcgis'
  | 'properties'
  | 'move';

export type TableType = {
  id: number; // esri layer id
  sampleTypes: any; // <sample type name>: { attributes: any };
};

export type ScenarioEditsType = {
  type: 'scenario';
  id: number; // scenario layer id
  pointsId: number;
  layerId: string; // id from esri group layer
  portalId: string; // id from portal layer
  name: string; // layer/scenario name
  label: string; // layer/scenario label
  value: string; // layer/scenario value for React-Select
  layerType: LayerTypeName; // type of hmw layer (sample, contamination, etc.)
  addedFrom: AddedFrom; // how the layer was added (file, url, etc.)
  hasContaminationRan: boolean; // says whether or not contamination hits has been ran
  status: PublishStatus; // publish status
  editType: EditType; // edit type
  visible: boolean; // layer visibility on map
  listMode: 'hide' | 'hide-children' | 'show'; // layer visiblity in legend widget
  scenarioName: string; // user defined scenario name
  scenarioDescription: string; // user defined scenario description  adds: FeatureEditsType[]; // features to add
  layers: LayerEditsType[];
  table: TableType | null;
};

export type LayerEditsType = {
  type: 'layer';
  id: number; // layer id
  pointsId: number;
  uuid: string; // unique id for the layer
  layerId: string; // id from esri layer
  portalId: string; // id from portal layer
  name: string; // layer name
  label: string; // layer label
  layerType: LayerTypeName; // type of hmw layer (sample, contamination, etc.)
  addedFrom: AddedFrom; // how the layer was added (file, url, etc.)
  hasContaminationRan: boolean; // says whether or not contamination hits has been ran
  status: PublishStatus; // publish status
  editType: EditType; // edit type
  visible: boolean; // layer visibility on map
  listMode: 'hide' | 'hide-children' | 'show'; // layer visiblity in legend widget
  sort: number; // sort order for this layer
  adds: FeatureEditsType[]; // features to add
  updates: FeatureEditsType[]; // features to update
  deletes: DeleteFeatureType[]; // features to delete
  published: FeatureEditsType[]; // features as they are on AGOL
};

export type FeatureEditsType = {
  attributes: any;
  geometry: __esri.PolygonProperties;
};

export type DeleteFeatureType = {
  PERMANENT_IDENTIFIER: string;
  GLOBALID: string;
  DECISIONUNITUUID: string;
};

export type ServiceMetaDataType = {
  value: string; // sample type uuid
  label: string; // sample type name
  description: string; // sample type description
  url: string; // url of service
};

export type LayerTypeName =
  | 'Contamination Map'
  | 'Samples'
  | 'Reference Layer'
  | 'Area of Interest'
  | 'VSP'
  | 'Sampling Mask';

export type LayerSelectType = {
  value: LayerTypeName;
  label: LayerTypeName;
};

export type AddedFrom = 'file' | 'sketch' | 'hmw';

export type PublishStatus = 'added' | 'edited' | 'published';

export type LayerType = {
  id: string;
  label: string;
  layer: __esri.Layer;
  requiresFeatureService: boolean;
  toggled: boolean;

  pointsId: number;
  uuid: string;
  layerId: string;
  portalId: string;
  value: string;
  name: string;
  layerType: LayerTypeName;
  editType: EditType;
  visible: boolean;
  listMode: 'hide' | 'hide-children' | 'show';
  sort: number;
  geometryType: string;
  addedFrom: AddedFrom;
  status: PublishStatus;
  sketchLayer: __esri.GraphicsLayer | __esri.FeatureLayer;
  pointsLayer: __esri.GraphicsLayer | null;
  parentLayer: __esri.GroupLayer | null;
};

export type PortalLayerType = {
  id: string;
  type: 'arcgis' | 'hmw';
};

export type UrlLayerType = {
  url: string;
  type: string;
  layerId: string;
};

export type FieldInfos = {
  fieldName: string;
  label: string;
}[];

export type SampleTypeOption = {
  label: string;
  value: string | null;
  serviceId: string;
  status: 'add' | 'edit' | 'delete' | 'published' | 'published-ago';
};

export type SampleTypeOptions = SampleTypeOption[];

export type CodedValue = {
  id: number;
  label: string | number;
  value: string | number;
};

export type Domain = {
  type: 'range' | 'coded' | 'none';
  range: null | {
    min: number;
    max: number;
  };
  codedValues: null | CodedValue[];
};

export type AttributesType = {
  id: number;
  name: string;
  label: string;
  dataType: 'date' | 'double' | 'integer' | 'string' | 'uuid';
  length: null | number;
  domain: null | Domain;
};
