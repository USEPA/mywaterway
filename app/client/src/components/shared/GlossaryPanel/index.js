// @flow

import React from 'react';
import type { Node } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
// components
import { StyledErrorBox } from 'components/shared/MessageBoxes';
// contexts
import { GlossaryContext } from 'contexts/Glossary';
// styles
import { colors, fonts } from 'styles/index.js';
// errors
import { glossaryError } from 'config/errorMessages';

const Glossary = require('glossary-panel');

function termsInDOM() {
  const items = document.getElementsByClassName('glossary__item');
  return items && items.length > 0;
}

// --- styled components ---
const TermStyles = createGlobalStyle`
  span[data-term] {
    border-bottom: 1px dotted rgba(0, 113, 188, 0.75);
    cursor: pointer;

    &:hover,
    &:focus {
      background-color: #f0f6f9;

      i::before {
        color: rgba(0, 113, 188, 1);
      }
    }

    &[data-disabled='true'] {
      pointer-events: none;
    }
  }
`;

const TermIcon = styled.i`
  font-weight: 900;
  font-size: ${({ status }) => (status === 'fetching' ? '75%' : '87.5%')};
  color: rgba(0, 113, 188, 0.5);

  /* Workaround for IE to stop icon from spinning after fetching is complete */
  &:not(.fa-pulse) {
    animation: none;
  }
`;

const Container = styled.div`
  position: fixed;
  z-index: 1000;
  top: 0;
  right: 0;
  overflow-y: auto;
  width: 22rem;
  height: 100%;
  background-color: white;
  box-shadow: -0.375em -0.375em 0.625em -0.375em ${colors.black(0.25)};
  transition: right 0.2s;

  @media (max-width: 400px) {
    width: 85%;
  }

  &[aria-hidden='true'] {
    right: -22.375rem;
  }
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #0071bc;
`;

const Title = styled.h2`
  margin-left: 0.75rem;
  margin-bottom: 0.125rem;
  padding-bottom: 0;
  font-family: ${fonts.secondary};
  font-size: 1.25em;
  color: white;
`;

const CloseButton = styled.button`
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 0;
  width: 2em;
  height: 2em;
  font-size: 1.125em;
  background-color: ${colors.black(0.25)};

  &:hover,
  &:focus {
    background-color: ${colors.black(0.5)};
  }
`;

const Content = styled.div`
  padding: 0.75rem;

  p {
    line-height: 1.375;
  }
`;

const Input = styled.input`
  width: 100%;
  font-size: 0.9375em;
`;

const List = styled.ul`
  margin-top: 0.375rem;
  padding: 0;
  list-style: none;

  button {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.375rem;
    margin-bottom: 0;
    padding: 0.5rem;
    border: 1px solid transparent;
    border-radius: 0;
    width: 100%;
    font-size: 0.9375rem;
    font-weight: normal;
    text-align: left;
    color: #0071bc;
    background-color: transparent;

    &:hover,
    &:focus {
      text-decoration: underline;
    }

    &::after {
      content: '\f0da';
      margin-left: 0.5rem;
      font-family: 'Font Awesome 5 Free';
      font-weight: 900;
    }

    &[aria-expanded='true'] {
      border-color: ${colors.black(0.375)};
      text-decoration: none;
      color: #444;
      background-color: #f0f6f9;

      &::after {
        content: '\f0d7';
      }
    }
  }

  .glossary__definition {
    padding: 0.75rem;
    border: 1px solid ${colors.black(0.375)};
    border-top: none;

    h3 {
      margin-bottom: 0;
      padding-bottom: 0.375rem;
      font-family: ${fonts.secondary};
      font-size: 1.0625rem;
    }

    p {
      padding-bottom: 0.75rem;
      font-size: 0.875rem;

      :last-of-type {
        padding-bottom: 0;
      }
    }
  }
`;

// --- components ---
function GlossaryPanel({ path }) {
  const {
    initialized,
    setInitialized,
    glossaryStatus,
    setGlossaryStatus,
  } = React.useContext(GlossaryContext);

  // initialize Glossary panel
  React.useEffect(() => {
    if (!window.fetchGlossaryTerms) return;

    if (!initialized) {
      setInitialized(true);

      // Do not initialize glossary if terms on the dom
      if (termsInDOM()) return;

      // initialize the glossary
      window.fetchGlossaryTerms.then((terms) => {
        setGlossaryStatus(terms.status);
        try {
          new Glossary(terms.data);
        } catch (err) {
          console.error(err);
        }
      });
    }
  });

  // Reset initialized flag to re-initialize the Glossary
  React.useEffect(() => {
    // set the initialized flag to false if there are no glossary terms on the DOM
    if (!termsInDOM()) setInitialized(false);
  }, [path, setInitialized]);

  return (
    <>
      <TermStyles />

      <Container
        id="glossary"
        aria-describedby="glossary-title"
        aria-hidden="true"
      >
        <Header>
          <Title id="glossary-title">Glossary</Title>
          <CloseButton className="js-glossary-close" title="Close glossary">
            ×
          </CloseButton>
        </Header>

        <Content>
          {glossaryStatus === 'failure' && (
            <StyledErrorBox>
              <p>{glossaryError}</p>
            </StyledErrorBox>
          )}
          {glossaryStatus === 'success' && (
            <Input
              className="js-glossary-search form-control"
              type="search"
              placeholder="Search for a term..."
              aria-label="Search for a glossary term..."
            />
          )}
          <List className="js-glossary-list" />
        </Content>
      </Container>
    </>
  );
}

export default GlossaryPanel;

// --- components ---
type Props = {
  term: string,
  className: string,
  style: Object,
  children: Node,
};

function GlossaryTerm({ term, className, style, children }: Props) {
  const [status, setStatus] = React.useState('fetching');

  if (window.fetchGlossaryTerms) {
    window.fetchGlossaryTerms.then((terms) => setStatus(terms.status));
  }

  const iconClassName =
    status === 'fetching' ? 'fas fa-spinner fa-pulse' : 'fas fa-book';

  return (
    <span
      data-term={term}
      data-disabled={status === 'fetching'}
      title="Click to define"
      tabIndex="0"
      className={className}
      style={style}
    >
      <TermIcon className={iconClassName} status={status} aria-hidden="true" />{' '}
      {children}
    </span>
  );
}

export { GlossaryTerm };
