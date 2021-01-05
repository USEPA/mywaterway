// @flow

import React from 'react';
import type { Node } from 'react';

export const AddDataWidgetContext: Object = React.createContext({
  addDataWidgetVisible: false,
  portalLayers: [],
  referenceLayers: [],
  urlLayers: [],
});

type Props = {
  children: Node,
};

type State = {
  addDataWidgetVisible: boolean,
  portalLayers: Object[],
  referenceLayers: Object[],
  urlLayers: Object[],
};

export class AddDataWidgetProvider extends React.Component<Props, State> {
  state: State = {
    addDataWidgetVisible: false,
    portalLayers: [],
    referenceLayers: [],
    urlLayers: [],

    getAddDataWidgetVisible: () => {
      return this.state.addDataWidgetVisible;
    },
    setAddDataWidgetVisible: (addDataWidgetVisible) => {
      this.setState({ addDataWidgetVisible });
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
