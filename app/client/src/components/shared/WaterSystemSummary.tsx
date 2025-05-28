/** @jsxImportSource @emotion/react */

import { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import 'highcharts/modules/accessibility';
import 'highcharts/modules/offline-exporting';
import { v4 as uuid } from 'uuid';
import { WindowSize } from '@reach/window-size';
// components
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { errorBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import { useConfigFilesState } from 'contexts/ConfigFiles';
// helpers
import { fetchCheck } from 'utils/fetchUtils';
import { formatNumber, isAbort } from 'utils/utils';
import { useAbort } from 'utils/hooks';
// errors
import { grpaError } from 'config/errorMessages';

function formatValue(value?: string) {
  return value ? formatNumber(value) : '';
}

const subHeaderStyles = css`
  margin: 0;
  padding: 0;
  font-family: inherit;
  font-size: 16px;
  font-weight: bold;
`;

const sectionStyles = css`
  padding-bottom: 1.5em;
  line-height: 1.375;
`;

const loadingContainerStyles = css`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 10em;
`;

const containerStyles = css`
  margin-top: 1em;

  @media (max-width: 400px) {
    margin-left: -1.4em;
    margin-right: -1.4em;
  }
`;

const tableStyles = css`
  table-layout: fixed;
  line-height: 1.375;

  thead th {
    vertical-align: middle;
  }

  th,
  td {
    padding: 0.375rem;
    font-size: 0.8125rem;
    text-align: center;
  }
`;

const rowsStyles = css`
  padding-left: 0;
  border-bottom: 1px solid #dee2e6;
  list-style: none;
`;

const rowStyles = css`
  display: flex;
  justify-content: space-between;
  padding: 0.375rem;
  border-top: 1px solid #dee2e6;
  font-size: 0.8125rem;
`;

const labelStyles = css`
  font-weight: bold;
`;

const valueStyles = css`
  margin-left: 0.5rem;
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles}
  margin: 1rem;
`;

// --- components ---
type Props = {
  state: { label: string; value: string };
};

function WaterSystemSummary({ state }: Props) {
  const services = useConfigFilesState().data.services;
  const { getSignal } = useAbort();

  const [lastCountsCode, setLastCountsCode] = useState(null);
  const [systemTypeRes, setSystemTypeRes] = useState({
    status: 'fetching',
    data: {
      cwsCount: 0,
      ntncwsCount: 0,
      tncwsCount: 0,
    },
  });
  useEffect(() => {
    if (!state.value || lastCountsCode === state.value) {
      return;
    }

    setLastCountsCode(state.value);

    fetchCheck(
      `${services.dwmaps.getGPRASystemCountsByType}${state.value}`,
      getSignal(),
    )
      .then((res) => {
        if (!res?.items?.length) {
          setSystemTypeRes({
            status: 'failure',
            data: {
              cwsCount: 0,
              ntncwsCount: 0,
              tncwsCount: 0,
            },
          });
          return;
        }

        let cwsCount = 0;
        let ntncwsCount = 0;
        let tncwsCount = 0;
        res.items.forEach((item) => {
          if (item.primacy_agency_code !== state.value) return;

          const { pws_type_code, number_of_systems } = item;
          switch (pws_type_code) {
            case 'CWS':
              cwsCount = number_of_systems;
              break;
            case 'NTNCWS':
              ntncwsCount = number_of_systems;
              break;
            case 'TNCWS':
              tncwsCount = number_of_systems;
              break;
            default:
              break;
          }
        });

        setSystemTypeRes({
          status: 'success',
          data: {
            cwsCount,
            ntncwsCount,
            tncwsCount,
          },
        });
      })
      .catch((err) => {
        if (isAbort(err)) return;
        console.error(err);
        setSystemTypeRes({
          status: 'failure',
          data: {
            cwsCount: 0,
            ntncwsCount: 0,
            tncwsCount: 0,
          },
        });
      });
  }, [getSignal, state, services, lastCountsCode]);

  // fetch GPRA data
  const [lastSummaryCode, setLastSummaryCode] = useState(null);
  const [gpraData, setGpraData] = useState({
    status: 'fetching',
    data: {},
  });

  useEffect(() => {
    if (!state.value || lastSummaryCode === state.value) {
      return;
    }

    setLastSummaryCode(state.value);

    fetchCheck(`${services.dwmaps.getGPRASummary}${state.value}`, getSignal())
      .then((res) =>
        setGpraData({
          status: 'success',
          data: res.items.length > 0 ? res.items[0] : null,
        }),
      )
      .catch((err) => {
        if (isAbort(err)) return;
        setGpraData({ status: 'failure', data: {} });
      });
  }, [getSignal, state, services, lastSummaryCode]);

  return (
    <>
      <div css={sectionStyles}>
        <h4 css={subHeaderStyles}>Community Water System (CWS):</h4>A public
        water system that supplies water to the same population year-round
        (e.g., residences).
      </div>
      <div css={sectionStyles}>
        <h4 css={subHeaderStyles}>
          Non-Transient Non-Community Water System (NTNCWS):
        </h4>
        A public water system that regularly supplies water to at least 25 of
        the same people at least six months per year. Some examples are schools,
        factories, office buildings, and hospitals which have their own water
        systems.
      </div>
      <div css={sectionStyles}>
        <h4 css={subHeaderStyles}>
          Transient Non-Community Water System (TNCWS):
        </h4>
        A public water system that provides water in a place such as a gas
        station or campground where people do not remain for long periods of
        time.
      </div>

      {systemTypeRes.status === 'fetching' && (
        <div css={loadingContainerStyles} className="container">
          <LoadingSpinner />
        </div>
      )}
      {systemTypeRes.status === 'failure' && (
        <div css={modifiedErrorBoxStyles}>
          <p>{grpaError}</p>
        </div>
      )}
      {systemTypeRes.status === 'success' && (
        <div css={containerStyles}>
          <HighchartsReact
            highcharts={Highcharts}
            options={{
              title: { text: `${state.label} Drinking Water Systems By Type` },
              credits: { enabled: false },
              chart: {
                plotBackgroundColor: null,
                plotBorderWidth: null,
                plotShadow: false,
                type: 'pie',
              },
              exporting: {
                buttons: {
                  contextButton: {
                    menuItems: [
                      'downloadPNG',
                      'downloadJPEG',
                      'downloadPDF',
                      'downloadSVG',
                    ],
                    theme: {
                      fill: 'rgba(0, 0, 0, 0)',
                      states: {
                        hover: {
                          fill: 'rgba(0, 0, 0, 0)',
                        },
                        select: {
                          fill: 'rgba(0, 0, 0, 0)',
                          stroke: '#666666',
                        },
                      },
                    },
                  },
                },
                chartOptions: {
                  plotOptions: {
                    series: {
                      dataLabels: {
                        enabled: true,
                      },
                    },
                  },
                },
                filename: `${state.label.replaceAll(
                  ' ',
                  '_',
                )}_Drinking_Water_Systems`,
              },
              tooltip: {
                formatter: function () {
                  return `${this.key}<br/><b>${formatNumber(this.y)}</b>`;
                },
              },
              plotOptions: {
                pie: {
                  showInLegend: true,
                  dataLabels: {
                    enabled: true,
                    formatter: function () {
                      return formatNumber(this.y);
                    },
                  },
                  shadow: false,
                  center: ['50%', '50%'],
                },
              },
              series: [
                {
                  name: `${state.label} Drinking Water Systems By Type`,
                  innerSize: '50%',
                  colorByPoint: true,
                  data: [
                    {
                      name: 'CWS',
                      y: systemTypeRes.data.cwsCount,
                      color: '#9bc2e5',
                    },
                    {
                      name: 'NTNCWS',
                      y: systemTypeRes.data.ntncwsCount,
                      color: '#febe01',
                    },
                    {
                      name: 'TNCWS',
                      y: systemTypeRes.data.tncwsCount,
                      color: '#a9cf8f',
                    },
                  ],
                },
              ],
              legend: {
                verticalAlign: 'top',
              },
            }}
          />
        </div>
      )}

      <p>
        The data below represent the most recent data available for{' '}
        <a
          href="https://www.epa.gov/ground-water-and-drinking-water/drinking-water-performance-and-results-report"
          target="_blank"
          rel="noopener noreferrer"
        >
          EPA’s Drinking Water Performance and Results (GPRA) Report
        </a>{' '}
        <small>(opens new browser tab)</small>. GPRA results are for{' '}
        <strong>Community Water Systems</strong> for{' '}
        <GlossaryTerm term="Drinking Water Health-based Violations">
          Drinking Water Health-based Violations
        </GlossaryTerm>{' '}
        only. Drinking water data are submitted quarterly by the Primacy
        Agencies and these summary metrics are then posted by EPA.
      </p>

      <div css={containerStyles}>
        {gpraData.status === 'fetching' && <LoadingSpinner />}
        {gpraData.status === 'failure' && (
          <div css={modifiedErrorBoxStyles}>
            <p>{grpaError}</p>
          </div>
        )}
        {gpraData.status === 'success' && (
          <WindowSize>
            {({ width, height }) => {
              if (!gpraData.data || gpraData.data.length === 0) {
                return <>No data available...</>;
              }

              const labels = [
                'Submission Year Quarter',
                'Violations',
                'Systems in Violation',
                'Population Served in Violation',
                'Total Systems',
                'Total Population Served',
                'Systems in Compliance',
                'Population Served in Compliance',
              ];

              const values = [
                `${gpraData.data.submissionyearquarter}`,
                `${formatValue(gpraData.data.gpra_num_of_vio)}`,
                `${formatValue(gpraData.data.gpra_sys_in_vio)}`,
                `${formatValue(gpraData.data.gpra_pop_in_vio)}`,
                `${formatValue(gpraData.data.gpra_total_sys)}`,
                `${formatValue(gpraData.data.gpra_total_pop)}`,
                `${formatValue(gpraData.data.gpra_sys_percent)}%`,
                `${formatValue(gpraData.data.gpra_pop_percent)}%`,
              ];

              if (width < 986) {
                // narrow screens
                return (
                  <ul css={rowsStyles}>
                    {labels.map((label, index) => (
                      <li css={rowStyles} key={label}>
                        <span css={labelStyles}>{label}</span>
                        <span css={valueStyles}>{values[index]}</span>
                      </li>
                    ))}
                  </ul>
                );
              } else {
                // wide screens
                return (
                  <table css={tableStyles} className="table">
                    <thead>
                      <tr>
                        {labels.map((item) => (
                          <th key={item}>{item}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {values.map((item) => (
                          <td key={uuid()}>{item}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                );
              }
            }}
          </WindowSize>
        )}
      </div>
    </>
  );
}

export default WaterSystemSummary;
