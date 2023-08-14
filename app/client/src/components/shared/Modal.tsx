import { useState } from 'react';
import { css } from 'styled-components/macro';
import * as Dialog from '@radix-ui/react-dialog';
// types
import type { ReactNode } from 'react';
// styles
import { colors, iconButtonStyles } from 'styles/index.js';

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

const contentStyles = (maxWidth: string) => css`
  background-color: white;
  height: fit-content;
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

const disclaimerButtonStyles = css`
  position: relative;
  margin-bottom: 0;
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  line-height: 1.25;
  font-weight: normal;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  user-select: none;
  color: ${colors.gray3};
  background-color: ${colors.grayd};

  :hover,
  :focus {
    background-color: ${colors.grayc};
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
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
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

export default function Modal({
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
        <Dialog.Overlay css={overlayStyles}>
          <Dialog.Content css={contentStyles(maxWidth)} aria-label={label}>
            <Dialog.Title className="sr-only">{label}</Dialog.Title>
            <Dialog.Description className="sr-only">{label}</Dialog.Description>
            <button
              css={closeButtonStyles}
              title={closeTitle ?? 'Close'}
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
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type DisclaimerProps = {
  children: ReactNode;
  infoIcon?: boolean;
};

export function DisclaimerModal({
  children,
  infoIcon = false,
  ...props
}: DisclaimerProps) {
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
            Disclaimer
          </button>
        )
      }
    >
      {children}
    </Modal>
  );
}
