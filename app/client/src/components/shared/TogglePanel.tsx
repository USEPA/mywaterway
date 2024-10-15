/** @jsxImportSource @emotion/react */

import { useState } from 'react';
import { css } from '@emotion/react';
// types
import type { ReactNode } from 'react';

const arrowStyles = css`
  font-size: 1.25em;
  color: #526571;
`;

const childrenContainerStyles = css`
  margin: 1em auto;
  width: 90%;
`;

const controlStyles = css`
  display: flex;
  gap: 1em;
  margin: auto;

  button {
    align-items: center;
    background: none;
    background-color: transparent !important;
    border: none;
    color: inherit;
    display: flex;
    font-size: 0.875rem;
    gap: 1em;
    margin: 0;
    outline: inherit;
    padding: 0;

    &:hover,
    &:focus {
      color: inherit !important;
      background-color: inherit !important;
    }
  }
`;

export function TogglePanel({ children, defaultOpen = false, title }: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <>
      <div css={controlStyles}>
        <button onClick={(_ev) => setIsOpen((prev) => !prev)}>
          {title}{' '}
          <i
            css={arrowStyles}
            className={`fa fa-angle-${isOpen ? 'down' : 'right'}`}
            aria-hidden="true"
          />
        </button>
      </div>
      {isOpen && <div css={childrenContainerStyles}>{children}</div>}
    </>
  );
}

type Props = {
  children: ReactNode;
  defaultOpen?: boolean;
  title: string;
};

export default TogglePanel;
