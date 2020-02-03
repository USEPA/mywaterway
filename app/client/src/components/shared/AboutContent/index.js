// @flow

import React from 'react';
import styled from 'styled-components';

// --- styled components ---
const Container = styled.div`
  padding: 1rem;

  p {
    padding-bottom: 0;
    line-height: 1.375;
  }

  a {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 1.25em;
    line-height: 1.125;
  }

  @media (min-width: 30em) {
    padding: 2rem;

    a {
      font-size: 1.375em;
    }

    hr {
      margin-top: 2rem;
    }
  }
`;

// --- components ---
type Props = {};

function AboutContent({ ...props }: Props) {
  React.useEffect(() => {
    // get the original url
    const href = window.location.href;

    // get the pathname without the leading /
    const pathname = window.location.pathname.substr(1);

    // build the url for the data page
    let newHref = '';
    if (pathname) {
      newHref = href.replace(pathname, 'about');
    } else {
      newHref = `${href}about`;
    }

    // change the browser address bar without reloading the page
    window.history.pushState(null, null, newHref);

    // when the user hits the back button change the url back to the original
    return function cleanup() {
      if (pathname !== 'about') window.history.pushState(null, null, href);
    };
  }, []);

  return (
    <Container className="container">
      <p>Welcome to the How's My Waterway About page.</p>
    </Container>
  );
}

export default AboutContent;
