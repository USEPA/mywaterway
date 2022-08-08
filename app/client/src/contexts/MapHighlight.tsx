import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Graphic from '@arcgis/core/Graphic';

type State = {
  highlightedGraphic: Graphic | null;
  selectedGraphic: Graphic | null;
  setHighlightedGraphic: (graphic: Graphic | null) => void;
  setSelectedGraphic: (graphic: Graphic | null) => void;
};

const MapHighlightContext = createContext<State | undefined>(undefined);

type Props = { children: ReactNode };

export function MapHighlightProvider({ children }: Props) {
  const [highlightedGraphic, setHighlightedGraphic] = useState<Graphic | null>(
    null,
  );
  const [selectedGraphic, setSelectedGraphic] = useState<Graphic | null>(null);
  const context: State = useMemo(() => {
    return {
      highlightedGraphic,
      setHighlightedGraphic,
      selectedGraphic,
      setSelectedGraphic,
    };
  }, [highlightedGraphic, selectedGraphic]);

  return (
    <MapHighlightContext.Provider value={context}>
      {children}
    </MapHighlightContext.Provider>
  );
}

export function useMapHighlightContext() {
  const context = useContext(MapHighlightContext);
  if (context === undefined) {
    throw new Error(
      'useMapHighlightContext must be called within a MapHighlightProvider',
    );
  }
  return context;
}
