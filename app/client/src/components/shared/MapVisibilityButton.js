// @flow

import React, { useEffect, useState } from 'react';
import { css } from 'styled-components/macro';
// contexts
import { useMapHighlightState } from 'contexts/MapHighlight';
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
  callback?: (mapShown: boolean) => void,
  children?: (mapShown: boolean) => void,
  text?: string,
  value?: boolean,
};

function MapVisibilityButton({
  callback = () => {},
  children,
  text = 'Map',
  value = false,
}: Props) {
  const { selectedGraphic } = useMapHighlightState();
  const [mapShown, setMapShown] = useState(value);

  const iconClassName = mapShown ? 'far fa-eye-slash' : 'far fa-eye';

  // show the map if the View on Map button is clicked
  // (i.e. when the selected graphic changes)
  useEffect(() => {
    if (!selectedGraphic) return;
    setMapShown(true);
  }, [selectedGraphic]);

  // keep the local value up to date
  useEffect(() => {
    setMapShown(value);
  }, [value]);

  return (
    <>
      <div css={buttonContainerStyles} style={{ opacity: mapShown ? 0.6 : 1 }}>
        <button
          onClick={(ev) => {
            setMapShown(!mapShown);
            if (callback) callback(!mapShown);
          }}
        >
          {mapShown ? `Hide ${text}` : `Show ${text}`}&nbsp;&nbsp;
          <i className={iconClassName} aria-hidden="true" />
        </button>
      </div>

      {children?.(mapShown)}
    </>
  );
}

export default MapVisibilityButton;
