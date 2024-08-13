import type { ReactNode } from 'react';
import ErrorBoundary from './ErrorBoundary.js';
// errors
import { mapErrorBoundaryMessage } from '@/config/errorMessages.js';

// --- components ---
type Props = {
  children: ReactNode;
};

function MapErrorBoundary({ children }: Readonly<Props>) {
  return (
    <ErrorBoundary message={mapErrorBoundaryMessage}>{children}</ErrorBoundary>
  );
}

export default MapErrorBoundary;
