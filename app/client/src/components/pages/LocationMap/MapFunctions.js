// @flow

import React from 'react';
import ReactDOM from 'react-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { css } from 'styled-components/macro';
import Graphic from '@arcgis/core/Graphic';
// components
import WaterbodyIcon from 'components/shared/WaterbodyIcon';
import WaterbodyInfo from 'components/shared/WaterbodyInfo';
// styles
import { colors } from 'styles/index.js';
// utilities
import { getSelectedCommunityTab } from 'utils/utils';

const waterbodyStatuses = {
  good: { condition: 'good', label: 'Good' },
  polluted: { condition: 'polluted', label: 'Impaired' },
  unassessed: { condition: 'unassessed', label: 'Condition Unknown' },
  notApplicable: { condition: 'hidden', label: 'Not Applicable' },
};

// Gets the type of symbol using the shape's attributes.
export function getTypeFromAttributes(graphic) {
  let type = 'point';
  if (graphic.attributes.Shape_Length && graphic.attributes.Shape_Area) {
    type = 'polygon';
  } else if (graphic.attributes.Shape_Length) {
    type = 'polyline';
  }

  return type;
}

export function getWaterbodyCondition(
  attributes: Object,
  fieldName: string,
  showNulls: boolean = false,
) {
  // when no fieldName is provided, use the isassessed/isimpaired logic
  const statusValue = fieldName
    ? attributes[fieldName]
    : attributes.overallstatus;

  if (!statusValue) {
    if (showNulls) return waterbodyStatuses.unassessed;
    else return waterbodyStatuses.notApplicable;
  } else if (statusValue === 'Not Supporting') {
    return waterbodyStatuses.polluted;
  } else if (statusValue === 'Fully Supporting') {
    return waterbodyStatuses.good;
  } else if (statusValue === 'Cause') {
    return waterbodyStatuses.polluted;
  } else if (statusValue === 'Meeting Criteria') {
    return waterbodyStatuses.good;
  } else {
    return waterbodyStatuses.unassessed;
  }
}

export function createUniqueValueInfos(
  geometryType: string,
  alpha: {
    base: number,
    poly: number,
    outline: number,
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
    base: number,
    poly: number,
    outline: number,
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
  condition: 'good' | 'polluted' | 'unassessed',
  selected: boolean,
}) {
  const markup = renderToStaticMarkup(
    <WaterbodyIcon condition={condition} selected={selected} />,
  );

  return {
    type: 'picture-marker', // autocasts as new PictureMarkerSymbol()
    url: `data:image/svg+xml;base64,${btoa(markup)}`,
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
  condition: 'good' | 'polluted' | 'unassessed' | 'nostatus' | 'hidden',
  selected: boolean,
  geometryType: string,
  alpha: {
    base: number,
    poly: number,
    outline: number,
  } | null,
}) {
  const outline = selected
    ? { color: [0, 255, 255, alpha ? alpha.outline : 0.5], width: 1 }
    : { color: [0, 0, 0, alpha ? alpha.outline : 1], width: 1 };

  // from colors.highlightedPurple() and colors.purple()
  let color = selected ? { r: 84, g: 188, b: 236 } : { r: 107, g: 65, b: 149 };
  if (condition === 'good') {
    // from colors.highlightedGreen() and colors.green()
    color = selected ? { r: 70, g: 227, b: 159 } : { r: 32, g: 128, b: 12 };
  }
  if (condition === 'polluted') {
    // from colors.highlightedRed() and colors.red()
    color = selected ? { r: 124, g: 157, b: 173 } : { r: 203, g: 34, b: 62 };
  }
  if (condition === 'nostatus') {
    color = selected ? { r: 93, g: 153, b: 227 } : { r: 0, g: 123, b: 255 };
  }

  // for polygons, add transparency to the color so that lines can be seen
  if (geometryType === 'polygon') color.a = 0.75;
  if (alpha) {
    color.a = alpha.base;
    if (geometryType === 'polygon') color.a = alpha.poly;
  }

  let symbol = {
    type: 'simple-marker', // autocasts as new SimpleMarkerSymbol()
    color,
    size: 14,
    style: 'triangle',
    outline,
    condition,
  };

  if (condition === 'hidden') {
    symbol.outline = { color: [0, 0, 0, 0], width: 0 };
    symbol.color = [0, 0, 0, 0];
    return symbol;
  }

  if (geometryType === 'point') {
    if (condition === 'good' || condition === 'nostatus') {
      symbol.style = 'circle';
    }

    if (condition === 'polluted') {
      //internet explorer does not support the path style
      if (isIE()) {
        symbol.style = 'circle';
      } else {
        symbol.style = 'path';
        symbol.path =
          'M17.14 3 8.86 3 3 8.86 3 17.14 8.86 23 17.14 23 23 17.14 23 8.86 17.14 3z';
      }
    }

    return symbol;
  }

  if (geometryType === 'polyline') {
    return {
      type: 'simple-line', // autocasts as SimpleLineSymbol() or SimpleFillSymbol()
      color,
      width: 3,
    };
  }

  if (geometryType === 'polygon') {
    const polyOutline = selected
      ? { color: [0, 255, 255, alpha ? alpha.outline : 0.5], width: 3 }
      : null;

    return {
      type: 'simple-fill', // autocasts as SimpleFillSymbol()
      color,
      width: 3,
      style: 'solid',
      outline: polyOutline,
    };
  }
}

export function isIE() {
  const ua = navigator.userAgent;
  /* MSIE used to detect old browsers and Trident used to newer ones*/
  return ua.indexOf('MSIE ') > -1 || ua.indexOf('Trident/') > -1;
}

// plot monitoring stations on map
export function plotStations(
  stations: Array<Object>,
  layer: any,
  services: Object,
) {
  if (!stations || !layer) return;

  layer.graphics.removeAll();

  stations.forEach((station) => {
    layer.graphics.add(
      new Graphic({
        geometry: {
          type: 'point',
          longitude: station.locationLongitude,
          latitude: station.locationLatitude,
        },
        symbol: {
          type: 'simple-marker',
          style: 'square',
          color: colors.lightPurple(),
        },
        attributes: station,
        popupTemplate: {
          title: getPopupTitle(station),
          content: getPopupContent({
            feature: { attributes: station },
            services,
          }),
        },
      }),
    );
  });
}

// plot usgs streamgages on map
export function plotGages(gages: Object[], layer: any) {
  if (!gages || !layer) return;

  const graphics = gages.map((gage) => {
    const gageHeightMeasurements = gage.streamgageMeasurements.primary.filter(
      (d) => d.parameterCode === '00065',
    );

    const gageHeight =
      gageHeightMeasurements.length === 1
        ? gageHeightMeasurements[0]?.measurement
        : null;

    return new Graphic({
      geometry: {
        type: 'point',
        longitude: gage.locationLongitude,
        latitude: gage.locationLatitude,
      },
      attributes: { gageHeight, ...gage },
    });
  });

  return layer.queryFeatures().then((featureSet) => {
    return layer.applyEdits({
      deleteFeatures: featureSet.features,
      addFeatures: graphics,
    });
  });
}

// plot issues on map
export function plotIssues(features: Array<Object>, layer: any) {
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
          content: getPopupContent({
            feature: { attributes: waterbody.attributes },
          }),
        },
      }),
    );
  });
}

// plot wild and scenic rivers on map
export function plotWildScenicRivers(features: Array<Object>, layer: any) {
  if (!features || !layer) return;

  // clear the layer
  layer.graphics.removeAll();
  // put graphics on the layer
  features.forEach((river) => {
    layer.graphics.add(
      new Graphic({
        geometry: river.geometry,
        symbol: {
          type: 'simple-line', // autocasts as SimpleLineSymbol() or SimpleFillSymbol()
          color: [0, 123, 255],
          width: 3,
        },
        attributes: {
          ...river.attributes,
          fieldName: null,
        },
        popupTemplate: {
          title: getPopupTitle(river.attributes),
          content: getPopupContent({
            feature: { attributes: river.attributes },
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
}: {
  facilities: Array<Object>,
  layer: any,
}) {
  if (!facilities || !layer) return;

  // clear the layer
  layer.graphics.removeAll();

  // put graphics on the layer
  facilities.forEach((facility) => {
    layer.graphics.add(
      new Graphic({
        geometry: {
          type: 'point', // autocasts as new Point()
          longitude: facility['FacLong'],
          latitude: facility['FacLat'],
        },
        symbol: {
          type: 'simple-marker', // autocasts as new SimpleMarkerSymbol()
          color: colors.orange,
          style: 'diamond',
          size: 15,
        },
        attributes: facility,
        popupTemplate: {
          title: getPopupTitle(facility),
          content: getPopupContent({ feature: { attributes: facility } }),
        },
      }),
    );
  });
}

export const openPopup = (
  view: Object,
  feature: Object,
  fields: Object,
  services: Object,
) => {
  const fieldName = feature.attributes && feature.attributes.fieldName;

  // set the popup template
  if (
    !feature.popupTemplate ||
    (fieldName && fieldName !== 'hmw-extra-content')
  ) {
    feature.popupTemplate = {
      title: getPopupTitle(feature.attributes),
      content: getPopupContent({ feature, fields, fieldName, services }),
    };
  }

  // get the location placement of the popup
  let popupPoint;
  if (feature.geometry.type === 'polyline') {
    const pointIndex = Math.round(feature.geometry.paths[0].length / 2);
    popupPoint = feature.geometry.getPoint(0, pointIndex);
  } else if (feature.geometry.type === 'polygon') {
    const pointIndex = Math.round(feature.geometry.rings[0].length / 4);
    popupPoint = feature.geometry.getPoint(0, pointIndex);
  } else if (feature.geometry.type === 'multipoint') {
    popupPoint = feature.geometry.getPoint(0);
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

export function getOrganizationLabel(attributes: Object) {
  if (!attributes) return 'Waterbody ID:';

  const mappedLabel = organizationMapping[attributes.organizationid];
  if (mappedLabel) return `${mappedLabel} Waterbody ID:`;
  if (attributes.orgtype === 'Tribe') return 'Tribal Waterbody ID:';
  if (attributes.orgtype === 'State') return 'State Waterbody ID:';
  return 'Waterbody ID:'; // catch all
}

export function getPopupTitle(attributes: Object) {
  let title = 'Unknown';

  if (!attributes) return title;

  // line, area, point for waterbody
  if (attributes.assessmentunitname) {
    title = `${attributes.assessmentunitname} (${getOrganizationLabel(
      attributes,
    )} ${attributes.assessmentunitidentifier})`;
  }

  // discharger
  else if (attributes.CWPName) {
    title = attributes.CWPName;
  }

  // monitoring station
  else if (
    attributes.monitoringType === 'Sample Location' ||
    attributes.monitoringType === 'Current Water Conditions'
  ) {
    title = attributes.locationName;
  }

  // protect tab teal nonprofits
  else if (attributes.type === 'nonprofit') {
    title = attributes.Name || 'Unknown name';
  }

  // county
  else if (attributes.CNTY_FIPS) {
    title = `${attributes.STATE_NAME} County ${attributes.CNTY_FIPS}`;
  }

  // congressional district
  else if (attributes.DISTRICTID) {
    title = `${attributes.STATE_ABBR} District ${attributes.CDFIPS}`;
  }

  // want to display name for Alaska Native Villages
  else if (attributes.NAME && attributes.TRIBE_NAME) {
    title = attributes.NAME;
  }

  // other tribal layers just use the tribe name
  else if (attributes.TRIBE_NAME) {
    title = attributes.TRIBE_NAME;
  }

  // want to display allotment for Alaska Native Allotments
  else if (attributes.PARCEL_NO) {
    title = attributes.PARCEL_NO;
  }

  // wild scenic rivers
  else if (attributes.WSR_RIVER_NAME) {
    title = attributes.WSR_RIVER_NAME;
  }

  // WSIO Health Index
  else if (attributes.PHWA_HEALTH_NDX_ST) {
    title = attributes.NAME_HUC12;
  }

  // Protected areas
  else if (attributes.GAPCdSrc) {
    title = attributes.Loc_Nm;
  }

  // EJSCREEN
  else if (attributes.T_OVR64PCT) {
    title = '';
  }

  return title;
}

export function getPopupContent({
  feature,
  fieldName,
  extraContent,
  getClickedHuc,
  resetData,
  services,
  fields,
}: {
  feature: Object,
  fieldName: ?string,
  extraContent: ?Object,
  getClickedHuc: ?Function,
  resetData: ?Function,
  services: ?Object,
  fields: ?Object,
}) {
  let type = 'Unknown';

  const attributes = feature.attributes;

  // actions popup (has the same attributes as waterbody and an additional
  // layerType attribute)
  if (attributes && attributes.layerType === 'actions') {
    type = 'Action';
  }

  // line, area, point for waterbody
  else if (attributes && attributes.assessmentunitname) {
    const communityTab = getSelectedCommunityTab();
    const pathname = document.location.pathname;
    const isAllWaterbodiesLayer =
      feature.layer?.parent?.id === 'allWaterbodiesLayer';

    type = 'Waterbody';
    if (pathname.includes('advanced-search')) type = 'Waterbody State Overview';
    if (!isAllWaterbodiesLayer) {
      if (communityTab === 'restore') type = 'Restoration Plans';
      if (communityTab === 'protect') type = 'Protection Plans';
    }
  }

  // discharger
  else if (attributes && attributes.CWPName) {
    type = 'Permitted Discharger';
  }

  // usgs streamgage
  else if (
    attributes &&
    attributes.monitoringType === 'Current Water Conditions'
  ) {
    type = 'Current Water Conditions';
  }

  // monitoring station
  else if (attributes && attributes.monitoringType === 'Sample Location') {
    type = 'Sample Location';
  }

  // protect tab teal nonprofits
  else if (attributes && attributes.type === 'nonprofit') {
    type = 'Nonprofit';
  }

  // county
  else if (attributes.CNTY_FIPS) {
    type = 'County';
  }

  // congressional district
  else if (attributes.DISTRICTID) {
    type = 'Congressional District';
  }

  // want to display name for Alaska Native Villages
  else if (attributes.NAME && attributes.TRIBE_NAME) {
    type = 'Alaska Native Village';
  }

  // other tribal layers just use the tribe name
  else if (attributes.TRIBE_NAME) {
    type = 'Tribe';
  }

  // upstream watershed
  else if (attributes.xwalk_huc12) {
    type = 'Upstream Watershed';
  }

  // stand alone change location popup
  else if (attributes.changelocationpopup) {
    type = 'Change Location';
  }

  // wild scenic rivers
  else if (attributes.WSR_RIVER_NAME) {
    type = 'Wild and Scenic Rivers';
  }

  // WSIO Health Index
  else if (attributes.PHWA_HEALTH_NDX_ST) {
    type = 'State Watershed Health Index';
  }

  // Protected areas
  else if (attributes.GAPCdSrc) {
    type = 'Protected Areas';
  }

  // EJSCREEN
  else if (attributes.T_OVR64PCT) {
    type = 'Demographic Indicators';
  }

  const content = (
    <WaterbodyInfo
      type={type}
      feature={feature}
      fieldName={fieldName}
      isPopup={true}
      extraContent={extraContent}
      getClickedHuc={getClickedHuc}
      resetData={resetData}
      services={services}
      fields={fields}
    />
  );

  // wrap the content for esri
  const contentContainer = document.createElement('div');
  ReactDOM.render(content, contentContainer);

  // return an esri popup item
  return contentContainer;
}

export function getUniqueWaterbodies(waterbodies: Object[]) {
  if (!waterbodies) return [];

  const flags = {};
  return waterbodies.filter((waterbody) => {
    if (!waterbody?.attributes) return false;

    const orgid = waterbody.attributes.organizationidentifier;
    const auid = waterbody.attributes.assessmentunitidentifier;
    const key = `${orgid}${auid}`;
    if (flags[key]) return false;
    flags[key] = true;
    return true;
  });
}

// helper function for doing shallow comparisons of objects
export function shallowCompare(obj1, obj2) {
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
export function graphicComparison(graphic1, graphic2) {
  if (!graphic1 && !graphic2) return true; // no change

  // change occurred
  if (
    (graphic1 && graphic1.attributes && !graphic2) ||
    (graphic1 && graphic1.attributes && graphic2 && !graphic2.attributes) ||
    (graphic2 && graphic2.attributes && !graphic1) ||
    (graphic2 && graphic2.attributes && graphic1 && !graphic1.attributes) ||
    !shallowCompare(graphic1.attributes, graphic2.attributes)
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

export function GradientIcon({ id, stops }) {
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
                  key={index}
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
        {stops.map((stop, index) => (
          <div key={index} css={tickMarkStyles}>
            <p>{stop.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Gets the highlight symbol styles based on the provided geometry.
export function getHighlightSymbol(geometry, color) {
  let symbol: Object = { color };
  if (geometry.type === 'polyline') {
    symbol['type'] = 'simple-line';
    symbol['width'] = 5;
  } else if (geometry.type === 'polygon') {
    symbol['type'] = 'simple-fill';
    symbol['outline'] = { color, width: 2 };
  } else if (geometry.type === 'point' || geometry.type === 'multipoint') {
    symbol['type'] = 'simple-marker';
    symbol['outline'] = { color, width: 2 };
  }

  return symbol;
}
