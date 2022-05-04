// @flow

import React from 'react';
// components
import Page from 'components/shared/Page';
import NavBar from 'components/shared/NavBar';
import AboutContent from 'components/shared/AboutContent';

function About() {
  return (
    <Page>
      <NavBar title="About" />
      <AboutContent />
    </Page>
  );
}

export default About;
