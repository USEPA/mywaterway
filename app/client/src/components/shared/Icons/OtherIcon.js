// @flow

import React from 'react';

type Props = {
  height: string,
};

function OtherIcon({ height = '5rem' }: Props) {
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
        d="M33.28,38.86a1.19,1.19,0,0,1-.93.47H22.66a1.17,1.17,0,0,1-.93-.47,1.7,1.7,0,0,1,0-2.17,1.16,1.16,0,0,1,.93-.46h1.08V28.16H22.66a1.16,1.16,0,0,1-.93-.46,1.7,1.7,0,0,1,0-2.17,1.17,1.17,0,0,1,.93-.47h8.06a.5.5,0,0,1,.47.47V36.15h1.08a1.19,1.19,0,0,1,.93.46,1.65,1.65,0,0,1,.39,1.09A1.4,1.4,0,0,1,33.28,38.86ZM27.54,13.67a4.19,4.19,0,1,1-4.18,4.18A4.17,4.17,0,0,1,27.54,13.67ZM27,8A19,19,0,1,0,46,27,19,19,0,0,0,27,8Z"
      />
    </svg>
  );
}

// 'height' defaultProp is set here just to satisfy flow,
// even though its passed as a default function param
OtherIcon.defaultProps = {
  height: '5rem',
};

export default OtherIcon;
