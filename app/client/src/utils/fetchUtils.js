// @flow

import { mapServiceMapping } from 'config/mapServiceConfig';
import { webServiceMapping } from 'config/webServiceConfig';

export function fetchCheck(apiUrl: string) {
  const startTime = performance.now();
  return fetch(apiUrl)
    .then((response) => {
      logCallToGoogleAnalytics(apiUrl, response.status, startTime);
      return checkResponse(response);
    })
    .catch((err) => {
      console.error(err);

      let status = err;
      if (err && err.status) status = err.status;
      logCallToGoogleAnalytics(apiUrl, status, startTime);
      return checkResponse(err);
    });
}

export function proxyFetch(apiUrl: string) {
  const { REACT_APP_PROXY_URL } = process.env;
  // if environment variable is not set, default to use the current site origin
  const proxyUrl = REACT_APP_PROXY_URL || `${window.location.origin}/proxy`;
  const url = `${proxyUrl}?url=${apiUrl}`;

  return fetchCheck(url);
}

export function fetchPost(apiUrl: string, data: object, headers: object) {
  const startTime = performance.now();
  return fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
    .then((response) => {
      logCallToGoogleAnalytics(apiUrl, response.status, startTime);
      return checkResponse(response);
    })
    .catch((err) => {
      console.error(err);
      logCallToGoogleAnalytics(apiUrl, err, startTime);
      return checkResponse(err);
    });
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

export function logCallToGoogleAnalytics(
  url: string,
  status: number,
  startTime: number,
) {
  if (!window.isIdSet) return;

  const duration = performance.now() - startTime;

  // combine the web service and map service mappings
  let combinedMapping = webServiceMapping.concat(mapServiceMapping);

  // get the short name from the url
  let eventAction = 'UNKNOWN';
  combinedMapping.forEach((item) => {
    if (eventAction === 'UNKNOWN' && wildcardIncludes(url, item.wildcardUrl)) {
      eventAction = item.name;
    }
  });
  eventAction = `omw-hmw2-${eventAction}`;

  const eventLabel = `${url} | status:${status} | time:${duration}`;

  // log to google analytics if it has been setup
  window.ga('send', 'event', 'Web-service', eventAction, eventLabel);
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
