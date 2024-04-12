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

function WeatherClimate() {
  const { watershed } = useContext(LocationSearchContext);
  const { visibleLayers } = useLayers();

  // Syncs the toggles with the visible layers on the map. Mainly
  // used for when the user toggles layers in full screen mode and then
  // exits full screen.
  useEffect(() => {}, [visibleLayers]);

  const [currentWeather, setCurrentWeather] = useState<Row[]>([
    {
      type: 'Wildfire',
      checked: false,
      disabled: false,
      text: 'Prescribed Fire, Unhealther Air Quality',
    },
    {
      type: 'Drought',
      checked: false,
      disabled: false,
      text: 'Abnormally Dry',
    },
    {
      type: 'Inland Flooding',
      checked: false,
      disabled: false,
      text: 'Flood Warning AND Rain Expected (next 72 hours)',
    },
    {
      type: 'Coastal Flooding',
      checked: false,
      disabled: false,
      text: 'Flood Warning',
    },
    {
      type: 'Extreme Heat',
      checked: false,
      disabled: false,
      text: 'Excessive Heat Warning, Max Daily Air Temp: 103 F',
    },
    {
      type: 'Extreme Cold',
      checked: false,
      disabled: false,
      text: 'Wind Chill Advisory, Min Daily Air Temp: 32 F',
    },
  ]);

  const [historicalRisk, setHistoricalRisk] = useState<Row[]>([
    {
      type: 'Wildfire',
      checked: false,
      disabled: false,
      text: 'Max number of annual consecutive dry days: 11.3',
    },
    {
      type: 'Drought',
      checked: false,
      disabled: false,
      text: 'Change in annual days with no rain (dry days): 175',
    },
    {
      type: 'Inland Flooding',
      checked: false,
      disabled: false,
      text: 'Change in annual days with rain (wet days): 188',
    },
    {
      type: 'Coastal Flooding',
      checked: false,
      disabled: false,
      text: '% of county impacted by sea level rise: 2',
    },
    {
      type: 'Extreme Heat',
      checked: false,
      disabled: false,
      text: 'Change in annual days with max T over 90F: 25',
    },
  ]);

  const [potentiallyVulnerable, setPotentiallyVulnerable] = useState<Row[]>([
    {
      type: 'Waterbodies',
      checked: false,
      disabled: false,
      count: 9,
    },
    {
      type: 'Impaired',
      indent: true,
      count: 8,
    },
    {
      type: 'Good',
      indent: true,
      count: 0,
    },
    {
      type: 'Unknown',
      indent: true,
      count: 1,
    },
    {
      type: 'Permitted Dischargers',
      checked: false,
      disabled: false,
      count: 12,
    },
    {
      type: 'Public Drinking Water Systems',
      checked: false,
      disabled: false,
      count: 38,
    },
    {
      type: 'Surface Water Sources',
      indent: true,
      count: 2,
    },
    {
      type: 'Ground Water Sources',
      indent: true,
      count: 36,
    },
    {
      type: 'Overburdened, Underserved, and Disadvantaged Communities',
      checked: false,
      disabled: false,
      count: 0,
    },
    {
      type: 'Tribes',
      checked: false,
      disabled: false,
      indent: true,
      count: 0,
    },
    {
      type: 'Territories or Island State?',
      indent: true,
      text: 'No',
    },
    {
      type: 'Above and below ground pollutant storage tanks',
      checked: false,
      disabled: false,
      count: 5,
    },
    {
      type: 'Land cover',
      checked: false,
      disabled: false,
    },
    {
      type: 'Wells',
      checked: false,
      disabled: false,
      count: 30,
    },
    {
      type: 'Dams',
      checked: false,
      disabled: false,
      count: 2,
    },
  ]);

  const yearsRange = [1970, 2024];

  return (
    <div css={containerStyles}>
      <SwitchTable
        id="current-weather-switch"
        value={currentWeather}
        setter={setCurrentWeather}
        columns={['Current Severe Weather Events', 'Status within map extent']}
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
        value={historicalRisk}
        setter={setHistoricalRisk}
        columns={[
          'Historical Risk and Potential Future Scenarios',
          'Status within map extent',
        ]}
      />

      <SwitchTable
        id="potentially-vulnerable-switch"
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
  value: Row[];
  setter: Dispatch<SetStateAction<Row[]>>;
};

function SwitchTable({
  columns,
  hideHeader,
  id,
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
          const marginLeft = item.indent
            ? item.checked !== undefined
              ? '1.6rem'
              : '4rem'
            : undefined;
          return (
            <tr key={uniqueId(id)}>
              <td>
                {item.checked === undefined ? (
                  <span style={{ marginLeft }}>{item.type}</span>
                ) : (
                  <label css={toggleStyles}>
                    <Switch
                      checked={item.checked}
                      disabled={item.disabled}
                      onChange={(checked) => {
                        const newPv = [...value];
                        const itemUpdate = newPv.find(
                          (cw) => cw.type === item.type,
                        );
                        if (!itemUpdate) return;

                        itemUpdate.checked = checked;
                        setter(newPv);
                      }}
                    />
                    <span style={{ marginLeft: marginLeft }}>{item.type}</span>
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

export default function WeatherClimateContainer() {
  return (
    <TabErrorBoundary tabName="Weather & Climate">
      <WeatherClimate />
    </TabErrorBoundary>
  );
}

type Row = {
  checked?: boolean;
  count?: number;
  disabled?: boolean;
  indent?: boolean;
  text?: string;
  type: string;
};
