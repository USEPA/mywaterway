// @flow

import React from 'react';
import { css } from 'styled-components/macro';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';

const loadingContainerStyles = css`
  display: flex;
  height: 100%;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  vertical-align: middle;

  background-color: rgba(255, 255, 255, 0.75);
  z-index: 1;
`;

// --- components ---
type Props = {};

function MapLoadingSpinner({ ...props }: Props) {
  return (
    <div css={loadingContainerStyles}>
      <LoadingSpinner />
    </div>
  );
}

export default MapLoadingSpinner;
