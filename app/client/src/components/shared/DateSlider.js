import { useState } from 'react';
import { css } from 'styled-components/macro';
import { useRanger } from 'react-ranger';

/*
 ** Styles
 */
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

const segmentStyles = {
  backgroundColor: '#e9e9e9',
  borderRadius: '6px',
  height: '100%',
};

const segmentStylesActive = {
  ...segmentStyles,
  backgroundColor: '#0b89f4',
};

const sliderContainerStyles = css`
  align-items: flex-end;
  display: flex;
  gap: 1em;
  justify-content: center;
  width: 100%;
`;

const sliderStyles = css`
  align-items: end;
  display: inline-flex;
  height: 3.5em;
  width: 60%;
  z-index: 0;
`;

const tooltipStyles = css`
  background-color: #d5e6ee;
  border-radius: 10%;
  color: #444;
  font-size: 0.8em;
  min-height: auto;
  padding: 0.3em;
  position: absolute;
  transform: translate(-0.85em, -2.65em);
`;

const trackStyles = {
  display: 'inline-block',
  height: '0.25em',
  width: '100%',
  margin: '0.5em 0',
};

function DateSlider({ bounds, disabled, onChange }) {
  const [range, setRange] = useState(bounds);
  const { getTrackProps, segments, handles } = useRanger({
    min: bounds?.[0],
    max: bounds?.[1],
    stepSize: 1,
    values: range,
    onChange,
    onDrag: (newValues) => setRange(newValues),
  });

  return (
    <div css={sliderContainerStyles}>
      <span>{bounds[0]}</span>
      <div css={sliderStyles}>
        <div {...getTrackProps({ style: trackStyles })}>
          {segments.map(({ getSegmentProps }, i) => (
            <div
              {...getSegmentProps({
                key: i,
                style:
                  !disabled && i === 1 ? segmentStylesActive : segmentStyles,
              })}
            />
          ))}
          {!disabled &&
            handles.map(({ value, active, getHandleProps }, i) => (
              <div
                {...getHandleProps({
                  key: i,
                  style: active ? handleStylesActive : handleStyles,
                })}
              >
                <div css={tooltipStyles}>{value}</div>
              </div>
            ))}
        </div>
      </div>
      <span>{bounds[1]}</span>
    </div>
  );
}

export default DateSlider;
