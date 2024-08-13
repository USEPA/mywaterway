// types
import type { KeyboardEvent, MouseEvent } from 'react';
import type { FetchStatus, InfoText } from '@/types';

// utility function to split up an array into chunks of a designated length
export function chunkArray(array: any, chunkLength: number): Array<Array<any>> {
  const chunks = [];
  let index = 0;
  while (index < array.length) {
    chunks.push(array.slice(index, (index += chunkLength)));
  }
  return chunks;
}

// utility function to split up an array into chunks of a designated max character length
export function chunkArrayCharLength(
  array: string[],
  charLength: number,
  separator: string = ',',
): Array<string> {
  const chunks: string[] = [];
  let tempString = '';
  let chunkString = '';
  array.forEach((item: string) => {
    if (!tempString) tempString = item;
    else tempString += separator + item;

    if (tempString.length <= charLength) chunkString = tempString;
    else {
      chunks.push(chunkString);
      tempString = item;
    }
  });

  chunks.push(chunkString);

  return chunks;
}

export function containsScriptTag(string: string) {
  string = decodeURI(string.toLowerCase().replaceAll(' ', ''));

  return (
    string.includes('<script>') ||
    string.includes('</script>') ||
    string.includes('<script/>')
  );
}

/**
 * Return the string "N/A" if the provided status is not "success",
 * otherwise return `countOrData` if it is a number or the length if it is an array.
 */
export function countOrNotAvailable(
  countOrData: number | unknown[] | null,
  ...statuses: FetchStatus[]
) {
  if (!statuses.some((status) => status === 'success')) return 'N/A';
  if (typeof countOrData === 'number') return countOrData.toLocaleString();
  return (countOrData?.length ?? 0).toLocaleString();
}

export function formatNumber(
  number: number,
  digits: number = 0,
  removeTrailingZeros: boolean = false,
) {
  if (!number) return '0';

  if (number !== 0 && Math.abs(number) < 1) return '< 1';

  const value = number.toLocaleString([], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

  if (removeTrailingZeros) return parseFloat(value).toLocaleString();
  return value;
}

export function isAbort(error: unknown) {
  if (!error || typeof error !== 'object' || !('name' in error)) return false;
  return error.name === 'AbortError';
}

export function isClick(ev: KeyboardEvent | MouseEvent) {
  if (isKeyboardEvent(ev)) {
    if (ev.key !== ' ' && ev.key !== 'Enter') return false;
  } else if (ev.type !== 'click') return false;
  return true;
}

export function isEmpty<T>(
  v: T | null | undefined | [] | {},
): v is null | undefined | [] | {} {
  return !isNotEmpty(v);
}

export function isKeyboardEvent(
  ev: KeyboardEvent | MouseEvent,
): ev is KeyboardEvent {
  return ev.hasOwnProperty('key');
}

// Type predicate, negation is used to narrow to type `T`
function isNotEmpty<T>(v: T | null | undefined | [] | {}): v is T {
  if (v === null || v === undefined || v === '') return false;
  if (Array.isArray(v) && v.length === 0) return false;
  else if (
    Object.keys(v).length === 0 &&
    Object.getPrototypeOf(v) === Object.prototype
  ) {
    return false;
  }
  return true;
}

// Gets the file extension from a url or path. The backup parameter was added
// because the state page documents section sometimes has the file extension
// on the documentFileName and other times its on the documentURL attribute.
export function getExtensionFromPath(primary: string, backup: string = '') {
  // Gets the file extension from a url or path
  function getExtension(path: string) {
    if (!path) return null;

    const filename = path.split('/').pop() ?? '';
    const parts = filename.split('.');

    if (parts.length === 1) {
      return null;
    }
    return (parts.pop() ?? '').toUpperCase();
  }

  let extension = getExtension(primary);
  if (!extension) extension = getExtension(backup);

  if (!extension) return 'UNKNOWN';
  return extension;
}

export function sentenceJoin(values: string[]) {
  // remove duplicates
  values = [...new Set(values)];

  if (values.length <= 1) return values.join('');
  return `${values.slice(0, -1).join(', ')} and ${values.slice(-1)}`;
}

export function titleCase(string: string) {
  const smallWords =
    /^(a[nst]?|and|but|by|en|for|i[fn]|o[fn]|n?or|per|the|to|vs?.?|via)$/i;
  const alphanumericPattern = /([A-Za-z0-9\u00C0-\u00FF])/;
  const wordSeparators = /([ :–—-])/;

  return string
    .toLowerCase()
    .split(wordSeparators)
    .map(function (current, index, array) {
      if (
        // check for small words
        current.search(smallWords) > -1 &&
        // skip first and last word
        index !== 0 &&
        index !== array.length - 1 &&
        // ignore title end and subtitle start
        array[index - 3] !== ':' &&
        array[index + 1] !== ':' &&
        // ignore small words that start a hyphenated phrase
        (array[index + 1] !== '-' ||
          (array[index - 1] === '-' && array[index + 1] === '-'))
      ) {
        return current.toLowerCase();
      }

      // ignore intentional capitalization
      if (current.substring(1).search(/[A-Z]|\../) > -1) {
        return current;
      }

      // ignore URLs
      if (array[index + 1] === ':' && array[index + 2] !== '') {
        return current;
      }

      // capitalize the first letter
      return current.replace(alphanumericPattern, function (match) {
        return match.toUpperCase();
      });
    })
    .join('');
}

export function titleCaseWithExceptions(string: string) {
  switch (string) {
    case 'AMMONIA, UN-IONIZED':
      return 'Ammonia, Un-Ionized';
    case 'BIOCHEMICAL OXYGEN DEMAND (BOD)':
      return 'Biochemical Oxygen Demand (BOD)';
    case 'CHLOROPHYLL-A':
      return 'Chlorophyll a';
    case 'CHLOROPHYLL-A - AQUATIC LIFE USE SUPPORT':
      return 'Chlorophyll a - Aquatic Life Use Support';
    case 'ESCHERICHIA COLI (E. COLI)':
      return 'Escherichia Coli (E. coli)';
    case 'PH':
      return 'pH';
    case 'TOTAL DISSOLVED SOLIDS (TDS)':
      return 'Total Dissolved Solids (TDS)';
    case 'TOTAL SUSPENDED SOLIDS (TSS)':
      return 'Total Suspended Solids (TSS)';
    case 'TROPHIC STATE INDEX (TSI)':
      return 'Trophic State Index (TSI)';
    default:
      return titleCase(string);
  }
}

// Determines whether or not the input string is a HUC12 or not.
// Returns true if the string is a HUC12 and false if not.
export function isHuc12(string: string) {
  return /^\d{12}$/.test(string);
}

function createSchema(huc12: string, watershed: string) {
  return {
    '@context': ['https://schema.org'],
    '@id': `https://geoconnex.us/epa/hmw/${huc12}`,
    '@type': 'WebPage',
    name: `${watershed} (${huc12})`,
    provider: 'https://epa.gov',
    description:
      "EPA How's My Waterway Community as Twelve-Digit Hydrologic Unit",
    about: `https://geoconnex.us/nhdplusv2/huc12/${huc12}`,
  };
}

export function createJsonLD(huc12: string, watershed: string) {
  // try removing any existing JSON-LDs
  removeJsonLD();

  // create a JSON-LD schema and append it to document head
  const head = document.getElementsByTagName('head')[0];
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'jsonLD';
  script.innerHTML = JSON.stringify(createSchema(huc12, watershed));
  head.appendChild(script);
}

export function updateCanonicalLink(huc12: string) {
  const canonicalLink = document.querySelector('[rel="canonical"]');
  if (canonicalLink && canonicalLink instanceof HTMLAnchorElement) {
    canonicalLink.href = `https://geoconnex.us/epa/hmw/${huc12}`;
  }
}

export function resetCanonicalLink() {
  const canonicalLink = document.querySelector('[rel="canonical"]');
  if (canonicalLink && canonicalLink instanceof HTMLAnchorElement) {
    canonicalLink.href = window.location.href;
  }
}

export function removeJsonLD() {
  const jsonLD = document.getElementById('jsonLD');
  if (jsonLD) jsonLD.remove();
}

export function createMarkup(message: string) {
  return { __html: message };
}

/**
 * Creates a simple popup that contains all of the attributes on the
 * graphic.
 *
 * @param title The title to be displayed on the popup
 * @param attributes Attributes to be placed in the popup content
 * @returns the json object to pass to the Esri PopupTemplate constructor.
 */
export function getSimplePopupTemplate(title: string, attributes: any) {
  return {
    title,
    content: [
      {
        type: 'fields',
        fieldInfos: Object.keys(attributes).map((key) => {
          return { fieldName: key, label: key };
        }),
      },
    ],
  };
}

// check user-agent for iOS version, if applicable
export function browserIsCompatibleWithArcGIS() {
  const agent = window.navigator.userAgent;
  const start = agent.indexOf('OS ');

  if (
    (agent.indexOf('iPhone') > -1 || agent.indexOf('iPad') > -1) &&
    start > -1
  ) {
    const iosVersion = window.Number(
      agent.substring(start + 3, start + 6).replace('_', '.'),
    );

    if (isNaN(iosVersion)) {
      // unable to detect iOS version - assume browser supports ArcGIS
      return true;
    }

    if (iosVersion <= 10) {
      // iOS version is below 10 - browser will not support ArcGIS
      return false;
    }

    // iOS Version is 10 or higher and will support ArcGIS
    return true;
  }

  // iOS version not found - assume browser supports ArcGIS
  return true;
}

export function convertAgencyCode(agencyShortCode: string) {
  if (!agencyShortCode) return 'Unknown';

  // Wild and Scenic Rivers service returns multiple agencies as a string. ex: 'USFS, FWS, NPS'
  const agencies = agencyShortCode.split(',');
  return agencies
    .map((agency) => {
      const code = agency.trim();
      if (code === 'BLM') return 'Bureau of Land Management';
      if (code === 'NPS') return 'U.S. National Park Service';
      if (code === 'FWS') return 'U.S. Fish and Wildlife Service';
      if (code === 'USFS') return 'United States Forest Service';
      return code;
    })
    .join(', ');
}

// Lookup the value of an attribute using domain coded values from
// the arcgis feature layer fields.
export function convertDomainCode(
  fields: __esri.Field[] | null | undefined,
  name: string,
  value: string,
) {
  if (!fields) return value;

  // look for the field using name
  for (const field of fields) {
    if (field.name === name && field.domain) {
      // look for the code using value
      const codedValues = (field.domain as __esri.CodedValueDomain).codedValues;
      for (const codedValue of codedValues) {
        if (codedValue.code === value) {
          return codedValue.name;
        }
      }
    }
  }

  // code was not found, just return the value provided
  return value;
}

// Escapes special characters for usage with regex
export function escapeRegex(str: string) {
  return str.replace(/([.*+?^=!:${}()|\]\\])/g, '\\$1');
}

export function getMedian(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const numValues = values.length;
  if (numValues % 2 === 0) {
    return (sorted[numValues / 2 - 1] + sorted[numValues / 2]) / 2;
  } else {
    return sorted[(numValues - 1) / 2];
  }
}

// Gets the selected community tab from the url
export function getSelectedCommunityTab() {
  const pathParts = window.location.pathname.substring(1).split('/');
  let selectedCommunityTab = '';
  if (pathParts.length === 3 && pathParts[0] === 'community') {
    selectedCommunityTab = pathParts[2];
  }

  return selectedCommunityTab.toLowerCase();
}

// Normalizes string for comparisons.
export function normalizeString(str: string) {
  return str.trim().toUpperCase();
}

// Summarizes assessment counts by the status of the provided fieldname.
export function summarizeAssessments(
  waterbodies: __esri.Graphic[],
  fieldName: string,
) {
  const summary = {
    total: 0,
    unassessed: 0,
    'Not Supporting': 0,
    'Fully Supporting': 0,
    'Insufficient Information': 0,
    'Not Assessed': 0,
    'Not Applicable': 0,
  };

  // ids will contain unique assessment unit id's of each waterbody,
  // to ensure we don't count a unique waterbody more than once
  const ids: string[] = [];

  waterbodies?.forEach((graphic) => {
    const field = graphic.attributes[fieldName] as
      | 'total'
      | 'unassessed'
      | 'Not Supporting'
      | 'Fully Supporting'
      | 'Insufficient Information'
      | 'Not Assessed'
      | 'Not Applicable'
      | 'X';
    const { assessmentunitidentifier, organizationidentifier } =
      graphic.attributes;
    const id = `${organizationidentifier}${assessmentunitidentifier}`;

    if (!field || field === 'X') {
      summary['Not Applicable']++;
    } else if (ids.indexOf(id) === -1) {
      ids.push(id);
      if (field === 'Not Supporting' || field === 'Fully Supporting') {
        summary.total++;
      }
      summary[field]++;
    }
  });

  return summary;
}

// Finds all occurrences of the provided searchstring within the provided text.
export function indicesOf(text: string, searchString: string) {
  const searchLength = searchString.length;
  if (searchLength === 0) return [];

  let startIndex = 0;
  let index = 0;
  const indices = [];

  // make inputs lower case for doing case insensitive search
  text = text.toLowerCase();
  searchString = searchString.toLowerCase();

  // search for all occurrences of the searchString
  while ((index = text.indexOf(searchString, startIndex)) > -1) {
    indices.push(index);
    startIndex = index + searchLength;
  }

  return indices;
}

// Parses ArcGIS attributes including stringified JSON
export function parseAttributes<Type>(
  structuredAttributes: string[],
  attributes: Type,
): Type {
  const parsed: {
    [property: string]: Type[keyof Type];
  } = {};
  for (const property of structuredAttributes) {
    if (property in (attributes as object)) {
      const value = attributes[property as keyof Type];
      if (typeof value === 'string') {
        parsed[property] = JSON.parse(value);
      } else {
        parsed[property] = value;
      }
    }
  }
  return { ...attributes, ...parsed };
}

// Rounds a float to a specified precision
export function toFixedFloat(num: number, precision: number = 0) {
  if (precision < 0) return num;
  const offset = 10 ** precision;
  return Math.round((num + Number.EPSILON) * offset) / offset;
}

/**
 * Script from ESRI for escaping a ArcGIS Online usernames and
 * organization ids.
 *
 * @param value The ArcGIS Online username or organization id
 * @returns The escaped version of the username or org id.
 */
export function escapeForLucene(value: string) {
  const a = [
    '+',
    '-',
    '&',
    '!',
    '(',
    ')',
    '{',
    '}',
    '[',
    ']',
    '^',
    '"',
    '~',
    '*',
    '?',
    ':',
    '\\',
  ];
  const r = new RegExp('(\\' + a.join('|\\') + ')', 'g');
  return value.replace(r, '\\$1');
}

/**
 * Replaces parameters in text attribute with corresponding attributes.
 *
 * @param config Configuration to do parameterized string on.
 * @returns A string with necessary replacements.
 */
export function parameterizedString(config: InfoText | string) {
  if (typeof config === 'string') return config;

  let text = config.text;
  Object.keys(config)
    .filter((c) => c !== 'text')
    .forEach((key) => {
      const keyFull = `{${key}}`;
      text = text.replaceAll(keyFull, config[key]);
    });
  return text;
}
