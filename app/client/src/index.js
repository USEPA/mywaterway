// @flow

import 'react-app-polyfill/ie11';
import 'react-app-polyfill/stable';
import smoothscroll from 'smoothscroll-polyfill';
import React from 'react';
import ReactDOM from 'react-dom';
import { createGlobalStyle } from 'styled-components';
import * as serviceWorker from './serviceWorker';
// components
import Routes from './routes';
import ErrorBoundary from 'components/shared/ErrorBoundary';
// contexts
import { AddDataWidgetProvider } from 'contexts/AddDataWidget';
import { LocationSearchProvider } from 'contexts/locationSearch';
import { GlossaryProvider } from 'contexts/Glossary';
import { LookupFilesProvider } from 'contexts/LookupFiles';
// errors
import { defaultErrorBoundaryMessage } from 'config/errorMessages';

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
    <LookupFilesProvider>
      <LocationSearchProvider>
        <GlossaryProvider>
          <AddDataWidgetProvider>
            <GlobalStyle />
            <ErrorBoundary message={defaultErrorBoundaryMessage}>
              <Routes />
            </ErrorBoundary>
          </AddDataWidgetProvider>
        </GlossaryProvider>
      </LocationSearchProvider>
    </LookupFilesProvider>
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
