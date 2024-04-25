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
import Switch from 'components/shared/Switch';
import TabErrorBoundary from 'components/shared/ErrorBoundary.TabErrorBoundary';
// contexts
import { useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
// styles
import { toggleTableStyles } from 'styles/index';

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

const subheadingStyles = css`
  font-weight: bold;
  padding-bottom: 0;
  text-align: center;
`;

function ExtremeWeather() {
  const { mapView, watershed } = useContext(LocationSearchContext);
  const { visibleLayers } = useLayers();

  // Syncs the toggles with the visible layers on the map. Mainly
  // used for when the user toggles layers in full screen mode and then
  // exits full screen.
  useEffect(() => {}, [visibleLayers]);

  const [currentWeather, setCurrentWeather] = useState<Row[]>([
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
  ]);

  const [historicalRisk, setHistoricalRisk] = useState<Row[]>([
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
  ]);

  const [potentiallyVulnerable, setPotentiallyVulnerable] = useState<Row[]>([
    {
      id: 'waterbodies',
      label: 'Waterbodies',
      checked: false,
      count: 0,
      disabled: false,
      layerId: 'waterbodyLayer',
    },
    {
      id: 'impairedWaterbodies',
      label: 'Impaired',
      count: 8,
      indent: true,
    },
    {
      id: 'goodWaterbodies',
      label: 'Good',
      count: 0,
      indent: true,
    },
    {
      id: 'unknownWaterbodies',
      label: 'Unknown',
      count: 1,
      indent: true,
    },
    {
      id: 'dischargers',
      label: 'Permitted Dischargers',
      checked: false,
      count: 12,
      disabled: false,
      layerId: 'dischargersLayer',
    },
    {
      id: 'drinkingWaterSystems',
      label: 'Public Drinking Water Systems',
      checked: false,
      count: 38,
      disabled: false,
      layerId: 'providersLayer',
    },
    {
      id: 'surfaceWaterSources',
      label: 'Surface Water Sources',
      count: 2,
      indent: true,
    },
    {
      id: 'groundWaterSources',
      label: 'Ground Water Sources',
      count: 36,
      indent: true,
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
      count: 2,
      disabled: false,
    },
  ]);

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
  value: Row[];
  setter: Dispatch<SetStateAction<Row[]>>;
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
        {value.map((item) => {
          const layer = mapView.map.findLayerById(item.layerId ?? '');
          const marginLeft = item.indent
            ? item.checked !== undefined
              ? '1.6rem'
              : '4rem'
            : undefined;
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

                        const newPv = [...value];
                        const itemUpdate = newPv.find(
                          (cw) => cw.id === item.id,
                        );
                        if (!itemUpdate) return;

                        itemUpdate.checked = checked;
                        setter(newPv);
                      }}
                    />
                    <span style={{ marginLeft: marginLeft }}>{item.label}</span>
                  </label>
                )}
              </td>
              <td>{item.text ?? item.count}</td>
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
  count?: number;
  disabled?: boolean;
  id: string;
  indent?: boolean;
  label: string;
  layerId?: string;
  text?: string;
};
