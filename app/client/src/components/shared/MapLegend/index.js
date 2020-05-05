// @flow

import React from 'react';
import styled from 'styled-components';
// components
import PinIcon from 'components/shared/Icons/PinIcon';
import WaterbodyIcon from 'components/shared/WaterbodyIcon';

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

const ignoreLayers = [
  'mappedWaterLayer',
  'countyLayer',
  'watershedsLayer',
  'searchIconLayer',
];

// --- components ---
type Props = {
  type: string,
};

function MapLegend({ visibleLayers }: Props) {
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
            return <MapLegendContent key={index} layer={layer} />;
          })}
        </UL>
      </LegendContainer>
    </Container>
  );
}

type CardProps = {
  layer: Object,
};

const boxSize = 26;
const iconSize = 20;

function MapLegendContent({ layer }: CardProps) {
  const squareIcon = ({ color, strokeWidth = 1, stroke = 'black' }) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={boxSize}
        height={boxSize}
        viewBox={`0 0 ${boxSize} ${boxSize}`}
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
      <ImageContainer>{squareIcon({ color: '#c500ff' })}</ImageContainer>
      <LegendLabel>Monitoring Station</LegendLabel>
    </LI>
  );

  // jsx
  const dischargersLegend = (
    <LI>
      <ImageContainer>{diamondIcon({ color: '#246007' })}</ImageContainer>
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

  if (layer.id === 'waterbodyLayer') return waterbodyLegend;
  if (layer.id === 'issuesLayer') return issuesLegend;
  if (layer.id === 'monitoringStationsLayer') return monitoringStationsLegend;
  if (layer.id === 'dischargersLayer') return dischargersLegend;
  if (layer.id === 'nonprofitsLayer') return nonprofitsLegend;
  if (layer.id === 'providersLayer') return providersLegend;
  if (layer.id === 'boundariesLayer') return boundariesLegend;
  if (layer.id === 'actionsWaterbodies') return actionsWaterbodiesLegend;

  return null;
}

export default MapLegend;
