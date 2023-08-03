import { Fragment, useEffect, useLayoutEffect, useState } from 'react';
import { createGlobalStyle, css } from 'styled-components/macro';
import { GlyphDot } from '@visx/glyph';
import { LegendLabel, LegendLinear, LegendItem } from '@visx/legend';
import { scaleLinear } from '@visx/scale';
import {
  Axis,
  buildChartTheme,
  GlyphSeries,
  LineSeries,
  Tooltip,
  XYChart,
} from '@visx/xychart';
// types
import type { ReactChildren, ReactChild, ReactNode } from 'react';
import type { FlattenSimpleInterpolation } from 'styled-components';
import type { GlyphProps, TooltipData, XYChartTheme } from '@visx/xychart';

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
type ChartType = 'line' | 'scatter';
type Datum = LineDatum | ScatterDatum;

interface LineDatum {
  type: 'line';
  x: string;
  y: {
    [dataKey: string]: {
      value: number;
      [meta: string]: string | number;
    };
  };
}

interface ScatterDatum {
  type: 'scatter';
  x: string;
  y: number;
  [meta: string]: string | number;
}

/*
## Helpers
*/

function defaultBuildTooltip(tooltipData?: TooltipData<Datum>) {
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
}

const DEFAULT_COLOR = '#2C2E43';

function getYAccessor(dataKey: string) {
  return (datum: Datum) => {
    if (datum.type === 'scatter') return datum.y;
    return datum.y[dataKey]?.value;
  };
}

const customTheme = buildChartTheme({
  backgroundColor: '#526571',
  colors: [DEFAULT_COLOR],
  gridColor: '#30475e',
  gridColorDark: '#222831',
  svgLabelSmall: { fill: '#30475e' },
  svgLabelBig: { fill: '#ffffff' },
  tickLength: 8,
});

const xAccessor = (d: Datum) => d.x;

type Props = {
  buildTooltip?: (tooltipData?: TooltipData<Datum>) => ReactNode;
  chartType?: ChartType;
  children: ReactChild | ReactChildren;
  colorAccessor?: (d: Datum, index: number) => string;
  colors?: string[];
  containerRef?: HTMLElement | null;
  data: Datum[];
  dataKeys: string[];
  height?: number;
  range?: number[];
  xTitle?: string;
  yScale?: 'log' | 'linear';
  yTitle?: string;
};

export function VisxGraph({
  buildTooltip,
  chartType = 'scatter',
  colorAccessor,
  colors,
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
    if (colors) {
      setTheme({
        ...customTheme,
        colors,
      });
    }
  }, [colors]);

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

  const renderTooltipGlyph = ({
    color,
    x,
    y,
    size,
    datum,
    index,
    onPointerMove,
    onPointerOut,
    onPointerUp,
  }: GlyphProps<Datum>) => {
    const handlers = { onPointerMove, onPointerOut, onPointerUp };
    return (
      <GlyphDot
        left={x}
        top={y}
        stroke={theme.gridStyles.stroke}
        fill={colorAccessor ? colorAccessor(datum, index) : color}
        r={size}
        {...handlers}
      />
    );
  };

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
          tickFormat={(val) => (val <= Number.EPSILON ? '0' : val)}
        />
        {chartType === 'line' ? (
          dataKeys.map((dataKey) => (
            <LineSeries
              key={dataKey}
              data={data}
              dataKey={dataKey}
              xAccessor={xAccessor}
              yAccessor={getYAccessor(dataKey)}
            />
          ))
        ) : (
          <GlyphSeries
            colorAccessor={colorAccessor}
            data={data}
            dataKey="scatter"
            xAccessor={xAccessor}
            yAccessor={getYAccessor('scatter')}
          />
        )}
        <Tooltip<Datum>
          showDatumGlyph
          showVerticalCrosshair
          snapTooltipToDatumX
          renderGlyph={renderTooltipGlyph}
          renderTooltip={({ tooltipData }) => renderTooltip(tooltipData)}
        />
      </XYChart>
    </>
  );
}

const legendContainerStyles = (
  align: string,
  additionalStyles?: FlattenSimpleInterpolation,
) => css`
  ${additionalStyles}
  display: flex;
  flex-direction: row;
  gap: 0.5em;
  justify-content: ${align === 'left' ? 'flex-start' : 'flex-end'};
`;

const legendStyles = css`
  display: flex;
  flex-direction: row;
`;

interface GradientLegendProps {
  align: 'left' | 'right';
  colors: string[];
  styles?: FlattenSimpleInterpolation;
  keys: number[];
  title: string;
}

export function GradientLegend({
  align = 'left',
  colors,
  styles,
  keys,
  title,
}: GradientLegendProps) {
  const colorScale = scaleLinear<string>({
    domain: keys,
    range: colors,
  });

  const legendGlyphSize = 15;

  return (
    <div css={legendContainerStyles(align, styles)}>
      {align === 'left' && (
        <LegendLabel flex={0} margin="auto 0.5em auto 0">
          <strong>{title}</strong>
        </LegendLabel>
      )}
      <LegendLabel flex={0} margin="auto 0">
        {keys[0].toString()}
      </LegendLabel>
      <div css={legendStyles}>
        <LegendLinear scale={colorScale} steps={20}>
          {(labels) =>
            labels.map((label) => (
              <Fragment key={label.text}>
                <LegendItem>
                  <svg width={5} height={legendGlyphSize}>
                    <rect
                      width={5}
                      height={legendGlyphSize}
                      fill={label.value}
                      stroke={label.value}
                    />
                  </svg>
                </LegendItem>
              </Fragment>
            ))
          }
        </LegendLinear>
      </div>
      <LegendLabel flex={0} margin="auto 0">
        {keys[keys.length - 1].toString()}
      </LegendLabel>
      {align === 'right' && (
        <LegendLabel flex={0} margin="auto 0 auto 0.5em">
          <strong>{title}</strong>
        </LegendLabel>
      )}
    </div>
  );
}

export default VisxGraph;
