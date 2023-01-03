import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import highchartsAccessibility from 'highcharts/modules/accessibility';
import highchartsExporting from 'highcharts/modules/exporting';
import { useMemo, useRef } from 'react';
// styles
import { fonts } from 'styles/index.js';
// types
import type { Options } from 'highcharts';

// add exporting features to highcharts
highchartsExporting(Highcharts);

// add accessibility features to highcharts
highchartsAccessibility(Highcharts);

type Props = {
  caption?: string;
  categories: string[];
  height?: string;
  legendTitle?: string;
  series: Array<{
    color?: string;
    custom?: {
      description?: string;
    };
    data: number[];
    name: string;
    type: 'column';
  }>;
  subtitle?: string;
  title?: string;
  xTitle?: string | null;
  yTitle?: string | null;
  yMin?: number;
};

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

export default function StackedBarChart({
  caption,
  categories,
  height,
  legendTitle,
  series,
  subtitle,
  title,
  xTitle = null,
  yTitle = null,
  yMin = 0,
}: Props) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  const options = useMemo<Options>(() => {
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
        labelFormatter: function () {
          if (this.options.custom?.description) {
            return `${this.name}<br /><span style="fontWeight:normal">${this.options.custom.description}</span>`;
          } else return this.name;
        },
        title: {
          text: legendTitle,
        },
        verticalAlign: 'bottom',
      },
      plotOptions: {
        column: {
          stacking: 'normal',
        },
      },
      series,
      subtitle: {
        text: subtitle,
      },
      title: {
        text: title,
      },
      tooltip: {
        borderColor: '#000000',
        formatter: function () {
          return (
            this.points?.reduce((s: any, point: any) => {
              return (
                s +
                `<tr>
                <td style="color:${point.series.color};fontWeight:bold">
                  ${point.series.name}: 
                </td>
                <td>${point.y?.toLocaleString()}</td>
              </tr>`
              );
            }, `<b>${this.x}</b><table>`) + '</table>'
          );
        },
        shared: true,
        useHTML: true,
      },
      xAxis: {
        categories,
        title: {
          text: xTitle,
        },
      },
      yAxis: {
        min: yMin,
        title: {
          text: yTitle,
        },
      },
    };
  }, [
    caption,
    categories,
    height,
    legendTitle,
    series,
    subtitle,
    title,
    xTitle,
    yMin,
    yTitle,
  ]);

  return (
    <HighchartsReact highcharts={Highcharts} options={options} ref={chartRef} />
  );
}
