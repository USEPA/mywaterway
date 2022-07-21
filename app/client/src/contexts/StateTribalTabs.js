// @flow

import React, { Component, createContext } from 'react';
import type { Node } from 'react';

// --- components ---
export const StateTribalTabsContext: Object = createContext({
  currentReportStatus: '',
  currentSummary: { status: 'fetching', data: {} },
  currentReportingCycle: { status: 'fetching', currentReportingCycle: '' },
  activeState: { value: '', label: '', source: 'All' },
  introText: { status: 'fetching', data: {} },
  stateAndOrganizationId: null,
});

type Props = {
  children: Node,
};

type State = {
  currentReportStatus: string,
  currentSummary: object,
  currentReportingCycle: object,
  activeState: {
    value: string,
    label: string,
    source: 'All' | 'State' | 'Tribe',
  },
  introText: object,
  stateAndOrganization: object,
};

export class StateTribalTabsProvider extends Component<Props, State> {
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
    activeState: { value: '', label: '', source: 'All' },
    introText: {
      status: 'fetching',
      data: {},
    },
    stateAndOrganization: null,
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
    setActiveState: (activeState: {
      value: string,
      label: string,
      source: 'All' | 'State' | 'Tribe',
    }) => {
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
    setStateAndOrganization: (stateAndOrganization: object) => {
      this.setState({ stateAndOrganization });
    },
  };

  render() {
    return (
      <StateTribalTabsContext.Provider value={this.state}>
        {this.props.children}
      </StateTribalTabsContext.Provider>
    );
  }
}
