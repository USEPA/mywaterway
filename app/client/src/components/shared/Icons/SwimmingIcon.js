// @flow

import React from 'react';

type Props = {
  height: string,
};

function SwimmingIcon({ height = '5rem' }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      x="0"
      y="0"
      viewBox="0 0 54 54"
      style={{ height }}
    >
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="1.875"
        strokeLinecap="round"
        d="M2.2,28.6l3,2.1c1.2,1.2,3.1,1.2,4.3,0l1-1c1.2-1.2,3.1-1.2,4.3,0l0.6,0.6c1.2,1.2,3.1,1.2,4.3,0l0.1-0.1c1.2-1.2,3.1-1.2,4.3,0l0.2,0.2c1.2,1.2,3.1,1.2,4.3,0l0.7-0.7c1.2-1.2,3.1-1.2,4.3,0l0.8,0.8c1.2,1.2,3.1,1.2,4.3,0l0.9-0.9c1.2-1.2,3.1-1.2,4.3,0l0.9,0.9c1.2,1.2,3.1,1.2,4.3,0l3-2"
      />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="1.875"
        strokeLinecap="round"
        d="M2.2,36.1l3,2.1c1.2,1.2,3.1,1.2,4.3,0l1-1c1.2-1.2,3.1-1.2,4.3,0l0.6,0.6c1.2,1.2,3.1,1.2,4.3,0l0.1-0.1c1.2-1.2,3.1-1.2,4.3,0l0.2,0.2c1.2,1.2,3.1,1.2,4.3,0l0.7-0.7c1.2-1.2,3.1-1.2,4.3,0l0.8,0.8c1.2,1.2,3.1,1.2,4.3,0l0.9-0.9c1.2-1.2,3.1-1.2,4.3,0l0.9,0.9c1.2,1.2,3.1,1.2,4.3,0l3-2"
      />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="1.875"
        strokeLinecap="round"
        d="M2.2,20.1l3,2.1c1.2,1.2,3.1,1.2,4.3,0l1-1c1.2-1.2,3.1-1.2,4.3,0l0.6,0.6c1.2,1.2,3.1,1.2,4.3,0l0.1-0.1c1.2-1.2,3.1-1.2,4.3,0l0.2,0.2c1.2,1.2,3.1,1.2,4.3,0l0.7-0.7c1.2-1.2,3.1-1.2,4.3,0l0.8,0.8c1.2,1.2,3.1,1.2,4.3,0l0.9-0.9c1.2-1.2,3.1-1.2,4.3,0l0.9,0.9c1.2,1.2,3.1,1.2,4.3,0l3-2"
      />
      <path
        fill="#fff"
        d="M24.3,21.4l0.2,0.2c1,1,2.6,1,3.6,0l0.7-0.7c0.8-0.8,2-1.1,3.1-0.9l-2.7-4.6l-7.6,4.4c-0.3,0.2-0.6,0.5-0.7,0.8C22,20.1,23.4,20.4,24.3,21.4z"
      />
      <path
        fill="#fff"
        d="M29.2,15.3L24,12c-0.3-0.2-0.6-0.2-0.9,0L16,16.1c-1,0.6-1.3,1.9-0.5,2.8c0.6,0.7,1.7,0.9,2.5,0.4l5.2-3l4.4,3.2L29.2,15.3z"
      />
      <circle fill="#fff" cx="35.8" cy="14.4" r="4.9" />
    </svg>
  );
}

// 'height' defaultProp is set here just to satisfy flow,
// even though its passed as a default function param
SwimmingIcon.defaultProps = {
  height: '5rem',
};

export default SwimmingIcon;
