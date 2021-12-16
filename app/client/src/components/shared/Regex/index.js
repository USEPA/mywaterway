// returns the url from a stringified anchor tag's markup
export function getUrlFromMarkup(markup: string) {
  // match on the url (text between the double quotes)
  const match = markup.match(/.*?(".*?")/i);
  if (!match) return '';
  // escape '<' characters, and strip leading and trailing double quotes
  return match[1].replace(/</, '&lt;').slice(1, -1);
}

export function getTitleFromMarkup(markup: string) {
  // match on text between brackets i.e. <a ...>Match</a>
  const match = markup.match(/>.*?</i);
  if (!match) return false;
  // remove > and < surrounding the text
  return match[0].slice(1, -1);
}
