// @flow

import React from 'react';
import type { Node } from 'react';

export const OverviewFiltersContext: Object = React.createContext({
  waterbodiesFilter: true,
  monitoringLocationsFilter: false,
  dischargersFilter: false,
});

type Props = { children: Node };
type State = {
  waterbodiesFilter: boolean,
  monitoringLocationsFilter: boolean,
  dischargersFilter: boolean,
};

export class OverviewFiltersProvider extends React.Component<Props, State> {
  state: State = {
    waterbodiesFilterEnabled: true,
    monitoringLocationsFilterEnabled: false,
    dischargersFilterEnabled: false,
    setWaterbodiesFilterEnabled: (waterbodiesFilterEnabled: boolean) => {
      this.setState({ waterbodiesFilterEnabled });
    },
    setMonitoringLocationsFilterEnabled: (
      monitoringLocationsFilterEnabled: boolean,
    ) => {
      this.setState({ monitoringLocationsFilterEnabled });
    },
    setDischargersFilterEnabled: (dischargersFilterEnabled: boolean) => {
      this.setState({ dischargersFilterEnabled });
    },
  };

  render() {
    return (
      <OverviewFiltersContext.Provider value={this.state}>
        {this.props.children}
      </OverviewFiltersContext.Provider>
    );
  }
}
