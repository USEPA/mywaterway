import { Global, css } from '@emotion/react';
import 'react-app-polyfill/stable';
import smoothscroll from 'smoothscroll-polyfill';
// import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
/*
  NOTE: regenerator-runtime is imported to avoid a bug with a GitHub Action
  workflow including regenerator-runtime in the build as an external dependency.
  For reference, the GitHub Action workflow's log message stated:
    "regenerator-runtime/runtime.js" is imported by
    "regenerator-runtime/runtime.js?commonjs-external", but could not be
    resolved – treating it as an external dependency.
*/
import 'regenerator-runtime';
// components
import AppRoutes from './routes';
import ErrorBoundary from 'components/shared/ErrorBoundary';
// contexts
import { AddSaveDataWidgetProvider } from 'contexts/AddSaveDataWidget';
import { ConfigFilesProvider } from 'contexts/ConfigFiles';
import { LocationSearchProvider } from 'contexts/locationSearch';
import { FetchedDataProvider } from 'contexts/FetchedData';
import { SurroundingsProvider } from 'contexts/Surroundings';
// errors
import { defaultErrorBoundaryMessage } from 'config/errorMessages';
// styles
import { fonts } from 'styles';
import '@arcgis/core/assets/esri/themes/light/main.css';
import '@esri/calcite-components/dist/components/calcite-icon';
import 'styles/mapStyles.css';

smoothscroll.polyfill();

const globalStyles = css`
  #root {
    margin: 0;
    font-family: ${fonts.primary};
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
      <ConfigFilesProvider>
        <FetchedDataProvider>
          <LocationSearchProvider>
            <SurroundingsProvider>
              <AddSaveDataWidgetProvider>
                <Global styles={globalStyles} />
                <ErrorBoundary message={defaultErrorBoundaryMessage}>
                  <AppRoutes />
                </ErrorBoundary>
              </AddSaveDataWidgetProvider>
            </SurroundingsProvider>
          </LocationSearchProvider>
        </FetchedDataProvider>
      </ConfigFilesProvider>
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

export default Root;
