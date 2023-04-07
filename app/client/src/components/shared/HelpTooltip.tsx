import React, { useRef } from 'react';
import { TooltipPopup, useTooltip } from '@reach/tooltip';
import { css } from 'styled-components/macro';
// styles
import '@reach/tooltip/styles.css';
import { colors } from 'styles';
// types
import type { Position } from '@reach/tooltip';
import type { ReactElement, ReactNode, Ref } from 'react';

/*
## Styles
*/
const helpIconStyles = css`
  cursor: help;
`;

const tooltipIconStyles = css`
  background: none;
  border: none;
  color: inherit;
  cursor: unset !important;
  margin: 0;
  outline: inherit;
  padding: 0;
`;

const tooltipStyles = css`
  background: ${colors.steel(0.95)};
  border: none;
  border-radius: 6px;
  color: white;
  max-width: 320px;
  padding: 0.5em 1em;
  text-align: center;
  white-space: normal;
`;

/*
## Helpers
 */
const centered: Position = (triggerRect, tooltipRect) => {
  if (!triggerRect || !tooltipRect) return {};
  const triggerCenter = triggerRect.left + triggerRect.width / 2;
  const left = triggerCenter - tooltipRect.width / 2;
  const maxLeft = document.body.clientWidth - tooltipRect.width - 2;
  return {
    left: Math.min(Math.max(2, left), maxLeft) + window.scrollX,
    top: triggerRect.bottom + 8 + window.scrollY,
  };
};

/*
## Components
 */
type TooltipProps = {
  children: ReactElement;
  label: ReactNode;
  triggerRef: Ref<HTMLElement>;
};

function Tooltip({ children, label, triggerRef }: TooltipProps) {
  const [trigger, tooltip] = useTooltip({
    ref: triggerRef,
  });

  return (
    <>
      {React.cloneElement(children, trigger)}
      <TooltipPopup
        {...tooltip}
        css={tooltipStyles}
        label={label}
        position={centered}
      />
    </>
  );
}

type HelpTooltipProps = {
  description?: string;
  children?: ReactElement;
  label: ReactNode;
  iconClass?: string;
};

function HelpTooltip({
  description,
  children,
  label,
  iconClass = 'fas fa-question-circle',
}: HelpTooltipProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  return (
    <Tooltip label={label} triggerRef={triggerRef}>
      <button
        css={tooltipIconStyles}
        onClick={(_ev) => triggerRef.current?.focus()}
        ref={triggerRef}
      >
        {children ? (
          children
        ) : (
          <i aria-hidden css={helpIconStyles} className={iconClass} />
        )}
        <span className="sr-only">{description || 'Information Tooltip'}</span>
      </button>
    </Tooltip>
  );
}

export { HelpTooltip, Tooltip };
