import { css } from '@emotion/react';
import { CSSObjectWithLabel } from 'react-select';

export const colors = {
  black: (alpha: number = 1) => `rgba(0, 0, 0, ${alpha})`, // #000
  white: (alpha: number = 1) => `rgba(255, 255, 255, ${alpha})`, // #fff
  slate: (alpha: number = 1) => `rgba(53, 61, 71, ${alpha})`, // #353d47
  blue: (alpha: number = 1) => `rgba(0, 113, 187, ${alpha})`, // #0071bb
  skyBlue: (alpha: number = 1) => `rgba(0, 123, 255, ${alpha})`, // #1a85ff
  navyBlue: (alpha: number = 1) => `rgba(64, 97, 142, ${alpha})`, // #40618e
  orange: (alpha: number = 1) => `rgba(255, 166, 0, ${alpha})`, // #ffa500
  cyan: (alpha: number = 1) => `rgba(0, 255, 255, ${alpha})`, // #00ffff
  teal: (alpha: number = 1) => `rgba(80, 210, 194, ${alpha})`, // #50d2c2
  gold: (alpha: number = 1) => `rgba(252, 171, 83, ${alpha})`, // #fcab53
  magenta: (alpha: number = 1) => `rgba(255, 51, 102, ${alpha})`, // #ff3366
  red: (alpha: number = 1) => `rgba(203, 34, 62, ${alpha})`, // #cb223e
  green: (alpha: number = 1) => `rgba(32, 128, 12, ${alpha})`, // #20800c
  purple: (alpha: number = 1) => `rgba(92, 26, 158, ${alpha})`, // #5c1a9e
  lightPurple: (alpha: number = 1) => `rgba(216, 119, 255, ${alpha})`, // #d877ff
  steel: (alpha: number = 1) => `rgba(82, 101, 113, ${alpha})`, // #526571
  darkCyan: (alpha: number = 1) => `rgba(0, 202, 202, ${alpha})`, // #00caca
  yellow: (alpha: number = 1) => `rgba(255, 255, 0, ${alpha})`, // #ffff00

  // for hovers and selecting waterbodies
  highlightedBlue: (alpha: number = 1) => `rgba(93, 153, 227, ${alpha})`, // #5d99e3
  highlightedRed: (alpha: number = 1) => `rgba(124, 157, 173, ${alpha})`, //  #7c9dad
  highlightedGreen: (alpha: number = 1) => `rgba(70, 227, 159, ${alpha})`, // #46e39f
  highlightedPurple: (alpha: number = 1) => `rgba(84, 188, 236, ${alpha})`, // #54bcec

  gray3: '#333',
  gray4: '#444',
  gray6: '#666',
  gray9: '#999',
  gray45: '#454545',
  grayc: '#ccc',
  grayc9: '#c9c9c9',
  grayd: '#ddd',
  graye: '#eee',
};

export const disclaimerStyles = css`
  display: inline-block;
  padding-bottom: 1.5em;
`;

export const downloadLinksStyles = css`
  span {
    display: inline-block;
    width: 100%;
    font-weight: bold;

    @media (min-width: 360px) {
      margin-right: 0.5em;
      width: auto;
    }
  }

  a {
    margin-right: 1em;
  }
`;

export const iconButtonStyles = css`
  background: none;
  background-color: transparent !important;
  border: none;
  color: inherit;
  margin: 0;
  outline: inherit;
  padding: 0;

  &:hover,
  &:focus {
    color: ${colors.navyBlue()} !important;
    background-color: inherit !important;
  }
`;

export const iconStyles = css`
  margin-right: 5px;
`;

export const fonts = {
  primary: `'Source Sans Pro Web', 'Helvetica Neue', 'Helvetica', 'Roboto', 'Arial', sans-serif`,
  secondary: `'Roboto Slab', serif`,
};

export const groupHeadingStyles: CSSObjectWithLabel = {
  margin: 0,
  padding: '6px 12px',
  color: '#fff',
  backgroundColor: '#4c4c4c',
  lineHeight: '16px',
  fontSize: '16px',
  fontWeight: '400',
  textTransform: 'none',
};

export const noMapDataWarningStyles = css`
  font-size: 0.875rem;

  i {
    text-shadow:
      -1px 0 #000,
      0 1px #000,
      1px 0 #000,
      0 -1px #000;
    color: ${colors.yellow()};
    font-size: 0.95rem;
    margin-right: 5px;
  }
`;

export const reactSelectStyles = {
  group: (defaultStyles: CSSObjectWithLabel) => ({
    ...defaultStyles,
    padding: 0,
  }),
  groupHeading: (defaultStyles: CSSObjectWithLabel) => ({
    ...defaultStyles,
    ...groupHeadingStyles,
  }),
  menuList: (defaultStyles: CSSObjectWithLabel) => ({
    ...defaultStyles,
    padding: 0,
  }),
  placeholder: (defaultStyles: CSSObjectWithLabel) => ({
    ...defaultStyles,
    color: '#495057',
  }),
  singleValue: (defaultStyles: CSSObjectWithLabel) => ({
    ...defaultStyles,
    lineHeight: 2,
  }),
};

export const tableStyles = css`
  th,
  td {
    font-size: 0.875em;
    line-height: 1.125;

    @media (min-width: 560px) {
      font-size: 1em;
    }
  }
`;

export const modifiedTableStyles = css`
  ${tableStyles}

  thead th {
    vertical-align: top;
  }

  th,
  td {
    hyphens: auto;
    overflow-wrap: anywhere;

    :first-of-type {
      padding-left: 0;
    }

    :last-of-type {
      padding-right: 0;
    }
  }
`;

export const tabLegendStyles = css`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-around;

  > span {
    display: flex;
    align-items: center;
    font-size: 0.875em;
    margin-bottom: 1em;

    @media (min-width: 560px) {
      font-size: 1em;
    }
  }
`;

export const toggleTableStyles = css`
  ${tableStyles}

  thead,
  thead th,
  tfoot th {
    background-color: #f0f6f9;
  }

  td,
  th {
    :last-of-type {
      text-align: right;
    }
  }

  span,
  td,
  th {
    overflow-wrap: anywhere;
    word-break: break-word;
  }
`;
