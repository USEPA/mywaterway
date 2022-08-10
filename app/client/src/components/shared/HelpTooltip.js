// @flow

import React, { useRef } from 'react';
import { TooltipPopup, useTooltip } from '@reach/tooltip';
import { css } from 'styled-components/macro';
// styles
import '@reach/tooltip/styles.css';
import { colors } from 'styles';

/*
 * Styles
 */
const tooltipIconStyles = css`
  background: none;
  border: none;
  color: inherit;
  cursor: unset !important;
  margin: 0;
  outline: inherit;
  padding: 0;

  i {
    cursor: help;
  }
`;

const tooltipStyles = css`
  background: ${colors.steel(0.95)};
  border: none;
  border-radius: 6px;
  color: white;
  padding: 0.5em 1em;
  text-align: center;
  white-space: normal;
  width: 320px;
`;

/*
 * Helpers
 */
function centered(triggerRect, tooltipRect) {
  const triggerCenter = triggerRect.left + triggerRect.width / 2;
  const left = triggerCenter - tooltipRect.width / 2;
  const maxLeft = document.body.clientWidth - tooltipRect.width;
  return {
    left: Math.min(Math.max(2, left), maxLeft) + window.scrollX,
    top: triggerRect.bottom + 8 + window.scrollY,
  };
}

/*
 * Components
 */

function Tooltip({ children, label, triggerRef }) {
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

function HelpTooltip({ label }) {
  const triggerRef = useRef();
  return (
    <Tooltip label={label} triggerRef={triggerRef}>
      <button
        css={tooltipIconStyles}
        data-testid="tooltip-trigger"
        onClick={(_ev) => triggerRef.current?.focus()}
        ref={triggerRef}
      >
        <span aria-hidden>
          <i className="fas fa-question-circle" />
        </span>
        <span className="sr-only">Information Tooltip</span>
      </button>
    </Tooltip>
  );
}

export default HelpTooltip;
