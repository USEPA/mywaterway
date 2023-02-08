import { useCallback, useEffect, useRef, useState } from 'react';
import { css } from 'styled-components/macro';
import { createPortal, render } from 'react-dom';
// types
import type { CSSProperties, MutableRefObject, ReactNode } from 'react';

/*
## Components
*/

export function useSurroundingsWidget() {
  const [container] = useState(document.createElement('div'));
  useEffect(() => {
    render(<SurroundingsWidget />, container);
  }, [container]);

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

function SurroundingsWidgetContent({ visible }: SurroundingWidgetContentProps) {
  if (!visible) return null;

  return (
    <>
      <div css={widgetContentStyles}>
        <input type="checkbox" onChange={() => null}></input>
      </div>
    </>
  );
}

function Portal({ children, container }: PortalProps) {
  return createPortal(children, container);
}

interface ShowSurroundingWidgetProps {
  onClick: React.MouseEventHandler<HTMLDivElement>;
  forwardedRef: MutableRefObject<HTMLDivElement | null>;
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

type SurroundingWidgetContentProps = SurroundingWidgetProps & {
  visible: boolean;
};

type SurroundingWidgetProps = {};
