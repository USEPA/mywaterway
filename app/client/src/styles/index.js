// @flow

const colors = {
  black: (alpha: number = 1) => `rgba(0, 0, 0, ${alpha})`, // #000
  white: (alpha: number = 1) => `rgba(255, 255, 255, ${alpha})`, // #fff
  slate: (alpha: number = 1) => `rgba(53, 61, 71, ${alpha})`, // #353d47
  blue: (alpha: number = 1) => `rgba(0, 113, 187, ${alpha})`, // #0071bb
  purple: (alpha: number = 1) => `rgba(64, 97, 142, ${alpha})`, // #40618e
  teal: (alpha: number = 1) => `rgba(80, 210, 194, ${alpha})`, // #50d2c2
  gold: (alpha: number = 1) => `rgba(252, 171, 83, ${alpha})`, // #fcab53
  magenta: (alpha: number = 1) => `rgba(255, 51, 102, ${alpha})`, // #ff3366
  gray3: '#333',
  gray4: '#444',
  gray6: '#666',
  gray9: '#999',
  grayc: '#ccc',
  grayd: '#ddd',
  graye: '#eee',
};

const fonts = {
  primary: `'Source Sans Pro', 'Helvetica Neue', 'Helvetica', 'Roboto', 'Arial', sans-serif`,
  secondary: `'Roboto Slab', serif`,
};

const reactSelectStyles = {
  placeholder: (defaultStyles) => {
    return {
      ...defaultStyles,
      color: '#495057',
    };
  },
};

export { colors, fonts, reactSelectStyles };
