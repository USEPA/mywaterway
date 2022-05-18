// @flow

import React, { useContext, useEffect, useRef, useState } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import { css } from 'styled-components/macro';
import Graphic from '@arcgis/core/Graphic';
import Polygon from '@arcgis/core/geometry/Polygon';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
// components
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import TabErrorBoundary from 'components/shared/ErrorBoundary.TabErrorBoundary';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { AccordionList, AccordionItem } from 'components/shared/Accordion';
import AssessmentSummary from 'components/shared/AssessmentSummary';
import WaterbodyList from 'components/shared/WaterbodyList';
import { errorBoxStyles, noteBoxStyles } from 'components/shared/MessageBoxes';
import ShowLessMore from 'components/shared/ShowLessMore';
import Switch from 'components/shared/Switch';
import { tabsStyles } from 'components/shared/ContentTabs';
// contexts
import { CommunityTabsContext } from 'contexts/CommunityTabs';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import { useWaterbodyFeatures, useWaterbodyOnMap } from 'utils/hooks';
import { summarizeAssessments } from 'utils/utils';
// errors
import { countyError, withdrawerError } from 'config/errorMessages';
// styles
import { colors, tableStyles, toggleTableStyles } from 'styles/index.js';

const containerStyles = css`
  @media (min-width: 960px) {
    padding: 1em;
  }
`;

const centeredTextStyles = css`
  text-align: center;
`;

const toggleStyles = css`
  display: flex;
  align-items: center;

  span {
    margin-left: 0.5rem;
  }
`;

const modifiedNoteBoxStyles = css`
  ${noteBoxStyles};
  margin-bottom: 1em;
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles};
  margin-bottom: 1em;
  text-align: center;
`;

const modifiedToggleTableStyles = css`
  ${toggleTableStyles};
  tfoot th {
    background-color: #f0f6f9;
  }
`;

const disclaimerStyles = css`
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
function createAccordionItem(
  services: Object,
  item: Object,
  isWithdrawer: boolean,
) {
  const url =
    services.data.sfdw +
    'f?p=SDWIS_FED_REPORTS_PUBLIC:PWS_SEARCH:::::PWSID:' +
    item.pwsid;
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
          Drinking Water {isWithdrawer ? 'Facility' : 'System'} Source:{' '}
          {fixCapitalization(isWithdrawer ? item.water_type_calc : item.gw_sw)}
        </>
      }
    >
      <table css={tableStyles} className="table">
        <tbody>
          <tr>
            <td>
              <em>Public Water System ID (PWSID):</em>
            </td>
            <td>{item.pwsid}</td>
          </tr>
          {item.tribal_name && (
            <tr>
              <td>
                <em>Tribal Name:</em>
              </td>
              <td>{item.tribal_name}</td>
            </tr>
          )}
          {item.tribal_code && (
            <tr>
              <td>
                <em>Tribal ID:</em>
              </td>
              <td>{item.tribal_code}</td>
            </tr>
          )}
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
            <td>
              <em>
                Drinking Water {isWithdrawer ? 'Facility' : 'System'} Source:
              </em>
            </td>
            <td>
              {fixCapitalization(
                isWithdrawer ? item.water_type_calc : item.gw_sw,
              )}
            </td>
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
              <small css={disclaimerStyles}>(opens new browser tab)</small>
            </td>
          </tr>
        </tbody>
      </table>
    </AccordionItem>
  );
}

function DrinkingWater() {
  const services = useServicesContext();
  const { infoToggleChecked } = useContext(CommunityTabsContext);

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
  } = useContext(LocationSearchContext);

  // set the waterbody features
  const waterbodies = useWaterbodyFeatures();

  // draw the waterbody (drinking water sources) on the map
  useWaterbodyOnMap('drinkingwater_use');

  const summary = summarizeAssessments(waterbodies, 'drinkingwater_use');

  // draw the drinking water providers (county) on the map
  const [countyGraphic, setCountyGraphic] = useState(null);
  useEffect(() => {
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
  }, [providersLayer, countyBoundaries]);

  // toggle map layers' visibility when a tab changes
  useEffect(() => {
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
  const [previousTabIndex, setPreviousTabIndex] = useState(null);
  const [mapZoom, setMapZoom] = useState(null);
  useEffect(() => {
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
  const mapZoomRef = useRef();
  useEffect(() => {
    mapZoomRef.current = mapZoom;
  }, [mapZoom]);

  // conditionally reset the zoom level when this component unmounts
  // (i.e. changing to another Community tab, like Swimming, Overview, etc.)
  useEffect(() => {
    if (!mapView || !mapZoomRef) return;

    return function resetMapZoom() {
      if (mapZoomRef.current) mapView.goTo(mapZoomRef.current);
    };
  }, [mapView, mapZoomRef]);

  // toggles for surface/ground water withdrawers
  const [groundWaterDisplayed, setGroundWaterDisplayed] = useState(true);
  const [surfaceWaterDisplayed, setSurfaceWaterDisplayed] = useState(true);
  const [bothDisplayed, setBothDisplayed] = useState(true);
  const [tribalProvidersOnly, setTribalProvidersOnly] = useState(false);
  const [tribalWithdrawersOnly, setTribalWithdrawersOnly] = useState(false);

  // sort drinking water data into providers and withdrawers via presence of 'huc12' property
  let providers = [];
  let displayedWithdrawers = [];
  let surfaceWaterCount = 0; // total surface water withdrawers
  let groundWaterCount = 0; // total groundwater withdrawers
  let tribalProviderCount = 0;
  let tribalWithdrawerCount = 0;
  let totalWithdrawersCount = 0; // total withdrawers
  let bothCount = 0;
  if (drinkingWater.data) {
    // handle providers separately
    const allProviders = drinkingWater.data.filter((system) => !system.huc12);
    allProviders.forEach((provider) => {
      if (provider.tribal_name) tribalProviderCount++;
      providers.push(provider);
    });
    if (tribalProvidersOnly) {
      providers = providers.filter((item) => item.tribal_name != null);
    }

    // find all withdrawers
    const allWithdrawers = drinkingWater.data.filter((system) => system.huc12);

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
        if (item.tribal_name) tribalWithdrawerCount++;
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
      else if (item.water_type_calc?.toLowerCase() === 'surface water') {
        totalWithdrawersCount++;
        surfaceWaterCount++;
        if (item.tribal_name) tribalWithdrawerCount++;
        if (surfaceWaterDisplayed) displayedWithdrawers.push(item);
      }
      // ground water withdrawer
      else if (item.water_type_calc?.toLowerCase() === 'ground water') {
        totalWithdrawersCount++;
        groundWaterCount++;
        if (item.tribal_name) tribalWithdrawerCount++;
        if (groundWaterDisplayed) displayedWithdrawers.push(item);
      }
    });
    if (tribalWithdrawersOnly) {
      displayedWithdrawers = displayedWithdrawers.filter(
        (item) => item.tribal_name != null,
      );
    }
  }

  let county = '';
  if (
    countyBoundaries &&
    countyBoundaries.features &&
    countyBoundaries.features.length > 0
  ) {
    county = countyBoundaries.features[0].attributes.NAME;
  }

  const [providersSortBy, setProvidersSortBy] = useState('population');
  const [withdrawersSortBy, setWithdrawersSortBy] = useState('population');

  // on new search, reset the sortBy option. fixes issue where useState sort order did not match Accordion sort
  useEffect(() => {
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
    <div css={containerStyles}>
      <div css={tabsStyles}>
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
                      href={`${services.data.sfdw}f?p=108:200::::::`}
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

                  <div css={modifiedNoteBoxStyles}>
                    <p>
                      <strong>Mapping Note: </strong>The map does not display
                      the actual locations of public water system facility
                      intakes. Sources of drinking water are often located
                      outside the mapped area shown, and may include a
                      combination of different sources.
                    </p>
                  </div>
                </>
              )}

              {drinkingWater.status === 'fetching' && <LoadingSpinner />}

              {drinkingWater.status === 'failure' && (
                <div css={modifiedErrorBoxStyles}>
                  <p>{countyError}</p>
                </div>
              )}

              {drinkingWater.status === 'success' && (
                <>
                  {drinkingWater.data.length === 0 && (
                    <p css={centeredTextStyles}>
                      There is no drinking water data for the {watershed}{' '}
                      watershed.
                    </p>
                  )}

                  {drinkingWater.data.length > 0 && (
                    <>
                      {providers.length === 0 && (
                        <p css={centeredTextStyles}>
                          There are no public drinking water systems serving{' '}
                          {county} county/municipality.
                        </p>
                      )}

                      {providers.length > 0 && (
                        <>
                          <table
                            css={modifiedToggleTableStyles}
                            className="table"
                          >
                            <thead>
                              <tr>
                                <th>
                                  <span>Tribal Status</span>
                                </th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>
                                  <div css={toggleStyles}>
                                    <Switch
                                      disabled={!tribalProviderCount}
                                      checked={tribalProvidersOnly}
                                      onChange={(_ev) =>
                                        setTribalProvidersOnly(
                                          !tribalProvidersOnly,
                                        )
                                      }
                                      ariaLabel="Tribal Only"
                                    />
                                    <span>Tribal Only</span>
                                  </div>
                                </td>
                                <td>{tribalProviderCount}</td>
                              </tr>
                            </tbody>
                          </table>
                          <AccordionList
                            title={
                              <>
                                There {providers.length === 1 ? 'is' : 'are'}{' '}
                                <strong>{providers.length}</strong> public water{' '}
                                {providers.length === 1 ? 'system' : 'systems'}{' '}
                                serving <em>{county}</em> county.
                              </>
                            }
                            onSortChange={(sortBy) =>
                              setProvidersSortBy(sortBy.value)
                            }
                            sortOptions={providerSorts}
                          >
                            {sortWaterSystems(
                              providers,
                              providersSortBy,
                              false,
                            ).map((item) =>
                              createAccordionItem(services, item),
                            )}
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
                    <small css={disclaimerStyles}>
                      (opens new browser tab)
                    </small>
                    .
                  </p>

                  <div css={modifiedNoteBoxStyles}>
                    <p>
                      <strong>Mapping Note:</strong> The map does not display
                      the actual locations of public water system facility
                      intakes.
                    </p>
                  </div>
                </>
              )}

              {drinkingWater.status === 'fetching' && <LoadingSpinner />}

              {drinkingWater.status === 'failure' && (
                <div css={modifiedErrorBoxStyles}>
                  <p>{withdrawerError}</p>
                </div>
              )}

              {drinkingWater.status === 'success' && (
                <>
                  {drinkingWater.data.length === 0 && (
                    <p css={centeredTextStyles}>
                      There is no drinking water data for the {watershed}{' '}
                      watershed.
                    </p>
                  )}

                  {drinkingWater.data.length > 0 && (
                    <>
                      {totalWithdrawersCount === 0 && (
                        <p css={centeredTextStyles}>
                          There are no public water systems drawing water from
                          the {watershed} watershed.
                        </p>
                      )}

                      {totalWithdrawersCount > 0 && (
                        <>
                          <table
                            css={modifiedToggleTableStyles}
                            className="table"
                          >
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
                                  <div css={toggleStyles}>
                                    <Switch
                                      disabled={!surfaceWaterCount}
                                      checked={
                                        surfaceWaterDisplayed &&
                                        surfaceWaterCount > 0
                                      }
                                      onChange={(_ev) =>
                                        setSurfaceWaterDisplayed(
                                          !surfaceWaterDisplayed,
                                        )
                                      }
                                      ariaLabel="Surface Water"
                                    />
                                    <span>Surface Water</span>
                                  </div>
                                </td>
                                <td>{surfaceWaterCount}</td>
                              </tr>
                              <tr>
                                <td>
                                  <div css={toggleStyles}>
                                    <Switch
                                      disabled={!groundWaterCount}
                                      checked={
                                        groundWaterDisplayed &&
                                        groundWaterCount > 0
                                      }
                                      onChange={(_ev) =>
                                        setGroundWaterDisplayed(
                                          !groundWaterDisplayed,
                                        )
                                      }
                                      ariaLabel="Ground Water"
                                    />
                                    <span>Ground Water</span>
                                  </div>
                                </td>
                                <td>{groundWaterCount}</td>
                              </tr>

                              {bothCount > 0 && (
                                <tr>
                                  <td>
                                    <div css={toggleStyles}>
                                      <Switch
                                        disabled={!bothCount}
                                        checked={bothDisplayed && bothCount > 0}
                                        onChange={(_ev) =>
                                          setBothDisplayed(!bothDisplayed)
                                        }
                                        ariaLabel="Ground Water and Surface Water"
                                      />
                                      <span>
                                        Ground Water &amp; Surface Water
                                      </span>
                                    </div>
                                  </td>
                                  <td>{bothCount}</td>
                                </tr>
                              )}
                            </tbody>
                            <tfoot>
                              <tr>
                                <th>
                                  <span>Tribal Status</span>
                                </th>
                                <th></th>
                              </tr>
                              <tr>
                                <td>
                                  <div css={toggleStyles}>
                                    <Switch
                                      disabled={!tribalWithdrawerCount}
                                      checked={tribalWithdrawersOnly}
                                      onChange={(_ev) =>
                                        setTribalWithdrawersOnly(
                                          !tribalWithdrawersOnly,
                                        )
                                      }
                                      ariaLabel="Tribal Only"
                                    />
                                    <span>Tribal Only</span>
                                  </div>
                                </td>
                                <td>{tribalWithdrawerCount}</td>
                              </tr>
                            </tfoot>
                          </table>

                          <AccordionList
                            title={
                              <>
                                <strong>{displayedWithdrawers.length}</strong>{' '}
                                of <strong>{totalWithdrawersCount}</strong>{' '}
                                public water systems withdrawing water from the{' '}
                                <em>{watershed}</em> watershed.
                              </>
                            }
                            onSortChange={(sortBy) =>
                              setWithdrawersSortBy(sortBy.value)
                            }
                            sortOptions={withdrawerSorts}
                          >
                            {sortWaterSystems(
                              displayedWithdrawers,
                              withdrawersSortBy,
                              true,
                            ).map((item) =>
                              createAccordionItem(services, item, true),
                            )}
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
                  drinking water sources.{' '}
                  <ShowLessMore
                    text={
                      <>
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

              <AssessmentSummary
                waterbodies={waterbodies}
                fieldName="drinkingwater_use"
                usageName="drinking water use"
              />

              <WaterbodyList
                waterbodies={waterbodies}
                fieldName="drinkingwater_use"
                title={
                  <>
                    There {summary.total === 1 ? 'is' : 'are'}{' '}
                    <strong>{summary.total.toLocaleString()}</strong>{' '}
                    {summary.total === 1 ? 'waterbody' : 'waterbodies'} assessed
                    as potential future sources of drinking water in the{' '}
                    <em>{watershed}</em> watershed.
                  </>
                }
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}

export default function DrinkingWaterContainer() {
  return (
    <TabErrorBoundary tabName="Drinking Water">
      <DrinkingWater />
    </TabErrorBoundary>
  );
}
