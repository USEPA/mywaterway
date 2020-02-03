// @flow

import React from 'react';

type Props = {};

function PinIcon({ ...props }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      x="0"
      y="0"
      viewBox="0 0 40 40"
      {...props}
    >
      <path
        fill="#2D72B5"
        fillOpacity="0.875"
        stroke="#000"
        strokeOpacity="0.625"
        d="M20,5C13.38,5,8,9.89,8,15.92S20,35,20,35,32,22,32,15.92,26.62,5,20,5Zm0,14.61a3.89,3.89,0,0,1-4.06-3.69A3.89,3.89,0,0,1,20,12.23a3.89,3.89,0,0,1,4.06,3.69A3.89,3.89,0,0,1,20,19.61Z"
      />
    </svg>
  );
}

export default PinIcon;
