/** @jsxImportSource @emotion/react */

import { AreaSeries, XYChart, Tooltip } from '@visx/xychart';
import { curveMonotoneX } from '@visx/curve';
import { Global, css } from '@emotion/react';
import type { TooltipData } from '@visx/xychart';

type Observation = {
  date: Date;
  measurement: number;
};

// NOTE: EPA's _reboot.css file causes the tooltip series glyph to be clipped
const globalStyles = css`
  .visx-tooltip-glyph svg {
    overflow: visible;
    width: 10px;
    height: 10px;
  }
`;

const tooltipStyles = css`
  margin: 0;
  padding: 0;

  span {
    font-size: 87.5%;
    font-weight: normal;
    font-style: italic;
  }
`;

const accessors = {
  xAccessor: (d: Observation) =>
    d.date.toLocaleDateString('en-US', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
    }),
  yAccessor: (d: Observation) => d.measurement,
};

export function Sparkline({ data }: { data: Observation[] }) {
  const color = '#ffc107';
  const values = data.map((d) => d.measurement);
  return (
    <>
      <Global styles={globalStyles} />
      <XYChart
        margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
        height={32}
        width={120}
        xScale={{ type: 'band', paddingInner: 0.875 }}
        yScale={{
          type: 'linear',
          domain: [Math.min(...values), Math.max(...values)],
          zero: false,
        }}
      >
        <AreaSeries
          data={data}
          dataKey="area"
          curve={curveMonotoneX}
          lineProps={{ stroke: color }}
          fill={color}
          fillOpacity={0.25}
          {...accessors}
        />
        <Tooltip
          snapTooltipToDatumX
          snapTooltipToDatumY
          showSeriesGlyphs
          glyphStyle={{ fill: color }}
          renderTooltip={({ tooltipData }) => {
            const datum = (tooltipData as TooltipData<Observation>)
              ?.nearestDatum?.datum;
            if (!datum) return null;
            return (
              <p css={tooltipStyles}>
                <span>{accessors.xAccessor(datum)}:&nbsp;</span>
                <strong>{accessors.yAccessor(datum)}</strong>
              </p>
            );
          }}
        />
      </XYChart>
    </>
  );
}
