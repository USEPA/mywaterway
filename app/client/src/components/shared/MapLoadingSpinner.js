// @flow

import React from 'react';
import styled from 'styled-components';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';

// --- styled components ---
const LoadingContainer = styled.div`
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
    <LoadingContainer>
      <LoadingSpinner />
    </LoadingContainer>
  );
}

export default MapLoadingSpinner;
