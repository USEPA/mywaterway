import { createContext, useContext, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { ExtendedGraphic } from '@/types';

type State = {
  highlightedGraphic: ExtendedGraphic | null;
  selectedGraphic: ExtendedGraphic | null;
  setHighlightedGraphic: Dispatch<SetStateAction<ExtendedGraphic | null>>;
  setSelectedGraphic: Dispatch<SetStateAction<ExtendedGraphic | null>>;
};

const StateContext = createContext<State | undefined>(undefined);

type Props = { children: ReactNode };

export function MapHighlightProvider({ children }: Readonly<Props>) {
  const [highlightedGraphic, setHighlightedGraphic] =
    useState<__esri.Graphic | null>(null);
  const [selectedGraphic, setSelectedGraphic] = useState<__esri.Graphic | null>(
    null,
  );
  const state: State = useMemo(() => {
    return {
      highlightedGraphic,
      setHighlightedGraphic,
      selectedGraphic,
      setSelectedGraphic,
    };
  }, [highlightedGraphic, selectedGraphic]);

  return (
    <StateContext.Provider value={state}>{children}</StateContext.Provider>
  );
}

export function useMapHighlightState() {
  const context = useContext(StateContext);
  if (context === undefined) {
    throw new Error(
      'useMapHighlightState must be called within a MapHighlightProvider',
    );
  }
  return context;
}
