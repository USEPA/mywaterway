import 'react-app-polyfill/stable';
import smoothscroll from 'smoothscroll-polyfill';
import { StrictMode } from 'react';
import { render } from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { createGlobalStyle } from 'styled-components';
import reportWebVitals from './reportWebVitals';
// components
import AppRoutes from './routes';
import ErrorBoundary from 'components/shared/ErrorBoundary';
// contexts
import { AddSaveDataWidgetProvider } from 'contexts/AddSaveDataWidget';
import { LayersProvider } from 'contexts/Layers';
import { LocationSearchProvider } from 'contexts/locationSearch';
import { GlossaryProvider } from 'contexts/Glossary';
import { LookupFilesProvider } from 'contexts/LookupFiles';
import { FetchedDataProvider } from 'contexts/FetchedData';
// errors
import { defaultErrorBoundaryMessage } from 'config/errorMessages';
// types
// required once project-wide
import type {} from 'styled-components/cssprop';

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
        <FetchedDataProvider>
          <LayersProvider>
          <LocationSearchProvider>
            <GlossaryProvider>
              <AddSaveDataWidgetProvider>
                <GlobalStyle />
                <ErrorBoundary message={defaultErrorBoundaryMessage}>
                  <AppRoutes />
                </ErrorBoundary>
              </AddSaveDataWidgetProvider>
            </GlossaryProvider>
          </LocationSearchProvider>
          </LayersProvider>
        </FetchedDataProvider>
      </LookupFilesProvider>
    </BrowserRouter>
  );
}

const rootElement: HTMLElement | null = document.getElementById('root');

if (rootElement)
  render(
    <StrictMode>
      <Root />
    </StrictMode>,
    rootElement,
  );

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

export default Root;
