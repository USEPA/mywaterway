import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import highchartsAccessibility from 'highcharts/modules/accessibility';
import highchartsExporting from 'highcharts/modules/exporting';
import { useCallback, useMemo } from 'react';
// styles
import { fonts } from 'styles/index.js';

// add exporting features to highcharts
highchartsExporting(Highcharts);

// add accessibility features to highcharts
highchartsAccessibility(Highcharts);

// Workaround for the Download SVG not working with the accessibility module.
Highcharts.addEvent(
  Highcharts.Chart.prototype,
  'afterA11yUpdate',
  function (e: Event | Highcharts.Dictionary<any> | undefined) {
    if (!e || !('accessibility' in e)) return;

    const a11y = e.accessibility;
    if ((this.renderer as any).forExport && a11y && a11y.proxyProvider) {
      a11y.proxyProvider.destroy();
    }
  },
);

const baseFontSize = '14px';
const mediumFontSize = '16px';

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
  showInLegend?: boolean;
  type: 'column';
  visible?: boolean;
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
          fontSize: baseFontSize,
          fontWeight: 'normal',
        },
        labelFormatter: function () {
          if (this.options.custom?.description) {
            return `<b>${this.name}</b><br />${this.options.custom.description}`;
          } else return this.name;
        },
        symbolHeight: 10,
        title: {
          style: {
            fontSize: mediumFontSize,
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
      series,
      subtitle: {
        style: {
          fontSize: mediumFontSize,
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
          fontSize: baseFontSize,
        },
        useHTML: true,
      },
      xAxis: {
        categories,
        labels: {
          style: {
            fontSize: xLabelFontSize,
          },
        },
        title: {
          style: {
            fontSize: baseFontSize,
          },
          text: xTitle,
        },
      },
      yAxis: {
        labels: {
          style: {
            fontSize: baseFontSize,
          },
        },
        max: yMax,
        min: yMin,
        reversedStacks,
        title: {
          style: {
            fontSize: mediumFontSize,
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

export function StackedColumnChart({ xUnit, yUnit, ...props }: Props) {
  const tooltipFormatter = useCallback(
    function (this: Highcharts.TooltipFormatterContextObject) {
      const chart = this.points?.[0].series.chart;
      if (!chart) return '';
      const categories = chart.xAxis[0].categories;
      const currentCategory = this.points?.[0].point.category;
      if (!currentCategory) return '';
      const index = categories.indexOf(currentCategory);
      if (index === -1) return '';
      return (
        chart.series.reverse().reduce((s, series) => {
          console.log(series);
          const point = (series.options as any).data[index];
          const customText = point.custom?.text;
          return (
            s +
            `<tr>
          <td style="color:${series.options.color};padding-right:5px">
            <b>${series.name}:</b>
          </td>
          <td><b>${yUnit ? point.y + ' ' + yUnit : point.y}</b></td>
          ${
            customText
              ? '<td style="padding:0 5px"><b>|</b></td><td><b>' +
                customText +
                '</b></td>'
              : ''
          }
        </tr>`
          );
        }, `<b>${xUnit ? this.x + ' ' + xUnit : this.x}</b><table>`) +
        '</table><i>(Click & drag to zoom)</i>'
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

export function Histogram({ xUnit, yUnit, ...props }: Props) {
  const tooltipFormatter = useCallback(
    function (this: Highcharts.TooltipFormatterContextObject) {
      const customText = this.point.options.custom?.text;
      return `<b style="color:${this.point.color}">${
        xUnit ? this.x + ' ' + xUnit : this.x
      }:</b> <b>${yUnit ? this.y + ' ' + yUnit : this.y}${
        customText ? ' | ' + customText : ''
      }</b>
          <br />
          <i>(Click & drag to zoom)</i>`;
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
