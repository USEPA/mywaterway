// @flow

import React, { isValidElement, useState } from 'react';
import { css } from 'styled-components/macro';

const linkButtonStyles = css`
  display: inline;
  margin-bottom: 0;
  margin-left: 0.25rem;
  padding: 0;
  border: none;
  font-size: 87.5%;
  text-decoration: underline;
  color: #0071bc;
  background-color: transparent;
  cursor: pointer;

  &:hover,
  &:focus {
    text-decoration: none;
    color: #4c2c92;
  }
`;

// --- components ---
type Props = {
  text: string | React.ReactNode,
  charLimit: number,
};

function ShowLessMore({ text, charLimit }: Props) {
  const [truncated, setTruncated] = useState(true);

  if (typeof text === 'string') {
    if (!text) return <></>;
    if (text.length < charLimit) return <>text</>;

    return (
      <>
        {truncated ? `${text.substring(0, charLimit)}...` : text}
        <button
          css={linkButtonStyles}
          onClick={(ev) => setTruncated(!truncated)}
        >
          Show {truncated ? 'more' : 'less'}
        </button>
      </>
    );
  }

  if (isValidElement(text)) {
    return (
      <>
        {truncated ? '...' : text}
        <button
          css={linkButtonStyles}
          onClick={(ev) => setTruncated(!truncated)}
        >
          Show {truncated ? 'more' : 'less'}
        </button>
      </>
    );
  }

  return null;
}

export default ShowLessMore;
