// @flow

import React from 'react';
import styled, { keyframes } from 'styled-components';
// utilities
import { isIE } from 'components/pages/LocationMap/MapFunctions';
// styles
import { colors } from 'styles/index.js';

// --- styled components ---
const rotate = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const dash = keyframes`
  0% {
    stroke-dashoffset: 150;
    transform: rotate(0deg);
  }
  50% {
   stroke-dashoffset: 50;
   transform: rotate(300deg);
  }
  100% {
   stroke-dashoffset: 150;
   transform: rotate(720deg);
  }
`;

const color = keyframes`
  0% {
    stroke: ${colors.blue()};
  }
  25% {
    stroke: ${colors.gold()};
  }
  50% {
    stroke: ${colors.teal()};
  }
  75% {
    stroke: ${colors.magenta()};
  }
  100% {
    stroke: ${colors.blue()};
  }
`;

const Svg = styled.svg`
  display: block;
  margin: 1rem auto;
  animation: ${rotate} 5s linear infinite;
`;

const Circle = styled.circle`
  fill: none;
  stroke-width: 5;
  stroke-linecap: round;
  stroke-dasharray: 150;
  stroke-dashoffset: 0;
  transform-origin: center;
  animation: ${dash} 1.25s ease-in-out infinite,
    ${color} 5s ease-in-out infinite;
`;

const IeSvg = styled.svg`
  display: block;
  margin: 1rem auto;
  animation: ${rotate} 1.5s linear infinite;
`;

const IeCircle = styled.circle`
  fill: none;
  stroke: ${colors.blue()};
  stroke-width: 5;
  stroke-linecap: round;
  stroke-dasharray: 10;
  transform-origin: center;
`;

// --- components ---
type Props = {};

function LoadingSpinner({ ...props }: Props) {
  // Internet explorer does not allow animations on svg children, so for IE
  // we display a more simple loading spinner
  if (isIE()) {
    return (
      <IeSvg
        data-testid="hmw-loading-spinner"
        width="50"
        height="50"
        viewBox="0 0 50 50"
        {...props}
        aria-hidden="true"
      >
        <IeCircle cx="25" cy="25" r="20" />
      </IeSvg>
    );
  }

  return (
    <Svg
      data-testid="hmw-loading-spinner"
      width="50"
      height="50"
      viewBox="0 0 50 50"
      aria-hidden="true"
      {...props}
    >
      <Circle cx="25" cy="25" r="20" />
    </Svg>
  );
}

export default LoadingSpinner;
