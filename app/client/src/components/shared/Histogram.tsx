import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import highchartsAccessibility from 'highcharts/modules/accessibility';
import highchartsExporting from 'highcharts/modules/exporting';
import highchartsOfflineExporting from 'highcharts/modules/offline-exporting';
import { useMemo } from 'react';
// styles
import { fonts } from 'styles/index.js';
// types
import type { Options } from 'highcharts';

// add accessibility features to highcharts
highchartsAccessibility(Highcharts);

// add exporting features to highcharts
highchartsExporting(Highcharts);
highchartsOfflineExporting(Highcharts);

const fontSize = '14px';

type Props = {
  categories: string[];
  height?: string;
  legendTitle?: string;
  series: Array<{
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
    zoneAxis?: 'x' | 'y';
    zones?: Array<{
      color: string;
      value?: number;
    }>;
  }>;
  subtitle?: string;
  title?: string;
  xTitle?: string;
  yTitle?: string;
  xUnit?: string;
  yMin?: number;
  yUnit?: string;
};

export default function Histogram({
  categories,
  height,
  series,
  subtitle,
  title,
  xTitle,
  xUnit,
  yTitle,
  yUnit,
  yMin = 0,
}: Props) {
  const options = useMemo<Options>(() => {
    return {
      chart: {
        backgroundColor: 'rgba(0, 0, 0, 0)',
        height: height ?? '500px',
        style: { fontFamily: fonts.primary },
        type: 'histogram',
        zoomType: 'x',
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
      },
      legend: {
        enabled: false,
      },
      plotOptions: {
        column: {
          groupPadding: 0,
          pointPadding: 0,
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
        formatter: function () {
          const customText = this.point.options.custom?.text;
          return `<b style="color:${this.point.color}">${
            xUnit ? this.x + ' ' + xUnit : this.x
          }:</b> <b>${yUnit ? this.y + ' ' + yUnit : this.y}${
            customText ? ' | ' + customText : null
          }</b>`;
        },
        style: {
          fontSize,
        },
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
    categories,
    height,
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
