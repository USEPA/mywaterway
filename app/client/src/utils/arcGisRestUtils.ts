// components
import mapPin from 'images/pin.png';
// types
import { LayerType, ServiceMetaDataType } from 'types/arcGisOnline';
// utils
import {
  fetchCheck,
  fetchPostForm,
  getEnvironmentString,
} from 'utils/fetchUtils';
import { escapeForLucene } from 'utils/utils';
// types
import { LookupFile } from 'types/index';

declare global {
  interface Window {
    logErrorToGa: Function;
  }
}

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
 */
export function isServiceNameAvailable(
  portal: __esri.Portal,
  serviceName: string,
) {
  return new Promise((resolve, reject) => {
    // Workaround for esri.Portal not having credential
    const tempPortal: any = portal;

    // check if the hmw feature service already exists
    const params: any = {
      f: 'json',
      token: tempPortal.credential.token,
      name: serviceName,
      type: 'Feature Service',
    };
    appendEnvironmentObjectParam(params);

    fetchPostForm(
      `${portal.restUrl}/portals/${portal.id}/isServiceNameAvailable`,
      params,
    )
      .then((res) => {
        resolve(res);
      })
      .catch((err) => {
        console.error(err);
        window.logErrorToGa(err);
        reject(err);
      });
  });
}

/**
 * Attempts to get the hosted feature service and creates it if
 * it doesn't already exist
 *
 * @param portal The portal object to retreive the hosted feature service from
 * @param serviceMetaData Metadata to be added to the feature service and layers.
 * @param isTable Determines what category to add.
 * @returns A promise that resolves to the hosted feature service object
 */
export async function getFeatureService(
  portal: __esri.Portal,
  serviceMetaData: ServiceMetaDataType,
) {
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

async function getFeatureServiceRetry(
  portal: __esri.Portal,
  serviceMetaData: ServiceMetaDataType,
) {
  // Function that fetches the lookup file.
  // This will retry the fetch 3 times if the fetch fails with a
  // 1 second delay between each retry.
  const fetchLookup = async (
    retryCount: number = 0,
  ): Promise<{
    portalService: any;
    featureService: any;
  }> => {
    try {
      // check if the hmw feature service already exists
      const service = await getFeatureServiceWrapped(portal, serviceMetaData);
      if (service) return service;

      // resolve the request when the max retry count of 3 is hit
      if (retryCount === 3) {
        throw new Error('No service');
      } else {
        // recursive retry (1 second between retries)
        console.log(
          `Failed to fetch feature service. Retrying (${
            retryCount + 1
          } of 3)...`,
        );
        // setTimeout(() => fetchLookup(retryCount + 1), 1000);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return await fetchLookup(retryCount + 1);
      }
    } catch (err) {
      window.logErrorToGa(err);
      throw err;
    }
  };

  return await fetchLookup();
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
) {
  try {
    const query = `orgid:${escapeForLucene(portal.user.orgId)} AND name:${
      serviceMetaData.label
    }`;
    const queryRes = await portal.queryItems({ query });

    const exactMatch = queryRes.results.find(
      (layer: any) => layer.name === serviceMetaData.label,
    );

    if (exactMatch) {
      const portalService = exactMatch;

      // Workaround for esri.Portal not having credential
      const tempPortal: any = portal;
      const response = await fetchCheck(
        `${portalService.url}?f=json${getEnvironmentStringParam()}&token=${
          tempPortal.credential.token
        }`,
      );
      return {
        portalService,
        featureService: response,
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
 * @param isTable Determines what category to add.
 * @returns A promise that resolves to the hosted feature service object
 */
export async function createFeatureService(
  portal: __esri.Portal,
  serviceMetaData: ServiceMetaDataType,
) {
  try {
    // Workaround for esri.Portal not having credential
    const tempPortal: any = portal;

    // feature service creation parameters
    const data = {
      f: 'json',
      token: tempPortal.credential.token,
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

    // Add metadata to the new feature service.
    // NOTE: It is unfortunate, but we have to do a separate call to update the feature
    // service with metadata. The documentation makes it look like we can add metadata
    // via createService, but this does not work. I looked at the web service requests
    // in the ArcGIS Online portal and found that ESRI is also doing a separate update
    // call to add metadata (tags in this case).
    const indata = {
      f: 'json',
      token: tempPortal.credential.token,

      // add metadata for determining whether a feature service has a sample layer vs
      // just being a reference layer.
      // TODO - Not sure if we will need this
      categories: 'contains-epa-hmw-layer',
    };
    appendEnvironmentObjectParam(indata);

    await fetchPostForm(
      `${portal.user.userContentUrl}/items/${createResponse.itemId}/update`,
      indata,
    );

    // get the feature service from the portal and return it
    return await getFeatureServiceRetry(portal, serviceMetaData);
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
 * @param field 
 * @returns 
 */
function convertFieldToJSON(field: __esri.Field) {
  const fieldJson = field.toJSON();
  if(fieldJson.type !== 'esriFieldTypeOID') return fieldJson;
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
 * Used for adding a feature layer to a hosted feature service on
 * ArcGIS Online
 *
 * @param portal The portal object to create feature layers on
 * @param serviceUrl The hosted feature service to save layers to
 * @param layerMetaData Array of service metadata to be added to the layers of a feature service.
 * @returns A promise that resolves to the layers that were saved
 */
export async function createFeatureLayers(
  portal: __esri.Portal,
  mapView: __esri.MapView,
  serviceUrl: string,
  layers: LayerType[],
  serviceMetaData: ServiceMetaDataType,
  layerProps: LookupFile,
) {
  try {
    const layersParams: any[] = [];
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

      const properties = layerProps.data.layerSpecificSettings[layer.layer.id];

      // handle layers added via file upload
      if (layer.widgetLayer?.type === 'file') {
        layerIds.push(layer.layer.id);
        layersParams.push(layer.widgetLayer.rawLayer.layerDefinition);
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
          ...layerProps.data.defaultLayerProps,
          ...properties,
          name: layer.layer.title,
          globalIdField: (refFeatureLayer as any).globalIdField,
          objectIdField: refFeatureLayer.objectIdField,
          spatialReference: refFeatureLayer.spatialReference.toJSON(),
          fields: refFeatureLayer.fields
            .filter((field) => field.name.toUpperCase() !== 'SHAPE')
            .map(convertFieldToJSON),
        });
        continue;
      } else if (layer.layer.id === 'waterbodyLayer') {
        const groupLayer = layer.layer as __esri.GroupLayer;
        const subLayers = groupLayer.layers.toArray() as __esri.FeatureLayer[];
        for (const subLayer of subLayers) {
          let geometryType = '';
          if (subLayer.geometryType === 'point')
            geometryType = 'esriGeometryPoint';
          if (subLayer.geometryType === 'multipoint')
            geometryType = 'esriGeometryMultipoint';
          if (subLayer.geometryType === 'polyline')
            geometryType = 'esriGeometryPolyline';
          if (subLayer.geometryType === 'polygon')
            geometryType = 'esriGeometryPolygon';

          layerIds.push(layer.layer.id);
          layersParams.push({
            ...layerProps.data.defaultLayerProps,
            ...properties,
            name: subLayer.title,
            geometryType,
            globalIdField: (subLayer as any).globalIdField,
            objectIdField: subLayer.objectIdField,
            spatialReference: subLayer.spatialReference.toJSON(),
            fields: subLayer.fields.map(convertFieldToJSON),
            drawingInfo: { renderer: subLayer.renderer.toJSON() },
            popupTemplate: subLayer.popupTemplate.toJSON(),
          });
        }
        continue;
      }

      layerIds.push(layer.layer.id);

      // get the extent
      let graphicsExtent: __esri.Extent | null = null;
      if (layer.layer.type === 'graphics') {
        const graphicsLayer = layer.layer as __esri.GraphicsLayer;
        graphicsLayer.graphics.forEach((graphic) => {
          graphicsExtent === null
            ? (graphicsExtent = graphic.geometry.extent)
            : graphicsExtent.union(graphic.geometry.extent);
        });
      } else if (layer.layer.type === 'feature') {
        const featureLayer = layer.layer as __esri.FeatureLayer;
        graphicsExtent = await featureLayer.queryExtent();
      } else {
        graphicsExtent = layer.layer.fullExtent;
      }

      // add the polygon representation
      let params = {
        ...layerProps.data.defaultLayerProps,
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

    // Workaround for esri.Portal not having credential
    const tempPortal: any = portal;
    const data = {
      f: 'json',
      token: tempPortal.credential.token,
      addToDefinition: {
        layers: layersParams,
        tables: [
          {
            ...layerProps.data.defaultTableProps,
            fields: layerProps.data.defaultReferenceTableFields,
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
    const response = await fetchPostForm(
      `${adminServiceUrl}/addToDefinition`,
      data,
    );

    // add the layer id back into the response
    response.layers.forEach((l: any, index: number) => {
      l['layerId'] = layerIds[index];
    });

    return response;
  } catch (err) {
    window.logErrorToGa(err);
    throw err;
  }
}

async function processLayerFeatures(layer: __esri.Layer, adds: any[]) {
  if (layer.type === 'graphics') {
    const graphicsLayer = layer as __esri.GraphicsLayer;
    graphicsLayer.graphics.forEach((graphic) => {
      adds.push({
        attributes: graphic.attributes,
        geometry: graphic.geometry.toJSON(),
      });
    });
  } else if (layer.type === 'feature') {
    const featureLayer = layer as __esri.FeatureLayer;
    const features = await featureLayer.queryFeatures({
      returnGeometry: true,
    });
    features.features.forEach((feature) => {
      adds.push({
        attributes: feature.attributes,
        geometry: feature.geometry.toJSON(),
      });
    });
  }
}

/**
 * Applys edits to a layer or layers within a hosted feature service
 * on ArcGIS Online.
 *
 * @param portal The portal object to apply edits to
 * @param serviceUrl The url of the hosted feature service
 * @param layers The layers that the edits object pertain to
 * @param edits The edits to be saved to the hosted feature service
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
  layersRes: any;
}) {
  try {
    const changes: any[] = [];
    // layersRes.layers.forEach((layerRes: any) => {
    for (const layerRes of layersRes.layers) {
      // find the layer
      const layer = layers.find((l) => l.layer.id === layerRes.layerId);
      if (!layer)
        throw new Error(
          `Could not find layer with the "${layerRes.layerId}" id.`,
        );

      // TODO need to figure out how to handle layers that need to be split up

      let adds: any[] = [];
      if (layer.id === 'waterbodyLayer') {
        const groupLayer = layer.layer as __esri.GroupLayer;
        const subLayers = groupLayer.layers.toArray() as __esri.FeatureLayer[];
        const subLayer = subLayers.find((s) => s.title === layerRes.name);

        if (subLayer) await processLayerFeatures(subLayer, adds);
      } else if (layer.id === 'dischargersLayer') {
        const dischargersGroupLayer = layer.layer as __esri.GroupLayer;
        const dischargersLayer = dischargersGroupLayer.findLayerById(
          `${dischargersGroupLayer.id}-enclosed`,
        );
        await processLayerFeatures(dischargersLayer, adds);
      } else if (layer.id === 'monitoringLocationsLayer') {
        const monitoringLocationsGroupLayer = layer.layer as __esri.GroupLayer;
        const monitoringLocationsLayer = monitoringLocationsGroupLayer.findLayerById(
          `${monitoringLocationsGroupLayer.id}-enclosed`,
        );
        await processLayerFeatures(monitoringLocationsLayer, adds);
      } else if (layer.id === 'usgsStreamgagesLayer') {
        const streamGagesGroupLayer = layer.layer as __esri.GroupLayer;
        const streamGagesLayer = streamGagesGroupLayer.findLayerById(
          `${streamGagesGroupLayer.id}-enclosed`,
        );
        await processLayerFeatures(streamGagesLayer, adds);
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

    // Workaround for esri.Portal not having credential
    const tempPortal: any = portal;

    // run the webserivce call to update ArcGIS Online
    const data = {
      f: 'json',
      token: tempPortal.credential.token,
      edits: changes,
      honorSequenceOfEdits: true,
      useGlobalIds: true,
    };
    appendEnvironmentObjectParam(data);

    const res = await fetchPostForm(`${serviceUrl}/applyEdits`, data);
    return {
      response: res,
      // table: refLayerTableOut,
    };
  } catch (err) {
    window.logErrorToGa(err);
    throw err;
  }
}

/**
 * Builds the edits arrays for publishing the sample types layer of
 * the sampling plan feature service.
 *
 * @param layers LayerType[] - The layers to search for sample types in
 * @param table any - The table object
 * @returns An object containing the edits arrays
 */
function buildReferenceLayerTableEdits(
  services: any,
  layers: LayerType[],
  layersRes: any,
) {
  const adds: any[] = [];

  // build the adds, updates, and deletes
  layers.forEach((refLayer: any, index) => {
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
  const id = refLayersTable.id;

  return {
    edits: {
      id,
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
 * @param refLayer Object of the reference layer being added
 * @returns AGO Layer type
 */
function getAgoLayerType(layer: LayerType): AgoLayerType | null {
  const layerType = (
    layer.widgetLayer?.layerType || layer.layer.type
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
  if (layer.id === 'allWaterbodiesLayer')
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
  let url = (layer.layer as any)?.url;
  if (layer.widgetLayer?.type === 'portal') url = layer.widgetLayer.url;
  if (layer.widgetLayer?.type === 'url') url = layer.widgetLayer.url;
  if (layer.id === 'allWaterbodiesLayer')
    url = services.data.waterbodyService.base;
  if (layer.id === 'ejscreenLayer') url = services.data.ejscreen;
  if (layer.id === 'tribalLayer') url = services.data.tribal;

  return url;
}

/**
 * Publishes a web map version of the feature service.
 *
 * @param portal The portal object to apply edits to
 * @param service The feature service object
 * @param layers The layers that the edits object pertain to
 * @param layersResponse The response from creating layers
 * @param attributesToInclude The attributes to include with each graphic
 * @returns A promise that resolves to the successfully saved web map
 */
export function addWebMap({
  portal,
  mapView,
  service,
  services,
  serviceMetaData,
  layers,
  layersRes,
}: {
  portal: __esri.Portal;
  mapView: __esri.MapView;
  service: any;
  services: any;
  serviceMetaData: ServiceMetaDataType;
  layers: LayerType[];
  layersRes: any;
}) {
  // Workaround for esri.Portal not having credential
  const tempPortal: any = portal;

  const itemId = service?.portalService?.id;
  const baseUrl = service?.portalService?.url;

  const operationalLayers: any[] = [];
  layers.forEach((l) => {
    const layerType = getAgoLayerType(l);
    const url = getLayerUrl(services, l);

    if (layerType === 'VectorTileLayer') {
      operationalLayers.push({
        layerType,
        title: l.label,
        styleUrl: `${url}/resources/styles/root.json`,
      });
    } else if (l.requiresFeatureService) {
      if (!layersRes) return;
      const lRes = layersRes.layers.filter((r: any) => r.layerId === l.id);
      lRes.forEach((lRes: any) => {
        operationalLayers.push({
          title: lRes.name,
          url: `${baseUrl}/${lRes.id}`,
          itemId,
          layerType: 'ArcGISFeatureLayer',
        });
      });
    } else {
      operationalLayers.push({
        layerType,
        title: l.label,
        url,
      });
    }
  });

  // run the webserivce call to update ArcGIS Online
  const data = {
    f: 'json',
    token: tempPortal.credential.token,
    title: serviceMetaData.label,
    description: serviceMetaData.description, // TODO - Test this
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

  return fetchPostForm(`${portal.user.userContentUrl}/addItem`, data);
}

/**
 * Publishes a layer or layers to ArcGIS online.
 *
 * @param portal The portal object to apply edits to
 * @param layers The layers that the edits object pertain to
 * @param edits The edits to be saved to the hosted feature service
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
  layerProps: LookupFile;
  serviceMetaData: ServiceMetaDataType;
}) {
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
        service: null,
        services,
        serviceMetaData,
        layers,
        layersRes: null,
      });

      return res;
    } else {
      const service = await getFeatureService(portal, serviceMetaData);
      const serviceUrl: string = service.portalService.url;
      const portalId: string = service.portalService.id;

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

      await addWebMap({
        portal,
        mapView,
        service,
        services,
        serviceMetaData,
        layers,
        layersRes,
      });

      return {
        portalId,
        edits: editsRes.response,
      };
    }
  } catch (ex) {
    window.logErrorToGa(ex);
    throw ex;
  }
}
