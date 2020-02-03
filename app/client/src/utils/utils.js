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

function formatNumber(number: number, digits: number = 0) {
  if (!number) return '0';

  if (number !== 0 && number < 1) return '< 1';

  return number.toLocaleString([], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
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

export { chunkArray, formatNumber, titleCase, titleCaseWithExceptions };
