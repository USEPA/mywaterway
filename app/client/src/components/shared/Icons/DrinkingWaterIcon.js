// @flow

import React from 'react';

type Props = {
  height: string,
};

function DrinkingWaterIcon({ height = '5rem' }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      x="0"
      y="0"
      viewBox="0 0 54 54"
      style={{ height }}
      aria-hidden="true"
    >
      <path
        fill="#fff"
        d="M13.93,8.16Q15.34,26.06,16.76,44a34.12,34.12,0,0,0,20.48,0L40.07,8.16ZM35.7,42.59a29,29,0,0,1-17.39,0L16.69,22c1.28.09,2.7.14,4.23.14,5,0,7.4-.72,12.31-1,1.16-.07,2.56-.13,4.17-.13Z"
      />
    </svg>
  );
}

// 'height' defaultProp is set here just to satisfy flow,
// even though its passed as a default function param
DrinkingWaterIcon.defaultProps = {
  height: '5rem',
};

export default DrinkingWaterIcon;
