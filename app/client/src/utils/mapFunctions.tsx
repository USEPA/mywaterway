import { render } from 'react-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { css } from 'styled-components/macro';
import Color from '@arcgis/core/Color';
import Point from '@arcgis/core/geometry/Point';
import Graphic from '@arcgis/core/Graphic';
import PopupTemplate from '@arcgis/core/PopupTemplate';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
// components
import { monitoringClusterSettings } from 'components/shared/LocationMap';
import { MapPopup } from 'components/shared/WaterbodyInfo';
import WaterbodyIcon from 'components/shared/WaterbodyIcon';
// styles
import { colors } from 'styles/index.js';
// utilities
import { getSelectedCommunityTab } from 'utils/utils';
// types
import type { NavigateFunction } from 'react-router-dom';
import type {
  ChangeLocationAttributes,
  ClickedHucState,
  Facility,
  Feature,
  FetchState,
  ExtendedLayer,
  MonitoringLocationAttributes,
  MonitoringLocationsData,
  ParentLayer,
  PopupAttributes,
  ScaledLayer,
  ServicesState,
  SuperLayer,
  TribeAttributes,
  VillageAttributes,
  WaterbodyAttributes,
} from 'types';

const waterbodyStatuses = {
  good: { condition: 'good', label: 'Good' },
  polluted: { condition: 'polluted', label: 'Impaired' },
  unassessed: { condition: 'unassessed', label: 'Condition Unknown' },
  notApplicable: { condition: 'hidden', label: 'Not Applicable' },
} as const;

type WaterbodyStatus = typeof waterbodyStatuses[keyof typeof waterbodyStatuses];

const waterbodyOverallStatuses = {
  ...waterbodyStatuses,
  polluted: { condition: 'polluted', label: 'Impaired (Issues Identified)' },
} as const;

type WaterbodyOverallStatus =
  typeof waterbodyOverallStatuses[keyof typeof waterbodyOverallStatuses];

// Gets the type of symbol using the shape's attributes.
export function getTypeFromAttributes(graphic: __esri.Graphic) {
  let type = 'point';
  if (graphic.attributes.Shape_Length && graphic.attributes.Shape_Area) {
    type = 'polygon';
  } else if (graphic.attributes.Shape_Length) {
    type = 'polyline';
  }

  return type;
}

export function getWaterbodyCondition<
  Type extends WaterbodyAttributes,
  Key extends keyof Type,
>(
  attributes: Type,
  fieldName: Key | null | undefined,
  showNulls: boolean = false,
): WaterbodyStatus | WaterbodyOverallStatus {
  // when no fieldName is provided, use the isassessed/isimpaired logic
  const statusValue = fieldName
    ? attributes[fieldName]
    : attributes.overallstatus;
  const statuses = fieldName ? waterbodyStatuses : waterbodyOverallStatuses;

  if (!statusValue) {
    if (showNulls) return statuses.unassessed;
    else return statuses.notApplicable;
  } else if (statusValue === 'Not Supporting') {
    return statuses.polluted;
  } else if (statusValue === 'Fully Supporting') {
    return statuses.good;
  } else if (statusValue === 'Cause') {
    return statuses.polluted;
  } else if (statusValue === 'Meeting Criteria') {
    return statuses.good;
  } else {
    return statuses.unassessed;
  }
}

export function createUniqueValueInfos(
  geometryType: string,
  alpha: {
    base: number;
    poly: number;
    outline: number;
  } | null,
) {
  return [
    {
      value: `Fully Supporting`,
      symbol: createWaterbodySymbol({
        condition: 'good',
        selected: false,
        geometryType,
        alpha,
      }),
    },
    {
      value: `Not Supporting`,
      symbol: createWaterbodySymbol({
        condition: 'polluted',
        selected: false,
        geometryType,
        alpha,
      }),
    },
    {
      value: `Insufficient Information`,
      symbol: createWaterbodySymbol({
        condition: 'unassessed',
        selected: false,
        geometryType,
        alpha,
      }),
    },
    {
      value: `Not Assessed`,
      symbol: createWaterbodySymbol({
        condition: 'unassessed',
        selected: false,
        geometryType,
        alpha,
      }),
    },
    {
      value: `Meeting Criteria`,
      symbol: createWaterbodySymbol({
        condition: 'good',
        selected: false,
        geometryType,
        alpha,
      }),
    },
    {
      value: `Cause`,
      symbol: createWaterbodySymbol({
        condition: 'polluted',
        selected: false,
        geometryType,
        alpha,
      }),
    },
    {
      value: `Y`,
      symbol: createWaterbodySymbol({
        condition: 'nostatus',
        selected: false,
        geometryType,
        alpha,
      }),
    },
    {
      value: `N`,
      symbol: createWaterbodySymbol({
        condition: 'hidden',
        selected: false,
        geometryType,
        alpha,
      }),
    },
  ];
}

export function createUniqueValueInfosRestore(
  geometryType: string,
  alpha: {
    base: number;
    poly: number;
    outline: number;
  } | null,
) {
  return [
    {
      value: `N, N, N`,
      symbol: createWaterbodySymbol({
        condition: 'hidden',
        selected: false,
        geometryType,
        alpha,
      }),
    },
    {
      value: `N, N, Y`,
      symbol: createWaterbodySymbol({
        condition: 'nostatus',
        selected: false,
        geometryType,
        alpha,
      }),
    },
    {
      value: `N, Y, N`,
      symbol: createWaterbodySymbol({
        condition: 'nostatus',
        selected: false,
        geometryType,
        alpha,
      }),
    },
    {
      value: `N, Y, Y`,
      symbol: createWaterbodySymbol({
        condition: 'nostatus',
        selected: false,
        geometryType,
        alpha,
      }),
    },
    {
      value: `Y, N, N`,
      symbol: createWaterbodySymbol({
        condition: 'nostatus',
        selected: false,
        geometryType,
        alpha,
      }),
    },
    {
      value: `Y, N, Y`,
      symbol: createWaterbodySymbol({
        condition: 'nostatus',
        selected: false,
        geometryType,
        alpha,
      }),
    },
    {
      value: `Y, Y, N`,
      symbol: createWaterbodySymbol({
        condition: 'nostatus',
        selected: false,
        geometryType,
        alpha,
      }),
    },
    {
      value: `Y, Y, Y`,
      symbol: createWaterbodySymbol({
        condition: 'hidden',
        selected: false,
        geometryType,
        alpha,
      }),
    },
  ];
}

// utility function to create an ESRI MarkerSymbol for a Waterbody
export function createWaterbodySymbolSvg({
  condition,
  selected,
}: {
  condition: 'good' | 'polluted' | 'unassessed';
  selected: boolean;
}) {
  const markup = renderToStaticMarkup(
    <WaterbodyIcon condition={condition} selected={selected} />,
  );

  return {
    type: 'picture-marker', // autocasts as new PictureMarkerSymbol()
    url: `data:image/svg+xml;base64,${encode(markup)}`,
    width: '26px',
    height: '26px',
    condition: condition,
  };
}

export function createWaterbodySymbol({
  condition,
  selected,
  geometryType = 'point',
  alpha = null,
}: {
  condition: 'good' | 'polluted' | 'unassessed' | 'nostatus' | 'hidden';
  selected: boolean;
  geometryType: string;
  alpha?: {
    base: number;
    poly: number;
    outline: number;
  } | null;
}) {
  const outline = selected
    ? { color: [0, 255, 255, alpha ? alpha.outline : 0.5], width: 1 }
    : { color: [0, 0, 0, alpha ? alpha.outline : 1], width: 1 };

  // from colors.highlightedPurple() and colors.purple()
  let rgb = selected ? { r: 84, g: 188, b: 236 } : { r: 107, g: 65, b: 149 };
  if (condition === 'good') {
    // from colors.highlightedGreen() and colors.green()
    rgb = selected ? { r: 70, g: 227, b: 159 } : { r: 32, g: 128, b: 12 };
  }
  if (condition === 'polluted') {
    // from colors.highlightedRed() and colors.red()
    rgb = selected ? { r: 124, g: 157, b: 173 } : { r: 203, g: 34, b: 62 };
  }
  if (condition === 'nostatus') {
    rgb = selected ? { r: 93, g: 153, b: 227 } : { r: 0, g: 123, b: 255 };
  }

  let color = new Color(rgb);
  // for polygons, add transparency to the color so that lines can be seen
  if (geometryType === 'polygon') color.a = 0.75;
  if (alpha) {
    color.a = alpha.base;
    if (geometryType === 'polygon') color.a = alpha.poly;
  }

  let symbol = new SimpleMarkerSymbol({
    color,
    size: 14,
    style: 'triangle',
    outline,
  });

  if (condition === 'hidden') {
    symbol.outline = new SimpleLineSymbol({ color: [0, 0, 0, 0], width: 0 });
    symbol.color.setColor([0, 0, 0, 0]);
    return symbol;
  }

  if (geometryType === 'point') {
    symbol.outline = new SimpleLineSymbol({
      width: 0.65,
    });
    if (condition === 'good' || condition === 'nostatus') {
      symbol.style = 'circle';
    }

    if (condition === 'polluted') {
      symbol.style = 'path';
      symbol.path =
        'M17.14 3 8.86 3 3 8.86 3 17.14 8.86 23 17.14 23 23 17.14 23 8.86 17.14 3z';
    }

    return symbol;
  }

  if (geometryType === 'polyline') {
    return new SimpleLineSymbol({
      color,
      width: 3,
    });
  }

  if (geometryType === 'polygon') {
    const polyOutline = selected
      ? { color: [0, 255, 255, alpha ? alpha.outline : 0.5], width: 3 }
      : undefined;

    return new SimpleFillSymbol({
      color,
      style: 'solid',
      outline: polyOutline,
    });
  }
}

function encode(str: string): string {
  return Buffer.from(str, 'binary').toString('base64');
}

// Functions used for narrowing types
export function hasSublayers(layer: __esri.Layer): layer is SuperLayer {
  return 'sublayers' in layer;
}

export function isClassBreaksRenderer(
  renderer: __esri.Renderer,
): renderer is __esri.ClassBreaksRenderer {
  return (renderer as __esri.ClassBreaksRenderer).type === 'class-breaks';
}

export function isFeatureLayer(
  layer: __esri.Layer,
): layer is __esri.FeatureLayer {
  return (layer as __esri.FeatureLayer).type === 'feature';
}

export function isGraphicsLayer(
  layer: __esri.Layer,
): layer is __esri.GraphicsLayer {
  return (layer as __esri.GraphicsLayer).type === 'graphics';
}

export function isGroupLayer(layer: __esri.Layer): layer is __esri.GroupLayer {
  return (layer as __esri.GroupLayer).type === 'group';
}

type HighlightLayerView = __esri.FeatureLayerView | __esri.GraphicsLayerView;

export function isHighlightLayerView(
  layerView: __esri.LayerView,
): layerView is HighlightLayerView {
  return (
    (layerView as HighlightLayerView).layer.type === 'feature' ||
    (layerView as HighlightLayerView).layer.type === 'graphics'
  );
}

export function isMapImageLayer(
  layer: __esri.Layer,
): layer is __esri.MapImageLayer {
  return (layer as __esri.MapImageLayer).type === 'map-image';
}

export function isMediaLayer(layer: __esri.Layer): layer is __esri.MediaLayer {
  return (layer as __esri.MediaLayer).type === 'media';
}

export function isMultipoint(
  geometry: __esri.Geometry,
): geometry is __esri.Multipoint {
  return (geometry as __esri.Multipoint).type === 'multipoint';
}

export function isPoint(geometry: __esri.Geometry): geometry is __esri.Point {
  return (geometry as __esri.Point).type === 'point';
}

export function isPolygon(
  geometry: __esri.Geometry,
): geometry is __esri.Polygon {
  return (geometry as __esri.Polygon).type === 'polygon';
}

export function isPolyline(
  geometry: __esri.Geometry,
): geometry is __esri.Polyline {
  return (geometry as __esri.Polyline).type === 'polyline';
}

export function isTileLayer(layer: __esri.Layer): layer is __esri.TileLayer {
  return (layer as __esri.TileLayer).type === 'tile';
}

export function isUniqueValueRenderer(
  renderer: __esri.Renderer,
): renderer is __esri.UniqueValueRenderer {
  return (renderer as __esri.UniqueValueRenderer).type === 'unique-value';
}

function isVillage(
  tribe: TribeAttributes | VillageAttributes,
): tribe is VillageAttributes {
  return (tribe as VillageAttributes).NAME !== undefined;
}

// plot issues on map
export function plotIssues(
  features: __esri.Graphic[],
  layer: any,
  navigate: NavigateFunction,
) {
  if (!features || !layer) return;

  // clear the layer
  layer.graphics.removeAll();
  // put graphics on the layer
  features.forEach((waterbody) => {
    const geometryType = getTypeFromAttributes(waterbody);
    layer.graphics.add(
      new Graphic({
        geometry: waterbody.geometry,

        symbol: createWaterbodySymbol({
          condition: 'polluted',
          selected: false,
          geometryType,
        }),
        attributes: {
          ...waterbody.attributes,
          fieldName: null,
        },
        popupTemplate: {
          title: getPopupTitle(waterbody.attributes),
          content: (feature: Feature) =>
            getPopupContent({
              feature: feature.graphic,
              navigate,
            }),
        },
      }),
    );
  });
}

// plot facilities on map
export function plotFacilities({
  facilities,
  layer,
  navigate,
}: {
  facilities: Facility[];
  layer: any;
  navigate: NavigateFunction;
}) {
  if (!facilities || !layer) return;

  // clear the layer
  layer.graphics.removeAll();

  // put graphics on the layer
  facilities.forEach((facility) => {
    layer.graphics.add(
      new Graphic({
        geometry: new Point({
          longitude: parseFloat(facility['FacLong']),
          latitude: parseFloat(facility['FacLat']),
        }),
        symbol: new SimpleMarkerSymbol({
          color: colors.orange,
          style: 'diamond',
          size: 15,
          outline: {
            // width units differ between FeatureLayers and GraphicsLayers
            width: 0.65,
          },
        }),
        attributes: facility,
        popupTemplate: {
          title: getPopupTitle(facility),
          content: (feature: Feature) =>
            getPopupContent({
              feature: feature.graphic,
              navigate,
            }),
        },
      }),
    );
  });
}

export const openPopup = (
  view: __esri.MapView,
  feature: __esri.Graphic,
  fields: __esri.Field[],
  services: ServicesState,
  navigate: NavigateFunction,
) => {
  const fieldName = feature.attributes && feature.attributes.fieldName;

  // set the popup template
  if (
    !feature.popupTemplate ||
    (fieldName && fieldName !== 'hmw-extra-content')
  ) {
    feature.popupTemplate = new PopupTemplate({
      title: getPopupTitle(feature.attributes),
      content: (feature: Feature) =>
        getPopupContent({
          feature: feature.graphic,
          fields,
          fieldName,
          services,
          navigate,
        }),
    });
  }

  // get the location placement of the popup
  let popupPoint;
  const geometry = feature.geometry;
  if (isPolyline(geometry)) {
    const pointIndex = Math.round(geometry.paths[0].length / 2);
    popupPoint = geometry.getPoint(0, pointIndex);
  } else if (isPolygon(geometry)) {
    const pointIndex = Math.round(geometry.rings[0].length / 4);
    popupPoint = geometry.getPoint(0, pointIndex);
  } else if (isMultipoint(geometry)) {
    popupPoint = geometry.getPoint(0);
  } else {
    //point objects
    popupPoint = feature.geometry;
  }

  // open the popup
  view.popup.open({
    features: [feature],
    location: popupPoint,
  });
};

// map District and Territory organization IDs to their labels
const organizationMapping = {
  DOEE: 'District',
  PR_LAKES: 'Territory',
  USVIST: 'Territory',
  '21AQ': 'Territory',
  '21AS': 'Territory',
  '21GUAM': 'Territory',
};

export function getOrganizationLabel(
  attributes: { organizationid?: string; orgtype?: string } | undefined,
) {
  if (!attributes) return 'Waterbody ID:';

  const { organizationid, orgtype } = attributes;
  for (const [key, value] of Object.entries(organizationMapping)) {
    if (key === organizationid) return `${value} Waterbody ID:`;
  }
  if (orgtype === 'Tribe') return 'Tribal Waterbody ID:';
  if (orgtype === 'State') return 'State Waterbody ID:';
  return 'Waterbody ID:'; // catch all
}

export function getPopupTitle(attributes: PopupAttributes | null) {
  let title = 'Unknown';

  if (!attributes) return title;

  // line, area, point for waterbody
  if ('assessmentunitname' in attributes) {
    title = `${attributes.assessmentunitname} (${getOrganizationLabel(
      attributes,
    )} ${attributes.assessmentunitidentifier})`;
  }

  // discharger
  else if ('CWPName' in attributes) {
    title = attributes.CWPName;
  }

  // monitoring station
  else if (
    'monitoringType' in attributes &&
    (attributes.monitoringType === 'Past Water Conditions' ||
      attributes.monitoringType === 'USGS Sensors')
  ) {
    title = attributes.locationName;
  }

  // protect tab teal nonprofits
  else if ('type' in attributes && attributes.type === 'nonprofit') {
    title = attributes.Name || 'Unknown name';
  }

  // county
  else if ('CNTY_FIPS' in attributes) {
    title = `${attributes.STATE_NAME} County ${attributes.CNTY_FIPS}`;
  }

  // congressional district
  else if ('DISTRICTID' in attributes) {
    title = `${attributes.STATE_ABBR} District ${attributes.CDFIPS}`;
  }

  // other tribal layers just use the tribe name
  else if ('TRIBE_NAME' in attributes) {
    // want to display name for Alaska Native Villages
    if (isVillage(attributes)) title = attributes.NAME;
    else title = attributes.TRIBE_NAME;
  }

  // want to display allotment for Alaska Native Allotments
  else if ('PARCEL_NO' in attributes) {
    title = attributes.PARCEL_NO;
  }

  // wild scenic rivers
  else if ('WSR_RIVER_NAME' in attributes) {
    title = attributes.WSR_RIVER_NAME;
  }

  // WSIO Health Index
  else if ('PHWA_HEALTH_NDX_ST' in attributes) {
    title = attributes.NAME_HUC12;
  }

  // Protected areas
  else if ('GAPCdSrc' in attributes) {
    title = attributes.Loc_Nm;
  }

  // EJSCREEN
  else if ('T_OVR64PCT' in attributes) {
    title = '';
  }

  // CyAN waterbody
  else if ('GNIS_NAME' in attributes) {
    title = attributes.GNIS_NAME;
  }

  return title;
}

export function getPopupContent({
  feature,
  fieldName,
  extraContent,
  getClickedHuc,
  mapView,
  resetData,
  services,
  fields,
  navigate,
}: {
  feature: __esri.Graphic | { attributes: ChangeLocationAttributes };
  fieldName?: string;
  extraContent?: Object;
  getClickedHuc?: Promise<ClickedHucState> | null;
  mapView?: __esri.MapView;
  resetData?: () => void;
  services?: ServicesState;
  fields?: __esri.Field[] | null;
  navigate: NavigateFunction;
}) {
  let type = 'Unknown';
  const attributes: PopupAttributes | null = feature.attributes;
  if (!attributes) return null;

  // stand alone change location popup
  if ('changelocationpopup' in attributes) {
    type = 'Change Location';
  } else if ('layer' in feature) {
    // actions popup (has the same attributes as waterbody and an additional
    // layerType attribute)
    if ('layerType' in attributes && attributes.layerType === 'actions') {
      type = 'Action';
    }

    // line, area, point for waterbody
    else if ('assessmentunitname' in attributes) {
      const communityTab = getSelectedCommunityTab();
      const pathname = window.location.pathname;
      const parent = (feature.layer as ExtendedLayer)?.parent;
      const isAllWaterbodiesLayer =
        parent && 'id' in parent && parent.id === 'allWaterbodiesLayer';

      type = 'Waterbody';
      if (pathname.includes('advanced-search'))
        type = 'Waterbody State Overview';
      if (!isAllWaterbodiesLayer) {
        if (communityTab === 'restore') type = 'Restoration Plans';
        if (communityTab === 'protect') type = 'Protection Plans';
      }
    }

    // discharger
    else if ('CWPName' in attributes) {
      type = 'Permitted Discharger';
    }

    // CyAN waterbody
    else if ('GNIS_NAME' in attributes) {
      type = 'CyAN';
    }

    // usgs streamgage or monitoring location
    else if ('monitoringType' in attributes) {
      if (attributes.monitoringType === 'USGS Sensors') type = 'USGS Sensors';
      else if (attributes.monitoringType === 'Past Water Conditions')
        type = 'Past Water Conditions';
    }

    // protect tab teal nonprofits
    else if ('type' in attributes && attributes.type === 'nonprofit') {
      type = 'Nonprofit';
    }

    // county
    else if ('CNTY_FIPS' in attributes) {
      type = 'County';
    }

    // congressional district
    else if ('DISTRICTID' in attributes) {
      type = 'Congressional District';
    }

    // Alaska Native Village or other tribal feature
    else if ('TRIBE_NAME' in attributes) {
      if ('NAME' in attributes) type = 'Alaska Native Village';
      else type = 'Tribe';
    }

    // upstream watershed
    else if ('xwalk_huc12' in attributes) {
      type = 'Upstream Watershed';
    }

    // wild scenic rivers
    else if ('WSR_RIVER_NAME' in attributes) {
      type = 'Wild and Scenic Rivers';
    }

    // WSIO Health Index
    else if ('PHWA_HEALTH_NDX_ST' in attributes) {
      type = 'State Watershed Health Index';
    }

    // Protected areas
    else if ('GAPCdSrc' in attributes) {
      type = 'Protected Areas';
    }

    // EJSCREEN
    else if ('T_OVR64PCT' in attributes) {
      type = 'Demographic Indicators';
    }
  }

  const content = (
    <MapPopup
      type={type}
      feature={feature}
      fieldName={fieldName}
      extraContent={extraContent}
      getClickedHuc={getClickedHuc}
      mapView={mapView}
      resetData={resetData}
      services={services}
      fields={fields}
      navigate={navigate}
    />
  );

  // wrap the content for esri
  const contentContainer = document.createElement('div');
  render(content, contentContainer);

  // return an esri popup item
  return contentContainer;
}

export function getUniqueWaterbodies(waterbodies: __esri.Graphic[]) {
  if (!waterbodies) return [];

  const flags: { [key: string]: boolean } = {};
  return waterbodies.filter((waterbody) => {
    if (!waterbody?.attributes) return false;

    const orgid = waterbody.attributes.organizationidentifier;
    const auid = waterbody.attributes.assessmentunitidentifier;
    const key = `${orgid}${auid}`;
    if (key in flags) return false;
    flags[key] = true;
    return true;
  });
}

type MaybeObject = {
  [key: string]: any;
} | null;

// helper function for doing shallow comparisons of objects
export function shallowCompare(obj1: MaybeObject, obj2: MaybeObject) {
  if (!obj1 || !obj2) return obj1 === obj2;

  return (
    Object.keys(obj1).length === Object.keys(obj2).length &&
    Object.keys(obj1).every(
      (key) =>
        obj2.hasOwnProperty(key) &&
        typeof obj1[key] === typeof obj2[key] &&
        (typeof obj1[key] === 'object' || obj1[key] === obj2[key]),
    )
  );
}

// used for shallow comparing graphics attributes to see if the are the same.
export function graphicComparison(
  graphic1?: __esri.Graphic | null,
  graphic2?: __esri.Graphic | null,
) {
  if (!graphic1 && !graphic2) return true; // no change

  // change occurred
  if (
    (graphic1 && graphic1.attributes && !graphic2) ||
    (graphic1 && graphic1.attributes && graphic2 && !graphic2.attributes) ||
    (graphic2 && graphic2.attributes && !graphic1) ||
    (graphic2 && graphic2.attributes && graphic1 && !graphic1.attributes) ||
    !shallowCompare(graphic1?.attributes, graphic2?.attributes)
  ) {
    return false;
  }

  return true;
}

const tickMarkStyles = css`
  display: flex;
  align-items: center;
  width: 100%;

  ::before {
    content: '';
    width: 4px;
    height: 1px;
    background-color: #999;
  }

  p {
    padding-left: 0.25em;
    font-size: 0.875em !important;
  }
`;

export function GradientIcon({
  id,
  stops,
}: {
  id: string;
  stops: Array<{ label: string; color: string }>;
}) {
  const divisions = stops.length - 1;
  return (
    <div css={{ display: 'flex', margin: 'auto' }}>
      <div css={{ margin: '15px 0', border: '1px solid #999' }}>
        <svg width={20} height={30 * divisions}>
          <defs>
            <linearGradient
              id={id}
              x1={0}
              y1={0}
              x2={0}
              y2={30 * divisions}
              gradientUnits="userSpaceOnUse"
            >
              {stops.map((stop, index) => (
                <stop
                  key={stop.label}
                  offset={index / divisions}
                  stopColor={stop.color}
                />
              ))}
            </linearGradient>
          </defs>

          <rect
            x={0}
            y={0}
            width={20}
            height={30 * divisions}
            fill={`url(#${id})`}
          />
        </svg>
      </div>

      <div css={{ display: 'flex', flexWrap: 'wrap', width: '45px' }}>
        {stops.map((stop) => (
          <div key={stop.label} css={tickMarkStyles}>
            <p>{stop.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Gets the highlight symbol styles based on the provided geometry.
export function getHighlightSymbol(
  geometry: __esri.Geometry,
  options: __esri.MapViewHighlightOptions,
) {
  let symbol: __esri.Symbol | null = null;
  if (isPolyline(geometry)) {
    return new SimpleLineSymbol({
      width: 5,
      color: new Color({ ...options.haloColor, a: options.haloOpacity }),
    });
  } else if (isPolygon(geometry)) {
    return new SimpleFillSymbol({
      outline: {
        color: new Color({ ...options.haloColor, a: options.haloOpacity }),
        width: 2,
      },
      color: new Color({ ...options.color, a: options.fillOpacity }),
      style: 'solid',
    });
  } else if (isPoint(geometry) || isMultipoint(geometry)) {
    return new SimpleMarkerSymbol({
      outline: {
        color: new Color({ ...options.haloColor, a: options.haloOpacity }),
        width: 2,
      },
      color: new Color({ ...options.color, a: options.fillOpacity }),
    });
  }

  return symbol;
}

// helper method used in handleMapZoomChange() for determining a map layer’s listMode
export function isInScale(
  layer: __esri.Layer | ParentLayer | ScaledLayer,
  scale: number,
) {
  let inScale = true;
  let minScale = 0;
  let maxScale = 0;

  // get the extreme min and max scales of the layer
  if ('sublayers' in layer && 'sourceJSON' in layer) {
    // get sublayers included in the parentlayer
    // note: the sublayer has maxScale and minScale, but these are always 0
    //       even if the sublayer does actually have a min/max scale.
    const sublayerIds: number[] = [];
    layer.sublayers.forEach((sublayer) => {
      if ('id' in sublayer) sublayerIds.push(sublayer.id);
    });

    // get the min/max scale from the sourceJSON
    layer.sourceJSON?.layers.forEach(
      (sourceLayer: __esri.Sublayer | __esri.SubtypeSublayer) => {
        if (!('id' in sourceLayer) || !sublayerIds.includes(sourceLayer.id))
          return;

        if (sourceLayer.minScale === 0 || sourceLayer.minScale > minScale) {
          minScale = sourceLayer.minScale;
        }
        if (sourceLayer.maxScale === 0 || sourceLayer.maxScale < maxScale) {
          maxScale = sourceLayer.maxScale;
        }
      },
    );
  } else if (isGroupLayer(layer)) {
    // get the min/max scale from the sublayers
    layer.layers.forEach((subLayer: ScaledLayer) => {
      if (
        subLayer.minScale &&
        (subLayer.minScale === 0 || subLayer.minScale > minScale)
      ) {
        minScale = subLayer.minScale;
      }
      if (
        subLayer.maxScale &&
        (subLayer.maxScale === 0 || subLayer.maxScale < maxScale)
      ) {
        maxScale = subLayer.maxScale;
      }
    });
  } else if ('minScale' in layer && 'maxScale' in layer) {
    minScale = layer.minScale ?? 0;
    maxScale = layer.maxScale ?? 0;
  }

  // check if the map zoom is within scale
  if (minScale > 0 || maxScale > 0) {
    if (maxScale > 0 && minScale > 0) {
      inScale = maxScale <= scale && scale <= minScale;
    } else if (maxScale > 0) {
      inScale = maxScale <= scale;
    } else if (minScale > 0) {
      inScale = scale <= minScale;
    }
  }

  return inScale;
}

const editLayer = async (
  layer: __esri.FeatureLayer,
  graphics: __esri.Graphic[],
) => {
  const featureSet = await layer.queryFeatures();
  const edits = {
    deleteFeatures: featureSet.features,
    addFeatures: graphics,
  };
  return layer.applyEdits(edits);
};

function stringifyAttributes(
  structuredAttributes: string[],
  attributes: { [property: string]: any },
) {
  const stringified: { [property: string]: string } = {};
  for (const property of structuredAttributes) {
    try {
      stringified[property] = JSON.stringify(attributes[property]);
    } catch {
      stringified[property] = attributes[property];
    }
  }
  return { ...attributes, ...stringified };
}

export function buildStations(
  locations: FetchState<MonitoringLocationsData>,
  layer: __esri.Layer,
) {
  if (!layer) return;
  if (locations.status !== 'success' || !locations.data.features?.length) {
    return;
  }

  // sort descending order so that smaller graphics show up on top
  const stationsSorted = [...locations.data.features];
  stationsSorted.sort((a, b) => {
    return (
      parseInt(b.properties.resultCount) - parseInt(a.properties.resultCount)
    );
  });

  // attributes common to both the layer and the context object
  return stationsSorted.map((station) => {
    return {
      monitoringType: 'Past Water Conditions' as const,
      siteId: station.properties.MonitoringLocationIdentifier,
      orgId: station.properties.OrganizationIdentifier,
      orgName: station.properties.OrganizationFormalName,
      locationLongitude: station.geometry.coordinates[0],
      locationLatitude: station.geometry.coordinates[1],
      locationName: station.properties.MonitoringLocationName,
      locationType: station.properties.MonitoringLocationTypeName,
      // TODO: explore if the built up locationUrl below is ever different from
      // `station.properties.siteUrl`. from a quick test, they seem the same
      locationUrl:
        `/monitoring-report/` +
        `${station.properties.ProviderName}/` +
        `${encodeURIComponent(station.properties.OrganizationIdentifier)}/` +
        `${encodeURIComponent(
          station.properties.MonitoringLocationIdentifier,
        )}/`,
      // monitoring station specific properties:
      stationDataByYear: null,
      stationProviderName: station.properties.ProviderName,
      stationTotalSamples: parseInt(station.properties.activityCount),
      stationTotalMeasurements: parseInt(station.properties.resultCount),
      // counts for each lower-tier characteristic group
      stationTotalsByGroup: station.properties.characteristicGroupResultCount,
      stationTotalsByLabel: null,
      timeframe: null,
      // create a unique id, so we can check if the monitoring station has
      // already been added to the display (since a monitoring station id
      // isn't universally unique)
      uniqueId:
        `${station.properties.MonitoringLocationIdentifier}-` +
        `${station.properties.ProviderName}-` +
        `${station.properties.OrganizationIdentifier}`,
    };
  });
}

/*
 * Helpers for passing data to the map layers
 */
export function updateMonitoringLocationsLayer(
  stations: MonitoringLocationAttributes[],
  layer: __esri.FeatureLayer,
) {
  const structuredProps = ['stationTotalsByGroup', 'timeframe'];
  const graphics = stations.map((station) => {
    const attributes = stringifyAttributes(structuredProps, station);
    return new Graphic({
      geometry: new Point({
        longitude: attributes.locationLongitude,
        latitude: attributes.locationLatitude,
      }),
      attributes: {
        ...attributes,
      },
    });
  });
  editLayer(layer, graphics);

  if (layer.id !== 'surroundingMonitoringLocationsLayer') {
    // turn off clustering if there are 20 or less stations
    // @ts-ignore
    layer.featureReduction =
      graphics.length > 20 ? monitoringClusterSettings : null;
  }
}
