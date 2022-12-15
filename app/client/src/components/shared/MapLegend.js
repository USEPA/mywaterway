// @flow

import React, { Fragment } from 'react';
import { css } from 'styled-components/macro';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { PinIcon } from 'components/shared/Icons';
import { errorBoxStyles } from 'components/shared/MessageBoxes';
import WaterbodyIcon from 'components/shared/WaterbodyIcon';
import { GradientIcon, isInScale } from 'utils/mapFunctions';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
// utils
import { getSelectedCommunityTab } from 'utils/utils';
// errors
import { legendUnavailableError } from 'config/errorMessages';
// styles
import { colors } from 'styles/index.js';

const containerStyles = css`
  width: 240px;
  padding: 8px;
  background-color: white;
  cursor: default;

  .esri-feature & p {
    padding-bottom: 0 !important;
  }
`;

const listStyles = css`
  margin: 0;
  padding: 0 0.25rem;
  list-style: none;

  li {
    display: flex;
    flex-direction: column;
    align-items: start;
    margin-bottom: 0.25rem;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid #eee;

    &:last-of-type {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }
  }
`;

const legendItemStyles = css`
  display: flex;
  align-items: center;
`;

const imageContainerBaseStyles = css`
  margin-right: 0.25rem;
`;

const imageContainerStyles = css`
  ${imageContainerBaseStyles}
  width: 26px;
  height: 26px;
`;

const smallImageContainerStyles = css`
  ${imageContainerBaseStyles}
  width: 20px;
  height: 20px;
`;

const labelStyles = css`
  display: inline-block;
  padding-right: 0.625rem;
  font-size: 0.75rem;
`;

const layerLabelStyles = css`
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
`;

const subLayerLabelStyles = css`
  ${layerLabelStyles}
  margin-left: 0.438rem;
`;

const nestedUl = css`
  li {
    border-bottom: none;
  }
`;

const ignoreLayers = ['watershedsLayer'];

// --- components ---
type Props = {
  view: Object,
  displayEsriLegend: boolean,
  visibleLayers: Object,
  additionalLegendInfo: Object,
};

function MapLegend({
  view,
  displayEsriLegend,
  visibleLayers,
  additionalLegendInfo,
}: Props) {
  const filteredVisibleLayers = visibleLayers.filter(
    (layer) => !ignoreLayers.includes(layer.id) && isInScale(layer, view.scale),
  );

  // no legend data
  if (filteredVisibleLayers.length === 0 && !displayEsriLegend) {
    return (
      <div css={containerStyles}>
        <ul css={listStyles}>There are currently no items to display</ul>
      </div>
    );
  }

  let waterbodyLayerAdded = false;

  return (
    <div css={containerStyles}>
      <ul css={listStyles}>
        {filteredVisibleLayers.map((layer, index) => {
          if (
            layer.visible &&
            (layer.id === 'waterbodyLayer' ||
              layer.id === 'allWaterbodiesLayer')
          ) {
            if (waterbodyLayerAdded) return null;
            waterbodyLayerAdded = true;
          }

          return (
            <MapLegendContent
              key={index}
              view={view}
              layer={layer}
              additionalLegendInfo={additionalLegendInfo}
            />
          );
        })}
      </ul>
    </div>
  );
}

type CardProps = {
  view: Object,
  layer: Object,
  additionalLegendInfo: Object,
};

const boxSize = 26;
const iconSize = 20;

export const squareIcon = ({ color, strokeWidth = 1, stroke = 'black' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={boxSize}
      height={boxSize}
      viewBox={`0 0 ${boxSize} ${boxSize}`}
      aria-hidden="true"
    >
      <rect
        x={(boxSize - iconSize) / 2}
        y={(boxSize - iconSize) / 2}
        width={iconSize}
        height={iconSize}
        fill={color}
        strokeWidth={strokeWidth}
        stroke={stroke}
      />
    </svg>
  );
};

export const diamondIcon = ({ color, strokeWidth = 1, stroke = 'black' }) => {
  const diamondSize = iconSize / Math.sqrt(2);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={boxSize}
      height={boxSize}
      viewBox={`0 0 ${boxSize} ${boxSize}`}
      aria-hidden="true"
    >
      <rect
        x={(boxSize - diamondSize) / 2}
        y={(boxSize - diamondSize) / 2}
        width={diamondSize}
        height={diamondSize}
        fill={color}
        strokeWidth={strokeWidth}
        stroke={stroke}
        transform={`rotate(45, ${boxSize / 2}, ${boxSize / 2})`}
      />
    </svg>
  );
};

export const triangleIcon = ({ color, strokeWidth = 1, stroke = 'black' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={boxSize}
      height={boxSize}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <polygon
        points="50,15 100,100 0,100"
        fill={color}
        strokeWidth={strokeWidth}
        stroke={stroke}
      />
    </svg>
  );
};

export const circleIcon = ({ color, strokeWidth = 1, stroke = 'black' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={boxSize}
      height={boxSize}
      viewBox={`0 0 ${boxSize} ${boxSize}`}
      aria-hidden="true"
    >
      <circle
        cx={boxSize / 2}
        cy={boxSize / 2}
        r="10"
        fill={color}
        strokeWidth={strokeWidth}
        stroke={stroke}
      />
    </svg>
  );
};

export const waterwayIcon = ({ color, strokeWidth = 1, stroke = 'black' }) => {
  return (
    <svg
      width={boxSize}
      height={boxSize}
      viewBox={`0 0 ${boxSize} ${boxSize}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(-2.2567911,-2.6920693)">
        <path
          fill={color}
          stroke={stroke}
          strokeWidth={strokeWidth}
          d="M 8.8987331,24.934478 C 15.072586,19.905292 14.984004,19.233973 7.6285353,15.308315 3.7588403,13.243037 1.2116734,9.6020346 2.675521,8.2283176 c 0.7729492,-0.725357 1.1225712,-0.705801 1.4105786,0.0789 0.2106037,0.573809 1.0740968,1.8968624 1.9188736,2.9401184 l 1.5359579,1.896829 1.6753026,-2.068911 C 10.13765,9.9373526 10.704674,8.5193876 10.476287,7.9242206 c -0.231673,-0.603733 0.184109,-1.082122 0.940506,-1.082122 1.777791,0 1.775405,3.1999114 -0.0039,5.1659684 l -1.359581,1.502351 2.414187,2.089237 2.414185,2.089236 0.265819,-1.59812 c 0.260553,-1.566453 4.096611,-5.323029 6.24139,-6.1120674 0.812007,-0.298721 0.589907,-1.295226 -0.880845,-3.952202 -1.792805,-3.2387822 -1.830086,-3.526617 -0.42183,-3.2568674 0.849629,0.1627454 2.304075,1.7468334 3.232103,3.5201964 l 1.687324,3.224295 -3.454194,2.8830734 -3.454193,2.883074 3.209485,3.37387 c 3.932694,4.13412 3.843975,4.134135 4.542564,-7.78e-4 0.729436,-4.317491 2.109155,-4.378632 2.109155,-0.09346 0,2.068157 -0.628552,4.017499 -1.700205,5.272887 l -1.700205,1.991703 -2.997686,-3.523198 -2.997684,-3.523197 -5.077833,4.999606 c -3.474651,3.421121 -5.7449152,4.999605 -7.190713,4.999605 -1.8735203,0 -1.5784557,-0.435338 2.6045971,-3.842829 z"
        />
      </g>
    </svg>
  );
};

function MapLegendContent({ view, layer, additionalLegendInfo }: CardProps) {
  // jsx
  const waterbodyLegend = (
    <>
      <li>
        <div css={legendItemStyles}>
          <div css={imageContainerStyles}>
            <WaterbodyIcon condition="good" selected={false} />
          </div>
          <span css={labelStyles}>Waterbody: Good</span>
        </div>
      </li>

      <li>
        <div css={legendItemStyles}>
          <div css={imageContainerStyles}>
            <WaterbodyIcon condition="polluted" selected={false} />
          </div>
          <span css={labelStyles}>Waterbody: Impaired</span>
        </div>
      </li>

      <li>
        <div css={legendItemStyles}>
          <div css={imageContainerStyles}>
            <WaterbodyIcon condition="unassessed" selected={false} />
          </div>
          <span css={labelStyles}>Waterbody: Condition Unknown</span>
        </div>
      </li>
    </>
  );

  // jsx
  const issuesLegend = (
    <li>
      <div css={legendItemStyles}>
        <div css={imageContainerStyles}>
          <WaterbodyIcon condition="polluted" selected={false} />
        </div>
        <span css={labelStyles}>Waterbody: Impaired</span>
      </div>
    </li>
  );

  // jsx
  const usgsStreamgagesLegend = (
    <li>
      <div css={legendItemStyles}>
        <div css={imageContainerStyles}>{squareIcon({ color: '#fffe00' })}</div>
        <span css={labelStyles}>USGS Sensors</span>
      </div>
    </li>

    /*
    <li>
      <div css={layerLabelStyles}>Current Water Conditions:</div>

      <div css={legendItemStyles}>
        <div css={imageContainerStyles}>{circleIcon({ color: '#ea2c38' })}</div>
        <span css={labelStyles}>All-time low</span>
      </div>

      <div css={legendItemStyles}>
        <div css={imageContainerStyles}>{circleIcon({ color: '#b54246' })}</div>
        <span css={labelStyles}>Much below normal</span>
      </div>

      <div css={legendItemStyles}>
        <div css={imageContainerStyles}>{circleIcon({ color: '#eaae3f' })}</div>
        <span css={labelStyles}>Below normal</span>
      </div>

      <div css={legendItemStyles}>
        <div css={imageContainerStyles}>{circleIcon({ color: '#32f242' })}</div>
        <span css={labelStyles}>Normal</span>
      </div>

      <div css={legendItemStyles}>
        <div css={imageContainerStyles}>{circleIcon({ color: '#56d7da' })}</div>
        <span css={labelStyles}>Above normal</span>
      </div>

      <div css={legendItemStyles}>
        <div css={imageContainerStyles}>{circleIcon({ color: '#2639f6' })}</div>
        <span css={labelStyles}>Much above normal</span>
      </div>

      <div css={legendItemStyles}>
        <div css={imageContainerStyles}>{circleIcon({ color: '#22296e' })}</div>
        <span css={labelStyles}>All-time high</span>
      </div>

      <div css={legendItemStyles}>
        <div css={imageContainerStyles}>{circleIcon({ color: '#989fa2' })}</div>
        <span css={labelStyles}>Measurement unavailable</span>
      </div>
    </li>
    */
  );

  // jsx
  const dischargersLegend = (
    <li>
      <div css={legendItemStyles}>
        <div css={imageContainerStyles}>
          {diamondIcon({ color: colors.orange })}
        </div>
        <span css={labelStyles}>Permitted Discharger</span>
      </div>
    </li>
  );

  // jsx
  const nonprofitsLegend = (
    <li>
      <div css={legendItemStyles}>
        <div css={imageContainerStyles}>{squareIcon({ color: '#8b6573' })}</div>
        <span css={labelStyles}>Nonprofit</span>
      </div>
    </li>
  );

  // jsx
  const providersLegend = (
    <>
      <li>
        <div css={legendItemStyles}>
          <div css={imageContainerStyles}>
            {squareIcon({
              color: '#CBCBCB',
              strokeWidth: 3,
              stroke: '#ffff00',
            })}
          </div>
          <span css={labelStyles}>Providers</span>
        </div>
      </li>
    </>
  );

  // jsx
  const searchIconLegend = (
    <li>
      <div css={legendItemStyles}>
        <div css={imageContainerStyles}>
          <PinIcon />
        </div>
        <span css={labelStyles}>Searched Location</span>
      </div>
    </li>
  );

  // jsx
  const boundariesLegend = (
    <li>
      <div css={legendItemStyles}>
        <div css={imageContainerStyles}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="26"
            height="26"
            viewBox="0 0 26 26"
            aria-hidden="true"
          >
            <rect x="0" y="12" width="10" height="3" fill="#000" />
            <rect x="16" y="12" width="10" height="3" fill="#000" />
          </svg>
        </div>
        <span css={labelStyles}>HUC12 Boundaries</span>
      </div>
    </li>
  );

  // jsx
  const actionsWaterbodiesLegend = (
    <li>
      <div css={legendItemStyles}>
        <div css={imageContainerStyles}>
          {squareIcon({ color: 'rgb(0, 123, 255)', strokeWidth: 0 })}
        </div>
        <span css={labelStyles}>Waterbody</span>
      </div>
    </li>
  );

  // jsx
  const congressionalDistrictsLegend = (
    <li>
      <div css={legendItemStyles}>
        <div css={imageContainerStyles}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="26"
            height="26"
            viewBox="0 0 26 26"
            aria-hidden="true"
          >
            <rect x="0" y="12" width="26" height="3" fill="#FF00C5" />
          </svg>
        </div>
        <span css={labelStyles}>Congressional Districts</span>
      </div>
    </li>
  );

  // jsx
  const tribalLegend = (
    <>
      <li>
        <div css={legendItemStyles}>
          <div css={imageContainerStyles}>
            {squareIcon({ color: 'rgb(154, 154, 154)', stroke: '#6e6e6e' })}
          </div>
          <span css={labelStyles}>Tribal Lands</span>
        </div>
      </li>

      <li>
        <div css={legendItemStyles}>
          <div css={imageContainerStyles}>
            {circleIcon({ color: 'rgb(158, 0, 124)' })}
          </div>
          <span css={labelStyles}>Alaska Native Villages</span>
        </div>
      </li>

      <li>
        <div css={legendItemStyles}>
          <div css={imageContainerStyles}>
            {circleIcon({ color: 'rgb(168, 112, 0)' })}
          </div>
          <span css={labelStyles}>Virginia Federally Recognized Tribes</span>
        </div>
      </li>
    </>
  );

  // jsx
  const healthIndexLegend = (
    <li>
      <div css={legendItemStyles}>
        <div css={imageContainerStyles}>
          {squareIcon({ color: 'rgb(54, 140, 225)', strokeWidth: 0 })}
        </div>
        <span css={labelStyles}>State Watershed Health Index Layer</span>
        <GradientIcon
          id="health-index-gradient"
          stops={[
            { label: '1', color: 'rgb(10, 8, 145)' },
            { label: '0.75', color: 'rgb(30, 61, 181)' },
            { label: '0.5', color: 'rgb(54, 140, 225)' },
            { label: '0.25', color: 'rgb(124, 187, 234)' },
            { label: '0', color: 'rgb(180, 238, 239)' },
          ]}
        />
      </div>
    </li>
  );

  const wildScenicRiversLegend = (
    <li>
      <div css={legendItemStyles}>
        <div css={imageContainerStyles}>
          {squareIcon({ color: 'rgb(0, 123, 255)' })}
        </div>
        <span css={labelStyles}>Wild and Scenic Rivers</span>
      </div>
    </li>
  );

  // jsx
  const countyLegend = (
    <li>
      <div css={legendItemStyles}>
        <div css={imageContainerStyles}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="26"
            height="26"
            viewBox="0 0 26 26"
            aria-hidden="true"
          >
            <rect x="0" y="12" width="26" height="3" fill="#FBA45D" />
          </svg>
        </div>
        <span css={labelStyles}>County</span>
      </div>
    </li>
  );

  // jsx
  const stateBoundariesLegend = (
    <li>
      <div css={legendItemStyles}>
        <div css={imageContainerStyles}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="26"
            height="26"
            viewBox="0 0 26 26"
            aria-hidden="true"
          >
            <rect x="0" y="12" width="26" height="3" fill="#000" />
          </svg>
        </div>
        <span css={labelStyles}>State</span>
      </div>
    </li>
  );

  // jsx
  const upstreamLegend = (
    <li>
      <div css={legendItemStyles}>
        <div css={imageContainerStyles}>
          {squareIcon({ color: 'rgb(31, 184, 255, 0.2)', strokeWidth: 2 })}
        </div>
        <span css={labelStyles}>
          <GlossaryTerm term="Upstream Watershed">
            Upstream Watershed
          </GlossaryTerm>
        </span>
      </div>
    </li>
  );

  const mappedWaterLegend = () => {
    const layerName = 'Mapped Water (all)';

    const sublayerIds = view.map.layers.items
      .filter((item) => item.id === 'mappedWaterLayer')
      .map((layerItem) => layerItem.sublayers.items)?.[0]
      .map((sublayer) => sublayer.id);

    if (additionalLegendInfo.status === 'fetching') {
      return <LoadingSpinner />;
    }

    if (additionalLegendInfo.status === 'failure') {
      return (
        <div css={errorBoxStyles}>{legendUnavailableError(layerName)}</div>
      );
    }

    const subLegends = {};
    additionalLegendInfo.data['mappedWaterLayer']?.layers
      ?.filter((sublayer) => sublayerIds.includes(sublayer.layerId))
      .forEach(
        (sublayer) => (subLegends[sublayer.layerName] = sublayer.legend),
      );

    if (!Object.keys(subLegends).length) {
      return (
        <div css={errorBoxStyles}>{legendUnavailableError(layerName)}</div>
      );
    }

    return (
      <li>
        <GlossaryTerm
          term={layerName}
          className="esri-widget__heading esri-legend__service-label"
          style={{
            fontFamily:
              '"Merriweather", "Georgia", "Cambria", "Times New Roman", "Times", serif',
          }}
        >
          {layerName}
        </GlossaryTerm>

        {Object.entries(subLegends).map(([name, legend], outerIndex) => (
          <Fragment key={outerIndex}>
            <div css={subLayerLabelStyles}>{name}</div>

            <ul css={[nestedUl, { marginBottom: '0.5rem' }]}>
              {legend.map((item, index) => {
                return (
                  <li key={index}>
                    <div css={legendItemStyles}>
                      <div css={smallImageContainerStyles}>
                        <img
                          src={`data:image/png;base64,${item.imageData}`}
                          alt={item.label}
                        />
                      </div>
                      <span css={labelStyles}>{item.label}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Fragment>
        ))}
      </li>
    );
  };

  // jsx
  const protectedAreasLegend = () => {
    const layerName = 'Protected Areas';

    if (additionalLegendInfo.status === 'fetching') {
      return <LoadingSpinner />;
    }

    if (additionalLegendInfo.status === 'failure') {
      return (
        <div css={errorBoxStyles}>{legendUnavailableError(layerName)}</div>
      );
    }

    const padLegend =
      additionalLegendInfo.data['protectedAreasLayer']?.layers?.[0]?.legend;

    if (!padLegend) {
      return (
        <div css={errorBoxStyles}>{legendUnavailableError(layerName)}</div>
      );
    }

    return (
      <li>
        <div css={layerLabelStyles}>{layerName}</div>

        <div css={subLayerLabelStyles}>Protection Category:</div>

        <ul css={nestedUl}>
          {padLegend.map((item, index) => {
            return (
              <li key={index}>
                <div css={legendItemStyles}>
                  <div css={smallImageContainerStyles}>
                    <img
                      src={`data:image/png;base64,${item.imageData}`}
                      alt={item.label}
                    />
                  </div>
                  <span css={labelStyles}>{item.label}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </li>
    );
  };

  // jsx
  const ejscreenLegend = () => {
    const layerName = 'Demographic Indicators';

    if (additionalLegendInfo.status === 'fetching') return <LoadingSpinner />;
    if (additionalLegendInfo.status === 'failure') {
      return (
        <div css={errorBoxStyles}>{legendUnavailableError(layerName)}</div>
      );
    }

    const legend = additionalLegendInfo.data['ejscreen']?.layers?.[0]?.legend;
    if (!legend) {
      return (
        <div css={errorBoxStyles}>{legendUnavailableError(layerName)}</div>
      );
    }

    // maps the layer title to a text for a sentence
    const titleMap = {
      'Less than High School Education': {
        label: 'Less than High School Education',
        glossary: (
          <GlossaryTerm term="Less than High School Education">
            Less than High School Education
          </GlossaryTerm>
        ),
      },
      'Percent People of Color': {
        label: 'Percent People of Color',
        glossary: (
          <GlossaryTerm term="Percent People of Color">
            Percent People of Color
          </GlossaryTerm>
        ),
      },
      'Linguistic Isolation': {
        label: 'Linguistic Isolation',
        glossary: (
          <GlossaryTerm term="Linguistic Isolation">
            Linguistic Isolation
          </GlossaryTerm>
        ),
      },
      'Percent Low-Income': {
        label: 'Percent Low-Income',
        glossary: (
          <GlossaryTerm term="Percent Low-Income">
            Percent Low-Income
          </GlossaryTerm>
        ),
      },
      'Individuals over age 64': {
        label: 'Individuals over age 64',
        glossary: (
          <GlossaryTerm term="Individuals over age 64">
            Individuals over age 64
          </GlossaryTerm>
        ),
      },
      'Individuals under age 5': {
        label: 'Individuals under age 5',
        glossary: (
          <GlossaryTerm term="Individuals under age 5">
            Individuals under age 5
          </GlossaryTerm>
        ),
      },
      'Demographic Index': {
        label: 'Demographic Index',
        glossary: (
          <GlossaryTerm term="Demographic Index">
            Demographic Index
          </GlossaryTerm>
        ),
      },
    };

    // build subtitle based on which layers are visible
    const subtitleParts = [];
    const layers = view.map.layers.items;
    for (const layerItem of layers) {
      if (layerItem.id === 'ejscreenLayer') {
        layerItem.layers.items.forEach((sublayer) => {
          if (sublayer.visible) {
            subtitleParts.push(titleMap[sublayer.title]);
          }
        });
        break;
      }
    }

    // combine the subtitle parts into a comma delimited string
    subtitleParts.sort((a, b) => {
      return a.label.localeCompare(b.label);
    });

    return (
      <li>
        <GlossaryTerm
          term={layerName}
          className="esri-widget__heading esri-legend__service-label"
          style={{
            fontFamily:
              '"Merriweather", "Georgia", "Cambria", "Times New Roman", "Times", serif',
          }}
        >
          {layerName}
        </GlossaryTerm>

        {subtitleParts.length > 0 && (
          <div css={[subLayerLabelStyles, { marginBottom: '0.5rem' }]}>
            {subtitleParts.map((part, index) => {
              return <div key={index}>{part.glossary}</div>;
            })}
          </div>
        )}

        <ul css={nestedUl}>
          {legend.map((item, index) => {
            return (
              <li key={index}>
                <div css={legendItemStyles}>
                  <div css={smallImageContainerStyles}>
                    <img
                      src={`data:image/png;base64,${item.imageData}`}
                      alt={item.label.replace('%ile', '%')}
                    />
                  </div>
                  <span css={labelStyles}>
                    {item.label.replace('%ile', '%')}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </li>
    );
  };

  const selectedTab = getSelectedCommunityTab();
  const isRestoreProtect =
    selectedTab === 'restore' || selectedTab === 'protect';

  if (layer.id === 'waterbodyLayer') {
    return isRestoreProtect ? actionsWaterbodiesLegend : waterbodyLegend;
  }
  if (layer.id === 'allWaterbodiesLayer') {
    return isRestoreProtect ? actionsWaterbodiesLegend : waterbodyLegend;
  }
  if (layer.id === 'issuesLayer') return issuesLegend;
  if (layer.id === 'usgsStreamgagesLayer') return usgsStreamgagesLegend;
  if (layer.id === 'dischargersLayer') return dischargersLegend;
  if (layer.id === 'nonprofitsLayer') return nonprofitsLegend;
  if (layer.id === 'providersLayer') return providersLegend;
  if (layer.id === 'boundariesLayer') return boundariesLegend;
  if (layer.id === 'searchIconLayer') return searchIconLegend;
  if (layer.id === 'actionsWaterbodies') return actionsWaterbodiesLegend;
  if (layer.id === 'countyLayer') return countyLegend;
  if (layer.id === 'tribalLayer') return tribalLegend;
  if (layer.id === 'wsioHealthIndexLayer') return healthIndexLegend;
  if (layer.id === 'wildScenicRiversLayer') return wildScenicRiversLegend;
  if (layer.id === 'congressionalLayer') return congressionalDistrictsLegend;
  if (layer.id === 'upstreamWatershed') return upstreamLegend;
  if (layer.id === 'stateBoundariesLayer') return stateBoundariesLegend;
  if (layer.id === 'protectedAreasLayer') return protectedAreasLegend();
  if (layer.id === 'ejscreenLayer') return ejscreenLegend();
  if (layer.id === 'mappedWaterLayer') return mappedWaterLegend();

  return null;
}

export default MapLegend;
