import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import highchartsAccessibility from 'highcharts/modules/accessibility';
import highchartsExporting from 'highcharts/modules/exporting';
import highchartsHistogram from 'highcharts/modules/histogram-bellcurve';
import highchartsOfflineExporting from 'highcharts/modules/offline-exporting';
import { useMemo, useRef } from 'react';
// styles
import { fonts } from 'styles/index.js';
// types
import type { Options } from 'highcharts';

// add accessibility features to highcharts
highchartsAccessibility(Highcharts);

// add exporting features to highcharts
highchartsExporting(Highcharts);
highchartsOfflineExporting(Highcharts);

// add histogram module to highcharts
highchartsHistogram(Highcharts);

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
        zooming: {
          type: 'x',
        },
      },
      credits: { enabled: false },
      exporting: {
        buttons: {
          contextButton: {
            menuItems: ['printChart'],
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
        menuItemDefinitions: {
          printChart: {
            onclick: function () {
              const divToPrint = chartRef.current?.container.current;
              if (!divToPrint) return;

              const newWin = window.open();
              if (!newWin) return;

              newWin.document.write(divToPrint.innerHTML);
              newWin.document.close();
              newWin.focus();
              newWin.print();
              newWin.close();
            },
          },
        },
      },
      legend: {
        enabled: false,
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
