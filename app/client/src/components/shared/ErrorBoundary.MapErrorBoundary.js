// @flow

import React from 'react';
import type { Node } from 'react';
import ErrorBoundary from './ErrorBoundary.js';
// errors
import { mapErrorBoundaryMessage } from 'config/errorMessages';

// --- components ---
type Props = {
  children: Node,
};

function MapErrorBoundary({ children }: Props) {
  return (
    <ErrorBoundary message={mapErrorBoundaryMessage}>{children}</ErrorBoundary>
  );
}

export default MapErrorBoundary;
