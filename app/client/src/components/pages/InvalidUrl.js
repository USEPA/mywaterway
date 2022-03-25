// @flow

import React from 'react';
import { Link } from '@reach/router';
import { css } from 'styled-components/macro';

const containerStyles = css`
  margin: 2rem 0;
  text-align: center;
`;

const headerStyles = css`
  margin-bottom: 0;
  font-size: 1.75rem;
`;

const paragraphStyles = css`
  padding-bottom: 0;
`;

// --- components ---
function InvalidUrl() {
  return (
    <div className="container">
      <div css={containerStyles}>
        <h1 css={headerStyles}>Sorry, but the url entered was invalid.</h1>
        <p css={paragraphStyles}>
          Return to the <Link to="/">homepage</Link>.
        </p>
      </div>
    </div>
  );
}

export default InvalidUrl;
