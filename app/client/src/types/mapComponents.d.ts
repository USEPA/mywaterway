/*
  @arcgis/map-components ships no types for these components. We only need the
  static Lit seeds each instance's adoptedStyleSheets from.
*/
declare module '@arcgis/map-components/components/arcgis-basemap-gallery-item' {
  export const ArcgisBasemapGalleryItem: {
    // Lit's Array<CSSResultOrNative>
    elementStyles: unknown[];
  };
}

declare module '@arcgis/map-components/components/arcgis-legend-classic-view' {
  export const LegendClassicView: {
    elementStyles: unknown[];
  };
}
