// @flow

import React, { Component, createContext } from 'react';
import type { Node } from 'react';

// --- components ---
export const CommunityTabsContext: Object = createContext({
  activeTabIndex: 0,
  infoToggleChecked: true,
});

type Props = {
  children: Node,
};

type State = {
  activeTabIndex: number,
  infoToggleChecked: boolean,
};

export class CommunityTabsProvider extends Component<Props, State> {
  state: State = {
    activeTabIndex: -1,
    infoToggleChecked: true,
    setActiveTabIndex: (activeTabIndex: number) => {
      this.setState({ activeTabIndex });
    },
    setInfoToggleChecked: (infoToggleChecked: boolean) => {
      this.setState({ infoToggleChecked });
    },
  };

  render() {
    return (
      <CommunityTabsContext.Provider value={this.state}>
        {this.props.children}
      </CommunityTabsContext.Provider>
    );
  }
}
