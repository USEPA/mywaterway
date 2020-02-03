// @flow

import React from 'react';
import type { Node } from 'react';
import styled from 'styled-components';

// --- styled components ---
const Container = styled.div`
  display: flex;
  align-items: center;
  padding: 1em;
  background-color: #353d47;
  color: #fff;
`;

const Group = styled.div`
  flex: 1;
`;

const BackButton = styled.button`
  margin: 0;
  padding: 0;
  font-weight: normal;
  background-color: transparent;
`;

const Text = styled.p`
  margin: auto;
  padding-bottom: 0;
  font-size: 1.5em;
`;

// --- components ---
type Props = {
  title: Node,
  onBackClick?: Function,
};

function NavBar({ title, onBackClick = null }: Props) {
  return (
    <Container>
      <Group>
        {onBackClick && (
          <BackButton onClick={(ev) => onBackClick(ev)}>
            <i className="fas fa-chevron-left" />
            &nbsp; Back
          </BackButton>
        )}
      </Group>
      <Text>{title}</Text>
      <Group />
    </Container>
  );
}

export default NavBar;
