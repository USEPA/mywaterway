import Highcharts from 'highcharts';
import Point from '@arcgis/core/geometry/Point';

// utility function to split up an array into chunks of a designated length
function chunkArray(array: any, chunkLength: number): Array<Array<any>> {
  const chunks = [];
  let index = 0;
  while (index < array.length) {
    chunks.push(array.slice(index, (index += chunkLength)));
  }
  return chunks;
}

function containsScriptTag(string: string) {
  string = string
    .toLowerCase()
    .replace('%20', '')
    .replace('%3c', '<')
    .replace('%3e', '>')
    .trim();

  return (
    string.includes('<script>') ||
    string.includes('</script>') ||
    string.includes('<script/>')
  );
}

function formatNumber(number: number, digits: number = 0) {
  if (!number) return '0';

  if (number !== 0 && Math.abs(number) < 1) return '< 1';

  return number.toLocaleString([], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function isAbort(error: unknown) {
  if (!error || typeof error !== 'object' || !('name' in error)) return false;
  return error.name === 'AbortError';
}

function isEmpty<T>(
  v: T | null | undefined | [] | {},
): v is null | undefined | [] | {} {
  return !isNotEmpty(v);
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
function getExtensionFromPath(primary: string, backup: string = '') {
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

function titleCase(string: string) {
  const smallWords =
    /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|v.?|vs.?|via)$/i;
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

function titleCaseWithExceptions(string: string) {
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

// Rounds a float to a specified precision
function toFixedFloat(num: number, precision: number = 0) {
  if (precision < 0) return num;
  const offset = 10 ** precision;
  return Math.round((num + Number.EPSILON) * offset) / offset;
}

// Determines whether or not the input string is a HUC12 or not.
// Returns true if the string is a HUC12 and false if not.
function isHuc12(string: string) {
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

function createJsonLD(huc12: string, watershed: string) {
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

function updateCanonicalLink(huc12: string) {
  const canonicalLink = document.querySelector('[rel="canonical"]');
  if (canonicalLink && canonicalLink instanceof HTMLAnchorElement) {
    canonicalLink.href = `https://geoconnex.us/epa/hmw/${huc12}`;
  }
}

function resetCanonicalLink() {
  const canonicalLink = document.querySelector('[rel="canonical"]');
  if (canonicalLink && canonicalLink instanceof HTMLAnchorElement) {
    canonicalLink.href = window.location.href;
  }
}

function removeJsonLD() {
  const jsonLD = document.getElementById('jsonLD');
  if (jsonLD) jsonLD.remove();
}

function createMarkup(message: string) {
  return { __html: message };
}

// Determines if the input text is a string representing coordinates.
// If so the coordinates are converted to an Esri Point object.
function getPointFromCoordinates(text: string) {
  const regex = /^(-?\d+(\.\d*)?)[\s,]+(-?\d+(\.\d*)?)$/;
  let point = null;
  if (regex.test(text)) {
    const found: RegExpMatchArray | null = text.match(regex);
    if (found && found.length >= 4 && found[1] && found[3]) {
      point = new Point({
        x: parseFloat(found[1]),
        y: parseFloat(found[3]),
      });
    }
  }

  return point;
}

// Determines if the input text is a string that contains coordinates.
// The return value is an object containing the esri point for the coordinates (coordinatesPart)
// and any remaining text (searchPart).
function splitSuggestedSearch(text: string) {
  // split search
  const parts = text.split('|');

  // get the coordinates part (is last item)
  const tempCoords = parts[parts.length - 1];
  const coordinatesPart = getPointFromCoordinates(tempCoords);

  // remove the coordinates part from initial array
  const coordinatesString = coordinatesPart ? parts.pop() ?? '' : '';

  // get the point from the coordinates part
  return {
    searchPart: parts.length > 0 ? parts.join('|') : coordinatesString,
    coordinatesPart,
  };
}

/**
 * Creates a simple popup that contains all of the attributes on the
 * graphic.
 *
 * @param title The title to be displayed on the popup
 * @param attributes Attributes to be placed in the popup content
 * @returns the json object to pass to the Esri PopupTemplate constructor.
 */
function getSimplePopupTemplate(title: string, attributes: any) {
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
function browserIsCompatibleWithArcGIS() {
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

function convertAgencyCode(agencyShortCode: string) {
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
function convertDomainCode(
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
function escapeRegex(str: string) {
  return str.replace(/([.*+?^=!:${}()|\]\\])/g, '\\$1');
}

// Gets the selected community tab from the url
function getSelectedCommunityTab() {
  const pathParts = window.location.pathname.substring(1).split('/');
  let selectedCommunityTab = '';
  if (pathParts.length === 3 && pathParts[0] === 'community') {
    selectedCommunityTab = pathParts[2];
  }

  return selectedCommunityTab.toLowerCase();
}

// Normalizes string for comparisons.
function normalizeString(str: string) {
  return str.trim().toUpperCase();
}

// Summarizes assessment counts by the status of the provided fieldname.
function summarizeAssessments(
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
    } else {
      if (ids.indexOf(id) === -1) {
        ids.push(id);
        if (field === 'Not Supporting' || field === 'Fully Supporting') {
          summary.total++;
        }
        summary[field]++;
      }
    }
  });

  return summary;
}

// Finds all occurrences of the provided searchstring within the provided text.
function indicesOf(text: string, searchString: string) {
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
function parseAttributes<Type>(
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

// Workaround for the Download SVG not working with the accessibility module.
function removeAccessibiltyHcSvgExport() {
  Highcharts.addEvent(
    Highcharts.Chart.prototype,
    'afterA11yUpdate',
    function (e: Event | Highcharts.Dictionary<any> | undefined) {
      if (!e || !('accessibility' in e)) return;

      const a11y = e.accessibility;
      if ((this.renderer as any).forExport && a11y && a11y.proxyProvider) {
        a11y.proxyProvider.destroy();
      }
    },
  );
}

/**
 * Script from ESRI for escaping a ArcGIS Online usernames and
 * organization ids.
 *
 * @param value The ArcGIS Online username or organization id
 * @returns The escaped version of the username or org id.
 */
function escapeForLucene(value: string) {
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

export {
  chunkArray,
  containsScriptTag,
  escapeForLucene,
  escapeRegex,
  formatNumber,
  getExtensionFromPath,
  isAbort,
  isEmpty,
  isHuc12,
  titleCase,
  titleCaseWithExceptions,
  createJsonLD,
  updateCanonicalLink,
  resetCanonicalLink,
  removeJsonLD,
  createMarkup,
  getPointFromCoordinates,
  splitSuggestedSearch,
  getSimplePopupTemplate,
  browserIsCompatibleWithArcGIS,
  convertAgencyCode,
  convertDomainCode,
  getSelectedCommunityTab,
  normalizeString,
  summarizeAssessments,
  indicesOf,
  parseAttributes,
  removeAccessibiltyHcSvgExport,
  toFixedFloat,
};
