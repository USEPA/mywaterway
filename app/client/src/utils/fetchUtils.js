// @flow

import { escapeRegex } from 'utils/utils';

const defaultTimeout = 60000;

export function fetchCheck(apiUrl: string, timeout: number = defaultTimeout) {
  const startTime = performance.now();
  return timeoutPromise(timeout, fetch(apiUrl))
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

export function proxyFetch(apiUrl: string, timeout: number = defaultTimeout) {
  const { REACT_APP_PROXY_URL } = process.env;
  // if environment variable is not set, default to use the current site origin
  const proxyUrl = REACT_APP_PROXY_URL || `${window.location.origin}/proxy`;
  const url = `${proxyUrl}?url=${apiUrl}`;

  return fetchCheck(url, timeout);
}

export function lookupFetch(path: string, timeout: number = defaultTimeout) {
  const { REACT_APP_SERVER_URL } = process.env;
  const baseUrl = REACT_APP_SERVER_URL || window.location.origin;
  const url = `${baseUrl}/data/${path}`;

  return new Promise<Object>((resolve, reject) => {
    // Function that fetches the lookup file.
    // This will retry the fetch 3 times if the fetch fails with a
    // 1 second delay between each retry.
    const fetchLookup = (retryCount: number = 0) => {
      proxyFetch(url)
        .then((data) => {
          resolve(data);
        })
        .catch((err) => {
          console.error(err);

          // resolve the request when the max retry count of 3 is hit
          if (retryCount === 3) {
            reject(err);
          } else {
            // recursive retry (1 second between retries)
            console.log(
              `Failed to fetch ${path}. Retrying (${retryCount + 1} of 3)...`,
            );
            setTimeout(() => fetchLookup(retryCount + 1), 1000);
          }
        });
    };

    fetchLookup();
  });
}

export function fetchPost(
  apiUrl: string,
  data: object,
  headers: object,
  timeout: number = defaultTimeout,
) {
  const startTime = performance.now();
  return timeoutPromise(
    timeout,
    fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    }),
  )
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

export function fetchPostForm(
  apiUrl: string,
  data: object,
  headers: any = { 'content-type': 'application/x-www-form-urlencoded' },
  timeout: number = defaultTimeout,
) {
  const startTime = performance.now();

  // build the url search params
  const body = new URLSearchParams();
  for (let [key, value] of Object.entries(data)) {
    // get the value convert JSON to strings where necessary
    let valueToAdd = value;
    if (typeof value === 'object') {
      valueToAdd = JSON.stringify(value);
    }

    body.append(key, valueToAdd);
  }

  return timeoutPromise(
    timeout,
    fetch(apiUrl, {
      method: 'POST',
      headers,
      body,
    }),
  )
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

export function fetchPostFile(
  apiUrl: string,
  data: object,
  file: any,
  timeout: number = defaultTimeout,
) {
  const startTime = performance.now();

  // build the url search params
  const body = new FormData();
  for (let [key, value] of Object.entries(data)) {
    // get the value convert JSON to strings where necessary
    let valueToAdd = value;
    if (typeof value === 'object') {
      valueToAdd = JSON.stringify(value);
    }

    body.append(key, valueToAdd);
  }
  body.append('file', file);

  return timeoutPromise(
    timeout,
    fetch(apiUrl, {
      method: 'POST',
      body,
    }),
  )
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

function timeoutPromise(timeout, promise) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(
        new Error(
          `PROMISE_TIMED_OUT: The promise took more than ${timeout}ms.`,
        ),
      );
    }, timeout);

    promise
      .then((res) => {
        clearTimeout(timeoutId);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
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
  if (!window.gaTarget) return;
  if (!window.ga) return;

  const duration = performance.now() - startTime;

  // combine the web service and map service mappings
  let mapping = window.googleAnalyticsMapping;

  // get the short name from the url
  let eventAction = 'UNKNOWN';
  mapping.forEach((item) => {
    if (eventAction === 'UNKNOWN' && wildcardIncludes(url, item.wildcardUrl)) {
      eventAction = item.name;
    }
  });
  eventAction = `ow-hmw2-${eventAction}`;

  const eventLabel = `${url} | status:${status} | time:${duration}`;

  // log to google analytics if it has been setup
  window.logToGa('send', 'event', 'Web-service', eventAction, eventLabel);
}

function wildcardIncludes(str, rule) {
  return new RegExp(
    '^' + rule.split('*').map(escapeRegex).join('.*') + '$',
  ).test(str);
}

// Gets a string representing what environment the app is running on
export const getEnvironmentString = function () {
  const envStringMap = {
    localhost: 'onlocalhost',
    'mywaterway-dev.app.cloud.gov': 'ondev',
    'mywaterway-stage.app.cloud.gov': 'onstage',
  };

  return envStringMap[window.location.hostname];
};
