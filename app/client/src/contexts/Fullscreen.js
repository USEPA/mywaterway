// @flow

import React from 'react';
import type { Node } from 'react';

// --- components ---
export const FullscreenContext: Object = React.createContext({
  fullscreenActive: false,
});

type Props = {
  children: Node,
};

type State = {
  fullscreenActive: boolean,
};

export class FullscreenProvider extends React.Component<Props, State> {
  state: State = {
    fullscreenActive: false,
    setFullscreenActive: (fullscreenActive: boolean) => {
      this.setState({ fullscreenActive });
    },
    getFullscreenActive: () => {
      return this.state.fullscreenActive;
    },
  };

  render() {
    return (
      <FullscreenContext.Provider value={this.state}>
        {this.props.children}
      </FullscreenContext.Provider>
    );
  }
}
