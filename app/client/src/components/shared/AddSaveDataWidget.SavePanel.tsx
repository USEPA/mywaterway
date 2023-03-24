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
// config
import { impairmentFields } from 'config/attainsToHmwMapping';
// contexts
import { useAddSaveDataWidgetState } from 'contexts/AddSaveDataWidget';
import { LocationSearchContext, Status } from 'contexts/locationSearch';
import { useLayerProps, useServicesContext } from 'contexts/LookupFiles';
// utils
import { isServiceNameAvailable, publish } from 'utils/arcGisRestUtils';
import {
  getMappedParameter,
  hasDefinitionExpression,
} from 'utils/mapFunctions';
// types
import {
  DischargerPermitComponents,
  Huc12SummaryData,
  MonitoringLocationGroups,
  MonitoringYearsRange,
  MonitoringWorkerData,
  ParameterToggleObject,
} from 'types/index';
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

const tooltipCost = {
  icon: 'fas fa-coins',
  text: 'Saving this layer may incur storage credits in ArcGIS online.',
  richText: (
    <>
      Saving this layer may incur{' '}
      <a
        href="https://doc.arcgis.com/en/arcgis-online/administer/credits.htm"
        target="_blank"
        rel="noopener noreferrer"
      >
        storage credits
      </a>{' '}
      in ArcGIS online.
    </>
  ),
};
const tooltipFiltered = {
  icon: 'fas fa-asterisk',
  text: 'Only the selections you have made on the map will be saved.',
};
const tooltipNotLoaded = {
  icon: 'fas fa-plus',
  text: 'Check to make sure this layer is loaded on your map.',
};

const layersToIgnore = [
  'nonprofitsLayer',
  'protectedAreasHighlightLayer',
  'surroundingDischargersLayer',
  'surroundingMonitoringLocationsLayer',
  'surroundingUsgsStreamgagesLayer',
];
if (
  window.location.pathname.includes('/plan-summary') ||
  window.location.pathname.includes('/waterbody-report')
) {
  layersToIgnore.push('monitoringLocationsLayer');
}

const layerTypesToIgnore = ['wcs', 'wfs'];

const layersRequireFeatureService = [
  'actionsWaterbodies',
  'boundariesLayer',
  'cyanLayer',
  'dischargersLayer',
  'issuesLayer',
  'monitoringLocationsLayer',
  'providersLayer',
  'searchIconLayer',
  'selectedTribeLayer',
  'usgsStreamgagesLayer',
  'waterbodyLayer',
  'upstreamLayer',
];

const layersMayBeFiltered = [
  'dischargersLayer',
  'issuesLayer',
  'monitoringLocationsLayer',
];

const layersMayNotHaveLoaded = ['cyanLayer', 'upstreamLayer'];

const layerFilterOptions = [
  { value: 'All', label: 'All' },
  { value: 'Free', label: 'No storage credits required' },
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

const sharedInputStyles = `
  border-width: 1px;
  border-style: solid;
  border-radius: 4px;
  border-color: hsl(0, 0%, 80%);
  margin-bottom: 10px;
  padding: 2px 8px;
  width: 100%;
`;

const addButtonStyles = css`
  margin: 0;
  min-width: 50%;
  font-weight: normal;
  font-size: 0.75rem;
`;

const buttonContainerStyles = css`
  display: flex;
  justify-content: flex-end;
  align-items: center;
`;

const descriptionInputStyles = css`
  ${sharedInputStyles}
  min-height: 36px;
  height: 72px;
  resize: vertical;
`;

const footnoteContainerStyles = css`
  margin: 0.625rem 0.5rem;
`;

const footnoteIconStyles = css`
  display: flex;
  align-items: center;
`;

const footnoteStyles = css`
  display: flex;
  gap: 0.25rem;
`;

const labelStyles = css`
  margin-right: 0.25rem;
`;

const listContainerStyles = css`
  margin: 0.625rem 0;
`;

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

const saveAsInputStyles = css`
  ${sharedInputStyles}
  height: 36px;
`;

const submitSectionStyles = css`
  margin-top: 1.5rem;
  margin-bottom: 0.625rem;
`;

const switchStyles = css`
  display: flex;
  align-items: center;
  margin-bottom: 0.625rem;
  gap: 0.5rem;
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
  const cipSummary = useContext(LocationSearchContext).cipSummary as {
    status: Status;
    data: Huc12SummaryData;
  };
  const dischargerPermitComponents = useContext(LocationSearchContext)
    .dischargerPermitComponents as DischargerPermitComponents | null;
  const mapView = useContext(LocationSearchContext)
    .mapView as __esri.MapView | null;
  const monitoringGroups = useContext(LocationSearchContext)
    .monitoringGroups as MonitoringLocationGroups | null;
  const monitoringYearsRange = useContext(LocationSearchContext)
    .monitoringYearsRange as MonitoringYearsRange | null;
  const monitoringWorkerData = useContext(LocationSearchContext)
    .monitoringWorkerData as MonitoringWorkerData;
  const parameterToggleObject = useContext(LocationSearchContext)
    .parameterToggleObject as ParameterToggleObject;
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
  const [mapLayerCount, setMapLayerCount] = useState(
    mapView?.map.layers.length,
  );
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

  // Build the list of switches
  useEffect(() => {
    if (!mapView) return;

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
        newSwitches[layer.id].requiresFeatureService =
          (layersRequireFeatureService.includes(layer.id) ||
            fileLayerIds.includes(layer.id)) &&
          !hasDefinitionExpression(layer);
      } else {
        newSwitches[layer.id] = {
          id: layer.id,
          label: layer.title,
          toggled: layer.visible,
          requiresFeatureService:
            (layersRequireFeatureService.includes(layer.id) ||
              fileLayerIds.includes(layer.id)) &&
            !hasDefinitionExpression(layer),
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
    if (!mapView) return;

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

      const webMapSuccess = response?.webMapResult.success ?? false;

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
        if (!webMapSuccess) errorMessage += 'Failed to save the web map.\n';

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
    if (!mapView || !saveLayersList) return;

    // check if user provided a name
    if (!saveAsName) {
      setPublishResponse({
        status: 'name-not-provided',
      });
      return;
    }

    const buildFilterString = (filters: string[]) => {
      return filters
        .map((filter, index) => {
          const seperator =
            index === 0 ? '' : index === filters.length - 1 ? ' and ' : ', ';

          return seperator + filter;
        })
        .join('');
    };

    // Gather the layers to be published
    const layersToPublish: LayerType[] = [];
    const layerDisclaimers: string[] = [];
    Object.values(saveLayersList).forEach((value) => {
      if (!value.toggled) return;
      if (saveLayerFilter === 'Free' && value.requiresFeatureService) {
        return;
      }
      if (
        value.id === 'upstreamLayer' &&
        upstreamWatershedResponse.status !== 'success'
      ) {
        return;
      }

      // get the widgetLayer for handling layers added via the Add Data Widget
      const widgetLayer = widgetLayers.find((l) => l.layer.id === value.id);
      const associatedData =
        value.id === 'upstreamLayer' ? upstreamWatershedResponse.data : null;

      layersToPublish.push({
        ...value,
        associatedData,
        widgetLayer,
      });

      // build the filter disclaimer for the dischargers layer
      if (value.id === 'dischargersLayer') {
        if (window.location.pathname.includes('/identified-issues')) {
          layerDisclaimers.push(`
            <i>${value.label}</i> is filtered to dischargers with significant violations.
          `);
        } else if (dischargerPermitComponents) {
          const dischargersFiltered = Object.values(
            dischargerPermitComponents,
          ).some((a) => !a.toggled);
          if (dischargersFiltered) {
            const filters: string[] = [];
            Object.keys(dischargerPermitComponents)
              .filter((key) => key !== 'All')
              .sort()
              .forEach((key) => {
                const group = dischargerPermitComponents[key];
                if (group.label === 'All' || !group.toggled) return;

                filters.push(group.label || 'None');
              });

            layerDisclaimers.push(`
              <i>${value.label}</i> is filtered to ${buildFilterString(
              filters,
            )}.
            `);
          }
        }
      }

      // build the filter disclaimer for the monitoringLocationsLayer
      if (
        value.id === 'monitoringLocationsLayer' &&
        monitoringGroups &&
        monitoringYearsRange
      ) {
        const monitoringGroupsFiltered = Object.values(monitoringGroups).some(
          (a) => !a.toggled,
        );
        const yearsFiltered =
          monitoringYearsRange &&
          (monitoringYearsRange[0] !== monitoringWorkerData.minYear ||
            monitoringYearsRange[1] !== monitoringWorkerData.maxYear);
        if (monitoringGroupsFiltered || yearsFiltered) {
          const filters: string[] = [];
          if (yearsFiltered) {
            filters.push(
              `years ${monitoringYearsRange[0]} - ${monitoringYearsRange[1]}`,
            );
          }

          if (monitoringGroupsFiltered) {
            Object.values(monitoringGroups)
              .sort((a, b) => a.label.localeCompare(b.label))
              .forEach((group) => {
                if (!group.label || group.label === 'All' || !group.toggled)
                  return;

                filters.push(group.label);
              });
          }

          layerDisclaimers.push(`
            <i>${value.label}</i> is filtered to ${buildFilterString(filters)}.
          `);
        }
      }

      // build the filter disclaimer for the issuesLayer
      if (
        value.id === 'issuesLayer' &&
        cipSummary.status === 'success' &&
        Object.keys(parameterToggleObject).length > 0
      ) {
        const filters: string[] = [];
        let allToggled: boolean = true;
        cipSummary.data.items[0].summaryByParameterImpairments.forEach(
          (param) => {
            const mappedParameter = getMappedParameter(
              impairmentFields,
              param['parameterGroupName'],
            );
            if (!mappedParameter) return;

            if (parameterToggleObject[mappedParameter.label]) {
              filters.push(mappedParameter.label);
            } else {
              allToggled = false;
            }
          },
        );

        if (!allToggled) {
          filters.sort();
          layerDisclaimers.push(`
            <i>${value.label}</i> is filtered to ${buildFilterString(filters)}.
          `);
        }
      }
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
          <br />
          <div>
            <strong>About the saved data:</strong>
            <p>
              This is a snapshot of the selected data that was saved in How's My Waterway at a 
              particular point in time. Note: If the data incurs 
              <a 
                href="https://doc.arcgis.com/en/arcgis-online/administer/credits.htm" 
                target="_blank" 
                rel="noopener noreferrer"
              >AGOL credits</a>, 
              it will not update on this web map as new data becomes available.
            </p>
          </div>
          ${
            layerDisclaimers.length > 0
              ? `
              <br />
              <div>
                <strong>Applied Layer filters selected in How’s My Waterway:</strong>
                <ul>
                  ${layerDisclaimers
                    .map((disclaimer) => {
                      return `<li>${disclaimer}</li>\n`;
                    })
                    .join('')}
                </ul>
              </div>
          `
              : ''
          }
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
                      label={tooltipCost.text}
                      iconClass={tooltipCost.icon}
                    />
                  )}
                  {layersMayBeFiltered.includes(key) && (
                    <HelpTooltip
                      label={tooltipFiltered.text}
                      iconClass={tooltipFiltered.icon}
                    />
                  )}
                  {layersMayNotHaveLoaded.includes(key) && (
                    <HelpTooltip
                      label={tooltipNotLoaded.text}
                      iconClass={tooltipNotLoaded.icon}
                    />
                  )}
                </div>
              );
            })}
      </div>
      <div css={footnoteContainerStyles}>
        <div css={footnoteStyles}>
          <i
            aria-hidden
            className={tooltipCost.icon}
            css={footnoteIconStyles}
          />
          <span>{tooltipCost.richText}</span>
        </div>

        <div css={footnoteStyles}>
          <i
            aria-hidden
            className={tooltipFiltered.icon}
            css={footnoteIconStyles}
          />
          <span>{tooltipFiltered.text}</span>
        </div>

        <div css={footnoteStyles}>
          <i
            aria-hidden
            className={tooltipNotLoaded.icon}
            css={footnoteIconStyles}
          />
          <span>{tooltipNotLoaded.text}</span>
        </div>
      </div>
      <div>
        <label htmlFor="save-as-name" css={labelStyles}>
          Name:{' '}
        </label>
        <HelpTooltip label="Enter web map name here for your reference" />
        <input
          id="save-as-name"
          css={saveAsInputStyles}
          value={saveAsName}
          onChange={(ev) => setSaveAsName(ev.target.value)}
        />
      </div>
      <div>
        <label htmlFor="service-description" css={labelStyles}>
          Description:{' '}
        </label>
        <HelpTooltip label="Enter description here for your reference" />
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
