import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css, keyframes } from 'styled-components/macro';
import { createPortal, render } from 'react-dom';
// contexts
import { useLayersState } from 'contexts/Layers';
import {
  isSurroundingFeaturesLayerId,
  useSurroundingsState,
} from 'contexts/Surroundings';
// utils
import { isClick, isEmpty } from 'utils/utils';
// styles
import { fonts } from 'styles';
// types
import type { LayersState } from 'contexts/Layers';
import type {
  SurroundingFeaturesLayerId,
  SurroundingsState,
} from 'contexts/Surroundings';
import type {
  KeyboardEvent,
  MouseEvent,
  MutableRefObject,
  ReactNode,
} from 'react';

/*
## Components
*/

export function useSurroundingsWidget(triggerVisible = true) {
  const { layers, visible: visibleLayers } = useLayersState();
  const { togglers, disabled, updating, visible } = useSurroundingsState();

  const includedLayers = useMemo(() => {
    return Object.keys(visibleLayers).reduce<Partial<LayersState['layers']>>(
      (included, key) => {
        if (layers.hasOwnProperty(key) && isSurroundingFeaturesLayerId(key)) {
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
        layers={includedLayers}
        layersUpdating={updating}
        surroundingsVisible={visible}
        toggles={togglers}
        togglesDisabled={disabled}
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
  const toggleContentVisibility = useCallback(
    (ev: KeyboardEvent | MouseEvent) => {
      if (!isClick(ev)) return;
      setContentVisible(!contentVisible);
    },
    [contentVisible],
  );

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
        contentVisible={contentVisible}
        disabled={isEmpty(layers)}
        forwardedRef={triggerRef}
        onClick={toggleContentVisibility}
        updating={Object.entries(layersUpdating).some(
          ([id, isUpdating]) =>
            isUpdating === true &&
            surroundingsVisible[id as SurroundingFeaturesLayerId] &&
            !togglesDisabled[id as SurroundingFeaturesLayerId],
        )}
        visible={triggerVisible}
      />
    </>
  );
}

function SurroundingsWidgetContent({
  layers,
  layersUpdating,
  surroundingsVisible,
  toggles,
  togglesDisabled,
  visible,
}: SurroundingsWidgetContentProps) {
  return (
    <div css={widgetContentStyles(visible)} role="region">
      <div>
        <h1 id="surrounding-features-widget-heading">Surrounding Features:</h1>
        <div>
          <ul aria-labelledby="surrounding-features-widget-heading">
            {(Object.keys(toggles) as SurroundingFeaturesLayerId[]).map(
              (id) => {
                const layer = layers[id];
                if (!layer) return null;
                let title = `Show ${layer.title}`;
                if (togglesDisabled[id]) {
                  title = `${layer.title} Not Available`;
                } else if (surroundingsVisible[id]) {
                  title = `Hide ${layer.title}`;
                }
                const clickHandler = togglesDisabled[id]
                  ? undefined
                  : toggles[id](!surroundingsVisible[id]);
                const updating =
                  layersUpdating[id] &&
                  surroundingsVisible[id] &&
                  !togglesDisabled[id];
                return (
                  <li key={id}>
                    <div title={title}>
                      <div
                        aria-checked={
                          !togglesDisabled[id] && surroundingsVisible[id]
                        }
                        aria-labelledby={`label-${id}`}
                        css={listItemContentStyles(togglesDisabled[id])}
                        onClick={clickHandler}
                        onKeyDown={clickHandler}
                        role="switch"
                        tabIndex={0}
                      >
                        <span
                          aria-hidden="true"
                          className={`esri-icon-${
                            !togglesDisabled[id] && surroundingsVisible[id]
                              ? ''
                              : 'non-'
                          }visible`}
                        ></span>
                        <span id={`label-${id}`}>
                          {layer.title.replace('Surrounding ', '')}
                        </span>
                      </div>
                    </div>
                    <div css={updating ? loaderStyles : undefined}></div>
                  </li>
                );
              },
            )}
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
  contentVisible,
  disabled,
  forwardedRef,
  onClick,
  updating,
  visible,
}: SurroundingsWidgetTriggerProps) {
  const [hover, setHover] = useState(false);

  const title = disabled
    ? 'Surrounding Features Widget Not Available'
    : 'Toggle Surrounding Features';

  let iconClass = 'esri-icon esri-icon-globe';
  if (contentVisible) iconClass = 'esri-icon-collapse';
  if (updating) iconClass = 'esri-icon-loading-indicator esri-rotating';

  if (!visible) return null;

  return (
    <div
      aria-label="Surrounding Features"
      title={title}
      css={divStyle(disabled, hover)}
      onClick={disabled ? undefined : onClick}
      onKeyDown={disabled ? undefined : onClick}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      ref={forwardedRef}
      role="button"
      tabIndex={0}
    >
      <span
        aria-hidden="true"
        className={iconClass}
        css={buttonStyle(disabled, hover)}
      />
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

const loader = keyframes`
   0% {
      left: 0;
      transform: translateX(-100%);
    }
    100% {
      left: 100%;
      transform: translateX(0%);
    }
`;

const loaderStyles = css`
  &::after {
    content: '';
    width: 80px;
    height: 1.5px;
    background: rgba(110, 110, 110, 0.3);
    position: absolute;
    top: 0;
    left: 0;
    animation: ${loader} 2s linear infinite;
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

          & > div:first-child {
            border-left: 3px solid transparent;
            padding: 5px 5px 3.5px;
          }

          & > div:last-child {
            width: 100%;
            height: 1.5px;
            position: relative;
            overflow: hidden;
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
  contentVisible: boolean;
  disabled: boolean;
  forwardedRef: MutableRefObject<HTMLDivElement | null>;
  onClick: (ev: MouseEvent | KeyboardEvent) => void;
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
  layers: Partial<Pick<LayersState['layers'], SurroundingFeaturesLayerId>>;
  layersUpdating: Partial<{ [B in SurroundingFeaturesLayerId]: boolean }>;
  surroundingsVisible: SurroundingsState['visible'];
  toggles: SurroundingsState['togglers'];
  togglesDisabled: SurroundingsState['disabled'];
  triggerVisible: boolean;
};
