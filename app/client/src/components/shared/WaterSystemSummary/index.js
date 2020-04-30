// @flow

import React from 'react';
import styled from 'styled-components';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import WindowSize from '@reach/window-size';
// components
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { StyledErrorBox } from 'components/shared/MessageBoxes';
// helpers
import { fetchCheck } from 'utils/fetchUtils';
import { formatNumber } from 'utils/utils';
// config
import { dwmaps } from 'config/webServiceConfig';
// errors
import { grpaError } from 'config/errorMessages';

function formatValue(value: ?string) {
  return value ? formatNumber(value) : '';
}

// --- styled components ---
const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 10em;
`;

const Container = styled.div`
  margin-top: 1em;

  @media (max-width: 400px) {
    margin-left: -1.4em;
    margin-right: -1.4em;
  }
`;

const Table = styled.table`
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

const Rows = styled.ul`
  padding-left: 0;
  border-bottom: 1px solid #dee2e6;
  list-style: none;
`;

const Row = styled.li`
  display: flex;
  justify-content: space-between;
  padding: 0.375rem;
  border-top: 1px solid #dee2e6;
  font-size: 0.8125rem;
`;

const Label = styled.span`
  font-weight: bold;
`;

const Value = styled.span`
  margin-left: 0.5rem;
`;

const ErrorBox = styled(StyledErrorBox)`
  margin: 1rem;
`;

// --- components ---
type Props = {
  state: { name: string, code: string },
};

function WaterSystemSummary({ state }: Props) {
  const [systemTypeRes, setSystemTypeRes] = React.useState({
    status: 'fetching',
    data: {
      cwsCount: 0,
      ntncwsCount: 0,
      tncwsCount: 0,
    },
  });
  React.useEffect(() => {
    fetchCheck(`${dwmaps.getGPRASystemCountsByType}${state.code}`)
      .then((res) => {
        if (!res || !res.items || res.items.length === 0) {
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
          if (item.primacy_agency_code !== state.code) return;

          const { pws_type_code, number_of_systems } = item;
          if (pws_type_code === 'CWS') cwsCount = number_of_systems;
          if (pws_type_code === 'NTNCWS') ntncwsCount = number_of_systems;
          if (pws_type_code === 'TNCWS') tncwsCount = number_of_systems;
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
  }, [state]);

  // fetch GPRA data
  const [gpraData, setGpraData] = React.useState({
    status: 'fetching',
    data: {},
  });

  React.useEffect(() => {
    fetchCheck(`${dwmaps.getGPRASummary}${state.code}`)
      .then((res) => setGpraData({ status: 'success', data: res.items[0] }))
      .catch((err) => setGpraData({ status: 'failure', data: {} }));
  }, [state]);

  return (
    <>
      <p>
        <strong>Community Water System (CWS):</strong>
        <br />A public water system that supplies water to the same population
        year-round (e.g., residences).
      </p>
      <p>
        <strong>Non-Transient Non-Community Water System (NTNCWS):</strong>
        <br />A public water system that regularly supplies water to at least 25
        of the same people at least six months per year. Some examples are
        schools, factories, office buildings, and hospitals which have their own
        water systems.
      </p>
      <p>
        <strong>Transient Non-Community Water System (TNCWS):</strong>
        <br />A public water system that provides water in a place such as a gas
        station or campground where people do not remain for long periods of
        time.
      </p>

      {systemTypeRes.status === 'fetching' && (
        <LoadingContainer className="container">
          <LoadingSpinner />
        </LoadingContainer>
      )}
      {systemTypeRes.status === 'failure' && (
        <ErrorBox>
          <p>{grpaError}</p>
        </ErrorBox>
      )}
      {systemTypeRes.status === 'success' && (
        <Container>
          <HighchartsReact
            highcharts={Highcharts}
            options={{
              title: { text: `${state.name} Drinking Water Systems By Type` },
              credits: { enabled: false },
              chart: {
                plotBackgroundColor: null,
                plotBorderWidth: null,
                plotShadow: false,
                type: 'pie',
              },
              tooltip: {
                formatter: function() {
                  return `${this.key}<br/><b>${formatNumber(this.y)}</b>`;
                },
              },
              plotOptions: {
                pie: {
                  showInLegend: true,
                  dataLabels: {
                    enabled: true,
                    formatter: function() {
                      return formatNumber(this.y);
                    },
                  },
                  shadow: false,
                  center: ['50%', '50%'],
                },
              },
              series: [
                {
                  name: `${state.name} Drinking Water Systems By Type`,
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
        </Container>
      )}

      <p>
        The data below represent the most recent data available for{' '}
        <a
          href="https://www.epa.gov/ground-water-and-drinking-water/drinking-water-performance-and-results-report"
          target="_blank"
          rel="noopener noreferrer"
        >
          EPA’s Drinking Water Performance and Results (GPRA) Report
        </a>
        . GPRA results are for <strong>Community Water Systems</strong> for{' '}
        <GlossaryTerm term="Drinking Water Health-based Violations">
          Drinking Water Health Based Violations
        </GlossaryTerm>{' '}
        only. Drinking water data are submitted quarterly by the Primacy
        Agencies and these summary metrics are then posted by EPA.
      </p>

      <Container>
        {gpraData.status === 'fetching' && <LoadingSpinner />}
        {gpraData.status === 'failure' && (
          <ErrorBox>
            <p>{grpaError}</p>
          </ErrorBox>
        )}
        {gpraData.status === 'success' && (
          <WindowSize>
            {({ width, height }) => {
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
                  <Rows>
                    {labels.map((label, index) => (
                      <Row key={index}>
                        <Label>{label}</Label>
                        <Value>{values[index]}</Value>
                      </Row>
                    ))}
                  </Rows>
                );
              } else {
                // wide screens
                return (
                  <Table className="table">
                    <thead>
                      <tr>
                        {labels.map((item, index) => (
                          <th key={index}>{item}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {values.map((item, index) => (
                          <td key={index}>{item}</td>
                        ))}
                      </tr>
                    </tbody>
                  </Table>
                );
              }
            }}
          </WindowSize>
        )}
      </Container>
    </>
  );
}

export default WaterSystemSummary;
