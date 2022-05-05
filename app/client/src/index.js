// @flow

import 'react-app-polyfill/stable';
import smoothscroll from 'smoothscroll-polyfill';
import React, { StrictMode } from 'react';
import { render } from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { createGlobalStyle } from 'styled-components';
import * as serviceWorker from './serviceWorker';
// components
import AppRoutes from './routes';
import ErrorBoundary from 'components/shared/ErrorBoundary';
// contexts
import { AddDataWidgetProvider } from 'contexts/AddDataWidget';
import { LocationSearchProvider } from 'contexts/locationSearch';
import { GlossaryProvider } from 'contexts/Glossary';
import { LookupFilesProvider } from 'contexts/LookupFiles';
// errors
import { defaultErrorBoundaryMessage } from 'config/errorMessages';

smoothscroll.polyfill();

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
    <BrowserRouter>
      <LookupFilesProvider>
        <LocationSearchProvider>
          <GlossaryProvider>
            <AddDataWidgetProvider>
              <GlobalStyle />
              <ErrorBoundary message={defaultErrorBoundaryMessage}>
                <AppRoutes />
              </ErrorBoundary>
            </AddDataWidgetProvider>
          </GlossaryProvider>
        </LocationSearchProvider>
      </LookupFilesProvider>
    </BrowserRouter>
  );
}

const rootElement: ?HTMLElement = document.getElementById('root');

if (rootElement)
  render(
    <StrictMode>
      <Root />
    </StrictMode>,
    rootElement,
  );

// http://bit.ly/CRA-PWA
serviceWorker.unregister();

export default Root;
