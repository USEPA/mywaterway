// @flow

import React, { createContext, useEffect, useState } from 'react';
import type { Node } from 'react';
// contexts
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import { proxyFetch } from 'utils/fetchUtils';

// --- components ---
const GlossaryContext: Object = createContext({
  initialized: false,
  setInitialized: () => {},
  glossaryStatus: 'fetching',
  setGlossaryStatus: () => {},
});

type Props = {
  children: Node,
};

function GlossaryProvider({ children }: Props) {
  const services = useServicesContext();

  const [initialized, setInitialized] = useState(false);
  const [glossaryStatus, setGlossaryStatus] = useState('fetching');

  // the components/GlossaryTerm component uses glossary terms fetched below.
  // some GlossaryTerm components are rendered outside of the main React tree
  // (see getPopupContent() in components/MapFunctions), so we need to store
  // the fetched glossary terms on the global window object
  const [promiseInitialized, setPromiseInitialized] = useState(false);
  useEffect(() => {
    if (promiseInitialized || services.status !== 'success') return;

    setPromiseInitialized(true);

    window.fetchGlossaryTerms = new Promise((resolve, reject) => {
      // Function that fetches the glossary terms.
      // This will retry the fetch 3 times if the fetch fails with a
      // 1 second delay between each retry.
      const fetchTerms = (retryCount: number = 0) => {
        proxyFetch(services.data.glossaryURL)
          .then((res) => {
            let data = res
              .filter((item) => item['ActiveStatus'] !== 'Deleted')
              .map((item) => {
                const term = item['Name'];
                const definition = item['Attributes'].filter((attr) => {
                  return attr['Name'] === 'Editorial Note';
                })[0]['Value'];
                return { term, definition };
              });

            // filter out duplicate terms from the web service
            data = data.filter(
              (item, index) =>
                data.findIndex((term) => term.term === item.term) === index,
            );

            resolve({ status: 'success', data });
          })
          .catch((err) => {
            console.error(err);

            // resolve the request when the max retry count of 3 is hit
            if (retryCount === 3) {
              resolve({ status: 'failure', data: [] });
            } else {
              // recursive retry (1 second between retries)
              console.log(
                `Failed to fetch Glossary terms. Retrying (${
                  retryCount + 1
                } of 3)...`,
              );
              setTimeout(() => fetchTerms(retryCount + 1), 1000);
            }
          });
      };

      fetchTerms();
    });
  }, [promiseInitialized, services]);

  return (
    <GlossaryContext.Provider
      value={{ initialized, setInitialized, glossaryStatus, setGlossaryStatus }}
    >
      {children}
    </GlossaryContext.Provider>
  );
}

export { GlossaryContext, GlossaryProvider };
