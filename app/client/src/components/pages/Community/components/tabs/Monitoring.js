// @flow

import React from 'react';
import styled from 'styled-components';
// components
import TabErrorBoundary from 'components/shared/ErrorBoundary/TabErrorBoundary';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import Switch from 'components/shared/Switch';
import ViewOnMapButton from 'components/shared/ViewOnMapButton';
import WaterbodyInfo from 'components/shared/WaterbodyInfo';
import { StyledErrorBox } from 'components/shared/MessageBoxes';
import {
  AccordionList,
  AccordionItem,
} from 'components/shared/Accordion/MapHighlight';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
// utilities
import { plotStations } from 'components/pages/LocationMap/MapFunctions';
// errors
import { monitoringError } from 'config/errorMessages';

const switches = [
  {
    label: 'All',
    groupName: '',
  },
  {
    label: 'Nutrients',
    groupName: 'Nutrient',
  },
  {
    label: 'Pesticides',
    groupName: 'Organics, Pesticide',
  },
  {
    label: 'Metals',
    groupName: 'Inorganics, Major, Metals',
  },
  {
    label: 'Sediments',
    groupName: 'Sediment',
  },
  {
    label: 'Microbiological',
    groupName: 'Microbiological',
  },
  {
    label: 'Other',
    groupName: '',
  },
];

// --- styled components ---
const Container = styled.div`
  padding: 1em;
`;

const Text = styled.p`
  text-align: center;
`;

const Table = styled.table`
  thead {
    background-color: #f0f6f9;
  }

  th:last-of-type,
  td:last-of-type {
    text-align: right;
  }
`;

const Toggle = styled.div`
  display: flex;
  align-items: center;

  span {
    margin-left: 0.5rem;
  }
`;

const AccordionContent = styled.div`
  padding: 0.4375em 0.875em 0.875em;
`;

// --- components ---
type Props = {
  // props passed implicitly in Community component
  esriModules: Object,
  infoToggleChecked: boolean,
};

type MonitoringLocationData = {
  type: 'FeatureCollection',
  features: Array<{
    type: 'Feature',
    geometry: Object,
    properties: Object,
  }>,
};

type Station = {
  properties: Object,
  x: number,
  y: number,
  uid: string,
};

type StationGroups = {
  [label: string]: {
    label: string,
    groupName: string,
    stations: Array<Station>,
    toggled: boolean,
  },
};

type State = {
  prevMonitoringLocationData: MonitoringLocationData,
  monitoringLocationToggles: { [label: string]: boolean },
  monitoringStationGroups: StationGroups,
  allMonitoringStations: Array<Station>,
  displayedMonitoringStations: Array<Station>,
  allToggled: boolean,
  sortBy: string,
};

class Monitoring extends React.Component<Props, State> {
  static contextType = LocationSearchContext;

  state: State = {
    prevMonitoringLocationData: {},
    monitoringLocationToggles: {},
    monitoringStationGroups: {},
    allMonitoringStations: [],
    displayedMonitoringStations: [],
    allToggled: true,
    sortBy: 'MonitoringLocationName',
  };

  storeMonitoringStations() {
    const {
      monitoringLocations,
      monitoringGroups,
      setMonitoringGroups,
      showAllMonitoring,
    } = this.context;

    if (!monitoringLocations.data.features) {
      this.setState({ allMonitoringStations: [] });
      return;
    }

    // build up monitoring stations, toggles, and groups
    let allMonitoringStations = [];
    let monitoringLocationToggles = {};
    let monitoringStationGroups: StationGroups = {
      Other: { label: 'Other', groupName: '', stations: [], toggled: true },
    };

    monitoringLocations.data.features.forEach((feature) => {
      const { geometry, properties } = feature;

      const {
        MonitoringLocationIdentifier: locId,
        ProviderName: name,
        OrganizationIdentifier: orgId,
      } = properties;

      const station = {
        properties,
        x: geometry.coordinates[0],
        y: geometry.coordinates[1],
        // create a unique id, so we can check if the monitoring location has
        // already been added to the display (since a monitoring location id
        // isn't universally unique)
        uid: `${locId}/${name}/${orgId}`,
      };

      allMonitoringStations.push(station);

      // build up the monitoringLocationToggles and monitoringStationGroups
      let groupAdded = false;
      switches.forEach((s) => {
        monitoringLocationToggles[s.label] = true;

        for (const group in properties.characteristicGroupResultCount) {
          // if characteristic group exists in switch config object
          if (group === s.groupName) {
            // if switch group (w/ label key) already exists, add the stations to it
            if (monitoringStationGroups[s.label]) {
              monitoringStationGroups[s.label].stations.push(station);
              // else, create the group (w/ label key) and add the station
            } else {
              monitoringStationGroups[s.label] = {
                label: s.label,
                groupName: s.groupName,
                stations: [station],
                toggled: true,
              };
            }
            groupAdded = true;
          }
        }
      });

      // if characteristic group didn't exists in switch config object,
      // add the station to the 'Other' group
      if (!groupAdded) monitoringStationGroups['Other'].stations.push(station);
    });

    this.setState({
      monitoringLocationToggles: monitoringGroups
        ? monitoringGroups
        : monitoringLocationToggles,
      allMonitoringStations,
      displayedMonitoringStations: allMonitoringStations,
      monitoringStationGroups,
      allToggled: showAllMonitoring,
    });

    if (!monitoringGroups) setMonitoringGroups(monitoringLocationToggles);
  }

  drawMap = () => {
    const { Graphic } = this.props.esriModules;

    const {
      monitoringLocationToggles,
      monitoringStationGroups,
      allMonitoringStations,
      allToggled,
    } = this.state;

    const { monitoringStationsLayer } = this.context;

    if (allMonitoringStations.length === 0) return;

    const addedStationUids = [];
    let displayedMonitoringStations = [];

    if (allToggled) {
      displayedMonitoringStations = allMonitoringStations;
    } else {
      // var use intentional for IE support
      for (var key in monitoringStationGroups) {
        const group = monitoringStationGroups[key];
        // if the location is toggled
        if (monitoringLocationToggles[group.label]) {
          group.stations.forEach((station) => {
            // add the station to the display, if it has not already been added
            if (!addedStationUids.includes(station.uid)) {
              addedStationUids.push(station.uid);
              displayedMonitoringStations.push(station);
            }
          });
        }
      }
    }

    plotStations(
      Graphic,
      displayedMonitoringStations,
      '#c500ff',
      monitoringStationsLayer,
    );

    this.setState({ displayedMonitoringStations });
  };

  toggleSwitch = (groupLabel: string) => {
    const { monitoringLocationToggles, allToggled } = this.state;

    const toggleGroups = { ...monitoringLocationToggles };

    if (groupLabel === 'All') {
      if (!allToggled) {
        // toggle everything on
        this.setState({ allToggled: true }, () => {
          for (var key in toggleGroups) {
            toggleGroups[key] = true;
          }
        });
        this.context.setShowAllMonitoring(true);
      } else {
        // toggle everything off
        this.setState({ allToggled: false }, () => {
          for (var key in toggleGroups) {
            toggleGroups[key] = false;
          }
        });
        this.context.setShowAllMonitoring(false);
      }
    }
    // just one of the categories was changed
    else {
      toggleGroups[groupLabel] = !monitoringLocationToggles[groupLabel];

      // if all other switches are toggled on, toggle the 'All' switch on
      const groups = { ...toggleGroups };
      delete groups['All'];

      const allOthersToggled = Object.keys(groups).every((group) => {
        return groups[group];
      });

      this.setState({ allToggled: allOthersToggled });
      this.context.setShowAllMonitoring(allOthersToggled);
    }

    this.context.setMonitoringGroups(toggleGroups);
    this.setState(
      { monitoringLocationToggles: toggleGroups },
      () => this.drawMap(), //
    );
  };

  componentDidMount() {
    this.storeMonitoringStations();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { monitoringLocations } = this.context;

    // re-store monitoring stations if the data changes
    if (monitoringLocations.data !== this.state.prevMonitoringLocationData) {
      this.setState(
        { prevMonitoringLocationData: monitoringLocations.data },
        this.storeMonitoringStations(),
      );
    }

    // return early if displayedMonitoringStations hasn't yet been set
    if (this.state.displayedMonitoringStations.length === 0) return;

    // redraw the map if the number of monitoring stations to display has changed
    // (e.g. a toggle has been clicked)
    if (
      prevState.displayedMonitoringStations.length !==
      this.state.displayedMonitoringStations.length
    ) {
      this.drawMap();
    }
  }

  render() {
    const { monitoringLocations, watershed } = this.context;

    const {
      monitoringLocationToggles,
      monitoringStationGroups,
      allMonitoringStations,
      displayedMonitoringStations,
      sortBy,
      allToggled,
    } = this.state;

    const sortedMonitoringStations = displayedMonitoringStations
      ? displayedMonitoringStations.sort((objA, objB) => {
          // sort resultCount (measurements) in descending order
          if (sortBy === 'resultCount') {
            return objB['properties'][sortBy] - objA['properties'][sortBy];
          }

          if (sortBy === 'MonitoringLocationIdentifier') {
            const idA = objA['properties'][sortBy].split('-')[1];
            const idB = objB['properties'][sortBy].split('-')[1];
            return idA.localeCompare(idB);
          }

          return objA['properties'][sortBy].localeCompare(
            objB['properties'][sortBy],
          );
        })
      : [];

    const totalLocations = allMonitoringStations.length.toLocaleString();
    const displayLocations = sortedMonitoringStations.length.toLocaleString();

    return (
      <Container>
        {monitoringLocations.status === 'fetching' && <LoadingSpinner />}

        {monitoringLocations.status === 'failure' && (
          <StyledErrorBox>
            <p>{monitoringError}</p>
          </StyledErrorBox>
        )}

        {monitoringLocations.status === 'success' && (
          <>
            {allMonitoringStations.length === 0 && (
              <Text>
                There are no Water Monitoring Locations in the {watershed}{' '}
                watershed.
              </Text>
            )}

            {allMonitoringStations.length > 0 && (
              <>
                <Table className="table">
                  <thead>
                    <tr>
                      <th>
                        <Toggle>
                          <Switch
                            checked={allToggled}
                            onChange={(ev) => this.toggleSwitch('All')}
                          />
                          <span>All Monitoring Locations</span>
                        </Toggle>
                      </th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(monitoringStationGroups)
                      .map((group) => {
                        const { label, stations } = group;
                        return (
                          <tr key={label}>
                            <td>
                              <Toggle>
                                <Switch
                                  checked={monitoringLocationToggles[label]}
                                  onChange={(ev) => this.toggleSwitch(label)}
                                />
                                <span>{label}</span>
                              </Toggle>
                            </td>
                            <td>{stations.length.toLocaleString()}</td>
                          </tr>
                        );
                      })
                      .sort((a, b) => {
                        // sort the switches with Other at the end
                        if (a.key === 'Other') return 1;
                        if (b.key === 'Other') return -1;
                        return a.key > b.key ? 1 : -1;
                      })}
                  </tbody>
                </Table>

                {/* 
                  The expand and collapse buttons are disabled for this 
                  accordion to avoid a large number of web service calls.
                  Each accordion item performs a web service call to fill
                  in the data for a table. 
                */}
                <AccordionList
                  expandDisabled={true}
                  title={`Displaying ${displayLocations} of ${totalLocations} Water Monitoring Locations in the ${watershed} watershed.`}
                  onSortChange={(sortBy) =>
                    this.setState({ sortBy: sortBy.value })
                  }
                  sortOptions={[
                    {
                      value: 'MonitoringLocationName',
                      label: 'Monitoring Location Name',
                    },
                    {
                      value: 'OrganizationIdentifier',
                      label: 'Organization ID',
                    },
                    {
                      value: 'MonitoringLocationIdentifier',
                      label: 'Monitoring Site ID',
                    },
                    {
                      value: 'resultCount',
                      label: 'Monitoring Measurements',
                    },
                  ]}
                >
                  {sortedMonitoringStations.map((item, index) => {
                    const { properties: prop } = item;

                    const feature = {
                      geometry: {
                        type: 'point', // autocasts as new Point()
                        longitude: item.x,
                        latitude: item.y,
                      },
                      symbol: {
                        type: 'simple-marker', // autocasts as new SimpleMarkerSymbol()
                        style: 'square',
                      },
                      attributes: prop,
                    };

                    return (
                      <AccordionItem
                        key={index}
                        title={
                          <strong>
                            {prop['MonitoringLocationName'] || 'Unknown'}
                          </strong>
                        }
                        subTitle={
                          <>
                            Organization ID: {prop['OrganizationIdentifier']}
                            <br />
                            Monitoring Site ID:{' '}
                            {prop['MonitoringLocationIdentifier'].split('-')[1]}
                            <br />
                            Monitoring Measurements:{' '}
                            {Number(prop['resultCount']).toLocaleString()}
                          </>
                        }
                        feature={feature}
                        idKey={'MonitoringLocationIdentifier'}
                      >
                        <AccordionContent>
                          <WaterbodyInfo
                            type={'Monitoring Location'}
                            feature={feature}
                          />
                          <ViewOnMapButton feature={feature} />
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </AccordionList>
              </>
            )}
          </>
        )}
      </Container>
    );
  }
}

export default function MonitoringContainer({ ...props }: Props) {
  return (
    <TabErrorBoundary tabName="Monitoring">
      <Monitoring {...props} />
    </TabErrorBoundary>
  );
}
