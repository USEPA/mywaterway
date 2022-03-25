// @flow

import React from 'react';
// components
import type { RouteProps } from 'routes.js';
import Page from 'components/shared/Page';
import NavBar from 'components/shared/NavBar';
import AboutContent from 'components/shared/AboutContent';

// --- components ---
type Props = {
  ...RouteProps,
};

function About({ ...props }: Props) {
  return (
    <Page>
      <NavBar title="About" />
      <AboutContent />
    </Page>
  );
}

export default About;
