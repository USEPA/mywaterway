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
import { useLayersState } from 'contexts/Layers';
import {
  isBoundariesToggleLayerId,
  useSurroundingsState,
} from 'contexts/Surroundings';
// utils
import { isEmpty } from 'utils/utils';
// styles
import { fonts } from 'styles';
// types
import type { LayersState } from 'contexts/Layers';
import type {
  BoundariesToggleLayerId,
  SurroundingsState,
} from 'contexts/Surroundings';
import type { MutableRefObject, ReactNode } from 'react';

/*
## Components
*/

export function useSurroundingsWidget(triggerVisible: boolean) {
  const { visibleLayers } = useContext(LocationSearchContext);
  const layers = useLayersState();
  const { togglers, disabled, updating, visible } = useSurroundingsState();

  const includedLayers = useMemo(() => {
    return Object.keys(visibleLayers).reduce<Partial<LayersState>>(
      (included, key) => {
        if (layers.hasOwnProperty(key) && isBoundariesToggleLayerId(key)) {
          return {
            ...included,
            [key]: layers[key],
          };
        } else return included;
      },
      {},
    );
  }, [layers, visibleLayers]);

  const [container] = useState(document.createElement('div'));
  useEffect(() => {
    render(
      <SurroundingsWidget
        surroundingsVisible={visible}
        toggles={togglers}
        togglesDisabled={disabled}
        layers={includedLayers}
        layersUpdating={updating}
        triggerVisible={triggerVisible}
      />,
      container,
    );
  }, [
    container,
    disabled,
    includedLayers,
    togglers,
    triggerVisible,
    updating,
    visible,
  ]);

  return container;
}

function SurroundingsWidget(props: SurroundingsWidgetProps) {
  const [contentVisible, setContentVisible] = useState(false);
  const toggleContentVisibility = useCallback(() => {
    setContentVisible(!contentVisible);
  }, [contentVisible]);

  const { triggerVisible, ...rest } = props;
  const { layers, layersUpdating, surroundingsVisible, togglesDisabled } =
    props;

  const triggerRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {triggerRef.current && (
        <Portal container={triggerRef.current}>
          <SurroundingsWidgetContent {...rest} visible={contentVisible} />
        </Portal>
      )}
      <SurroundingsWidgetTrigger
        disabled={isEmpty(layers)}
        forwardedRef={triggerRef}
        onClick={toggleContentVisibility}
        updating={Object.entries(layersUpdating).some(
          ([id, isUpdating]) =>
            isUpdating === true &&
            surroundingsVisible[id as BoundariesToggleLayerId] &&
            !togglesDisabled[id as BoundariesToggleLayerId],
        )}
        visible={triggerVisible}
      />
    </>
  );
}

function SurroundingsWidgetContent({
  layers,
  surroundingsVisible,
  toggles,
  togglesDisabled,
  visible,
}: SurroundingsWidgetContentProps) {
  return (
    <div css={widgetContentStyles(visible)}>
      <div>
        <h1>Surrounding Features:</h1>
        <div>
          <ul>
            {(Object.keys(toggles) as BoundariesToggleLayerId[]).map((id) => {
              const layer = layers[id];
              if (!layer) return null;
              let title = `Show Surrounding ${layer.title}`;
              if (togglesDisabled[id]) {
                title = `Surrounding ${layer.title} Not Available`;
              } else if (surroundingsVisible[id]) {
                title = `Hide Surrounding ${layer.title}`;
              }
              return (
                <li key={id}>
                  <div title={title}>
                    <div
                      css={listItemContentStyles(togglesDisabled[id])}
                      onClick={
                        togglesDisabled[id]
                          ? undefined
                          : toggles[id](!surroundingsVisible[id])
                      }
                    >
                      <span
                        className={`esri-icon-${
                          !togglesDisabled[id] && surroundingsVisible[id]
                            ? ''
                            : 'non-'
                        }visible`}
                      ></span>
                      <span>{layer.title}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Portal({ children, container }: PortalProps) {
  return createPortal(children, container);
}

function SurroundingsWidgetTrigger({
  disabled,
  forwardedRef,
  onClick,
  updating,
  visible,
}: SurroundingsWidgetTriggerProps) {
  const [hover, setHover] = useState(false);

  let title = disabled
    ? 'Surrounding Features Widget Not Available'
    : 'Toggle Surrounding Features';

  let iconClass = updating
    ? 'esri-icon-loading-indicator esri-rotating'
    : 'esri-icon esri-icon-globe';

  if (!visible) return null;

  return (
    <div
      title={title}
      css={divStyle(disabled, hover)}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      onClick={disabled ? undefined : onClick}
      ref={forwardedRef}
    >
      <span className={iconClass} css={buttonStyle(disabled, hover)} />
    </div>
  );
}

/*
## Styles
*/

const buttonStyle = (disabled: boolean, hover: boolean) => css`
  margin: 8.5px;
  fontsize: 15px;
  text-align: center;
  vertical-align: middle;
  color: ${!disabled && hover ? 'black' : '#6E6E6E'};
`;

const divStyle = (disabled: boolean, hover: boolean) => css`
  background-color: ${!disabled && hover ? '#F0F0F0' : 'white'};
  cursor: ${disabled ? 'default' : 'pointer'};
  height: 32px;
  opacity: ${disabled ? 0.5 : 1.0};
  position: relative;
  width: 32px;
`;

const listItemContentStyles = (disabled: boolean) => css`
  align-items: flex-start;
  color: ${disabled ? '#6e6e6e' : 'inherit'};
  cursor: ${disabled ? 'normal' : 'pointer'};
  display: flex;
  flex-flow: row;
  gap: 5px;
  justify-content: flex-start;
  padding: 5px;

  span:first-of-type {
    font-size: 16px;
  }

  span:last-of-type {
    font-size: 0.8125em;
    margin: auto 0;
  }
`;

const widgetContentStyles = (visible: boolean) => css`
  background-color: white;
  cursor: initial;
  height: auto;
  margin-right: 7px;
  max-height: 420px;
  opacity: ${visible ? 1 : 0};
  overflow: auto;
  position: absolute;
  transition: opacity 250ms ease-in-out, margin 250ms ease-in-out;
  right: 32px;
  top: 0px;
  visibility: ${visible ? 'visible' : 'hidden'};
  width: auto;

  & > div {
    padding-top: 10px;
    width: 200px;

    h1 {
      font-family: ${fonts.primary};
      font-size: 1.25em;
      font-weight: 500;
      line-height: 1.2;
      margin: 0 10px;
      padding: 0;
    }

    & > div {
      color: #323232;
      display: flex;
      flex-flow: column;
      padding: 12px 10px 0;

      & > ul {
        list-style: none;
        padding: 2px;

        & > li {
          box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
          line-height: 1;
          margin-bottom: 10px;

          & > div {
            border-left: 3px solid transparent;
            padding: 5px;
          }
        }
      }
    }
  }
`;

/*
## Types
*/

type PortalProps = {
  children: ReactNode;
  container: HTMLDivElement;
};

type SurroundingsWidgetTriggerProps = {
  disabled: boolean;
  forwardedRef: MutableRefObject<HTMLDivElement | null>;
  onClick: React.MouseEventHandler<HTMLDivElement>;
  updating: boolean;
  visible: boolean;
};

type SurroundingsWidgetContentProps = Omit<
  SurroundingsWidgetProps,
  'triggerVisible'
> & {
  visible: boolean;
};

type SurroundingsWidgetProps = {
  layers: Partial<Pick<LayersState, BoundariesToggleLayerId>>;
  layersUpdating: Partial<{ [B in BoundariesToggleLayerId]: boolean }>;
  surroundingsVisible: SurroundingsState['visible'];
  toggles: SurroundingsState['togglers'];
  togglesDisabled: SurroundingsState['disabled'];
  triggerVisible: boolean;
};
