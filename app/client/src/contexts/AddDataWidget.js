// @flow

import React from 'react';
import type { Node } from 'react';

export const AddDataWidgetContext: Object = React.createContext({
  addDataWidgetVisible: false,
  pageNumber: 1,
  searchResults: { status: 'none', data: null },
  portalLayers: [],
  referenceLayers: [],
  urlLayers: [],
});

type Props = {
  children: Node,
};

type State = {
  addDataWidgetVisible: boolean,
  pageNumber: number,
  searchResults: Object,
  portalLayers: Object[],
  referenceLayers: Object[],
  urlLayers: Object[],
};

export class AddDataWidgetProvider extends React.Component<Props, State> {
  state: State = {
    addDataWidgetVisible: false,
    pageNumber: 1,
    searchResults: { status: 'none', data: null },
    portalLayers: [],
    referenceLayers: [],
    urlLayers: [],

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
    addPortalLayer: (portalLayer) => {
      this.setState((prevState, props) => ({
        portalLayers: [...prevState.portalLayers, portalLayer],
      }));
    },
    removePortalLayer: (layerId) => {
      this.setState((prevState, props) => ({
        portalLayers: prevState.portalLayers.filter(
          (portalLayer) => portalLayer.id !== layerId,
        ),
      }));
    },
    setPortalLayers: (portalLayers) => {
      this.setState({ portalLayers });
    },
    addReferenceLayer: (referenceLayer) => {
      this.setState((prevState, props) => ({
        referenceLayers: [...prevState.referenceLayers, referenceLayer],
      }));
    },
    removeReferenceLayer: (layerId) => {
      this.setState((prevState, props) => ({
        referenceLayers: prevState.referenceLayers.filter(
          (referenceLayer) => referenceLayer.layerId !== layerId,
        ),
      }));
    },
    setReferenceLayers: (referenceLayers) => {
      this.setState({ referenceLayers });
    },
    setUrlLayers: (urlLayers) => {
      this.setState({ urlLayers });
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
