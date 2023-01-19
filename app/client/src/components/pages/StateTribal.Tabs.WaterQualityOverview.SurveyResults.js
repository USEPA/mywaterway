// @flow

import React, { useEffect, useState } from 'react';
import { css } from 'styled-components/macro';
import { WindowSize } from '@reach/window-size';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import highchartsAccessibility from 'highcharts/modules/accessibility';
import highchartsExporting from 'highcharts/modules/exporting';
import Select from 'react-select';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { AccordionList, AccordionItem } from 'components/shared/Accordion';
// styled components
import { errorBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import {
  useSurveyMappingContext,
  useWaterTypeOptionsContext,
} from 'contexts/LookupFiles';
// utilities
import {
  formatNumber,
  normalizeString,
  removeAccessibiltyHcSvgExport,
  titleCase,
  titleCaseWithExceptions,
} from 'utils/utils';
// styles
import { fonts, colors, reactSelectStyles } from 'styles/index.js';
// errors
import { stateSurveySectionError } from 'config/errorMessages';

// add exporting features to highcharts
highchartsExporting(Highcharts);

// add accessibility features to highcharts
highchartsAccessibility(Highcharts);

// Workaround for the Download SVG not working with the accessibility module.
removeAccessibiltyHcSvgExport();

const chartFooterStyles = css`
  font-size: 0.75rem;
  padding-bottom: 0;
`;

const inputContainerStyles = css`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
`;

const inputStyles = css`
  margin-bottom: 0.75em;
  width: 100%;

  @media (min-width: 768px) {
    width: calc(50% - 0.75em);

    p {
      margin-top: 1.375em;
      padding-left: 0.5em;
    }
  }

  label {
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
    font-weight: bold;
  }

  p {
    padding-bottom: 0;
    font-size: 0.875rem;
    font-style: italic;
  }
`;

const accordionContentStyles = css`
  padding: 0.25em 1.5em 1.5em;
`;

const fullWidthHrStyles = css`
  width: calc(100% + 3em);
  margin-left: -1.5em;
  background-color: ${colors.slate()};
`;

// --- components ---
type Props = {
  loading: boolean,
  activeState: {
    value: string,
    label: string,
    source: 'All' | 'State' | 'Tribe',
  },
  subPopulationCodes: Array<string>,
  surveyData: Object,
  waterType: string,
  topicUses: Object,
  organizationId: string,
  useSelected: string,
};

function SurveyResults({
  loading,
  activeState,
  subPopulationCodes,
  surveyData,
  waterType,
  topicUses,
  organizationId,
  useSelected,
}: Props) {
  const surveyMapping = useSurveyMappingContext();
  const waterTypeOptions = useWaterTypeOptionsContext();

  const [userSelectedSubPop, setUserSelectedSubPop] = useState('');
  const [selectedSubPop, setSelectedSubPop] = useState('');
  const [selectedSurveyGroup, setSelectedSurveyGroup] = useState(null);

  // Handles user and auto subPopulation selection
  useEffect(() => {
    if (subPopulationCodes && subPopulationCodes.length > 0) {
      // set to the user's selection if it is availble
      if (
        subPopulationCodes.some(
          (e) => e.subPopulationCode === userSelectedSubPop,
        )
      ) {
        setSelectedSubPop(userSelectedSubPop);
        setSelectedSurveyGroup(
          subPopulationCodes.find(
            (item) => item.subPopulationCode === userSelectedSubPop,
          ),
        );
      }

      // set to first item if the user's select cannot be found
      else {
        setSelectedSubPop(subPopulationCodes[0].subPopulationCode);
        setSelectedSurveyGroup(subPopulationCodes[0]);
      }
    } else {
      setSelectedSubPop(''); // no data available
    }
  }, [waterType, useSelected, subPopulationCodes, userSelectedSubPop]);

  // gets the color, label and order of a particular stressor
  const getStressorColorCoding = (mapping, stressor, surveyCategoryCode) => {
    if (!mapping || !stressor || !surveyCategoryCode) return null;

    // find the stressor/categoryCode combo in stressorMapping if surveyMapping.js
    for (const stressorMap of mapping) {
      if (
        normalizeString(stressorMap.stressor) === normalizeString(stressor) &&
        normalizeString(stressorMap.surveyCategoryCode) ===
          normalizeString(surveyCategoryCode)
      ) {
        return stressorMap;
      }
    }
  };

  // gets the color, label and order of a particular surveyCategoryCode
  const getCategoryColorCoding = (mapping, surveyCategoryCode) => {
    if (!mapping || !surveyCategoryCode) return null;

    // find the surveyCategoryCode in categoryCodeMapping if surveyMapping.js
    for (const categoryMap of mapping) {
      if (
        normalizeString(categoryMap.surveyCategoryCode) ===
        normalizeString(surveyCategoryCode)
      ) {
        return categoryMap;
      }
    }
  };

  // Handles changes in the selected sub population code
  let summaryItems = [];
  let stressorChartSeries = {};
  let xAxisLabels = [];
  let surveyUseSelected = '';
  let allCategoryCodes = {};
  let allStressorNames = [];
  if (
    surveyData &&
    surveyData.surveyWaterGroups &&
    waterType &&
    waterTypeOptions.status === 'success' &&
    surveyMapping.status === 'success'
  ) {
    // build arrays of summary and stressors
    let stressorItems = [];
    let locConfidenceLevel = '';
    surveyData.surveyWaterGroups
      .filter((x) => {
        return (
          waterTypeOptions.data[waterType].includes(x['waterTypeGroupCode']) &&
          selectedSubPop === x['subPopulationCode']
        );
      })
      .forEach((waterGroup) => {
        // get the categoryCodeMapping and stressorMapping for the current selections
        let categoryMapping = null;
        let stressorMapping = null;
        for (const mapping of surveyMapping.data) {
          let useSelectedUpper = normalizeString(useSelected);
          let topicUseSelected = topicUses[useSelectedUpper];
          surveyUseSelected =
            topicUseSelected &&
            topicUseSelected.surveyuseCode &&
            titleCase(topicUseSelected.surveyuseCode);

          let mapOrgId = mapping['organizationIdentifier'];
          let mapSubPop = mapping['subPopulationCode'];
          let mapWaterGroup = mapping['waterTypeGroupCode'];
          let mapSurveyUse = mapping['surveyUseCode'];

          if (
            organizationId &&
            selectedSubPop &&
            mapOrgId &&
            mapSubPop &&
            mapSurveyUse &&
            waterTypeOptions.data[waterType] &&
            normalizeString(mapOrgId) === normalizeString(organizationId) &&
            normalizeString(mapSubPop) === normalizeString(selectedSubPop) &&
            waterTypeOptions.data[waterType].includes(mapWaterGroup) &&
            (normalizeString(mapSurveyUse) === normalizeString(useSelected) ||
              (topicUseSelected &&
                topicUseSelected.surveyuseCode &&
                normalizeString(mapSurveyUse) ===
                  normalizeString(topicUseSelected.surveyuseCode)))
          ) {
            stressorMapping = mapping['stressorMapping'];
            categoryMapping = mapping['categoryCodeMapping'];
            break;
          }
        }

        let confidenceLvlSet = false;
        waterGroup.surveyWaterGroupUseParameters.forEach((param) => {
          let useSelectedUpper = normalizeString(useSelected);
          let topicUseSelected = topicUses[useSelectedUpper];
          let paramSurveyUseCode = normalizeString(param.surveyUseCode);

          // check the useCode
          if (
            !topicUseSelected ||
            !topicUseSelected.hasOwnProperty('surveyuseCode') ||
            (paramSurveyUseCode !== useSelectedUpper &&
              paramSurveyUseCode !==
                normalizeString(topicUseSelected.surveyuseCode))
          ) {
            return;
          }

          // add item to the stressor list
          if (param.stressor) {
            let stressorColor = getStressorColorCoding(
              stressorMapping,
              param.stressor,
              param.surveyCategoryCode,
            );

            if (stressorMapping) {
              // build the stressor object
              let stressorItem = {
                ...param,
                ...stressorColor,
              };

              //add the stressor to the list
              stressorItems.push(stressorItem);

              // build a list of all unique possible stressor names for the
              // current selection
              if (!allStressorNames.includes(stressorItem.stressor)) {
                allStressorNames.push(stressorItem.stressor);
              }

              // build a list of all unique possible surveyCategoryCodes for the
              // current selection
              const categoryCode = stressorItem.surveyCategoryCode;
              if (!allCategoryCodes.hasOwnProperty(categoryCode)) {
                allCategoryCodes[categoryCode] = stressorItem;
              }
            }
          }
          // add item to the summary list if the stressor is null
          else {
            // set the confidence level
            if (!confidenceLvlSet) locConfidenceLevel = param.confidenceLevel;

            let categoryColor = getCategoryColorCoding(
              categoryMapping,
              param.surveyCategoryCode,
            );

            if (categoryColor) {
              // add to summary items
              summaryItems.push({
                name: categoryColor.categoryCode_label,
                y: param.metricValue,
                color: categoryColor.categoryCode_color,
                marginOfError: param.marginOfError,
                categoryCode_order: categoryColor.categoryCode_order,
              });
            }
          }
        });
      });

    // sort the summary items by name and surveyCategoryCode
    summaryItems.sort(
      (a, b) =>
        parseFloat(a.categoryCode_order) - parseFloat(b.categoryCode_order),
    );

    // add the confidence level to the bottom of the legend
    if (summaryItems.length > 0) {
      summaryItems.push({
        name: `Survey confidence level = ${locConfidenceLevel}%`,
        y: 0, // make sure it does not show up on chart
        color: 'white', // make sure it does not show up on legend
        isConfidenceLevel: true,
      });
    }

    // sort the stressor names
    allStressorNames.sort((a, b) => a.localeCompare(b));

    // Build the stressor chart data array by looping through all category codes
    // and stressor names for the current selection to ensure that missing
    // category codes (i.e. good, bad, etc.) get filled in with 0s.
    Object.values(allCategoryCodes).forEach((categoryCode) => {
      const data = [];

      // loop through all stressor names for the current selection
      allStressorNames.forEach((stressor) => {
        // build the x axis labels list
        const stressorLabel = titleCaseWithExceptions(stressor);
        if (!xAxisLabels.includes(stressorLabel)) {
          xAxisLabels.push(stressorLabel);
        }

        // get the stressor objects for the stressor and survey category code
        // currently being processed
        const filteredStressorItems = stressorItems.filter(
          (item) =>
            item.stressor === stressor &&
            item.surveyCategoryCode === categoryCode.surveyCategoryCode,
        );

        // add the value to the data array for the category code (i.e. good, bad, etc.)
        if (filteredStressorItems.length === 0) {
          // fill in gaps of missing web service data
          data.push(0);
        } else {
          data.push(filteredStressorItems[0].metricValue);
        }
      });

      // add category code to the stressorChartSeries
      stressorChartSeries[categoryCode.surveyCategoryCode] = {
        name: categoryCode.surveyCategoryCode,
        color: categoryCode.categoryCode_color,
        data,
        order: categoryCode.categoryCode_order,
      };
    });
  }

  const chartOptions = {
    title: { text: null },
    credits: { enabled: false },
    chart: { style: { fontFamily: fonts.primary } },
    plotOptions: {
      // 'all' not part of Highcharts API, but using it for shared plotOptions
      all: {
        inside: true,
        shadow: false,
        dataLabels: {
          enabled: true,
          style: { fontSize: '15px', textOutline: false },
        },
      },
    },
    legend: {
      verticalAlign: 'top',
      itemStyle: { fontSize: '15px' },
    },
  };

  const populationDistance = selectedSurveyGroup
    ? `${selectedSurveyGroup.size.toLocaleString('en')} ` +
      `${selectedSurveyGroup.unitCode}`
    : '';

  const populationTitle = selectedSurveyGroup
    ? `${populationDistance} ${selectedSurveyGroup.surveyWaterGroupCommentText}`
    : '';

  if (
    surveyMapping.status === 'failure' ||
    waterTypeOptions.status === 'failure'
  ) {
    return (
      <div css={errorBoxStyles}>
        <p>{stateSurveySectionError(activeState.source)}</p>
      </div>
    );
  }

  if (loading || surveyMapping.status === 'fetching') return <LoadingSpinner />;

  // Generate a random number for making a unique connection between the
  // population dropdown and label
  const populationId = Date.now() + Math.random();

  return (
    subPopulationCodes &&
    subPopulationCodes.length > 0 && (
      <>
        <h3>
          Overall water quality in {activeState.label}{' '}
          <strong>
            <em>{waterType}</em>
          </strong>{' '}
          for{' '}
          <strong>
            <em>{surveyUseSelected}</em>
          </strong>
        </h3>

        <div css={inputContainerStyles}>
          <div css={inputStyles}>
            <label
              htmlFor={`population-${populationId}`}
              title={populationTitle}
            >
              Population:
            </label>
            <Select
              inputId={`population-${populationId}`}
              classNamePrefix="Select"
              isSearchable={false}
              options={subPopulationCodes.map((item) => {
                const value = item.subPopulationCode;
                return { value, label: value };
              })}
              value={{ value: selectedSubPop, label: selectedSubPop }}
              onChange={(ev) => setUserSelectedSubPop(ev.value)}
              styles={reactSelectStyles}
            />
            {populationDistance && <small>({populationDistance})</small>}
          </div>

          <div css={inputStyles}>
            <p>
              {activeState.source} statistical surveys provide an overall
              picture of water quality condition across the{' '}
              {activeState.source.toLowerCase()} and look at changes over time.
            </p>
          </div>
        </div>

        <WindowSize>
          {({ width }) => {
            if (summaryItems.length === 0) return null;

            return (
              <div id="hmw-surveys-chart">
                <HighchartsReact
                  highcharts={Highcharts}
                  options={{
                    ...chartOptions,
                    chart: {
                      type: 'pie',
                      style: chartOptions.chart.style,
                      height: 300,
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
                      )}_Survey_Results`,
                    },
                    tooltip: {
                      formatter: function () {
                        const value = formatNumber(this.y, 1);
                        return `${this.key}<br/><b>${value}%</b>`;
                      },
                    },
                    plotOptions: {
                      pie: {
                        ...chartOptions.plotOptions.all,
                        showInLegend: true,
                        dataLabels: {
                          ...chartOptions.plotOptions.all.dataLabels,
                          formatter: function () {
                            if (!this.point.isConfidenceLevel) {
                              return formatNumber(this.y, 1) + '%';
                            } else {
                              return '';
                            }
                          },
                        },
                      },
                    },
                    series: [
                      {
                        colorByPoint: true,
                        data: summaryItems,
                      },
                    ],
                    legend: {
                      ...chartOptions.legend,
                      layout: width >= 992 ? 'vertical' : 'horizontal',
                      align: width >= 992 ? 'right' : 'center',
                      useHTML: true, // display the +/- symbol (&#177;)
                      labelFormatter: function () {
                        if (this.isConfidenceLevel) {
                          // confidence level is not actually a legend item, just text
                          return this.name;
                        } else {
                          const value = formatNumber(this.y, 1);
                          const marginOfError = formatNumber(
                            this.marginOfError,
                            1,
                          );
                          return `${this.name}: ${value}% &#177; ${marginOfError}%`;
                        }
                      },
                    },
                  }}
                />
              </div>
            );
          }}
        </WindowSize>
        <p css={chartFooterStyles}>
          <strong>Year Last Reported:</strong> {surveyData.year}
        </p>

        {Object.keys(stressorChartSeries).length > 0 && (
          <AccordionList expandDisabled={true}>
            <AccordionItem
              title={
                <h3>
                  Stressors surveyed for{' '}
                  <strong>
                    <em>{surveyUseSelected}</em>
                  </strong>
                </h3>
              }
            >
              <div css={accordionContentStyles}>
                <HighchartsReact
                  highcharts={Highcharts}
                  options={{
                    ...chartOptions,
                    chart: {
                      type: 'bar',
                      style: chartOptions.chart.style,
                      // stressors * bar height (30) + room for chart title and x-axis labels (90)
                      height: xAxisLabels.length * 30 + 90,
                    },
                    tooltip: {
                      formatter: function () {
                        const value = formatNumber(this.y, 1);
                        return `${this.key}<br/>
                    ${this.series.name}: <b>${value}%</b>`;
                      },
                    },
                    plotOptions: {
                      series: {
                        ...chartOptions.plotOptions.all,
                        stacking: 'percent',
                        pointPadding: 0.05,
                        groupPadding: 0,
                        dataLabels: {
                          ...chartOptions.plotOptions.all.dataLabels,
                          formatter: function () {
                            const value = formatNumber(this.y, 1);
                            return value !== '0' ? `${value}%` : '';
                          },
                        },
                      },
                      bar: {
                        maxPointWidth: 40,
                        pointPadding: 0.1,
                        groupPadding: 0,
                        borderWidth: 0,
                      },
                    },
                    xAxis: {
                      categories: xAxisLabels,
                      labels: {
                        style: { fontSize: '15px', textOutline: false },
                      },
                    },
                    yAxis: {
                      title: { text: null },
                      tickInterval: 100,
                      labels: { format: '{value}%' },
                      reversedStacks: false,
                    },
                    series: Object.values(stressorChartSeries).sort(
                      (a, b) => parseFloat(a.order) - parseFloat(b.order),
                    ),
                    legend: {
                      ...chartOptions.legend,
                      layout: 'horizontal',
                      align: 'center',
                      symbolRadius: 0,
                    },
                  }}
                />
              </div>
            </AccordionItem>
          </AccordionList>
        )}

        <hr css={fullWidthHrStyles} />
      </>
    )
  );
}

export default SurveyResults;
