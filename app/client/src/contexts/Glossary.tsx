import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
// contexts
import { useGlossaryTermsContext } from 'contexts/LookupFiles';
// helpers
import { lookupFetch } from 'utils/fetchUtils';
import { useAbortSignal } from 'utils/hooks';

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
  // const glossaryTerms = useGlossaryTermsContext();
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
    if (promiseInitialized) return;

    setPromiseInitialized(true);

    window.fetchGlossaryTerms = new Promise((resolve) => {
      lookupFetch('cache/glossary.json')
        .then((data: any) => {
          resolve({ status: 'success', data });
        })
        .catch((err: Error) => {
          console.error(err);
          resolve({ status: 'failure', data: [] });
        });
    });
  }, [abortSignal, promiseInitialized]);

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
