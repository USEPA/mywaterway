import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import highchartsAccessibility from 'highcharts/modules/accessibility';
import highchartsExporting from 'highcharts/modules/exporting';
import highchartsHistogram from 'highcharts/modules/histogram-bellcurve';
import { useMemo, useRef } from 'react';
// styles
import { fonts } from 'styles/index.js';
// types
import type { Options } from 'highcharts';

// add histogram module to highcharts
highchartsHistogram(Highcharts);

// add exporting features to highcharts
highchartsExporting(Highcharts);

// add accessibility features to highcharts
highchartsAccessibility(Highcharts);

type Props = {
  categories: string[];
  height?: string;
  legendTitle?: string;
  series: Array<{
    custom?: {
      description?: string;
    };
    data: number[];
    name: string;
    type: 'histogram';
    zoneAxis?: 'x' | 'y';
    zones?: Array<{
      color: string;
      value?: number;
    }>;
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

export default function Histogram({
  categories,
  height,
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
      chart: {
        backgroundColor: 'rgba(0, 0, 0, 0)',
        height: height ?? '300px',
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
      series: series as any, // workaround for an issue with the histogram type only accepting undefined for series
      subtitle: {
        text: subtitle,
      },
      title: {
        text: title,
      },
      tooltip: {
        borderColor: '#000000',
        formatter: function () {
          return `<b>${this.x} cells/mL:</b> ${this.y}`;
        },
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
  }, [categories, height, series, subtitle, title, xTitle, yMin, yTitle]);

  return (
    <HighchartsReact highcharts={Highcharts} options={options} ref={chartRef} />
  );
}
