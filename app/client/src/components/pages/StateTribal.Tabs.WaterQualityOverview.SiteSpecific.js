// @flow

import React, { useContext } from 'react';
import { css } from 'styled-components/macro';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import highchartsAccessibility from 'highcharts/modules/accessibility';
import highchartsExporting from 'highcharts/modules/exporting';
// components
import { AccordionList, AccordionItem } from 'components/shared/Accordion';
import DynamicExitDisclaimer from 'components/shared/DynamicExitDisclaimer';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import LoadingSpinner from 'components/shared/LoadingSpinner';
// styled components
import { errorBoxStyles, infoBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import { StateTribalTabsContext } from 'contexts/StateTribalTabs';
// utilities
import { formatNumber } from 'utils/utils';
// data
import { impairmentFields } from 'config/attainsToHmwMapping';
// styles
import { fonts, colors } from 'styles/index.js';
// errors
import { fishingAdvisoryError } from 'config/errorMessages';

// add exporting features to highcharts
highchartsExporting(Highcharts);

// add accessibility features to highcharts
highchartsAccessibility(Highcharts);

const textStyles = css`
  padding-bottom: 0;
  font-size: 0.875rem;
  font-style: italic;
}
`;

const accordionContentStyles = css`
  padding: 0.25em 1.5em 1.5em;

  ul {
    padding-bottom: 0;
  }
`;

const chartFooterStyles = css`
  display: flex;
  align-items: center;
  margin-bottom: 1.5em;
  font-size: 0.75rem;
  padding-bottom: 0;

  svg {
    margin: 0 -0.875rem;
    height: 0.6875rem;
  }
`;

const percentStyles = css`
  display: inline-block;
  margin-right: 0.125em;
  font-size: 1.25em;
  font-weight: bold;
  color: #0071bc;
`;

const highchartsContainerStyles = css`
  @media (max-width: 400px) {
    margin-left: -1.4em;
    margin-right: -1.4em;
  }
`;

const fishingAdvisoryTextStyles = css`
  display: inline-block;
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles}
  margin-bottom: 1.5em;
`;

const modifiedInfoBoxStyles = css`
  ${infoBoxStyles}
  margin-bottom: 1.5em;
`;

// --- components ---
type Props = {
  activeState: {
    value: string,
    label: string,
    source: 'All' | 'State' | 'Tribe',
  },
  waterType: string,
  waterTypeData: any,
  completeUseList: Array<Object>,
  useSelected: string,
};

function SiteSpecific({
  topic,
  activeState,
  waterType,
  waterTypeData,
  completeUseList,
  useSelected,
  fishingAdvisoryData,
}: Props) {
  const { currentReportingCycle } = useContext(StateTribalTabsContext);

  let waterTypeUnits = null;
  if (waterTypeData?.length) {
    // check the use to see if it is using counts or not
    let usesCounts = false;
    waterTypeUnits = waterTypeData[0].unitsCode;
    waterTypeData.forEach((waterTypeOption) => {
      waterTypeOption['useAttainments']
        .filter((x) => x['useName'].toUpperCase() === useSelected.toUpperCase())
        .forEach((use) => {
          if (
            (Number(use['Fully Supporting']) === 0 &&
              Number(use['Fully Supporting-count']) > 0) ||
            (Number(use['Not Supporting']) === 0 &&
              Number(use['Not Supporting-count']) > 0) ||
            (Number(use['Insufficient Information']) === 0 &&
              Number(use['Insufficient Information-count']) > 0)
          ) {
            usesCounts = true;
          }
        });
    });

    if (usesCounts) waterTypeUnits = 'Waters';
  }

  // adds up the total amount (miles, acres, square miles) of waters for each
  // support category (fully supporting, not supporting, etc.) accross
  // the distinct use categories.
  const calculateSupport = () => {
    let support = {
      supporting: 0,
      notSupporting: 0,
      insufficent: 0,
      notAssessed: 0,
      total: 0,
    };

    if (!waterTypeData?.length) return support;

    // loop through the use categories in the watertypes and add up each support item
    waterTypeData.forEach((waterTypeOption) => {
      waterTypeOption['useAttainments']
        .filter((x) => x['useName'].toUpperCase() === useSelected.toUpperCase())
        .forEach((use) => {
          const usesCounts = waterTypeUnits === 'Waters';
          support.supporting =
            support.supporting +
            (Number(use[`Fully Supporting${usesCounts ? '-count' : ''}`]) || 0);
          support.notSupporting =
            support.notSupporting +
            (Number(use[`Not Supporting${usesCounts ? '-count' : ''}`]) || 0);
          support.insufficent =
            support.insufficent +
            (Number(
              use[`Insufficient Information${usesCounts ? '-count' : ''}`],
            ) || 0);
          support.notAssessed =
            support.notAssessed +
            (Number(use[`Not Assessed${usesCounts ? '-count' : ''}`]) || 0);
        });
    });

    // get the total
    support.total =
      support.supporting +
      support.notSupporting +
      support.insufficent +
      support.notAssessed;

    return support;
  };

  // used for parameters section, high chart and title
  const calculatedSupport = calculateSupport();

  let parameterCalc = {};
  completeUseList.forEach((use) => {
    use.parameters.forEach((param) => {
      if (param.Cause || param['Cause-count']) {
        let groupName = param.parameterGroup;
        let currentValue = parameterCalc[groupName] || 0;
        let value = Number(param.Cause) || Number(param['Cause-count']) || 0;

        parameterCalc[groupName] = currentValue + value;
      }
    });
  });

  const parameters =
    useSelected &&
    Object.keys(parameterCalc)
      // sort by value descending
      .sort((a, b) => {
        return parseFloat(parameterCalc[b]) - parseFloat(parameterCalc[a]);
      })
      .map((param, index) => {
        const percent = formatNumber(
          (parameterCalc[param] /
            (calculatedSupport.total - calculatedSupport.notAssessed)) *
            100 || 0,
        );

        const number = formatNumber(parameterCalc[param]);
        const units = waterTypeUnits ? waterTypeUnits.toLowerCase() : '';

        // match the param with an item in the attainsToHmwMapping file
        const match = impairmentFields.filter((field) => {
          return field.parameterGroup === param;
        })?.[0];

        const itemSentence = (match) => {
          if (!match) return null;
          return match.sentence ? (
            <>{match.sentence}</>
          ) : (
            <>
              contain{' '}
              <GlossaryTerm term={match.term}>{match.label}</GlossaryTerm>
            </>
          );
        };

        return (
          <li key={param}>
            <span css={percentStyles}>{percent}%</span> or {number} {units}{' '}
            {itemSentence(match) ?? <strong>{param}</strong>}.
          </li>
        );
      });

  const barChartData = [];
  const categories = [];
  if (calculatedSupport.supporting > 0) {
    categories.push('Good');
    barChartData.push({
      name: 'Good',
      y: calculatedSupport.supporting || 0,
      color: colors.green(0.75),
    });
  }
  if (calculatedSupport.notSupporting > 0) {
    categories.push('Impaired');
    barChartData.push({
      name: 'Impaired',
      y: calculatedSupport.notSupporting || 0,
      color: colors.red(),
    });
  }
  if (calculatedSupport.insufficent > 0) {
    categories.push('Insufficient Info');
    barChartData.push({
      name: 'Insufficient Info',
      y: calculatedSupport.insufficent || 0,
      color: colors.purple(),
    });
  }

  const responsiveBarChartHeight =
    barChartData.length === 1 ? 75 : barChartData.length * 60;

  let responsiveBarChartFontSize = '15px';
  if (window.innerWidth < 350) responsiveBarChartFontSize = '10px';
  else if (window.innerWidth < 450) responsiveBarChartFontSize = '11.5px';

  return (
    <>
      {waterType && useSelected && (
        <>
          <h3>
            Assessed{' '}
            <strong>
              <em>{waterType}</em>
            </strong>{' '}
            that support{' '}
            <strong>
              <em>{useSelected}</em>
            </strong>
          </h3>

          {topic === 'drinking' && (
            <p>
              <GlossaryTerm term="Surface Water">Surface water</GlossaryTerm>{' '}
              (streams, rivers, and lakes) or{' '}
              <GlossaryTerm term="Ground Water">ground water</GlossaryTerm>{' '}
              (aquifers) can serve as sources of drinking water, referred to as{' '}
              source water. Public utilities treat source water that is used for
              public drinking water supplies. The graphic below shows the
              condition of source water prior to treatment. Protecting source
              water from contamination protects public health and can reduce
              treatment costs.
            </p>
          )}

          {barChartData.length > 0 && (
            <>
              <p css={textStyles}>
                Targeted monitoring provides information on water quality
                problems for the subset of those waters that were assessed.
              </p>

              <div css={highchartsContainerStyles} id="hmw-site-specific-chart">
                <HighchartsReact
                  highcharts={Highcharts}
                  options={{
                    title: { text: null },
                    credits: { enabled: false },
                    chart: {
                      type: 'bar',
                      style: { fontFamily: fonts.primary },
                      height: responsiveBarChartHeight,
                      plotBackgroundColor: null,
                      plotBorderWidth: null,
                      plotShadow: false,
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
                      filename: `${activeState.label.replaceAll(
                        ' ',
                        '_',
                      )}_Site_Specific`,
                    },
                    tooltip: {
                      formatter: function () {
                        return `${this.key}<br/>
                    ${this.series.name}: <b>${formatNumber(this.y)}</b>`;
                      },
                    },
                    xAxis: {
                      lineWidth: 0,
                      categories,
                      labels: { style: { fontSize: '15px' } },
                    },
                    yAxis: {
                      labels: { enabled: false },
                      title: { text: null },
                      gridLineWidth: 0,
                    },
                    plotOptions: {
                      series: {
                        pointPadding: 0.05,
                        groupPadding: 0,
                        pointWidth: 45,
                        minPointLength: 3,
                        inside: true,
                        shadow: false,
                        borderWidth: 1,
                        edgeWidth: 0,
                        dataLabels: {
                          enabled: true,
                          style: {
                            fontSize: responsiveBarChartFontSize,
                            textOutline: false,
                          },
                          formatter: function () {
                            if (!waterTypeUnits) return formatNumber(this.y);
                            const units = waterTypeUnits.toLowerCase();
                            return `${formatNumber(this.y)} ${units}`;
                          },
                        },
                      },
                    },

                    series: [
                      {
                        name: waterTypeUnits,
                        colorByPoint: true,
                        data: barChartData,
                      },
                    ],
                    legend: { enabled: false },
                  }}
                />
              </div>
              <p css={chartFooterStyles}>
                <strong>Year Last Reported:</strong>
                {currentReportingCycle.status === 'success' && (
                  <>&nbsp;{currentReportingCycle.reportingCycle}</>
                )}
                {currentReportingCycle.status === 'fetching' && (
                  <LoadingSpinner />
                )}
              </p>
            </>
          )}
        </>
      )}

      {parameters?.length > 0 && (
        <AccordionList expandDisabled={true}>
          <AccordionItem
            title={
              <h3>
                Top Reasons for Impairment for {activeState.label}{' '}
                <strong>
                  <em>{waterType}</em>
                </strong>{' '}
                assessed for{' '}
                <strong>
                  <em>{useSelected}</em>
                </strong>
              </h3>
            }
          >
            <div css={accordionContentStyles}>
              <ul>{parameters}</ul>
            </div>
          </AccordionItem>
        </AccordionList>
      )}

      {topic === 'fishing' && fishingAdvisoryData.status === 'fetching' && (
        <LoadingSpinner />
      )}

      {topic === 'fishing' && fishingAdvisoryData.status === 'failure' && (
        <div css={modifiedErrorBoxStyles}>{fishingAdvisoryError}</div>
      )}

      {topic === 'fishing' &&
        fishingAdvisoryData.status === 'success' &&
        fishingAdvisoryData.data.length === 0 && (
          <div css={modifiedInfoBoxStyles}>
            Fishing Advisory information is not available for this location.
          </div>
        )}

      {topic === 'fishing' &&
        fishingAdvisoryData.status === 'success' &&
        fishingAdvisoryData.data.length !== 0 && (
          <>
            <h3 css={fishingAdvisoryTextStyles}>
              Fish Consumption Advisories for{' '}
              <a
                href={fishingAdvisoryData.data[0].url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {activeState.label}
              </a>{' '}
            </h3>
            <DynamicExitDisclaimer url={fishingAdvisoryData.data[0].url} />
          </>
        )}
    </>
  );
}

export default SiteSpecific;
