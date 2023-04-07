// @flow

import React from 'react';

// Determines if a URL is external
function isExternalUrl(url: string) {
  const link = new URL(url);

  const internalHostnames = [
    'www.epa.gov',
    'mywaterway.epa.gov',
    'mywaterway-dev.app.cloud.gov',
    'mywaterway-stage.app.cloud.gov',
    'mywaterway-attains.app.cloud.gov',
    'mywaterway-prod.app.cloud.gov',
    '54.209.48.156', // development attains
  ];

  if (
    internalHostnames.includes(link.host) ||
    link.host.endsWith('epa.gov')
  ) {
    return false;
  }

  return true;
}

type Props = {
  url: string,
};

function DynamicExitDisclaimer({ url }: Props) {
  if (isExternalUrl(url)) {
    return (
      <a
        className="exit-disclaimer"
        href="https://www.epa.gov/home/exit-epa"
        target="_blank"
        rel="noopener noreferrer"
      >
        EXIT
      </a>
    );
  }

  return null;
}

export default DynamicExitDisclaimer;
