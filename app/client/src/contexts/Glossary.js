// @flow

import React from 'react';
import type { Node } from 'react';
// utilities
import { proxyFetch } from 'utils/fetchUtils';
// config
import { glossaryURL } from 'config/webServiceConfig';

// --- components ---
const GlossaryContext: Object = React.createContext({
  initialized: false,
  setInitialized: () => {},
});

type Props = {
  children: Node,
};

function GlossaryProvider({ children }: Props) {
  const [initialized, setInitialized] = React.useState(false);

  // the components/GlossaryTerm component uses glossary terms fetched below.
  // some GlossaryTerm components are rendered outside of the main React tree
  // (see getPopupContent() in components/MapFunctions), so we need to store
  // the fetched glossary terms on the global window object
  React.useEffect(() => {
    window.fetchGlossaryTerms = new Promise((resolve, reject) => {
      proxyFetch(glossaryURL)
        .then((res) => {
          const data = res
            .filter((item) => item['ActiveStatus'] !== 'Deleted')
            .map((item) => {
              const term = item['Name'];
              const definition = item['Attributes'].filter((attr) => {
                return attr['Name'] === 'Editorial Note';
              })[0]['Value'];
              return { term, definition };
            });
          resolve({ status: 'success', data });
        })
        .catch((err) => {
          console.error(err);
          resolve({ status: 'failure', data: [] });
        });
    });
  }, []);

  return (
    <GlossaryContext.Provider value={{ initialized, setInitialized }}>
      {children}
    </GlossaryContext.Provider>
  );
}

export { GlossaryContext, GlossaryProvider };
