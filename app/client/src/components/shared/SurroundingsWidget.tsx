/** @jsxImportSource @emotion/react */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css, keyframes } from '@emotion/react';
import { createPortal } from 'react-dom';
import { Root, createRoot } from 'react-dom/client';
import { CalciteAction, CalciteIcon } from '@esri/calcite-components-react';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
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
  const [root, setRoot] = useState<Root | null>(null);
  useEffect(() => {
    const content = (
      <SurroundingsWidget
        layers={includedLayers}
        layersUpdating={updating}
        surroundingsVisible={visible}
        toggles={togglers}
        togglesDisabled={disabled}
        triggerVisible={triggerVisible}
      />
    );

    if (root) root.render(content);
    else {
      const newRoot = createRoot(container);
      newRoot.render(content);
      setRoot(newRoot);
    }
  }, [
    container,
    disabled,
    includedLayers,
    root,
    togglers,
    triggerVisible,
    updating,
    visible,
  ]);

  return container;
}

function SurroundingsWidget(props: Readonly<SurroundingsWidgetProps>) {
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
        <h2 id="surrounding-features-widget-heading">Surrounding Features:</h2>
        <div
          aria-labelledby="surrounding-features-widget-heading"
          css={widgetListStyles}
        >
          {(Object.keys(toggles) as SurroundingFeaturesLayerId[]).map((id) => (
            <SurroundingsWidgetButton
              key={id}
              id={id}
              layers={layers}
              layersUpdating={layersUpdating}
              surroundingsVisible={surroundingsVisible}
              toggles={toggles}
              togglesDisabled={togglesDisabled}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SurroundingsWidgetButton({
  id,
  layers,
  layersUpdating,
  surroundingsVisible,
  toggles,
  togglesDisabled,
}: SurroundingsWidgetButtonProps) {
  const [hover, setHover] = useState(false);

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
    layersUpdating[id] && surroundingsVisible[id] && !togglesDisabled[id];
  const visible = !togglesDisabled[id] && surroundingsVisible[id];
  return (
    <div css={widgetListItemStyles}>
      <div title={title}>
        <div
          aria-checked={visible}
          aria-labelledby={`label-${id}`}
          css={listItemContentStyles(togglesDisabled[id], hover)}
          onFocus={() => setHover(true)}
          onBlur={() => setHover(false)}
          onMouseOver={() => setHover(true)}
          onMouseOut={() => setHover(false)}
          onClick={clickHandler}
          onKeyDown={clickHandler}
          role="switch"
          tabIndex={0}
        >
          <span id={`label-${id}`}>
            {layer.title.replace('Surrounding ', '')}
          </span>
          <div css={divActionStyle}>
            {(hover || !visible) && (
              <CalciteAction
                icon={visible ? 'view-visible' : 'view-hide'}
                scale="s"
                text="Visibility"
              />
            )}
          </div>
        </div>
      </div>
      <div css={updating ? loaderStyles : undefined}></div>
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
}: Readonly<SurroundingsWidgetTriggerProps>) {
  const [hover, setHover] = useState(false);

  let title = 'Open Surrounding Features';
  let icon = 'globe';
  if (contentVisible) {
    icon = 'chevrons-right';
    title = 'Close Surrounding Features';
  }
  if (disabled) title = 'Surrounding Features Widget Not Available';

  if (!visible) return null;

  return (
    <div
      aria-label="Surrounding Features"
      title={title}
      css={divStyle(disabled, hover)}
      onClick={disabled ? undefined : onClick}
      onKeyDown={disabled ? undefined : onClick}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      ref={forwardedRef}
      role="button"
      tabIndex={0}
    >
      {updating ? <LoadingSpinner /> : <CalciteIcon icon={icon} scale="s" />}
    </div>
  );
}

/*
## Styles
*/

const divStyle = (disabled: boolean, hover: boolean) => css`
  align-items: center;
  background-color: ${!disabled && hover ? '#F0F0F0' : 'white'};
  cursor: ${disabled ? 'default' : 'pointer'};
  display: flex;
  height: 32px;
  justify-content: center;
  padding: 8.5px;
  opacity: ${disabled ? 0.5 : 1.0};
  position: relative;
  width: 32px;

  --calcite-ui-icon-color: ${!disabled && hover ? 'black' : '#6E6E6E'};
`;

const divActionStyle = css`
  align-items: center;
  display: flex;
  transition-property: none;

  --calcite-color-foreground-2: #e9e9e9;

  &:hover {
    background-color: #e9e9e9;
    --calcite-color-foreground-1: #e9e9e9;
    --calcite-color-transparent-hover: #e9e9e9;
    --calcite-ui-icon-color: black;
  }
`;

const listItemContentStyles = (disabled: boolean, hover: boolean) => css`
  background-color: ${!disabled && hover ? '#f3f3f3' : 'white'};
  color: ${disabled ? '#6e6e6e' : 'inherit'};
  cursor: ${disabled ? 'normal' : 'pointer'};
  display: grid;
  font-family: 'Source Sans Pro Web', 'Helvetica Neue', 'Helvetica', 'Roboto',
    'Arial', sans-serif;
  font-size: 1rem;
  grid-template-columns: 86% 14%;
  outline: none !important;
  padding-left: 3px;
  transition-property: none;

  --calcite-color-foreground-1: ${!disabled && hover ? '#f3f3f3' : 'white'};
  calcite-action {
    pointer-events: none;
  }

  span:last-of-type {
    font-size: 0.875em;
    margin: auto 0;
    padding-inline: 0.75rem;
    padding-block: 0.5rem;
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
  overflow-x: hidden;
  overflow-y: auto;
  position: absolute;
  transition:
    opacity 250ms ease-in-out,
    margin 250ms ease-in-out;
  right: 32px;
  top: 0px;
  visibility: ${visible ? 'visible' : 'hidden'};
  width: 242px;

  & > div {
    padding-top: 10px;
    width: 242px;

    h2 {
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
      padding-top: 5px;
    }
  }
`;

const widgetListItemStyles = css`
  border-block-end: 1px solid #dfdfdf;
  line-height: 1.375;
  margin: 0;
`;

const widgetListStyles = css`
  list-style: none;
  padding: 0;
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

type SurroundingsWidgetButtonProps = Omit<
  SurroundingsWidgetProps,
  'triggerVisible'
> & {
  id: SurroundingFeaturesLayerId;
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
