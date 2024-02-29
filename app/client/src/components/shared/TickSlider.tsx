/** @jsxImportSource @emotion/react */

import { useRanger } from 'react-ranger';
import { css } from '@emotion/react';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';

const handleStyles = {
  backgroundColor: '#fff',
  border: '2px solid #0b89f4',
  borderRadius: '100%',
  cursor: 'grab',
  height: '0.9em',
  opacity: '0.8',
  width: '0.9em',
};

const handleStylesActive = {
  ...handleStyles,
  boxShadow: '0 0 0 5px #96dbfa',
  cursor: 'grabbing',
};

const handleStylesLoading = css`
  height: 1em;
  width: 1em;
`;

const sliderContainerStyles = css`
  align-items: flex-end;
  display: flex;
  gap: 1em;
  height: 3.5em;
  justify-content: center;
  margin: 0 auto;
  padding-bottom: 2em;
  width: 100%;
`;

const sliderStyles = css`
  align-items: flex-end;
  display: inline-flex;
  width: 100%;
  z-index: 0;
`;

const tickLabelStyles = css`
  position: absolute;
  font-size: 1em;
  color: rgba(0, 0, 0, 0.5);
  top: 100%;
  transform: translate(-50%, 1.2rem);
  white-space: nowrap;
`;

const tickStyles = css`
  :before {
    content: '';
    position: absolute;
    left: 0;
    background: rgba(0, 0, 0, 0.2);
    height: 5px;
    width: 2px;
    transform: translate(-50%, 0.7rem);
  }
`;

type CyanSliderProps = {
  getTickLabel?: (value: number) => string;
  loading?: boolean;
  onChange: (value: number) => void;
  steps: number[];
  stepSize?: number;
  value: number | null;
};

export default function TickSlider({
  getTickLabel = (value) => value.toString(),
  loading = false,
  onChange,
  steps,
  stepSize = 1,
  value,
}: Readonly<CyanSliderProps>) {
  const { getTrackProps, handles, segments, ticks } = useRanger({
    min: steps[0],
    max: steps[steps.length - 1],
    onChange: (values: number[]) => onChange(values.pop() ?? 0),
    steps,
    stepSize,
    values: value ? [value] : [],
  });

  return (
    <div css={sliderContainerStyles}>
      <div css={sliderStyles}>
        <div
          {...getTrackProps({
            style: {
              display: 'inline-block',
              height: '0.25em',
              width: '100%',
              margin: '0.5em 0',
            },
          })}
        >
          {segments.map(({ getSegmentProps }, i) => (
            <div
              {...getSegmentProps({
                key: i,
                style: {
                  backgroundColor: '#e9e9e9',
                  borderRadius: '6px',
                  height: '100%',
                },
              })}
            />
          ))}
          {ticks.map(({ value, getTickProps }, i) => {
            return (
              <div css={tickStyles} {...getTickProps({ key: i })}>
                <div css={tickLabelStyles}>{getTickLabel(value)}</div>
              </div>
            );
          })}
          {handles.map(({ active, getHandleProps }) => {
            return loading ? (
              <div {...getHandleProps()}>
                <LoadingSpinner css={handleStylesLoading} />
              </div>
            ) : (
              <div
                {...getHandleProps({
                  style: active ? handleStylesActive : handleStyles,
                })}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
