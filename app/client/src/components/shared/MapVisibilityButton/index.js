// @flow

import React from 'react';
import styled from 'styled-components';
// contexts
import { MapHighlightContext } from 'contexts/MapHighlight';
// styles
import { colors } from 'styles/index.js';

// --- styled components ---
const MapButton = styled.p`
  padding: 0.5rem 0;
  text-align: right;

  button {
    margin-bottom: 0;
    padding: 0.5em;
    font-size: 0.875em;
    font-weight: normal;
    color: ${colors.gray6};
    background-color: transparent;
  }
`;

// --- components ---
type Props = {
  children: Function,
};

function MapVisibilityButton({ children }: Props) {
  const { selectedGraphic } = React.useContext(MapHighlightContext);
  const [mapShown, setMapShown] = React.useState(false);

  const opacity = mapShown ? 0.6 : 1;
  const iconClass = mapShown ? 'far fa-eye-slash' : 'far fa-eye';
  const buttonText = mapShown ? 'Hide Map' : 'Show Map';

  // Show the map if the View on Map button is clicked (i.e. when the selected
  // graphic changes).
  React.useEffect(() => {
    if (!selectedGraphic) return;

    setMapShown(true);
  }, [selectedGraphic]);

  return (
    <>
      <MapButton style={{ opacity }}>
        <button onClick={(ev) => setMapShown(!mapShown)}>
          {buttonText}&nbsp;&nbsp;
          <i className={iconClass} />
        </button>
      </MapButton>

      {children(mapShown)}
    </>
  );
}

export default MapVisibilityButton;
