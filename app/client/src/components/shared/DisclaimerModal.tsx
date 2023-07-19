import { css } from 'styled-components/macro';
// components
import Modal from 'components/shared/Modal';
// types
import type { ReactNode } from 'react';
// styles
import { colors } from 'styles/index.js';

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

// --- components ---
type Props = {
  children: ReactNode;
  infoIcon?: boolean;
};

function DisclaimerModal({ children, infoIcon = false, ...props }: Props) {
  return (
    <Modal
      closeTitle="Close disclaimer"
      label="Disclaimer"
      triggerElm={
        infoIcon ? (
          <i css={helpIconStyles} className="fas fa-question-circle"></i>
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

export default DisclaimerModal;
