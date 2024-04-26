/** @jsxImportSource @emotion/react */

import {
  ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { css } from '@emotion/react';
import { useRanger } from 'react-ranger';
import { v4 as uuid } from 'uuid';
// components
import { textBoxStyles } from 'components/shared/MessageBoxes';

function getTicks(yearsArray: number[], maxTicks: number) {
  if (yearsArray.length <= maxTicks) return yearsArray;

  const tickList = [];
  const length = yearsArray.length;
  const skip = Math.round(length / maxTicks);
  for (let i = 0; i < length; i += skip) {
    tickList.push(yearsArray[i]);
  }

  return tickList;
}

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
  padding: '0',
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
  height: 3.5em;
  justify-content: center;
  padding-bottom: 2em;
  width: 100%;
  margin: 25px 30px 0;
`;

const sliderContainerStylesOuter = (hasList: boolean) => css`
  align-items: flex-end;
  display: flex;
  gap: 1rem;
  justify-content: center;
  padding: ${hasList ? '0 2em' : ''};
  width: 100%;
  span {
    &:first-of-type {
      margin-left: 1em;
    }
    &:last-of-type {
      margin-right: 1em;
    }
  }
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
  color: rgba(0, 0, 0, 0.6);
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

const tooltipStyles = css`
  background-color: #d5e6ee;
  border-radius: 10%;
  color: #444;
  font-size: 0.8em;
  font-weight: normal;
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

type Props = {
  disabled?: boolean;
  headerElm?: ReactNode;
  min?: number;
  max?: number;
  onChange: (newValues: number[]) => void;
  range: number[];
  list?: string[];
};

function DateSlider({
  disabled = false,
  headerElm = <></>,
  min = 0,
  max = new Date().getFullYear(),
  onChange,
  range,
  list,
}: Readonly<Props>) {
  const [sliderId] = useState(uuid());

  const [minYear, setMinYear] = useState(min);
  const [maxYear, setMaxYear] = useState(list ? list.length - 1 : max);
  useEffect(() => {
    if (!min || !max) return;
    setMinYear(min);
    setMaxYear(max);
  }, [min, max]);

  const [sliderWidth, setSliderWidth] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const observer = useMemo(
    () =>
      new (window as any).ResizeObserver((entries: any) => {
        if (entries[0]) {
          const { width } = entries[0].contentRect;
          setSliderWidth(width);
        }
      }),
    [],
  );
  useLayoutEffect(() => {
    if (!sliderRef?.current) return;
    observer.observe(sliderRef.current);
    return () => {
      observer.disconnect();
    };
  }, [observer, sliderRef]);

  let maxTicks = 4;
  if (sliderWidth < 80) maxTicks = 1;
  else if (sliderWidth < 300) maxTicks = 2;

  const yearsArray = list
    ? [...Array(list.length).keys()]
    : [...Array(max - min + 1).keys()].map((x) => x + min);
  const tickList = getTicks(yearsArray, maxTicks);
  if (tickList.slice(-1)[0] !== maxYear) tickList.push(maxYear);

  const { getTrackProps, segments, ticks, handles } = useRanger({
    min: minYear,
    max: maxYear,
    stepSize: 1,
    ticks: tickList,
    values: range,
    onChange,
  });

  return (
    <div css={textBoxStyles}>
      {headerElm}
      <div css={sliderContainerStylesOuter(Boolean(list))}>
        <div css={sliderContainerStyles} ref={sliderRef}>
          {minYear !== maxYear && (
            <div css={sliderStyles}>
              <div {...getTrackProps({ style: trackStyles })}>
                {segments.map(({ getSegmentProps }, i) => (
                  <div
                    {...getSegmentProps({
                      key: i,
                      style:
                        !disabled && i === 1
                          ? segmentStylesActive
                          : segmentStyles,
                    })}
                  />
                ))}
                {ticks.map(({ value, getTickProps }, i) => {
                  return (
                    <div css={tickStyles} {...getTickProps({ key: i })}>
                      <div css={tickLabelStyles}>
                        {list ? list[value] : value}
                      </div>
                    </div>
                  );
                })}
                {!disabled &&
                  handles.map(({ value, active, getHandleProps }, i) => (
                    <div
                      aria-labelledby={`slider-${sliderId}-handle-${i}`}
                      {...getHandleProps({
                        key: i,
                        style: active ? handleStylesActive : handleStyles,
                      })}
                      tabIndex={0}
                    >
                      {!list && (
                        <div
                          id={`slider-${sliderId}-handle-${i}`}
                          css={tooltipStyles}
                        >
                          {value}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DateSlider;
