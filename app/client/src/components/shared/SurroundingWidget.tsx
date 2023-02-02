import Color from '@arcgis/core/Color';
import Extent from '@arcgis/core/geometry/Extent';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import FeatureSet from '@arcgis/core/rest/support/FeatureSet';
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
import { css } from 'styled-components/macro';
import { createPortal, render } from 'react-dom';
import { v4 as uuid } from 'uuid';
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
    render(
      <SurroundingWidget
        getHucBoundaries={getHucBoundaries}
        getMapLayers={getLayers}
        testLayer={testLayer}
        getWaterbodiesLayer={getWaterbodiesLayer}
        setLayers={setLayers}
      />,
      container,
    );
  }, [
    container,
    getHucBoundaries,
    getLayers,
    getWaterbodiesLayer,
    setLayers,
    testLayer,
  ]);

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
  getWaterbodiesLayer,
  setLayers,
  testLayer,
  visible,
}: SurroundingWidgetContentProps) {
  const hucBoundaries = getHucBoundaries() ?? new FeatureSet();
  const hucGraphic = useHucGraphic(hucBoundaries);

  const waterBodiesLayer = getWaterbodiesLayer() ?? createNullGroupLayer();
  const {
    layer: allWaterbodiesLayer,
    toggleSurroundings: toggleSurroundingWaterbodies,
  } = useAllFeaturesLayer(waterBodiesLayer, hucGraphic);

  const { layer: allTestLayer, toggleSurroundings: toggleTestLayer } =
    useAllFeaturesLayer(testLayer, hucGraphic);

  const surroundingLayers = useMemo(() => {
    return [allWaterbodiesLayer, allTestLayer];
    // return [allWaterbodiesLayer];
  }, [allTestLayer, allWaterbodiesLayer]);

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

function useHucGraphic(hucBoundaries: __esri.FeatureSet) {
  const [hucGraphic, setHucGraphic] = useState(new Graphic());

  useEffect(() => {
    if (!hucBoundaries.features.length) return;
    const geometry = hucBoundaries.features[0].geometry;
    if (!isPolygon(geometry)) return;

    setHucGraphic(
      new Graphic({
        geometry: new Polygon({
          spatialReference: hucBoundaries.spatialReference,
          rings: geometry.rings,
        }),
        symbol: new SimpleFillSymbol({
          color: new Color({ r: 255, g: 255, b: 255, a: 1 }),
        }),
      }),
    );
  }, [hucBoundaries]);

  return hucGraphic;
}

function useAllFeaturesLayer(layer: __esri.Layer, hucGraphic: __esri.Graphic) {
  const [surroundingMask] = useState(getSurroundingMask());

  const surroundingLayer = useMemo(() => {
    return new GraphicsLayer({
      graphics: [surroundingMask],
      id: `surrounding-${layer.id}`,
      opacity: 0,
    });
  }, [layer, surroundingMask]);

  const enclosedLayer = useMemo(() => {
    return new GraphicsLayer({
      id: `enclosed-${layer.id}`,
      opacity: 1,
    });
  }, [layer]);

  useEffect(() => {
    enclosedLayer.graphics.removeAll();
    if (hucGraphic) enclosedLayer.graphics.add(hucGraphic);
  }, [enclosedLayer, hucGraphic]);

  const maskLayer = useMemo(() => {
    return new GroupLayer({
      blendMode: 'destination-in',
      id: `mask-${layer.id}`,
      layers: [surroundingLayer, enclosedLayer],
      opacity: 1,
    });
  }, [enclosedLayer, layer, surroundingLayer]);

  const allFeaturesLayer = useMemo(() => {
    const layers = layer ? [layer, maskLayer] : [maskLayer];
    return new GroupLayer({
      id: `all-${layer.id}`,
      layers,
      listMode: 'hide-children',
      title: layer.title,
    });
  }, [layer, maskLayer]);

  const toggleSurroundings = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => {
      surroundingLayer.opacity = ev.target.checked
        ? surroundingLayerVisibleOpacity
        : 0;
    },
    [surroundingLayer],
  );

  return { layer: allFeaturesLayer, toggleSurroundings };
}

/*
## Utils
*/

function createNullGroupLayer() {
  return new GroupLayer({
    id: uuid(),
    title: 'Layer',
  });
}

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

const surroundingLayerVisibleOpacity = 0.8;

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
  getWaterbodiesLayer: () => __esri.GroupLayer;
  setLayers: (layers: __esri.Layer[]) => void;
  testLayer: __esri.Layer;
};
