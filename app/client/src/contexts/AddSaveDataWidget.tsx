import { createContext, useContext, useMemo, useState } from 'react';
// types
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { WidgetLayer } from 'types';

type SearchResultsState =
  | { status: 'idle' | 'fetching' | 'failure'; data: null }
  | { status: 'success'; data: __esri.PortalQueryResult | null };

type State = {
  addSaveDataWidgetVisible: boolean;
  setAddSaveDataWidgetVisible: Dispatch<SetStateAction<boolean>>;
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

export function AddSaveDataWidgetProvider({ children }: Props) {
  const [addSaveDataWidgetVisible, setAddSaveDataWidgetVisible] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchResults, setSearchResults] = useState<SearchResultsState>({
    status: 'idle',
    data: null,
  });
  const [widgetLayers, setWidgetLayers] = useState<WidgetLayer[]>([]);

  const state: State = useMemo(() => {
    return {
      addSaveDataWidgetVisible,
      pageNumber,
      searchResults,
      setAddSaveDataWidgetVisible,
      setPageNumber,
      setSearchResults,
      setWidgetLayers,
      widgetLayers,
    };
  }, [addSaveDataWidgetVisible, pageNumber, searchResults, widgetLayers]);

  return (
    <StateContext.Provider value={state}>{children}</StateContext.Provider>
  );
}

export function useAddSaveDataWidgetState() {
  const context = useContext(StateContext);
  if (context === undefined) {
    throw new Error(
      'useAddSaveDataWidgetState must be called within an AddSaveDataWidgetProvider',
    );
  }
  return context;
}
