// @flow

import React from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import styled from 'styled-components';
// components
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import TabErrorBoundary from 'components/shared/ErrorBoundary/TabErrorBoundary';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { ContentTabs } from 'components/shared/ContentTabs';
import { AccordionList, AccordionItem } from 'components/shared/Accordion';
import AssessmentSummary from 'components/shared/AssessmentSummary';
import WaterbodyList from 'components/shared/WaterbodyList';
import { StyledErrorBox, StyledNoteBox } from 'components/shared/MessageBoxes';
import ShowLessMore from 'components/shared/ShowLessMore';
import Switch from 'components/shared/Switch';
// contexts
import { EsriModulesContext } from 'contexts/EsriModules';
import { CommunityTabsContext } from 'contexts/CommunityTabs';
import { LocationSearchContext } from 'contexts/locationSearch';
// utilities
import { useWaterbodyFeatures, useWaterbodyOnMap } from 'utils/hooks';
// errors
import { countyError, withdrawerError } from 'config/errorMessages';
import { colors } from 'styles';

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

const NoteBoxContainer = styled(StyledNoteBox)`
  margin-bottom: 0.625em;
`;

const NewTabDisclaimer = styled.div`
  display: inline-block;
`;

// sort alphabetically by name
function comparePwsName(objA, objB) {
  return objA['pws_name'].localeCompare(objB['pws_name']);
}

// sort by population descending
function sortByPopulation(objA, objB) {
  return objB.population_served_count - objA.population_served_count;
}

// correct capitalization and spacing inconsistencies with ATTAINS Drinking Water service
function fixCapitalization(type) {
  return type
    .replace('Groundwater', 'Ground Water')
    .replace('Ground water', 'Ground Water')
    .replace('Surface water', 'Surface Water');
}

// group by drinking water source and alphabetize the groups
function groupProvidersBySource(systems) {
  const groundWaterSystems = systems
    .filter((system) => system.gw_sw === 'Groundwater')
    .sort(comparePwsName);

  const surfaceWaterSystems = systems
    .filter((system) => system.gw_sw === 'Surface water')
    .sort(comparePwsName);

  // GU systems, or "Ground water under the influence of surface water"
  const GUSystems = systems
    .filter(
      (system) =>
        system.gw_sw !== 'Surface water' && system.gw_sw !== 'Groundwater',
    )
    .sort(comparePwsName);

  return groundWaterSystems.concat(surfaceWaterSystems, GUSystems);
}

function groupWithdrawersBySource(systems) {
  const groundWaterSystems = systems
    .filter((system) => system.water_type_calc === 'Ground water')
    .sort(comparePwsName);

  const surfaceWaterSystems = systems
    .filter((system) => system.water_type_calc === 'Surface water')
    .sort(comparePwsName);

  // GU systems, or "Ground water under the influence of surface water"
  const GUSystems = systems
    .filter(
      (system) =>
        system.water_type_calc !== 'Surface water' &&
        system.water_type_calc !== 'Ground water',
    )
    .sort(comparePwsName);

  return groundWaterSystems.concat(surfaceWaterSystems, GUSystems);
}

// uses passed item's fields and, returns JSX for rendering an AccordionItem
function createAccordionItem(item: Object, isWithdrawer: boolean) {
  const url =
    `https://ofmpub.epa.gov/apex/sfdw/f?p=SDWIS_FED_REPORTS_PUBLIC:PWS_SEARCH:::::PWSID:` +
    `${item.pwsid}`;
  return (
    <AccordionItem
      key={
        item.water_type_calc
          ? item.pwsid + item.water_type_calc + item.water_type_code
          : item.pwsid
      }
      title={<strong>{item.pws_name || 'Unknown'}</strong>}
      subTitle={
        <>
          Public Water System Population Served:{' '}
          {Number(item['population_served_count']).toLocaleString()}
          <br />
          {isWithdrawer
            ? `Drinking Water Facility Source: ${fixCapitalization(
                item.water_type_calc,
              )}`
            : `Drinking Water System Source: ${fixCapitalization(item.gw_sw)}`}
        </>
      }
    >
      <table className="table">
        <tbody>
          <tr>
            <td>
              <em>Public Water System ID (PWSID):</em>
            </td>
            <td>{item.pwsid}</td>
          </tr>
          <tr>
            <td>
              <em>Public Water System Status (PWS Activity):</em>
            </td>
            <td>{item.pws_activity}</td>
          </tr>
          <tr>
            <td>
              <em>Public Water System Population Served:</em>
            </td>
            <td>
              {item.population_served_count &&
                item.population_served_count.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td>
              <em>Drinking Water System Type:</em>
            </td>
            <td>{item.pws_type}</td>
          </tr>
          <tr>
            <td>
              <em>Drinking Water Health Based Violations:</em>
            </td>
            <td>{item.violations === 'Y' ? 'Yes' : 'No'}</td>
          </tr>
          <tr>
            {isWithdrawer ? (
              <>
                <td>
                  <em>Drinking Water Facility Source:</em>
                </td>
                <td>{fixCapitalization(item.water_type_calc)}</td>
              </>
            ) : (
              <>
                <td>
                  <em>Drinking Water System Source:</em>
                </td>
                <td>{fixCapitalization(item.gw_sw)}</td>
              </>
            )}
          </tr>
          <tr>
            <td>
              <em>Drinking Water System Information:</em>
            </td>
            <td>
              <a href={url} target="_blank" rel="noopener noreferrer">
                More Details
              </a>
              &nbsp;&nbsp;
              <NewTabDisclaimer>(opens new browser tab)</NewTabDisclaimer>
            </td>
          </tr>
        </tbody>
      </table>
    </AccordionItem>
  );
}

// --- styled components ---
const Container = styled.div`
  padding: 1em;
`;

const Text = styled.p`
  text-align: center;
`;

// --- components ---
function DrinkingWater() {
  const { Graphic, Polygon, SimpleFillSymbol } = React.useContext(
    EsriModulesContext,
  );

  const { infoToggleChecked } = React.useContext(CommunityTabsContext);

  const {
    waterbodyLayer,
    providersLayer,
    boundariesLayer,
    countyBoundaries,
    drinkingWater,
    watershed,
    mapView,
    atHucBoundaries,
    setVisibleLayers,
    drinkingWaterTabIndex,
    setDrinkingWaterTabIndex,
    currentExtent,
  } = React.useContext(LocationSearchContext);

  // set the waterbody features
  const waterbodies = useWaterbodyFeatures();

  // draw the waterbody (drinking water sources) on the map
  useWaterbodyOnMap('drinkingwater_use');

  // draw the drinking water providers (county) on the map
  const [countyGraphic, setCountyGraphic] = React.useState(null);
  React.useEffect(() => {
    if (
      !countyBoundaries ||
      !countyBoundaries.features ||
      countyBoundaries.features.length === 0
    ) {
      setCountyGraphic(null); // set to null if new search results in no boundaries
      return;
    }

    const graphic = new Graphic({
      attributes: { name: 'providers' },
      geometry: new Polygon({
        spatialReference: countyBoundaries.spatialReference,
        rings: countyBoundaries.features[0].geometry.rings,
      }),
      symbol: new SimpleFillSymbol({
        color: [0, 0, 0, 0.15],
        outline: {
          color: colors.yellow,
          width: 3,
          style: 'solid',
        },
      }),
    });

    setCountyGraphic(graphic);
    providersLayer.graphics.removeAll();
    providersLayer.graphics.add(graphic);
  }, [providersLayer, countyBoundaries, Graphic, Polygon, SimpleFillSymbol]);

  // toggle map layers' visibility when a tab changes
  React.useEffect(() => {
    if (!boundariesLayer || !waterbodyLayer || !providersLayer) return;

    if (drinkingWaterTabIndex === 0) {
      setVisibleLayers({
        boundariesLayer: false,
        waterbodyLayer: false,
        providersLayer: true,
      });
    }

    if (drinkingWaterTabIndex === 1) {
      setVisibleLayers({
        boundariesLayer: true,
        waterbodyLayer: false,
        providersLayer: false,
      });
    }

    if (drinkingWaterTabIndex === 2) {
      setVisibleLayers({
        boundariesLayer: true,
        waterbodyLayer: true,
        providersLayer: false,
      });
    }
  }, [
    drinkingWaterTabIndex,
    boundariesLayer,
    waterbodyLayer,
    providersLayer,
    setVisibleLayers,
  ]);

  // set map zoom when switching to or from providers subtab
  // (as zoom is different for that subtab)
  const [previousTabIndex, setPreviousTabIndex] = React.useState(null);
  const [mapZoom, setMapZoom] = React.useState(null);
  React.useEffect(() => {
    if (!mapView || !countyGraphic || !atHucBoundaries) {
      setMapZoom(null); // reset the mapZoom if there is no countyGraphic
      return;
    }

    const providersTabIndex = 0;

    // if currently on the providers subtab, save the zoom level prior to
    // zooming, so it can be reset when switching away from the subtab
    if (
      drinkingWaterTabIndex === providersTabIndex &&
      mapZoom !== currentExtent
    ) {
      setMapZoom(currentExtent);
      mapView.goTo(countyGraphic);
      return;
    }

    // reset the zoom level when switching away from the providers subtab
    if (previousTabIndex === providersTabIndex && mapZoom) {
      setMapZoom(null);
      mapView.goTo(currentExtent);
    }
  }, [
    drinkingWaterTabIndex,
    countyGraphic,
    mapView,
    atHucBoundaries,
    previousTabIndex,
    mapZoom,
    currentExtent,
  ]);

  // create mapZoomRef, and keep it in sync with mapZoom state,
  // so it can be used in resetMapZoom() cleanup function below
  const mapZoomRef = React.useRef();
  React.useEffect(() => {
    mapZoomRef.current = mapZoom;
  }, [mapZoom]);

  // conditionally reset the zoom level when this component unmounts
  // (i.e. changing to another Community tab, like Swimming, Overview, etc.)
  React.useEffect(() => {
    if (!mapView || !mapZoomRef) return;

    return function resetMapZoom() {
      if (mapZoomRef.current) mapView.goTo(mapZoomRef.current);
    };
  }, [mapView, mapZoomRef]);

  // toggles for surface/ground water withdrawers
  const [groundWaterDisplayed, setGroundWaterDisplayed] = React.useState(true);
  const [surfaceWaterDisplayed, setSurfaceWaterDisplayed] = React.useState(
    true,
  );
  const [bothDisplayed, setBothDisplayed] = React.useState(true);

  // sort drinking water data into providers and withdrawers via presence of 'huc12' property
  const providers = [];
  const displayedWithdrawers = [];
  let surfaceWaterCount = 0; // total surface water withdrawers
  let groundWaterCount = 0; // total groundwater withdrawers
  let totalWithdrawersCount = 0; // total withdrawers
  let bothCount = 0;
  if (drinkingWater.data) {
    // handle providers separately
    const allProviders = drinkingWater.data.filter(
      (system) => !system.hasOwnProperty('huc12'),
    );
    allProviders.forEach((provider) => providers.push(provider));

    // find all withdrawers
    const allWithdrawers = drinkingWater.data.filter((system) =>
      system.hasOwnProperty('huc12'),
    );

    // find duplicate withdrawers based on pwsid
    const lookup = allWithdrawers.reduce((a, e) => {
      a[e.pwsid] = ++a[e.pwsid] || 0;
      return a;
    }, {});

    const duplicates = allWithdrawers.filter((e) => lookup[e.pwsid]);

    // get array of duplicate PWSIDs
    const duplicatePWSIDs = [];
    duplicates.forEach((dup) => {
      if (!duplicatePWSIDs.includes(dup.pwsid)) {
        duplicatePWSIDs.push(dup.pwsid);
      }
    });

    // count each duplicate once
    duplicatePWSIDs.forEach((duplicate) => bothCount++);

    // track which system duplicates have been handled
    const alreadyDuplicatedPWSIDs = [];

    allWithdrawers.forEach((item) => {
      const checkForDuplicates = displayedWithdrawers.filter(
        (withdrawer) => withdrawer.pwsid === item.pwsid,
      );

      // check if system is has been duplicated already
      if (alreadyDuplicatedPWSIDs.includes(item.pwsid)) {
        // we've already handled this system and merged it, pass
      }

      // if system is a duplicate merge them together
      else if (duplicatePWSIDs.includes(item.pwsid)) {
        totalWithdrawersCount++;
        const index = duplicatePWSIDs.indexOf(item.pwsid);
        duplicatePWSIDs.splice(index, 1);
        alreadyDuplicatedPWSIDs.push(item.pwsid);

        if (checkForDuplicates.length === 0) {
          // deepclone item to prevent changing the underlying service data
          const mergedItem = Object.assign({}, item);
          mergedItem.water_type_calc = 'Ground Water & Surface Water';
          if (bothDisplayed) {
            displayedWithdrawers.push(mergedItem);
          }
        }
      }

      // surface water withdrawer
      else if (item.water_type_calc.toLowerCase() === 'surface water') {
        totalWithdrawersCount++;
        surfaceWaterCount++;
        if (surfaceWaterDisplayed) displayedWithdrawers.push(item);
      }
      // ground water withdrawer
      else if (item.water_type_calc.toLowerCase() === 'ground water') {
        totalWithdrawersCount++;
        groundWaterCount++;
        if (groundWaterDisplayed) displayedWithdrawers.push(item);
      }
    });
  }

  let county = '';
  if (
    countyBoundaries &&
    countyBoundaries.features &&
    countyBoundaries.features.length > 0
  ) {
    county = countyBoundaries.features[0].attributes.NAME;
  }

  const [providersSortBy, setProvidersSortBy] = React.useState('population');
  const [withdrawersSortBy, setWithdrawersSortBy] = React.useState(
    'population',
  );

  // on new search, reset the sortBy option. fixes issue where useState sort order did not match Accordion sort
  React.useEffect(() => {
    setProvidersSortBy('population');
    setWithdrawersSortBy('population');
  }, [atHucBoundaries]);

  const sortWaterSystems = (systems, sortBy, isWithdrawers) => {
    if (!systems) return [];
    switch (sortBy) {
      // sort systems by descending population count
      case 'population':
        return systems.sort(sortByPopulation);

      // sort systems by alphabetical pws_name
      case 'alphabetical':
        return systems.sort(comparePwsName);

      // group systems by drinking water source
      case 'source':
        if (isWithdrawers) {
          return groupWithdrawersBySource(systems);
        } else {
          return groupProvidersBySource(systems);
        }

      default:
        return [];
    }
  };

  // options for the selects on the Providers and Withdrawers tabs
  const withdrawerSorts = [
    {
      value: 'population',
      label: 'Public Water System Population Served',
    },
    {
      value: 'source',
      label: 'Drinking Water Facility Source',
    },
    {
      value: 'alphabetical',
      label: 'Name',
    },
  ];

  const providerSorts = [
    {
      value: 'population',
      label: 'Public Water System Population Served',
    },
    {
      value: 'source',
      label: 'Drinking Water System Source',
    },
    {
      value: 'alphabetical',
      label: 'Name',
    },
  ];

  return (
    <Container>
      <ContentTabs>
        <Tabs
          onChange={(index) => {
            setPreviousTabIndex(drinkingWaterTabIndex);
            setDrinkingWaterTabIndex(index);
          }}
          defaultIndex={drinkingWaterTabIndex}
        >
          <TabList>
            <Tab>Who provides the drinking water here?</Tab>
            <Tab>Who withdraws water for drinking here?</Tab>
            <Tab>Which waters have been assessed for drinking water use?</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              {infoToggleChecked && (
                <>
                  <p>
                    <strong>
                      The yellow outline on the map shows the county or
                      municipality served by the{' '}
                      <GlossaryTerm term="Drinking Water System Type">
                        public water systems
                      </GlossaryTerm>{' '}
                      listed below.
                    </strong>
                  </p>
                  <p>
                    <em>Links below open in a new browser tab.</em>
                  </p>
                  <p>
                    Information about public water systems can be found online
                    at{' '}
                    <a
                      href="https://ofmpub.epa.gov/apex/sfdw/f?p=108:200::::::"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      EPA’s Safe Drinking Water Information System (SDWIS)
                      Federal Reporting Services
                    </a>
                    .
                  </p>
                  <p>
                    <GlossaryTerm term="Drinking Water System Type">
                      Community water systems
                    </GlossaryTerm>{' '}
                    provide an annual Water Quality Report, also known as a{' '}
                    <a
                      href="https://www.epa.gov/ccr/ccr-information-consumers"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Consumer Confidence Report,
                    </a>{' '}
                    to their customers with information about their local
                    drinking water quality.
                  </p>

                  <p>
                    About 10 percent of people in the United States rely on
                    water from private wells. Private wells are not regulated
                    under the Safe Drinking Water Act (SDWA). People who use
                    private wells need to take precautions to ensure their
                    drinking water is safe. Learn more about{' '}
                    <a
                      href="https://www.epa.gov/privatewells"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      private wells
                    </a>
                    .
                  </p>
                  <NoteBoxContainer>
                    <p>
                      <strong>Mapping Note: </strong>The map does not display
                      the actual locations of public water system facility
                      intakes. Sources of drinking water are often located
                      outside the mapped area shown, and may include a
                      combination of different sources.
                    </p>
                  </NoteBoxContainer>
                </>
              )}

              {drinkingWater.status === 'fetching' && <LoadingSpinner />}

              {drinkingWater.status === 'failure' && (
                <StyledErrorBox>
                  <p>{countyError}</p>
                </StyledErrorBox>
              )}

              {drinkingWater.status === 'success' && (
                <>
                  {drinkingWater.data.length === 0 && (
                    <Text>
                      There is no drinking water data for the {watershed}{' '}
                      watershed.
                    </Text>
                  )}

                  {drinkingWater.data.length > 0 && (
                    <>
                      {providers.length === 0 && (
                        <Text>
                          There are no public drinking water systems serving{' '}
                          {county} county/municipality.
                        </Text>
                      )}

                      {providers.length > 0 && (
                        <AccordionList
                          title={`Public water systems serving ${county} County.`}
                          onSortChange={(sortBy) =>
                            setProvidersSortBy(sortBy.value)
                          }
                          sortOptions={providerSorts}
                        >
                          {sortWaterSystems(
                            providers,
                            providersSortBy,
                            false,
                          ).map((item) => createAccordionItem(item))}
                        </AccordionList>
                      )}
                    </>
                  )}
                </>
              )}
            </TabPanel>

            <TabPanel>
              {infoToggleChecked && (
                <>
                  <p>
                    <strong>
                      The{' '}
                      <GlossaryTerm term="Drinking Water System Type">
                        public water systems
                      </GlossaryTerm>{' '}
                      listed below draw source water from the watershed outlined
                      on the map. This is the immediate drainage area, not the
                      entire watershed. Public water systems may receive
                      drinking water diverted from watershed areas and
                      groundwater sources located outside the area that is
                      outlined on the map.
                    </strong>
                  </p>
                  <p>
                    <GlossaryTerm term="Surface Water">
                      Surface water
                    </GlossaryTerm>{' '}
                    (streams, rivers, and lakes) or{' '}
                    <GlossaryTerm term="Groundwater">ground water</GlossaryTerm>{' '}
                    (aquifers) can serve as sources of drinking water, referred
                    to as source water.
                  </p>
                  <p>
                    Public water systems evaluate and, as necessary, treat water
                    used for public drinking water supplies. Protecting source
                    water from contamination protects public health and can
                    reduce treatment costs. Visit EPA’s website for more
                    information on{' '}
                    <a
                      href=" https://www.epa.gov/sourcewaterprotection/basic-information-about-source-water-protection"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      protecting source water
                    </a>{' '}
                    (opens new browser tab).
                  </p>
                  <NoteBoxContainer>
                    <p>
                      <strong>Mapping Note:</strong> The map does not display
                      the actual locations of public water system facility
                      intakes.
                    </p>
                  </NoteBoxContainer>
                </>
              )}

              {drinkingWater.status === 'fetching' && <LoadingSpinner />}

              {drinkingWater.status === 'failure' && (
                <StyledErrorBox>
                  <p>{withdrawerError}</p>
                </StyledErrorBox>
              )}

              {drinkingWater.status === 'success' && (
                <>
                  {drinkingWater.data.length === 0 && (
                    <Text>
                      There is no drinking water data for the {watershed}{' '}
                      watershed.
                    </Text>
                  )}

                  {drinkingWater.data.length > 0 && (
                    <>
                      {totalWithdrawersCount === 0 && (
                        <Text>
                          There are no public water systems drawing water from
                          the {watershed} watershed.
                        </Text>
                      )}

                      {totalWithdrawersCount > 0 && (
                        <>
                          <Table className="table">
                            <thead>
                              <tr>
                                <th>
                                  <span>Drinking Water Facility Source</span>
                                </th>
                                <th>Count</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>
                                  <Toggle>
                                    <Switch
                                      disabled={!surfaceWaterCount}
                                      checked={
                                        surfaceWaterDisplayed &&
                                        surfaceWaterCount > 0
                                      }
                                      onChange={(ev) =>
                                        setSurfaceWaterDisplayed(
                                          !surfaceWaterDisplayed,
                                        )
                                      }
                                      ariaLabel="Surface Water"
                                    />
                                    <span>Surface Water</span>
                                  </Toggle>
                                </td>
                                <td>{surfaceWaterCount}</td>
                              </tr>
                              <tr>
                                <td>
                                  <Toggle>
                                    <Switch
                                      disabled={!groundWaterCount}
                                      checked={
                                        groundWaterDisplayed &&
                                        groundWaterCount > 0
                                      }
                                      onChange={(ev) =>
                                        setGroundWaterDisplayed(
                                          !groundWaterDisplayed,
                                        )
                                      }
                                      ariaLabel="Ground Water"
                                    />
                                    <span>Ground Water</span>
                                  </Toggle>
                                </td>
                                <td>{groundWaterCount}</td>
                              </tr>
                              {bothCount > 0 && (
                                <tr>
                                  <td>
                                    <Toggle>
                                      <Switch
                                        disabled={!bothCount}
                                        checked={bothDisplayed && bothCount > 0}
                                        onChange={(ev) =>
                                          setBothDisplayed(!bothDisplayed)
                                        }
                                        ariaLabel="Ground Water and Surface Water"
                                      />
                                      <span>
                                        Ground Water &amp; Surface Water
                                      </span>
                                    </Toggle>
                                  </td>
                                  <td>{bothCount}</td>
                                </tr>
                              )}
                            </tbody>
                          </Table>

                          <AccordionList
                            title={`Below are ${displayedWithdrawers.length} of ${totalWithdrawersCount} Public water systems withdrawing water from the ${watershed} watershed.`}
                            onSortChange={(sortBy) =>
                              setWithdrawersSortBy(sortBy.value)
                            }
                            sortOptions={withdrawerSorts}
                          >
                            {sortWaterSystems(
                              displayedWithdrawers,
                              withdrawersSortBy,
                              true,
                            ).map((item) => createAccordionItem(item, true))}
                          </AccordionList>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </TabPanel>

            <TabPanel>
              {infoToggleChecked && (
                <p>
                  <GlossaryTerm term="Surface Water">
                    Surface water
                  </GlossaryTerm>{' '}
                  (streams, rivers, and lakes) or{' '}
                  <GlossaryTerm term="Groundwater">ground water</GlossaryTerm>{' '}
                  (aquifers) can serve as sources of drinking water, referred to
                  as source water. EPA, states, and tribes may monitor and
                  conduct an{' '}
                  <GlossaryTerm term="Assessed Waters">assessment</GlossaryTerm>{' '}
                  of the surface water quality to help ensure the safety of the
                  drinking water sources.
                  <ShowLessMore
                    text={
                      <>
                        {' '}
                        The map shows the assessment status of the surface
                        source water, not the quality of the treated drinking
                        water. Public water systems also evaluate the source
                        water quality and treat the source water that is used
                        for public drinking water to be in compliance with the
                        Safe Drinking Water Act.
                      </>
                    }
                  />
                </p>
              )}
              <>
                <AssessmentSummary
                  waterbodies={waterbodies}
                  fieldName="drinkingwater_use"
                  usageName="drinking water use"
                />
                <WaterbodyList
                  waterbodies={waterbodies}
                  fieldName="drinkingwater_use"
                  usageName="Drinking Water Use"
                  title={`Waterbodies assessed as potential future sources of drinking water in the ${watershed} watershed.`}
                />
              </>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </ContentTabs>
    </Container>
  );
}

export default function DrinkingWaterContainer({ ...props }: Props) {
  return (
    <TabErrorBoundary tabName="Drinking Water">
      <DrinkingWater {...props} />
    </TabErrorBoundary>
  );
}
