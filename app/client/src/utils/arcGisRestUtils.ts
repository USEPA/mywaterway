// types
import { LayerType, ServiceMetaDataType } from 'types/arcGisOnline';
// utils
import {
  fetchCheck,
  fetchPostForm,
  getEnvironmentString,
} from 'utils/fetchUtils';
import { escapeForLucene } from 'utils/utils';

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
    let query = `orgid:${escapeForLucene(portal.user.orgId)}`;
    query += serviceMetaData.value
      ? ` AND id:${serviceMetaData.value}`
      : ` AND name:${serviceMetaData.label}`;
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
  const layerType = layer.layer.type;

  let layerTypeOut: AgoLayerType | null = null;

  // convert ArcGIS JS types to ArcGIS REST types
  if (layerType === 'feature') layerTypeOut = 'ArcGISFeatureLayer';
  if (layerType === 'tile') layerTypeOut = 'ArcGISMapServiceLayer';
  if (layerType === 'map-image') layerTypeOut = 'ArcGISMapServiceLayer';
  if (layerType === 'imagery') layerTypeOut = 'ArcGISImageServiceLayer';
  if (layerType === 'imagery-tile') layerTypeOut = 'ArcGISImageServiceLayer';
  if (layerType === 'scene') layerTypeOut = 'ArcGISSceneServiceLayer';
  if (layerType === 'integrated-mesh') layerTypeOut = 'IntegratedMeshLayer';
  if (layerType === 'point-cloud') layerTypeOut = 'PointCloudLayer';
  if (layerType === 'building-scene') layerTypeOut = 'BuildingSceneLayer';
  if (layerType === 'csv') layerTypeOut = 'CSV';
  if (layerType === 'geo-rss') layerTypeOut = 'GeoRSS';
  if (layerType === 'kml') layerTypeOut = 'KML';
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
  services,
  serviceMetaData,
  layers,
}: {
  portal: __esri.Portal;
  mapView: __esri.MapView;
  services: any;
  serviceMetaData: ServiceMetaDataType;
  layers: LayerType[];
}) {
  // Workaround for esri.Portal not having credential
  const tempPortal: any = portal;

  const operationalLayers: any[] = [];
  layers
    .sort((a, b) => {
      const aIndex = mapView.map.layers.findIndex((l) => l.id === a.id);
      const bIndex = mapView.map.layers.findIndex((l) => l.id === b.id);

      return aIndex - bIndex;
    })
    .forEach((l) => {
      let layerType = getAgoLayerType(l);
      let url = (l.layer as any)?.url;
      if (l.id === 'allWaterbodiesLayer')
        url = services.data.waterbodyService.base;
      if (l.id === 'ejscreenLayer') url = services.data.ejscreen;
      if (l.id === 'tribalLayer') url = services.data.tribal;

      // TODO - Consider adding code here to preserve HMW styles in published layers

      if (layerType === 'VectorTileLayer') {
        operationalLayers.push({
          layerType,
          title: l.label,
          styleUrl: `${url}/resources/styles/root.json`,
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
  serviceMetaData,
}: {
  portal: __esri.Portal;
  mapView: __esri.MapView;
  services: any;
  layers: LayerType[];
  serviceMetaData: ServiceMetaDataType;
}) {
  if (layers.length === 0) throw new Error('No layers to publish.');

  // determine if a feature service is needed
  let featureServiceNeeded = layers.some((l) => l.requiresFeatureService);

  try {
    if (!featureServiceNeeded) {
      const res = await addWebMap({
        portal,
        mapView,
        services,
        serviceMetaData,
        layers,
      });

      return res;
    } else {
      const service = await getFeatureService(portal, serviceMetaData);
    }
  } catch (ex) {
    window.logErrorToGa(ex);
    throw ex;
  }
}
