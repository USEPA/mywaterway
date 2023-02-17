// @flow

import React, { MouseEvent, useContext, useEffect, useState } from 'react';
import { css } from 'styled-components/macro';
import Select from 'react-select';
import IdentityManager from '@arcgis/core/identity/IdentityManager';
import OAuthInfo from '@arcgis/core/identity/OAuthInfo';
import Portal from '@arcgis/core/portal/Portal';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
// components
import { errorBoxStyles } from 'components/shared/MessageBoxes';
import Switch from 'components/shared/Switch';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
import { useAddSaveDataWidgetState } from 'contexts/AddSaveDataWidget';
// utils
import { useSaveSettings, useWidgetLayerStorage } from 'utils/hooks';

const layersToIgnore = [
  'nonprofitsLayer',
  'protectedAreasHighlightLayer',
  'surroundingMonitoringLocationsLayer',
];

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

const saveAsInputStyles = css`
  width: 100%;
  height: 36px;
  padding: 2px 8px;
  border-width: 1px;
  border-style: solid;
  border-radius: 4px;
  border-color: hsl(0, 0%, 80%);
`;

type Props = {
  visible: Boolean,
};

function SavePanel({ visible }: Props) {
  const {
    saveAsName,
    setSaveAsName,
    setSaveContinue,
    saveLayerFilter,
    setSaveLayerFilter,
    saveLayersList,
    setSaveLayersList,
    widgetLayers,
  } = useAddSaveDataWidgetState();
  const { mapView } = useContext(LocationSearchContext);
  useSaveSettings();
  useWidgetLayerStorage();

  const [oAuthInfo, setOAuthInfo] = useState(null);
  const [userPortal, setUserPortal] = useState(null);

  // Initialize the OAuth
  useEffect(() => {
    if (oAuthInfo) return;
    console.log('init oauth...');
    const info = new OAuthInfo({
      appId: process.env.REACT_APP_ARCGIS_APP_ID,
      popup: true,
      flowType: 'authorization-code',
      popupCallbackUrl: `${window.location.origin}/oauth-callback.html`,
    });
    IdentityManager.registerOAuthInfos([info]);

    setOAuthInfo(info);
  }, [setOAuthInfo, oAuthInfo]);

  const [errorMessageText, setErrorMessageText] = useState('');

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
          if (layersToIgnore.includes(layer.id)) return;

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

    console.log('init layers...');
    if (saveLayersList) {
      // build object of switches based on layers on map
      const newSwitches = { ...saveLayersList };
      mapView.map.layers.items.forEach((layer) => {
        if (layersToIgnore.includes(layer.id)) return;

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
      if (layersToIgnore.includes(layer.id)) return;

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
      // console.log('something changed...');
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

  if (!mapView) return null;

  async function publish(portal) {
    console.log('run the publish...');
    // Gather the layers to be published
    const layersToPublish = [];
    Object.values(saveLayersList).forEach((value) => {
      if (!value.toggled) return;
      if (saveLayerFilter.value === 'Free' && value.requiresFeatureService) {
        return;
      }
      layersToPublish.push(value);
    });

    // TODO Create publishing logic
    console.log('layersToPublish: ', layersToPublish);
  }

  // Saves the data to ArcGIS Online
  async function handleSaveAgo(ev: MouseEvent<HTMLButtonElement>) {
    // perform pre-checks
    if (!saveAsName) {
      setErrorMessageText('Please provide a name and try again.');
      return;
    }

    setErrorMessageText('');

    setSaveContinue(true);

    // TODO - Add loading spinner here

    if (userPortal) {
      await publish(userPortal);
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
      await publish(portal);
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
      <div css={submitSectionStyles}>
        {errorMessageText && (
          <div css={modifiedErrorBoxStyles}>
            <p>{errorMessageText}</p>
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
