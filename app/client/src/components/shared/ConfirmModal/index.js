// @flow

import React from 'react';
import type { Node } from 'react';
import styled from 'styled-components';
import { DialogOverlay, DialogContent } from '@reach/dialog';
// styles
import { colors } from 'styles/index.js';
import '@reach/dialog/styles.css';

// --- styled components ---
const Overlay = styled(DialogOverlay)`
  &[data-reach-dialog-overlay] {
    z-index: 1000;
    background-color: ${colors.black(0.75)};
  }
`;

const Content = styled(DialogContent)`
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

const CloseButton = styled.button`
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

const ButtonContainer = styled.div`
  margin-top: 15px;
  display: flex;
  justify-content: space-around;
  button {
    font-size: 0.9375em;
  }
`;

const Button = styled.button`
  color: ${colors.white()};
  background-color: ${colors.blue()};

  &:hover,
  &:focus {
    color: ${colors.white()};
    background-color: ${colors.purple()};
  }
`;

const CancelButton = styled.button`
  background-color: lightgray;
`;

// --- components ---
type Props = {
  label: string,
  isOpen: boolean,
  confirmEnabled: boolean,
  onConfirm: Function,
  onCancel: Function,
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
    <Overlay isOpen={isOpen} onDismiss={onCancel}>
      <Content aria-label={label}>
        <CloseButton title="Cancel search" onClick={onCancel}>
          ×
        </CloseButton>

        {children}

        <ButtonContainer>
          {confirmEnabled ? (
            <>
              <div>
                <CancelButton className="btn" onClick={onCancel}>
                  Cancel
                </CancelButton>
              </div>
              <div>
                <Button className="btn" onClick={onConfirm}>
                  Continue
                </Button>
              </div>
            </>
          ) : (
            <div>
              <CancelButton className="btn" onClick={onCancel}>
                Ok
              </CancelButton>
            </div>
          )}
        </ButtonContainer>
      </Content>
    </Overlay>
  );
}

export default ConfirmModal;
