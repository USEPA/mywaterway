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
// styles
import { colors } from 'styles';

const layersToIgnore = ['protectedAreasHighlightLayer'];

const layersRequireFeatureService = [
  'actionsLayer',
  'boundariesLayer',
  'dischargersLayer',
  'monitoringLocationsLayer',
  'providersLayer',
  'searchIconLayer',
  'usgsStreamgagesLayer',
  'waterbodyLayer',
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
  justify-content: space-between;
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

const toolBarButtonStyles = css`
  height: 40px;
  margin-bottom: 0;
  padding: 0.75em 1em;
  color: white;
  background-color: ${colors.navyBlue()};
  border-radius: 0;
  line-height: 16px;
  text-decoration: none;
  font-weight: bold;

  &:hover {
    background-color: ${colors.navyBlue()};
  }

  &:visited {
    color: white;
  }

  &.tots-button-selected {
    background-color: #004f83;
    border-top: 2px solid #8491a1;
  }
`;

type Props = {
  visible: Boolean,
};

function SavePanel({ visible }: Props) {
  const {
    saveAsName,
    setSaveAsName,
    saveContinue,
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
  const [signedIn, setSignedIn] = useState(false);
  const [portal, setPortal] = useState(null);

  // Initialize the OAuth
  useEffect(() => {
    if (oAuthInfo) return;
    console.log('init oauth...');
    const info = new OAuthInfo({
      appId: process.env.REACT_APP_ARCGIS_APP_ID,
      popup: false,
    });
    IdentityManager.registerOAuthInfos([info]);

    setOAuthInfo(info);
  }, [setOAuthInfo, oAuthInfo]);

  // Check the user's sign in status
  const [
    hasCheckedSignInStatus,
    setHasCheckedSignInStatus, //
  ] = useState(false);
  useEffect(() => {
    if (!oAuthInfo || hasCheckedSignInStatus) return;

    console.log('check sign in status...');
    setHasCheckedSignInStatus(true);
    IdentityManager.checkSignInStatus(`${oAuthInfo.portalUrl}/sharing`)
      .then(() => {
        setSignedIn(true);

        const portal = new Portal();
        portal.authMode = 'immediate';
        portal.load().then(() => {
          setPortal(portal);
        });
      })
      .catch(() => {
        setSignedIn(false);
      });
  }, [oAuthInfo, setSignedIn, setPortal, hasCheckedSignInStatus]);

  const [errorMessageText, setErrorMessageText] = useState('');

  // Watch for when layers are added to the map
  const [mapLayerCount, setMapLayerCount] = useState(mapView.map.layers.length);
  const [layerWatcher, setLayerWatcher] = useState(false);
  useEffect(() => {
    if (!mapView || layerWatcher) return;

    console.log('init layers watchers...');
    const watcher = reactiveUtils.watch(
      () => mapView.map.layers.length,
      () => setMapLayerCount(mapView.map.layers.length),
    );

    setLayerWatcher(watcher);
  }, [layerWatcher, mapView]);

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
    // if (!mapView) return;

    // console.log('build switches...');
    // get a list of layers that were added as files as these will need
    // be flagged as costing money to store in AGO
    const fileLayerIds = [];
    widgetLayers.forEach((layer) => {
      if (layer.type === 'file') {
        fileLayerIds.push(layer.layer.id);
      }
    });

    // console.log('saveLayersList: ', saveLayersList);

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

      console.log('deleting a layer: ', layerId);
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

  // Checks browser storage to determine if the user clicked publish and logged in.
  const [saveButtonClicked, setSaveButtonClicked] = useState(false);
  const [continueInitialized, setContinueInitialized] = useState(false);
  useEffect(() => {
    if (continueInitialized || !layersInitialized) return;

    // continue publish is not true, exit early
    if (!saveContinue) {
      console.log('continue with saving 1...');
      setContinueInitialized(true);
      return;
    }

    // wait until HMW is signed in before trying to continue the publish
    if (!portal || !signedIn) return;

    console.log('continue with saving 2...');
    // continue with publishing
    setSaveButtonClicked(true);
    setSaveContinue(false);
    setContinueInitialized(true);
  }, [
    continueInitialized,
    layersInitialized,
    portal,
    saveContinue,
    setSaveContinue,
    signedIn,
  ]);

  // Run the publish
  useEffect(() => {
    if (!oAuthInfo || !portal || !signedIn) return;
    if (!saveButtonClicked) return;

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

    setSaveButtonClicked(false);
  }, [
    oAuthInfo,
    portal,
    saveButtonClicked,
    saveLayerFilter,
    saveLayersList,
    signedIn,
  ]);

  if (!mapView) return null;

  // Saves the data to ArcGIS Online
  const handleSaveAgo = (ev: MouseEvent<HTMLButtonElement>) => {
    // perform pre-checks
    if (!saveAsName) {
      setErrorMessageText('Please provide a name and try again.');
      return;
    }

    console.log('handle save...');

    setErrorMessageText('');

    setSaveContinue(true);

    IdentityManager.getCredential(`${oAuthInfo.portalUrl}/sharing`);
  };

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
            .sort((a, b) => {
              return a.label.localeCompare(b.label);
            })
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
          {oAuthInfo && (
            <button
              css={toolBarButtonStyles}
              onClick={(ev) => {
                if (signedIn) {
                  IdentityManager.destroyCredentials();
                  window.location.reload();
                } else {
                  IdentityManager.getCredential(
                    `${oAuthInfo.portalUrl}/sharing`,
                  );
                }
              }}
            >
              {signedIn ? 'Logout' : 'Login'}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

export default SavePanel;
