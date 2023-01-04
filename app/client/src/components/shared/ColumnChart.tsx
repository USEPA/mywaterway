import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import highchartsAccessibility from 'highcharts/modules/accessibility';
import highchartsExporting from 'highcharts/modules/exporting';
import { useMemo } from 'react';
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

function histogramTooltipFormatter(
  xUnit: string | undefined,
  yUnit: string | undefined,
) {
  return function (this: Highcharts.TooltipFormatterContextObject) {
    const customText = this.point.options.custom?.text;
    return `<b style="color:${this.point.color}">${
      xUnit ? this.x + ' ' + xUnit : this.x
    }:</b> <b>${yUnit ? this.y + ' ' + yUnit : this.y}${
      customText ? ' | ' + customText : ''
    }</b>
          <br />
          <i>(Click & drag to zoom)</i>`;
  };
}

function stackedTooltipFormatter(
  xUnit: string | undefined,
  yUnit: string | undefined,
) {
  return function (this: Highcharts.TooltipFormatterContextObject) {
    return (
      this.points?.reduce((s, point) => {
        const customText = point.point.options.custom?.text;
        return (
          s +
          `<tr>
          <td style="color:${point.color};padding-right:5px">
            <b>${point.series.name}:</b>
          </td>
          <td><b>${yUnit ? point.y + ' ' + yUnit : point.y}${
            customText ? ' | ' + customText : ''
          }</b></td>
        </tr>`
        );
      }, `<b>${xUnit ? this.x + ' ' + xUnit : this.x}</b><table>`) + '</table>'
    );
  };
}

const fontSize = '14px';

type Props = {
  caption?: string;
  categories: string[];
  height?: string;
  histogram?: boolean;
  legendTitle?: string;
  series: Array<{
    color?: string;
    custom?: {
      description?: string;
    };
    data:
      | number[]
      | Array<{
          custom?: {
            text: string;
          };
          y: number;
        }>;
    name: string;
    type: 'column';
  }>;
  subtitle?: string;
  title?: string;
  xTitle?: string;
  xUnit?: string;
  yTitle?: string;
  yUnit?: string;
  yMin?: number;
};

export default function StackedBarChart({
  caption,
  categories,
  height,
  histogram,
  legendTitle,
  series,
  subtitle,
  title,
  xTitle,
  xUnit,
  yTitle,
  yMin = 0,
  yUnit,
}: Props) {
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
        zoomType: histogram ? 'x' : undefined,
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
      },
      legend: {
        enabled: !histogram,
        itemStyle: { fontWeight: 'normal' },
        labelFormatter: function () {
          if (this.options.custom?.description) {
            return `<b>${this.name}</b><br />${this.options.custom.description}`;
          } else return this.name;
        },
        title: {
          text: legendTitle,
        },
        verticalAlign: 'bottom',
      },
      plotOptions: {
        column: {
          groupPadding: histogram ? 0 : 0.2,
          pointPadding: histogram ? 0 : 0.1,
          stacking: histogram ? undefined : 'normal',
        },
      },
      series,
      subtitle: {
        style: {
          fontSize,
        },
        text: subtitle,
      },
      title: {
        text: title,
      },
      tooltip: {
        backgroundColor: 'rgba(247, 247, 247, 0.95)',
        borderColor: '#000000',
        formatter: histogram
          ? histogramTooltipFormatter(xUnit, yUnit)
          : stackedTooltipFormatter(xUnit, yUnit),
        shared: !histogram,
        style: {
          fontSize,
        },
        useHTML: true,
      },
      xAxis: {
        categories,
        labels: {
          style: {
            fontSize,
          },
        },
        title: {
          style: {
            fontSize,
          },
          text: xTitle,
        },
      },
      yAxis: {
        min: yMin,
        title: {
          style: {
            fontSize,
          },
          text: yTitle,
        },
      },
    };
  }, [
    caption,
    categories,
    height,
    histogram,
    legendTitle,
    series,
    subtitle,
    title,
    xTitle,
    xUnit,
    yMin,
    yTitle,
    yUnit,
  ]);

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}
