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
import { textBoxStyles } from '@/components/shared/MessageBoxes';

function getTicks(valuesArray: number[], maxTicks: number) {
  if (valuesArray.length <= maxTicks)
    return valuesArray.map((y) => ({
      label: y.toString(),
      labelAria: y.toString(),
      value: y,
    }));

  const tickList = [];
  const length = valuesArray.length;
  const skip = Math.round(length / maxTicks);
  for (let i = 0; i < length; i += skip) {
    const label = valuesArray[i].toString();
    tickList.push({ label, labelAria: label, value: valuesArray[i] });
  }

  return tickList;
}

/*
 ** Styles
 */
const sliderContainerStyles = (
  isVertical: boolean,
  showValues: boolean,
  marginBottom: string,
) => css`
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
      : `0 2rem ${marginBottom}`};

  .MuiSlider-markLabel {
    text-align: ${isVertical ? 'left' : 'center'};
  }
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
    backgroundColor: '#d5e6ee',
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
  marginBottom?: string;
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
  marginBottom = '0',
  min = 0,
  max = new Date().getFullYear(),
  onChange,
  range,
  sliderVerticalBreak,
  steps = 1,
  valueLabelDisplay = 'on',
}: Readonly<Props>) {
  const [defaultRange] = useState(range);
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
      tickList.push({
        label: maxValue.toString(),
        labelAria: maxValue.toString(),
        value: maxValue,
      });
  }

  const isVertical =
    sliderVerticalBreak && sliderWidth < sliderVerticalBreak ? true : false;

  function getAriaLabelText(index: number) {
    if (defaultRange.length === 1 && index === 0) return 'Selection';
    if (defaultRange.length > 1 && index === 0) return 'Range Start';
    if (defaultRange.length > 1 && index === defaultRange.length - 1)
      return 'Range End';
    return `Range Index ${index + 1}`;
  }
  function getAriaValueText(value: number) {
    const tick = tickList.find((i) => i.value === value);
    return tick
      ? tick.labelAria ?? tick?.label?.toString() ?? ''
      : value.toString();
  }

  return (
    <div css={textBoxStyles}>
      {headerElm}
      <div css={sliderContainerStylesOuter(Boolean(list))}>
        <div
          css={sliderContainerStyles(
            isVertical,
            ['on', 'auto'].includes(valueLabelDisplay),
            marginBottom,
          )}
          ref={sliderRef}
        >
          {minValue !== maxValue && (
            <SliderStyled
              defaultValue={defaultRange}
              disabled={disabled}
              getAriaLabel={getAriaLabelText}
              getAriaValueText={getAriaValueText}
              marks={tickList}
              max={maxValue}
              min={minValue}
              orientation={isVertical ? 'vertical' : 'horizontal'}
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

type Mark = { label: string | ReactNode; labelAria?: string; value: number };
