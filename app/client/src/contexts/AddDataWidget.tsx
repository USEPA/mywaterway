import { createContext, useState } from 'react';
// types
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { WidgetLayer } from 'types';

type SearchResultsState =
  | { status: 'idle' | 'fetching' | 'failure'; data: null }
  | { status: 'success'; data: __esri.PortalQueryResult | null };

type AddDataWidget = {
  addDataWidgetVisible: boolean;
  setAddDataWidgetVisible: (addDataWidgetVisible: boolean) => void;
  pageNumber: number;
  setPageNumber: Function;
  searchResults: SearchResultsState;
  setSearchResults: Dispatch<SetStateAction<SearchResultsState>>;
  widgetLayers: WidgetLayer[];
  setWidgetLayers: Dispatch<SetStateAction<WidgetLayer[]>>;
};

export const AddDataWidgetContext = createContext<AddDataWidget>({
  addDataWidgetVisible: false,
  setAddDataWidgetVisible: () => undefined,
  pageNumber: 1,
  setPageNumber: () => undefined,
  searchResults: { status: 'idle', data: null },
  setSearchResults: () => undefined,
  widgetLayers: [],
  setWidgetLayers: () => undefined,
});

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

  return (
    <AddDataWidgetContext.Provider
      value={{
        addDataWidgetVisible,
        setAddDataWidgetVisible,
        pageNumber,
        setPageNumber,
        searchResults,
        setSearchResults,
        widgetLayers,
        setWidgetLayers,
      }}
    >
      {children}
    </AddDataWidgetContext.Provider>
  );
}
