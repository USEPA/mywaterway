// @flow

import React from 'react';
import type { Node } from 'react';

export const MapHighlightContext: Object = React.createContext({
  highlightedGraphic: '',
  selectedGraphic: '',
});

type Props = { children: Node };
type State = {
  highlightedGraphic: Object,
  selectedGraphic: Object,
  getHighlightedGraphic: Function,
  getSelectedGraphic: Function,
  setHighlightedGraphic: Function,
  setSelectedGraphic: Function,
};

export class MapHighlightProvider extends React.Component<Props, State> {
  state: State = {
    highlightedGraphic: '',
    selectedGraphic: '',
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
  };

  render() {
    return (
      <MapHighlightContext.Provider value={this.state}>
        {this.props.children}
      </MapHighlightContext.Provider>
    );
  }
}
