import { Fragment, useLayoutEffect, useState } from 'react';
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
import type { ReactNode } from 'react';
import type { GlyphProps, TooltipData } from '@visx/xychart';

const DEFAULT_COLOR = '#2C2E43';

/*
## Styles
*/

const legendContainerStyles = css`
  display: flex;
  flex-direction: row;
  gap: 0.5em;
`;

const legendStyles = css`
  align-items: center;
  display: flex;
  flex-direction: row;
`;

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
  type: 'point' | 'line';
  x: string;
  y: number;
  [meta: string]: string | number;
}

/*
## Helpers
*/

function defaultBuildTooltip(tooltipData?: TooltipData<Datum>) {
  if (!tooltipData?.nearestDatum) return null;
  return (
    <>
      {xAccessor(tooltipData.nearestDatum.datum)}:{' '}
      {yAccessor(tooltipData.nearestDatum.datum)}
    </>
  );
}

const theme = buildChartTheme({
  backgroundColor: '#526571',
  colors: [DEFAULT_COLOR],
  gridColor: '#30475e',
  gridColorDark: '#222831',
  svgLabelSmall: { fill: '#30475e' },
  svgLabelBig: { fill: '#ffffff' },
  tickLength: 8,
});

const xAccessor = (d: Datum) => d.x;
const yAccessor = (d: Datum) => d.y;

type VisxGraphProps = {
  buildTooltip?: (tooltipData?: TooltipData<Datum>) => ReactNode;
  containerRef?: HTMLElement | null;
  height?: number;
  lineColorAccessor?: () => string;
  lineData?: Datum[];
  lineVisible?: boolean;
  pointColorAccessor?: (d: Datum, index: number) => string;
  pointData?: { [key: string]: Datum[] };
  pointsVisible?: boolean;
  range?: number[];
  xTitle?: string;
  yScale?: 'log' | 'linear';
  yTickFormat?: (val: number) => string;
  yTitle?: string;
};

/*
## Components
*/

export default VisxGraph;
export function VisxGraph({
  buildTooltip,
  containerRef,
  height = 500,
  lineColorAccessor,
  lineData = [],
  lineVisible = true,
  pointColorAccessor,
  pointData = {},
  pointsVisible = true,
  range,
  xTitle,
  yScale = 'linear',
  yTickFormat = (val: number) => val.toLocaleString(),
  yTitle,
}: VisxGraphProps) {
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

    let fill = color;
    if (datum.type === 'point' && pointColorAccessor)
      fill = pointColorAccessor(datum, index);
    if (datum.type === 'line' && lineColorAccessor) fill = lineColorAccessor();

    return (
      <GlyphDot
        left={x}
        top={y}
        stroke={theme.gridStyles.stroke}
        fill={fill}
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
        margin={{ top: 20, bottom: 45, left: 100, right: 30 }}
        theme={theme}
        xScale={{ type: 'band', paddingInner: 1, paddingOuter: 0.5 }}
        yScale={{
          type: yScale,
          domain: range,
        }}
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
            dx: -45,
            lineHeight: '1.2em',
            style: { fontWeight: 'bold' },
            scaleToFit: false,
            textAnchor: 'middle',
            width: height,
          }}
          orientation="left"
          strokeWidth={2}
          tickFormat={yTickFormat}
        />
        {lineVisible && (
          <LineSeries
            colorAccessor={lineColorAccessor}
            data={lineData}
            dataKey="line"
            xAccessor={xAccessor}
            yAccessor={yAccessor}
          />
        )}
        {pointsVisible &&
          Object.entries(pointData).map(([dataKey, data]) => (
            <GlyphSeries
              colorAccessor={pointColorAccessor}
              data={data}
              dataKey={dataKey}
              key={dataKey}
              xAccessor={xAccessor}
              yAccessor={yAccessor}
            />
          ))}
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

interface GradientLegendProps {
  colors: string[];
  keys: number[];
  title: string;
}

export function GradientLegend({ colors, keys, title }: GradientLegendProps) {
  const colorScale = scaleLinear<string>({
    domain: keys,
    range: colors,
  });

  const legendGlyphSize = 15;

  if (!Math.max(keys.length, colors.length)) return null;

  return (
    <div css={legendContainerStyles}>
      <LegendLabel flex="0 0 auto" margin="auto 0.5em auto 0">
        <strong>{title}</strong>
      </LegendLabel>
      {keys.length > 0 && (
        <LegendLabel flex={0} margin="auto 0">
          {keys[0].toString()}
        </LegendLabel>
      )}
      <div css={legendStyles}>
        {Math.max(keys.length, colors.length) === 1 ? (
          <svg width={legendGlyphSize} height={legendGlyphSize}>
            <rect
              width={legendGlyphSize}
              height={legendGlyphSize}
              fill={colors[0]}
              stroke={colors[0]}
            />
          </svg>
        ) : (
          <LegendLinear
            scale={colorScale as ReturnType<typeof scaleLinear>}
            steps={20}
          >
            {(labels) =>
              labels.map((label) => (
                <Fragment key={label.text}>
                  <LegendItem>
                    <svg width={5} height={legendGlyphSize}>
                      <rect
                        width={5}
                        height={legendGlyphSize}
                        fill={label.value as string}
                        stroke={label.value as string}
                      />
                    </svg>
                  </LegendItem>
                </Fragment>
              ))
            }
          </LegendLinear>
        )}
      </div>
      {keys.length > 1 && (
        <LegendLabel flex={0} margin="auto 0">
          {keys[keys.length - 1].toString()}
        </LegendLabel>
      )}
    </div>
  );
}
