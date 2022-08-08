// @flow

import React, { useContext, useState, useEffect } from 'react';
import { css } from 'styled-components/macro';
// contexts
import { useMapHighlightContext } from 'contexts/MapHighlight';
// styles
import { colors } from 'styles/index.js';

const buttonContainerStyles = css`
  text-align: right;

  button {
    margin: 0.5rem 0;
    padding: 0.5rem;
    font-size: 0.8125em;
    font-weight: normal;
    color: ${colors.gray6};
    background-color: transparent;
  }
`;

type Props = {
  children: Function,
};

function MapVisibilityButton({ children }: Props) {
  const { selectedGraphic } = useMapHighlightContext();
  const [mapShown, setMapShown] = useState(false);

  const iconClassName = mapShown ? 'far fa-eye-slash' : 'far fa-eye';

  // show the map if the View on Map button is clicked
  // (i.e. when the selected graphic changes)
  useEffect(() => {
    if (!selectedGraphic) return;
    setMapShown(true);
  }, [selectedGraphic]);

  return (
    <>
      <div css={buttonContainerStyles} style={{ opacity: mapShown ? 0.6 : 1 }}>
        <button onClick={(ev) => setMapShown(!mapShown)}>
          {mapShown ? 'Hide Map' : 'Show Map'}&nbsp;&nbsp;
          <i className={iconClassName} aria-hidden="true" />
        </button>
      </div>

      {children(mapShown)}
    </>
  );
}

export default MapVisibilityButton;
