// @flow
/** @jsxImportSource @emotion/react */

import { css } from '@emotion/react';
import uniqueId from 'lodash/uniqueId';
import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react';
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
import { isFeatureLayer } from 'utils/mapFunctions';
import {
  countOrNotAvailable,
  formatNumber,
  summarizeAssessments,
} from 'utils/utils';
// styles
import { toggleTableStyles } from 'styles/index';
// types
import { FetchStatus } from 'types';

const tickList = [
  {
    value: 0,
    label: 'Modeled History',
  },
  {
    value: 1,
    label: 'Early Century',
  },
  {
    value: 2,
    label: 'Mid Century',
  },
  {
    value: 3,
    label: 'Late Century',
  },
];

type HistoricType =
  | 'fire'
  | 'drought'
  | 'inlandFlooding'
  | 'coastalFlooding'
  | 'extremeHeat';

function getHistoricValues(
  attributes: any,
  type: HistoricType,
): {
  [key: number]: number;
} {
  let key = 'MEAN_';
  if (type === 'fire' || type === 'drought') key += 'CONSECDD';
  if (type === 'inlandFlooding') key += 'CONSECWD';
  if (type === 'coastalFlooding') key += 'SLR';
  if (type === 'extremeHeat') key += 'TMAX90F';
  return {
    0: attributes[`HISTORIC_${key}`],
    1: attributes[`RCP45EARLY_${key}`],
    2: attributes[`RCP45MID_${key}`],
    3: attributes[`RCP45LATE_${key}`],
  };
}

function getHistoricValue(
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

  return formatNumber(value, digits, true);
}

function updateRow(
  config: SwitchTableConfig,
  status: FetchStatus,
  id: string,
  value: number | string | unknown[] | null = null,
) {
  const row = config.items.find((c) => c.id === id);
  if (row) {
    row.text =
      typeof value === 'string' ? value : countOrNotAvailable(value, status);
    row.status = status;
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

const sectionHeaderStyles = css`
  background-color: #f0f6f9;
  border-top: 1px solid #dee2e6;
  font-size: 1em;
  font-weight: bold;
  line-height: 1.5;
  overflow-wrap: anywhere;
  padding: 0.75rem;
  vertical-align: bottom;
  word-break: break-word;
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

function ExtremeWeather() {
  const {
    cipSummary,
    countyBoundaries,
    drinkingWater,
    hucBoundaries,
    mapView,
    watershed,
  } = useContext(LocationSearchContext);
  const { dischargers, dischargersStatus } = useDischargers();
  const {
    cmraScreeningLayer,
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
  const [historicalRisk, setHistoricalRisk] = useState<SwitchTableConfig>({
    updateCount: 0,
    items: historicalDefaults,
  });
  const [potentiallyVulnerable, setPotentiallyVulnerable] =
    useState<SwitchTableConfig>({
      updateCount: 0,
      items: potentiallyVulnerableDefaults,
    });

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
      let totalSystems = 0;
      let groundWater = 0;
      let surfaceWater = 0;
      drinkingWater.data.forEach((system: any) => {
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
  }, [drinkingWater]);

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

    async function queryLayer() {
      if (!hucBoundaries || !wildfiresLayer) return;

      setCurrentWeather((config) => {
        updateRow(config, 'pending', 'fire');
        return {
          ...config,
          updateCount: config.updateCount + 1,
        };
      });

      if (['failed', 'loaded'].includes(wildfiresLayer.loadStatus)) {
        queryLayerInner();
      } else {
        // setup the watch event to see when the layer finishes loading
        const newWatcher = reactiveUtils.watch(
          () => wildfiresLayer.loadStatus,
          () => {
            if (['failed', 'loaded'].includes(wildfiresLayer.loadStatus))
              newWatcher.remove();
            queryLayerInner();
          },
        );
      }
    }

    async function queryLayerInner() {
      if (!wildfiresLayer) return;
      if (wildfiresLayer.loadStatus === 'failed') {
        setCurrentWeather((config) => {
          updateRow(config, 'failure', 'fire');
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        });
        return;
      }

      try {
        const incidentsLayer = wildfiresLayer.layers.find(
          (l) => isFeatureLayer(l) && l.layerId === 0,
        ) as __esri.FeatureLayer;
        const response = await incidentsLayer.queryFeatures({
          geometry: hucBoundaries.features[0].geometry,
          outFields: ['DailyAcres'],
        });
        let numFires = response.features.length;
        let acresBurned = 0;
        response.features.forEach(
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
      } catch (ex) {
        setCurrentWeather((config) => {
          updateRow(config, 'failure', 'fire');
          return {
            ...config,
            updateCount: config.updateCount + 1,
          };
        });
      }
    }

    queryLayer();
  }, [hucBoundaries, wildfiresLayer]);

  // update cmra screening
  const [range, setRange] = useState([
    tickList[0].value,
    tickList[tickList.length - 1].value,
  ]);
  useEffect(() => {
    if (
      !cmraScreeningLayer ||
      !countyBoundaries ||
      countyBoundaries?.features?.length < 1
    )
      return;

    async function queryLayer() {
      if (!cmraScreeningLayer) return;

      setHistoricalRisk((config) => {
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
        const fips = countyBoundaries.features[0].attributes.FIPS;
        const response = await cmraScreeningLayer.queryFeatures({
          outFields: cmraScreeningLayer.outFields,
          where: `GEOID = '${fips}'`,
        });

        if (response.features.length === 0) {
          setHistoricalRisk((config) => {
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

        const fireText = `${startText} annual consecutive (dry days): ${getHistoricValue(attributes, range, 'fire', aggType)}`;
        const droughtText = `${startText} annual days with no rain (dry days): ${getHistoricValue(attributes, range, 'drought', aggType)}`;
        const inlandFloodingText = `${startText} annual days with rain (wet days): ${getHistoricValue(attributes, range, 'inlandFlooding', aggType)}`;
        const coastalFloodingText = `% of county impacted by sea level rise: ${getHistoricValue(attributes, range, 'coastalFlooding', 'max')}`;
        const extremeHeatText = `${startText} annual days with max temperature over 90°F: ${getHistoricValue(attributes, range, 'extremeHeat', aggType)}`;

        setHistoricalRisk((config) => {
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
        setHistoricalRisk((config) => {
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
  }, [cmraScreeningLayer, countyBoundaries, range]);

  return (
    <div css={containerStyles}>
      <SwitchTable
        id="current-weather-switch"
        mapView={mapView}
        value={currentWeather}
        setter={setCurrentWeather}
        columns={['Current Severe Weather Events', 'Status Within Watershed']}
      />

      <div css={sectionHeaderStyles}>
        Historical Risk and Potential Future Scenarios
      </div>

      <Slider
        list={tickList}
        max={tickList[tickList.length - 1].value}
        range={[tickList[0].value, tickList[tickList.length - 1].value]}
        onChange={(value) => setRange(value)}
        sliderVerticalBreak={300}
        steps={null}
        valueLabelDisplay="off"
        headerElm={
          <p css={subheadingStyles}>
            <HelpTooltip label="Adjust the slider handles to filter location data by the selected year range" />
            &nbsp;&nbsp; Date range for the <em>{watershed.name}</em> watershed{' '}
          </p>
        }
      />

      <SwitchTable
        hideHeader={true}
        id="historical-risk-switch"
        mapView={mapView}
        value={historicalRisk}
        setter={setHistoricalRisk}
        columns={[
          'Historical Risk and Potential Future Scenarios',
          'Status within map extent',
        ]}
      />

      <SwitchTable
        id="potentially-vulnerable-switch"
        mapView={mapView}
        value={potentiallyVulnerable}
        setter={setPotentiallyVulnerable}
        columns={[
          'Potentially Vulnerable Waters/Related Assets or Communities',
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

type SwitchTableProps = {
  columns: string[];
  hideHeader?: boolean;
  id: string;
  mapView: __esri.MapView;
  value: SwitchTableConfig;
  setter: Dispatch<SetStateAction<SwitchTableConfig>>;
};

function SwitchTable({
  columns,
  hideHeader,
  id,
  mapView,
  value,
  setter,
}: Readonly<SwitchTableProps>) {
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
          const marginLeft = item.indent
            ? item.checked !== undefined
              ? '1.6rem'
              : '4rem'
            : undefined;
          const itemValue = item.text;
          return (
            <tr key={uniqueId(id)}>
              <td>
                {item.checked === undefined ? (
                  <span style={{ marginLeft }}>{item.label}</span>
                ) : (
                  <label css={toggleStyles}>
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
                      }}
                    />
                    <span style={{ marginLeft: marginLeft }}>{item.label}</span>
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

type Row = {
  checked?: boolean;
  disabled?: boolean;
  id: string;
  indent?: boolean;
  label: string;
  layerId?: string;
  status?: FetchStatus;
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
    text: 'Abnormally Dry',
  },
  {
    id: 'inlandFlooding',
    label: 'Inland Flooding',
    checked: false,
    disabled: false,
    text: 'Flood Warning AND Rain Expected (next 72 hours)',
  },
  {
    id: 'coastalFlooding',
    label: 'Coastal Flooding',
    checked: false,
    disabled: false,
    text: 'Flood Warning',
  },
  {
    id: 'extremeHeat',
    label: 'Extreme Heat',
    checked: false,
    disabled: false,
    text: 'Excessive Heat Warning, Max Daily Air Temp: 103 F',
  },
  {
    id: 'extremeCold',
    label: 'Extreme Cold',
    checked: false,
    disabled: false,
    text: 'Wind Chill Advisory, Min Daily Air Temp: 32 F',
  },
];
const historicalDefaults: Row[] = [
  {
    id: 'fire',
    label: 'Fire',
    checked: false,
    disabled: false,
    text: 'Max number of annual consecutive dry days: 11.3',
  },
  {
    id: 'drought',
    label: 'Drought',
    checked: false,
    disabled: false,
    text: 'Change in annual days with no rain (dry days): 175',
  },
  {
    id: 'inlandFlooding',
    label: 'Inland Flooding',
    checked: false,
    disabled: false,
    text: 'Change in annual days with rain (wet days): 188',
  },
  {
    id: 'coastalFlooding',
    label: 'Coastal Flooding',
    checked: false,
    disabled: false,
    text: '% of county impacted by sea level rise: 2',
  },
  {
    id: 'extremeHeat',
    label: 'Extreme Heat',
    checked: false,
    disabled: false,
    text: 'Change in annual days with max T over 90F: 25',
  },
];
const potentiallyVulnerableDefaults: Row[] = [
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
    id: 'tribes',
    label: 'Tribes',
    checked: false,
    disabled: false,
    layerId: 'tribalLayer',
    text: '',
  },
  {
    id: 'hasTerritories',
    label: 'Territories or Island State?',
    indent: true,
    text: 'No',
  },
  {
    id: 'pollutantStorageTanks',
    label: 'Above and below ground pollutant storage tanks',
    checked: false,
    disabled: false,
    text: '5',
  },
  {
    id: 'landCover',
    label: 'Land cover',
    checked: false,
    disabled: false,
    layerId: 'landCoverLayer',
  },
  {
    id: 'wells',
    label: 'Wells',
    checked: false,
    disabled: false,
    text: '30',
  },
  {
    id: 'dams',
    label: 'Dams',
    checked: false,
    disabled: false,
    text: '2',
  },
];
