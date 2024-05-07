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
import MuiSlider from '@mui/material/Slider';
import { styled } from '@mui/material/styles';
// components
import { textBoxStyles } from 'components/shared/MessageBoxes';

function getTicks(valuesArray: number[], maxTicks: number) {
  if (valuesArray.length <= maxTicks)
    return valuesArray.map((y) => ({ label: y.toString(), value: y }));

  const tickList = [];
  const length = valuesArray.length;
  const skip = Math.round(length / maxTicks);
  for (let i = 0; i < length; i += skip) {
    tickList.push({ label: valuesArray[i].toString(), value: valuesArray[i] });
  }

  return tickList;
}

/*
 ** Styles
 */
const sliderContainerStyles = (isVertical: boolean, showValues: boolean) => css`
  align-items: flex-end;
  display: flex;
  gap: 1em;
  ${isVertical && 'height: 150px;'}
  justify-content: center;
  width: 100%;
  margin: ${isVertical
    ? '1rem 2rem'
    : showValues
      ? '1.75rem 2rem 0'
      : '0 2rem'};
`;

const sliderContainerStylesOuter = (hasList: boolean) => css`
  align-items: flex-end;
  display: flex;
  gap: 1rem;
  justify-content: center;
  padding: ${hasList ? '0 2em' : ''};
  width: 100%;
`;

const SliderStyled = styled(MuiSlider)(({ theme }) => ({
  '& .MuiSlider-thumb': {
    height: '0.9em',
    width: '0.9em',
    '&:focus, &:hover, &.Mui-active': {
      boxShadow: '0 0 0 6px rgba(58, 133, 137, 0.16)',
    },
  },
  '& .MuiSlider-valueLabel': {
    backgroundColor: '#d5e6ee', // TODO pull from colors??
    borderRadius: '10%',
    color: '#444',
    fontFamily:
      '"Source Sans Pro Web", "Helvetica Neue", Helvetica, Roboto, Arial, sans-serif',
    fontSize: '0.8em',
    fontWeight: 'normal',
    minHeight: 'auto',
    opacity: '0.8',
    padding: '0.3em',
    top: '-8px',
    '&::before': {
      display: 'none',
    },
    '& *': {
      background: 'transparent',
      color: theme.palette.mode === 'dark' ? '#fff' : '#000',
    },
  },
}));

type Props = {
  disabled?: boolean;
  headerElm?: ReactNode;
  list?: Mark[];
  min?: number;
  max?: number;
  onChange: (newValues: number[]) => void;
  range: number[];
  sliderVerticalBreak?: number;
  steps?: number | null;
  valueLabelDisplay?: 'auto' | 'on' | 'off';
};

function Slider({
  disabled = false,
  headerElm = <></>,
  list,
  min = 0,
  max = new Date().getFullYear(),
  onChange,
  range,
  sliderVerticalBreak,
  steps = 1,
  valueLabelDisplay = 'on',
}: Readonly<Props>) {
  const [minValue, setMinValue] = useState(min);
  const [maxValue, setMaxValue] = useState(list ? list.length - 1 : max);
  useEffect(() => {
    if (!min || !max) return;
    setMinValue(min);
    setMaxValue(max);
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

  let tickList: Mark[] = [];
  if (list) tickList = list;
  else {
    const valuesArray = [...Array(max - min + 1).keys()].map((x) => x + min);
    tickList = getTicks(valuesArray, maxTicks);
    if (tickList.slice(-1)[0].value !== maxValue)
      tickList.push({ label: maxValue.toString(), value: maxValue });
  }

  const orientation =
    sliderVerticalBreak && sliderWidth < sliderVerticalBreak
      ? 'vertical'
      : 'horizontal';

  function valuetext(value: number) {
    const tick = tickList.find((i) => i.value === value);
    return tick ? tick.label : value.toString();
  }

  return (
    <div css={textBoxStyles}>
      {headerElm}
      <div css={sliderContainerStylesOuter(Boolean(list))}>
        <div
          css={sliderContainerStyles(
            false,
            ['on', 'auto'].includes(valueLabelDisplay),
          )}
          ref={sliderRef}
        >
          {minValue !== maxValue && (
            <SliderStyled
              defaultValue={range}
              disabled={disabled}
              getAriaLabel={valuetext}
              getAriaValueText={valuetext}
              marks={tickList}
              max={maxValue}
              min={minValue}
              orientation={orientation}
              step={steps}
              valueLabelDisplay={valueLabelDisplay}
              onChangeCommitted={(_event, value) =>
                onChange(typeof value === 'number' ? [value] : value)
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Slider;

type Mark = { label: string; value: number };
