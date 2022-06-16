// @flow

import React from 'react';
// components
import Page from 'components/shared/Page';
import NavBar from 'components/shared/NavBar';
import EducatorsContent from 'components/shared/EducatorsContent';

function Educators() {
  return (
    <Page>
      <NavBar title="Educators" />
      <EducatorsContent />
    </Page>
  );
}

export default Educators;
