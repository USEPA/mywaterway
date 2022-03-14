// @flow

import { css } from 'styled-components/macro';

const colors = {
  black: (alpha: number = 1) => `rgba(0, 0, 0, ${alpha})`, // #000
  white: (alpha: number = 1) => `rgba(255, 255, 255, ${alpha})`, // #fff
  slate: (alpha: number = 1) => `rgba(53, 61, 71, ${alpha})`, // #353d47
  blue: (alpha: number = 1) => `rgba(0, 113, 187, ${alpha})`, // #0071bb
  navyBlue: (alpha: number = 1) => `rgba(64, 97, 142, ${alpha})`, // #40618e
  teal: (alpha: number = 1) => `rgba(80, 210, 194, ${alpha})`, // #50d2c2
  gold: (alpha: number = 1) => `rgba(252, 171, 83, ${alpha})`, // #fcab53
  magenta: (alpha: number = 1) => `rgba(255, 51, 102, ${alpha})`, // #ff3366
  red: (alpha: number = 1) => `rgba(203, 34, 62, ${alpha})`, // #cb223e
  green: (alpha: number = 1) => `rgba(32, 128, 12, ${alpha})`, // #20800c
  purple: (alpha: number = 1) => `rgba(107, 65, 149, ${alpha})`, // #6b4195
  lightPurple: (alpha: number = 1) => `rgba(197, 0, 255, ${alpha})`, // #6b4195
  steel: (alpha: number = 1) => `rgba(82, 101, 113, ${alpha})`, // #526571

  // for hovers and selecting waterbodies
  highlightedRed: (alpha: number = 1) => `rgba(124, 157, 173, ${alpha})`, //  #54bcec
  highlightedGreen: (alpha: number = 1) => `rgba(70, 227, 159, ${alpha})`, // #46e39f
  highlightedPurple: (alpha: number = 1) => `rgba(84, 188, 236, ${alpha})`, // #7C9dad

  gray3: '#333',
  gray4: '#444',
  gray6: '#666',
  gray9: '#999',
  grayc: '#ccc',
  grayd: '#ddd',
  graye: '#eee',

  orange: '#ffa500',
  yellow: '#ffff00',
};

const fonts = {
  primary: `'Source Sans Pro', 'Helvetica Neue', 'Helvetica', 'Roboto', 'Arial', sans-serif`,
  secondary: `'Roboto Slab', serif`,
};

const reactSelectStyles = {
  placeholder: (defaultStyles) => ({ ...defaultStyles, color: '#495057' }),
  singleValue: (defaultStyles) => ({ ...defaultStyles, lineHeight: 2 }),
};

const tableStyles = css`
  th,
  td {
    font-size: 0.875em;
    line-height: 1.125;

    @media (min-width: 560px) {
      font-size: 1em;
    }
  }
`;

const toggleTableStyles = css`
  ${tableStyles}

  thead {
    background-color: #f0f6f9;
  }

  th,
  td {
    :last-of-type {
      text-align: right;
    }
  }
`;

export { colors, fonts, reactSelectStyles, tableStyles, toggleTableStyles };
