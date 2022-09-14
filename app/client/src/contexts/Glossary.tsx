import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
// contexts
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import { proxyFetch } from 'utils/fetchUtils';
// helpers
import { useAbortSignal } from 'utils/hooks';
import { isAbort } from 'utils/utils';

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
type State = {
  initialized: boolean;
  setInitialized: Dispatch<SetStateAction<boolean>>;
  glossaryStatus: GlossaryStatus;
  setGlossaryStatus: Dispatch<SetStateAction<GlossaryStatus>>;
};

const StateContext = createContext<State | undefined>(undefined);

type Props = {
  children: ReactNode;
};

export function GlossaryProvider({ children }: Props) {
  const services = useServicesContext();
  const abortSignal = useAbortSignal();

  const [initialized, setInitialized] = useState(false);
  const [glossaryStatus, setGlossaryStatus] =
    useState<GlossaryStatus>('fetching');

  const state: State = useMemo(() => {
    return {
      initialized,
      glossaryStatus,
      setInitialized,
      setGlossaryStatus,
    };
  }, [glossaryStatus, initialized]);

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
        proxyFetch(services.data.glossaryURL, abortSignal)
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
            if (isAbort(err)) return reject(err);
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
  }, [abortSignal, promiseInitialized, services]);

  return (
    <StateContext.Provider value={state}>{children}</StateContext.Provider>
  );
}

export function useGlossaryState() {
  const context = useContext(StateContext);
  if (context === undefined) {
    throw new Error(
      'useGlossaryState must be called within a GlossaryProvider',
    );
  }
  return context;
}
