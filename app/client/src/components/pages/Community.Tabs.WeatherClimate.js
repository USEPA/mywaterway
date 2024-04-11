// @flow
/** @jsxImportSource @emotion/react */

import { css } from '@emotion/react';
import { useEffect } from 'react';
// components
import TabErrorBoundary from 'components/shared/ErrorBoundary.TabErrorBoundary';
// contexts
import { useLayers } from 'contexts/Layers';

/*
 * Styles
 */
const containerStyles = css`
  @media (min-width: 960px) {
    padding: 1em;
  }
`;

function Monitoring() {
  const { visibleLayers } = useLayers();

  // Syncs the toggles with the visible layers on the map. Mainly
  // used for when the user toggles layers in full screen mode and then
  // exits full screen.
  useEffect(() => {}, [visibleLayers]);

  return (
    <div css={containerStyles}>
      <div>Placeholder...</div>
    </div>
  );
}

export default function MonitoringContainer() {
  return (
    <TabErrorBoundary tabName="Monitoring">
      <Monitoring />
    </TabErrorBoundary>
  );
}
