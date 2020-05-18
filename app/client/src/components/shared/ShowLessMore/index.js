// @flow

import React from 'react';
import styled from 'styled-components';

// --- styled components ---
const LinkButton = styled.button`
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
  text: string | Node,
  charLimit: number,
};

function ShowLessMore({ text, charLimit }: Props) {
  const [truncated, setTruncated] = React.useState(true);

  if (typeof text === 'string') {
    if (!text) return '';
    if (text.length < charLimit) return text;

    return (
      <>
        {truncated ? `${text.substring(0, charLimit)}...` : text}
        <LinkButton onClick={ev => setTruncated(!truncated)}>
          Show {truncated ? 'more' : 'less'}
        </LinkButton>
      </>
    );
  }

  if (React.isValidElement(text)) {
    return (
      <>
        {truncated ? '...' : text}
        <LinkButton onClick={ev => setTruncated(!truncated)}>
          Show {truncated ? 'more' : 'less'}
        </LinkButton>
      </>
    );
  }

  return null;
}

export default ShowLessMore;
