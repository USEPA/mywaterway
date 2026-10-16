import Papa from 'papaparse';
import { escapeRegex, isAbort } from './utils';

const defaultTimeout = 60000;

export function fetchCheck(
  apiUrl: string,
  signal: AbortSignal | null = null,
  headers: object = {},
  timeout: number = defaultTimeout,
  responseType = 'json',
) {
  const startTime = performance.now();
  return timeoutPromise(timeout, fetch(apiUrl, { headers, signal }))
    .then((response) => {
      logCallToGoogleAnalytics(apiUrl, response.status, startTime);
      return checkResponse(response, responseType);
    })
    .catch((err) => {
      if (isAbort(err)) return Promise.reject(err);
      console.error(err);

      let status = err;
      if (err?.status) status = err.status;
      logCallToGoogleAnalytics(apiUrl, status, startTime);
      return checkResponse(err);
    });
}

export function proxyFetch(
  apiUrl: string,
  signal: AbortSignal | null = null,
  headers: object = {},
  timeout: number = defaultTimeout,
  responseType = 'json',
) {
  const { VITE_PROXY_URL } = import.meta.env;
  // if environment variable is not set, default to use the current site origin
  const proxyUrl = VITE_PROXY_URL || `${window.location.origin}/proxy`;
  const url = `${proxyUrl}?url=${apiUrl}`;

  return fetchCheck(url, signal, {}, timeout, responseType);
}

export function fetchParseCsv(url: string) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      complete: (res) => resolve(res.data),
      download: true,
      dynamicTyping: true,
      error: (err) => reject(err),
      header: true,
      // Papa builds its worker from its own stringified source, which
      // minification breaks, so the parse silently never finishes
      // https://github.com/mholt/PapaParse/issues/1122
      worker: false,
    });
  });
}

// Parses CSV to JSON in one of our own workers
export function fetchParseCsvInWorker<T = unknown>(url: string) {
  return new Promise<T>((resolve, reject) => {
    const worker = new Worker(new URL('./parseCsv', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (message) => {
      worker.terminate();
      if (message.data?.status === 'success') resolve(message.data.records);
      else reject(new Error(`Failed to parse CSV from ${url}`));
    };
    // a worker that fails to load or throws never posts a message
    worker.onerror = (err) => {
      worker.terminate();
      reject(new Error(err.message));
    };
    worker.postMessage(url);
  });
}

export function fetchPostParseCsv(url: string, data: any = {}) {
  return new Promise((resolve, reject) => {
    fetchPost(
      url,
      data,
      { 'Content-Type': 'application/json' },
      null,
      defaultTimeout,
      'csv',
    )
      .then((csvData) => {
        Papa.parse(csvData, {
          complete: (res) => resolve(res.data),
          dynamicTyping: true,
          error: (err) => reject(err),
          header: true,
          worker: false, // see fetchParseCsv
        });
      })
      .catch((err) => reject(err));
  });
}

export function fetchPost<T>(
  apiUrl: string,
  data: object,
  headers: object,
  signal: AbortSignal | null = null,
  timeout: number = defaultTimeout,
  responseType = 'json',
): Promise<T> {
  const startTime = performance.now();
  return timeoutPromise(
    timeout,
    fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      signal,
    }),
  )
    .then((response) => {
      logCallToGoogleAnalytics(apiUrl, response.status, startTime);
      return checkResponse(response, responseType);
    })
    .catch((err) => {
      onError(err, apiUrl, startTime);
    });
}

export function fetchPostForm(
  apiUrl: string,
  data: object,
  signal: AbortSignal | null = null,
  headers: any = { 'content-type': 'application/x-www-form-urlencoded' },
  timeout: number = defaultTimeout,
) {
  const startTime = performance.now();

  // build the url search params
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
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
      signal,
    }),
  )
    .then((response) => {
      logCallToGoogleAnalytics(apiUrl, response.status, startTime);
      return checkResponse(response);
    })
    .catch((err) => {
      onError(err, apiUrl, startTime);
    });
}

export function fetchPostFile(
  apiUrl: string,
  data: object,
  file: any,
  fileName: string | undefined = undefined,
  timeout: number = defaultTimeout,
) {
  const startTime = performance.now();

  // build the url search params
  const body = new FormData();
  for (const [key, value] of Object.entries(data)) {
    // get the value convert JSON to strings where necessary
    let valueToAdd = value;
    if (typeof value === 'object') {
      valueToAdd = JSON.stringify(value);
    }

    body.append(key, valueToAdd);
  }
  body.append('file', file, fileName);

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
      onError(err, apiUrl, startTime);
    });
}

function timeoutPromise(timeout: number, promise) {
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

export function checkResponse(response, responseType = 'json') {
  return new Promise((resolve, reject) => {
    if (response.status === 200) {
      if (responseType === 'json')
        response.json().then((json) => resolve(json));
      else if (responseType === 'blob')
        response.blob().then((blob) => resolve(blob));
      else if (responseType === 'csv')
        response.text().then((text) => resolve(text));
    } else {
      reject(response);
    }
  });
}

export function logCallToGoogleAnalytics(
  url: string,
  status: number,
  startTime?: number,
) {
  // skip this if running from a web worker
  if (
    typeof WorkerGlobalScope !== 'undefined' &&
    self instanceof WorkerGlobalScope
  )
    return;

  // reported as 'unknown' rather than NaN when the caller has no start time
  const duration =
    startTime === undefined ? 'unknown' : performance.now() - startTime;

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
  window.logToGa('service_call', {
    event_action: eventAction,
    event_category: 'Web-service',
    event_label: eventLabel,
  });
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

// Common error handler for fetch functions
function onError(error, apiUrl, startTime) {
  console.error(error);
  logCallToGoogleAnalytics(apiUrl, error, startTime);
  return checkResponse(error);
}
