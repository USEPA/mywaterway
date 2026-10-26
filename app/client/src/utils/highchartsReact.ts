import HighchartsReactModule from 'highcharts-react-official';

// The wrapper is CJS. Vite 8's dev interop binds the module namespace while the
// build binds the component, so unwrap to get the component either way. Remove
// this once the wrapper ships ESM, or on moving to @highcharts/react.
export const HighchartsReact =
  (
    HighchartsReactModule as typeof HighchartsReactModule & {
      default?: typeof HighchartsReactModule;
    }
  ).default ?? HighchartsReactModule;
