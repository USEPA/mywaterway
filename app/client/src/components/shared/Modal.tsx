/** @jsxImportSource @emotion/react */

import { useState } from 'react';
import { css } from '@emotion/react';
import * as Dialog from '@radix-ui/react-dialog';
// types
import type { ReactNode } from 'react';
// styles
import { colors, iconButtonStyles } from 'styles/index';
// types
import type { SerializedStyles } from '@emotion/react';

const buttonContainerStyles = css`
  margin-top: 15px;
  display: flex;
  justify-content: space-around;
  button {
    font-size: 0.9375em;
  }
`;

const cancelButtonStyles = css`
  background-color: transparent;
  box-shadow: inset 0 0 0 2px ${colors.blue()};
  color: ${colors.blue()};
  font-weight: bold;
`;

const closeButtonStyles = css`
  align-items: center;
  border-radius: 6px;
  display: flex;
  justify-content: center;
  position: absolute;
  top: 6px;
  right: 6px;
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

const confirmButtonStyles = css`
  margin-bottom: 0;
  font-size: 0.9375em;
  font-weight: bold;
  color: ${colors.white()};
  background-color: ${colors.blue()};

  &:hover {
    color: ${colors.white()};
    background-color: ${colors.navyBlue()};
  }

  &:disabled {
    background-color: ${colors.grayc9};
    color: ${colors.gray45};
    cursor: not-allowed;
    opacity: 1;
  }
`;

const contentStyles = (
  maxWidth: string = '100%',
  maxHeight: string = '100%',
) => css`
  background-color: white;
  border-radius: 6px;
  max-height: min(80%, ${maxHeight});
  max-width: min(90%, ${maxWidth});
  overflow-y: auto;
  padding: 1.5rem;
  padding-top: calc(1.5rem + 6px);
  position: relative;
  width: 100%;

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

const disclaimerButtonStyles = css`
  background-color: ${colors.grayd};
  border: 0;
  border-radius: 3px;
  color: ${colors.gray3};
  font-size: 0.625rem;
  font-weight: normal;
  letter-spacing: 0.5px;
  line-height: 1.25;
  margin-bottom: 0;
  padding: 0.125rem 0.375rem;
  position: relative;
  text-transform: uppercase;
  user-select: none;

  &:hover,
  &:focus {
    background-color: ${colors.grayc} !important;
    color: inherit !important;
  }
`;

const helpIconStyles = css`
  position: absolute;
  top: 5px;
  right: 5px;
  color: #485566;
`;

const overlayStyles = css`
  background-color: ${colors.black(0.33)};
  display: grid;
  place-items: center;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
`;

// --- components ---
type Props = {
  children: ReactNode;
  closeTitle?: string;
  confirmEnabled?: boolean;
  isConfirm?: boolean;
  isLoading?: boolean;
  label: string;
  maxWidth?: string;
  onConfirm?: () => void;
  onClose?: () => void;
  triggerElm: ReactNode;
};

export default function Modal({
  children,
  closeTitle,
  confirmEnabled = false,
  isConfirm = false,
  isLoading = false,
  label,
  maxWidth = '25rem',
  onClose = () => {},
  onConfirm = () => {},
  triggerElm,
}: Readonly<Props>) {
  const [dialogShown, setDialogShown] = useState(false);

  const close = () => {
    setDialogShown(false);
    onClose();
  };

  return (
    <Dialog.Root open={dialogShown} onOpenChange={setDialogShown}>
      <Dialog.Trigger asChild>{triggerElm}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay css={overlayStyles}>
          <Dialog.Content css={contentStyles(maxWidth)} aria-label={label}>
            <Dialog.Title className="sr-only">{label}</Dialog.Title>
            <Dialog.Description className="sr-only">{label}</Dialog.Description>
            <button
              css={closeButtonStyles}
              title={closeTitle ?? 'Close'}
              onClick={close}
            >
              <i className="fas fa-times" aria-hidden="true" />
            </button>

            {children}

            {isConfirm && (
              <div css={buttonContainerStyles}>
                {confirmEnabled ? (
                  <>
                    <div>
                      <button
                        css={cancelButtonStyles}
                        className="btn"
                        onClick={close}
                      >
                        Cancel
                      </button>
                    </div>
                    <div>
                      <button
                        css={confirmButtonStyles}
                        disabled={isLoading}
                        className="btn"
                        onClick={() => {
                          setDialogShown(false);
                          onConfirm();
                        }}
                      >
                        Continue
                      </button>
                    </div>
                  </>
                ) : (
                  <div>
                    <button
                      css={cancelButtonStyles}
                      className="btn"
                      onClick={close}
                    >
                      Ok
                    </button>
                  </div>
                )}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type DisclaimerProps = {
  buttonLabel?: string;
  children: ReactNode;
  css?: SerializedStyles;
  infoIcon?: boolean;
};

export function DisclaimerModal({
  buttonLabel = 'Disclaimer',
  children,
  infoIcon = false,
  ...props
}: Readonly<DisclaimerProps>) {
  return (
    <Modal
      closeTitle="Close disclaimer"
      label="Disclaimer"
      triggerElm={
        infoIcon ? (
          <button aria-label="Disclaimer" css={iconButtonStyles}>
            <i
              aria-hidden
              css={helpIconStyles}
              className="fas fa-question-circle"
            ></i>
          </button>
        ) : (
          <button
            css={disclaimerButtonStyles}
            // spread props so button’s styles (e.g. position) can be further set when used
            {...props}
          >
            {buttonLabel}
          </button>
        )
      }
    >
      {children}
    </Modal>
  );
}
