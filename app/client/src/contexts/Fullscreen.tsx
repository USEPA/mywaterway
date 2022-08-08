import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type State = {
  fullscreenActive: boolean;
  setFullscreenActive: (fullscreenActive: boolean) => void;
};

// --- components ---
const FullscreenContext = createContext<State | undefined>(undefined);

type Props = {
  children: ReactNode;
};

export function FullscreenProvider({ children }: Props) {
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const state: State = useMemo(() => {
    return { fullscreenActive, setFullscreenActive };
  }, [fullscreenActive]);

  return (
    <FullscreenContext.Provider value={state}>
      {children}
    </FullscreenContext.Provider>
  );
}

export function useFullscreenContext() {
  const context = useContext(FullscreenContext);
  if (context === undefined) {
    throw new Error(
      'useFullscreenContext must be called within a FullscreenProvider',
    );
  }
  return context;
}
