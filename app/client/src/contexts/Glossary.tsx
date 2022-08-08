import { createContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
// contexts
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import { proxyFetch } from 'utils/fetchUtils';

// types
interface GlossaryData {
  term: string;
  definition: string;
}

type GlossaryStatus = 'fetching' | 'failure' | 'success';

interface FetchSuccessState {
  status: 'success';
  data: GlossaryData[];
}

interface FetchFailureState {
  status: 'failure';
  data: never[];
}

type FetchState = FetchSuccessState | FetchFailureState;

declare global {
  interface Window {
    fetchGlossaryTerms: Promise<FetchState>;
  }
}

// --- components ---
type GlossaryContextProps = {
  initialized: boolean;
  setInitialized: (initialized: boolean) => void;
  glossaryStatus: GlossaryStatus;
  setGlossaryStatus: (status: GlossaryStatus) => void;
};

const GlossaryContext = createContext<GlossaryContextProps>({
  initialized: false,
  setInitialized: () => undefined,
  glossaryStatus: 'fetching',
  setGlossaryStatus: () => undefined,
});

type Props = {
  children: ReactNode;
};

function GlossaryProvider({ children }: Props) {
  const services = useServicesContext();

  const [initialized, setInitialized] = useState(false);
  const [glossaryStatus, setGlossaryStatus] =
    useState<GlossaryStatus>('fetching');

  // the components/GlossaryTerm component uses glossary terms fetched below.
  // some GlossaryTerm components are rendered outside of the main React tree
  // (see getPopupContent() in components/MapFunctions), so we need to store
  // the fetched glossary terms on the global window object
  const [promiseInitialized, setPromiseInitialized] = useState(false);
  useEffect(() => {
    if (promiseInitialized || services.status !== 'success') return;

    setPromiseInitialized(true);

    window.fetchGlossaryTerms = new Promise((resolve, _reject) => {
      // Function that fetches the glossary terms.
      // This will retry the fetch 3 times if the fetch fails with a
      // 1 second delay between each retry.
      const fetchTerms = (retryCount: number = 0) => {
        proxyFetch(services.data.glossaryURL)
          .then((res) => {
            let data = res
              .filter(
                (item: typeof res[number]) =>
                  item['ActiveStatus'] !== 'Deleted',
              )
              .map((item: typeof res[number]) => {
                const term = item['Name'];
                const definition = item['Attributes'].filter(
                  (attr: typeof item['Attributes']) => {
                    return attr['Name'] === 'Editorial Note';
                  },
                )[0]['Value'];
                return { term, definition };
              });

            // filter out duplicate terms from the web service
            data = data.filter(
              (item: GlossaryData, index: number) =>
                data.findIndex(
                  (term: GlossaryData) => term.term === item.term,
                ) === index,
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
