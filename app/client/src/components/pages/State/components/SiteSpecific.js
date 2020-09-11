// @flow

import React from 'react';
import styled from 'styled-components';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import highchartsAccessibility from 'highcharts/modules/accessibility';
// components
import { AccordionList, AccordionItem } from 'components/shared/Accordion';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import LoadingSpinner from 'components/shared/LoadingSpinner';
// contexts
import { StateTabsContext } from 'contexts/StateTabs';
// utilities
import { formatNumber } from 'utils/utils';
// data
import { impairmentFields } from 'config/attainsToHmwMapping';
// styles
import { fonts, colors } from 'styles/index.js';

// add accessibility features to highcharts
highchartsAccessibility(Highcharts);

// --- styled components ---
const Text = styled.p`
  padding-bottom: 0;
  font-size: 0.875rem;
  font-style: italic;
}
`;

const AccordionContent = styled.div`
  padding: 0.25em 1.5em 1.5em;

  ul {
    padding-bottom: 0;
  }
`;

const ChartFooter = styled.p`
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

const Percent = styled.span`
  display: inline-block;
  margin-right: 0.125em;
  font-size: 1.25em;
  font-weight: bold;
  color: #0071bc;
`;

const HighchartsContainer = styled.div`
  @media (max-width: 400px) {
    margin-left: -1.4em;
    margin-right: -1.4em;
  }
`;

// --- components ---
type Props = {
  activeState: { code: string, name: string },
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
}: Props) {
  const { currentReportingCycle } = React.useContext(StateTabsContext);

  const [waterTypeUnits, setWaterTypeUnits] = React.useState('');
  React.useEffect(() => {
    if (!waterTypeData || waterTypeData.length === 0) {
      if (waterTypeUnits) setWaterTypeUnits(null);
      return;
    }

    // check the use to see if it is using counts or not
    let usesCounts = false;
    let tempUnits = waterTypeData[0].unitsCode;
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

    if (usesCounts) tempUnits = 'Waters';

    if (tempUnits !== waterTypeUnits) {
      setWaterTypeUnits(tempUnits);
    }
  }, [waterType, waterTypeData, waterTypeUnits, useSelected]);

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

    if (!waterTypeData || waterTypeData.length === 0) return support;

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
      if (param.Cause) {
        let groupName = param.parameterGroup;
        let currentValue = parameterCalc[groupName] || 0;
        let value = Number(param.Cause) || 0;

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
        })[0];

        const sentence =
          match && match.sentence ? (
            <>{match.sentence}</>
          ) : (
            <>
              contain{' '}
              <GlossaryTerm term={match.term}>{match.label}</GlossaryTerm>
            </>
          );

        return (
          <li key={index}>
            <Percent>{percent}%</Percent> or {number} {units}{' '}
            {match ? sentence : <strong>{param}</strong>}.
          </li>
        );
      });

  const barChartData = [];
  if (calculatedSupport.supporting > 0) {
    barChartData.push({
      name: 'Good',
      y: calculatedSupport.supporting || 0,
      color: colors.green(0.75),
    });
  }
  if (calculatedSupport.notSupporting > 0) {
    barChartData.push({
      name: 'Impaired',
      y: calculatedSupport.notSupporting || 0,
      color: colors.red(),
    });
  }
  if (calculatedSupport.insufficent > 0) {
    barChartData.push({
      name: 'Insufficient Info',
      y: calculatedSupport.insufficent || 0,
      color: colors.purple(),
    });
  }

  const responsiveBarChartHeight = barChartData.length * 60;

  const responsiveBarChartFontSize =
    window.innerWidth < 350
      ? '10px'
      : window.innerWidth < 450
      ? '11.5px'
      : '15px';

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
              <GlossaryTerm term="Groundwater">ground water</GlossaryTerm>{' '}
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
              <Text>
                Targeted monitoring provides information on water quality
                problems for the subset of those waters that were assessed.
              </Text>

              <HighchartsContainer>
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
                    tooltip: {
                      formatter: function () {
                        return `${this.key}<br/>
                    ${this.series.name}: <b>${formatNumber(this.y)}</b>`;
                      },
                    },
                    xAxis: {
                      lineWidth: 0,
                      categories: ['Good', 'Impaired', 'Insufficient Info'],
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
              </HighchartsContainer>
              <ChartFooter>
                <strong>Year Last Reported:</strong>
                {currentReportingCycle.status === 'success' && (
                  <>&nbsp;{currentReportingCycle.reportingCycle}</>
                )}
                {currentReportingCycle.status === 'fetching' && (
                  <LoadingSpinner />
                )}
              </ChartFooter>
            </>
          )}
        </>
      )}

      {parameters && parameters.length > 0 && (
        <AccordionList expandDisabled={true}>
          <AccordionItem
            title={
              <h3>
                Top Reasons for Impairment for {activeState.name}{' '}
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
            <AccordionContent>
              <ul>{parameters}</ul>
            </AccordionContent>
          </AccordionItem>
        </AccordionList>
      )}
    </>
  );
}

export default SiteSpecific;
