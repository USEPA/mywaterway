// @flow

import React from 'react';
import type { Node } from 'react';
import { Link } from '@reach/router';
import styled from 'styled-components';
// styles
import { colors } from 'styles/index.js';

// --- styled components ---
const Container = styled.div`
  padding-top: 1em;
  background-color: #323a45;
`;

const Tabs = styled.div`
  display: flex;
  margin: auto;
  max-width: 60em;
`;

const StyledLink = styled(Link)`
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
  background-color: #eee;
  font-size: 1.375em;
  text-align: center;

  &:link,
  &:visited {
    text-decoration: none;
    color: #222;
  }

  &:hover,
  &:focus {
    margin-top: 0;
  }

  @media (max-width: 400px) {
    font-size: 1em;
  }
`;

// --- components ---
type TabLinkProps = {
  to: string,
  children: Node,
};

function TabLink({ to, children }: TabLinkProps) {
  return (
    <StyledLink
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
    </StyledLink>
  );
}

function TabLinks() {
  return (
    <Container>
      <Tabs>
        <TabLink to="/community">Community</TabLink>
        <TabLink to="/state">State</TabLink>
        <TabLink to="/national">National</TabLink>
      </Tabs>
    </Container>
  );
}

export default TabLinks;
