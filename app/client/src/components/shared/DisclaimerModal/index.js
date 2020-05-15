// @flow

import React from 'react';
import type { Node } from 'react';
import styled from 'styled-components';
import { DialogOverlay, DialogContent } from '@reach/dialog';
// styles
import { colors } from 'styles/index.js';
import '@reach/dialog/styles.css';

// --- styled components ---
const DisclaimerButton = styled.button`
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

// --- components ---
type Props = {
  children: Node,
};

function DisclaimerModal({ children, ...props }: Props) {
  const [dialogShown, setDialogShown] = React.useState(false);
  return (
    <>
      <DisclaimerButton
        onClick={ev => setDialogShown(!dialogShown)}
        // spread props so button’s styles (e.g. position) can be further set when used
        {...props}
      >
        Disclaimer
      </DisclaimerButton>

      <Overlay isOpen={dialogShown} onDismiss={() => setDialogShown(false)}>
        <Content aria-label="Disclaimer">
          {children}
          <CloseButton
            title="Close disclaimer"
            onClick={ev => setDialogShown(false)}
          >
            ×
          </CloseButton>
        </Content>
      </Overlay>
    </>
  );
}

export default DisclaimerModal;
