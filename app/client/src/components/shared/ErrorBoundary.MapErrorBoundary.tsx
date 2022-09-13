import type { ReactNode } from 'react';
import ErrorBoundary from './ErrorBoundary.js';
// errors
import { mapErrorBoundaryMessage } from 'config/errorMessages';

// --- components ---
type Props = {
  children: ReactNode;
};

function MapErrorBoundary({ children }: Props) {
  return (
    <ErrorBoundary message={mapErrorBoundaryMessage}>{children}</ErrorBoundary>
  );
}

export default MapErrorBoundary;
