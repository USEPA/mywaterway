// @flow

import React from 'react';
import styled from 'styled-components';
// components
import WaterbodyInfo from 'components/shared/WaterbodyInfo';

// --- styled components ---
const Container = styled.div`
  overflow-y: auto;
  margin: 0;

  .esri-feature & p {
    padding-bottom: 0;
  }
`;

const Content = styled.div`
  margin-top: 0.5rem;
  margin-left: 0.625em;
`;

const Type = styled.p`
  padding: 0.45em 0.625em !important;
  font-size: 0.8125em;
  font-weight: bold;
  background-color: #f0f6f9;
  margin-bottom: 0;
`;

// --- components ---
type Props = {
  type: string,
  feature: Object,
  fieldName: ?string,
  extraContent: ?Object,
  getClickedHuc: ?Function,
  resetData: ?Function,
};

function MapPopup({
  type,
  feature,
  fieldName,
  extraContent,
  getClickedHuc,
  resetData,
}: Props) {
  if (!feature) return null;

  const hideTypes = ['Action', 'Change Location', 'Waterbody State Overview'];

  return (
    <Container>
      {!hideTypes.includes(type) && <Type>{type}</Type>}
      <Content>
        <WaterbodyInfo
          type={type}
          feature={feature}
          fieldName={fieldName}
          isPopup={true}
          extraContent={extraContent}
          getClickedHuc={getClickedHuc}
          resetData={resetData}
        />
      </Content>
    </Container>
  );
}

export default MapPopup;
