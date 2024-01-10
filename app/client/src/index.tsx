import { Global, css } from '@emotion/react';
import 'react-app-polyfill/stable';
import smoothscroll from 'smoothscroll-polyfill';
// import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import reportWebVitals from './reportWebVitals';
// components
import AppRoutes from './routes';
import ErrorBoundary from 'components/shared/ErrorBoundary';
// contexts
import { AddSaveDataWidgetProvider } from 'contexts/AddSaveDataWidget';
import { GlossaryProvider } from 'contexts/Glossary';
import { LocationSearchProvider } from 'contexts/locationSearch';
import { LookupFilesProvider } from 'contexts/LookupFiles';
import { FetchedDataProvider } from 'contexts/FetchedData';
import { SurroundingsProvider } from 'contexts/Surroundings';
// errors
import { defaultErrorBoundaryMessage } from 'config/errorMessages';
// styles
import '@arcgis/core/assets/esri/themes/light/main.css';
import 'styles/mapStyles.css';

smoothscroll.polyfill();

const globalStyles = css`
  #root {
    margin: 0;
    font-family: 'Source Sans Pro Web', 'Helvetica Neue', 'Helvetica', 'Roboto',
      'Arial', sans-serif;
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
          <LocationSearchProvider>
            <GlossaryProvider>
              <SurroundingsProvider>
                <AddSaveDataWidgetProvider>
                  <Global styles={globalStyles} />
                  <ErrorBoundary message={defaultErrorBoundaryMessage}>
                    <AppRoutes />
                  </ErrorBoundary>
                </AddSaveDataWidgetProvider>
              </SurroundingsProvider>
            </GlossaryProvider>
          </LocationSearchProvider>
        </FetchedDataProvider>
      </LookupFilesProvider>
    </BrowserRouter>
  );
}

const rootElement: HTMLElement | null = document.getElementById('root');
// TODO - See if we can re-enable StrictMode
if (rootElement) createRoot(rootElement).render(<Root />);
// if (rootElement)
//   createRoot(rootElement).render(
//     <StrictMode>
//       <Root />
//     </StrictMode>,
//   );

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

export default Root;
