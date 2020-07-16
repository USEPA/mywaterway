// @flow

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

  if (number !== 0 && number < 1) return '< 1';

  return number.toLocaleString([], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

// Gets the file extension from a url or path. The backup parameter was added
// because the state page documents section sometimes has the file extension
// on the documentFileName and other times its on the documentURL attribute.
function getExtensionFromPath(primary: string, backup: string = '') {
  // Gets the file extension from a url or path
  function getExtension(path: string) {
    if (!path) return null;

    const filename = path.split('/').pop();
    const parts = filename.split('.');

    if (parts.length === 1) {
      return null;
    }
    return parts.pop().toUpperCase();
  }

  let extension = getExtension(primary);
  if (!extension) extension = getExtension(backup);

  if (!extension) return 'UNKNOWN';
  return extension;
}

require('@gouch/to-title-case');

function titleCase(string: string) {
  return string.toLowerCase().toTitleCase();
}

function titleCaseWithExceptions(string: string) {
  switch (string) {
    case 'AMMONIA, UN-IONIZED':
      return 'Ammonia, Un-Ionized';
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
function isHuc12(string: string) {
  return /^[0-9]{12}$/.test(string);
}

function createSchema(huc12, watershed) {
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

function createJsonLD(huc12, watershed) {
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

function removeJsonLD() {
  if (document.getElementById('jsonLD')) {
    document.getElementById('jsonLD').remove();
  }
}

function updateCanonicalLink(huc12) {
  const canonicalLink = document.querySelector('[rel="canonical"]');
  if (canonicalLink) {
    canonicalLink.href = `https://geoconnex.us/epa/hmw/${huc12}`;
  }
}

function resetCanonicalLink() {
  const canonicalLink = document.querySelector('[rel="canonical"]');
  if (canonicalLink) canonicalLink.href = '';
}

function createMarkup(message) {
  return { __html: message };
}

export {
  chunkArray,
  containsScriptTag,
  formatNumber,
  getExtensionFromPath,
  isHuc12,
  titleCase,
  titleCaseWithExceptions,
  createJsonLD,
  updateCanonicalLink,
  resetCanonicalLink,
  removeJsonLD,
  createMarkup,
};
