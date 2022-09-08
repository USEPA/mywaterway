import { useEffect, useLayoutEffect, useState } from 'react';
import { createGlobalStyle } from 'styled-components/macro';
import {
  Axis,
  buildChartTheme,
  GlyphSeries,
  Tooltip,
  XYChart,
} from '@visx/xychart';
// types
import type { ReactChildren, ReactChild, ReactNode } from 'react';
import type { TooltipData, XYChartTheme } from '@visx/xychart';

/*
## Styles
*/
// NOTE: EPA's _reboot.css file causes the tooltip series glyph to be clipped
const VisxStyles = createGlobalStyle`
  .visx-tooltip-glyph svg {
    overflow: visible;
    width: 10px;
    height: 10px;
  }
`;

/*
## Types
*/
interface Datum {
  x: string;
  y: {
    [dataKey: string]: {
      value: number;
      [meta: string]: string | number;
    };
  };
}

/*
## Helpers
*/
const defaultBuildTooltip = (tooltipData?: TooltipData<Datum>) => {
  if (!tooltipData?.nearestDatum) return null;
  const dataKey = tooltipData.nearestDatum.key;
  const datum = tooltipData.nearestDatum.datum;
  const yAccessor = getYAccessor(dataKey);
  return (
    <>
      {tooltipData?.nearestDatum && xAccessor(tooltipData.nearestDatum.datum)}:{' '}
      {tooltipData?.nearestDatum && yAccessor(datum)}
    </>
  );
};

const getYAccessor = (dataKey: string) => {
  return (datum: Datum) => datum.y[dataKey]?.value;
};

const customTheme = buildChartTheme({
  backgroundColor: '#526571',
  colors: ['#2C2E43'],
  gridColor: '#30475e',
  gridColorDark: '#222831',
  svgLabelSmall: { fill: '#30475e' },
  svgLabelBig: { fill: '#ffffff' },
  tickLength: 8,
});

const xAccessor = (d: Datum) => d.x;

type Props = {
  buildTooltip?: (tooltipData?: TooltipData<Datum>) => ReactNode;
  children: ReactChild | ReactChildren;
  color?: string;
  containerRef?: HTMLElement | null;
  data: Datum[];
  dataKeys: string[];
  height?: number;
  range?: number[];
  xTitle?: string;
  yScale?: 'log' | 'linear';
  yTitle?: string;
};

function ScatterPlot({
  buildTooltip,
  color,
  containerRef,
  data,
  dataKeys,
  height = 500,
  range,
  xTitle,
  yScale = 'linear',
  yTitle,
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
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentBoxSize) {
          const contentBoxSize = Array.isArray(entry.contentBoxSize)
            ? entry.contentBoxSize[0]
            : entry.contentBoxSize;
          setWidth(contentBoxSize.inlineSize);
          break;
        }
      }
    });
    if (containerRef) {
      const elementStyle = window.getComputedStyle(containerRef, null);
      const contentWidth =
        containerRef?.getBoundingClientRect().width -
        parseFloat(elementStyle.getPropertyValue('padding-left')) -
        parseFloat(elementStyle.getPropertyValue('padding-right')) -
        parseFloat(elementStyle.getPropertyValue('border-left-width')) -
        parseFloat(elementStyle.getPropertyValue('border-right-width'));
      setWidth(contentWidth ?? null);
      resizeObserver.observe(containerRef);
    }

    return function cleanup() {
      if (containerRef) resizeObserver.unobserve(containerRef);
    };
  }, [containerRef]);

  const renderTooltip = buildTooltip ?? defaultBuildTooltip;

  return (
    <>
      <VisxStyles />
      <XYChart
        height={height}
        margin={{ top: 20, bottom: 45, left: 85, right: 30 }}
        theme={theme}
        xScale={{ type: 'band', paddingInner: 1, paddingOuter: 0.5 }}
        yScale={{ type: yScale, domain: range }}
      >
        <Axis
          label={xTitle}
          labelProps={{
            fill: '#2C2E43',
            style: { fontWeight: 'bold' },
            verticalAnchor: 'start',
          }}
          numTicks={width ? Math.floor(width / 120) : 4}
          orientation="bottom"
          strokeWidth={2}
        />
        <Axis
          label={yTitle}
          labelProps={{
            fill: '#2C2E43',
            dx: -30,
            lineHeight: '1.2em',
            style: { fontWeight: 'bold' },
            scaleToFit: false,
            textAnchor: 'middle',
            width: height,
          }}
          orientation="left"
          strokeWidth={2}
        />
        {dataKeys.map((dataKey) => {
          return (
            <GlyphSeries
              key={dataKey}
              data={data}
              dataKey={dataKey}
              xAccessor={xAccessor}
              yAccessor={getYAccessor(dataKey)}
            />
          );
        })}
        <Tooltip<Datum>
          showDatumGlyph
          showVerticalCrosshair
          snapTooltipToDatumX
          renderTooltip={({ tooltipData }) => renderTooltip(tooltipData)}
        />
      </XYChart>
    </>
  );
}

export default ScatterPlot;
