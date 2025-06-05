import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import 'highcharts/modules/accessibility';
import 'highcharts/modules/exporting';
import 'highcharts/modules/offline-exporting';
import { useCallback, useMemo } from 'react';
// styles
import { fonts } from 'styles/index';

const baseFontSize = '14px';
const mediumFontSize = '16px';
const smallFontSize = '12px';

export type ColumnSeries = {
  color?: string;
  custom?: {
    description?: string;
  };
  data: Array<
    | number
    | {
        custom?: {
          text: string;
        };
        y: number;
      }
  >;
  name: string;
  type: 'column';
  zoneAxis?: 'x' | 'y';
  zones?: Array<{
    color: string;
    value?: number;
  }>;
};

type Props = {
  caption?: string;
  categories: string[];
  exportFilename?: string;
  height?: string;
  legendTitle?: string;
  series: ColumnSeries[];
  subtitle?: string;
  title?: string;
  xTitle?: string;
  xUnit?: string;
  yTitle?: string;
  yUnit?: string;
  yMin?: number;
  yMax?: number;
};

type ColumnChartProps = Omit<Props, 'xUnit' | 'yUnit'> & {
  legendEnabled?: boolean;
  groupPadding?: number;
  pointPadding?: number;
  reversedStacks?: boolean;
  stacking?: 'normal' | 'percent';
  tooltipFormatter: (this: Highcharts.TooltipFormatterContextObject) => string;
  tooltipShared?: boolean;
  xLabelFontSize?: string;
  zoomType?: 'x' | 'y' | 'xy';
};

function ColumnChart({
  caption,
  categories,
  exportFilename,
  groupPadding = 0.2,
  pointPadding = 0.1,
  height,
  legendEnabled = false,
  legendTitle,
  reversedStacks,
  series,
  stacking,
  subtitle,
  title,
  tooltipFormatter,
  tooltipShared = false,
  xLabelFontSize = baseFontSize,
  xTitle,
  yTitle,
  yMin = 0,
  yMax,
  zoomType,
}: ColumnChartProps) {
  const options = useMemo<Highcharts.Options>(() => {
    return {
      caption: {
        text: caption,
        useHTML: true,
      },
      chart: {
        backgroundColor: 'rgba(0, 0, 0, 0)',
        height: height ?? '500px',
        style: { fontFamily: fonts.primary },
        type: 'column',
        zoomType,
      },
      credits: { enabled: false },
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
        filename: exportFilename,
      },
      legend: {
        enabled: legendEnabled,
        itemMarginTop: 3,
        itemStyle: {
          fontSize: smallFontSize,
          fontWeight: 'normal',
        },
        labelFormatter: function () {
          if (this.options.custom?.description) {
            return `<b>${this.name}</b><br />${this.options.custom.description}`;
          } else return `<b>${this.name}</b>`;
        },
        maxHeight: 150,
        symbolHeight: 10,
        title: {
          style: {
            fontSize: baseFontSize,
          },
          text: legendTitle,
        },
        verticalAlign: 'bottom',
      },
      plotOptions: {
        column: {
          groupPadding,
          pointPadding,
          stacking,
        },
      },
      responsive: {
        rules: [
          {
            condition: {
              minWidth: 350, // Increase font sizes when width exceeds map popup width
            },
            chartOptions: {
              legend: {
                itemStyle: {
                  fontSize: baseFontSize,
                },
                title: {
                  style: {
                    fontSize: mediumFontSize,
                  },
                },
              },
              subtitle: {
                style: {
                  fontSize: mediumFontSize,
                },
              },
              tooltip: {
                style: {
                  fontSize: baseFontSize,
                },
              },
              xAxis: {
                labels: {
                  style: {
                    fontSize: xLabelFontSize,
                  },
                },
                title: {
                  style: {
                    fontFamily: fonts.tertiary,
                    fontSize: smallFontSize,
                  },
                },
              },
              yAxis: {
                labels: {
                  style: {
                    fontSize: baseFontSize,
                  },
                },
                title: {
                  style: {
                    fontFamily: fonts.tertiary,
                    fontSize: smallFontSize,
                  },
                },
              },
            },
          },
        ],
      },
      series,
      subtitle: {
        style: {
          fontSize: baseFontSize,
        },
        text: subtitle,
      },
      title: {
        text: title,
      },
      tooltip: {
        backgroundColor: 'rgba(247, 247, 247, 0.95)',
        borderColor: '#000000',
        formatter: tooltipFormatter,
        shared: tooltipShared,
        style: {
          fontSize: smallFontSize,
          fontWeight: 'bold',
        },
        useHTML: true,
      },
      xAxis: {
        categories,
        labels: {
          style: {
            fontSize: smallFontSize,
          },
        },
        title: {
          style: {
            fontSize: smallFontSize,
          },
          text: xTitle,
        },
      },
      yAxis: {
        labels: {
          style: {
            fontSize: smallFontSize,
          },
        },
        max: yMax,
        min: yMin,
        reversedStacks,
        title: {
          style: {
            fontSize: baseFontSize,
          },
          text: yTitle,
        },
      },
    };
  }, [
    caption,
    categories,
    exportFilename,
    groupPadding,
    height,
    legendEnabled,
    legendTitle,
    pointPadding,
    reversedStacks,
    series,
    stacking,
    subtitle,
    title,
    tooltipFormatter,
    tooltipShared,
    xLabelFontSize,
    xTitle,
    yMax,
    yMin,
    yTitle,
    zoomType,
  ]);

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

export function StackedColumnChart({
  xUnit,
  yUnit,
  ...props
}: Readonly<Props>) {
  const tooltipFormatter = useCallback(
    function (this: Highcharts.TooltipFormatterContextObject) {
      return (
        this.points?.reverse().reduce(
          (s, point) => {
            const customText = point.point.options.custom?.text;
            return (
              s +
              `<tr>
              <td style="color:${point.color};padding:0 5px 1px 0">
                ${point.series.name}:
              </td>
              <td style="text-align:right;padding:0">${
                yUnit ? point.y + ' ' + yUnit : point.y
              }</td>${
                customText
                  ? '<td style="padding: 0 5px">|</td><td style="text-align:right;padding:0">' +
                    customText
                  : ''
              }</td>
            </tr>`
            );
          },
          `${xUnit ? this.x + ' ' + xUnit : this.x}<table>`,
        ) + '</table><i style="font-weight:normal">(Click & drag to zoom)</i>'
      );
    },
    [xUnit, yUnit],
  );

  return (
    <ColumnChart
      {...props}
      legendEnabled
      reversedStacks={false}
      stacking="normal"
      tooltipFormatter={tooltipFormatter}
      tooltipShared={true}
      xLabelFontSize={mediumFontSize}
      yMax={100}
      zoomType="y"
    />
  );
}

export function Histogram({ xUnit, yUnit, ...props }: Readonly<Props>) {
  const tooltipFormatter = useCallback(
    function (this: Highcharts.TooltipFormatterContextObject) {
      const customText = this.point.options.custom?.text;
      return `<span style="color:${this.point.color}">${
        xUnit ? this.x + ' ' + xUnit : this.x
      }:</span> ${yUnit ? this.y + ' ' + yUnit : this.y}${
        customText ? ' | ' + customText : ''
      }
        <br />
        <i style="font-weight:normal">(Click & drag to zoom)</i>`;
    },
    [xUnit, yUnit],
  );

  return (
    <ColumnChart
      {...props}
      groupPadding={0}
      height="350px"
      pointPadding={0}
      tooltipFormatter={tooltipFormatter}
      zoomType="x"
    />
  );
}
