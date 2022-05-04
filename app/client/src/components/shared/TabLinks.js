// @flow

import React from 'react';
import type { Node } from 'react';
import { css } from 'styled-components/macro';
import { Link } from '@reach/router';
// styles
import { colors } from 'styles/index.js';

const containerStyles = css`
  padding-top: 0.5em;
  background-color: ${colors.slate()};

  @media (min-width: 800px) {
    padding-top: 1em;
  }
`;

const tabsStyles = css`
  display: flex;
  margin: auto;
  max-width: 60em;
`;

const linkStyles = css`
  flex: 1;
  margin-top: 0.25em;
  margin-right: 0.25em;
  margin-left: 0.25em;
  padding: 0.5em;
  border-top-width: 0.5em;
  border-top-style: solid;
  border-top-color: ${colors.teal()};
  border-top-right-radius: 0.125em;
  border-top-left-radius: 0.125em;
  background-color: ${colors.graye};
  font-size: 0.875em;
  text-align: center;

  &:link,
  &:visited {
    text-decoration: none;
    color: ${colors.gray3};
  }

  &:hover,
  &:focus {
    margin-top: 0;
  }

  @media (min-width: 480px) {
    font-size: 1;
  }

  @media (min-width: 640px) {
    font-size: 1.125em;
  }

  @media (min-width: 800px) {
    font-size: 1.25em;
  }
`;

type TabLinkProps = {
  to: string,
  children: Node,
};

function TabLink({ to, children }: TabLinkProps) {
  return (
    <Link
      css={linkStyles}
      to={to}
      getProps={({ isPartiallyCurrent }) => {
        return isPartiallyCurrent
          ? {
              style: {
                marginTop: '0',
                fontWeight: 'bold',
                backgroundColor: 'white',
              },
            }
          : null;
      }}
    >
      {children}
    </Link>
  );
}

function TabLinks() {
  return (
    <div css={containerStyles}>
      <div css={tabsStyles}>
        <TabLink to="/community">Community</TabLink>
        <TabLink to="/state">State</TabLink>
        <TabLink to="/national">National</TabLink>
      </div>
    </div>
  );
}

export default TabLinks;
