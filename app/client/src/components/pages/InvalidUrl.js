// @flow

import React from 'react';
import { Link } from '@reach/router';
import styled from 'styled-components';

// --- styled components ---
const Container = styled.div`
  margin: 2rem 0;
  text-align: center;
`;

const Header = styled.h1`
  margin-bottom: 0;
  font-size: 1.75rem;
`;

const Paragraph = styled.p`
  padding-bottom: 0;
`;

// --- components ---
function InvalidUrl() {
  return (
    <div className="container">
      <Container>
        <Header>Sorry, but the url entered was invalid.</Header>
        <Paragraph>
          Return to the <Link to="/">homepage</Link>.
        </Paragraph>
      </Container>
    </div>
  );
}

export default InvalidUrl;
