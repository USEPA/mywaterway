import SpatialReference from '@arcgis/core/geometry/SpatialReference';
import UniqueValueRenderer from '@arcgis/core/renderers/UniqueValueRenderer';
import { v4 as uuid } from 'uuid';
// components
import mapPin from '@/images/pin.png';
// utils
import {
  fetchPostFile,
  fetchPostForm,
  getEnvironmentString,
} from '@/utils/fetchUtils';
import {
  createWaterbodySymbol,
  createUniqueValueInfos,
  hasDefinitionExpression,
  isFeatureLayer,
  isGraphicsLayer,
  isGroupLayer,
} from '@/utils/mapFunctions';
import { escapeForLucene } from '@/utils/utils';
// types
import {
  ILayerDefinition,
  IFeature,
  IFieldInfo,
} from '@esri/arcgis-rest-types';
import {
  AddItemResponseType,
  AddToDefinitionResponseType,
  ApplyEditsParameterType,
  ApplyEditsResponseType,
  ILayerExtendedType,
  IServiceNameAvailableExtended,
  LayerType,
  ServiceMetaDataType,
} from '@/types/arcGisOnline';

declare global {
  interface Window {
    logErrorToGa: Function;
  }
}

type FeatureServiceType = {
  id: string;
  url: string;
};

/**
 * Returns an environment string query parameter to be passed into
 * ESRI web service calls in order to avoid CORS errors.
 *
 * @returns A string to be used as a parameter to ESRI REST services
 *          to avoid CORS errors
 */
export function getEnvironmentStringParam() {
  const environmentStr = getEnvironmentString();
  return environmentStr ? `&${environmentStr}=1` : '';
}

/**
 * Appends the environment specific parameter to the provided
 * parameters, if necessary. This is intended to be used with Esri
 * web services to avoid CORS issues.
 *
 * @param params The web service parameters to append the environment
 *               variable to
 */
export function appendEnvironmentObjectParam(params: any) {
  const environmentStr = getEnvironmentString();
  if (environmentStr) params[environmentStr] = 1;
}

/**
 * Checks if the feature service name is available.
 *
 * @param portal The portal object to check against.
 * @param serviceName The desired feature service name.
 * @returns Promise with availability
 */
export async function isServiceNameAvailable(
  portal: __esri.Portal,
  serviceName: string,
): Promise<IServiceNameAvailableExtended> {
  try {
    // check if the hmw feature service already exists
    const params = {
      f: 'json',
      token: portal.credential.token,
      name: serviceName,
      type: 'Feature Service',
    };
    appendEnvironmentObjectParam(params);

    return await fetchPostForm(
      `${portal.restUrl}/portals/${portal.id}/isServiceNameAvailable`,
      params,
    );
  } catch (err) {
    console.error(err);
    window.logErrorToGa(err);
    throw err;
  }
}

/**
 * Attempts to get the hosted feature service and creates it if
 * it doesn't already exist
 *
 * @param portal The portal object to retreive the hosted feature service from
 * @param serviceMetaData Metadata to be added to the feature service and layers.
 * @returns A promise that resolves to the hosted feature service object
 */
export async function getFeatureService(
  portal: __esri.Portal,
  serviceMetaData: ServiceMetaDataType,
): Promise<FeatureServiceType> {
  try {
    // check if the hmw feature service already exists
    let service = await getFeatureServiceWrapped(portal, serviceMetaData);

    if (service) return service;
    else {
      return await createFeatureService(portal, serviceMetaData);
    }
  } catch (err) {
    window.logErrorToGa(err);
    throw err;
  }
}

/**
 * Gets the hosted feature service and returns null if it it
 * doesn't already exist
 *
 * @param portal The portal object to retreive the hosted feature service from
 * @param serviceMetaData Metadata to be added to the feature service and layers.
 * @returns A promise that resolves to the hosted feature service object or
 *  null if the service does not exist
 */
async function getFeatureServiceWrapped(
  portal: __esri.Portal,
  serviceMetaData: ServiceMetaDataType,
): Promise<FeatureServiceType | null> {
  try {
    const query = `orgid:${escapeForLucene(portal.user.orgId)} AND name:${
      serviceMetaData.label
    }`;
    const queryRes = await portal.queryItems({ query });

    const portalService = queryRes.results.find(
      (layer) => layer.name === serviceMetaData.label,
    );

    if (portalService) {
      return {
        id: portalService.id,
        url: portalService.url,
      };
    } else {
      return null;
    }
  } catch (err) {
    window.logErrorToGa(err);
    throw err;
  }
}

/**
 * Creates and returns the hosted feature service
 *
 * @param portal The portal object to create the hosted feature service on
 * @param serviceMetaData Metadata to be added to the feature service and layers.
 * @returns A promise that resolves to the hosted feature service object
 */
export async function createFeatureService(
  portal: __esri.Portal,
  serviceMetaData: ServiceMetaDataType,
) {
  try {
    // feature service creation parameters
    const data = {
      f: 'json',
      token: portal.credential.token,
      outputType: 'featureService',
      description: serviceMetaData.description,
      snippet: serviceMetaData.description,
      createParameters: {
        name: serviceMetaData.label,
        hasStaticData: false,
        maxRecordCount: 4000,
        supportedQueryFormats: 'JSON',
        capabilities: 'Create,Delete,Query,Update,Editing',
        spatialReference: {
          wkid: 3857,
        },
        allowGeometryUpdates: true,
        units: 'esriMeters',
        xssPreventionInfo: {
          xssPreventionEnabled: true,
          xssPreventionRule: 'InputOnly',
          xssInputRule: 'rejectInvalid',
        },
      },
    };
    appendEnvironmentObjectParam(data);

    // create the feature service
    const createResponse = await fetchPostForm(
      `${portal.user.userContentUrl}/createService`,
      data,
    );

    // Add metadata to the new feature service. This is only here to allow us
    // to bring web maps back into HMW, if that feature is requested.
    // NOTE: It is unfortunate, but we have to do a separate call to update the feature
    // service with metadata. The documentation makes it look like we can add metadata
    // via createService, but this does not work. I looked at the web service requests
    // in the ArcGIS Online portal and found that ESRI is also doing a separate update
    // call to add metadata (tags in this case).
    const indata = {
      f: 'json',
      token: portal.credential.token,

      // add metadata for determining whether a feature service has a sample layer vs
      // just being a reference layer.
      categories: 'contains-epa-hmw-layer',
    };
    appendEnvironmentObjectParam(indata);

    const updateResponse = await fetchPostForm(
      `${portal.user.userContentUrl}/items/${createResponse.itemId}/update`,
      indata,
    );

    if (createResponse.success === true && updateResponse.success === true) {
      return {
        id: createResponse.serviceItemId,
        url: createResponse.serviceurl,
      };
    } else {
      throw new Error('No service');
    }
  } catch (err) {
    window.logErrorToGa(err);
    throw err;
  }
}

/**
 * Converts a field from the ArcGIS JS API object to the ArcGIS REST API json
 * version. Handles the special case of OBJECTID fields, which require extra
 * parameters that may not be included with the feature layer definitions.
 *
 * @param field Esri field object
 * @returns JSON representation of the field
 */
function convertFieldToJSON(field: __esri.Field) {
  const fieldJson = field.toJSON();
  if (fieldJson.type !== 'esriFieldTypeOID') return fieldJson;
  else
    return {
      ...field.toJSON(),
      actualType: 'int',
      sqlType: 'sqlTypeInteger',
      editable: false,
      nullable: false,
    };
}

/**
 * Adds the provided layer to the layersParams to be published.
 * This is primarily used for layers that are split up based on geometry
 * (i.e., waterbodyLayer and issuesLayer).
 *
 * @param layer Feature layer containing the layer definition
 * @param layersParams Parameters for layers being published
 * @param layerProps Properties to be applied to layers
 * @param properties Properties for a specific layer
 * @param overrideName Name to override the layer title
 */
function addSubLayer({
  layer,
  layersParams,
  layerProps,
  properties,
  overrideName,
}: {
  layer: __esri.FeatureLayer;
  layersParams: ILayerDefinition[];
  layerProps: any;
  properties: any;
  overrideName?: string;
}) {
  let geometryType = '';
  if (layer.geometryType === 'point') geometryType = 'esriGeometryPoint';
  if (layer.geometryType === 'multipoint')
    geometryType = 'esriGeometryMultipoint';
  if (layer.geometryType === 'polyline') geometryType = 'esriGeometryPolyline';
  if (layer.geometryType === 'polygon') geometryType = 'esriGeometryPolygon';

  // build the renderer
  const rendererGeometryType = layer.geometryType.replace(
    'multipoint',
    'point',
  );
  const renderer = new UniqueValueRenderer({
    field: 'overallstatus',
    fieldDelimiter: ', ',
    defaultSymbol: createWaterbodySymbol({
      condition: 'unassessed',
      selected: false,
      geometryType: rendererGeometryType,
    }),
    uniqueValueInfos: createUniqueValueInfos(rendererGeometryType),
  });

  layersParams.push({
    ...layerProps.defaultLayerProps,
    ...properties,
    name: overrideName ?? layer.title,
    geometryType,
    globalIdField: layer.globalIdField,
    objectIdField: layer.objectIdField,
    spatialReference: layer.spatialReference.toJSON(),
    fields: layer.fields
      .filter((field) => field.name.toUpperCase() !== 'SHAPE')
      .map(convertFieldToJSON),
    drawingInfo: { renderer: renderer.toJSON() },
    popupTemplate: layer.popupTemplate.toJSON(),
  });
}

/**
 * Used for adding a feature layer to a hosted feature service on
 * ArcGIS Online
 *
 * @param portal The portal object to create feature layers on
 * @param mapView Esri mapView object to get related layers
 * @param serviceUrl The hosted feature service to save layers to
 * @param layers Array of layers to be published
 * @param serviceMetaData Array of service metadata to be added to the layers of a feature service.
 * @param layerProps Properties to be applied to layers
 * @returns A promise that resolves to the layers that were saved
 */
export async function createFeatureLayers(
  portal: __esri.Portal,
  mapView: __esri.MapView,
  serviceUrl: string,
  layers: LayerType[],
  serviceMetaData: ServiceMetaDataType,
  layerProps: any,
) {
  try {
    const layersParams: ILayerDefinition[] = [];
    if (layers.length === 0) {
      return {
        success: true,
        layers: [],
        tables: [],
      };
    }

    // reverse sorting of the layers, so they are ordered correctly
    const layersReversed = [...layers].reverse();

    const layerIds: string[] = [];
    for (const layer of layersReversed) {
      if (!layer.requiresFeatureService) continue;

      const properties =
        layerProps.layerSpecificSettings[layer.layer.id]?.layerProps;

      // handle layers added via file upload
      if (layer.widgetLayer?.type === 'file') {
        layerIds.push(layer.layer.id);
        layersParams.push({
          ...layer.widgetLayer.rawLayer.layerDefinition,
          name: layer.label.replaceAll('.', ' '), // workaround for .zip causing failure
        });
        continue;
      } else if (
        ['boundariesLayer', 'providersLayer'].includes(layer.layer.id)
      ) {
        let refFeatureLayer: __esri.FeatureLayer | null = null;
        if (layer.layer.id === 'boundariesLayer')
          refFeatureLayer = mapView.map.findLayerById(
            'watershedsLayer',
          ) as __esri.FeatureLayer;
        if (layer.layer.id === 'providersLayer')
          refFeatureLayer = mapView.map.findLayerById(
            'countyLayer',
          ) as __esri.FeatureLayer;
        if (!refFeatureLayer) continue;

        layerIds.push(layer.layer.id);
        layersParams.push({
          ...layerProps.defaultLayerProps,
          ...properties,
          name: layer.layer.title,
          globalIdField: refFeatureLayer.globalIdField,
          objectIdField: refFeatureLayer.objectIdField,
          spatialReference: refFeatureLayer.spatialReference.toJSON(),
          fields: refFeatureLayer.fields
            .filter((field) => field.name.toUpperCase() !== 'SHAPE')
            .map(convertFieldToJSON),
        });
        continue;
      } else if (layer.layer.id === 'upstreamLayer' && layer.associatedData) {
        // find the object id field
        const objectIdField = layer.associatedData.fields.find(
          (f) => f.type === 'oid',
        );

        layerIds.push(layer.layer.id);
        layersParams.push({
          ...layerProps.defaultLayerProps,
          ...properties,
          name: layer.layer.title,
          objectIdField: objectIdField?.name,
          spatialReference: layer.associatedData.spatialReference.toJSON(),
          fields: layer.associatedData.fields
            .filter((field) => field.name.toUpperCase() !== 'SHAPE')
            .map(convertFieldToJSON),
        });
        continue;
      } else if (
        ['actionsWaterbodies', 'issuesLayer'].includes(layer.layer.id)
      ) {
        const graphicsLayer = layer.layer as __esri.GraphicsLayer;
        const allWaterbodiesLayer = mapView.map.layers.find(
          (l) => l.id === 'allWaterbodiesLayer',
        ) as __esri.GroupLayer;

        // add the layer id 3 times to cover splitting this layer into 3
        layerIds.push(graphicsLayer.id);
        layerIds.push(graphicsLayer.id);
        layerIds.push(graphicsLayer.id);

        // add areas layer
        const areasLayer = allWaterbodiesLayer.findLayerById(
          'allWaterbodyAreas',
        ) as __esri.FeatureLayer;
        addSubLayer({
          layer: areasLayer,
          layersParams,
          layerProps,
          properties,
          overrideName: `${graphicsLayer.title} Areas`,
        });

        // add lines layer
        const linesLayer = allWaterbodiesLayer.findLayerById(
          'allWaterbodyLines',
        ) as __esri.FeatureLayer;
        addSubLayer({
          layer: linesLayer,
          layersParams,
          layerProps,
          properties,
          overrideName: `${graphicsLayer.title} Lines`,
        });

        // add points layer
        const pointsLayer = allWaterbodiesLayer.findLayerById(
          'allWaterbodyPoints',
        ) as __esri.FeatureLayer;
        addSubLayer({
          layer: pointsLayer,
          layersParams,
          layerProps,
          properties,
          overrideName: `${graphicsLayer.title} Points`,
        });

        continue;
      } else if (layer.layer.id === 'cyanLayer') {
        const groupLayer = layer.layer as __esri.GroupLayer;
        const waterbodiesLayer = groupLayer.findLayerById(
          'cyanWaterbodies',
        ) as __esri.FeatureLayer;

        layerIds.push(groupLayer.id);
        addSubLayer({
          layer: waterbodiesLayer,
          layersParams,
          layerProps,
          properties,
        });

        continue;
      } else if (layer.layer.id === 'waterbodyLayer') {
        // Treat definitionExpression layers (i.e. tribe and state) differently.
        // These will not use hosted feature services, but instead
        // be published directly to the web map with a definitionExpression applied
        if (hasDefinitionExpression(layer.layer)) continue;

        const groupLayer = layer.layer as __esri.GroupLayer;
        const subLayers = groupLayer.layers.toArray() as __esri.FeatureLayer[];
        for (const subLayer of subLayers) {
          layerIds.push(layer.layer.id);
          addSubLayer({
            layer: subLayer,
            layersParams,
            layerProps,
            properties,
          });
        }
        continue;
      }

      layerIds.push(layer.layer.id);

      // get the extent
      let graphicsExtent: __esri.Extent | null = null;
      if (isGraphicsLayer(layer.layer)) {
        layer.layer.graphics.forEach((graphic) => {
          if (graphicsExtent === null) graphicsExtent = graphic.geometry.extent;
          else graphicsExtent.union(graphic.geometry.extent);
        });
      } else if (isFeatureLayer(layer.layer)) {
        graphicsExtent = await layer.layer.queryExtent();
      } else {
        graphicsExtent = layer.layer.fullExtent;
      }

      // add the polygon representation
      let params = {
        ...layerProps.defaultLayerProps,
        ...properties,
        fields: properties.fields,
        name: layer.label,
        extent: graphicsExtent,
      };
      if (layer.layer.id === 'searchIconLayer') {
        params.drawingInfo.renderer.symbol.url = mapPin;
      }

      layersParams.push(params);
    }

    const data = {
      f: 'json',
      token: portal.credential.token,
      addToDefinition: {
        layers: layersParams,
        tables: [
          {
            ...layerProps.defaultTableProps,
            fields: layerProps.defaultReferenceTableFields,
            type: 'Table',
            name: `${serviceMetaData.label}-reference-layers`,
            description: `Links to reference layers for "${serviceMetaData.label}".`,
          },
        ],
      },
    };
    appendEnvironmentObjectParam(data);

    if (layersParams.length === 0) {
      return {
        success: true,
        layers: [],
        tables: [],
      };
    }

    // inject /admin into rest/services to be able to call
    const adminServiceUrl = serviceUrl.replace(
      'rest/services',
      'rest/admin/services',
    );
    const response = (await fetchPostForm(
      `${adminServiceUrl}/addToDefinition`,
      data,
    )) as AddToDefinitionResponseType;

    // add the layer id back into the response
    response.layers.forEach((l, index: number) => {
      l['layerId'] = layerIds[index];
    });

    return response;
  } catch (err) {
    window.logErrorToGa(err);
    throw err;
  }
}

/**
 * Converts a provided layer's graphics/features to an adds array
 * to be passed into the applyEdits service call.
 *
 * @param layer Layer to get graphics/features from
 * @param adds Array to add graphics/features to
 */
async function processLayerFeatures(layer: __esri.Layer, adds: IFeature[]) {
  if (isGraphicsLayer(layer)) {
    layer.graphics.forEach((graphic) => {
      adds.push({
        attributes: graphic.attributes,
        geometry: graphic.geometry?.toJSON(),
      });
    });
  } else if (isFeatureLayer(layer)) {
    const features = await layer.queryFeatures();
    features.features.forEach((feature) => {
      adds.push({
        attributes: feature.attributes,
        geometry: feature.geometry?.toJSON(),
      });
    });
  }
}

/**
 * Applys edits to a layer or layers within a hosted feature service
 * on ArcGIS Online.
 *
 * @param portal The portal object to apply edits to
 * @param services Web service config for getting urls from HMW layers
 * @param serviceUrl The url of the hosted feature service
 * @param layers Array of layers to be published
 * @param layersRes Response of the addToDefinition service call
 * @returns A promise that resolves to the successfully saved objects
 */
async function applyEdits({
  portal,
  services,
  serviceUrl,
  layers,
  layersRes,
}: {
  portal: __esri.Portal;
  services: any;
  serviceUrl: string;
  layers: LayerType[];
  layersRes: AddToDefinitionResponseType;
}): Promise<ApplyEditsResponseType[]> {
  try {
    const changes: ApplyEditsParameterType[] = [];
    for (const layerRes of layersRes.layers) {
      // find the layer
      const layer = layers.find((l) => l.layer.id === layerRes.layerId);
      if (!layer)
        throw new Error(
          `Could not find layer with the "${layerRes.layerId}" id.`,
        );

      let adds: IFeature[] = [];
      if (layer.id === 'waterbodyLayer') {
        const groupLayer = layer.layer as __esri.GroupLayer;
        const subLayers = groupLayer.layers.toArray() as __esri.FeatureLayer[];
        const subLayer = subLayers.find((s) => s.title === layerRes.name);

        if (subLayer) await processLayerFeatures(subLayer, adds);
      } else if (
        ['actionsWaterbodies', 'issuesLayer'].includes(layer.layer.id)
      ) {
        const graphicsLayer = layer.layer as __esri.GraphicsLayer;

        // filter features down to just areas, lines, or points
        // depending on which geometry layer we are adding to
        graphicsLayer.graphics.forEach((g) => {
          if (!g.geometry) return;
          if (
            (layerRes.name === `${layer.label} Areas` &&
              g.geometry.type === 'polygon') ||
            (layerRes.name === `${layer.label} Lines` &&
              g.geometry.type === 'polyline') ||
            (layerRes.name === `${layer.label} Points` &&
              (g.geometry.type === 'point' || g.geometry.type === 'multipoint'))
          ) {
            adds.push({
              attributes: g.attributes,
              geometry: g.geometry.toJSON(),
            });
          }
        });
      } else if (layer.id === 'cyanLayer') {
        const groupLayer = layer.layer as __esri.GroupLayer;
        const subLayer = groupLayer.findLayerById(
          'cyanWaterbodies',
        ) as __esri.FeatureLayer;

        if (subLayer) await processLayerFeatures(subLayer, adds);
      } else if (layer.widgetLayer?.type === 'file') {
        adds = layer.widgetLayer.rawLayer.featureSet.features;
      } else {
        await processLayerFeatures(layer.layer, adds);
      }

      changes.push({
        id: layerRes.id,
        adds,
        updates: [],
        deletes: [],
      });
    }

    const refOutput = buildReferenceLayerTableEdits(
      services,
      layers,
      layersRes,
    );
    changes.push(refOutput.edits);

    // run the webserivce call to update ArcGIS Online
    const data = {
      f: 'json',
      token: portal.credential.token,
      edits: changes,
      honorSequenceOfEdits: true,
      useGlobalIds: true,
    };
    appendEnvironmentObjectParam(data);

    return await fetchPostForm(`${serviceUrl}/applyEdits`, data);
  } catch (err) {
    window.logErrorToGa(err);
    throw err;
  }
}

/**
 * Builds the edits arrays for publishing the sample types layer of
 * the sampling plan feature service.
 *
 * @param services Web service config for getting urls from HMW layers
 * @param layers Array of layers to be published
 * @param layersRes Response of the addToDefinition service call
 * @returns An object containing the edits arrays
 */
function buildReferenceLayerTableEdits(
  services: any,
  layers: LayerType[],
  layersRes: AddToDefinitionResponseType,
) {
  const adds: IFeature[] = [];

  // build the adds, updates, and deletes
  layers.forEach((refLayer, index) => {
    if (refLayer.requiresFeatureService) return;

    // build the adds array
    adds.push({
      attributes: {
        OBJECTID: index,
        LAYERID: refLayer.layer.portalItem?.id || refLayer.id,
        LABEL: refLayer.label,
        LAYERTYPE: refLayer.widgetLayer?.layerType,
        TYPE: refLayer.widgetLayer?.type,
        URL: getLayerUrl(services, refLayer),
        URLTYPE:
          refLayer.widgetLayer?.type === 'url'
            ? refLayer.widgetLayer.urlType
            : '',
      },
    });
  });

  // find the id from the feature service response
  const refLayersTable = layersRes.tables.find(
    (t: { id: number; name: string }) => t.name.endsWith('-reference-layers'),
  );
  if (!refLayersTable)
    throw new Error(`Table ending with "-reference-layers" not found.`);

  return {
    edits: {
      id: refLayersTable.id,
      adds,
      updates: [],
      deletes: [],
    },
  };
}

type AgoLayerType =
  | 'ArcGISFeatureLayer'
  | 'ArcGISImageServiceLayer'
  | 'ArcGISMapServiceLayer'
  | 'ArcGISSceneServiceLayer'
  | 'BuildingSceneLayer'
  | 'CSV'
  | 'GeoRSS'
  | 'IntegratedMeshLayer'
  | 'KML'
  | 'PointCloudLayer'
  | 'VectorTileLayer'
  | 'WMS'
  | 'WCS'
  | 'WFS';

/**
 * Gets the layer type value that the ArcGIS REST API needs from
 * the HMW layer type value.
 *
 * @param layer Object of the reference layer being added
 * @returns AGO Layer type
 */
function getAgoLayerType(layer: LayerType): AgoLayerType | null {
  const layerType = (
    layer.widgetLayer?.layerType ?? layer.layer.type
  ).toLowerCase();

  let layerTypeOut: AgoLayerType | null = null;

  // convert ArcGIS JS types to ArcGIS REST types
  if (layerType === 'feature service') layerTypeOut = 'ArcGISFeatureLayer';
  if (layerType === 'feature') layerTypeOut = 'ArcGISFeatureLayer';
  if (layerType === 'map service') layerTypeOut = 'ArcGISMapServiceLayer';
  if (layerType === 'tile') layerTypeOut = 'ArcGISMapServiceLayer';
  if (layerType === 'map-image') layerTypeOut = 'ArcGISMapServiceLayer';
  if (layerType === 'image service') layerTypeOut = 'ArcGISImageServiceLayer';
  if (layerType === 'imagery') layerTypeOut = 'ArcGISImageServiceLayer';
  if (layerType === 'imagery-tile') layerTypeOut = 'ArcGISImageServiceLayer';
  if (layerType === 'scene') layerTypeOut = 'ArcGISSceneServiceLayer';
  if (layerType === 'integrated-mesh') layerTypeOut = 'IntegratedMeshLayer';
  if (layerType === 'point-cloud') layerTypeOut = 'PointCloudLayer';
  if (layerType === 'building-scene') layerTypeOut = 'BuildingSceneLayer';
  if (layerType === 'csv') layerTypeOut = 'CSV';
  if (layerType === 'geo-rss') layerTypeOut = 'GeoRSS';
  if (layerType === 'kml') layerTypeOut = 'KML';
  if (layerType === 'vector tile service') layerTypeOut = 'VectorTileLayer';
  if (layerType === 'vector-tile') layerTypeOut = 'VectorTileLayer';
  if (layerType === 'wcs') layerTypeOut = 'WCS';
  if (layerType === 'wfs') layerTypeOut = 'WFS';
  if (layerType === 'wms') layerTypeOut = 'WMS';

  // handle layer specific type overrides
  if (['allWaterbodiesLayer', 'waterbodyLayer'].includes(layer.id))
    layerTypeOut = 'ArcGISMapServiceLayer';
  if (layer.id === 'ejscreenLayer') layerTypeOut = 'ArcGISMapServiceLayer';
  if (layer.id === 'tribalLayer') layerTypeOut = 'ArcGISMapServiceLayer';
  if (layer.id === 'watershedsLayer') layerTypeOut = 'ArcGISMapServiceLayer';

  return layerTypeOut;
}

/**
 * Gets the url of the provided layer.
 *
 * @param services Web service config for getting urls from HMW layers
 * @param layer Layer to get the url from
 * @returns Url of the layer
 */
function getLayerUrl(services: any, layer: LayerType): string {
  let url = layer.layer?.url ?? '';
  if (layer.widgetLayer?.type === 'portal') url = layer.widgetLayer.url;
  if (layer.widgetLayer?.type === 'url') url = layer.widgetLayer.url;
  if (['allWaterbodiesLayer', 'waterbodyLayer'].includes(layer.id))
    url = services.waterbodyService.base;
  if (layer.id === 'ejscreenLayer') url = services.ejscreen;
  if (layer.id === 'tribalLayer') url = services.tribal;

  return url;
}

/**
 * Publishes a web map version of the feature service.
 *
 * @param portal The portal object to apply edits to
 * @param mapView Esri mapView object to sort layers as they are in HMW
 * @param service The feature service object
 * @param services Web service config for getting urls from HMW layers
 * @param serviceMetaData The name and description of the service to be saved
 * @param layers Array of layers to be published
 * @param layerProps Properties to be applied to layers
 * @param layersResponse The response from creating layers
 * @returns A promise that resolves to the successfully saved web map
 */
export async function addWebMap({
  portal,
  mapView,
  service,
  services,
  serviceMetaData,
  layers,
  layerProps,
  layersRes,
}: {
  portal: __esri.Portal;
  mapView: __esri.MapView;
  service?: FeatureServiceType;
  services: any;
  serviceMetaData: ServiceMetaDataType;
  layers: LayerType[];
  layerProps?: any;
  layersRes?: AddToDefinitionResponseType;
}): Promise<AddItemResponseType> {
  const itemId = service?.id;
  const baseUrl = service?.url;

  function buildPopupFieldsList(
    objectIdField: string,
    globalIdField: string | null,
    fields: __esri.Field[] | __esri.FieldProperties[],
  ) {
    return fields?.map((field) => ({
      fieldName: field.name,
      label: field.alias,
      visible: true,
      isEditable:
        field.name === objectIdField || field.name === globalIdField
          ? false
          : true,
    }));
  }

  const operationalLayers: ILayerExtendedType[] = [];
  const resourcesParams: any[] = [];
  layers.forEach((l) => {
    const layerType = getAgoLayerType(l) as string;
    const url = getLayerUrl(services, l);
    const layerSettings = layerProps?.layerSpecificSettings[l.layer.id];
    const popupTitle = layerSettings?.popupTitle || '';

    if (layerType === 'VectorTileLayer') {
      operationalLayers.push({
        layerType,
        title: l.label,
        styleUrl: `${url}/resources/styles/root.json`,
      });
    } else if (l.requiresFeatureService) {
      if (!layerProps || !layersRes) return;

      // build fields list
      let popupFields: IFieldInfo[] = [];
      if (l.widgetLayer?.type === 'file') {
        const widgetLayerFile = l.widgetLayer;
        popupFields = buildPopupFieldsList(
          widgetLayerFile.objectIdField,
          widgetLayerFile.rawLayer.layerDefinition?.globalIdField,
          widgetLayerFile.fields,
        );
      } else if (
        ['actionsWaterbodies', 'cyanLayer', 'issuesLayer'].includes(l.id)
      ) {
        // don't do anything for these layers, they will be handeled below
      } else {
        // handle boundaries and providers
        let properties = layerSettings.layerProps;
        if (l.layer.id === 'boundariesLayer')
          properties = mapView.map.findLayerById('watershedsLayer');
        if (l.layer.id === 'providersLayer')
          properties = mapView.map.findLayerById('countyLayer');
        if (l.associatedData) properties = l.associatedData;

        // handle everything else
        popupFields = buildPopupFieldsList(
          properties.objectIdField,
          properties.globalIdField,
          properties.fields,
        );
      }

      const lResponses = layersRes.layers.filter((r) => r.layerId === l.id);
      if (l.id === 'cyanLayer' && lResponses.length > 0) {
        const lRes = lResponses[0];

        const groupLayer = mapView.map.layers.find(
          (sl) => sl.id === 'cyanLayer',
        ) as __esri.GroupLayer;
        const waterbodiesLayer = groupLayer.findLayerById(
          'cyanWaterbodies',
        ) as __esri.FeatureLayer;
        const imagesLayer = groupLayer.findLayerById(
          'cyanImages',
        ) as __esri.MediaLayer;

        const layers: any[] = [];

        // build fields here
        let popupFields: IFieldInfo[] = [];
        if (waterbodiesLayer) {
          popupFields = buildPopupFieldsList(
            waterbodiesLayer.objectIdField,
            waterbodiesLayer.globalIdField,
            waterbodiesLayer.fields,
          );
        }

        layers.push({
          title: lRes.name,
          url: `${baseUrl}/${lRes.id}`,
          itemId,
          layerType: 'ArcGISFeatureLayer',
          disablePopup: false,
          popupInfo: {
            popupElements: [
              {
                type: 'fields',
                description: '',
                fieldInfos: popupFields,
                title: '',
              },
            ],
            fieldInfos: popupFields,
            title: `${lRes.name}${popupTitle}`,
          },
        });

        const imagesSource =
          imagesLayer.source as __esri.LocalMediaElementSource;
        if (imagesSource.elements.length > 0) {
          const element = imagesSource.elements.getItemAt(0);
          const georeference =
            element.georeference as __esri.ControlPointsGeoreference;

          // get the extension from the base64 image and generate a unique filename
          const extension = element.content.src.split(';')[0].split('/')[1];
          const fileName = `${uuid()}.${extension}`;

          layers.push({
            id: imagesLayer.id,
            title: imagesLayer.title,
            layerType: 'MediaLayer',
            mediaType: element.type,
            url: `./resources/media/${fileName}`,
            georeference: {
              controlPoints: georeference.controlPoints.map((p) => {
                return {
                  x: p.mapPoint?.x,
                  y: p.mapPoint?.y,
                };
              }),
              spatialReference: SpatialReference.WebMercator.toJSON(),
              coefficients: (georeference as any).transform,
              height: element.content.height,
              width: element.content.width,
            },
          });

          resourcesParams.push({
            resourcesPrefix: 'media',
            fileName,
            file: element.content.src,
          });
        }

        operationalLayers.push({
          id: l.layer.id,
          title: l.layer.title,
          layerType: 'GroupLayer',
          layers: layers,
        });
      } else if (lResponses.length === 1) {
        lResponses.forEach((lRes) => {
          operationalLayers.push({
            title: lRes.name,
            url: `${baseUrl}/${lRes.id}`,
            itemId,
            layerType: 'ArcGISFeatureLayer',
            disablePopup: false,
            popupInfo: {
              popupElements: [
                {
                  type: 'fields',
                  description: '',
                  fieldInfos: popupFields,
                  title: '',
                },
              ],
              fieldInfos: popupFields,
              title: `${lRes.name}${popupTitle}`,
            },
          });
        });
      } else {
        operationalLayers.push({
          id: l.layer.id,
          title: l.layer.title,
          layerType: 'GroupLayer',
          layers: lResponses.map((lRes) => {
            const layer = isGroupLayer(l.layer)
              ? (l.layer as __esri.GroupLayer).layers.find(
                  (l) => l.title === lRes.name,
                )
              : l.layer;

            // build fields here
            let popupFields: IFieldInfo[] = [];
            if (['actionsWaterbodies', 'issuesLayer'].includes(layer.id)) {
              const graphicsLayer = layer as __esri.GraphicsLayer;
              const allWaterbodiesLayer = mapView.map.layers.find(
                (sl) => sl.id === 'allWaterbodiesLayer',
              ) as __esri.GroupLayer;

              let associatedLayer: __esri.FeatureLayer | null = null;
              if (lRes.name === `${graphicsLayer.title} Areas`) {
                associatedLayer = allWaterbodiesLayer.findLayerById(
                  'allWaterbodyAreas',
                ) as __esri.FeatureLayer;
              } else if (lRes.name === `${graphicsLayer.title} Lines`) {
                associatedLayer = allWaterbodiesLayer.findLayerById(
                  'allWaterbodyLines',
                ) as __esri.FeatureLayer;
              } else if (lRes.name === `${graphicsLayer.title} Points`) {
                associatedLayer = allWaterbodiesLayer.findLayerById(
                  'allWaterbodyPoints',
                ) as __esri.FeatureLayer;
              }

              if (associatedLayer) {
                popupFields = buildPopupFieldsList(
                  associatedLayer.objectIdField,
                  associatedLayer.globalIdField,
                  associatedLayer.fields,
                );
              }
            } else if (isFeatureLayer(layer)) {
              popupFields = buildPopupFieldsList(
                layer.objectIdField,
                layer.globalIdField,
                layer.fields,
              );
            }

            return {
              title: lRes.name,
              url: `${baseUrl}/${lRes.id}`,
              itemId,
              layerType: 'ArcGISFeatureLayer',
              disablePopup: false,
              popupInfo: {
                popupElements: [
                  {
                    type: 'fields',
                    description: '',
                    fieldInfos: popupFields,
                    title: '',
                  },
                ],
                fieldInfos: popupFields,
                title: `${lRes.name}${popupTitle}`,
              },
            };
          }),
        });
      }
    } else if (
      ['allWaterbodiesLayer', 'waterbodyLayer'].includes(l.id) &&
      isGroupLayer(l.layer)
    ) {
      // handle waterbodies layer on the state and tribe pages
      const subLayers: ILayerExtendedType[] = [];
      l.layer.layers.forEach((subLayer) => {
        if (!isFeatureLayer(subLayer)) return;

        const popupFields = buildPopupFieldsList(
          subLayer.objectIdField,
          subLayer.globalIdField,
          subLayer.fields,
        );

        if (subLayer.definitionExpression) {
          subLayers.push({
            id: subLayer.layerId,
            layerDefinition: {
              definitionExpression: subLayer.definitionExpression,
            },
            disablePopup: false,
            popupInfo: {
              popupElements: [
                {
                  type: 'fields',
                  description: '',
                  fieldInfos: popupFields,
                  title: '',
                },
              ],
              fieldInfos: popupFields,
              title: `${subLayer.title}${popupTitle}`,
            },
          });
        } else {
          subLayers.push({
            id: subLayer.layerId,
            disablePopup: false,
            popupInfo: {
              popupElements: [
                {
                  type: 'fields',
                  description: '',
                  fieldInfos: popupFields,
                  title: '',
                },
              ],
              fieldInfos: popupFields,
              title: `${subLayer.title}${popupTitle}`,
            },
          });
        }
      });

      operationalLayers.push({
        layerType,
        title: l.label,
        url,
        layers: subLayers,
      });
    } else {
      // build popup for feature layers that were not added via add data widget
      let popupInfo;
      if (
        !l.widgetLayer &&
        layerType === 'ArcGISFeatureLayer' &&
        isFeatureLayer(l.layer)
      ) {
        const popupFields = buildPopupFieldsList(
          l.layer.objectIdField,
          l.layer.globalIdField,
          l.layer.fields,
        );

        popupInfo = {
          popupElements: [
            {
              type: 'fields',
              description: '',
              fieldInfos: popupFields,
              title: '',
            },
          ],
          fieldInfos: popupFields,
          title: `${l.layer.title}${layerSettings?.popupTitle || ''}`,
        };
      }

      operationalLayers.push({
        layerType,
        popupInfo,
        title: l.label,
        url,
      });
    }
  });

  // run the webserivce call to update ArcGIS Online
  const data = {
    f: 'json',
    token: portal.credential.token,
    title: serviceMetaData.label,
    description: serviceMetaData.description,
    type: 'Web Map',
    text: {
      version: '2.27',
      authoringApp: 'ArcGISMapViewer',
      authoringAppVersion: '2023.1',
      operationalLayers,
      baseMap: {
        baseMapLayers: [
          {
            id: 'VectorTile_9568',
            title: 'World Topographic Map',
            layerType: 'VectorTileLayer',
            styleUrl:
              'https://cdn.arcgis.com/sharing/rest/content/items/42df0d22517e49ad84edcee4c093857d/resources/styles/root.json',
          },
        ],
        title: 'Topographic',
      },
      initialState: {
        viewpoint: {
          targetGeometry: {
            spatialReference: {
              latestWkid: 3857,
              wkid: 102100,
            },
            xmin: mapView.extent.xmin,
            ymin: mapView.extent.ymin,
            xmax: mapView.extent.xmax,
            ymax: mapView.extent.ymax,
          },
        },
      },
      spatialReference: {
        latestWkid: 3857,
        wkid: 102100,
      },
    },
  };
  appendEnvironmentObjectParam(data);

  const webMapRes = await fetchPostForm(
    `${portal.user.userContentUrl}/addItem`,
    data,
  );

  const resourcesPromises: Promise<any>[] = [];
  for (const p of resourcesParams) {
    // convert file from base64 to blob
    const base64Response = await fetch(p.file);
    const fileBlob = await base64Response.blob();

    resourcesPromises.push(
      fetchPostFile(
        `${portal.user.userContentUrl}/items/${webMapRes.id}/addResources`,
        {
          f: 'json',
          token: portal.credential.token,
          resourcesPrefix: p.resourcesPrefix,
          fileName: p.fileName,
        },
        fileBlob,
        p.fileName,
      ),
    );
  }
  await Promise.all(resourcesPromises);

  return webMapRes;
}

/**
 * Publishes a layer or layers to ArcGIS online.
 *
 * @param portal The portal object to apply edits to
 * @param mapView Esri mapView object to sort layers as they are in HMW
 * @param services Web service config for getting urls from HMW layers
 * @param layers Array of layers to be published
 * @param layerProps Properties to be applied to layers
 * @param serviceMetaData The name and description of the service to be saved
 * @returns A promise that resolves to the successfully published data
 */
export async function publish({
  portal,
  mapView,
  services,
  layers,
  layerProps,
  serviceMetaData,
}: {
  portal: __esri.Portal;
  mapView: __esri.MapView;
  services: any;
  layers: LayerType[];
  layerProps: any;
  serviceMetaData: ServiceMetaDataType;
}): Promise<{
  layersResult?: AddToDefinitionResponseType;
  featuresResult?: ApplyEditsResponseType[];
  webMapResult: AddItemResponseType;
}> {
  if (layers.length === 0) throw new Error('No layers to publish.');

  // determine if a feature service is needed
  let featureServiceNeeded = layers.some((l) => l.requiresFeatureService);

  // sort the layers based on the order they are on the map
  layers.sort((a, b) => {
    const aIndex = mapView.map.layers.findIndex((l) => l.id === a.id);
    const bIndex = mapView.map.layers.findIndex((l) => l.id === b.id);

    return aIndex - bIndex;
  });

  try {
    if (!featureServiceNeeded) {
      const res = await addWebMap({
        portal,
        mapView,
        services,
        serviceMetaData,
        layers,
        layerProps,
      });

      return {
        webMapResult: res,
      };
    } else {
      const service = await getFeatureService(portal, serviceMetaData);
      const serviceUrl: string = service.url;

      const layersRes = await createFeatureLayers(
        portal,
        mapView,
        serviceUrl,
        layers,
        serviceMetaData,
        layerProps,
      );

      const editsRes = await applyEdits({
        portal,
        services,
        serviceUrl,
        layers,
        layersRes,
      });

      const webMapRes = await addWebMap({
        portal,
        mapView,
        service,
        services,
        serviceMetaData,
        layers,
        layerProps,
        layersRes,
      });

      return {
        layersResult: layersRes,
        featuresResult: editsRes,
        webMapResult: webMapRes,
      };
    }
  } catch (ex) {
    window.logErrorToGa(ex);
    throw ex;
  }
}
