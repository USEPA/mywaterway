// @flow
/** @jsxImportSource @emotion/react */

import { useEffect } from 'react';
import type { Node } from 'react';
import { css, Global } from '@emotion/react';
// contexts
import { useConfigFilesState } from 'contexts/ConfigFiles';
// styles
import { colors, fonts } from 'styles/index';

const Glossary = require('glossary-panel');

const termStyles = css`
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
  margin-right: 0.25em;
  padding-right: 0 !important;
`;

const panelStyles = css`
  position: fixed;
  z-index: 1001;
  top: 0;
  right: -22.375rem;
  overflow-y: auto;
  width: 22rem;
  height: 100%;
  background-color: white;
  box-shadow: -0.375em -0.375em 0.625em -0.375em ${colors.black(0.25)};
  transition: right 0.2s;

  &[aria-hidden='false'] {
    right: 0;
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
    background-color: ${colors.black(0.5)} !important;
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
      background-color: inherit !important;
      color: ${colors.navyBlue()} !important;
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
      background-color: #f0f6f9 !important;

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
  const configFiles = useConfigFilesState();

  useEffect(() => {
    try {
      new Glossary(configFiles.data.glossary);
    } catch (err) {
      console.error(err);
    }
  }, [configFiles]);

  return (
    <>
      <Global styles={termStyles} />

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
            <i className="fas fa-times" aria-hidden="true"></i>
          </button>
        </header>

        <div css={containerStyles}>
          <input
            css={inputStyles}
            className="js-glossary-search form-control"
            type="search"
            placeholder="Search for a term..."
            aria-label="Search for a glossary term..."
          />

          <ul
            aria-labelledby="glossary-title"
            css={listStyles}
            className="js-glossary-list"
            tabIndex="0"
          />
        </div>
      </div>
    </>
  );
}

export default GlossaryPanel;

type Props = {
  term: string,
  className?: string,
  id?: string,
  style?: Object,
  children: Node,
};

function GlossaryTerm({ term, className, id, style, children }: Props) {
  return (
    <span
      id={id}
      data-term={term}
      title="Click to define"
      tabIndex="0"
      className={className}
      style={style}
    >
      <i
        css={[iconStyles, { fontSize: '87.5%' }]}
        className={'fas fa-book'}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}

export { GlossaryTerm };
