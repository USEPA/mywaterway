// @flow

import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import { css } from 'styled-components/macro';
import Query from '@arcgis/core/rest/support/Query';
import QueryTask from '@arcgis/core/tasks/QueryTask';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
// components
import { tabsStyles } from 'components/shared/ContentTabs';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { AccordionList, AccordionItem } from 'components/shared/Accordion';
import { errorBoxStyles, infoBoxStyles } from 'components/shared/MessageBoxes';
import TabErrorBoundary from 'components/shared/ErrorBoundary/TabErrorBoundary';
import Switch from 'components/shared/Switch';
import { GradientIcon } from 'components/pages/LocationMap/MapFunctions';
import ShowLessMore from 'components/shared/ShowLessMore';
import ViewOnMapButton from 'components/shared/ViewOnMapButton';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
import { CommunityTabsContext } from 'contexts/CommunityTabs';
import { MapHighlightContext } from 'contexts/MapHighlight';
import { useServicesContext } from 'contexts/LookupFiles';
// utilities
import { getUrlFromMarkup, getTitleFromMarkup } from 'components/shared/Regex';
import { useWaterbodyOnMap } from 'utils/hooks';
import { convertAgencyCode, convertDomainCode } from 'utils/utils';
// errors
import {
  protectNonpointSourceError,
  protectedAreasDatabaseError,
  restorationPlanError,
  wildScenicRiversError,
  wsioHealthIndexError,
} from 'config/errorMessages';
// styles
import { tableStyles } from 'styles/index.js';

const protectedAreasIdKey = 'OBJECTID';

// given a state code like AL,VA and an array of state objects from attains states service,
// returns the full name of the states (e.g., Alabama and Virginia)
function convertStateCode(stateCode: string, stateData: Array<Object>) {
  if (stateData.length === 0) return stateCode;

  const stateCodes = stateCode.split(',');
  const stateNames = [];

  stateCodes.forEach((code) => {
    const matchingState = stateData.filter((s) => s.code === code)[0];

    if (matchingState) stateNames.push(matchingState.name);
  });

  // don't add ' and ' if only one state is found
  if (stateNames.length === 1) return stateNames[0];

  stateNames.sort();
  return stateNames.slice(0, -1).join(', ') + ' and ' + stateNames.slice(-1);
}

const containerStyles = css`
  @media (min-width: 960px) {
    padding: 1em;
  }
`;

const accordionContentStyles = css`
  padding-top: 0.875em;
  padding-bottom: 0.875em;
`;

const switchStyles = css`
  margin-right: 10px;
  pointer-events: all;
  display: flex;
`;

const labelStyles = css`
  display: flex;
  align-items: center;
  margin: 0;
  font-weight: bold;
  pointer-events: none;

  span {
    margin-left: 0.5em;
  }
`;

const featureStyles = css`
  &:hover {
    background-color: #f0f6f9;
  }
`;

const featureTitleStyles = css`
  padding: 0.75rem;
`;

const disclaimerStyles = css`
  display: inline-block;
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles};
  margin-bottom: 1em;
  text-align: center;
`;

const modifiedInfoBoxStyles = css`
  ${infoBoxStyles}
  margin-bottom: 1em;
  text-align: center;
`;

const questionContainerStyles = css`
  button {
    margin-bottom: 1em;
  }

  p {
    padding-bottom: 1em;
  }

  ul,
  ol,
  li {
    padding-bottom: 0.5em;
  }
`;

const questionStyles = css`
  display: inline-block;
  padding-bottom: 1em;
  font-weight: bold;
`;

const watershedAccordionStyles = css`
  @media (min-width: 480px) {
    display: flex;
    flex-flow: row wrap;
    align-items: flex-start;
    justify-content: space-between;

    table {
      flex: 1;
      margin-right: 1rem;
    }
  }
`;

const watershedGradientStyles = css`
  display: flex;
  flex-direction: column;
  margin: 0 auto 1rem;

  p {
    padding-bottom: 0;
    font-size: 0.875em;
    text-align: center;
  }
`;

const buttonContainerStyles = css`
  margin-top: -0.25rem;
  padding-bottom: 0.75rem;
  padding-left: 0.75rem;
`;

function Protect() {
  const services = useServicesContext();

  // draw the waterbody on the map
  useWaterbodyOnMap('hasprotectionplan', 'overallstatus');

  const { setSelectedGraphic } = useContext(MapHighlightContext);
  const {
    mapView,
    attainsPlans,
    grts,
    watershed,
    highlightOptions,
    huc12,
    statesData,
    visibleLayers,
    setVisibleLayers,
    wsioHealthIndexLayer,
    wsioHealthIndexData,
    wildScenicRiversLayer,
    wildScenicRiversData,
    protectedAreasLayer,
    protectedAreasData,
    protectedAreasHighlightLayer,
    waterbodyLayer,
    cipSummary,
    allWaterbodiesLayer,
  } = useContext(LocationSearchContext);

  const { infoToggleChecked } = useContext(CommunityTabsContext);

  const [normalizedGrtsProjects, setNormalizedGrtsProjects] = useState([]);

  // normalize grts projects data with attains plans data
  useEffect(() => {
    if (grts.status === 'fetching' || grts.data.items.length === 0) return;

    const grtsProjects = grts.data.items
      .filter(
        (project) => project.ws_protect_ind && project.ws_protect_ind === 'Y',
      )
      .map((project) => ({
        source: 'grts',
        title: project.prj_title,
        id: project.prj_seq,
        pollutants: project.pollutants,
        total319Funds: project.total_319_funds,
        projectStartDate: project.project_start_date,
        status: project.status,
        projectLink: project.project_link,
        watershedPlans: project.watershed_plans,
        completionDate: '',
        documents: [],
        organizationIdentifier: '',
        organizationName: '',
        organizationTypeText: '',
      }));

    setNormalizedGrtsProjects(grtsProjects);
  }, [grts]);

  const [normalizedAttainsProjects, setNormalizedAttainsProjects] = useState(
    [],
  );

  // normalize attains plans data with grts projects data
  useEffect(() => {
    if (attainsPlans.status === 'fetching') return;
    if (!attainsPlans.data.items) return;
    if (attainsPlans.data.items.length === 0) return;

    const attainsProjects = [];
    attainsPlans.data.items.forEach((plan) => {
      if (plan.actionTypeCode !== 'Protection Approach') return;
      attainsProjects.push({
        source: 'attains',
        title: plan.actionName,
        id: plan.actionIdentifier,
        pollutants: plan.associatedPollutants,
        total319Funds: '',
        projectStartDate: '',
        status: plan.actionStatusCode,
        projectLink: '',
        watershedPlans: '',
        completionDate: plan.completionDate,
        actionTypeCode: plan.actionTypeCode,
        organizationId: plan.organizationId,
      });
    });

    setNormalizedAttainsProjects(attainsProjects);
  }, [attainsPlans]);

  const allProtectionProjects = [
    ...normalizedGrtsProjects,
    ...normalizedAttainsProjects,
  ];

  allProtectionProjects.sort((objA, objB) => {
    return objA['title'].localeCompare(objB['title']);
  });

  const [healthScoresDisplayed, setHealthScoresDisplayed] = useState(true);

  const [protectedAreasDisplayed, setProtectedAreasDisplayed] = useState(false);

  const [wildScenicRiversDisplayed, setWildScenicRiversDisplayed] =
    useState(false);

  const [waterbodyLayerDisplayed, setWaterbodyLayerDisplayed] = useState(false);

  // Updates the visible layers. This function also takes into account whether
  // or not the underlying webservices failed.
  const updateVisibleLayers = useCallback(
    ({ key = null, newValue = null, useCurrentValue = false }) => {
      const newVisibleLayers = {};
      if (wsioHealthIndexData.status !== 'failure') {
        newVisibleLayers['wsioHealthIndexLayer'] =
          !wsioHealthIndexLayer || useCurrentValue
            ? visibleLayers['wsioHealthIndexLayer']
            : healthScoresDisplayed;
      }
      if (protectedAreasData.status !== 'failure') {
        newVisibleLayers['protectedAreasLayer'] =
          !protectedAreasLayer || useCurrentValue
            ? visibleLayers['protectedAreasLayer']
            : protectedAreasDisplayed;
      }
      if (wildScenicRiversData.status !== 'failure') {
        newVisibleLayers['wildScenicRiversLayer'] =
          !wildScenicRiversLayer || useCurrentValue
            ? visibleLayers['wildScenicRiversLayer']
            : wildScenicRiversDisplayed;
      }
      if (cipSummary.status !== 'failure') {
        newVisibleLayers['waterbodyLayer'] =
          !waterbodyLayer || useCurrentValue
            ? visibleLayers['waterbodyLayer']
            : false;
      }

      if (newVisibleLayers.hasOwnProperty(key)) {
        newVisibleLayers[key] = newValue;
      }

      // set the visible layers if something changed
      if (JSON.stringify(visibleLayers) !== JSON.stringify(newVisibleLayers)) {
        setVisibleLayers(newVisibleLayers);
      }
    },
    [
      healthScoresDisplayed,
      wsioHealthIndexLayer,
      wsioHealthIndexData,
      protectedAreasDisplayed,
      protectedAreasLayer,
      protectedAreasData,
      wildScenicRiversDisplayed,
      wildScenicRiversLayer,
      wildScenicRiversData,
      waterbodyLayer,
      cipSummary,
      visibleLayers,
      setVisibleLayers,
    ],
  );

  // Updates visible layers based on webservice statuses.
  useEffect(() => {
    updateVisibleLayers({ useCurrentValue: true });
  }, [
    wsioHealthIndexData,
    protectedAreasData,
    wildScenicRiversData,
    visibleLayers,
    updateVisibleLayers,
  ]);

  const [tabIndex, setTabIndex] = useState(null);

  // toggle the switches setting when the map layer's visibility changes
  useEffect(() => {
    if (healthScoresDisplayed !== visibleLayers['wsioHealthIndexLayer']) {
      setHealthScoresDisplayed(visibleLayers['wsioHealthIndexLayer']);
    }

    if (wildScenicRiversDisplayed !== visibleLayers['wildScenicRiversLayer']) {
      setWildScenicRiversDisplayed(visibleLayers['wildScenicRiversLayer']);
    }

    if (protectedAreasDisplayed !== visibleLayers['protectedAreasLayer']) {
      setProtectedAreasDisplayed(visibleLayers['protectedAreasLayer']);
    }

    if (waterbodyLayerDisplayed !== visibleLayers['waterbodyLayer']) {
      setWaterbodyLayerDisplayed(visibleLayers['waterbodyLayer']);
    }
  }, [
    healthScoresDisplayed,
    wildScenicRiversDisplayed,
    protectedAreasDisplayed,
    waterbodyLayerDisplayed,
    visibleLayers,
  ]);

  const wsioData =
    wsioHealthIndexData.status === 'success'
      ? wsioHealthIndexData.data[0]
      : null;

  const wsioScore = wsioData
    ? Math.round(wsioData.phwaHealthNdxSt * 100) / 100
    : null;

  function onWsioToggle(newValue) {
    if (newValue) {
      allWaterbodiesLayer.visible = false;
    } else {
      allWaterbodiesLayer.visible = initialAllWaterbodiesVisibility;
    }

    setHealthScoresDisplayed(newValue);
    updateVisibleLayers({
      key: 'wsioHealthIndexLayer',
      newValue,
    });
  }

  function onWildScenicToggle() {
    setWildScenicRiversDisplayed(!wildScenicRiversDisplayed);
    updateVisibleLayers({
      key: 'wildScenicRiversLayer',
      newValue: !wildScenicRiversDisplayed,
    });
  }

  function onProtectedAreasToggle() {
    setProtectedAreasDisplayed(!protectedAreasDisplayed);
    updateVisibleLayers({
      key: 'protectedAreasLayer',
      newValue: !protectedAreasDisplayed,
    });
  }

  function onWaterbodyLayerToggle() {
    setWaterbodyLayerDisplayed(!waterbodyLayerDisplayed);
    updateVisibleLayers({
      key: 'waterbodyLayer',
      newValue: !waterbodyLayerDisplayed,
    });
  }

  const [selectedFeature, setSelectedFeature] = useState(null);
  useEffect(() => {
    if (!mapView || !selectedFeature) return;

    // add it to the highlight layer
    protectedAreasHighlightLayer.removeAll();
    protectedAreasHighlightLayer.add(selectedFeature);

    // set the highlight
    // update context with the new selected graphic
    selectedFeature.attributes['zoom'] = true;
    selectedFeature.attributes['fieldName'] = protectedAreasIdKey;
    setSelectedGraphic(selectedFeature);

    // reset the selectedFeature
    setSelectedFeature(null);
  }, [
    mapView,
    selectedFeature,
    protectedAreasHighlightLayer,
    setSelectedGraphic,
  ]);

  // Initialize the allWaterbodiesLayer visibility. This will be used to reset
  // the allWaterbodiesLayer visibility when the user leaves this tab.
  const [initialAllWaterbodiesVisibility, setInitialAllWaterbodiesVisibility] =
    useState(false);
  useEffect(() => {
    if (!allWaterbodiesLayer) return;

    setInitialAllWaterbodiesVisibility(allWaterbodiesLayer.visible);
  }, [allWaterbodiesLayer]);

  ///////// Workaround Start /////////
  // Workaround to making a cleanup function that is really only called when the
  // component unmounts.

  // This sets a componentWillUnmount ref trigger when the component unmounts.
  const componentWillUnmount = React.useRef(false);
  useEffect(() => {
    return function cleanup() {
      componentWillUnmount.current = true;
    };
  }, []);

  // This runs the cleanup code after the componentWillUnmount ref is triggered.
  useEffect(() => {
    return function cleanup() {
      if (!componentWillUnmount?.current) return;

      allWaterbodiesLayer.visible = initialAllWaterbodiesVisibility;
    };
  }, [allWaterbodiesLayer, initialAllWaterbodiesVisibility]);

  ///////// Workaround End /////////

  return (
    <div css={containerStyles}>
      <div css={tabsStyles}>
        <Tabs
          onChange={(index) => {
            setTabIndex(index);
            updateVisibleLayers({});
          }}
          defaultIndex={tabIndex}
        >
          <TabList>
            <Tab>Watershed Health and Protection</Tab>
            <Tab>Tips</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              {infoToggleChecked && (
                <p>
                  Learn about watershed health scores in relation to your state,
                  the location of designated Wild and Scenic Rivers and if there
                  are any protection projects or protected areas in your
                  watershed.
                </p>
              )}

              <AccordionList>
                <AccordionItem
                  highlightContent={false}
                  onChange={(isOpen) => {
                    if (!isOpen || wsioHealthIndexData.status === 'failure') {
                      return;
                    }

                    onWsioToggle(true);
                  }}
                  title={
                    <label css={labelStyles}>
                      <div
                        css={switchStyles}
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        <Switch
                          checked={
                            healthScoresDisplayed &&
                            wsioHealthIndexData.status === 'success'
                          }
                          onChange={() => onWsioToggle(!healthScoresDisplayed)}
                          disabled={wsioHealthIndexData.status === 'failure'}
                          ariaLabel="Watershed Health Scores"
                        />
                      </div>
                      <strong>Watershed Health Scores</strong>
                    </label>
                  }
                >
                  <div css={accordionContentStyles}>
                    {wsioHealthIndexData.status === 'failure' && (
                      <div css={modifiedErrorBoxStyles}>
                        <p>{wsioHealthIndexError}</p>
                      </div>
                    )}

                    {wsioHealthIndexData.status === 'fetching' && (
                      <LoadingSpinner />
                    )}

                    {wsioHealthIndexData.status === 'success' &&
                      wsioHealthIndexData.data.length === 0 && (
                        <div css={modifiedInfoBoxStyles}>
                          <p>
                            No Watershed Health Score data available for the{' '}
                            {watershed} watershed.
                          </p>
                        </div>
                      )}

                    {wsioHealthIndexData.status === 'success' &&
                      wsioHealthIndexData.data.length > 0 && (
                        <div css={watershedAccordionStyles}>
                          <table css={tableStyles} className="table">
                            <tbody>
                              <tr>
                                <td>
                                  <em>Watershed Name:</em>
                                </td>
                                <td>{watershed}</td>
                              </tr>
                              <tr>
                                <td>
                                  <em>Watershed:</em>
                                </td>
                                <td>{huc12}</td>
                              </tr>
                              <tr>
                                <td>
                                  <em>State:</em>
                                </td>
                                <td>
                                  {(wsioHealthIndexData.status === 'fetching' ||
                                    statesData.status === 'fetching') && (
                                    <LoadingSpinner />
                                  )}

                                  {wsioHealthIndexData.status === 'success' &&
                                    statesData.status === 'success' &&
                                    convertStateCode(
                                      wsioData.states,
                                      statesData.data,
                                    )}
                                </td>
                              </tr>
                              <tr>
                                <td>
                                  <em>Watershed Health Score:</em>
                                </td>
                                <td>
                                  {wsioHealthIndexData.status ===
                                    'fetching' && <LoadingSpinner />}
                                  {wsioHealthIndexData.status === 'success' && (
                                    <>{wsioScore}</>
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          <div css={watershedGradientStyles}>
                            <p>More Healthy</p>

                            <GradientIcon
                              id="health-index-horizontal-gradient"
                              stops={[
                                { label: '1', color: 'rgb(10, 8, 145)' },
                                { label: '0.75', color: 'rgb(30, 61, 181)' },
                                { label: '0.5', color: 'rgb(54, 140, 225)' },
                                { label: '0.25', color: 'rgb(124, 187, 234)' },
                                { label: '0', color: 'rgb(180, 238, 239)' },
                              ]}
                            />

                            <p>Less Healthy</p>
                          </div>
                        </div>
                      )}

                    <div css={questionContainerStyles}>
                      <p css={questionStyles}>
                        Where might the healthier watersheds be located in your
                        state?
                      </p>

                      <ShowLessMore
                        charLimit={0}
                        text={
                          <>
                            <p>
                              The Watershed Health Index, from the Preliminary
                              Healthy Watersheds Assessment (PHWA), is a score
                              of <strong>watershed health</strong> across the
                              United States.
                            </p>

                            <ul>
                              <li>
                                The map to the left shows watershed health,
                                characterized by the presence of natural land
                                cover that supports hydrologic and geomorphic
                                processes within their natural range of
                                variation, good water quality, and habitats of
                                sufficient size and connectivity to support
                                healthy, native aquatic and riparian biological
                                communities.
                              </li>
                              <li>
                                Each Watershed Health Index score is relative to
                                the scores of watersheds across the state. A
                                watershed that straddles more than one state is
                                scored only in the state in which its majority
                                area resides.
                              </li>
                            </ul>
                          </>
                        }
                      />
                    </div>

                    <div css={questionContainerStyles}>
                      <p css={questionStyles}>
                        Why is the Watershed Health Index valuable?
                      </p>

                      <ShowLessMore
                        charLimit={0}
                        text={
                          <ul>
                            <li>
                              Raises awareness of where the healthier watersheds
                              may occur.
                            </li>
                            <li>
                              Provides an initial dataset upon which others can
                              build better watershed condition information.
                            </li>
                            <li>
                              Improves communication and coordination among
                              watershed management partners by providing
                              nationally consistent measures of watershed
                              health.
                            </li>
                            <li>
                              Provides a basis to promote high quality waters
                              protection.
                            </li>
                            <li>
                              Supports efforts to prioritize, protect and
                              maintain high quality waters.
                            </li>
                          </ul>
                        }
                      />
                    </div>

                    <p>
                      <a
                        href="https://www.epa.gov/hwp/download-preliminary-healthy-watersheds-assessments"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <i className="fas fa-info-circle" aria-hidden="true" />{' '}
                        More Information
                      </a>{' '}
                      <small css={disclaimerStyles}>
                        (opens new browser tab)
                      </small>
                    </p>
                  </div>
                </AccordionItem>

                <AccordionItem
                  highlightContent={false}
                  onChange={(isOpen) => {
                    if (!isOpen || wildScenicRiversData.status === 'failure') {
                      return;
                    }

                    setWildScenicRiversDisplayed(true);
                    updateVisibleLayers({
                      key: 'wildScenicRiversLayer',
                      newValue: true,
                    });
                  }}
                  title={
                    <label css={labelStyles}>
                      <div
                        css={switchStyles}
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        <Switch
                          checked={
                            wildScenicRiversDisplayed &&
                            wildScenicRiversData.status === 'success'
                          }
                          onChange={onWildScenicToggle}
                          disabled={wildScenicRiversData.status === 'failure'}
                          ariaLabel="Wild and Scenic Rivers"
                        />
                      </div>
                      <strong>Wild and Scenic Rivers</strong>
                    </label>
                  }
                >
                  <div css={accordionContentStyles}>
                    {infoToggleChecked && (
                      <p>
                        The{' '}
                        <a
                          href="https://www.rivers.gov/"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          National Wild and Scenic Rivers System{' '}
                        </a>{' '}
                        <small css={disclaimerStyles}>
                          (opens new browser tab)
                        </small>{' '}
                        was created by Congress in 1968 to preserve certain
                        rivers with outstanding natural, cultural, and
                        recreational values in a free-flowing condition for the
                        enjoyment of present and future generations. The Act is
                        notable for safeguarding the special character of these
                        rivers, while also recognizing the potential for their
                        appropriate use and development. It encourages river
                        management that crosses political boundaries and
                        promotes public participation in developing goals for
                        river protection.
                      </p>
                    )}

                    {wildScenicRiversData.status === 'failure' && (
                      <div css={modifiedErrorBoxStyles}>
                        <p>{wildScenicRiversError}</p>
                      </div>
                    )}

                    {wildScenicRiversData.status === 'fetching' && (
                      <LoadingSpinner />
                    )}

                    {wildScenicRiversData.status === 'success' &&
                      wildScenicRiversData.data.length === 0 && (
                        <div css={modifiedInfoBoxStyles}>
                          <p>
                            No Wild and Scenic River data available in the{' '}
                            {watershed} watershed.
                          </p>
                        </div>
                      )}

                    {wildScenicRiversData.status === 'success' &&
                      wildScenicRiversData.data.length > 0 && (
                        <>
                          <div css={modifiedInfoBoxStyles}>
                            <p>
                              There{' '}
                              {wildScenicRiversData.data.length === 1
                                ? 'is'
                                : 'are'}{' '}
                              <strong>
                                {wildScenicRiversData.data.length.toLocaleString()}
                              </strong>{' '}
                              wild and scenic{' '}
                              {wildScenicRiversData.data.length === 1
                                ? 'river'
                                : 'rivers'}{' '}
                              in the <em>{watershed}</em> watershed.
                            </p>
                          </div>

                          {wildScenicRiversData.data.map((item) => {
                            const attributes = item.attributes;
                            return (
                              <FeatureItem
                                key={attributes.GlobalID}
                                feature={item}
                                title={
                                  <strong>
                                    River Name: {attributes.WSR_RIVER_SHORTNAME}
                                  </strong>
                                }
                              >
                                <table css={tableStyles} className="table">
                                  <tbody>
                                    <tr>
                                      <td>
                                        <em>Agency</em>
                                      </td>
                                      <td>
                                        {convertAgencyCode(attributes.AGENCY)}
                                      </td>
                                    </tr>

                                    <tr>
                                      <td>
                                        <em>Management Plan</em>
                                      </td>
                                      <td>
                                        {attributes.MANAGEMENT_PLAN === 'Y'
                                          ? 'Yes'
                                          : 'No'}
                                      </td>
                                    </tr>

                                    <tr>
                                      <td>
                                        <em>Managing Entities</em>
                                      </td>
                                      <td>
                                        {convertAgencyCode(
                                          attributes.MANAGING_ENTITIES,
                                        )}
                                      </td>
                                    </tr>

                                    <tr>
                                      <td>
                                        <em>Public Law Name</em>
                                      </td>
                                      <td>{attributes.PUBLIC_LAW_NAME}</td>
                                    </tr>

                                    <tr>
                                      <td>
                                        <em>State</em>
                                      </td>
                                      <td>{attributes.STATE}</td>
                                    </tr>

                                    <tr>
                                      <td>
                                        <em>River Category</em>
                                      </td>
                                      <td>{attributes.RiverCategory}</td>
                                    </tr>

                                    <tr>
                                      <td>
                                        <em>Website</em>
                                      </td>
                                      <td>
                                        {attributes.WEBLINK ? (
                                          <>
                                            <a
                                              href={attributes.WEBLINK}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                            >
                                              More information
                                            </a>{' '}
                                            <small css={disclaimerStyles}>
                                              (opens new browser tab)
                                            </small>
                                          </>
                                        ) : (
                                          'Not available.'
                                        )}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>

                                <div css={buttonContainerStyles}>
                                  <ViewOnMapButton
                                    layers={[wildScenicRiversLayer]}
                                    feature={item}
                                    idField={'GlobalID'}
                                    onClick={() => {
                                      if (wildScenicRiversDisplayed) return;

                                      setWildScenicRiversDisplayed(true);
                                      updateVisibleLayers({
                                        key: 'wildScenicRiversLayer',
                                        newValue: true,
                                      });
                                    }}
                                  />
                                </div>
                              </FeatureItem>
                            );
                          })}
                        </>
                      )}
                  </div>
                </AccordionItem>

                <AccordionItem
                  highlightContent={false}
                  onChange={(isOpen) => {
                    if (!isOpen || protectedAreasData.status === 'failure') {
                      return;
                    }

                    setProtectedAreasDisplayed(true);
                    updateVisibleLayers({
                      key: 'protectedAreasLayer',
                      newValue: true,
                    });
                  }}
                  title={
                    <label css={labelStyles}>
                      <div
                        css={switchStyles}
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        <Switch
                          checked={
                            protectedAreasDisplayed &&
                            protectedAreasData.status === 'success'
                          }
                          onChange={onProtectedAreasToggle}
                          disabled={protectedAreasData.status === 'failure'}
                          ariaLabel="Protected Areas"
                        />
                      </div>
                      <strong>Protected Areas</strong>
                    </label>
                  }
                >
                  <div css={accordionContentStyles}>
                    {infoToggleChecked && (
                      <>
                        <p>
                          The Protected Areas Database (PAD-US) is America’s
                          official national inventory of U.S. terrestrial and
                          marine protected areas that are dedicated to the
                          preservation of biological diversity and to other
                          natural, recreation and cultural uses, managed for
                          these purposes through legal or other effective means.
                        </p>

                        <p>
                          <a
                            href="https://www.usgs.gov/core-science-systems/science-analytics-and-synthesis/gap/science/protected-areas"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <i
                              className="fas fa-info-circle"
                              aria-hidden="true"
                            />{' '}
                            More Information
                          </a>{' '}
                          <small css={disclaimerStyles}>
                            (opens new browser tab)
                          </small>
                        </p>
                      </>
                    )}

                    {protectedAreasData.status === 'failure' && (
                      <div css={modifiedErrorBoxStyles}>
                        <p>{protectedAreasDatabaseError}</p>
                      </div>
                    )}

                    {protectedAreasData.status === 'fetching' && (
                      <LoadingSpinner />
                    )}

                    {protectedAreasData.status === 'success' &&
                      protectedAreasData.data.length === 0 && (
                        <div css={modifiedInfoBoxStyles}>
                          <p>
                            No Protected Areas Database data available for the{' '}
                            {watershed} watershed.
                          </p>
                        </div>
                      )}

                    {protectedAreasData.status === 'success' &&
                      protectedAreasData.data.length > 0 && (
                        <AccordionList
                          title={
                            <>
                              There{' '}
                              {protectedAreasData.data.length === 1
                                ? 'is'
                                : 'are'}{' '}
                              <strong>
                                {protectedAreasData.data.length.toLocaleString()}
                              </strong>{' '}
                              protected{' '}
                              {protectedAreasData.data.length === 1
                                ? 'area'
                                : 'areas'}{' '}
                              in the <em>{watershed}</em> watershed.
                            </>
                          }
                        >
                          {protectedAreasData.data.map((item) => {
                            const attributes = item.attributes;
                            const fields = protectedAreasData.fields;
                            return (
                              <AccordionItem
                                key={`protected-area-${attributes.OBJECTID}`}
                                feature={item}
                                title={
                                  <strong>
                                    Protected Area {attributes.Loc_Nm}
                                  </strong>
                                }
                              >
                                <table css={tableStyles} className="table">
                                  <tbody>
                                    <tr>
                                      <td>
                                        <em>Manager Type:</em>
                                      </td>
                                      <td>
                                        {convertDomainCode(
                                          fields,
                                          'Mang_Type',
                                          attributes.Mang_Type,
                                        )}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        <em>Manager Name:</em>
                                      </td>
                                      <td>
                                        {convertDomainCode(
                                          fields,
                                          'Mang_Name',
                                          attributes.Mang_Name,
                                        )}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        <em>Protection Category:</em>
                                      </td>
                                      <td>
                                        {convertDomainCode(
                                          fields,
                                          'Category',
                                          attributes.Category,
                                        )}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        <em>Public Access:</em>
                                      </td>
                                      <td>
                                        {convertDomainCode(
                                          fields,
                                          'Access',
                                          attributes.Access,
                                        )}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>

                                <div css={buttonContainerStyles}>
                                  <ViewOnMapButton
                                    layers={[protectedAreasLayer]}
                                    feature={item}
                                    fieldName={protectedAreasIdKey}
                                    customQuery={(viewClick) => {
                                      // query for the item
                                      const query = new Query({
                                        where: `${protectedAreasIdKey} = ${attributes[protectedAreasIdKey]}`,
                                        returnGeometry: true,
                                        outFields: ['*'],
                                      });

                                      new QueryTask({
                                        url: `${services.data.protectedAreasDatabase}0`,
                                      })
                                        .execute(query)
                                        .then((res) => {
                                          if (res.features.length === 0) return;

                                          // create the feature
                                          const feature = res.features[0];
                                          feature.symbol = new SimpleFillSymbol(
                                            {
                                              ...highlightOptions,
                                              outline: null,
                                            },
                                          );

                                          if (!mapView) {
                                            viewClick(feature);
                                          }

                                          setSelectedFeature(feature);
                                        })
                                        .catch((err) => {
                                          console.error(err);
                                        });
                                    }}
                                    onClick={() => {
                                      if (protectedAreasDisplayed) return;

                                      setProtectedAreasDisplayed(true);
                                      updateVisibleLayers({
                                        key: 'protectedAreasLayer',
                                        newValue: true,
                                      });
                                    }}
                                  />
                                </div>
                              </AccordionItem>
                            );
                          })}
                        </AccordionList>
                      )}
                  </div>
                </AccordionItem>

                <AccordionItem
                  highlightContent={false}
                  onChange={(isOpen) => {
                    if (
                      !isOpen ||
                      (attainsPlans.status === 'failure' &&
                        grts.status === 'failure')
                    ) {
                      return;
                    }

                    setWaterbodyLayerDisplayed(true);
                    updateVisibleLayers({
                      key: 'waterbodyLayer',
                      newValue: true,
                    });
                  }}
                  title={
                    <label css={labelStyles}>
                      <div
                        css={switchStyles}
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        <Switch
                          checked={
                            waterbodyLayerDisplayed &&
                            cipSummary.status === 'success'
                          }
                          onChange={onWaterbodyLayerToggle}
                          disabled={cipSummary.status === 'failure'}
                          ariaLabel="Protection Projects"
                        />
                      </div>
                      <strong>Protection Projects</strong>
                    </label>
                  }
                >
                  <div css={accordionContentStyles}>
                    {(grts.status === 'fetching' ||
                      attainsPlans.status === 'fetching') && <LoadingSpinner />}

                    {attainsPlans.status === 'failure' && (
                      <div css={modifiedErrorBoxStyles}>
                        <p>{restorationPlanError}</p>
                      </div>
                    )}

                    {grts.status === 'failure' && (
                      <div css={modifiedErrorBoxStyles}>
                        <p>{protectNonpointSourceError}</p>
                      </div>
                    )}

                    {attainsPlans.status !== 'fetching' &&
                      grts.status !== 'fetching' &&
                      (attainsPlans.status === 'success' ||
                        grts.status === 'success') && (
                        <>
                          {allProtectionProjects.length === 0 && (
                            <div css={modifiedInfoBoxStyles}>
                              <p>
                                There are no EPA funded protection projects in
                                the {watershed} watershed.
                              </p>
                            </div>
                          )}

                          {allProtectionProjects.length > 0 && (
                            <>
                              <div css={modifiedInfoBoxStyles}>
                                <p>
                                  There{' '}
                                  {allProtectionProjects.length === 1
                                    ? 'is'
                                    : 'are'}{' '}
                                  <strong>
                                    {allProtectionProjects.length.toLocaleString()}
                                  </strong>{' '}
                                  EPA funded protection{' '}
                                  {allProtectionProjects.length === 1
                                    ? 'project'
                                    : 'projects'}{' '}
                                  in the <em>{watershed}</em> watershed.
                                </p>
                              </div>

                              {allProtectionProjects.map((item, index) => {
                                const url = getUrlFromMarkup(item.projectLink);
                                const protectionPlans =
                                  item.watershedPlans &&
                                  // break string into pieces separated by commas and map over them
                                  item.watershedPlans.split(',').map((plan) => {
                                    const markup =
                                      plan.split('</a>')[0] + '</a>';
                                    const title = getTitleFromMarkup(markup);
                                    const planUrl = getUrlFromMarkup(markup);
                                    if (!title || !planUrl) return null;
                                    return { url: planUrl, title: title };
                                  });
                                // remove any plans with missing titles or urls
                                const filteredProtectionPlans =
                                  protectionPlans &&
                                  protectionPlans.filter(
                                    (plan) => plan && plan.url && plan.title,
                                  );

                                return (
                                  <FeatureItem
                                    key={index}
                                    title={
                                      <>
                                        <strong>
                                          {item.title || 'Unknown'}
                                        </strong>
                                        <br />
                                        <small>
                                          ID: {item.id || 'Unknown ID'}
                                        </small>
                                      </>
                                    }
                                  >
                                    {item.source === 'grts' && (
                                      <table
                                        css={tableStyles}
                                        className="table"
                                      >
                                        <tbody>
                                          {item.pollutants && (
                                            <tr>
                                              <td>
                                                <em>Impairments:</em>
                                              </td>
                                              <td>{item.pollutants}</td>
                                            </tr>
                                          )}
                                          <tr>
                                            <td>
                                              <em>Total Funds:</em>
                                            </td>
                                            <td>{item.total319Funds}</td>
                                          </tr>
                                          <tr>
                                            <td>
                                              <em>Project Start Date:</em>
                                            </td>
                                            <td>{item.projectStartDate}</td>
                                          </tr>
                                          <tr>
                                            <td>
                                              <em>Project Status:</em>
                                            </td>
                                            <td>{item.status}</td>
                                          </tr>
                                          <tr>
                                            <td>
                                              <em>Project Details:</em>
                                            </td>
                                            <td>
                                              {url && (
                                                <>
                                                  <a
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                  >
                                                    Open Project Summary
                                                  </a>
                                                  &nbsp;&nbsp;
                                                  <small css={disclaimerStyles}>
                                                    (opens new browser tab)
                                                  </small>
                                                </>
                                              )}
                                            </td>
                                          </tr>

                                          <tr>
                                            <td>
                                              <em>Protection Plans:</em>
                                            </td>
                                            {filteredProtectionPlans &&
                                            filteredProtectionPlans.length >
                                              0 ? (
                                              <td>
                                                {filteredProtectionPlans.map(
                                                  (plan, index) => {
                                                    if (
                                                      plan &&
                                                      plan.url &&
                                                      plan.title
                                                    ) {
                                                      return (
                                                        <div key={index}>
                                                          <a
                                                            href={plan.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                          >
                                                            {plan.title}
                                                          </a>
                                                        </div>
                                                      );
                                                    }
                                                    return false;
                                                  },
                                                )}
                                              </td>
                                            ) : (
                                              <td>Document not available</td>
                                            )}
                                          </tr>
                                        </tbody>
                                      </table>
                                    )}

                                    {item.source === 'attains' && (
                                      <table
                                        css={tableStyles}
                                        className="table"
                                      >
                                        <tbody>
                                          <tr>
                                            <td>
                                              <em>Plan Type:</em>
                                            </td>
                                            <td>
                                              <GlossaryTerm term="Protection Approach">
                                                Protection Approach
                                              </GlossaryTerm>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>
                                              <em>Status:</em>
                                            </td>
                                            <td>
                                              {item.status ===
                                              'EPA Final Action'
                                                ? 'Final'
                                                : item.status}
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>
                                              <em>Completion Date:</em>
                                            </td>
                                            <td>{item.completionDate}</td>
                                          </tr>
                                          {item.id && (
                                            <tr>
                                              <td>
                                                <em>Plan Details:</em>
                                              </td>
                                              <td>
                                                <a
                                                  href={`/plan-summary/${item.organizationId}/${item.id}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                >
                                                  Open Plan Summary
                                                </a>
                                                &nbsp;&nbsp;
                                                <small css={disclaimerStyles}>
                                                  (opens new browser tab)
                                                </small>
                                              </td>
                                            </tr>
                                          )}
                                        </tbody>
                                      </table>
                                    )}
                                  </FeatureItem>
                                );
                              })}
                            </>
                          )}
                        </>
                      )}
                  </div>
                </AccordionItem>
              </AccordionList>
            </TabPanel>

            <TabPanel>
              <p>
                <em>Links below open in a new browser tab.</em>
              </p>

              <p>Get quick tips for protecting water in your:</p>

              <h2>Community</h2>

              <ul>
                <li>Contribute to local water cleanup efforts.</li>
                <li>Find a watershed protection organization to support.</li>
                <li>Volunteer to help monitor water quality.</li>
                <li>
                  Lead a campaign to educate your community about impairment
                  from nonpoint sources, like stormwater.
                </li>
                <li>
                  Sponsor a watershed festival in your community to raise
                  awareness about the importance of watershed protection.
                </li>
                <li>See how your state is protecting your waters.</li>
              </ul>

              <h2>School</h2>

              <ul>
                <li>Adopt your watershed.</li>
                <li>
                  Teach students about watershed protection by showing the
                  “After the Storm” television special and using other resources
                  from EPA’s Watershed Academy.
                </li>
                <li>
                  <a
                    href="https://www.epa.gov/schools"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Find other ways to make a difference in your school.
                  </a>
                </li>
              </ul>

              <h2>Yard</h2>

              <ul>
                <li>
                  <a
                    href="https://www.epa.gov/nutrientpollution/what-you-can-do-your-yard"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Use fertilizer responsibly.
                  </a>
                </li>
                <li>Don’t overwater gardens and yards.</li>
                <li>
                  <a
                    href="https://www.epa.gov/watersense/what-plant"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Landscape with native plants.
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.epa.gov/soakuptherain"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Reduce runoff.
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.epa.gov/safepestcontrol/lawn-and-garden"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Find other ways to make a difference in your yard.
                  </a>
                </li>
              </ul>

              <h2>Home</h2>

              <ul>
                <li>Choose phosphate-free soaps and detergents.</li>
                <li>Pick up after your pet.</li>
                <li>
                  <a
                    href="https://www.epa.gov/watersense"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Use water efficiently.
                  </a>
                </li>
                <li>Wash your car on your lawn or in commercial car washes.</li>
                <li>Find other ways to make a difference in your home.</li>
              </ul>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}

type FeatureItemProps = {
  feature: ?Object,
  title: Node,
  children: Node,
};

function FeatureItem({ feature, title, children }: FeatureItemProps) {
  const { mapView } = useContext(LocationSearchContext);
  const { setHighlightedGraphic } = useContext(MapHighlightContext);

  const addHighlight = () => {
    if (!feature || !mapView) return;
    setHighlightedGraphic(feature);
  };

  const removeHighlight = () => {
    if (!feature || !mapView) return;
    setHighlightedGraphic(null);
  };

  return (
    <div
      css={featureStyles}
      onMouseEnter={(ev) => addHighlight()}
      onMouseLeave={(ev) => removeHighlight()}
      onFocus={(ev) => addHighlight()}
      onBlur={(ev) => removeHighlight()}
    >
      {title && <p css={featureTitleStyles}>{title}</p>}

      {children}
    </div>
  );
}

export default function ProtectContainer({ ...props }: Props) {
  return (
    <TabErrorBoundary tabName="Protect">
      <Protect {...props} />
    </TabErrorBoundary>
  );
}
