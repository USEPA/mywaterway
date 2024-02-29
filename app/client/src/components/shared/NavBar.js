// @flow
/** @jsxImportSource @emotion/react */

import { css } from '@emotion/react';

const containerStyles = css`
  display: flex;
  align-items: center;
  padding: 1em;
  background-color: #353d47;
  color: #fff;
`;

const groupStyles = css`
  flex: 1;
`;

const backButtonStyles = css`
  margin: 0;
  padding: 0;
  font-weight: normal;
  background-color: transparent;
`;

const textStyles = css`
  margin: auto;
  padding-bottom: 0;
  font-size: 1.5em;
  font-family: inherit;
  font-weight: inherit;
  line-height: inherit;
`;

// --- components ---
type Props = {
  title: string,
  onBackClick?: Function,
};

function NavBar({ title, onBackClick = null }: Props) {
  return (
    <div css={containerStyles} id="hmw-nav-bar">
      <div css={groupStyles}>
        {onBackClick && (
          <button css={backButtonStyles} onClick={(ev) => onBackClick(ev)}>
            <i className="fas fa-chevron-left" aria-hidden="true" />
            &nbsp; Back
          </button>
        )}
      </div>
      <h2 css={textStyles}>{title}</h2>
      <div css={groupStyles} />
    </div>
  );
}

export default NavBar;
