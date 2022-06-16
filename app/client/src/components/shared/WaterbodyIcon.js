// @flow

import React from 'react';
// styles
import { colors } from 'styles/index.js';

// --- components ---
type Props = {
  condition: 'good' | 'polluted' | 'unassessed',
  selected: boolean,
};

function WaterbodyIcon({ condition, selected = false }: Props) {
  // fallback shape (used when condition is 'unassessed' or some other unknown value)
  let shape = (
    <>
      <polygon
        fill={selected ? colors.highlightedPurple() : colors.purple()}
        points="13 4.34 3 21.66 23 21.66 13 4.34"
      />
      {selected && (
        <path
          fill="#0ff"
          fillOpacity="0.5"
          d="M13,4.34,23,21.66H3L13,4.34m0-1.5a1.51,1.51,0,0,0-1.3.75L1.7,20.91a1.49,1.49,0,0,0,0,1.5,1.51,1.51,0,0,0,1.3.75H23a1.51,1.51,0,0,0,1.3-.75,1.49,1.49,0,0,0,0-1.5L14.3,3.59A1.51,1.51,0,0,0,13,2.84Z"
        />
      )}
    </>
  );

  if (condition === 'good') {
    shape = (
      <>
        <circle
          fill={selected ? colors.highlightedGreen() : colors.green()}
          cx="13"
          cy="13"
          r="10"
        />
        {selected && (
          <path
            fill="#0ff"
            fillOpacity="0.5"
            d="M13,3A10,10,0,1,1,3,13,10,10,0,0,1,13,3m0-1.5A11.5,11.5,0,1,0,24.5,13,11.51,11.51,0,0,0,13,1.5Z"
          />
        )}
      </>
    );
  }

  if (condition === 'polluted') {
    shape = (
      <>
        <polygon
          fill={selected ? colors.highlightedRed() : colors.red()}
          points="17.14 3 8.86 3 3 8.86 3 17.14 8.86 23 17.14 23 23 17.14 23 8.86 17.14 3"
        />
        {selected && (
          <path
            fill="#0ff"
            fillOpacity="0.5"
            d="M17.14,3,23,8.86v8.28L17.14,23H8.86L3,17.14V8.86L8.86,3h8.28m0-1.5H8.86a1.5,1.5,0,0,0-1.06.44L1.94,7.8A1.5,1.5,0,0,0,1.5,8.86v8.28a1.5,1.5,0,0,0,.44,1.06L7.8,24.06a1.5,1.5,0,0,0,1.06.44h8.28a1.5,1.5,0,0,0,1.06-.44l5.86-5.86a1.5,1.5,0,0,0,.44-1.06V8.86a1.5,1.5,0,0,0-.44-1.06L18.2,1.94a1.5,1.5,0,0,0-1.06-.44Z"
          />
        )}
      </>
    );
  }

  let ariaLabel = 'Condition Unknown';
  if (condition === 'good') ariaLabel = 'Good';
  if (condition === 'polluted') ariaLabel = 'Polluted';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="26"
      height="26"
      viewBox="0 0 26 26"
      aria-label={ariaLabel}
    >
      {shape}
    </svg>
  );
}

export default WaterbodyIcon;
