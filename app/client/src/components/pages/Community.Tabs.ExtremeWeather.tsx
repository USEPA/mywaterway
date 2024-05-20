// @flow
/** @jsxImportSource @emotion/react */

import { css } from '@emotion/react';
import { EmotionJSX } from '@emotion/react/types/jsx-namespace';
import uniqueId from 'lodash/uniqueId';
import {
  Dispatch,
  Fragment,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react';
import Select, {
  components,
  OptionProps,
  SingleValueProps,
} from 'react-select';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
// components
import { HelpTooltip } from 'components/shared/HelpTooltip';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import Slider from 'components/shared/Slider';
import Switch from 'components/shared/Switch';
import TabErrorBoundary from 'components/shared/ErrorBoundary.TabErrorBoundary';
// contexts
import { useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
// utils
import { useDischargers, useWaterbodyFeatures } from 'utils/hooks';
import { isFeatureLayer, isGroupLayer } from 'utils/mapFunctions';
import {
  countOrNotAvailable,
  formatNumber,
  sentenceJoin,
  summarizeAssessments,
} from 'utils/utils';
// styles
import { reactSelectStyles, toggleTableStyles } from 'styles/index';
// types
import { FetchStatus } from 'types';

function getTickList(inline = false) {
  const separator = inline ? ' ' : <br />;
  return [
    {
      value: 0,
      label: (
        <Fragment>
          Modeled History
          {separator}
          <em>(1976 - 2005)</em>
        </Fragment>
      ),
      labelAria: 'Modeled History (1976 - 2005)',
    },
    {
      value: 1,
      label: (
        <Fragment>
          Early Century
          {separator}
          <em>(2015 - 2044)</em>
        </Fragment>
      ),
      labelAria: 'Early Century (2015 - 2044)',
    },
    {
      value: 2,
      label: (
        <Fragment>
          Mid Century
          {separator}
          <em>(2035 - 2064)</em>
        </Fragment>
      ),
      labelAria: 'Mid Century (2035 - 2064)',
    },
    {
      value: 3,
      label: (
        <Fragment>
          Late Century
          {separator}
          <em>(2070 - 2099)</em>
        </Fragment>
      ),
      labelAria: 'Late Century (2070 - 2099)',
    },
  ];
}

const tickList = getTickList();
const timeframeOptions = getTickList(true).map((t) => ({
  label: t.labelAria,
  labelHtml: t.label,
  value: t.value,
}));

// checks if all layers are in group layer
function allLayersAdded(
  layer: __esri.FeatureLayer | __esri.GroupLayer,
  queries: {
    serviceItemId?: string;
    query: __esri.Query | __esri.QueryProperties;
  }[],
) {
  if (isFeatureLayer(layer)) return true;

  const itemIds = queries.map((q) => q.serviceItemId);
  return itemIds.every((itemId) =>
    !itemId ? false : findByItemId(layer, itemId),
  );
}

// finds a layer by itemId, serviceItemId or layerId
function findByItemId(layer: __esri.GroupLayer, itemId: string) {
  return layer.layers.find(
    (l: any) =>
      l.itemId === itemId ||
      l.serviceItemId === itemId ||
      l.layerId.toString() === itemId,
  );
}

function getHistoricKey(type: HistoricType, timeframe: number) {
  let key = '';
  if (timeframe === 0) key += 'HISTORIC_';
  if (timeframe === 1) key += 'RCP85EARLY_';
  if (timeframe === 2) key += 'RCP85MID_';
  if (timeframe === 3) key += 'RCP85LATE_';

  key += 'MEAN_';
  if (type === 'fire') key += 'CONSECDD';
  if (type === 'drought') key += 'PRLT0IN';
  if (type === 'inlandFlooding') key += 'CONSECWD';
  if (type === 'inlandFloodingInches') key += 'PR_ANNUAL';
  if (type === 'coastalFlooding') key += 'SLR';
  if (type === 'extremeHeat') key += 'TMAX90F';

  return key;
}

function getHistoricValues(
  attributes: any,
  type: HistoricType,
): {
  [key: number]: number;
} {
  return {
    0: attributes[getHistoricKey(type, 0)],
    1: attributes[getHistoricKey(type, 1)],
    2: attributes[getHistoricKey(type, 2)],
    3: attributes[getHistoricKey(type, 3)],
  };
}

function getHistoricValue(
  attributes: any,
  timeframe: number,
  type: HistoricType,
  digits: number = 1,
) {
  let values = getHistoricValues(attributes, type);

  return formatNumber(Math.abs(values[timeframe]), digits, true);
}

function getHistoricValueRange(
  attributes: any,
  range: number[],
  type: HistoricType,
  aggType: 'difference' | 'max',
  digits: number = 1,
) {
  const rangeStart = range[0];
  const rangeEnd = range[1];

  let value = 0;
  let values = getHistoricValues(attributes, type);
  if (aggType === 'difference') value = values[rangeEnd] - values[rangeStart];
  if (aggType === 'max') {
    const array = Object.keys(values)
      .map(Number)
      .filter((k) => k >= rangeStart && k <= rangeEnd)
      .map((k) => values[k]);
    value = Math.max(...array);
  }

  // determine directionality
  const directionality =
    aggType === 'difference'
      ? `${value < 0 ? 'decreased' : 'increased'} by `
      : '';

  return `${directionality}${formatNumber(Math.abs(value), digits, true)}`;
}

// queries an individual layer after watcher finds layer has been loaded
async function queryLayer({
  layer,
  query,
}: {
  layer: __esri.FeatureLayer;
  query: __esri.Query | __esri.QueryProperties;
}) {
  return new Promise<__esri.FeatureSet>((resolve, reject) => {
    if (['failed', 'loaded'].includes(layer.loadStatus)) {
      queryLayerInner({
        layer,
        query,
        resolve,
        reject,
      });
    } else {
      // setup the watch event to see when the layer finishes loading
      const newWatcher = reactiveUtils.watch(
        () => layer.loadStatus,
        () => {
          if (['failed', 'loaded'].includes(layer.loadStatus))
            newWatcher.remove();
          queryLayerInner({
            layer,
            query,
            resolve,
            reject,
          });
        },
      );
    }
  });
}

// queries an individual layer
async function queryLayerInner({
  layer,
  query,
  resolve,
  reject,
}: {
  layer: __esri.FeatureLayer;
  query: __esri.Query | __esri.QueryProperties;
  resolve: (value: __esri.FeatureSet | PromiseLike<__esri.FeatureSet>) => void;
  reject: (reason?: any) => void;
}) {
  if (layer.loadStatus === 'failed')
    reject(`Failed to load layer: ${layer.title}`);

  try {
    resolve(await layer.queryFeatures(query));
  } catch (ex) {
    reject(`Failed to query layer ${layer.title}`);
  }
}

// queries multiple layers after watcher finds all necessary layers have
// been loaded
async function queryLayers({
  layer,
  queries,
  onSuccess,
  onError,
}: {
  layer: __esri.FeatureLayer | __esri.GroupLayer;
  queries: {
    serviceItemId?: string;
    query: __esri.Query | __esri.QueryProperties;
  }[];
  onSuccess: (response: __esri.FeatureSet[]) => void;
  onError: () => void;
}) {
  if (allLayersAdded(layer, queries)) {
    queryLayersInner({
      layer,
      queries,
      onSuccess,
      onError,
    });
  } else {
    const groupLayer = layer as __esri.GroupLayer;

    // setup the watch event to see when the layer finishes loading
    const newWatcher = reactiveUtils.watch(
      () => groupLayer.layers.length,
      () => {
        if (!allLayersAdded(layer, queries)) return;

        newWatcher.remove();
        if (timeout) clearTimeout(timeout);
        queryLayersInner({
          layer,
          queries,
          onSuccess,
          onError,
        });
      },
    );

    // error this out if it takes too long
    const timeout = setTimeout(() => {
      onError();
      if (newWatcher) newWatcher.remove();
    }, 60000);
  }
}

// queries multiple layers
async function queryLayersInner({
  layer,
  queries,
  onSuccess,
  onError,
}: {
  layer: __esri.FeatureLayer | __esri.GroupLayer;
  queries: {
    serviceItemId?: string;
    query: __esri.Query | __esri.QueryProperties;
  }[];
  onSuccess: (response: __esri.FeatureSet[]) => void;
  onError: () => void;
}) {
  try {
    const promises: Promise<__esri.FeatureSet>[] = [];
    queries.forEach((q) => {
      let childLayer = layer;
      if (isGroupLayer(layer) && q.serviceItemId) {
        const temp = findByItemId(layer, q.serviceItemId);
        if (temp) childLayer = temp as __esri.FeatureLayer;
      }

      if (isFeatureLayer(childLayer)) {
        promises.push(
          queryLayer({
            layer: childLayer,
            query: q.query,
          }),
        );
      }
    });

    onSuccess(await Promise.all(promises));
  } catch (ex) {
    console.error(ex);
    onError();
  }
}

function updateRow(
  config: SwitchTableConfig,
  status: FetchStatus,
  id: string,
  value: number | string | unknown[] | null = null,
) {
  updateRowField(
    config,
    id,
    'text',
    typeof value === 'string' ? value : countOrNotAvailable(value, status),
  );
  updateRowField(config, id, 'status', status);
}

function updateRowField(
  config: SwitchTableConfig,
  id: string,
  field: string,
  value: number | string | boolean | unknown[] | null = null,
) {
  const row = config.items.find((c) => c.id === id);
  if (row) {
    row[field as keyof Row] = value;
  }
}

/*
 * Styles
 */
const containerStyles = css`
  @media (min-width: 960px) {
    padding: 1em;
  }
`;

const countySelectStyles = css`
  margin-bottom: 1rem;
`;

const screenLabelStyles = css`
  display: inline-block;
  font-size: 0.875rem;
  font-weight: bold;
  margin-bottom: 0.125rem;
`;

const sectionHeaderContainerStyles = css`
  background-color: #f0f6f9;
  border-top: 1px solid #dee2e6;
  padding: 0.75rem;
`;

const sectionHeaderStyles = css`
  font-size: 1em;
  font-weight: bold;
  line-height: 1.5;
  overflow-wrap: anywhere;
  vertical-align: bottom;
  word-break: break-word;
`;

const sectionHeaderSelectStyles = css`
  margin: 0.5rem 0.5rem 0.25rem;
`;

const smallLoadingSpinnerStyles = css`
  svg {
    display: inline-block;
    margin: 0;
    height: 0.9rem;
    width: 0.9rem;
  }
`;

const subheadingStyles = css`
  font-weight: bold;
  padding-bottom: 0;
  text-align: center;
`;

const tableRowSectionHeaderStyles = css`
  font-weight: bold;
  text-align: left !important;
`;

function ExtremeWeather() {
  const {
    cipSummary,
    countyBoundaries,
    drinkingWater,
    hucBoundaries,
    mapView,
  } = useContext(LocationSearchContext);
  const { dischargers, dischargersStatus } = useDischargers();
  const {
    cmraScreeningLayer,
    coastalFloodingLayer,
    coastalFloodingRealtimeLayer,
    droughtRealtimeLayer,
    extremeColdRealtimeLayer,
    extremeHeatRealtimeLayer,
    inlandFloodingRealtimeLayer,
    providersLayer,
    storageTanksLayer,
    tribalLayer,
    visibleLayers,
    waterbodyLayer,
    wildfiresLayer,
  } = useLayers();
  const waterbodies = useWaterbodyFeatures();

  const [currentWeather, setCurrentWeather] = useState<SwitchTableConfig>({
    updateCount: 0,
    items: currentWatherDefaults,
  });
  const [historicalRiskRange, setHistoricalRiskRange] =
    useState<SwitchTableConfig>({
      updateCount: 0,
      items: historicalRangeDefaults,
    });
  const [historicalRisk, setHistoricalRisk] = useState<SwitchTableConfig>({
    updateCount: 0,
    items: historicalDefaults,
  });
  const [potentiallyVulnerable, setPotentiallyVulnerable] =
    useState<SwitchTableConfig>({
      updateCount: 0,
      items: potentiallyVulnerableDefaults,
    });

  const [timeframeSelection, setTimeframeSelection] = useState<{
    label: string;
    labelHtml: EmotionJSX.Element;
    value: number;
  }>(timeframeOptions[0]);

  // Syncs the toggles with the visible layers on the map. Mainly
  // used for when the user toggles layers in full screen mode and then
  // exits full screen.
  useEffect(() => {
    function handleSetting(config: SwitchTableConfig) {
      Object.entries(visibleLayers).forEach(([layerId, visible]) => {
        const row = config.items.find((l) => l.layerId === layerId);
        if (!row?.hasOwnProperty('checked')) return;
        row.checked = visible;
      });
      return {
        ...config,
        updateCount: config.updateCount + 1,
      };
    }

    setCurrentWeather(handleSetting);
    setPotentiallyVulnerable(handleSetting);
  }, [visibleLayers]);

  const [countyOptions, setCountyOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [countySelected, setCountySelected] = useState<{
    label: string;
    value: string;
  } | null>(null);
  useEffect(() => {
    const countyOptions = providersLayer?.graphics.toArray().map((c) => {
      return {
        label: c.attributes.NAME.toString(),
        value: c.attributes.FIPS.toString(),
      };
    });
    if (countyOptions) {
      setCountyOptions(countyOptions);

      const county = countyOptions.find(
        (c) => c.value === countyBoundaries.attributes.FIPS,
      );
      if (county) setCountySelected(county);
    }
  }, [countyBoundaries, providersLayer]);

  useEffect(() => {
    if (!countySelected) return;

    let countyGraphic: __esri.Graphic | null = null;
    providersLayer?.graphics.forEach((graphic) => {
      if (graphic.attributes.FIPS === countySelected.value) {
        graphic.visible = true;
        countyGraphic = graphic;
      } else graphic.visible = false;
    });
    if (providersLayer?.visible) mapView.goTo(countyGraphic);

    return function resetCountyVisibility() {
      providersLayer?.graphics.forEach((graphic) => {
        graphic.visible =
          graphic.attributes.FIPS === countyBoundaries.attributes.FIPS;
      });
    };
  }, [countyBoundaries, countySelected, mapView, providersLayer]);

  useEffect(() => {
    return function cleanup() {
      setHistoricalRisk({
        updateCount: 0,
        items: historicalDefaults,
      });
    };
  }, []);

  // update waterbodies
  useEffect(() => {
    if (cipSummary.status === 'fetching') {
      setPotentiallyVulnerable((config) => {
        updateRow(config, cipSummary.status, 'waterbodies');
        updateRow(config, cipSummary.status, 'goodWaterbodies');
        updateRow(config, cipSummary.status, 'impairedWaterbodies');
        updateRow(config, cipSummary.status, 'unknownWaterbodies');
        return {
          ...config,
          updateCount: config.updateCount + 1,
        };
      });
      return;
    }
    if (cipSummary.status === 'success' && (!waterbodyLayer || !waterbodies))
      return;

    const summary = summarizeAssessments(waterbodies ?? [], 'overallstatus');
    setPotentiallyVulnerable((config) => {
      updateRow(config, cipSummary.status, 'waterbodies', summary.total);
      updateRow(
        config,
        cipSummary.status,
        'goodWaterbodies',
        summary['Fully Supporting'],
      );
      updateRow(
        config,
        cipSummary.status,
        'impairedWaterbodies',
        summary['Not Supporting'],
      );
      updateRow(
        config,
        cipSummary.status,
        'unknownWaterbodies',
        summary.unassessed +
          summary['Insufficient Information'] +
          summary['Not Assessed'],
      );
      return {
        ...config,
        updateCount: config.updateCount + 1,
      };
    });
  }, [cipSummary, waterbodies, waterbodyLayer]);

  // update dischargers
  useEffect(() => {
    if (dischargersStatus === 'pending') {
      setPotentiallyVulnerable((config) => {
        updateRow(config, dischargersStatus, 'dischargers');
        return {
          ...config,
          updateCount: config.updateCount + 1,
        };
      });
      return;
    }

    setPotentiallyVulnerable((config) => {
      updateRow(config, dischargersStatus, 'dischargers', dischargers);
      return {
        ...config,
        updateCount: config.updateCount + 1,
      };
    });
  }, [dischargers, dischargersStatus]);

  // update drinking water
  useEffect(() => {
    if (!countySelected) return;
    if (drinkingWater.status === 'fetching') {
      setPotentiallyVulnerable((config) => {
        updateRow(config, drinkingWater.status, 'drinkingWaterSystems');
        updateRow(config, drinkingWater.status, 'groundWaterSources');
        updateRow(config, drinkingWater.status, 'surfaceWaterSources');
        return {
          ...config,
          updateCount: config.updateCount + 1,
        };
      });
      return;
    }

    setPotentiallyVulnerable((config) => {
      if (!countySelected) return config;

      let totalSystems = 0;
      let groundWater = 0;
      let surfaceWater = 0;
      drinkingWater?.data?.[countySelected.value]?.forEach((system: any) => {
        if (system.huc12) return;
        totalSystems += 1;
        if (system.gw_sw_code === 'GW') groundWater += 1;
        if (system.gw_sw_code === 'SW') surfaceWater += 1;
      });
      updateRow(
        config,
        drinkingWater.status,
        'drinkingWaterSystems',
        totalSystems,
      );
      updateRow(
        config,
        drinkingWater.status,
        'groundWaterSources',
        groundWater,
      );
      updateRow(
        config,
        drinkingWater.status,
        'surfaceWaterSources',
        surfaceWater,
      );
      return {
        ...config,
        updateCount: config.updateCount + 1,
      };
    });
  }, [countySelected, drinkingWater]);

  // update tribal
  useEffect(() => {
    if (!hucBoundaries || !tribalLayer) return;

    async function queryLayer() {
      if (!hucBoundaries || !tribalLayer) return;

      setPotentiallyVulnerable((config) => {
        updateRow(config, 'pending', 'tribes');
        return {
          ...config,
          updateCount: config.updateCount + 1,
        };
      });

      const requests: Promise<number>[] = [];
      tribalLayer.layers.forEach((layer) => {
        if (!isFeatureLayer(layer)) return;
        requests.push(
          layer.queryFeatureCount({
            geometry: hucBoundaries.features[0].geometry,
          }),
        );
      });

      try {
        const responses = await Promise.all(requests);
        let numTribes = 0;
        responses.forEach((res) => (numTribes += res));

        setPotentiallyVulnerable((config) => {
          updateRow(config, 'success', 'tribes', numTribes);
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        });
      } catch (ex) {
        setPotentiallyVulnerable((config) => {
          updateRow(config, 'failure', 'tribes');
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        });
      }
    }
    queryLayer();
  }, [hucBoundaries, tribalLayer]);

  // update wildfires
  useEffect(() => {
    if (!hucBoundaries || !wildfiresLayer) return;

    setCurrentWeather((config) => {
      updateRow(config, 'pending', 'fire');
      return {
        ...config,
        updateCount: config.updateCount + 1,
      };
    });

    queryLayers({
      layer: wildfiresLayer,
      queries: [
        {
          serviceItemId: '0',
          query: {
            geometry: hucBoundaries.features[0].geometry,
            outFields: ['DailyAcres'],
          },
        },
      ],
      onSuccess: (response) => {
        let numFires = response[0].features.length;
        let acresBurned = 0;
        response[0].features.forEach(
          (feature) => (acresBurned += feature.attributes.DailyAcres),
        );

        let status = '';
        if (numFires === 0) status = 'No Fires';
        else {
          if (numFires === 1) status = '1 Fire, ';
          else status = `${numFires} Fires, `;

          if (acresBurned === 1) status += '1 Acre Burned';
          else status += `${acresBurned} Acres Burned`;
        }

        setCurrentWeather((config) => {
          updateRow(config, 'success', 'fire', status);
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        });
      },
      onError: () =>
        setCurrentWeather((config) => {
          updateRow(config, 'failure', 'fire');
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        }),
    });
  }, [hucBoundaries, wildfiresLayer]);

  // update historical/future (cmra screening)
  const [range, setRange] = useState([
    tickList[0].value,
    tickList[tickList.length - 1].value,
  ]);
  useEffect(() => {
    if (!cmraScreeningLayer || !countySelected) return;

    async function queryLayer() {
      if (!cmraScreeningLayer || !countySelected) return;

      setHistoricalRiskRange((config) => {
        updateRow(config, 'pending', 'fire');
        updateRow(config, 'pending', 'drought');
        updateRow(config, 'pending', 'inlandFlooding');
        updateRow(config, 'pending', 'coastalFlooding');
        updateRow(config, 'pending', 'extremeHeat');
        return {
          ...config,
          updateCount: config.updateCount + 1,
        };
      });

      try {
        const response = await cmraScreeningLayer.queryFeatures({
          outFields: cmraScreeningLayer.outFields,
          where: `GEOID = '${countySelected.value}'`,
        });

        if (response.features.length === 0) {
          setHistoricalRiskRange((config) => {
            updateRow(config, 'success', 'fire', '');
            updateRow(config, 'success', 'drought', '');
            updateRow(config, 'success', 'inlandFlooding', '');
            updateRow(config, 'success', 'coastalFlooding', '');
            updateRow(config, 'success', 'extremeHeat', '');
            return {
              ...config,
              updateCount: config.updateCount + 1,
            };
          });
        }

        const attributes = response.features[0].attributes;
        const isSame = range[0] === range[1];
        const startText = isSame ? 'Max number of' : 'Change in';
        const aggType = isSame ? 'max' : 'difference';

        const fireText = `${startText} annual consecutive (dry days): ${getHistoricValueRange(attributes, range, 'fire', aggType)}`;
        const droughtText = `${startText} annual days with no rain (dry days): ${getHistoricValueRange(attributes, range, 'drought', aggType)}`;
        const inlandFloodingText = `${startText} annual days with rain (wet days): ${getHistoricValueRange(attributes, range, 'inlandFlooding', aggType)}`;
        const coastalFloodingText = `${startText.replace(' number of', '')} % of county impacted by sea level rise: ${getHistoricValueRange(attributes, range, 'coastalFlooding', aggType)}`;
        const extremeHeatText = `${startText} annual days with max temperature over 90°F: ${getHistoricValueRange(attributes, range, 'extremeHeat', aggType)}`;

        setHistoricalRiskRange((config) => {
          updateRow(config, 'success', 'fire', fireText);
          updateRow(config, 'success', 'drought', droughtText);
          updateRow(config, 'success', 'inlandFlooding', inlandFloodingText);
          updateRow(config, 'success', 'coastalFlooding', coastalFloodingText);
          updateRow(config, 'success', 'extremeHeat', extremeHeatText);
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        });
      } catch (ex) {
        setHistoricalRiskRange((config) => {
          updateRow(config, 'failure', 'fire');
          updateRow(config, 'failure', 'drought');
          updateRow(config, 'failure', 'inlandFlooding');
          updateRow(config, 'failure', 'coastalFlooding');
          updateRow(config, 'failure', 'extremeHeat');
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        });
      }
    }

    queryLayer();
  }, [cmraScreeningLayer, countySelected, range]);

  // update historical/future (cmra screening) with map
  useEffect(() => {
    if (!cmraScreeningLayer || !countySelected) return;

    async function queryLayer() {
      if (!cmraScreeningLayer || !countySelected) return;

      setHistoricalRisk((config) => {
        updateRow(config, 'pending', 'fire');
        updateRow(config, 'pending', 'drought');
        updateRow(config, 'pending', 'inlandFloodingInches');
        updateRow(config, 'pending', 'coastalFlooding');
        updateRow(config, 'pending', 'extremeHeat');
        return {
          ...config,
          updateCount: config.updateCount + 1,
        };
      });

      try {
        const response = await cmraScreeningLayer.queryFeatures({
          outFields: cmraScreeningLayer.outFields,
          where: `GEOID = '${countySelected.value}'`,
        });

        if (response.features.length === 0) {
          setHistoricalRisk((config) => {
            updateRow(config, 'success', 'fire', '');
            updateRow(config, 'success', 'drought', '');
            updateRow(config, 'success', 'inlandFloodingInches', '');
            updateRow(config, 'success', 'coastalFlooding', '');
            updateRow(config, 'success', 'extremeHeat', '');
            return {
              ...config,
              updateCount: config.updateCount + 1,
            };
          });
        }

        const attributes = response.features[0].attributes;
        const range = timeframeSelection.value;

        const fireText = `Max number of annual consecutive (dry days): ${getHistoricValue(attributes, range, 'fire')}`;
        const droughtText = `Annual days with no rain (dry days): ${getHistoricValue(attributes, range, 'drought')}`;
        const inlandFloodingText = `Average annual total precipitation: ${getHistoricValue(attributes, range, 'inlandFloodingInches')} inches`;
        const coastalFloodingText = `% of county impacted by sea level rise: ${getHistoricValue(attributes, range, 'coastalFlooding')}`;
        const extremeHeatText = `Annual days with max temperature over 90°F: ${getHistoricValue(attributes, range, 'extremeHeat')}`;

        setHistoricalRisk((config) => {
          updateRow(config, 'success', 'fire', fireText);
          updateRow(config, 'success', 'drought', droughtText);
          updateRow(
            config,
            'success',
            'inlandFloodingInches',
            inlandFloodingText,
          );
          updateRow(config, 'success', 'coastalFlooding', coastalFloodingText);
          updateRow(config, 'success', 'extremeHeat', extremeHeatText);
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        });
      } catch (ex) {
        setHistoricalRisk((config) => {
          updateRow(config, 'failure', 'fire');
          updateRow(config, 'failure', 'drought');
          updateRow(config, 'failure', 'inlandFloodingInches');
          updateRow(config, 'failure', 'coastalFlooding');
          updateRow(config, 'failure', 'extremeHeat');
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        });
      }
    }

    queryLayer();
  }, [cmraScreeningLayer, countySelected, timeframeSelection]);

  // update historical/future coastal flooding
  useEffect(() => {
    if (!coastalFloodingLayer) return;

    coastalFloodingLayer.layers.forEach((l, index) => {
      if (index === 0) return;

      const active = timeframeSelection.value === index;
      l.visible = active;
      l.listMode = active ? 'show' : 'hide';
    });
  }, [coastalFloodingLayer, timeframeSelection]);

  useEffect(() => {
    if (!coastalFloodingLayer) return;
    return function cleanup() {
      coastalFloodingLayer.visible = false;
      coastalFloodingLayer.listMode = 'hide';
    };
  }, [coastalFloodingLayer]);

  // update drought
  useEffect(() => {
    if (!hucBoundaries || !droughtRealtimeLayer) return;

    setCurrentWeather((config) => {
      updateRow(config, 'pending', 'drought');
      return {
        ...config,
        updateCount: config.updateCount + 1,
      };
    });

    queryLayers({
      layer: droughtRealtimeLayer,
      queries: [
        {
          query: {
            geometry: hucBoundaries.features[0].geometry,
            outFields: ['dm'],
          },
        },
      ],
      onSuccess: (responses) => {
        const dmEnum: { [key: string]: string } = {
          '-1': 'No Drought',
          '0': 'Abnormally Dry',
          '1': 'Moderate Drought',
          '2': 'Severe Drought',
          '3': 'Extreme Drought',
          '4': 'Exceptional Drought',
        };

        let maxCategory = -1;
        responses[0].features.forEach((f) => {
          maxCategory = Math.max(maxCategory, f.attributes.dm);
        });

        setCurrentWeather((config) => {
          updateRow(
            config,
            'success',
            'drought',
            dmEnum[maxCategory.toString()],
          );
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        });
      },
      onError: () =>
        setCurrentWeather((config) => {
          updateRow(config, 'failure', 'drought');
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        }),
    });
  }, [hucBoundaries, droughtRealtimeLayer]);

  // update inland flooding
  useEffect(() => {
    if (!hucBoundaries || !inlandFloodingRealtimeLayer) return;

    setCurrentWeather((config) => {
      updateRow(config, 'pending', 'inlandFlooding');
      return {
        ...config,
        updateCount: config.updateCount + 1,
      };
    });

    // TODO consider moving serviceItemId to config
    queryLayers({
      layer: inlandFloodingRealtimeLayer,
      queries: [
        {
          serviceItemId: 'a6134ae01aad44c499d12feec782b386', // watches warnings
          query: {
            geometry: hucBoundaries.features[0].geometry,
            outFields: ['Event'],
          },
        },
        {
          serviceItemId: 'f9e9283b9c9741d09aad633f68758bf6', // precipitation
          query: {
            geometry: hucBoundaries.features[0].geometry,
            outFields: ['category', 'label'],
          },
        },
      ],
      onSuccess: (responses) => {
        const watchRes = responses[0];
        const floodRes = responses[1];

        let statuses: string[] = [];
        watchRes.features.forEach((f) => {
          statuses.push(f.attributes.Event);
        });
        if (floodRes.features.length > 0)
          statuses.push('Rain Expected (next 72 hours)');

        setCurrentWeather((config) => {
          updateRow(
            config,
            'success',
            'inlandFlooding',
            statuses.length === 0 ? 'No Flooding' : sentenceJoin(statuses),
          );
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        });
      },
      onError: () => {
        setCurrentWeather((config) => {
          updateRow(config, 'failure', 'inlandFlooding');
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        });
      },
    });
  }, [hucBoundaries, inlandFloodingRealtimeLayer]);

  // update costal flooding
  useEffect(() => {
    if (!hucBoundaries || !coastalFloodingRealtimeLayer) return;

    setCurrentWeather((config) => {
      updateRow(config, 'pending', 'coastalFlooding');
      return {
        ...config,
        updateCount: config.updateCount + 1,
      };
    });

    queryLayers({
      layer: coastalFloodingRealtimeLayer,
      queries: [
        {
          serviceItemId: '22726ed54d804f3e9134550406520405', // watches warnings
          query: {
            geometry: hucBoundaries.features[0].geometry,
            outFields: ['Event'],
          },
        },
      ],
      onSuccess: (responses) => {
        let statuses: string[] = [];
        responses[0].features.forEach((f) => {
          statuses.push(f.attributes.Event);
        });

        setCurrentWeather((config) => {
          updateRow(
            config,
            'success',
            'coastalFlooding',
            statuses.length === 0 ? 'No Flooding' : sentenceJoin(statuses),
          );
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        });
      },
      onError: () => {
        setCurrentWeather((config) => {
          updateRow(config, 'failure', 'coastalFlooding');
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        });
      },
    });
  }, [hucBoundaries, coastalFloodingRealtimeLayer]);

  // update extreme cold
  useEffect(() => {
    if (!hucBoundaries || !extremeColdRealtimeLayer) return;

    setCurrentWeather((config) => {
      updateRow(config, 'pending', 'extremeCold');
      return {
        ...config,
        updateCount: config.updateCount + 1,
      };
    });

    queryLayers({
      layer: extremeColdRealtimeLayer,
      queries: [
        {
          serviceItemId: 'a6134ae01aad44c499d12feec782b386', // watches warnings
          query: {
            geometry: hucBoundaries.features[0].geometry,
            outFields: ['Event'],

            // workaround because the web map filters these out with the unique value renderer instead of by definition expression
            where:
              "Event IN ('Extreme Cold Warning', 'Extreme Cold Watch', 'Wind Chill Advisory', 'Wind Chill Warning', 'Wind Chill Watch')",
          },
        },
        {
          serviceItemId: '0ae7cf18df0a4b4d9e7eea665f00500d', // min temperature
          query: {
            geometry: hucBoundaries.features[0].geometry,
            outFields: ['Temp'],
          },
        },
      ],
      onSuccess: (responses) => {
        const watchRes = responses[0];
        const tempRes = responses[1];

        let statuses: string[] = [];
        watchRes.features.forEach((f) => {
          statuses.push(f.attributes.Event);
        });

        let minTemp = Number.MAX_SAFE_INTEGER;
        tempRes.features.forEach((f) => {
          const temp = f.attributes.Temp;
          if (temp < minTemp) minTemp = temp;
        });
        if (minTemp < Number.MAX_SAFE_INTEGER)
          statuses.push(`Min Daily Air Temp: ${minTemp}°F`);

        setCurrentWeather((config) => {
          updateRow(
            config,
            'success',
            'extremeCold',
            statuses.length === 0 ? 'No Extreme Cold' : sentenceJoin(statuses),
          );
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        });
      },
      onError: () => {
        setCurrentWeather((config) => {
          updateRow(config, 'failure', 'extremeCold');
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        });
      },
    });
  }, [hucBoundaries, extremeColdRealtimeLayer]);

  // update extreme heat
  useEffect(() => {
    if (!hucBoundaries || !extremeHeatRealtimeLayer) return;

    setCurrentWeather((config) => {
      updateRow(config, 'pending', 'extremeHeat');
      return {
        ...config,
        updateCount: config.updateCount + 1,
      };
    });

    queryLayers({
      layer: extremeHeatRealtimeLayer,
      queries: [
        {
          serviceItemId: 'a6134ae01aad44c499d12feec782b386', // watches warnings
          query: {
            geometry: hucBoundaries.features[0].geometry,
            outFields: ['Event'],

            // workaround because the web map filters these out with the unique value renderer instead of by definition expression
            where:
              "Event IN ('Excessive Heat Warning', 'Excessive Heat Watch', 'Heat Advisory')",
          },
        },
        {
          serviceItemId: '0ae7cf18df0a4b4d9e7eea665f00500d', // min temperature
          query: {
            geometry: hucBoundaries.features[0].geometry,
            outFields: ['Temp'],
          },
        },
      ],
      onSuccess: (responses) => {
        const watchRes = responses[0];
        const tempRes = responses[1];

        let statuses: string[] = [];
        watchRes.features.forEach((f) => {
          statuses.push(f.attributes.Event);
        });

        let maxTemp = Number.MIN_SAFE_INTEGER;
        tempRes.features.forEach((f) => {
          const temp = f.attributes.Temp;
          if (temp > maxTemp) maxTemp = temp;
        });
        if (maxTemp > Number.MIN_SAFE_INTEGER)
          statuses.push(`Max Daily Air Temp: ${maxTemp}°F`);

        setCurrentWeather((config) => {
          updateRow(
            config,
            'success',
            'extremeHeat',
            statuses.length === 0 ? 'No Extreme Heat' : sentenceJoin(statuses),
          );
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        });
      },
      onError: () => {
        setCurrentWeather((config) => {
          updateRow(config, 'failure', 'extremeHeat');
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        });
      },
    });
  }, [hucBoundaries, extremeHeatRealtimeLayer]);

  // update storage tanks
  useEffect(() => {
    if (!hucBoundaries || !storageTanksLayer) return;

    setPotentiallyVulnerable((config) => {
      updateRow(config, 'pending', 'pollutantStorageTanks');
      return {
        ...config,
        updateCount: config.updateCount + 1,
      };
    });

    queryLayers({
      layer: storageTanksLayer,
      queries: [
        {
          query: {
            geometry: hucBoundaries.features[0].geometry,
          },
        },
      ],
      onSuccess: (responses) => {
        setPotentiallyVulnerable((config) => {
          updateRow(
            config,
            'success',
            'pollutantStorageTanks',
            responses[0].features.length,
          );
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        });
      },
      onError: () =>
        setPotentiallyVulnerable((config) => {
          updateRow(config, 'failure', 'pollutantStorageTanks');
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        }),
    });
  }, [hucBoundaries, storageTanksLayer]);

  return (
    <div css={containerStyles}>
      <SelectionTable
        id="current-weather-switch"
        mapView={mapView}
        value={currentWeather}
        setter={setCurrentWeather}
        columns={['Current Severe Weather Events', 'Status Within Watershed']}
      />

      <div css={countySelectStyles}>
        <span css={screenLabelStyles}>County:</span>
        <Select
          aria-label="County"
          className="select"
          inputId="county"
          isSearchable={false}
          options={countyOptions}
          value={countySelected}
          onChange={(ev) => setCountySelected(ev)}
          styles={reactSelectStyles}
        />
      </div>

      <div css={sectionHeaderContainerStyles}>
        <div css={sectionHeaderStyles}>
          Historical Risk and Potential Future Scenarios
        </div>
      </div>

      <Slider
        list={tickList}
        marginBottom={'1.5rem'}
        max={tickList[tickList.length - 1].value}
        range={[tickList[0].value, tickList[tickList.length - 1].value]}
        onChange={(value) => setRange(value)}
        sliderVerticalBreak={300}
        steps={null}
        valueLabelDisplay="off"
        headerElm={
          <p css={subheadingStyles}>
            <HelpTooltip label="Adjust the slider handles to filter location data by the selected year range" />
            &nbsp;&nbsp; Date range for the <em>{countySelected?.label}</em>{' '}
            county{' '}
          </p>
        }
      />

      <SelectionTable
        hideHeader={true}
        id="historical-risk-range-switch"
        mapView={mapView}
        value={historicalRiskRange}
        setter={setHistoricalRiskRange}
        columns={[
          'Historical Risk and Potential Future Scenarios',
          'Status Within County',
        ]}
      />

      <div css={sectionHeaderContainerStyles}>
        <div css={sectionHeaderStyles}>
          Historical Risk and Potential Future Scenarios
        </div>
        <div css={sectionHeaderSelectStyles}>
          <span css={screenLabelStyles}>Timeframe:</span>
          <Select
            aria-label="Timeframe"
            className="select"
            inputId="timeframe"
            isSearchable={false}
            options={timeframeOptions}
            styles={reactSelectStyles}
            value={timeframeSelection}
            onChange={(ev) => {
              if (ev) setTimeframeSelection(ev);
            }}
            components={{
              Option: (props: OptionProps<any>) => {
                return (
                  <components.Option {...props}>
                    {(props.data as any).labelHtml}
                  </components.Option>
                );
              },
              SingleValue: ({ children, ...props }: SingleValueProps<any>) => {
                return (
                  <components.SingleValue {...props}>
                    {(props.data as any).labelHtml}
                  </components.SingleValue>
                );
              },
            }}
          />
        </div>
      </div>

      <SelectionTable
        hideHeader={true}
        id="historical-risk-switch"
        mapView={mapView}
        timeframe={timeframeSelection.value}
        type="radio"
        value={historicalRisk}
        setter={setHistoricalRisk}
        columns={[
          'Historical Risk and Potential Future Scenarios',
          'Status Within County',
        ]}
        callback={(row: Row, layer: __esri.Layer) => {
          if (!layer || !isFeatureLayer(layer)) return;

          if (row.id !== 'coastalFlooding') {
            // get field
            const field = getHistoricKey(
              row.id as HistoricType,
              timeframeSelection.value,
            );

            layer.title = `${row.label} ${timeframeSelection.label}`;

            // update field renderer
            (layer.renderer as __esri.ClassBreaksRenderer).field = field;

            // update field visual variables
            (
              layer.renderer as __esri.ClassBreaksRenderer
            ).visualVariables.forEach((variable) => {
              if (variable.type === 'color') variable.field = field;
            });

            // update field popup expression
            if (layer.popupTemplate?.expressionInfos?.length > 0)
              layer.popupTemplate.expressionInfos[0].expression = `Round($feature.${field}, 1)`;
          }
        }}
      />

      <SelectionTable
        id="potentially-vulnerable-switch"
        mapView={mapView}
        value={potentiallyVulnerable}
        setter={setPotentiallyVulnerable}
        columns={[
          'Potentially Vulnerable Waters, Infrastructure or Communities',
          'Count',
        ]}
      />
    </div>
  );
}

const modifiedToggleTableStyles = (hideHeader: boolean | undefined) => css`
  ${toggleTableStyles}
  ${hideHeader ? 'margin-top: -1px;' : ''}
`;

const toggleStyles = css`
  display: flex;
  align-items: center;
  margin-bottom: 0;

  span {
    margin-left: 0.5rem;
  }
`;

type SelectionTableProps = {
  callback?: (row: Row, layer: __esri.Layer) => void;
  columns: string[];
  hideHeader?: boolean;
  id: string;
  mapView: __esri.MapView;
  timeframe?: number;
  type?: 'radio' | 'switch';
  value: SwitchTableConfig;
  setter: Dispatch<SetStateAction<SwitchTableConfig>>;
};

function SelectionTable({
  callback,
  columns,
  hideHeader,
  id,
  mapView,
  timeframe,
  type = 'switch',
  value,
  setter,
}: Readonly<SelectionTableProps>) {
  const hasSubheadings = value.items.findIndex((i) => i.subHeading) > -1;

  const [selectedRow, setSelectedRow] = useState<Row | null>(null);

  useEffect(() => {
    if (!callback || !selectedRow || typeof timeframe !== 'number') return;

    const layer = mapView?.map.findLayerById(selectedRow.layerId ?? '');
    callback(selectedRow, layer);
  }, [callback, mapView, selectedRow, timeframe]);

  return (
    <table css={modifiedToggleTableStyles(hideHeader)} className="table">
      <thead className={hideHeader ? 'sr-only' : ''}>
        <tr>
          {columns.map((col) => {
            return <th key={col}>{col}</th>;
          })}
        </tr>
      </thead>
      <tbody>
        {value.items.map((item) => {
          const layer = mapView?.map.findLayerById(item.layerId ?? '');
          let marginLeftBase = item.indent
            ? item.checked !== undefined
              ? '1.6rem'
              : '4rem'
            : undefined;
          const marginLeft = hasSubheadings
            ? `calc(${marginLeftBase ?? '0px'} + 1rem)`
            : marginLeftBase;
          const itemValue = item.text;

          if (item.subHeading) {
            return (
              <tr key={uniqueId(id)}>
                <th
                  colSpan={2}
                  scope="colgroup"
                  css={tableRowSectionHeaderStyles}
                >
                  {item.label}
                </th>
              </tr>
            );
          }

          return (
            <tr key={uniqueId(id)}>
              <td>
                {item.checked === undefined ? (
                  <span style={{ marginLeft }}>{item.label}</span>
                ) : (
                  <label css={toggleStyles} style={{ marginLeft }}>
                    {type === 'radio' && (
                      <input
                        type="radio"
                        checked={item.checked}
                        disabled={item.disabled}
                        name={id}
                        value={item.id}
                        onChange={() => {}}
                        onClick={() => {
                          let newSelectedRow: Row | null = null;
                          setter((config) => {
                            config.items.forEach((cw) => {
                              cw.checked = cw.id === item.id && !cw.checked;
                              if (cw.id === item.id && cw.checked)
                                newSelectedRow = item;

                              const layer = mapView?.map.findLayerById(
                                cw.layerId ?? '',
                              );
                              if (!layer) return;

                              if (
                                cw.layerId !== item.layerId ||
                                cw.id === item.id
                              ) {
                                layer.visible = cw.checked;
                                layer.listMode = cw.checked ? 'show' : 'hide';
                              }

                              // update layer properties
                              if (
                                cw.id === item.id &&
                                item.layerProperties &&
                                isFeatureLayer(layer)
                              ) {
                                Object.entries(item.layerProperties).forEach(
                                  ([key, value]) => {
                                    (layer as any)[key] = value;
                                  },
                                );
                              }
                            });

                            return {
                              ...config,
                              updateCount: config.updateCount + 1,
                            };
                          });

                          setSelectedRow(newSelectedRow);
                        }}
                      />
                    )}
                    {type === 'switch' && (
                      <Switch
                        checked={item.checked}
                        disabled={item.disabled || !item.layerId || !layer}
                        onChange={(checked) => {
                          if (!layer || !item.layerId) return;

                          layer.visible = checked;

                          setter((config) => {
                            const itemUpdate = config.items.find(
                              (cw) => cw.id === item.id,
                            );
                            if (!itemUpdate) return config;

                            itemUpdate.checked = checked;
                            return {
                              ...config,
                              updateCount: config.updateCount + 1,
                            };
                          });

                          if (callback) callback(item, layer);
                        }}
                      />
                    )}
                    <span style={{ marginLeft: '0.5rem' }}>{item.label}</span>
                  </label>
                )}
              </td>
              <td>
                {item.status &&
                ['pending', 'fetching'].includes(item.status) ? (
                  <div css={smallLoadingSpinnerStyles}>
                    <LoadingSpinner />
                  </div>
                ) : (
                  itemValue
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function ExtremeWeatherContainer() {
  return (
    <TabErrorBoundary tabName="Extreme Weather">
      <ExtremeWeather />
    </TabErrorBoundary>
  );
}

type HistoricType =
  | 'fire'
  | 'drought'
  | 'inlandFlooding'
  | 'inlandFloodingInches'
  | 'coastalFlooding'
  | 'extremeHeat';

type Row = {
  checked?: boolean;
  disabled?: boolean;
  id: string;
  indent?: boolean;
  label: string;
  layerId?: string;
  layerProperties?: any;
  status?: FetchStatus;
  subHeading?: boolean;
  text?: string;
};

type SwitchTableConfig = {
  updateCount: number;
  items: Row[];
};

const currentWatherDefaults: Row[] = [
  {
    id: 'fire',
    label: 'Fire',
    checked: false,
    disabled: false,
    layerId: 'wildfiresLayer',
    status: 'idle',
    text: '',
  },
  {
    id: 'drought',
    label: 'Drought',
    checked: false,
    disabled: false,
    layerId: 'droughtRealtimeLayer',
    status: 'idle',
    text: '',
  },
  {
    id: 'inlandFlooding',
    label: 'Inland Flooding',
    checked: false,
    disabled: false,
    layerId: 'inlandFloodingRealtimeLayer',
    status: 'idle',
    text: '',
  },
  {
    id: 'coastalFlooding',
    label: 'Coastal Flooding',
    checked: false,
    disabled: false,
    layerId: 'coastalFloodingRealtimeLayer',
    status: 'idle',
    text: '',
  },
  {
    id: 'extremeHeat',
    label: 'Extreme Heat',
    checked: false,
    disabled: false,
    layerId: 'extremeHeatRealtimeLayer',
    status: 'idle',
    text: '',
  },
  {
    id: 'extremeCold',
    label: 'Extreme Cold',
    checked: false,
    disabled: false,
    layerId: 'extremeColdRealtimeLayer',
    status: 'idle',
    text: '',
  },
];
const historicalRangeDefaults: Row[] = [
  {
    id: 'fire',
    label: 'Fire',
    status: 'idle',
    text: '',
  },
  {
    id: 'drought',
    label: 'Drought',
    status: 'idle',
    text: '',
  },
  {
    id: 'inlandFlooding',
    label: 'Inland Flooding',
    status: 'idle',
    text: '',
  },
  {
    id: 'coastalFlooding',
    label: 'Coastal Flooding',
    status: 'idle',
    text: '',
  },
  {
    id: 'extremeHeat',
    label: 'Extreme Heat',
    status: 'idle',
    text: '',
  },
];
const historicalDefaults: Row[] = [
  {
    id: 'fire',
    label: 'Fire',
    checked: false,
    disabled: false,
    layerId: 'cmraScreeningLayer',
    status: 'idle',
    text: '',
    layerProperties: {
      blendMode: 'multiply',
      title: 'Fire',
      renderer: {
        type: 'class-breaks',
        field: 'HISTORIC_MAX_CONSECDD',
        classBreakInfos: [
          {
            minValue: -9007199254740991,
            maxValue: 9007199254740991,
            symbol: {
              type: 'simple-fill',
              color: [170, 170, 170, 255],
              outline: {
                type: 'simple-line',
                color: [225, 229, 232, 107],
                width: 0,
                style: 'solid',
              },
              style: 'solid',
            },
          },
        ],
        visualVariables: [
          {
            type: 'color',
            field: 'HISTORIC_MAX_CONSECDD',
            stops: [
              {
                color: [255, 255, 178, 255],
                value: 10,
              },
              {
                color: [254, 204, 92, 255],
                value: 19,
              },
              {
                color: [253, 141, 60, 255],
                value: 28,
              },
              {
                color: [240, 59, 32, 255],
                value: 37,
              },
              {
                color: [189, 0, 38, 255],
                value: 46,
              },
            ],
          },
          {
            type: 'size',
            valueExpression: '$view.scale',
            stops: [
              {
                size: 0.042905885932572586,
                value: 1066256,
              },
              {
                size: 0.021452942966286293,
                value: 3332050,
              },
              {
                size: 0.010726471483143147,
                value: 13328201,
              },
              {
                size: 0,
                value: 26656402,
              },
            ],
            target: 'outline',
          },
        ],
      },
      popupTemplate: {
        title: '{CountyName}, {StateAbbr}',
        content: [
          {
            type: 'text',
            text: '<p><span style="font-size:18px;"><strong>{expression/roundedValue} &nbsp;Days</strong></span></p><p><strong>Maximum number of consecutive dry days</strong></p>',
          },
        ],
        expressionInfos: [
          {
            name: 'roundedValue',
            expression: 'Round($feature.HISTORIC_MAX_CONSECDD, 1)',
            returnType: 'number',
          },
        ],
      },
    },
  },
  {
    id: 'drought',
    label: 'Drought',
    checked: false,
    disabled: false,
    layerId: 'cmraScreeningLayer',
    status: 'idle',
    text: '',
    layerProperties: {
      blendMode: 'multiply',
      title: 'Drought',
      renderer: {
        type: 'class-breaks',
        field: 'HISTORIC_MEAN_PRLT0IN',
        classBreakInfos: [
          {
            minValue: -9007199254740991,
            maxValue: 9007199254740991,
            symbol: {
              type: 'simple-fill',
              color: [170, 170, 170, 255],
              outline: {
                type: 'simple-line',
                color: [225, 229, 232, 107],
                width: 0,
                style: 'solid',
              },
              style: 'solid',
            },
          },
        ],
        visualVariables: [
          {
            type: 'color',
            field: 'HISTORIC_MEAN_PRLT0IN',
            stops: [
              {
                color: [255, 255, 178, 255],
                value: 169,
              },
              {
                color: [254, 204, 92, 255],
                value: 187,
              },
              {
                color: [253, 141, 60, 255],
                value: 206,
              },
              {
                color: [240, 59, 32, 255],
                value: 224,
              },
              {
                color: [189, 0, 38, 255],
                value: 243,
              },
            ],
          },
          {
            type: 'size',
            valueExpression: '$view.scale',
            stops: [
              {
                size: 0.042905885932572586,
                value: 1066256,
              },
              {
                size: 0.021452942966286293,
                value: 3332050,
              },
              {
                size: 0.010726471483143147,
                value: 13328201,
              },
              {
                size: 0,
                value: 26656402,
              },
            ],
            target: 'outline',
          },
        ],
      },
      popupTemplate: {
        title: '{CountyName}, {StateAbbr}',
        content: [
          {
            type: 'text',
            text: '<p><span style="font-size:18px;"><strong>{expression/roundedValue} &nbsp;Days</strong></span></p><p><strong>Days per year with no precipitation (dry days)</strong></p>',
          },
        ],
        expressionInfos: [
          {
            name: 'roundedValue',
            expression: 'Round($feature.HISTORIC_MEAN_PRLT0IN, 1)',
            returnType: 'number',
          },
        ],
      },
    },
  },
  {
    id: 'inlandFloodingInches',
    label: 'Inland Flooding',
    checked: false,
    disabled: false,
    layerId: 'cmraScreeningLayer',
    status: 'idle',
    text: '',
    layerProperties: {
      blendMode: 'multiply',
      title: 'Fire',
      renderer: {
        type: 'class-breaks',
        field: 'HISTORIC_MEAN_PR_ANNUAL',
        classBreakInfos: [
          {
            minValue: -9007199254740991,
            maxValue: 9007199254740991,
            symbol: {
              type: 'simple-fill',
              color: [170, 170, 170, 255],
              outline: {
                type: 'simple-line',
                color: [225, 229, 232, 107],
                width: 0,
                style: 'solid',
              },
              style: 'solid',
            },
          },
        ],
        visualVariables: [
          {
            type: 'color',
            field: 'HISTORIC_MEAN_PR_ANNUAL',
            stops: [
              {
                color: [255, 255, 204, 255],
                value: 25,
              },
              {
                color: [161, 218, 180, 255],
                value: 32.5,
              },
              {
                color: [65, 182, 196, 255],
                value: 40,
              },
              {
                color: [44, 127, 184, 255],
                value: 48,
              },
              {
                color: [37, 52, 148, 255],
                value: 56,
              },
            ],
          },
          {
            type: 'size',
            valueExpression: '$view.scale',
            stops: [
              {
                size: 0.042905885932572586,
                value: 1066256,
              },
              {
                size: 0.021452942966286293,
                value: 3332050,
              },
              {
                size: 0.010726471483143147,
                value: 13328201,
              },
              {
                size: 0,
                value: 26656402,
              },
            ],
            target: 'outline',
          },
        ],
      },
      popupTemplate: {
        title: '{CountyName}, {StateAbbr}',
        content: [
          {
            type: 'text',
            text: '<p><span style="font-size:18px;"><strong>{expression/roundedValue} &nbsp;Inches</strong></span></p><p><strong>Average annual total precipitation</strong></p>',
          },
        ],
        expressionInfos: [
          {
            name: 'roundedValue',
            expression: 'Round($feature.HISTORIC_MEAN_PR_ANNUAL, 1)',
            returnType: 'number',
          },
        ],
      },
    },
  },
  {
    id: 'coastalFlooding',
    label: 'Coastal Flooding',
    layerId: 'coastalFloodingLayer',
    checked: false,
    disabled: false,
    status: 'idle',
    text: '',
  },
  {
    id: 'extremeHeat',
    label: 'Extreme Heat',
    checked: false,
    disabled: false,
    layerId: 'cmraScreeningLayer',
    status: 'idle',
    text: '',
    layerProperties: {
      blendMode: 'multiply',
      title: 'Extreme Heat',
      renderer: {
        type: 'class-breaks',
        field: 'HISTORIC_MAX_TMAX90F',
        classBreakInfos: [
          {
            minValue: -9007199254740991,
            maxValue: 9007199254740991,
            symbol: {
              type: 'simple-fill',
              color: [170, 170, 170, 255],
              outline: {
                type: 'simple-line',
                color: [225, 229, 232, 107],
                width: 0,
                style: 'solid',
              },
              style: 'solid',
            },
          },
        ],
        visualVariables: [
          {
            type: 'color',
            field: 'HISTORIC_MAX_TMAX90F',
            stops: [
              {
                color: [255, 255, 178, 255],
                value: 58,
              },
              {
                color: [254, 204, 92, 255],
                value: 80.7,
              },
              {
                color: [253, 141, 60, 255],
                value: 103,
              },
              {
                color: [240, 59, 32, 255],
                value: 126,
              },
              {
                color: [189, 0, 38, 255],
                value: 149,
              },
            ],
          },
          {
            type: 'size',
            valueExpression: '$view.scale',
            stops: [
              {
                size: 0.042905885932572586,
                value: 1066256,
              },
              {
                size: 0.021452942966286293,
                value: 3332050,
              },
              {
                size: 0.010726471483143147,
                value: 13328201,
              },
              {
                size: 0,
                value: 26656402,
              },
            ],
            target: 'outline',
          },
        ],
      },
      popupTemplate: {
        title: '{CountyName}, {StateAbbr}',
        content: [
          {
            type: 'text',
            text: '<p><span style="font-size:18px;"><strong>{expression/roundedValue} &nbsp;Days</strong></span></p><p><strong>Annual days with maximum temperature &gt; 90</strong><span style="background-color:rgb(255,255,255);color:rgb(50,50,50);"><strong>°F</strong></span></p>',
          },
        ],
        expressionInfos: [
          {
            name: 'roundedValue',
            expression: 'Round($feature.HISTORIC_MAX_TMAX90F, 1)',
            returnType: 'number',
          },
        ],
      },
    },
  },
];
const potentiallyVulnerableDefaults: Row[] = [
  // all
  {
    id: 'allSubHeading',
    label: 'Entire Map',
    subHeading: true,
  },
  {
    id: 'landCover',
    label: 'Land cover',
    checked: false,
    disabled: false,
    layerId: 'landCoverLayer',
  },

  // huc
  {
    id: 'hucSubHeading',
    label: 'Within Watershed',
    subHeading: true,
  },
  {
    id: 'waterbodies',
    label: 'Waterbodies',
    checked: false,
    disabled: false,
    layerId: 'waterbodyLayer',
    status: 'idle',
    text: '',
  },
  {
    id: 'impairedWaterbodies',
    label: 'Impaired',
    indent: true,
    status: 'idle',
    text: '',
  },
  {
    id: 'goodWaterbodies',
    label: 'Good',
    indent: true,
    status: 'idle',
    text: '',
  },
  {
    id: 'unknownWaterbodies',
    label: 'Unknown',
    indent: true,
    status: 'idle',
    text: '',
  },
  {
    id: 'dischargers',
    label: 'Permitted Dischargers',
    checked: false,
    disabled: false,
    layerId: 'dischargersLayer',
    status: 'idle',
    text: '',
  },
  {
    id: 'tribes',
    label: 'Tribes',
    checked: false,
    disabled: false,
    layerId: 'tribalLayer',
    text: '',
  },
  {
    id: 'pollutantStorageTanks',
    checked: false,
    disabled: false,
    label: 'Above and below ground pollutant storage tanks',
    layerId: 'storageTanksLayer',
    text: '5',
  },
  {
    id: 'dams',
    label: 'Dams',
    checked: false,
    disabled: false,
    text: '2',
  },

  // county
  {
    id: 'hucSubHeading',
    label: 'Within County',
    subHeading: true,
  },
  {
    id: 'drinkingWaterSystems',
    label: 'Public Drinking Water Systems',
    checked: false,
    disabled: false,
    layerId: 'providersLayer',
    status: 'idle',
    text: '',
  },
  {
    id: 'surfaceWaterSources',
    label: 'Surface Water Sources',
    indent: true,
    status: 'idle',
    text: '',
  },
  {
    id: 'groundWaterSources',
    label: 'Ground Water Sources',
    indent: true,
    status: 'idle',
    text: '',
  },
  {
    id: 'disadvantagedCommunities',
    label: 'Overburdened, Underserved, and Disadvantaged Communities',
    checked: false,
    disabled: false,
    text: '',
  },
  {
    id: 'wells',
    label: 'Wells',
    checked: false,
    disabled: false,
    text: '30',
  },
];
