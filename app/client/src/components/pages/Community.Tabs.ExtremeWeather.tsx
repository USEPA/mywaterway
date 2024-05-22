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
      extremeWeatherConfig.data.currentWatherDefaults,
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

  const [timeframeSelection, setTimeframeSelection] = useState<{
    label: string;
    labelHtml: EmotionJSX.Element;
    value: number;
  }>(timeframeOptions[0]);

  // Syncs the toggles with the visible layers on the map. Mainly
  // used for when the user toggles layers in full screen mode and then
  // exits full screen.
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;

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
  }, [extremeWeatherConfig, visibleLayers]);

  const [countyOptions, setCountyOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [countySelected, setCountySelected] = useState<{
    label: string;
    value: string;
  } | null>(null);
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

  useEffect(() => {
    if (!countySelected) return;

    let countyGraphic: __esri.Graphic | null = null;
    providersLayer?.graphics.forEach((graphic) => {
      if (graphic.attributes.FIPS === countySelected.value) {
        graphic.visible = true;
        countyGraphic = graphic;
      } else graphic.visible = false;
    });
    if (providersLayer?.visible && countyGraphic) mapView.goTo(countyGraphic);

    return function resetCountyVisibility() {
      providersLayer?.graphics.forEach((graphic) => {
        graphic.visible =
          graphic.attributes.FIPS === countyBoundaries?.attributes?.FIPS;
      });
    };
  }, [countyBoundaries, countySelected, mapView, providersLayer]);

  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
    return function cleanup() {
      setHistoricalRisk({
        updateCount: 0,
        items: extremeWeatherConfig.data.historicalDefaults,
      });
    };
  }, [extremeWeatherConfig]);

  // update waterbodies
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;

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
  }, [cipSummary, extremeWeatherConfig, waterbodies, waterbodyLayer]);

  // update dischargers
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;

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
  }, [dischargers, dischargersStatus, extremeWeatherConfig]);

  // update drinking water
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
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
  }, [countySelected, drinkingWater, extremeWeatherConfig]);

  // update tribal
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
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
  }, [extremeWeatherConfig, hucBoundaries, tribalLayer]);

  // update wildfires
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
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
  }, [extremeWeatherConfig, hucBoundaries, wildfiresLayer]);

  // update historical/future (cmra screening)
  const [range, setRange] = useState([
    tickList[0].value,
    tickList[tickList.length - 1].value,
  ]);
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
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
  }, [cmraScreeningLayer, countySelected, extremeWeatherConfig, range]);

  // update historical/future (cmra screening) with map
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
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
  }, [extremeWeatherConfig, hucBoundaries, droughtRealtimeLayer]);

  // update inland flooding
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
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
  }, [extremeWeatherConfig, hucBoundaries, inlandFloodingRealtimeLayer]);

  // update costal flooding
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
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
  }, [extremeWeatherConfig, hucBoundaries, coastalFloodingRealtimeLayer]);

  // update extreme cold
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
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
  }, [extremeWeatherConfig, hucBoundaries, extremeColdRealtimeLayer]);

  // update extreme heat
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
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
  }, [extremeWeatherConfig, hucBoundaries, extremeHeatRealtimeLayer]);

  // update storage tanks
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
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
  }, [extremeWeatherConfig, hucBoundaries, storageTanksLayer]);

  // update combined sewer overflows
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
    if (!hucBoundaries || !sewerOverflowsLayer) return;

    setPotentiallyVulnerable((config) => {
      updateRow(config, 'pending', 'combinedSewerOverflows');
      return {
        ...config,
        updateCount: config.updateCount + 1,
      };
    });

    queryLayers({
      layer: sewerOverflowsLayer,
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
            'combinedSewerOverflows',
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
          updateRow(config, 'failure', 'combinedSewerOverflows');
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        }),
    });
  }, [extremeWeatherConfig, hucBoundaries, sewerOverflowsLayer]);

  // update dams count
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
    if (!hucBoundaries || !damsLayer) return;

    setPotentiallyVulnerable((config) => {
      updateRow(config, 'pending', 'dams');
      return {
        ...config,
        updateCount: config.updateCount + 1,
      };
    });

    queryLayers({
      layer: damsLayer,
      queries: [
        {
          query: {
            geometry: hucBoundaries.features[0].geometry,
            outFields: ['OBJECTID'],
          },
        },
      ],
      onSuccess: (responses) => {
        setPotentiallyVulnerable((config) => {
          updateRow(config, 'success', 'dams', responses[0].features.length);
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        });
      },
      onError: () =>
        setPotentiallyVulnerable((config) => {
          updateRow(config, 'failure', 'dams');
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        }),
    });
  }, [extremeWeatherConfig, hucBoundaries, damsLayer]);

  // update wells count
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
    if (!countySelected || !wellsLayer) return;

    setPotentiallyVulnerable((config) => {
      updateRow(config, 'pending', 'wells');
      return {
        ...config,
        updateCount: config.updateCount + 1,
      };
    });

    queryLayers({
      layer: wellsLayer,
      queries: [
        {
          query: {
            outFields: ['Wells_2020'],
            where: `GEOID LIKE '${countySelected.value}%'`,
          },
        },
      ],
      onSuccess: (responses) => {
        let numWells = 0;
        responses[0].features.forEach((f) => {
          numWells += f.attributes.Wells_2020;
        });

        setPotentiallyVulnerable((config) => {
          updateRow(config, 'success', 'wells', numWells);
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        });
      },
      onError: () =>
        setPotentiallyVulnerable((config) => {
          updateRow(config, 'failure', 'wells');
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        }),
    });
  }, [countySelected, extremeWeatherConfig, wellsLayer]);

  // update disadvantaged communities
  useEffect(() => {
    if (extremeWeatherConfig.status !== 'success') return;
    if (!countySelected || !disadvantagedCommunitiesLayer) return;

    setPotentiallyVulnerable((config) => {
      updateRow(config, 'pending', 'disadvantagedCommunities');
      return {
        ...config,
        updateCount: config.updateCount + 1,
      };
    });

    queryLayers({
      layer: disadvantagedCommunitiesLayer,
      queries: [
        {
          query: {
            outFields: ['SN_C', 'SN_T'],
            where: `GEOID10 LIKE '${countySelected.value}%'`,
          },
        },
      ],
      onSuccess: (responses) => {
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

        setPotentiallyVulnerable((config) => {
          updateRow(
            config,
            'success',
            'disadvantagedCommunities',
            disadvantagedCommunities,
          );
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        });
      },
      onError: () =>
        setPotentiallyVulnerable((config) => {
          updateRow(config, 'failure', 'disadvantagedCommunities');
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        }),
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

      <p>
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
                </a>
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
                </a>
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
      </p>

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

                          updateVisibleLayers({
                            [item.layerId as keyof LayersState['visible']]:
                              layer.visible,
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

/*
 * Helpers
 */

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

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles};
  margin-bottom: 1em;
  text-align: center;
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
