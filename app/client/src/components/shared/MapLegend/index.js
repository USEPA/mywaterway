// @flow

import React from 'react';
import styled from 'styled-components';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import PinIcon from 'components/shared/Icons/PinIcon';
import { StyledErrorBox } from 'components/shared/MessageBoxes';
import WaterbodyIcon from 'components/shared/WaterbodyIcon';
import { gradientIcon } from 'components/pages/LocationMap/MapFunctions';
// errors
import { legendUnavailableError } from 'config/errorMessages';
// styles
import { colors } from 'styles/index.js';

// --- styled components ---
const Container = styled.div`
  padding: 10px;
  background-color: white;

  .esri-feature & p {
    padding-bottom: 0 !important;
  }
`;

const ImageContainer = styled.div`
  width: 26px;
  height: 26px;
  margin-left: -0.25rem;
  margin-right: 0.25rem;
`;

const LegendContainer = styled.div`
  width: 11.2rem;
  background-color: #fff;
  cursor: default;
`;

const UL = styled.ul`
  margin: 0;
  padding: 0.1875rem 0 0.25rem 0.625rem;
  list-style: none;
`;

const LI = styled.li`
  display: flex;
  align-items: center;
`;

const LegendLabel = styled.span`
  display: inline-block;
  padding-right: 0.625rem;
  font-size: 0.75rem;
`;

const MultiContainer = styled.div`
  padding-top: 12px;
`;

const Subtitle = styled.div`
  padding: 6px 0;
`;

const ignoreLayers = ['mappedWaterLayer', 'watershedsLayer', 'searchIconLayer'];

// --- components ---
type Props = {
  visibleLayers: Object,
  additionalLegendInfo: Object,
};

function MapLegend({ visibleLayers, additionalLegendInfo }: Props) {
  const filteredVisibleLayers = visibleLayers.filter(
    (layer) => !ignoreLayers.includes(layer.id),
  );

  // no legend data
  if (filteredVisibleLayers.length === 0) return <></>;

  return (
    <Container>
      <LegendContainer>
        <UL>
          {filteredVisibleLayers.map((layer, index) => {
            return (
              <MapLegendContent
                key={index}
                layer={layer}
                additionalLegendInfo={additionalLegendInfo}
              />
            );
          })}
        </UL>
      </LegendContainer>
    </Container>
  );
}

type CardProps = {
  layer: Object,
  additionalLegendInfo: Object,
};

const boxSize = 26;
const iconSize = 20;

function MapLegendContent({ layer, additionalLegendInfo }: CardProps) {
  const squareIcon = ({ color, strokeWidth = 1, stroke = 'black' }) => {
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

  const diamondIcon = ({ color, strokeWidth = 1, stroke = 'black' }) => {
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

  const circleIcon = ({ color, strokeWidth = 1, stroke = 'black' }) => {
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

  // jsx
  const waterbodyLegend = (
    <>
      <LI>
        <ImageContainer>
          <WaterbodyIcon condition="good" selected={false} />
        </ImageContainer>
        <LegendLabel>Waterbody: Good</LegendLabel>
      </LI>
      <LI>
        <ImageContainer>
          <WaterbodyIcon condition="polluted" selected={false} />
        </ImageContainer>
        <LegendLabel>Waterbody: Impaired</LegendLabel>
      </LI>
      <LI>
        <ImageContainer>
          <WaterbodyIcon condition="unassessed" selected={false} />
        </ImageContainer>
        <LegendLabel>Waterbody: Condition Unknown</LegendLabel>
      </LI>
    </>
  );

  // jsx
  const issuesLegend = (
    <>
      <LI>
        <ImageContainer>
          <WaterbodyIcon condition="polluted" selected={false} />
        </ImageContainer>
        <LegendLabel>Waterbody: Impaired</LegendLabel>
      </LI>
    </>
  );

  // jsx
  const monitoringStationsLegend = (
    <LI>
      <ImageContainer>
        {squareIcon({ color: colors.lightPurple() })}
      </ImageContainer>
      <LegendLabel>Monitoring Station</LegendLabel>
    </LI>
  );

  // jsx
  const dischargersLegend = (
    <LI>
      <ImageContainer>{diamondIcon({ color: colors.orange })}</ImageContainer>
      <LegendLabel>Permitted Discharger</LegendLabel>
    </LI>
  );

  // jsx
  const nonprofitsLegend = (
    <LI>
      <ImageContainer>{squareIcon({ color: '#8b6573' })}</ImageContainer>
      <LegendLabel>Nonprofit</LegendLabel>
    </LI>
  );

  // jsx
  const providersLegend = (
    <>
      <LI>
        <ImageContainer>
          <PinIcon />
        </ImageContainer>
        <LegendLabel>Searched Location</LegendLabel>
      </LI>
      <LI>
        <ImageContainer>
          {squareIcon({
            color: '#CBCBCB',
            strokeWidth: 3,
            stroke: '#ffff00',
          })}
        </ImageContainer>
        <LegendLabel>Providers</LegendLabel>
      </LI>
    </>
  );

  // jsx
  const boundariesLegend = (
    <>
      <LI>
        <ImageContainer>
          <PinIcon />
        </ImageContainer>
        <LegendLabel>Searched Location</LegendLabel>
      </LI>
      <LI>
        <ImageContainer>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="26"
            height="26"
            viewBox="0 0 26 26"
            aria-hidden="true"
          >
            <rect x="0" y="12" width="10" height="3" fill="#666666" />
            <rect x="16" y="12" width="10" height="3" fill="#666666" />
          </svg>
        </ImageContainer>
        <LegendLabel>HUC12 Boundaries</LegendLabel>
      </LI>
    </>
  );

  // jsx
  const actionsWaterbodiesLegend = (
    <LI>
      <ImageContainer>
        {squareIcon({ color: 'rgb(0, 123, 255)', strokeWidth: 0 })}
      </ImageContainer>
      <LegendLabel>Waterbody</LegendLabel>
    </LI>
  );

  // jsx
  const congressionalDistrictsLegend = (
    <LI>
      <ImageContainer>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="26"
          height="26"
          viewBox="0 0 26 26"
          aria-hidden="true"
        >
          <rect x="0" y="12" width="26" height="3" fill="#FF00C5" />
        </svg>
      </ImageContainer>
      <LegendLabel>Congressional Districts</LegendLabel>
    </LI>
  );

  // jsx
  const tribalLegend = (
    <>
      <LI>
        <ImageContainer>
          {squareIcon({
            color: 'rgb(154, 154, 154)',
            strokeWidth: 1,
            stroke: '#6e6e6e',
          })}
        </ImageContainer>
        <LegendLabel>Tribal Lands</LegendLabel>
      </LI>
      <LI>
        <ImageContainer>
          {circleIcon({
            color: 'rgb(158, 0, 124)',
            strokeWidth: 1,
            stroke: '#000000',
          })}
        </ImageContainer>
        <LegendLabel>Alaska Native Villages</LegendLabel>
      </LI>
    </>
  );

  // jsx
  const healthIndexLegend = (
    <LI>
      <ImageContainer>
        {squareIcon({ color: 'rgb(54, 140, 225)', strokeWidth: 0 })}
      </ImageContainer>
      <LegendLabel>State Watershed Health Index Layer</LegendLabel>
      {gradientIcon({
        id: 'health-index-gradient',
        stops: [
          { label: '1', color: 'rgb(10, 8, 145)' },
          { label: '0.75', color: 'rgb(30, 61, 181)' },
          { label: '0.5', color: 'rgb(54, 140, 225)' },
          { label: '0.25', color: 'rgb(124, 187, 234)' },
          { label: '0', color: 'rgb(180, 238, 239)' },
        ],
      })}
    </LI>
  );

  const wildScenicRiversLegend = (
    <LI>
      <ImageContainer>
        {squareIcon({ color: 'rgb(0, 123, 255)' })}
      </ImageContainer>
      <LegendLabel>Wild and Scenic Rivers</LegendLabel>
    </LI>
  );

  // jsx
  const countyLegend = (
    <LI>
      <ImageContainer>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="26"
          height="26"
          viewBox="0 0 26 26"
          aria-hidden="true"
        >
          <rect x="0" y="12" width="26" height="3" fill="#FBA45D" />
        </svg>
      </ImageContainer>
      <LegendLabel>County</LegendLabel>
    </LI>
  );

  // jsx
  const stateBoundariesLegend = (
    <LI>
      <ImageContainer>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="26"
          height="26"
          viewBox="0 0 26 26"
          aria-hidden="true"
        >
          <rect x="0" y="12" width="26" height="3" fill="#000" />
        </svg>
      </ImageContainer>
      <LegendLabel>State</LegendLabel>
    </LI>
  );

  // jsx
  const upstreamLegend = (
    <LI>
      <ImageContainer>
        {squareIcon({
          color: 'rgb(31, 184, 255, 0.2)',
          strokeWidth: 2,
          stroke: '#000000',
        })}
      </ImageContainer>
      <LegendLabel>Upstream Watershed</LegendLabel>
    </LI>
  );

  // jsx
  const protectedAreasLegend = () => {
    const layerName = 'Protected Areas';

    if (additionalLegendInfo.status === 'fetching') return <LoadingSpinner />;
    if (additionalLegendInfo.status === 'failure') {
      return (
        <StyledErrorBox>{legendUnavailableError(layerName)}</StyledErrorBox>
      );
    }

    const padLegend =
      additionalLegendInfo.data['protectedAreasLayer']?.layers?.[0]?.legend;
    if (!padLegend) {
      return (
        <StyledErrorBox>{legendUnavailableError(layerName)}</StyledErrorBox>
      );
    }

    return (
      <MultiContainer>
        <h3 className="esri-widget__heading esri-legend__service-label">
          {layerName}
        </h3>
        <Subtitle>Protection Category</Subtitle>
        {padLegend.map((item, index) => {
          return (
            <LI key={index}>
              <ImageContainer>
                <img
                  src={`data:image/png;base64,${item.imageData}`}
                  alt={item.label}
                />
              </ImageContainer>
              <LegendLabel>{item.label}</LegendLabel>
            </LI>
          );
        })}
      </MultiContainer>
    );
  };

  // jsx
  const ejscreenLegend = () => {
    const layerName = 'Environmental Justice';

    if (additionalLegendInfo.status === 'fetching') return <LoadingSpinner />;
    if (additionalLegendInfo.status === 'failure') {
      return (
        <StyledErrorBox>{legendUnavailableError(layerName)}</StyledErrorBox>
      );
    }

    const legend = additionalLegendInfo.data['ejscreen']?.layers?.[0]?.legend;
    if (!legend) {
      return (
        <StyledErrorBox>{legendUnavailableError(layerName)}</StyledErrorBox>
      );
    }

    return (
      <MultiContainer>
        <h3 className="esri-widget__heading esri-legend__service-label">
          {layerName}
        </h3>
        {legend.map((item, index) => {
          return (
            <LI key={index}>
              <ImageContainer>
                <img
                  src={`data:image/png;base64,${item.imageData}`}
                  alt={item.label}
                />
              </ImageContainer>
              <LegendLabel>{item.label}</LegendLabel>
            </LI>
          );
        })}
      </MultiContainer>
    );
  };

  if (layer.id === 'waterbodyLayer') return waterbodyLegend;
  if (layer.id === 'issuesLayer') return issuesLegend;
  if (layer.id === 'monitoringStationsLayer') return monitoringStationsLegend;
  if (layer.id === 'dischargersLayer') return dischargersLegend;
  if (layer.id === 'nonprofitsLayer') return nonprofitsLegend;
  if (layer.id === 'providersLayer') return providersLegend;
  if (layer.id === 'boundariesLayer') return boundariesLegend;
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

  return null;
}

export default MapLegend;
