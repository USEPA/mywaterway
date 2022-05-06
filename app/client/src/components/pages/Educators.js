// @flow

import React from 'react';
// components
import EducatorsContent from 'components/shared/EducatorsContent';
import NavBar from 'components/shared/NavBar';
import Page from 'components/shared/Page';

function Educators() {
  return (
    <Page>
      <NavBar title="Educators" />
      <EducatorsContent />
    </Page>
  );
}

export default Educators;
