import { createContext, useContext, useMemo, useState } from 'react';
// types
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { WidgetLayer } from 'types';

type SearchResultsState =
  | { status: 'idle' | 'fetching' | 'failure'; data: null }
  | { status: 'success'; data: __esri.PortalQueryResult | null };

type State = {
  addDataWidgetVisible: boolean;
  setAddDataWidgetVisible: Dispatch<SetStateAction<boolean>>;
  pageNumber: number;
  setPageNumber: Dispatch<SetStateAction<number>>;
  searchResults: SearchResultsState;
  setSearchResults: Dispatch<SetStateAction<SearchResultsState>>;
  widgetLayers: WidgetLayer[];
  setWidgetLayers: Dispatch<SetStateAction<WidgetLayer[]>>;
};

const StateContext = createContext<State | undefined>(undefined);

type Props = {
  children: ReactNode;
};

export function AddDataWidgetProvider({ children }: Props) {
  const [addDataWidgetVisible, setAddDataWidgetVisible] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchResults, setSearchResults] = useState<SearchResultsState>({
    status: 'idle',
    data: null,
  });
  const [widgetLayers, setWidgetLayers] = useState<WidgetLayer[]>([]);

  const state: State = useMemo(() => {
    return {
      addDataWidgetVisible,
      pageNumber,
      searchResults,
      setAddDataWidgetVisible,
      setPageNumber,
      setSearchResults,
      setWidgetLayers,
      widgetLayers,
    };
  }, [addDataWidgetVisible, pageNumber, searchResults, widgetLayers]);

  return (
    <StateContext.Provider value={state}>{children}</StateContext.Provider>
  );
}

export function useAddDataWidgetState() {
  const context = useContext(StateContext);
  if (context === undefined) {
    throw new Error(
      'useAddDataWidgetState must be called within an AddDataWidgetProvider',
    );
  }
  return context;
}
