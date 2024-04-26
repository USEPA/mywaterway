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
// components
import DateSlider from 'components/shared/DateSlider';
import { HelpTooltip } from 'components/shared/HelpTooltip';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import Switch from 'components/shared/Switch';
import TabErrorBoundary from 'components/shared/ErrorBoundary.TabErrorBoundary';
// contexts
import { useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
// styles
import { toggleTableStyles } from 'styles/index';
import { useDischargers, useWaterbodyFeatures } from 'utils/hooks';
import { countOrNotAvailable, summarizeAssessments } from 'utils/utils';
// types
import { FetchStatus } from 'types';

function updateRow(
  config: SwitchTableConfig,
  status: FetchStatus,
  id: string,
  value: number | unknown[] | null = null,
) {
  const row = config.items.find((c) => c.id === id);
  if (row) {
    row.count = countOrNotAvailable(value, status);
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
  const { cipSummary, drinkingWater, mapView, watershed } = useContext(
    LocationSearchContext,
  );
  const { dischargers, dischargersStatus } = useDischargers();
  const { visibleLayers, waterbodyLayer } = useLayers();
  const waterbodies = useWaterbodyFeatures();

  // Syncs the toggles with the visible layers on the map. Mainly
  // used for when the user toggles layers in full screen mode and then
  // exits full screen.
  useEffect(() => {
    setPotentiallyVulnerable((config) => {
      Object.entries(visibleLayers).forEach(([layerId, visible]) => {
        const row = config.items.find((l) => l.layerId === layerId);
        if (!row || !row.hasOwnProperty('checked')) return;
        row.checked = visible;
      });
      return {
        ...config,
        updateCount: config.updateCount + 1,
      };
    });
  }, [visibleLayers]);

  const [currentWeather, setCurrentWeather] = useState<SwitchTableConfig>({
    updateCount: 0,
    items: [
      {
        id: 'fire',
        label: 'Fire',
        checked: false,
        disabled: false,
        text: 'Prescribed Fire, Unhealther Air Quality',
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
    ],
  });

  const [historicalRisk, setHistoricalRisk] = useState<SwitchTableConfig>({
    updateCount: 0,
    items: [
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
    ],
  });

  const [potentiallyVulnerable, setPotentiallyVulnerable] =
    useState<SwitchTableConfig>({
      updateCount: 0,
      items: [
        {
          id: 'waterbodies',
          label: 'Waterbodies',
          checked: false,
          count: '',
          disabled: false,
          layerId: 'waterbodyLayer',
          status: 'idle',
        },
        {
          id: 'impairedWaterbodies',
          label: 'Impaired',
          count: '',
          indent: true,
          status: 'idle',
        },
        {
          id: 'goodWaterbodies',
          label: 'Good',
          count: '',
          indent: true,
          status: 'idle',
        },
        {
          id: 'unknownWaterbodies',
          label: 'Unknown',
          count: '',
          indent: true,
          status: 'idle',
        },
        {
          id: 'dischargers',
          label: 'Permitted Dischargers',
          checked: false,
          count: '',
          disabled: false,
          layerId: 'dischargersLayer',
          status: 'idle',
        },
        {
          id: 'drinkingWaterSystems',
          label: 'Public Drinking Water Systems',
          checked: false,
          count: '',
          disabled: false,
          layerId: 'providersLayer',
          status: 'idle',
        },
        {
          id: 'surfaceWaterSources',
          label: 'Surface Water Sources',
          count: '',
          indent: true,
          status: 'idle',
        },
        {
          id: 'groundWaterSources',
          label: 'Ground Water Sources',
          count: '',
          indent: true,
          status: 'idle',
        },
        {
          id: 'disadvantagedCommunities',
          label: 'Overburdened, Underserved, and Disadvantaged Communities',
          checked: false,
          count: 0,
          disabled: false,
        },
        {
          id: 'tribes',
          label: 'Tribes',
          checked: false,
          count: 0,
          disabled: false,
          layerId: 'tribalLayer',
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
          count: 5,
          disabled: false,
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
          count: 30,
          disabled: false,
        },
        {
          id: 'dams',
          label: 'Dams',
          checked: false,
          count: '2',
          disabled: false,
        },
      ],
    });

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

  const yearsRange = [1970, 2024];

  return (
    <div css={containerStyles}>
      <SwitchTable
        id="current-weather-switch"
        mapView={mapView}
        value={currentWeather}
        setter={setCurrentWeather}
        columns={['Current Severe Weather Events', 'Status Within Map Extent']}
      />

      <div css={sectionHeaderStyles}>
        Historical Risk and Potential Future Scenarios
      </div>

      <DateSlider
        max={yearsRange[1]}
        min={yearsRange[0]}
        disabled={!yearsRange[0] || !yearsRange[1]}
        onChange={() => {}}
        range={yearsRange}
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
}: SwitchTableProps) {
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
          const itemValue = item.text ?? item.count;
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

                          config.updateCount += 1;
                          itemUpdate.checked = checked;
                          return config;
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
  count?: string | number;
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
