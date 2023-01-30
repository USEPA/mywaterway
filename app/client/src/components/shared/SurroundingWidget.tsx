import Color from '@arcgis/core/Color';
import Extent from '@arcgis/core/geometry/Extent';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import Polygon from '@arcgis/core/geometry/Polygon';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal, render } from 'react-dom';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
// types
import type {
  ChangeEvent,
  CSSProperties,
  MutableRefObject,
  ReactNode,
} from 'react';

/*
## Components
*/

export function useSurroundingWidget() {
  const {
    getAllWaterbodiesLayer: getWaterbodiesLayer,
    getHucBoundaries,
    getLayers,
    setLayers,
  } = useContext(LocationSearchContext);

  const [container] = useState(document.createElement('div'));
  useEffect(() => {
    render(
      <SurroundingWidget
        getHucBoundaries={getHucBoundaries}
        getLayers={getLayers}
        getWaterbodiesLayer={getWaterbodiesLayer}
        setLayers={setLayers}
      />,
      container,
    );
  }, [container, getHucBoundaries, getLayers, getWaterbodiesLayer, setLayers]);

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
  getLayers,
  getWaterbodiesLayer,
  setLayers,
  visible,
}: SurroundingWidgetContentProps) {
  const hucGraphic = useHucGraphic(getHucBoundaries());

  const {
    layer: allWaterbodiesLayer,
    toggleSurroundings: toggleSurroundingWaterbodies,
  } = useAllFeaturesLayer(getWaterbodiesLayer(), hucGraphic);

  const surroundingLayers = useMemo(() => {
    return [allWaterbodiesLayer];
  }, [allWaterbodiesLayer]);

  useEffect(() => {
    setLayers(
      getLayers().reduce((current: __esri.Layer[], layer: __esri.Layer) => {
        if (layer.id === 'boundariesLayer') {
          return current.concat([layer, ...surroundingLayers]);
        } else {
          return current.concat(layer);
        }
      }, []),
    );
  }, [getLayers, setLayers, surroundingLayers]);

  if (!visible) return null;

  return (
    <>
      <div>
        <input type="checkbox" onChange={toggleSurroundingWaterbodies}></input>
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
## Hooks
*/

function useHucGraphic(hucBoundaries: __esri.FeatureSet | null) {
  const [hucGraphic, setHucGraphic] = useState(new Graphic());

  useEffect(() => {
    if (!hucBoundaries?.features.length) return;
    const geometry = hucBoundaries.features[0].geometry;
    if (!isPolygon(geometry)) return;

    setHucGraphic(
      new Graphic({
        geometry: new Polygon({
          spatialReference: hucBoundaries.spatialReference,
          rings: geometry.rings,
        }),
        symbol: new SimpleFillSymbol({
          color: 'white',
        }),
      }),
    );
  }, [hucBoundaries]);

  return hucGraphic;
}

function useAllFeaturesLayer(
  layer: __esri.Layer | null,
  hucGraphic: __esri.Graphic,
) {
  const [surroundingMask] = useState(getSurroundingMask());

  const surroundingLayer = useMemo(() => {
    return new GraphicsLayer({
      graphics: [surroundingMask],
      opacity: surroundingLayerVisibleOpacity,
    });
  }, [surroundingMask]);

  const enclosingLayer = useMemo(() => {
    return new GraphicsLayer();
  }, []);

  useEffect(() => {
    enclosingLayer.graphics.removeAll();
    if (hucGraphic) enclosingLayer.graphics.add(hucGraphic);
  }, [enclosingLayer, hucGraphic]);

  const maskLayer = useMemo(() => {
    return new GroupLayer({
      layers: [surroundingLayer, enclosingLayer],
    });
  }, [enclosingLayer, surroundingLayer]);

  const allFeaturesLayer = useMemo(() => {
    const layers = layer ? [layer, maskLayer] : [maskLayer];
    return new GroupLayer({
      blendMode: 'destination-in',
      layers,
    });
  }, [layer, maskLayer]);

  const toggleSurroundings = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => {
      surroundingLayer.opacity = ev.target.checked
        ? 0
        : surroundingLayerVisibleOpacity;
    },
    [surroundingLayer],
  );

  return { layer: allFeaturesLayer, toggleSurroundings };
}

/*
## Utils
*/

function getSurroundingMask() {
  return new Graphic({
    geometry: new Extent({
      xmin: -180,
      xmax: 180,
      ymin: -90,
      ymax: 90,
    }),
    symbol: new SimpleFillSymbol({
      color: new Color('rgba(0, 0, 0, 1)'),
    }),
  });
}

function isPolygon(geometry: __esri.Geometry): geometry is __esri.Polygon {
  return geometry.type === 'polygon';
}

/*
## Constants
*/

const surroundingLayerVisibleOpacity = 0.3;

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
  getLayers: () => __esri.Layer[];
  getWaterbodiesLayer: () => __esri.GroupLayer;
  setLayers: (layers: __esri.Layer[]) => void;
};
