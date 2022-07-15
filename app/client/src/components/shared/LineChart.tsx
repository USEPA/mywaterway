import { useEffect, useLayoutEffect, useState } from 'react';
import { createGlobalStyle } from 'styled-components/macro';
import {
  Axis,
  buildChartTheme,
  LineSeries,
  Tooltip,
  XYChart,
} from '@visx/xychart';
// types
import type { ReactChildren, ReactChild } from 'react';
import type { XYChartTheme } from '@visx/xychart';

// NOTE: EPA's _reboot.css file causes the tooltip series glyph to be clipped
const VisxStyles = createGlobalStyle`
  .visx-tooltip-glyph svg {
    overflow: visible;
    width: 10px;
    height: 10px;
  }
`;

interface Datum {
  key: string;
  x: string;
  y: number;
}

const customTheme = buildChartTheme({
  backgroundColor: '#526571',
  colors: ['#2C2E43'],
  gridColor: '#30475e',
  gridColorDark: '#222831',
  svgLabelSmall: { fill: '#30475e' },
  svgLabelBig: { fill: '#ffffff' },
  tickLength: 4,
});

interface Props {
  children: ReactChild | ReactChildren;
  color?: string;
  containerRef?: HTMLElement | null;
  data: Datum[];
  dataKey: string;
  domain?: number[];
  range?: number[];
  xAccessor?: (d: Datum) => string;
  yAccessor?: (d: Datum) => number;
}

function LineChart({
  data,
  dataKey,
  range,
  color,
  containerRef,
  xAccessor = (d: Datum) => d.x,
  yAccessor = (d: Datum) => d.y,
}: Props) {
  const [theme, setTheme] = useState<XYChartTheme>(customTheme);
  useEffect(() => {
    if (color) {
      const updatedTheme = {
        ...customTheme,
        colors: [color],
      };
      setTheme(updatedTheme);
    }
  }, [color]);

  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (containerRef !== null) {
      const newWidth = containerRef?.getBoundingClientRect().width;
      setWidth(newWidth ?? null);
    }
  }, [containerRef]);

  return (
    <>
      <VisxStyles />
      <XYChart
        height={400}
        margin={{ top: 20, bottom: 20, left: 50, right: 25 }}
        theme={theme}
        xScale={{ type: 'band' }}
        yScale={{ type: 'linear', domain: range, zero: false }}
      >
        <Axis
          numTicks={width ? Math.floor(width / 100) : 4}
          orientation="bottom"
        />
        <Axis orientation="left" />
        <LineSeries
          data={data}
          dataKey={dataKey}
          xAccessor={xAccessor}
          yAccessor={yAccessor}
        />
        <Tooltip<Datum>
          showDatumGlyph
          showVerticalCrosshair
          snapTooltipToDatumX
          renderTooltip={({ tooltipData }) => (
            <>
              {tooltipData?.nearestDatum &&
                xAccessor(tooltipData.nearestDatum.datum)}
              :{' '}
              {tooltipData?.nearestDatum &&
                yAccessor(tooltipData.nearestDatum.datum)}
            </>
          )}
        />
      </XYChart>
    </>
  );
}

export default LineChart;
