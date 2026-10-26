/*
 * Popup content renders inside a shadow root (see HmwPopupContent in
 * mapFunctions.tsx), where document stylesheets do not reach. Our content still
 * leans on global classes, so mirror just those into the root.
 *
 * Deliberately excluded:
 *   epa.css      1.1MB, and its relative url(../fonts/..) would rebase against
 *                the document. Its @font-face rules already apply inside shadow
 *                roots, and it defines none of the classes popups use.
 *   esri main.css  styles Esri's own popup markup in the <arcgis-map> shadow
 *                root, which is a different root from ours.
 *   emotion      popup css props go through the popup cache, not the app one.
 */
import mapStyles from 'styles/mapStyles.css?inline';

// keep in sync with the <link> in index.html
const bootstrapHref =
  'https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css';

let sheets: CSSStyleSheet[] | null = null;
let mapSheet: CSSStyleSheet | null = null;
let needsBootstrapLink = false;

function toSheet(css: string) {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  return sheet;
}

/*
 * adoptedStyleSheets cascade after emotion's popup styles, so adopting these
 * unlayered would flip every tie they lose in the document. Unlayered rules beat
 * layered ones.
 */
function layered(css: string) {
  return toSheet(`@layer global { ${css} }`);
}

// one sheet object, adopted by both roots -- parsed once either way
function mapStylesSheet() {
  mapSheet ??= toSheet(mapStyles);
  return mapSheet;
}

function adopt(root: ShadowRoot, adopting: CSSStyleSheet[]) {
  const missing = adopting.filter(
    (sheet) => !root.adoptedStyleSheets.includes(sheet),
  );
  if (missing.length) {
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, ...missing];
  }
}

function readSheet(href: string) {
  const sheet = Array.from(document.styleSheets).find((s) => s.href === href);
  try {
    return sheet
      ? Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join('')
      : null;
  } catch (err) {
    // Only throws for a cross-origin sheet whose <link> is missing crossorigin="anonymous", which is ours to fix.
    console.error(`Could not read the rules of ${href}`, err);
    return null;
  }
}

function globalSheets() {
  if (sheets) return sheets;

  const bootstrap = readSheet(bootstrapHref);
  const overrides = document.getElementById('hmw-global-styles')?.textContent;
  const built = [
    ...[bootstrap, overrides]
      .filter((css): css is string => Boolean(css))
      .map(layered),
    mapStylesSheet(),
  ];

  // A <link> that has not finished loading exposes no rules yet, so don't cache the miss.
  // Cover it with a <link> in the root until it does.
  needsBootstrapLink = !bootstrap;
  if (bootstrap) sheets = built;

  return built;
}

/**
 * Constructed sheets are parsed once and shared by every root that adopts them,
 * so this stays cheap as popups open and close.
 */
export function adoptGlobalStyles(root: ShadowRoot) {
  adopt(root, globalSheets());

  if (needsBootstrapLink && !root.querySelector('link[rel="stylesheet"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = bootstrapHref;
    root.appendChild(link);
  }
}

// Revive the .esri-popup__* selectors in <arcgis-map>'s shadow root.
export function adoptMapStyles(root: ShadowRoot) {
  adopt(root, [mapStylesSheet()]);
}
