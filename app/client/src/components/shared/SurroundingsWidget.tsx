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
import { BoundariesToggleLayerId, useLayersState } from 'contexts/Layers';
// styles
import { fonts } from 'styles';
// types
import type { LayerId, LayersState } from 'contexts/Layers';
import type { MutableRefObject, ReactNode } from 'react';

/*
## Components
*/

export function useSurroundingsWidget() {
  const { visibleLayers } = useContext(LocationSearchContext);
  const {
    layers,
    boundariesToggles: toggles,
    boundariesTogglesDisabled: togglesDisabled,
    surroundingsVisibilities: surroundings,
  } = useLayersState();

  const includedLayers = useMemo(() => {
    return Object.keys(visibleLayers).reduce<Partial<LayersState['layers']>>(
      (included, key) => {
        if (layers.hasOwnProperty(key)) {
          return {
            ...included,
            [key]: layers[key as LayerId],
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
        surroundings={surroundings}
        toggles={toggles}
        togglesDisabled={togglesDisabled}
        layers={includedLayers}
      />,
      container,
    );
  }, [container, includedLayers, surroundings, toggles, togglesDisabled]);

  return container;
}

function SurroundingsWidget(props: SurroundingsWidgetProps) {
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
  surroundings,
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
              return (
                <li key={id}>
                  <div>
                    <div
                      css={listItemContentStyles(togglesDisabled[id])}
                      onClick={
                        togglesDisabled[id]
                          ? undefined
                          : toggles[id](!surroundings[id])
                      }
                    >
                      <span
                        className={`esri-icon-${
                          !togglesDisabled[id] && surroundings[id] ? '' : 'non-'
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
  onClick,
  forwardedRef,
}: SurroundingsWidgetTriggerProps) {
  const [hover, setHover] = useState(false);

  let title = 'Toggle Surrounding Features';

  let iconClass = 'esri-icon esri-icon-globe';

  return (
    <div
      title={title}
      css={divStyle(hover)}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      onClick={onClick}
      ref={forwardedRef}
    >
      <span className={iconClass} css={buttonStyle(hover)} />
    </div>
  );
}

/*
## Styles
*/

const buttonStyle = (hover: boolean) => css`
  margin: 8.5px;
  fontsize: 15px;
  text-align: center;
  vertical-align: middle;
  color: ${hover ? 'black' : '#6E6E6E'};
`;

const divStyle = (hover: boolean) => css`
  background-color: ${hover ? '#F0F0F0' : 'white'};
  cursor: pointer;
  height: 32px;
  position: relative;
  width: 32px;
`;

const listItemContentStyles = (disabled: boolean) => css`
  align-items: flex-start;
  color: ${disabled ? '#6e6e6e' : 'inherit'};
  cursor: ${disabled ? 'initial' : 'pointer'};
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
  onClick: React.MouseEventHandler<HTMLDivElement>;
  forwardedRef: MutableRefObject<HTMLDivElement | null>;
};

type SurroundingsWidgetContentProps = SurroundingsWidgetProps & {
  visible: boolean;
};

type SurroundingsWidgetProps = {
  layers: Partial<LayersState['layers']>;
  surroundings: LayersState['surroundingsVisibilities'];
  toggles: LayersState['boundariesToggles'];
  togglesDisabled: LayersState['boundariesTogglesDisabled'];
};
