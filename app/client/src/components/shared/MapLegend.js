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
              key={layer.id}
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
      viewBox={`0 0 512 512`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        <g>
          <path
            fill={color}
            d="M 176.5,422.37636 C 72.581504,411.79563 9.4869488,347.26688 19.065745,261.36349 c 3.410248,-30.58337 19.345541,-58.31769 31.667794,-55.11568 5.87267,1.52604 15.475019,-4.16354 16.375392,-9.70276 2.218548,-13.64879 35.211949,-15.22539 75.909919,-3.62739 49.06109,13.9813 62.04359,8.89848 113.48115,-44.42941 46.70369,-48.42005 65.9203,-58.800237 109,-58.878262 95.48049,-0.172931 152.49562,81.580832 119.57853,171.463162 -12.67889,34.62057 -57.97438,69.93948 -72.20743,56.30335 -3.91388,-3.74973 -11.0378,-2.80247 -12.90966,1.71659 -3.53151,8.52583 -23.06092,8.41658 -27.49283,-0.15379 -2.37624,-4.59515 -8.01698,-4.26445 -10.04484,0.5889 -1.0204,2.44216 -2.62072,4.0262 -5.19897,5.14607 -18.52701,8.04729 -23.50852,11.82377 -51.47008,39.01946 C 253.1499,414.8577 225.58194,427.37377 176.5,422.37636 Z"
          />
          <path
            fill={stroke}
            d="M 178.05708,422.16679 C 113.62224,417.75871 57.517002,386.49507 33.199757,342.31973 10.121697,300.39552 8.8083922,227.58603 40.464647,206.62775 98.098363,168.47087 84.271667,199.26988 49.459439,222 23.497235,238.95163 27.431788,294.32834 44.489092,329.58564 67.751857,377.66957 133.81729,410.64942 201,407.71585 c 32.4565,-1.41723 50.25128,-11.90803 96.79766,-57.06646 33.03952,-32.05431 53.18524,-42.55897 62.56996,-38.73747 33.70878,13.72637 1.3712,13.04895 -7.21499,16.13597 -12.05931,4.33571 -19.71547,10.4892 -48.16773,38.15425 -50.36466,48.97118 -78.5415,59.27482 -126.92782,55.96465 z M 127.5,338.74875 c -2.9173,-0.76181 -5.75939,-2.86992 -10.5,-7.7883 -4.39788,-4.5628 -7.55066,-6.9661 -9.74876,-7.43128 C 97.958546,321.56256 99.487149,310 109.03984,310 c 5.67904,0 11.03816,3.06556 16.57925,9.48378 6.58448,7.62677 9.33748,7.6237 15.86572,-0.0177 11.02152,-12.90082 23.05395,-13.03406 34.92812,-0.38675 7.44067,7.92514 9.69152,7.98275 16.2248,0.41529 10.95558,-12.68982 22.15184,-13.01104 34.36227,-0.98587 4.04545,3.98407 8.0018,6.89038 10.47698,7.69631 4.95161,1.61227 6.77416,5.48177 4.49,9.53282 -3.8469,6.82263 -12.36297,4.99376 -22.49528,-4.831 -8.94952,-8.67786 -9.98571,-8.72667 -17.29733,-0.81479 -12.15447,13.1523 -24.22177,12.80808 -35.97985,-1.02633 -5.9157,-6.96035 -7.5453,-6.78082 -15.96542,1.75888 -8.49313,8.61375 -13.45874,10.34492 -22.7291,7.92409 z m 249.65983,-13.3705 c -17.22774,-0.47066 -45.72116,-16.53474 -1.84538,-13.20394 4.38588,0.33295 17.81788,0.62905 21.64619,1.55243 44.91491,10.83343 -7.44895,11.98895 -19.80081,11.65151 z m 36.97501,-2.81602 c -63.05988,-0.59285 -1.96258,-15.15628 6.99482,-18.06614 70.02643,-22.7485 84.76996,-134.57008 21.62233,-178.74859 C 412.2117,104.3813 359.89721,96.499131 327.6879,110.05584 310.13141,117.44527 300.48035,125.35287 266,160.08796 c -45.31226,45.64703 -59.9573,54.52943 -89.5,54.28291 -12.70958,-0.10606 -13.94934,-0.36356 -48,-9.96998 -15.74821,-4.4429 -35.221251,-5.42345 -45.710747,-2.20723 -9.6611,2.96222 -23.450889,7.38493 -18.743489,-4.58043 5.099934,-12.96311 34.284491,-18.61814 75.020976,-6.74755 46.2972,13.49099 70.48712,-0.20101 113.96751,-46.50986 58.98113,-62.817928 104.30637,-69.854828 165.08844,-50.666962 70.31508,22.197272 103.7906,124.733672 56.02995,189.125412 -15.19032,20.47986 -32.87575,40.00313 -60.0178,39.74796 z M 97.524667,290.49648 C 95.097456,289.63208 91.05183,286.53371 87.136141,282.54037 83.608885,278.94317 79.945971,276 78.996333,276 c -5.662934,0 -9.274663,-8.62816 -5.167592,-12.34501 4.705784,-4.25868 13.611235,-1.29128 21.736746,7.24293 7.628843,8.01256 9.131493,8.01187 16.965813,-0.008 12.29216,-12.58309 24.11132,-12.24416 35.28904,1.01194 6.01154,7.12933 8.4188,7.00374 15.76673,-0.82263 11.86451,-12.63702 23.90766,-12.51284 34.90521,0.35993 3.39143,3.96972 5.63613,5.68179 8.04091,6.13292 6.83479,1.28222 8.75829,8.65544 3.31363,12.7019 -4.79265,3.56187 -11.7866,0.96396 -19.99751,-7.42812 -8.41107,-8.59665 -10.09192,-8.78315 -16.04383,-1.7802 -11.75808,13.83441 -23.82538,14.17863 -35.97985,1.02633 -7.30981,-7.90992 -8.34917,-7.86175 -17.28313,0.80103 -9.1844,8.90561 -14.46404,10.6496 -23.017833,7.60334 z M 337.50614,196.78285 c -2.83258,-0.77794 -5.95225,-3.08659 -10.7291,-7.93986 C 323.07266,185.07934 319.19308,182 318.15576,182 c -5.86939,0 -9.26124,-7.89452 -5.15576,-12 4.81361,-4.81361 14.87454,-1.47738 22.51519,7.4661 6.52824,7.64138 9.28124,7.64445 15.86572,0.0177 11.17118,-12.93954 23.46303,-12.97046 35.26171,-0.0887 7.00307,7.64592 9.45499,7.65069 15.9646,0.0311 11.00942,-12.88667 22.92977,-12.99602 34.83133,-0.31954 3.57748,3.81042 6.66932,6.16493 8.60344,6.55176 9.73192,1.94638 8.54716,13.95442 -1.35643,13.74802 -5.76578,-0.12016 -10.83847,-3.10373 -17.01555,-10.0079 -6.52399,-7.29193 -7.97337,-7.16477 -16.44546,1.44286 -11.95526,12.14651 -21.63152,12.14517 -33.27818,-0.005 -8.46004,-8.82552 -9.95263,-8.90973 -16.84783,-0.9505 -7.38189,8.52103 -14.78922,11.31431 -23.5924,8.8966 z"
          />
        </g>
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

        {Object.entries(subLegends).map(([name, legend]) => (
          <Fragment key={name}>
            <div css={subLayerLabelStyles}>{name}</div>

            <ul css={[nestedUl, { marginBottom: '0.5rem' }]}>
              {legend.map((item) => {
                return (
                  <li key={item.label}>
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
          {padLegend.map((item) => {
            return (
              <li key={item.label}>
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
            {subtitleParts.map((part) => {
              return <div key={part.label}>{part.glossary}</div>;
            })}
          </div>
        )}

        <ul css={nestedUl}>
          {legend.map((item) => {
            return (
              <li key={item.label}>
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
