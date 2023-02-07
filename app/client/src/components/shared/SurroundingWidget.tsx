import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import FeatureSet from '@arcgis/core/rest/support/FeatureSet';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { css } from 'styled-components/macro';
import { createPortal, render } from 'react-dom';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
// types
import type { CSSProperties, MutableRefObject, ReactNode } from 'react';

/*
## Components
*/

export function useSurroundingWidget() {
  const { getHucBoundaries, getLayers, setLayers, usgsStreamgagesLayer } =
    useContext(LocationSearchContext);

  const [testLayer] = useState<__esri.FeatureLayer>(
    new FeatureLayer({
      id: 'countyCropsLayer',
      portalItem: {
        id: 'c786669a00b547c995f0cc970dc007d8',
      },
      opacity: 1,
      title: 'County Crops',
    }),
  );

  const [container] = useState(document.createElement('div'));
  useEffect(() => {
    if (!usgsStreamgagesLayer) return;
    render(
      <SurroundingWidget
        getHucBoundaries={getHucBoundaries}
        getMapLayers={getLayers}
        testLayer={usgsStreamgagesLayer}
        setLayers={setLayers}
      />,
      container,
    );
  }, [container, getHucBoundaries, getLayers, setLayers, usgsStreamgagesLayer]);

  return container;
}

function SurroundingWidget(props: SurroundingWidgetProps) {
  const [contentVisible, setContentVisible] = useState(false);
  const toggleContentVisibility = useCallback(() => {
    setContentVisible(!contentVisible);
  }, [contentVisible]);

  const triggerRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {triggerRef.current && (
        <Portal container={triggerRef.current}>
          <SurroundingWidgetContent {...props} visible={contentVisible} />
        </Portal>
      )}
      <SurroundingWidgetTrigger
        onClick={toggleContentVisibility}
        forwardedRef={triggerRef}
      />
    </>
  );
}

function SurroundingWidgetContent({
  getHucBoundaries,
  getMapLayers,
  setLayers,
  testLayer,
  visible,
}: SurroundingWidgetContentProps) {
  const hucBoundaries = getHucBoundaries() ?? new FeatureSet();

  const { layer: allTestLayer, toggleSurroundings: toggleTestLayer } =
    useAllFeaturesLayer(testLayer, hucBoundaries);

  const surroundingLayers = useMemo(() => {
    return [allTestLayer];
    // return [allWaterbodiesLayer];
  }, [allTestLayer]);

  useEffect(() => {
    setLayers(
      getMapLayers().reduce((current: __esri.Layer[], layer: __esri.Layer) => {
        if (layer.id === 'boundariesLayer') {
          return current.concat([layer, ...surroundingLayers]);
        } else {
          return current.concat(layer);
        }
      }, []),
    );
  }, [getMapLayers, setLayers, surroundingLayers]);

  if (!visible) return null;

  return (
    <>
      <div css={widgetContentStyles}>
        <input type="checkbox" onChange={toggleTestLayer}></input>
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

function SurroundingWidgetTrigger({
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

type SurroundingWidgetProps = {
  getHucBoundaries: () => __esri.FeatureSet;
  getMapLayers: () => __esri.Layer[];
  setLayers: (layers: __esri.Layer[]) => void;
  testLayer: __esri.Layer;
};
