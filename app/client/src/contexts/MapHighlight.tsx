import { createContext, useContext, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';

type State = {
  highlightedGraphic: __esri.Graphic | null;
  selectedGraphic: __esri.Graphic | null;
  setHighlightedGraphic: Dispatch<SetStateAction<__esri.Graphic | null>>;
  setSelectedGraphic: Dispatch<SetStateAction<__esri.Graphic | null>>;
};

const StateContext = createContext<State | undefined>(undefined);

type Props = { children: ReactNode };

export function MapHighlightProvider({ children }: Props) {
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
