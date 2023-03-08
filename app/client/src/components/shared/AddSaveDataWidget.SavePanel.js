// @flow

import React, { MouseEvent, useContext, useEffect, useState } from 'react';
import { css } from 'styled-components/macro';
import Select from 'react-select';
import IdentityManager from '@arcgis/core/identity/IdentityManager';
import OAuthInfo from '@arcgis/core/identity/OAuthInfo';
import Portal from '@arcgis/core/portal/Portal';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import {
  errorBoxStyles,
  successBoxStyles,
} from 'components/shared/MessageBoxes';
import Switch from 'components/shared/Switch';
// contexts
import { useAddSaveDataWidgetState } from 'contexts/AddSaveDataWidget';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useLayerProps, useServicesContext } from 'contexts/LookupFiles';
// utils
import { isServiceNameAvailable, publish } from 'utils/arcGisRestUtils';
import { createErrorObject } from 'utils/utils';
// types
import { ServiceMetaDataType } from 'types/arcGisOnline';

type PublishType = {
  status:
    | 'idle'
    | 'pending'
    | 'success'
    | 'failure'
    | 'name-not-provided'
    | 'name-not-available'
    | 'layers-not-provided',
  summary: {
    success: string,
    failed: string,
  },
};

const layersToIgnore = [
  'nonprofitsLayer',
  'protectedAreasHighlightLayer',
  'surroundingMonitoringLocationsLayer',
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

const layerFilterOptions = [
  { value: 'All', label: 'All' },
  { value: 'Free', label: 'Free' },
];

// Performs a deep comparison of 2 objects. Returns true if they are equal
// and false otherwise.
function deepEqual(object1, object2) {
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
function isObject(object) {
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
  visible: Boolean,
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
  const { mapView } = useContext(LocationSearchContext);
  const [oAuthInfo, setOAuthInfo] = useState(null);
  const [userPortal, setUserPortal] = useState(null);
  const layerProps = useLayerProps();
  const services = useServicesContext();

  const [saveLayerFilter, setSaveLayerFilter] = useState(layerFilterOptions[0]);

  // Initialize the OAuth
  useEffect(() => {
    if (oAuthInfo) return;
    const info = new OAuthInfo({
      appId: process.env.REACT_APP_ARCGIS_APP_ID,
      popup: true,
      flowType: 'authorization-code',
      popupCallbackUrl: `${window.location.origin}/oauth-callback.html`,
    });
    IdentityManager.registerOAuthInfos([info]);

    setOAuthInfo(info);
  }, [setOAuthInfo, oAuthInfo]);

  // Watch for when layers are added to the map
  const [mapLayerCount, setMapLayerCount] = useState(mapView.map.layers.length);
  const [layerWatcher, setLayerWatcher] = useState(false);
  useEffect(() => {
    if (!mapView || layerWatcher) return;

    const watcher = reactiveUtils.watch(
      () => mapView.map.layers.length,
      () => setMapLayerCount(mapView.map.layers.length),
    );

    const layerWatchers: { [id: string]: IHandle } = {};

    function watchLayerVisibility(layer) {
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

    function watchLayerLoaded(layer) {
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
      mapView.map.layers.items.forEach((layer) => {
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
    const fileLayerIds = [];
    widgetLayers.forEach((layer) => {
      if (layer.type === 'file') {
        fileLayerIds.push(layer.layer.id);
      }
    });

    // build object of switches based on layers on map
    const newSwitches = saveLayersList ? { ...saveLayersList } : {};
    const newSwitchesNoLayer = {};
    const layersOnMap = [];
    mapView.map.layers.items.forEach((layer) => {
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

    const oldSwitches = {};
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
    summary: { success: '', failed: '' },
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
    layersToPublish: any[],
  ) {
    // check if the name is available in the user's org
    const nameAvailableResponse = await isServiceNameAvailable(portal, serviceMetaData.label);
    if (nameAvailableResponse.error) {
      setPublishResponse({
        status: 'failure',
        summary: { success: '', failed: '' },
        error: {
          error: createErrorObject(nameAvailableResponse),
          message: nameAvailableResponse.error.message,
        },
      });
      return;
    }
    if (!nameAvailableResponse.available) {
      setPublishResponse({
        status: 'name-not-available',
        summary: { success: '', failed: '' },
      });
      return;
    }

    await publish({
      portal,
      mapView,
      services,
      layers: layersToPublish,
      layerProps,
      serviceMetaData,
    });

    setPublishResponse({
      status: 'success',
      summary: { success: '', failed: '' },
    });
  }

  // Saves the data to ArcGIS Online
  async function handleSaveAgo(ev: MouseEvent<HTMLButtonElement>) {
    // check if user provided a name
    if (!saveAsName) {
      setPublishResponse({
        status: 'name-not-provided',
        summary: { success: '', failed: '' },
      });
      return;
    }

    // Gather the layers to be published
    const layersToPublish = [];
    Object.values(saveLayersList).forEach((value) => {
      if (!value.toggled) return;
      if (saveLayerFilter.value === 'Free' && value.requiresFeatureService) {
        return;
      }

      // get the widgetLayer for handling layers added via the Add Data Widget
      const widgetLayer = widgetLayers.find((l) => l.layer.id === value.id);
      layersToPublish.push({
        ...value,
        widgetLayer,
      });
    });

    if (layersToPublish.length === 0) {
      setPublishResponse({
        status: 'layers-not-provided',
        summary: { success: '', failed: '' },
      });
      return;
    }

    setPublishResponse({
      status: 'pending',
      summary: { success: '', failed: '' },
    });

    const serviceMetaData = {
      label: saveAsName,
      description: saveDescription,
    };

    if (userPortal) {
      await runPublish(userPortal, serviceMetaData, layersToPublish);
      return;
    }

    try {
      // Check the user's sign in status
      await IdentityManager.getCredential(`${oAuthInfo.portalUrl}/sharing`, {
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
        value={saveLayerFilter}
        onChange={(ev) => {
          setSaveLayerFilter(ev);
        }}
        options={layerFilterOptions}
      />
      <div css={listContainerStyles}>
        {saveLayersList &&
          Object.values(saveLayersList)
            .filter((l) => l.label)
            .sort((a, b) => a.label.localeCompare(b.label))
            .map((value, index) => {
              const key = value.id;

              if (
                saveLayerFilter?.value === 'Free' &&
                value.requiresFeatureService
              ) {
                return null;
              }

              return (
                <div key={index} css={switchStyles}>
                  <Switch
                    ariaLabel={`Toggle ${value.label}`}
                    checked={value.toggled}
                    onChange={(ev) => {
                      setSaveLayersList((saveLayersList) => {
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
                  {value.requiresFeatureService && <span> *</span>}
                </div>
              );
            })}
      </div>
      <p>* Including this layer may incur storage costs in ArcGIS Online.</p>
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
        {publishResponse.status === 'failure' && errorMessage('General error.')}
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
            <p>Publish succeeded.</p>
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
