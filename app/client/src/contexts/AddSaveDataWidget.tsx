import { createContext, useContext, useMemo, useState } from 'react';
// types
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { WidgetLayer } from 'types';

type SearchResultsState =
  | { status: 'idle' | 'fetching' | 'failure'; data: null }
  | { status: 'success'; data: __esri.PortalQueryResult | null };

type State = {
  activeTabIndex: number,
  setActiveTabIndex: Dispatch<SetStateAction<number>>,
  addSaveDataWidgetVisible: boolean;
  setAddSaveDataWidgetVisible: Dispatch<SetStateAction<boolean>>;
  pageNumber: number;
  setPageNumber: Dispatch<SetStateAction<number>>;
  saveAsName: string,
  setSaveAsName: Function,
  saveDescription: string,
  setSaveDescription: Function,
  saveLayersList: any, // TODO Fix usage of any
  setSaveLayersList: Function,
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
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [addSaveDataWidgetVisible, setAddSaveDataWidgetVisible] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [saveAsName, setSaveAsName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [saveLayersList, setSaveLayersList] = useState<any>(null); // TODO Fix any usage
  const [searchResults, setSearchResults] = useState<SearchResultsState>({
    status: 'idle',
    data: null,
  });
  const [widgetLayers, setWidgetLayers] = useState<WidgetLayer[]>([]);

  const state: State = useMemo(() => {
    return {
      activeTabIndex,
      addSaveDataWidgetVisible,
      pageNumber,
      saveAsName,
      saveDescription,
      saveLayersList,
      searchResults,
      setActiveTabIndex,
      setAddSaveDataWidgetVisible,
      setPageNumber,
      setSaveAsName,
      setSaveDescription,
      setSaveLayersList,
      setSearchResults,
      setWidgetLayers,
      widgetLayers,
    };
  }, [
    activeTabIndex,
    addSaveDataWidgetVisible,
    pageNumber,
    saveAsName,
    saveDescription,
    saveLayersList,
    searchResults,
    widgetLayers
  ]);

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
