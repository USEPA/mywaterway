// @flow

import React from 'react';
import type { Node } from 'react';

// --- components ---
export const StateTabsContext: Object = React.createContext({
  currentReportStatus: '',
  currentSummary: { status: 'fetching', data: {} },
  activeState: { code: '', name: '' },
});

type Props = {
  children: Node,
};

type State = {
  currentReportStatus: string,
  currentSummary: object,
  activeState: { code: string, name: string },
};

export class StateTabsProvider extends React.Component<Props, State> {
  state: State = {
    activeTabIndex: 0,
    currentReportStatus: '',
    currentSummary: {
      status: 'fetching',
      data: {},
    },
    activeState: { code: '', name: '' },
    setActiveTabIndex: (activeTabIndex: number) => {
      this.setState({ activeTabIndex });
    },
    setCurrentReportStatus: (currentReportStatus: string) => {
      this.setState({ currentReportStatus });
    },
    setCurrentSummary: (currentSummary: string) => {
      this.setState({ currentSummary });
    },
    setActiveState: (activeState: { code: string, name: string }) => {
      this.setState({ activeState });
    },
  };

  render() {
    return (
      <StateTabsContext.Provider value={this.state}>
        {this.props.children}
      </StateTabsContext.Provider>
    );
  }
}
