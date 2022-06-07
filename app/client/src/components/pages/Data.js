// @flow

import React from 'react';
// components
import Page from 'components/shared/Page';
import NavBar from 'components/shared/NavBar';
import DataContent from 'components/shared/DataContent';

function Data() {
  return (
    <Page>
      <NavBar title="About the Data" />
      <DataContent />
    </Page>
  );
}

export default Data;
