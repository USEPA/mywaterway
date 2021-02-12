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
import { EsriModulesContext } from 'contexts/EsriModules';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import { plotStations } from 'components/pages/LocationMap/MapFunctions';
import { useWaterbodyOnMap } from 'utils/hooks';
// data
import { characteristicGroupMappings } from 'config/characteristicGroupMappings';
// errors
import { monitoringError } from 'config/errorMessages';

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

function Monitoring() {
  const { Graphic } = React.useContext(EsriModulesContext);

  const services = useServicesContext();

  // draw the waterbody on the map
  useWaterbodyOnMap();

  const {
    monitoringLocations,
    monitoringGroups,
    showAllMonitoring,
    setMonitoringGroups,
    monitoringStationsLayer,
    setShowAllMonitoring,
    watershed,
    visibleLayers,
    setVisibleLayers,
  } = React.useContext(LocationSearchContext);

  const [
    prevMonitoringLocationData,
    setPrevMonitoringLocationData,
  ] = React.useState<MonitoringLocationData>({});

  const [
    monitoringLocationToggles,
    setMonitoringLocationToggles,
  ] = React.useState({});

  const [monitoringStationGroups, setMonitoringStationGroups] = React.useState(
    {},
  );

  const [allMonitoringStations, setAllMonitoringStations] = React.useState([]);

  const [
    displayedMonitoringStations,
    setDisplayedMonitoringStations,
  ] = React.useState([]);

  const [allToggled, setAllToggled] = React.useState(true);

  const [sortBy, setSortBy] = React.useState('MonitoringLocationName');

  const storeMonitoringStations = React.useCallback(() => {
    if (!monitoringLocations.data.features) {
      setAllMonitoringStations([]);
      return;
    }

    // build up monitoring stations, toggles, and groups
    let allMonitoringStations = [];
    let monitoringLocationToggles = {};
    let monitoringStationGroups: StationGroups = {
      Other: { label: 'Other', stations: [], toggled: true },
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
      characteristicGroupMappings.forEach((mapping) => {
        monitoringLocationToggles[mapping.label] = true;

        for (const group in properties.characteristicGroupResultCount) {
          // if characteristic group exists in switch config object
          if (mapping.groupNames.includes(group)) {
            // if switch group (w/ label key) already exists, add the stations to it
            if (monitoringStationGroups[mapping.label]) {
              monitoringStationGroups[mapping.label].stations.push(station);
              // else, create the group (w/ label key) and add the station
            } else {
              monitoringStationGroups[mapping.label] = {
                label: mapping.label,
                stations: [station],
                toggled: true,
              };
            }
            groupAdded = true;
          }
        }
      });

      // if characteristic group didn't exist in switch config object,
      // add the station to the 'Other' group
      if (!groupAdded) monitoringStationGroups['Other'].stations.push(station);
    });

    if (monitoringGroups) {
      setMonitoringLocationToggles(monitoringGroups);
    } else {
      setMonitoringLocationToggles(monitoringLocationToggles);
    }

    setAllMonitoringStations(allMonitoringStations);
    setDisplayedMonitoringStations(allMonitoringStations);
    setMonitoringStationGroups(monitoringStationGroups);
    setAllToggled(showAllMonitoring);

    if (!monitoringGroups) setMonitoringGroups(monitoringLocationToggles);
  }, [
    monitoringGroups,
    monitoringLocations,
    setMonitoringGroups,
    showAllMonitoring,
  ]);

  const drawMap = React.useCallback(() => {
    if (allMonitoringStations.length === 0) return;
    if (services.status === 'fetching') return;
    const addedStationUids = [];
    let tempDisplayedMonitoringStations = [];

    if (allToggled) {
      tempDisplayedMonitoringStations = allMonitoringStations;
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
              tempDisplayedMonitoringStations.push(station);
            }
          });
        }
      }
    }

    plotStations(
      Graphic,
      tempDisplayedMonitoringStations,
      monitoringStationsLayer,
      services,
    );

    if (tempDisplayedMonitoringStations.length === 0) {
      setDisplayedMonitoringStations([]);
      return;
    }

    if (
      displayedMonitoringStations.length ===
      tempDisplayedMonitoringStations.length
    ) {
      return;
    }

    setDisplayedMonitoringStations(tempDisplayedMonitoringStations);
  }, [
    displayedMonitoringStations,
    allMonitoringStations,
    allToggled,
    Graphic,
    monitoringLocationToggles,
    monitoringStationGroups,
    monitoringStationsLayer,
    services,
  ]);

  const toggleSwitch = React.useCallback(
    (groupLabel: string) => {
      const toggleGroups = monitoringLocationToggles;

      if (groupLabel === 'All') {
        if (!allToggled) {
          // toggle everything on
          setAllToggled(true);
          for (var toggle in toggleGroups) {
            toggleGroups[toggle] = true;
          }

          setShowAllMonitoring(true);
          monitoringStationsLayer.visible = true;
        } else {
          // toggle everything off
          setAllToggled(false);
          for (var key in toggleGroups) {
            toggleGroups[key] = false;
          }

          setShowAllMonitoring(false);
          monitoringStationsLayer.visible = false;
        }
      }
      // just one of the categories was changed
      else {
        monitoringStationsLayer.visible = true;
        toggleGroups[groupLabel] = !monitoringLocationToggles[groupLabel];

        // if all other switches are toggled on, toggle the 'All' switch on
        const groups = toggleGroups;
        delete groups['All'];

        const allOthersToggled = Object.keys(groups).every((group) => {
          return groups[group];
        });

        setAllToggled(allOthersToggled);
        setShowAllMonitoring(allOthersToggled);
      }

      setMonitoringGroups(toggleGroups);
      setMonitoringLocationToggles(toggleGroups);

      drawMap();
    },
    [
      monitoringStationsLayer,
      allToggled,
      drawMap,
      monitoringLocationToggles,
      setMonitoringGroups,
      setShowAllMonitoring,
    ],
  );

  // emulate componentdidmount
  const [componentMounted, setComponentMounted] = React.useState(false);
  React.useEffect(() => {
    if (componentMounted) return;
    storeMonitoringStations();
    setComponentMounted(true);
  }, [componentMounted, storeMonitoringStations]);

  // emulate componentdidupdate
  const mounted = React.useRef();
  React.useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
    } else {
      // re-store monitoring stations if the data changes
      if (monitoringLocations.data !== prevMonitoringLocationData) {
        setPrevMonitoringLocationData(monitoringLocations.data);
        storeMonitoringStations();
      }

      // return early if displayedMonitoringStations hasn't yet been set
      if (displayedMonitoringStations.length === 0) return;

      drawMap();
    }
  }, [
    monitoringLocations,
    prevMonitoringLocationData,
    displayedMonitoringStations,
    drawMap,
    storeMonitoringStations,
  ]);

  // clear the visible layers if the monitoring locations service failed
  React.useEffect(() => {
    if (monitoringLocations.status !== 'failure') return;

    if (Object.keys(visibleLayers).length > 0) setVisibleLayers({});
  }, [monitoringLocations, visibleLayers, setVisibleLayers]);

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
                          onChange={(ev) => toggleSwitch('All')}
                          ariaLabel="Toggle all monitoring locations"
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

                      // remove duplicates caused by a single monitoring station having multiple overlapping groupNames
                      // like 'Inorganics, Major, Metals' and 'Inorganics, Minor, Metals'
                      const uniqueStations = [...new Set(stations)];

                      return (
                        <tr key={label}>
                          <td>
                            <Toggle>
                              <Switch
                                checked={monitoringLocationToggles[label]}
                                onChange={(ev) => toggleSwitch(label)}
                                ariaLabel={`Toggle ${label}`}
                              />
                              <span>{label}</span>
                            </Toggle>
                          </td>
                          <td>{uniqueStations.length.toLocaleString()}</td>
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
                onSortChange={(sortBy) => setSortBy(sortBy.value)}
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
                          services={services}
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

export default function MonitoringContainer({ ...props }: Props) {
  return (
    <TabErrorBoundary tabName="Monitoring">
      <Monitoring {...props} />
    </TabErrorBoundary>
  );
}
