import type { ReactNode } from 'react';
import ErrorBoundary from './ErrorBoundary.js';
// errors
import { tabErrorBoundaryMessage } from 'config/errorMessages';

// --- components ---
type Props = {
  tabName: string;
  children: ReactNode;
};

function TabErrorBoundary({ tabName, children }: Props) {
  return (
    <ErrorBoundary message={tabErrorBoundaryMessage(tabName)}>
      {children}
    </ErrorBoundary>
  );
}

export default TabErrorBoundary;
