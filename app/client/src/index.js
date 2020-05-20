// @flow

import 'react-app-polyfill/ie11';
import 'react-app-polyfill/stable';
import 'core-js/features/array/find';
import 'core-js/features/array/find-index';
import 'core-js/features/object/entries';
import findIndex from 'array.prototype.findindex';
import smoothscroll from 'smoothscroll-polyfill';
import React from 'react';
import ReactDOM from 'react-dom';
import { createGlobalStyle } from 'styled-components';
import * as serviceWorker from './serviceWorker';
// components
import Routes from './routes';
import ErrorBoundary from 'components/shared/ErrorBoundary';
// contexts
import { EsriModulesProvider } from 'contexts/EsriModules';
import { LocationSearchProvider } from 'contexts/locationSearch';
import { GlossaryProvider } from 'contexts/Glossary';
// errors
import { defaultErrorBoundaryMessage } from 'config/errorMessages';

findIndex.shim();
smoothscroll.polyfill();

// --- styled components ---
export const GlobalStyle = createGlobalStyle`
  #root {
    margin: 0;
    font-family: "Source Sans Pro", "Helvetica Neue", "Helvetica", "Roboto", "Arial", sans-serif;
    font-size: 16px;
    line-height: 1;
    color: #444;
    background-color: #fff;
  }
`;

// --- components ---
function Root() {
  return (
    <EsriModulesProvider>
      <LocationSearchProvider>
        <GlossaryProvider>
          <GlobalStyle />
          <ErrorBoundary message={defaultErrorBoundaryMessage}>
            <Routes />
          </ErrorBoundary>
        </GlossaryProvider>
      </LocationSearchProvider>
    </EsriModulesProvider>
  );
}

const rootElement: ?HTMLElement = document.getElementById('root');

if (rootElement)
  ReactDOM.render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>,
    rootElement,
  );

// http://bit.ly/CRA-PWA
serviceWorker.unregister();

export default Root;
