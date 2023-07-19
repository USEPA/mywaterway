import { useState } from 'react';
import { css } from 'styled-components/macro';
import * as Dialog from '@radix-ui/react-dialog';
// types
import type { ReactNode } from 'react';
// styles
import { colors } from 'styles/index.js';

const buttonContainerStyles = css`
  margin-top: 15px;
  display: flex;
  justify-content: space-around;
  button {
    font-size: 0.9375em;
  }
`;

const cancelButtonStyles = css`
  background-color: lightgray;
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

const confirmButtonStyles = css`
  margin-bottom: 0;
  font-size: 0.9375em;
  color: ${colors.white()};
  background-color: ${colors.blue()};

  &:hover {
    color: ${colors.white()};
    background-color: ${colors.navyBlue()};
  }
`;

const contentContainerStyles = css`
  width: 100%;
  height: 100%;
  position: fixed;
  top: 0;
  z-index: 1000;
`;

const contentStyles = (maxWidth: string) => css`
  background-color: white;
  position: relative;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-width: ${maxWidth};
  padding: 1.5rem;

  p {
    margin-top: 1rem;
    margin-bottom: 0;
    padding-bottom: 0;
    font-size: 0.875rem;
    line-height: 1.375;

    &:first-of-type {
      margin-top: 0;
  }
`;

const overlayStyles = css`
  background-color: ${colors.black(0.33)};
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
  label: string;
  maxWidth?: string;
  onConfirm?: Function;
  onClose?: Function;
  triggerElm: ReactNode;
};

function Modal({
  children,
  closeTitle,
  confirmEnabled = false,
  isConfirm = false,
  label,
  maxWidth = '25rem',
  onClose = () => {},
  onConfirm = () => {},
  triggerElm,
}: Props) {
  const [dialogShown, setDialogShown] = useState(false);

  const close = () => {
    setDialogShown(false);
    onClose();
  };

  return (
    <Dialog.Root open={dialogShown} onOpenChange={setDialogShown}>
      <Dialog.Trigger asChild>{triggerElm}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay css={overlayStyles} />
        <div css={contentContainerStyles}>
          <Dialog.Content css={contentStyles(maxWidth)} aria-label={label}>
            <Dialog.Title className="sr-only">{label}</Dialog.Title>
            <Dialog.Description className="sr-only">{label}</Dialog.Description>
            <button
              css={closeButtonStyles}
              title={closeTitle || 'Close'}
              onClick={close}
            >
              ×
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
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default Modal;
