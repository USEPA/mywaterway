// @flow

import React, { createContext, useState } from 'react';
import type { Node } from 'react';

type AddDataWidget = {
  addDataWidgetVisible: boolean,
  setAddDataWidgetVisible: Function,
  pageNumber: number,
  setPageNumber: Function,
  searchResults: Object,
  setSearchResults: Function,
  widgetLayers: Object[],
  setWidgetLayers: Function,
};

export const AddDataWidgetContext: Object = createContext<AddDataWidget>({
  addDataWidgetVisible: false,
  setAddDataWidgetVisible: () => {},
  pageNumber: 1,
  setPageNumber: () => {},
  searchResults: { status: 'none', data: null },
  setSearchResults: () => {},
  widgetLayers: [],
  setWidgetLayers: () => {},
});

type Props = {
  children: Node,
};

export function AddDataWidgetProvider({ children }: Props) {
  const [addDataWidgetVisible, setAddDataWidgetVisible] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchResults, setSearchResults] = useState({
    status: 'none',
    data: null,
  });
  const [widgetLayers, setWidgetLayers] = useState([]);

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
