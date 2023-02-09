import { useCallback, useEffect, useRef, useState } from 'react';
import { css } from 'styled-components/macro';
import { createPortal, render } from 'react-dom';
// contexts
import { useLayers, useLayersBoundariesToggles } from 'contexts/Layers';
// types
import type { LayersState } from 'contexts/Layers';
import type { CSSProperties, MutableRefObject, ReactNode } from 'react';

/*
## Components
*/

export function useSurroundingsWidget() {
  const toggles = useLayersBoundariesToggles();
  const layers = useLayers();

  const [container] = useState(document.createElement('div'));
  useEffect(() => {
    render(<SurroundingsWidget toggles={toggles} layers={layers} />, container);
  }, [container, layers, toggles]);

  return container;
}

function SurroundingsWidget(props: SurroundingWidgetProps) {
  const [contentVisible, setContentVisible] = useState(false);
  const toggleContentVisibility = useCallback(() => {
    setContentVisible(!contentVisible);
  }, [contentVisible]);

  const triggerRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {triggerRef.current && (
        <Portal container={triggerRef.current}>
          <SurroundingsWidgetContent {...props} visible={contentVisible} />
        </Portal>
      )}
      <SurroundingsWidgetTrigger
        onClick={toggleContentVisibility}
        forwardedRef={triggerRef}
      />
    </>
  );
}

function SurroundingsWidgetContent({
  layers,
  toggles,
  visible,
}: SurroundingWidgetContentProps) {
  if (!visible) return null;

  return (
    <>
      <div css={widgetContentStyles}>
        {layers.usgsStreamgagesLayer && (
          <>
            <label htmlFor={layers.usgsStreamgagesLayer.id}>
              {layers.usgsStreamgagesLayer.title}
            </label>
            <input
              id={layers.usgsStreamgagesLayer.id}
              type="checkbox"
              onChange={(ev) => toggles.usgsStreamgagesLayer(ev.target.checked)}
            ></input>
          </>
        )}
      </div>
    </>
  );
}

function Portal({ children, container }: PortalProps) {
  return createPortal(children, container);
}

function SurroundingsWidgetTrigger({
  onClick,
  forwardedRef,
}: ShowSurroundingWidgetProps) {
  const [hover, setHover] = useState(false);

  let title = 'Toggle Surrounding Features';

  let iconClass = 'esri-icon esri-icon-globe';

  return (
    <div
      title={title}
      style={hover ? divHoverStyle : divStyle}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      onClick={onClick}
      ref={forwardedRef}
    >
      <span
        className={iconClass}
        style={hover ? buttonHoverStyle : buttonStyle}
      />
    </div>
  );
}

/*
## Styles
*/

const buttonStyle: CSSProperties = {
  margin: '8.5px',
  fontSize: '15px',
  textAlign: 'center',
  verticalAlign: 'middle',

  backgroundColor: 'white',
  color: '#6E6E6E',
};

const buttonHoverStyle: CSSProperties = {
  margin: '8.5px',
  fontSize: '15px',
  textAlign: 'center',
  verticalAlign: 'middle',

  backgroundColor: '#F0F0F0',
  color: 'black',
  cursor: 'pointer',
};

const divStyle = {
  height: '32px',
  width: '32px',
  backgroundColor: 'white',
};

const divHoverStyle = {
  height: '32px',
  width: '32px',
  backgroundColor: '#F0F0F0',
  cursor: 'pointer',
};

const widgetContentStyles = css`
  position: relative;
  right: 50px;
`;

/*
## Types
*/

type PortalProps = {
  children: ReactNode;
  container: HTMLDivElement;
};

type ShowSurroundingWidgetProps = {
  onClick: React.MouseEventHandler<HTMLDivElement>;
  forwardedRef: MutableRefObject<HTMLDivElement | null>;
};

type SurroundingWidgetContentProps = SurroundingWidgetProps & {
  visible: boolean;
};

type SurroundingWidgetProps = {
  layers: LayersState['layers'];
  toggles: LayersState['boundariesToggles'];
};
