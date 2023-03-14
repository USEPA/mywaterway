// @flow

import React, { MouseEvent, useContext, useEffect, useState } from 'react';
import { css } from 'styled-components/macro';
import Select from 'react-select';
import IdentityManager from '@arcgis/core/identity/IdentityManager';
import OAuthInfo from '@arcgis/core/identity/OAuthInfo';
import Portal from '@arcgis/core/portal/Portal';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
// components
import { HelpTooltip } from 'components/shared/HelpTooltip';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import {
  errorBoxStyles,
  successBoxStyles,
} from 'components/shared/MessageBoxes';
import Switch from 'components/shared/Switch';
// contexts
import { useAddSaveDataWidgetState } from 'contexts/AddSaveDataWidget';
import { LocationSearchContext, Status } from 'contexts/locationSearch';
import { useLayerProps, useServicesContext } from 'contexts/LookupFiles';
// utils
import { isServiceNameAvailable, publish } from 'utils/arcGisRestUtils';
// types
import { LayerType, ServiceMetaDataType } from 'types/arcGisOnline';

type PublishType = {
  status:
    | 'idle'
    | 'pending'
    | 'success'
    | 'failure'
    | 'name-not-provided'
    | 'name-not-available'
    | 'layers-not-provided';
  error?: {
    message: string;
    stack?: string;
  };
};

const tooltipCost =
  'Including this layer may require ArcGIS Online credits for storage.';
const tooltipFiltered = 'This layer will be saved with your selected filters.';
const tooltipNotLoaded = 'This layer may not have been loaded yet.';

const layersToIgnore = [
  'nonprofitsLayer',
  'protectedAreasHighlightLayer',
  'surroundingMonitoringLocationsLayer',

  // TODO layers that still need to be added
  'issuesLayer',
  'cyanLayer',
];

const layerTypesToIgnore = ['wcs', 'wfs'];

const layersRequireFeatureService = [
  'actionsLayer',
  'boundariesLayer',
  'cyanLayer',
  'dischargersLayer',
  'issuesLayer',
  'monitoringLocationsLayer',
  'providersLayer',
  'searchIconLayer',
  'usgsStreamgagesLayer',
  'waterbodyLayer',
  'upstreamWatershed',
];

const layersMayBeFiltered = [
  'dischargersLayer',
  'issuesLayer',
  'monitoringLocationsLayer',
];

const layersMayNotHaveLoaded = ['cyanLayer', 'upstreamWatershed'];

const layerFilterOptions = [
  { value: 'All', label: 'All' },
  { value: 'Free', label: 'Free' },
];

// Performs a deep comparison of 2 objects. Returns true if they are equal
// and false otherwise.
function deepEqual(object1: any, object2: any) {
  const keys1 = Object.keys(object1);
  const keys2 = Object.keys(object2);
  if (keys1.length !== keys2.length) {
    return false;
  }
  for (const key of keys1) {
    const val1 = object1[key];
    const val2 = object2[key];
    const areObjects = isObject(val1) && isObject(val2);
    if (
      (areObjects && !deepEqual(val1, val2)) ||
      (!areObjects && val1 !== val2)
    ) {
      return false;
    }
  }
  return true;
}
function isObject(object: any) {
  return object != null && typeof object === 'object';
}

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles};
  text-align: center;
  margin-bottom: 0.625rem;
`;

const modifiedSuccessBoxStyles = css`
  ${successBoxStyles};
  text-align: center;
  margin-bottom: 0.625rem;
`;

const listContainerStyles = css`
  margin: 0.625rem 0;
`;

const switchStyles = css`
  display: flex;
  align-items: center;
  margin-bottom: 0.625rem;
  gap: 0.5rem;
`;

const submitSectionStyles = css`
  margin-top: 1.5rem;
  margin-bottom: 0.625rem;
`;

const buttonContainerStyles = css`
  display: flex;
  justify-content: flex-end;
  align-items: center;
`;

const addButtonStyles = css`
  margin: 0;
  min-width: 50%;
  font-weight: normal;
  font-size: 0.75rem;
`;

const sharedInputStyles = `
  border-width: 1px;
  border-style: solid;
  border-radius: 4px;
  border-color: hsl(0, 0%, 80%);
  margin-bottom: 10px;
  padding: 2px 8px;
  width: 100%;
`;

const saveAsInputStyles = css`
  ${sharedInputStyles}
  height: 36px;
`;

const descriptionInputStyles = css`
  ${sharedInputStyles}
  min-height: 36px;
  height: 72px;
  resize: vertical;
`;

function errorMessage(text: string) {
  return (
    <div css={modifiedErrorBoxStyles}>
      <p>{text}</p>
    </div>
  );
}

type Props = {
  visible: boolean;
};

function SavePanel({ visible }: Props) {
  const {
    saveAsName,
    setSaveAsName,
    saveDescription,
    setSaveDescription,
    saveLayersList,
    setSaveLayersList,
    widgetLayers,
  } = useAddSaveDataWidgetState();
  const mapView = useContext(LocationSearchContext).mapView as __esri.MapView;
  const upstreamWatershedResponse = useContext(LocationSearchContext)
    .upstreamWatershedResponse as {
    status: Status;
    data: __esri.FeatureSet | null;
  };
  const [oAuthInfo, setOAuthInfo] = useState<__esri.OAuthInfo | null>(null);
  const [userPortal, setUserPortal] = useState<__esri.Portal | null>(null);
  const layerProps = useLayerProps();
  const services = useServicesContext();

  const [saveLayerFilter, setSaveLayerFilter] = useState(
    layerFilterOptions[0].value,
  );

  // Initialize the OAuth
  useEffect(() => {
    if (oAuthInfo) return;
    const info = new OAuthInfo({
      appId: process.env.REACT_APP_ARCGIS_CLIENT_ID,
      popup: true,
      flowType: 'authorization-code',
      popupCallbackUrl: `${window.location.origin}/oauth-callback.html`,
    });
    IdentityManager.registerOAuthInfos([info]);

    setOAuthInfo(info);
  }, [setOAuthInfo, oAuthInfo]);

  // Watch for when layers are added to the map
  const [mapLayerCount, setMapLayerCount] = useState(mapView.map.layers.length);
  const [layerWatcher, setLayerWatcher] = useState<IHandle | null>(null);
  useEffect(() => {
    if (!mapView || layerWatcher) return;

    const watcher = reactiveUtils.watch(
      () => mapView.map.layers.length,
      () => setMapLayerCount(mapView.map.layers.length),
    );

    const layerWatchers: { [id: string]: IHandle } = {};

    function watchLayerVisibility(layer: __esri.Layer) {
      const visibilityWatcher = reactiveUtils.watch(
        () => layer.visible,
        () => {
          if (
            layersToIgnore.includes(layer.id) ||
            layerTypesToIgnore.includes(layer.type)
          )
            return;

          setSaveLayersList((layersList) => {
            const newLayersList = { ...layersList };
            newLayersList[layer.id].toggled = layer.visible;
            return newLayersList;
          });
        },
      );
      layerWatchers[layer.id] = visibilityWatcher;
    }

    function watchLayerLoaded(layer: __esri.Layer) {
      const loadedWatcher = reactiveUtils.watch(
        () => layer.loaded,
        () => {
          if (!layer.loaded) return;

          loadedWatcher.remove();

          setSaveLayersList((layersList) => {
            const newLayersList = { ...layersList };
            if (newLayersList[layer.id])
              newLayersList[layer.id].label = layer.title;
            return newLayersList;
          });
        },
      );
    }

    mapView.map.layers.forEach((layer) => watchLayerVisibility(layer));

    mapView.map.layers.on('change', (e) => {
      if (e.added.length > 0) {
        e.added.forEach((layer) => {
          watchLayerVisibility(layer);
          if (!layer.loaded) watchLayerLoaded(layer);
        });
      }

      if (e.removed.length > 0) {
        e.removed.forEach((layer) => {
          layerWatchers[layer.id].remove();
          delete layerWatchers[layer.id];

          setSaveLayersList((layersList) => {
            const newLayersList = { ...layersList };
            delete newLayersList[layer.id];
            return newLayersList;
          });
        });
      }
    });

    setLayerWatcher(watcher);
  }, [layerWatcher, mapView, setSaveLayersList]);

  const [layersInitialized, setLayersInitialized] = useState(false);
  useEffect(() => {
    if (layersInitialized) return;

    if (saveLayersList) {
      // build object of switches based on layers on map
      const newSwitches = { ...saveLayersList };
      mapView.map.layers.forEach((layer) => {
        if (
          layersToIgnore.includes(layer.id) ||
          layerTypesToIgnore.includes(layer.type)
        )
          return;

        if (newSwitches.hasOwnProperty(layer.id)) {
          newSwitches[layer.id].layer = layer;
        }
      });
    }

    setLayersInitialized(true);
  }, [layersInitialized, mapView, saveLayersList]);

  // Build the list of switches
  useEffect(() => {
    if (!mapView || !layersInitialized) return;

    // get a list of layers that were added as files as these will need
    // be flagged as costing money to store in AGO
    const fileLayerIds: string[] = [];
    widgetLayers.forEach((layer) => {
      if (layer.type === 'file') {
        fileLayerIds.push(layer.layer.id);
      }
    });

    // build object of switches based on layers on map
    const newSwitches = saveLayersList ? { ...saveLayersList } : {};
    const newSwitchesNoLayer: any = {};
    const layersOnMap: string[] = [];
    mapView.map.layers.forEach((layer) => {
      if (
        layersToIgnore.includes(layer.id) ||
        layerTypesToIgnore.includes(layer.type)
      )
        return;

      if (newSwitches.hasOwnProperty(layer.id)) {
        newSwitches[layer.id].layer = layer;
      } else {
        newSwitches[layer.id] = {
          id: layer.id,
          label: layer.title,
          toggled: layer.visible,
          requiresFeatureService:
            layersRequireFeatureService.includes(layer.id) ||
            fileLayerIds.includes(layer.id),
          layer: layer,
        };
      }

      if (!layersOnMap.includes(layer.id)) layersOnMap.push(layer.id);

      newSwitchesNoLayer[layer.id] = {
        ...newSwitches[layer.id],
        layer: null,
      };
    });

    Object.keys(newSwitches).forEach((layerId) => {
      if (layersOnMap.includes(layerId)) return;
      delete newSwitches[layerId];
    });

    const oldSwitches: any = {};
    if (saveLayersList) {
      Object.keys(saveLayersList).forEach((key) => {
        const value = saveLayersList[key];

        oldSwitches[key] = {
          ...value,
          layer: null,
        };
      });
    }

    if (!deepEqual(newSwitchesNoLayer, oldSwitches)) {
      setSaveLayersList(newSwitches);
    }
  }, [
    layersInitialized,
    mapLayerCount,
    mapView,
    saveLayersList,
    setSaveLayersList,
    visible,
    widgetLayers,
  ]);

  const [publishResponse, setPublishResponse] = useState<PublishType>({
    status: 'idle',
  });

  if (
    !mapView ||
    layerProps.status === 'fetching' ||
    services.status === 'fetching'
  ) {
    return <LoadingSpinner />;
  }

  async function runPublish(
    portal: __esri.Portal,
    serviceMetaData: ServiceMetaDataType,
    layersToPublish: LayerType[],
  ) {
    // check if the name is available in the user's org
    const nameAvailableResponse = await isServiceNameAvailable(
      portal,
      serviceMetaData.label,
    );
    if (nameAvailableResponse.error) {
      setPublishResponse({
        status: 'failure',
        error: {
          message: nameAvailableResponse.error.message,
        },
      });
      return;
    }
    if (!nameAvailableResponse.available) {
      setPublishResponse({
        status: 'name-not-available',
      });
      return;
    }

    try {
      const response = await publish({
        portal,
        mapView,
        services,
        layers: layersToPublish,
        layerProps,
        serviceMetaData,
      });

      // parse the publish output
      const layerSuccess = !response.layersResult
        ? true
        : response.layersResult.success;

      let totalFeatures = 0;
      let featureFailedCount = 0;
      response.featuresResult?.forEach((l) => {
        l.addResults?.forEach((r) => {
          totalFeatures += 1;
          if (!r.success) featureFailedCount += 1;
        });
      });

      const webMapSuccess = response.webMapResult.success;

      if (layerSuccess && featureFailedCount === 0 && webMapSuccess) {
        setPublishResponse({
          status: 'success',
        });
      } else {
        let errorMessage = '';

        if (!layerSuccess)
          errorMessage +=
            'Failed to save 1 or more layers. Check console for more information.\n';
        if (featureFailedCount > 0)
          errorMessage += `Partial save success. Failed to save ${featureFailedCount} of ${totalFeatures} feature(s).\n`;
        if (webMapSuccess) errorMessage += 'Failed to save the web map.\n';

        errorMessage += 'Check the console for more details.';

        setPublishResponse({
          status: 'failure',
          error: {
            message: errorMessage,
          },
        });
      }
    } catch (ex: any) {
      console.error(ex);
      setPublishResponse({
        status: 'failure',
        error: {
          message: ex.toString(),
          stack: ex,
        },
      });
    }
  }

  // Saves the data to ArcGIS Online
  async function handleSaveAgo(ev: MouseEvent<HTMLButtonElement>) {
    if (!saveLayersList) return;

    // check if user provided a name
    if (!saveAsName) {
      setPublishResponse({
        status: 'name-not-provided',
      });
      return;
    }

    // Gather the layers to be published
    const layersToPublish: LayerType[] = [];
    Object.values(saveLayersList).forEach((value) => {
      if (!value.toggled) return;
      if (saveLayerFilter === 'Free' && value.requiresFeatureService) {
        return;
      }
      if (
        value.id === 'upstreamWatershed' &&
        upstreamWatershedResponse.status !== 'success'
      ) {
        return;
      }

      // get the widgetLayer for handling layers added via the Add Data Widget
      const widgetLayer = widgetLayers.find((l) => l.layer.id === value.id);
      const associatedData = upstreamWatershedResponse.data;

      layersToPublish.push({
        ...value,
        associatedData,
        widgetLayer,
      });
    });

    if (layersToPublish.length === 0) {
      setPublishResponse({
        status: 'layers-not-provided',
      });
      return;
    }

    setPublishResponse({
      status: 'pending',
    });

    const serviceMetaData = {
      label: saveAsName,
      description: `
        ${saveDescription}
        <div>
          <hr />
          <strong>Auto generated by the How's My Waterway application</strong>
          <div><strong>Created Date:</strong> ${new Date().toLocaleString()}</div>
        </div>
      `,
    };

    if (userPortal) {
      await runPublish(userPortal, serviceMetaData, layersToPublish);
      return;
    }

    try {
      // Check the user's sign in status
      await IdentityManager.getCredential(`${oAuthInfo?.portalUrl}/sharing`, {
        oAuthPopupConfirmation: false,
      });

      // load portal - credentials auto applied via IdentityManager
      const portal = new Portal();
      portal.authMode = 'immediate';
      await portal.load();
      setUserPortal(portal);

      // run publish
      await runPublish(portal, serviceMetaData, layersToPublish);
    } catch (err) {
      console.error(err);
      setUserPortal(null);
    }
  }

  return (
    <form
      style={{
        height: '100%',
        overflow: 'auto',
        padding: '1em',
      }}
      onSubmit={(ev) => {
        ev.preventDefault();
      }}
    >
      <label htmlFor="layer-filter-select">Filter</label>
      <Select
        inputId="layer-filter-select"
        isSearchable={false}
        options={layerFilterOptions}
        value={layerFilterOptions.find((f) => f.value === saveLayerFilter)}
        onChange={(ev) => {
          setSaveLayerFilter(ev?.value || '');
        }}
      />
      <div css={listContainerStyles}>
        {saveLayersList &&
          Object.values(saveLayersList)
            .filter((l) => l.label)
            .sort((a, b) => a.label.localeCompare(b.label))
            .map((value) => {
              const key = value.id;

              if (saveLayerFilter === 'Free' && value.requiresFeatureService) {
                return null;
              }

              return (
                <div key={key} css={switchStyles}>
                  <Switch
                    ariaLabel={`Toggle ${value.label}`}
                    checked={value.toggled}
                    onChange={(ev) => {
                      setSaveLayersList((saveLayersList) => {
                        if (!saveLayersList) return saveLayersList;

                        return {
                          ...saveLayersList,
                          [key]: {
                            ...saveLayersList[key],
                            toggled: ev,
                          },
                        };
                      });
                    }}
                  />
                  <span>{value.label}</span>
                  {value.requiresFeatureService && (
                    <HelpTooltip
                      label={tooltipCost}
                      iconClass="fas fa-dollar-sign"
                    />
                  )}
                  {layersMayBeFiltered.includes(key) && (
                    <HelpTooltip
                      label={tooltipFiltered}
                      iconClass="fas fa-asterisk"
                    />
                  )}
                  {layersMayNotHaveLoaded.includes(key) && (
                    <HelpTooltip
                      label={tooltipNotLoaded}
                      iconClass="fas fa-plus"
                    />
                  )}
                </div>
              );
            })}
      </div>
      <p>
        <i aria-hidden className="fas fa-dollar-sign" /> Including this layer
        may incur storage costs in ArcGIS Online.
        <br />
        <i aria-hidden className="fas fa-asterisk" /> This layer will be saved
        with your selected filters.
        <br />
        <i aria-hidden className="fas fa-plus" /> This layer may not have been
        loaded yet.
        <br />
      </p>
      <div>
        <label htmlFor="save-as-name">Name: </label>
        <input
          id="save-as-name"
          css={saveAsInputStyles}
          value={saveAsName}
          onChange={(ev) => setSaveAsName(ev.target.value)}
        />
      </div>
      <div>
        <label htmlFor="service-description">Description: </label>
        <textarea
          id="service-description"
          css={descriptionInputStyles}
          value={saveDescription}
          onChange={(ev) => setSaveDescription(ev.target.value)}
        />
      </div>
      <div css={submitSectionStyles}>
        {publishResponse.status === 'pending' && <LoadingSpinner />}
        {publishResponse.status === 'failure' &&
          errorMessage(
            publishResponse.error?.message ||
              'Unknown error. Check developer tools console.',
          )}
        {publishResponse.status === 'name-not-provided' &&
          errorMessage('Please provide a name and try again.')}
        {publishResponse.status === 'name-not-available' &&
          errorMessage(
            'Name already used in your account or organization. Please provide a unique name and try again.',
          )}
        {publishResponse.status === 'layers-not-provided' &&
          errorMessage('Please select at least one layer and try again.')}
        {publishResponse.status === 'success' && (
          <div css={modifiedSuccessBoxStyles}>
            <p>Save succeeded.</p>
          </div>
        )}
        <div css={buttonContainerStyles}>
          <button css={addButtonStyles} type="submit" onClick={handleSaveAgo}>
            Save to ArcGIS Online
          </button>
        </div>
      </div>
    </form>
  );
}

export default SavePanel;
