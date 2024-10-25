/** @jsxImportSource @emotion/react */

import { isValidElement, useState } from 'react';
import { css } from '@emotion/react';
// styles
import { linkButtonStyles } from 'components/shared/LinkButton';
// types
import type { ReactNode } from 'react';

const modifiedLinkButtonStyles = css`
  ${linkButtonStyles}
  margin-left: 0.25rem;
  text-decoration: underline;
`;

// --- components ---
type Props = {
  text: string | ReactNode;
  charLimit?: number;
};

function ShowLessMore({ text, charLimit = 0 }: Props) {
  const [truncated, setTruncated] = useState(true);

  if (typeof text === 'string') {
    if (!text) return <></>;
    if (text.length < charLimit) return <>{text}</>;

    return (
      <>
        {truncated ? `${text.substring(0, charLimit)}...` : text}
        <button
          css={modifiedLinkButtonStyles}
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
          css={modifiedLinkButtonStyles}
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
