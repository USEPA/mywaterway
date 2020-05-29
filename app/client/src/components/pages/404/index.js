// @flow

import React from 'react';

// --- components ---
function PageNotFound() {
  // redirect to the server side 400.html page
  React.useEffect(() => {
    const location = window.location;

    let url = `${location.origin}/404.html`;
    if (location.hostname === 'localhost') {
      url = `${location.protocol}//${location.hostname}:9090/404.html`;
    }
    window.location.assign(url);
  }, []);

  return null;
}

export default PageNotFound;
