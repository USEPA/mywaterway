// @flow

import React, { useEffect, useState } from 'react';
import type { Node } from 'react';
import { css, createGlobalStyle } from 'styled-components/macro';
// components
import { errorBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import { useGlossaryState } from 'contexts/Glossary';
// styles
import { colors, fonts } from 'styles/index.js';
// errors
import { glossaryError } from 'config/errorMessages';
// helpers
import { isAbort } from 'utils/utils';

const Glossary = require('glossary-panel');

function termsInDOM() {
  const items = document.getElementsByClassName('glossary__item');
  return items && items.length > 0;
}

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

const iconStyles = css`
  font-weight: 900;
  color: rgba(0, 113, 188, 0.5);
`;

const panelStyles = css`
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

  &[aria-hidden='true'] {
    right: -22.375rem;
  }

  @media (max-width: 400px) {
    width: 85%;
  }
`;

const headerStyles = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #0071bc;
`;

const titleStyles = css`
  margin-left: 0.75rem;
  margin-bottom: 0.125rem;
  padding-bottom: 0;
  font-family: ${fonts.secondary};
  font-size: 1.25em;
  color: white;
`;

const buttonStyles = css`
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

const containerStyles = css`
  padding: 0.75rem;

  p {
    line-height: 1.375;
  }
`;

const inputStyles = css`
  width: 100%;
  font-size: 0.9375em;
`;

const listStyles = css`
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
  const { initialized, setInitialized, glossaryStatus, setGlossaryStatus } =
    useGlossaryState();

  // initialize Glossary panel
  useEffect(() => {
    if (!window.hasOwnProperty('fetchGlossaryTerms')) return;

    if (!initialized) {
      setInitialized(true);

      // Do not initialize glossary if terms on the dom
      if (termsInDOM()) return;

      // initialize the glossary
      window.fetchGlossaryTerms
        .then((terms) => {
          setGlossaryStatus(terms.status);
          try {
            new Glossary(terms.data);
          } catch (err) {
            console.error(err);
          }
        })
        .catch((err) => {
          if (isAbort(err)) return;
          console.error(err);
        });
    }
  });

  // Reset initialized flag to re-initialize the Glossary
  useEffect(() => {
    // set the initialized flag to false if there are no glossary terms on the DOM
    if (!termsInDOM()) setInitialized(false);
  }, [path, setInitialized]);

  return (
    <>
      <TermStyles />

      <div
        css={panelStyles}
        id="glossary"
        aria-describedby="glossary-title"
        aria-hidden="true"
      >
        <header css={headerStyles}>
          <h2 css={titleStyles} id="glossary-title">
            Glossary
          </h2>
          <button
            css={buttonStyles}
            className="js-glossary-close"
            title="Close glossary"
          >
            ×
          </button>
        </header>

        <div css={containerStyles}>
          {glossaryStatus === 'failure' && (
            <div css={errorBoxStyles}>
              <p>{glossaryError}</p>
            </div>
          )}

          {glossaryStatus === 'success' && (
            <input
              css={inputStyles}
              className="js-glossary-search form-control"
              type="search"
              placeholder="Search for a term..."
              aria-label="Search for a glossary term..."
            />
          )}

          <ul css={listStyles} className="js-glossary-list" />
        </div>
      </div>
    </>
  );
}

export default GlossaryPanel;

type Props = {
  term: string,
  className?: string,
  style?: Object,
  children: Node,
};

function GlossaryTerm({ term, className, style, children }: Props) {
  const [status, setStatus] = useState('fetching');

  if (window.hasOwnProperty('fetchGlossaryTerms')) {
    window.fetchGlossaryTerms
      .then((terms) => setStatus(terms.status))
      .catch((err) => {
        if (isAbort(err)) return;
        console.error(err);
      });
  }

  return (
    <span
      data-term={term}
      data-disabled={status === 'fetching'}
      title="Click to define"
      tabIndex="0"
      className={className}
      style={style}
    >
      <i
        css={[
          iconStyles,
          { fontSize: status === 'fetching' ? '75%' : '87.5%' },
        ]}
        className={
          status === 'fetching' ? 'fas fa-spinner fa-pulse' : 'fas fa-book'
        }
        status={status}
        aria-hidden="true"
      />
      &nbsp;
      {children}
    </span>
  );
}

export { GlossaryTerm };
