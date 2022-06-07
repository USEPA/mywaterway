// @flow

import React from 'react';
import type { Node } from 'react';
import { css } from 'styled-components/macro';
import { DialogOverlay, DialogContent } from '@reach/dialog';
// styles
import { colors } from 'styles/index.js';
import '@reach/dialog/styles.css';

const overlayStyles = css`
  &[data-reach-dialog-overlay] {
    z-index: 1000;
    background-color: ${colors.black(0.75)};
  }
`;

const contentStyles = css`
  &[data-reach-dialog-content] {
    position: relative;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    margin: 0;
    padding: 1.5rem;
    width: auto;
    max-width: 25rem;
  }

  p {
    margin-top: 1rem;
    margin-bottom: 0;
    padding-bottom: 0;
    font-size: 0.875rem;
    line-height: 1.375;

    &:first-of-type {
      margin-top: 0;
    }
  }
`;

const closeButtonStyles = css`
  position: absolute;
  top: 0;
  right: 0;
  padding: 0;
  border: none;
  width: 1.5rem;
  height: 1.5rem;
  color: white;
  background-color: ${colors.black(0.5)};

  &:hover,
  &:focus {
    background-color: ${colors.black(0.75)};
  }
`;

const buttonContainerStyles = css`
  margin-top: 15px;
  display: flex;
  justify-content: space-around;
  button {
    font-size: 0.9375em;
  }
`;

const buttonStyles = css`
  color: ${colors.white()};
  background-color: ${colors.blue()};

  &:hover,
  &:focus {
    color: ${colors.white()};
    background-color: ${colors.navyBlue()};
  }
`;

const cancelButtonStyles = css`
  background-color: lightgray;
`;

// --- components ---
type Props = {
  label: string,
  isOpen: boolean,
  confirmEnabled: boolean,
  onConfirm: (ev: any) => void,
  onCancel: (ev: any) => void,
  children: Node,
};

function ConfirmModal({
  label,
  isOpen,
  confirmEnabled = true,
  onConfirm = () => {},
  onCancel = () => {},
  children,
  ...props
}: Props) {
  return (
    <DialogOverlay css={overlayStyles} isOpen={isOpen} onDismiss={onCancel}>
      <DialogContent css={contentStyles} aria-label={label}>
        <button
          css={closeButtonStyles}
          title="Cancel search"
          onClick={onCancel}
        >
          ×
        </button>

        {children}

        <div css={buttonContainerStyles}>
          {confirmEnabled ? (
            <>
              <div>
                <button
                  css={cancelButtonStyles}
                  className="btn"
                  onClick={onCancel}
                >
                  Cancel
                </button>
              </div>
              <div>
                <button css={buttonStyles} className="btn" onClick={onConfirm}>
                  Continue
                </button>
              </div>
            </>
          ) : (
            <div>
              <button
                css={cancelButtonStyles}
                className="btn"
                onClick={onCancel}
              >
                Ok
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </DialogOverlay>
  );
}

export default ConfirmModal;
