// @flow

import { mapServiceMapping } from 'config/mapServiceConfig';
import { webServiceMapping } from 'config/webServiceConfig';

export function fetchCheck(apiUrl: string) {
  logCallToGoogleAnalytics(apiUrl);

  return fetch(apiUrl).then(checkResponse);
}

export function proxyFetch(apiUrl: string) {
  const { REACT_APP_PROXY_URL } = process.env;
  // if environment variable is not set, default to use the current site origin
  const proxyUrl = REACT_APP_PROXY_URL || `${window.location.origin}/proxy`;
  const url = `${proxyUrl}?url=${apiUrl}`;

  logCallToGoogleAnalytics(url);

  return fetch(url).then(checkResponse);
}

export function checkResponse(response) {
  return new Promise((resolve, reject) => {
    if (response.status === 200) {
      response.json().then((json) => resolve(json));
    } else {
      reject(response);
    }
  });
}

export function logCallToGoogleAnalytics(url: string) {
  if (!window.isIdSet) return;

  // combine the web service and map service mappings
  let combinedMapping = webServiceMapping.concat(mapServiceMapping);

  // get the short name from the url
  let eventAction = 'UNKNOWN';
  combinedMapping.forEach((item) => {
    if (eventAction === 'UNKNOWN' && wildcardIncludes(url, item.wildcardUrl)) {
      eventAction = item.name;
    }
  });

  // log to google analytics if it has been setup
  window.ga('send', 'event', 'Web-service', eventAction, url);
}

function wildcardIncludes(str, rule) {
  var escapeRegex = (str) => str.replace(/([.*+?^=!:${}()|\]\\])/g, '\\$1');
  return new RegExp(
    '^' +
      rule
        .split('*')
        .map(escapeRegex)
        .join('.*') +
      '$',
  ).test(str);
}

// Gets a string representing what environment the app is running on
export const getEnvironmentString = function() {
  const envStringMap = {
    localhost: 'onlocalhost',
    'mywaterway-dev.app.cloud.gov': 'ondev',
    'mywaterway-stage.app.cloud.gov': 'onstage',
  };

  return envStringMap[window.location.hostname];
};
