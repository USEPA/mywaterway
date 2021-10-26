// @flow

import styled, { css } from 'styled-components/macro';
import { TabPanel } from '@reach/tabs';
// styles
import { colors } from 'styles/index.js';

// --- styled components ---
// tab borders (via box shadows)
const left = `inset 1px 0 0 ${colors.black(0.375)}`;
const right = `inset -1px 0 0 ${colors.white(0.0625)}`;
const bottom = (color) => `inset 0 -3px 0 ${color}`;

const StyledTabPanel = styled(TabPanel)`
  padding: 1.5em !important;

  p,
  li {
    line-height: 1.375;
  }
`;

const ContentTabs = styled.div`
  [data-reach-tabs] {
    /* */
  }

  [data-reach-tab-list] {
    border: 1px solid ${colors.slate()};
  }

  [data-reach-tab] {
    width: 100%;
    padding: 0.625em;
    border-bottom: none;
    border-radius: 0;
    font-size: 0.8125em;
    color: white;
    background-color: #526571;
    /* fake borders so it doesn't interfere with tab width */
    box-shadow: ${`${left}, ${right}, ${bottom('transparent')}`};

    &[data-selected],
    &:hover,
    &:focus {
      z-index: 1;
      background-color: ${colors.slate()};
      box-shadow: ${`${left}, ${right}, ${bottom('#51d2c2')}`};
    }

    /* no left border on first tab */
    &:first-of-type {
      box-shadow: ${`${right}, ${bottom('transparent')}`};

      &[data-selected],
      &:hover,
      &:focus {
        box-shadow: ${`${right}, ${bottom('#51d2c2')}`};
      }
    }

    /* no right border on last tab */
    &:last-of-type {
      box-shadow: ${`${left}, ${bottom('transparent')}`};

      &[data-selected],
      &:hover,
      &:focus {
        box-shadow: ${`${left}, ${bottom('#51d2c2')}`};
      }
    }
  }

  [data-reach-tab-panels] {
    border: 1px solid ${colors.slate()};
    border-top: none;
  }

  [data-reach-tab-panel] {
    padding: 1em;
  }
`;

const tabsStyles = css`
  [data-reach-tabs] {
    /* */
  }

  [data-reach-tab-list] {
    border: 1px solid ${colors.slate()};
  }

  [data-reach-tab] {
    width: 100%;
    padding: 0.625em;
    border-bottom: none;
    border-radius: 0;
    font-size: 0.8125em;
    color: white;
    background-color: #526571;
    /* fake borders so it doesn't interfere with tab width */
    box-shadow: ${`${left}, ${right}, ${bottom('transparent')}`};

    &[data-selected],
    &:hover,
    &:focus {
      z-index: 1;
      background-color: ${colors.slate()};
      box-shadow: ${`${left}, ${right}, ${bottom('#51d2c2')}`};
    }

    /* no left border on first tab */
    &:first-of-type {
      box-shadow: ${`${right}, ${bottom('transparent')}`};

      &[data-selected],
      &:hover,
      &:focus {
        box-shadow: ${`${right}, ${bottom('#51d2c2')}`};
      }
    }

    /* no right border on last tab */
    &:last-of-type {
      box-shadow: ${`${left}, ${bottom('transparent')}`};

      &[data-selected],
      &:hover,
      &:focus {
        box-shadow: ${`${left}, ${bottom('#51d2c2')}`};
      }
    }
  }

  [data-reach-tab-panels] {
    border: 1px solid ${colors.slate()};
    border-top: none;
  }

  [data-reach-tab-panel] {
    padding: 1em;
  }
`;

export {
  ContentTabs, // TODO: remove
  StyledTabPanel, // TODO: remove
  tabsStyles,
};
