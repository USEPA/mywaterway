// @flow

import React from 'react';
import type { Node } from 'react';

export const AddDataWidgetContext: Object = React.createContext({
  addDataWidgetVisible: false,
  pageNumber: 1,
  searchResults: { status: 'none', data: null },
  widgetLayers: [],
});

type Props = {
  children: Node,
};

type State = {
  addDataWidgetVisible: boolean,
  pageNumber: number,
  searchResults: Object,
  widgetLayers: Object[],
};

export class AddDataWidgetProvider extends React.Component<Props, State> {
  state: State = {
    addDataWidgetVisible: false,
    pageNumber: 1,
    searchResults: { status: 'none', data: null },
    widgetLayers: [],

    getAddDataWidgetVisible: () => {
      return this.state.addDataWidgetVisible;
    },
    setAddDataWidgetVisible: (addDataWidgetVisible) => {
      this.setState({ addDataWidgetVisible });
    },
    setPageNumber: (pageNumber) => {
      this.setState({ pageNumber });
    },
    setSearchResults: (searchResults) => {
      this.setState({ searchResults });
    },
    addWidgetLayer: (widgetLayer) => {
      this.setState((prevState, props) => ({
        widgetLayers: [...prevState.widgetLayers, widgetLayer],
      }));
    },
    removeWidgetLayer: (layerId) => {
      this.setState((prevState, props) => ({
        widgetLayers: prevState.widgetLayers.filter(
          (widgetLayer) => widgetLayer.id !== layerId,
        ),
      }));
    },
  };
  render() {
    return (
      <AddDataWidgetContext.Provider value={this.state}>
        {this.props.children}
      </AddDataWidgetContext.Provider>
    );
  }
}
