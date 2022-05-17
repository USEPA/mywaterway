// @flow

import React, { Component, createContext } from 'react';
import type { Node } from 'react';

export const MapHighlightContext: Object = createContext({
  highlightedGraphic: '',
  selectedGraphic: '',
  cacheStale: false,
});

type Props = { children: Node };
type State = {
  highlightedGraphic: Object,
  selectedGraphic: Object,
  cacheStale: boolean,
  getHighlightedGraphic: Function,
  getSelectedGraphic: Function,
  setHighlightedGraphic: Function,
  setSelectedGraphic: Function,
  setCacheStale: Function,
};

export class MapHighlightProvider extends Component<Props, State> {
  state: State = {
    highlightedGraphic: '',
    selectedGraphic: '',
    cacheStale: false,
    getHighlightedGraphic: () => {
      return this.state.highlightedGraphic;
    },
    getSelectedGraphic: () => {
      return this.state.selectedGraphic;
    },
    setHighlightedGraphic: (highlightedGraphic: Object) => {
      this.setState({ highlightedGraphic });
    },
    setSelectedGraphic: (selectedGraphic: Object) => {
      this.setState({ selectedGraphic });
    },
    setCacheStale: (cacheStale: boolean) => {
      this.setState({ cacheStale });
    },
  };

  render() {
    return (
      <MapHighlightContext.Provider value={this.state}>
        {this.props.children}
      </MapHighlightContext.Provider>
    );
  }
}
