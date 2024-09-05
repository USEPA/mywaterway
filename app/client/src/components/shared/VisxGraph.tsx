/** @jsxImportSource @emotion/react */

import { Fragment, useLayoutEffect, useState } from 'react';
import { css, Global } from '@emotion/react';
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
import { fonts } from 'styles';
// types
import type { ReactNode } from 'react';
import type { GlyphProps, TooltipData } from '@visx/xychart';

const DEFAULT_COLOR = '#2C2E43';

/*
## Styles
*/

const axisTitleStyles = {
  fontFamily: fonts.tertiary,
  fontSize: '0.85rem',
  fontWeight: 'bold',
};

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
const glyphStyles = css`
  .visx-tooltip-glyph svg {
    overflow: visible;
    width: 10px;
    height: 10px;
  }
`;

const tickLabelStyles = {
  fontFamily: fonts.primary,
  fontWeight: 400,
  fontSize: '0.75rem',
};

/*
## Types
*/

interface Datum {
  type: 'point' | 'line';
  x: number;
  y: number;
  [meta: string]: unknown;
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

const xAccessor = (d: Datum) => d?.x;
const yAccessor = (d: Datum) => d?.y;

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
  xTickFormat?: (val: number) => string;
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
  xTickFormat = (val: string | number) => val.toLocaleString(),
  xTitle,
  yScale = 'linear',
  yTickFormat = (val: number) => val.toLocaleString(),
  yTitle,
}: Readonly<VisxGraphProps>) {
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
      <Global styles={glyphStyles} />
      <XYChart
        height={height}
        margin={{ top: 20, bottom: 55, left: 100, right: 50 }}
        theme={theme}
        xScale={{
          type: 'linear',
          paddingInner: 1,
          paddingOuter: 0.5,
          zero: false,
        }}
        yScale={{
          type: yScale,
        }}
      >
        <Axis
          label={xTitle}
          labelProps={{
            dy: 15,
            fill: '#2C2E43',
            verticalAnchor: 'start',
            ...axisTitleStyles,
          }}
          numTicks={width ? Math.floor(width / 120) : 4}
          orientation="bottom"
          strokeWidth={2}
          tickFormat={xTickFormat}
          tickLabelProps={{
            angle: 15,
            dx: -5,
            textAnchor: 'start',
            y: 15,
            ...tickLabelStyles,
          }}
          tickLength={3}
        />
        <Axis
          label={yTitle}
          labelProps={{
            fill: '#2C2E43',
            dx: -45,
            lineHeight: '1.2em',
            scaleToFit: false,
            textAnchor: 'middle',
            width: height,
            ...axisTitleStyles,
          }}
          orientation="left"
          strokeWidth={2}
          tickFormat={yTickFormat}
          tickLabelProps={tickLabelStyles}
          tickLength={5}
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

export function GradientLegend({
  colors,
  keys,
  title,
}: Readonly<GradientLegendProps>) {
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
          <LegendLinear scale={colorScale} steps={20}>
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
