// @flow

import { useEffect } from 'react';

// --- components ---
function PageNotFound() {
  // redirect to the server side 404.html page
  useEffect(() => {
    const location = window.location;

    let url = `${location.origin}/404.html`;
    if (location.hostname === 'localhost') {
      url = `${location.protocol}//${location.hostname}:9090/404.html`;
    }

    // append the original url for tracking purposes
    url += `?src=${location.href}`;

    window.location.assign(url);
  }, []);

  return null;
}

export default PageNotFound;
