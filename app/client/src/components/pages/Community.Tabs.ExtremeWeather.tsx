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
import Modal from 'components/shared/Modal';
import ShowLessMore from 'components/shared/ShowLessMore';
import Slider from 'components/shared/Slider';
import Switch from 'components/shared/Switch';
import TabErrorBoundary from 'components/shared/ErrorBoundary.TabErrorBoundary';
// config
import { tabErrorBoundaryMessage } from 'config/errorMessages';
// contexts
import { LayersState, useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useExtremeWeatherContext } from 'contexts/LookupFiles';
// utils
import { useDischargers, useWaterbodyFeatures } from 'utils/hooks';
import {
  hideShowGraphicsFill,
  isFeatureLayer,
  isGroupLayer,
} from 'utils/mapFunctions';
import {
  countOrNotAvailable,
  formatNumber,
  sentenceJoin,
  summarizeAssessments,
} from 'utils/utils';
// styles
import {
  iconButtonStyles,
  reactSelectStyles,
  toggleTableStyles,
} from 'styles/index';
// types
import { FetchStatus } from 'types';
import { errorBoxStyles } from 'components/shared/MessageBoxes';

const historicalTooltip =
  'The displayed statistics are generated from official U.S. climate projections for the greenhouse gas business as usual "Higher Emissions Scenario (RCP 8.5)".';

const tickList = getTickList();
const timeframeOptions = getTickList(true).map((t) => ({
  label: t.labelAria,
  labelHtml: t.label,
  value: t.value,
}));

function ExtremeWeather() {
  const { dischargers, dischargersStatus } = useDischargers();
  const extremeWeatherConfig = useExtremeWeatherContext();
  const waterbodies = useWaterbodyFeatures();
  const {
    cipSummary,
    countyBoundaries,
    drinkingWater,
    hucBoundaries,
    mapView,
  } = useContext(LocationSearchContext);
  const {
    boundariesLayer,
    cmraScreeningLayer,
    coastalFloodingLayer,
    coastalFloodingRealtimeLayer,
    damsLayer,
    disadvantagedCommunitiesLayer,
    droughtRealtimeLayer,
    extremeColdRealtimeLayer,
    extremeHeatRealtimeLayer,
    inlandFloodingRealtimeLayer,
    providersLayer,
    sewerOverflowsLayer,
    storageTanksLayer,
    tribalLayer,
    updateVisibleLayers,
    visibleLayers,
    waterbodyLayer,
    wellsLayer,
    wildfiresLayer,
  } = useLayers();

  const [currentWeather, setCurrentWeather] = useState<SwitchTableConfig>({
    updateCount: 0,
    items: [],
  });
  const [historicalRiskRange, setHistoricalRiskRange] =
    useState<SwitchTableConfig>({
      updateCount: 0,
      items: [],
    });
  const [historicalRisk, setHistoricalRisk] = useState<SwitchTableConfig>({
    updateCount: 0,
    items: [],
  });
  const [potentiallyVulnerable, setPotentiallyVulnerable] =
    useState<SwitchTableConfig>({
      updateCount: 0,
      items: [],
    });

  // initializes state for switch tables
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;

    function initialize(
      setter: Dispatch<SetStateAction<SwitchTableConfig>>,
      items: Row[],
    ) {
      setter({
        updateCount: 0,
        items,
      });
    }

    initialize(
      setCurrentWeather,
      extremeWeatherConfig.data.currentWeatherDefaults,
    );
    initialize(
      setHistoricalRiskRange,
      extremeWeatherConfig.data.historicalRangeDefaults,
    );
    initialize(setHistoricalRisk, extremeWeatherConfig.data.historicalDefaults);
    initialize(
      setPotentiallyVulnerable,
      extremeWeatherConfig.data.potentiallyVulnerableDefaults,
    );
  }, [extremeWeatherConfig]);

  // removes fill from huc/county boundaries
  useEffect(() => {
    if (!boundariesLayer || !providersLayer) return;

    hideShowGraphicsFill(boundariesLayer, false);
    hideShowGraphicsFill(providersLayer, false);
    return function cleanup() {
      hideShowGraphicsFill(boundariesLayer, true);
      hideShowGraphicsFill(providersLayer, true, 0.15);
    };
  }, [boundariesLayer, countyBoundaries, hucBoundaries, providersLayer]);

  const [timeframeSelection, setTimeframeSelection] = useState<{
    label: string;
    labelHtml: EmotionJSX.Element;
    value: number;
  }>(timeframeOptions[0]);

  // Syncs the toggles with the visible layers on the map. Mainly
  // used for when the user toggles layers in full screen mode and then
  // exits full screen.
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success' || !mapView) return;

    function handleSetting(
      config: SwitchTableConfig,
      additionalTest?: (layer: __esri.Layer, id: string) => boolean,
    ) {
      Object.entries(visibleLayers).forEach(([layerId, visible]) => {
        const layer = !additionalTest
          ? null
          : mapView.map.layers.find((l: __esri.Layer) => l.id === layerId);

        const row = config.items.find(
          (l) =>
            l.layerId === layerId &&
            (!additionalTest || additionalTest(layer, l.id)),
        );
        if (!row?.hasOwnProperty('checked')) return;
        row.checked = visible;
      });
    }

    setTableConfig(setCurrentWeather, handleSetting);
    setTableConfig(setPotentiallyVulnerable, handleSetting);
    setTableConfig(setHistoricalRisk, (config) =>
      handleSetting(config, (layer, id) => {
        if (!layer) return true;

        let search = '';
        if (id === 'fire') search = 'Fire';
        if (id === 'drought') search = 'Drought';
        if (id === 'inlandFloodingInches') search = 'Inland Flooding';
        if (id === 'coastalFlooding') search = 'Coastal Flooding';
        if (id === 'extremeHeat') search = 'Extreme Heat';

        return layer.title.includes(search);
      }),
    );
  }, [extremeWeatherConfig, mapView, visibleLayers]);

  const [countyOptions, setCountyOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [countySelected, setCountySelected] = useState<{
    label: string;
    value: string;
  } | null>(null);

  // initializes the county select
  useEffect(() => {
    if (!countyBoundaries) return;

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

  // ensures the correct county is shown on the map
  useEffect(() => {
    if (!countySelected) return;

    let countyGraphic: __esri.Graphic | null = null;
    providersLayer?.graphics.forEach((graphic) => {
      if (graphic.attributes.FIPS === countySelected.value) {
        graphic.visible = true;
        countyGraphic = graphic;
      } else graphic.visible = false;
    });
    if (countyGraphic) mapView.when().then(() => mapView.goTo(countyGraphic));

    return function resetCountyVisibility() {
      providersLayer?.graphics.forEach((graphic) => {
        graphic.visible =
          graphic.attributes.FIPS === countyBoundaries?.attributes?.FIPS;
      });
    };
  }, [countyBoundaries, countySelected, mapView, providersLayer]);

  // gets the geometry of the hucBoundaries
  const [hucGeometry, setHucGeometry] = useState<__esri.Geometry | null>(null);
  useEffect(() => {
    setHucGeometry(hucBoundaries?.geometry ?? null);
  }, [hucBoundaries]);

  // update waterbodies
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;

    const status = cipSummary.status;

    if (status === 'fetching') {
      setTableConfig(setPotentiallyVulnerable, (config) => {
        updateRow(config, status, 'waterbodies');
        updateRow(config, status, 'goodWaterbodies');
        updateRow(config, status, 'impairedWaterbodies');
        updateRow(config, status, 'unknownWaterbodies');
      });
      return;
    }
    if (status === 'success' && (!waterbodyLayer || !waterbodies)) return;

    const summary = summarizeAssessments(waterbodies ?? [], 'overallstatus');
    setTableConfig(setPotentiallyVulnerable, (config) => {
      updateRow(config, status, 'waterbodies', summary.total);
      updateRow(config, status, 'goodWaterbodies', summary['Fully Supporting']);
      updateRow(
        config,
        status,
        'impairedWaterbodies',
        summary['Not Supporting'],
      );
      updateRow(
        config,
        status,
        'unknownWaterbodies',
        summary.unassessed +
          summary['Insufficient Information'] +
          summary['Not Assessed'],
      );
    });
  }, [cipSummary, extremeWeatherConfig, waterbodies, waterbodyLayer]);

  // update dischargers
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;

    const id = 'dischargers';
    if (dischargersStatus === 'pending') {
      setTableConfigSingle(setPotentiallyVulnerable, dischargersStatus, id);
      return;
    }

    setTableConfigSingle(
      setPotentiallyVulnerable,
      dischargersStatus,
      id,
      dischargers,
    );
  }, [dischargers, dischargersStatus, extremeWeatherConfig]);

  // update drinking water
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
    if (!countySelected) return;

    const status = drinkingWater.status;
    if (status === 'fetching') {
      setTableConfig(setPotentiallyVulnerable, (config) => {
        updateRow(config, status, 'drinkingWaterSystems');
        updateRow(config, status, 'groundWaterSources');
        updateRow(config, status, 'surfaceWaterSources');
      });
      return;
    }

    setTableConfig(setPotentiallyVulnerable, (config) => {
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
      updateRow(config, status, 'drinkingWaterSystems', totalSystems);
      updateRow(config, status, 'groundWaterSources', groundWater);
      updateRow(config, status, 'surfaceWaterSources', surfaceWater);
    });
  }, [countySelected, drinkingWater, extremeWeatherConfig]);

  // update tribal
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
    if (!hucGeometry || !tribalLayer) return;

    const id = 'tribes';
    queryLayers({
      id,
      layer: tribalLayer,
      geometry: hucGeometry,
      config: extremeWeatherConfig.data.potentiallyVulnerableDefaults,
      setter: setPotentiallyVulnerable,
      responseParser: (responses) => {
        let numTribes = 0;
        responses.forEach((res) => (numTribes += res.features.length));
        return [
          {
            id,
            value: numTribes,
          },
        ];
      },
    });
  }, [extremeWeatherConfig, hucGeometry, tribalLayer]);

  // turns on layers for layers with weather warnings/alerts
  const [defaultVisibilityInitialized, setDefaultVisibilityInitialized] =
    useState(false);
  useEffect(() => {
    const allComplete = currentWeather.items.every(
      (i) => i.status && ['success', 'failure'].includes(i.status),
    );
    if (!allComplete && defaultVisibilityInitialized)
      setDefaultVisibilityInitialized(false);

    if (!allComplete || defaultVisibilityInitialized) return;

    // get object of new visible layers
    const newVisibleLayers: { [key: string]: boolean } = {};
    currentWeather.items.forEach((item) => {
      if (!item.layerId || item.checked === undefined) return;
      newVisibleLayers[item.layerId] = item.checked;
    });

    // make layers visible
    if (Object.keys(newVisibleLayers).length > 0)
      updateVisibleLayers(newVisibleLayers);

    setDefaultVisibilityInitialized(true);
  }, [currentWeather, defaultVisibilityInitialized, updateVisibleLayers]);

  // update wildfires
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
    if (!hucGeometry || !wildfiresLayer) return;

    const id = 'fire';
    queryLayers({
      id,
      layer: wildfiresLayer,
      geometry: hucGeometry,
      config: extremeWeatherConfig.data.currentWeatherDefaults,
      setter: setCurrentWeather,
      responseParser: (responses) => {
        let numFires = responses[0].features.length;
        let acresBurned = 0;
        responses[0].features.forEach(
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

        return [
          {
            checked: numFires > 0,
            id,
            value: status,
          },
        ];
      },
    });
  }, [extremeWeatherConfig, hucGeometry, wildfiresLayer]);

  // update historical/future (cmra screening)
  const [range, setRange] = useState([
    tickList[0].value,
    tickList[tickList.length - 1].value,
  ]);
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
    if (!cmraScreeningLayer || !countySelected) return;

    queryLayers({
      id: 'fire',
      layer: cmraScreeningLayer,
      config: extremeWeatherConfig.data.historicalRangeDefaults,
      setter: setHistoricalRiskRange,
      outIds: [
        'fire',
        'drought',
        'inlandFlooding',
        'coastalFlooding',
        'extremeHeat',
      ],
      whereReplacer: (where: string) => {
        return where.replace('{HMW_COUNTY_FIPS}', countySelected.value);
      },
      responseParser: (responses) => {
        if (responses[0].features.length === 0) {
          return [
            { id: 'fire', value: '' },
            { id: 'drought', value: '' },
            { id: 'inlandFlooding', value: '' },
            { id: 'coastalFlooding', value: '' },
            { id: 'extremeHeat', value: '' },
          ];
        }

        const attributes = responses[0].features[0].attributes;
        const isSame = range[0] === range[1];
        const startText = isSame ? 'Max number of' : 'Change in';
        const aggType = isSame ? 'max' : 'difference';

        const fireText = `${startText} annual consecutive (dry days): ${getHistoricValueRange(attributes, range, 'fire', aggType)}`;
        const droughtText = `${startText} annual days with no rain (dry days): ${getHistoricValueRange(attributes, range, 'drought', aggType)}`;
        const inlandFloodingText = `${startText} annual days with rain (wet days): ${getHistoricValueRange(attributes, range, 'inlandFlooding', aggType)}`;
        const coastalFloodingText = `${startText.replace(' number of', '')} % of county impacted by sea level rise: ${getHistoricValueRange(attributes, range, 'coastalFlooding', aggType)}`;
        const extremeHeatText = `${startText} annual days with max temperature over 90°F: ${getHistoricValueRange(attributes, range, 'extremeHeat', aggType)}`;

        return [
          { id: 'fire', value: fireText },
          { id: 'drought', value: droughtText },
          { id: 'inlandFlooding', value: inlandFloodingText },
          { id: 'coastalFlooding', value: coastalFloodingText },
          { id: 'extremeHeat', value: extremeHeatText },
        ];
      },
    });
  }, [cmraScreeningLayer, countySelected, extremeWeatherConfig, range]);

  // update historical/future (cmra screening) with map
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
    if (!cmraScreeningLayer || !countySelected) return;

    queryLayers({
      id: 'fire',
      layer: cmraScreeningLayer,
      config: extremeWeatherConfig.data.historicalDefaults,
      setter: setHistoricalRisk,
      outIds: [
        'fire',
        'drought',
        'inlandFloodingInches',
        'coastalFlooding',
        'extremeHeat',
      ],
      whereReplacer: (where: string) => {
        return where.replace('{HMW_COUNTY_FIPS}', countySelected.value);
      },
      responseParser: (responses) => {
        if (responses[0].features.length === 0) {
          return [
            { id: 'fire', value: '' },
            { id: 'drought', value: '' },
            { id: 'inlandFloodingInches', value: '' },
            { id: 'coastalFlooding', value: '' },
            { id: 'extremeHeat', value: '' },
          ];
        }

        const attributes = responses[0].features[0].attributes;
        const range = timeframeSelection.value;

        const fireText = `Max number of annual consecutive (dry days): ${getHistoricValue(attributes, range, 'fire')}`;
        const droughtText = `Annual days with no rain (dry days): ${getHistoricValue(attributes, range, 'drought')}`;
        const inlandFloodingText = `Average annual total precipitation: ${getHistoricValue(attributes, range, 'inlandFloodingInches')} inches`;
        const coastalFloodingText = `% of county impacted by sea level rise: ${getHistoricValue(attributes, range, 'coastalFlooding')}`;
        const extremeHeatText = `Annual days with max temperature over 90°F: ${getHistoricValue(attributes, range, 'extremeHeat')}`;

        return [
          { id: 'fire', value: fireText },
          { id: 'drought', value: droughtText },
          { id: 'inlandFloodingInches', value: inlandFloodingText },
          { id: 'coastalFlooding', value: coastalFloodingText },
          { id: 'extremeHeat', value: extremeHeatText },
        ];
      },
    });
  }, [
    cmraScreeningLayer,
    countySelected,
    extremeWeatherConfig,
    timeframeSelection,
  ]);

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
    if (extremeWeatherConfig.status !== 'success') return;
    if (!hucGeometry || !droughtRealtimeLayer) return;

    const id = 'drought';
    queryLayers({
      id,
      layer: droughtRealtimeLayer,
      geometry: hucGeometry,
      config: extremeWeatherConfig.data.currentWeatherDefaults,
      setter: setCurrentWeather,
      responseParser: (responses) => {
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

        return [
          {
            checked: maxCategory > 1,
            id,
            value: dmEnum[maxCategory.toString()],
          },
        ];
      },
    });
  }, [extremeWeatherConfig, hucGeometry, droughtRealtimeLayer]);

  // update inland flooding
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
    if (!hucGeometry || !inlandFloodingRealtimeLayer) return;

    const id = 'inlandFlooding';
    queryLayers({
      id,
      layer: inlandFloodingRealtimeLayer,
      geometry: hucGeometry,
      config: extremeWeatherConfig.data.currentWeatherDefaults,
      setter: setCurrentWeather,
      responseParser: (responses) => {
        const watchRes = responses[0];
        const floodRes = responses[1];

        let statuses: string[] = [];
        watchRes.features.forEach((f) => {
          statuses.push(f.attributes.Event);
        });
        if (floodRes.features.length > 0)
          statuses.push('Rain Expected (next 72 hours)');

        return [
          {
            checked: watchRes.features.length > 0,
            id,
            value:
              statuses.length === 0 ? 'No Flooding' : sentenceJoin(statuses),
          },
        ];
      },
    });
  }, [extremeWeatherConfig, hucGeometry, inlandFloodingRealtimeLayer]);

  // update costal flooding
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
    if (!hucGeometry || !coastalFloodingRealtimeLayer) return;

    const id = 'coastalFlooding';
    queryLayers({
      id,
      layer: coastalFloodingRealtimeLayer,
      geometry: hucGeometry,
      config: extremeWeatherConfig.data.currentWeatherDefaults,
      setter: setCurrentWeather,
      responseParser: (responses) => {
        let statuses: string[] = [];
        responses[0].features.forEach((f) => {
          statuses.push(f.attributes.Event);
        });

        return [
          {
            checked: responses[0].features.length > 0,
            id,
            value:
              statuses.length === 0 ? 'No Flooding' : sentenceJoin(statuses),
          },
        ];
      },
    });
  }, [coastalFloodingRealtimeLayer, extremeWeatherConfig, hucGeometry]);

  // update extreme cold
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
    if (!hucGeometry || !extremeColdRealtimeLayer) return;

    const id = 'extremeCold';
    queryLayers({
      id,
      layer: extremeColdRealtimeLayer,
      geometry: hucGeometry,
      config: extremeWeatherConfig.data.currentWeatherDefaults,
      setter: setCurrentWeather,
      responseParser: (responses) => {
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

        return [
          {
            checked: watchRes.features.length > 0,
            id,
            value:
              statuses.length === 0
                ? 'No Extreme Cold'
                : sentenceJoin(statuses),
          },
        ];
      },
    });
  }, [extremeWeatherConfig, hucGeometry, extremeColdRealtimeLayer]);

  // update extreme heat
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
    if (!hucGeometry || !extremeHeatRealtimeLayer) return;

    const id = 'extremeHeat';
    queryLayers({
      id,
      layer: extremeHeatRealtimeLayer,
      geometry: hucGeometry,
      config: extremeWeatherConfig.data.currentWeatherDefaults,
      setter: setCurrentWeather,
      responseParser: (responses) => {
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

        return [
          {
            checked: watchRes.features.length > 0,
            id,
            value:
              statuses.length === 0
                ? 'No Extreme Heat'
                : sentenceJoin(statuses),
          },
        ];
      },
    });

    setTableConfigSingle(setCurrentWeather, 'pending', id);
  }, [extremeWeatherConfig, hucGeometry, extremeHeatRealtimeLayer]);

  // update storage tanks
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
    if (!hucGeometry || !storageTanksLayer) return;

    const id = 'pollutantStorageTanks';
    queryLayers({
      id,
      layer: storageTanksLayer,
      geometry: hucGeometry,
      config: extremeWeatherConfig.data.potentiallyVulnerableDefaults,
      setter: setPotentiallyVulnerable,
      responseParser: (responses) => {
        return [
          {
            id,
            value: responses[0].features.length,
          },
        ];
      },
    });
  }, [extremeWeatherConfig, hucGeometry, storageTanksLayer]);

  // update combined sewer overflows
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
    if (!hucGeometry || !sewerOverflowsLayer) return;

    const id = 'combinedSewerOverflows';
    queryLayers({
      id,
      layer: sewerOverflowsLayer,
      geometry: hucGeometry,
      config: extremeWeatherConfig.data.potentiallyVulnerableDefaults,
      setter: setPotentiallyVulnerable,
      responseParser: (responses) => {
        return [
          {
            id,
            value: responses[0].features.length,
          },
        ];
      },
    });
  }, [extremeWeatherConfig, hucGeometry, sewerOverflowsLayer]);

  // update dams count
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
    if (!hucGeometry || !damsLayer) return;

    const id = 'dams';
    queryLayers({
      id,
      layer: damsLayer,
      geometry: hucGeometry,
      config: extremeWeatherConfig.data.potentiallyVulnerableDefaults,
      setter: setPotentiallyVulnerable,
      responseParser: (responses) => {
        return [
          {
            id,
            value: responses[0].features.length,
          },
        ];
      },
    });
  }, [extremeWeatherConfig, hucGeometry, damsLayer]);

  // update wells count
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
    if (!countySelected || !wellsLayer) return;

    const id = 'wells';
    queryLayers({
      id,
      layer: wellsLayer,
      config: extremeWeatherConfig.data.potentiallyVulnerableDefaults,
      setter: setPotentiallyVulnerable,
      whereReplacer: (where: string) => {
        return where.replace('{HMW_COUNTY_FIPS}', countySelected.value);
      },
      responseParser: (responses) => {
        let numWells = 0;
        responses[0].features.forEach((f) => {
          numWells += f.attributes.Wells_2020;
        });

        return [
          {
            id,
            value: numWells,
          },
        ];
      },
    });
  }, [countySelected, extremeWeatherConfig, wellsLayer]);

  // update disadvantaged communities
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
    if (!countySelected || !disadvantagedCommunitiesLayer) return;

    const id = 'disadvantagedCommunities';
    queryLayers({
      id,
      layer: disadvantagedCommunitiesLayer,
      config: extremeWeatherConfig.data.potentiallyVulnerableDefaults,
      setter: setPotentiallyVulnerable,
      whereReplacer: (where: string) => {
        return where.replace('{HMW_COUNTY_FIPS}', countySelected.value);
      },
      responseParser: (responses) => {
        // SN_C === 1 is disadvantaged
        // SN_C === 0 and SN_T === ' ' is not disadvantaged
        // SN_C === 0 and SN_T === '0' is partially disadvantaged
        // SN_C === 0 and SN_T === '1' is disadvantaged
        // else is not disadvantaged
        const disadvantagedCommunities = responses[0].features.filter(
          (f) =>
            f.attributes.SN_C === 1 ||
            (f.attributes.SN_C === 0 && ['0', '1'].includes(f.attributes.SN_T)),
        ).length;

        return [
          {
            id,
            value: disadvantagedCommunities,
          },
        ];
      },
    });
  }, [countySelected, disadvantagedCommunitiesLayer, extremeWeatherConfig]);

  if (extremeWeatherConfig.status === 'fetching') return <LoadingSpinner />;
  if (extremeWeatherConfig.status === 'failure')
    return (
      <div css={containerStyles}>
        <div css={modifiedErrorBoxStyles}>
          <p>{tabErrorBoundaryMessage('Extreme Weather')}</p>
        </div>
      </div>
    );

  return (
    <div css={containerStyles}>
      <SelectionTable
        id="current-weather-switch"
        mapView={mapView}
        value={currentWeather}
        setter={setCurrentWeather}
        columns={['Current Severe Weather Events', 'Status Within Watershed']}
      />

      <div css={sectionHeaderContainerStyles}>
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
      </div>

      <br />

      <div css={sectionHeaderContainerStyles}>
        <div css={sectionHeaderStyles}>
          Historical Risk and Potential Future Scenarios
          <HelpTooltip label={historicalTooltip} />
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
          <HelpTooltip label={historicalTooltip} />
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
              if (ev) setTimeframeSelection(ev as typeof timeframeSelection);
            }}
            components={{
              Option,
              SingleValue,
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

      <div>
        <a
          href="https://resilience.climate.gov/pages/data-sources"
          target="_blank"
          rel="noopener noreferrer"
        >
          Read more about how the data was processed
        </a>{' '}
        <strong>(see about "Climate Data Summaries" section).</strong>{' '}
        <ShowLessMore
          charLimit={0}
          text={
            <ul>
              <li>
                Climate summaries for the contiguous 48 states were derived from
                data generated for the 4th National Climate Assessment. These
                data were accessed from the{' '}
                <a
                  href="https://scenarios.globalchange.gov/loca-viewer/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Scenarios for the National Climate Assessment
                </a>{' '}
                website. The 30-year mean values for 4 time periods (historic,
                early-, mid-, and late-century) and two climate scenarios (RCP
                4.5 and 8.5) were derived from the{' '}
                <a
                  href="https://journals.ametsoc.org/view/journals/hydr/15/6/jhm-d-14-0082_1.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Localized Constructed Analogs
                </a>{' '}
                (LOCA) downscaled climate model ensembles, processed by the
                Technical Support Unit at NOAA’s National Center for
                Environmental Information. The netCDF data from the website were
                summarized by county and census tract using the Zonal Statistics
                as Table utility in ArcGIS Pro. The results were joined into the
                corresponding geography polygons. A minimum, maximum, and mean
                value for each variable was calculated. This process was
                repeated for each time range and scenario. In order to display
                the full range of projections from individual climate models for
                each period, data originally obtained from{' '}
                <a
                  href="https://waterdata.usgs.gov/blog/gdp-moving/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  USGS THREDDS
                </a>{' '}
                servers were accessed via the Regional Climate Center’s{' '}
                <a
                  href="https://www.rcc-acis.org/docs_webservices.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Applied Climate Information System
                </a>{' '}
                (ACIS). This webservice facilitated processing of the raw data
                values to obtain the climate hazard metrics available in CMRA.
              </li>
              <li>
                As LOCA was only generated for the contiguous 48 states (and the
                District of Columbia), alternatives were used for Alaska and
                Hawaii. In Alaska, the{' '}
                <a
                  href="https://link.springer.com/article/10.1023/B:CLIM.0000013685.99609.9e"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Bias Corrected Spatially Downscaled
                </a>{' '}
                (BCSD) method was used. Data were accessed from{' '}
                <a
                  href="https://waterdata.usgs.gov/blog/gdp-moving/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  USGS THREDDS servers
                </a>
                . The same variables provided for LOCA were calculated from BCSD
                ensemble means. However, only RCP 8.5 was available. Minimum,
                maximum, and mean values for county and census tracts were
                calculated in the same way as above. For Hawaii, statistics for
                two summary geographies were accessed from the U.S. Climate
                Resilience Toolkit’s{' '}
                <a
                  href="https://crt-climate-explorer.nemac.org/faq/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Climate Explorer
                </a>
                : Northern Islands (Honolulu County, Kauaʻi County) and Southern
                Islands (Maui County, Hawai'i County).
              </li>
            </ul>
          }
        />
      </div>

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
  gap: 0.5rem;
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
  const { updateVisibleLayers } = useLayers();

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
          const marginLeft = hasSubheadings
            ? `calc(${item.indent ?? '0px'} + 1rem)`
            : item.indent;
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
              <td css={toggleStyles}>
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
                          let newVisibleLayers: Partial<
                            LayersState['visible']
                          > = {};

                          const valueTemp = { ...value };
                          valueTemp.items.forEach((cw) => {
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

                              newVisibleLayers[
                                cw.layerId as keyof LayersState['visible']
                              ] = cw.checked;
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

                          setter({
                            ...valueTemp,
                            updateCount: valueTemp.updateCount + 1,
                          });
                          setSelectedRow(newSelectedRow);
                          updateVisibleLayers(newVisibleLayers);
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

                          setTableConfig(setter, (config) => {
                            const itemUpdate = config.items.find(
                              (cw) => cw.id === item.id,
                            );
                            if (!itemUpdate) return config;

                            itemUpdate.checked = checked;
                          });

                          updateVisibleLayers({
                            [item.layerId as keyof LayersState['visible']]:
                              layer.visible,
                          });

                          if (callback) callback(item, layer);
                        }}
                      />
                    )}
                    <span>{item.label}</span>
                  </label>
                )}

                {item.infoText && (
                  <Modal
                    label={`Additional information for ${item.label}`}
                    maxWidth="35rem"
                    triggerElm={
                      <button
                        aria-label={`View additional information for ${item.label}`}
                        title={`View additional information for ${item.label}`}
                        css={modifiedIconButtonStyles}
                      >
                        <i aria-hidden className="fas fa-info-circle"></i>
                      </button>
                    }
                  >
                    <div dangerouslySetInnerHTML={{ __html: item.infoText }} />
                  </Modal>
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

/*
 * Helpers
 */

const Option = (props: OptionProps<any>) => {
  return (
    <components.Option {...props}>
      {(props.data as any).labelHtml}
    </components.Option>
  );
};
const SingleValue = ({ children, ...props }: SingleValueProps<any>) => {
  return (
    <components.SingleValue {...props}>
      {(props.data as any).labelHtml}
    </components.SingleValue>
  );
};

// checks if all layers are in group layer
function allLayersAdded(
  layer: __esri.FeatureLayer | __esri.GroupLayer,
  queries: ExtremeWeatherQuery[],
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
      l.layerId.toString() === itemId ||
      l.id === itemId,
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
  config,
  geometry,
  id,
  layer,
  outIds,
  responseParser,
  setter,
  whereReplacer,
}: {
  config: Row[];
  geometry?: __esri.Geometry;
  id: string;
  layer: __esri.FeatureLayer | __esri.GroupLayer;
  outIds?: string[];
  responseParser: (
    response: __esri.FeatureSet[],
  ) => { id: string; value?: RowValue }[];
  setter: Dispatch<SetStateAction<SwitchTableConfig>>;
  whereReplacer?: (where: string) => string;
}) {
  const defaultValues = !outIds ? [{ id }] : outIds.map((id) => ({ id }));
  const configRow = config.find((i: Row) => i.id === id);
  if (!configRow?.queries) {
    setTableConfig(setter, (config) => {
      updateMultipleRows(config, 'failure', defaultValues);
    });
    return;
  }

  if (allLayersAdded(layer, configRow.queries)) {
    queryLayersInner({
      configRow,
      defaultValues,
      geometry,
      layer,
      responseParser,
      setter,
      whereReplacer,
    });
  } else {
    const groupLayer = layer as __esri.GroupLayer;

    // setup the watch event to see when the layer finishes loading
    const newWatcher = reactiveUtils.watch(
      () => groupLayer.layers.length,
      () => {
        if (!configRow?.queries || !allLayersAdded(layer, configRow.queries))
          return;

        newWatcher.remove();
        if (timeout) clearTimeout(timeout);
        queryLayersInner({
          configRow,
          defaultValues,
          geometry,
          layer,
          responseParser,
          setter,
          whereReplacer,
        });
      },
    );

    // error this out if it takes too long
    const timeout = setTimeout(() => {
      setTableConfig(setter, (config) => {
        updateMultipleRows(config, 'failure', defaultValues);
      });
      if (newWatcher) newWatcher.remove();
    }, 60000);
  }
}

// queries multiple layers
async function queryLayersInner({
  configRow,
  defaultValues,
  geometry,
  layer,
  responseParser,
  setter,
  whereReplacer,
}: {
  configRow: Row;
  defaultValues: {
    id: string;
  }[];
  geometry?: __esri.Geometry;
  layer: __esri.FeatureLayer | __esri.GroupLayer;
  responseParser: (
    response: __esri.FeatureSet[],
  ) => { checked?: boolean; id: string; value?: RowValue }[];
  setter: Dispatch<SetStateAction<SwitchTableConfig>>;
  whereReplacer?: (where: string) => string;
}) {
  if (!configRow.queries) return;

  setTableConfig(setter, (config) => {
    updateMultipleRows(config, 'pending', defaultValues);
  });

  try {
    const promises: Promise<__esri.FeatureSet>[] = [];
    configRow.queries.forEach((q) => {
      let childLayer = layer;
      if (isGroupLayer(layer) && q.serviceItemId) {
        const temp = findByItemId(layer, q.serviceItemId);
        if (temp) childLayer = temp as __esri.FeatureLayer;
      }

      if (isFeatureLayer(childLayer)) {
        let query = {
          where: childLayer.definitionExpression,
          ...q.query,
        };
        if (geometry) query['geometry'] = geometry;
        if (whereReplacer && q.query.where)
          query['where'] = whereReplacer(q.query.where);
        if (!q.query.outFields) query['outFields'] = childLayer.outFields;

        promises.push(
          queryLayer({
            layer: childLayer,
            query,
          }),
        );
      }
    });

    const output = responseParser(await Promise.all(promises));
    setTableConfig(setter, (config) => {
      updateMultipleRows(
        config,
        'success',
        output.map((item) => ({
          checked: item.checked,
          id: item.id,
          value: item.value,
        })),
      );
    });
  } catch (ex) {
    console.error(ex);
    setTableConfig(setter, (config) => {
      updateMultipleRows(config, 'failure', defaultValues);
    });
  }
}

function setTableConfig(
  setter: Dispatch<SetStateAction<SwitchTableConfig>>,
  callback: (config: SwitchTableConfig) => void,
) {
  setter((config) => {
    callback(config);
    return setTableConfigOutput(config);
  });
}

function setTableConfigOutput(config: SwitchTableConfig) {
  return {
    ...config,
    updateCount: config.updateCount + 1,
  };
}

function setTableConfigSingle(
  setter: Dispatch<SetStateAction<SwitchTableConfig>>,
  status: FetchStatus,
  id: string,
  value?: RowValue,
) {
  setter((config) => {
    updateRow(config, status, id, value);
    return setTableConfigOutput(config);
  });
}

function updateMultipleRows(
  config: SwitchTableConfig,
  status: FetchStatus,
  values: { checked?: boolean; id: string; value?: RowValue }[],
) {
  values.forEach((item) => {
    updateRow(config, status, item.id, item.value, item.checked);
  });
}

function updateRow(
  config: SwitchTableConfig,
  status: FetchStatus,
  id: string,
  value: RowValue = null,
  checked?: boolean,
) {
  updateRowField(
    config,
    id,
    'text',
    typeof value === 'string' ? value : countOrNotAvailable(value, status),
  );
  updateRowField(config, id, 'status', status);
  if (checked !== undefined) updateRowField(config, id, 'checked', checked);
}

function updateRowField(
  config: SwitchTableConfig,
  id: string,
  field: string,
  value: RowValue | boolean = null,
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

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles};
  margin-bottom: 1em;
  text-align: center;
`;

const modifiedIconButtonStyles = css`
  ${iconButtonStyles}
  margin-right: 0.25rem;
  color: #485566;
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
  display: flex;
  justify-content: space-between;
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

/*
 * Types
 */

type ExtremeWeatherQuery = {
  serviceItemId?: string;
  query: __esri.Query | __esri.QueryProperties;
};

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
  indent?: string;
  infoText?: string;
  label: string;
  layerId?: string;
  layerProperties?: any;
  queries?: ExtremeWeatherQuery[];
  status?: FetchStatus;
  subHeading?: boolean;
  text?: string;
};

type RowValue = number | string | unknown[] | null;

type SwitchTableConfig = {
  updateCount: number;
  items: Row[];
};
