// @flow

import React from 'react';
import type { Node } from 'react';

// --- components ---
export const StateTabsContext: Object = React.createContext({
  currentReportStatus: '',
  currentSummary: { status: 'fetching', data: {} },
  currentReportingCycle: { status: 'fetching', currentReportingCycle: '' },
  activeState: { code: '', name: '' },
  introText: { status: 'fetching', data: {} },
  organizationId: '',
});

type Props = {
  children: Node,
};

type State = {
  currentReportStatus: string,
  currentSummary: object,
  currentReportingCycle: object,
  activeState: { code: string, name: string },
  introText: object,
  organizationId: string,
};

export class StateTabsProvider extends React.Component<Props, State> {
  state: State = {
    activeTabIndex: 0,
    currentReportStatus: '',
    currentSummary: {
      status: 'fetching',
      data: {},
    },
    currentReportingCycle: {
      status: 'fetching',
      currentReportingCycle: '',
    },
    activeState: { code: '', name: '' },
    introText: {
      status: 'fetching',
      data: {},
    },
    organizationId: '',
    // in case ATTAINS usesStateSummary service returns invalid data or an internal error
    usesStateSummaryServiceError: false,
    setActiveTabIndex: (activeTabIndex: number) => {
      this.setState({ activeTabIndex });
    },
    setCurrentReportStatus: (currentReportStatus: string) => {
      this.setState({ currentReportStatus });
    },
    setCurrentSummary: (currentSummary: string) => {
      this.setState({ currentSummary });
    },
    setCurrentReportingCycle: (currentReportingCycle: object) => {
      this.setState({ currentReportingCycle });
    },
    setActiveState: (activeState: { code: string, name: string }) => {
      this.setState({ activeState });
    },
    setIntroText: (introText: object) => {
      this.setState({ introText });
    },
    setUsesStateSummaryServiceError: (
      usesStateSummaryServiceError: boolean,
    ) => {
      this.setState({ usesStateSummaryServiceError });
    },
    setOrganizationId: (organizationId: string) => {
      this.setState({ organizationId });
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
