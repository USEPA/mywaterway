// @flow

import React from 'react';
import type { Node } from 'react';
import ErrorBoundary from './ErrorBoundary.js';
// errors
import { tabErrorBoundaryMessage } from 'config/errorMessages';

// --- components ---
type Props = {
  tabName: string,
  children: Node,
};

function TabErrorBoundary({ tabName, children }: Props) {
  return (
    <ErrorBoundary message={tabErrorBoundaryMessage(tabName)}>
      {children}
    </ErrorBoundary>
  );
}

export default TabErrorBoundary;
