// @flow

import React from 'react';
// components
import type { RouteProps } from 'routes.js';
import Page from 'components/shared/Page';
import NavBar from 'components/shared/NavBar';
import DataContent from 'components/shared/DataContent';

// --- components ---
type Props = {
  ...RouteProps,
};

function Data({ ...props }: Props) {
  return (
    <Page>
      <NavBar title="About the Data" />
      <DataContent />
    </Page>
  );
}

export default Data;
