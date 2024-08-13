/** @jsxImportSource @emotion/react */

import { useContext, useEffect, useRef, useState } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
import { css } from '@emotion/react';
import * as query from '@arcgis/core/rest/query';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
// components
import { ListContent } from '@/components/shared/BoxContent';
import { tabsStyles } from '@/components/shared/ContentTabs';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { AccordionList, AccordionItem } from '@/components/shared/Accordion';
import {
  errorBoxStyles,
  infoBoxStyles,
} from '@/components/shared/MessageBoxes';
import TabErrorBoundary from '@/components/shared/ErrorBoundary.TabErrorBoundary';
import Switch from '@/components/shared/Switch';
import { GradientIcon } from '@/utils/mapFunctions';
import ShowLessMore from '@/components/shared/ShowLessMore';
import ViewOnMapButton from '@/components/shared/ViewOnMapButton';
import { GlossaryTerm } from '@/components/shared/GlossaryPanel';
// config
import { tabs } from '@/config/communityConfig';
// contexts
import { useConfigFilesState } from '@/contexts/ConfigFiles';
import { useLayers } from '@/contexts/Layers';
import { LocationSearchContext } from '@/contexts/locationSearch';
import { CommunityTabsContext } from '@/contexts/CommunityTabs';
import { useMapHighlightState } from '@/contexts/MapHighlight';
import { useSurroundingsDispatch } from '@/contexts/Surroundings';
// utilities
import {
  getUrlFromMarkup,
  getTitleFromMarkup,
} from '@/components/shared/Regex';
import { useWaterbodyOnMap } from '@/utils/hooks';
import { convertAgencyCode, convertDomainCode } from '@/utils/utils';
// errors
import {
  protectNonpointSourceError,
  protectedAreasDatabaseError,
  restorationPlanError,
  wildScenicRiversError,
  wsioHealthIndexError,
} from '@/config/errorMessages';

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

  stateNames.sort((a, b) => a.localeCompare(b));
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

const listStyles = css`
  padding-bottom: 1em;

  li {
    margin: 0.5em 0;
  }
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

const subTitleStyles = css`
  display: block;
  font-size: 16px;
  line-height: 1.25;
`;

function Protect() {
  const configFiles = useConfigFilesState();

  // draw the waterbody on the map
  useWaterbodyOnMap('hasprotectionplan', 'overallstatus');

  const { setSelectedGraphic } = useMapHighlightState();
  const {
    mapView,
    attainsPlans,
    grts,
    watershed,
    highlightOptions,
    huc12,
    statesData,
    wsioHealthIndexData,
    wildScenicRiversData,
    protectedAreasData,
    cipSummary,
  } = useContext(LocationSearchContext);

  const {
    allWaterbodiesLayer,
    monitoringLocationsLayer,
    protectedAreasHighlightLayer,
    protectedAreasLayer,
    updateVisibleLayers,
    usgsStreamgagesLayer,
    visibleLayers,
    wildScenicRiversLayer,
  } = useLayers();

  const { infoToggleChecked } = useContext(CommunityTabsContext);

  const [normalizedGrtsProjects, setNormalizedGrtsProjects] = useState([]);

  const surroundingsDispatch = useSurroundingsDispatch();

  // normalize grts projects data with attains plans data
  useEffect(() => {
    if (grts.status !== 'success' || grts.data.items.length === 0) return;

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
      setInitialAllWaterbodiesVisibility(allWaterbodiesLayer.visible);
      setInitialMonitoringLocationsVisibility(monitoringLocationsLayer.visible);
      setInitialUsgsStreamgagesVisibility(usgsStreamgagesLayer.visible);

      updateVisibleLayers({
        allWaterbodiesLayer: false,
        monitoringLocationsLayer: false,
        usgsStreamgagesLayer: false,
        wsioHealthIndexLayer: newValue,
      });
      surroundingsDispatch({
        type: 'visible',
        id: 'allWaterbodiesLayer',
        payload: false,
      });
    } else {
      updateVisibleLayers({
        allWaterbodiesLayer: initialAllWaterbodiesVisibility,
        monitoringLocationsLayer: initialMonitoringLocationsVisibility,
        usgsStreamgagesLayer: initialUsgsStreamgagesVisibility,
        wsioHealthIndexLayer: newValue,
      });
      surroundingsDispatch({
        type: 'visible',
        id: 'allWaterbodiesLayer',
        payload: initialAllWaterbodiesVisibility,
      });
    }

    setHealthScoresDisplayed(newValue);
  }

  function onWildScenicToggle() {
    setWildScenicRiversDisplayed(!wildScenicRiversDisplayed);
    updateVisibleLayers({ wildScenicRiversLayer: !wildScenicRiversDisplayed });
  }

  function onProtectedAreasToggle() {
    setProtectedAreasDisplayed(!protectedAreasDisplayed);
    updateVisibleLayers({ protectedAreasLayer: !protectedAreasDisplayed });
  }

  function onWaterbodyLayerToggle() {
    setWaterbodyLayerDisplayed(!waterbodyLayerDisplayed);
    updateVisibleLayers({ waterbodyLayer: !waterbodyLayerDisplayed });
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

  // Initialize the visibility of several layers. This will be used
  // to reset their visibility when the user leaves this tab.
  const [initialAllWaterbodiesVisibility, setInitialAllWaterbodiesVisibility] =
    useState(false);
  useEffect(() => {
    if (!allWaterbodiesLayer) return;

    setInitialAllWaterbodiesVisibility(allWaterbodiesLayer.visible);
  }, [allWaterbodiesLayer]);

  const initialVisibility = tabs.find((tab) => tab.title === 'Protect')?.layers;

  const [
    initialMonitoringLocationsVisibility,
    setInitialMonitoringLocationsVisibility,
  ] = useState(false);
  useEffect(() => {
    if (initialVisibility && 'monitoringLocationsLayer' in initialVisibility) {
      setInitialMonitoringLocationsVisibility(
        initialVisibility.monitoringLocationsLayer,
      );
    } else if (monitoringLocationsLayer) {
      setInitialMonitoringLocationsVisibility(monitoringLocationsLayer.visible);
    }
  }, [initialVisibility, monitoringLocationsLayer]);

  const [
    initialUsgsStreamgagesVisibility,
    setInitialUsgsStreamgagesVisibility,
  ] = useState(false);
  useEffect(() => {
    if (initialVisibility && 'usgsStreamgagesLayer' in initialVisibility) {
      setInitialUsgsStreamgagesVisibility(
        initialVisibility.usgsStreamgagesLayer,
      );
    } else if (usgsStreamgagesLayer) {
      setInitialUsgsStreamgagesVisibility(usgsStreamgagesLayer.visible);
    }
  }, [initialVisibility, usgsStreamgagesLayer]);

  ///////// Workaround Start /////////
  // Workaround to making a cleanup function that is really only called when the
  // component unmounts.

  // This sets a componentWillUnmount ref trigger when the component unmounts.
  const componentWillUnmount = useRef(false);
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
      surroundingsDispatch({
        type: 'visible',
        id: 'allWaterbodiesLayer',
        payload: initialAllWaterbodiesVisibility,
      });
      monitoringLocationsLayer.visible = initialMonitoringLocationsVisibility;
      usgsStreamgagesLayer.visible = initialUsgsStreamgagesVisibility;
    };
  }, [
    allWaterbodiesLayer,
    initialAllWaterbodiesVisibility,
    initialMonitoringLocationsVisibility,
    initialUsgsStreamgagesVisibility,
    monitoringLocationsLayer,
    surroundingsDispatch,
    usgsStreamgagesLayer,
  ]);

  let watershedStateStatus = 'failure';
  if (
    wsioHealthIndexData.status === 'fetching' ||
    statesData.status === 'fetching'
  ) {
    watershedStateStatus = 'fetching';
  } else if (
    wsioHealthIndexData.status === 'success' ||
    statesData.status === 'success'
  ) {
    watershedStateStatus = 'success';
  }

  ///////// Workaround End /////////

  return (
    <div css={containerStyles}>
      <div css={tabsStyles}>
        <Tabs
          onChange={(index) => {
            setTabIndex(index);
          }}
          defaultIndex={tabIndex}
        >
          <TabList>
            <Tab>Watershed Health and Protection</Tab>
            <Tab>Tips for Protecting Your Watershed</Tab>
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
                            <em>{watershed.name}</em> watershed.
                          </p>
                        </div>
                      )}

                    {wsioHealthIndexData.status === 'success' &&
                      wsioHealthIndexData.data.length > 0 && (
                        <div css={watershedAccordionStyles}>
                          <ListContent
                            rows={[
                              {
                                label: 'Watershed Name',
                                value: watershed.name,
                              },
                              {
                                label: 'Watershed',
                                value: huc12,
                              },
                              {
                                label: 'State',
                                value: convertStateCode(
                                  wsioData.states,
                                  statesData.data,
                                ),
                                status: watershedStateStatus,
                              },
                              {
                                label: 'Watershed Health Score',
                                value: wsioScore,
                                status: wsioHealthIndexData.status,
                              },
                            ]}
                          />

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
                    updateVisibleLayers({ wildScenicRiversLayer: true });
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
                            <em>{watershed.name}</em> watershed.
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
                              in the <em>{watershed.name}</em> watershed.
                            </p>
                          </div>

                          {wildScenicRiversData.data.map((item) => {
                            const attributes = item.attributes;
                            return (
                              <FeatureItem
                                key={attributes.OBJECTID}
                                feature={item}
                                title={
                                  <strong>
                                    River Name: {attributes.WSR_RIVER_SHORTNAME}
                                  </strong>
                                }
                              >
                                <ListContent
                                  rows={[
                                    {
                                      label: 'Agency',
                                      value: convertAgencyCode(
                                        attributes.AGENCY,
                                      ),
                                    },
                                    {
                                      label: 'Management Plan',
                                      value:
                                        attributes.MANAGEMENT_PLAN === 'Y'
                                          ? 'Yes'
                                          : 'No',
                                    },
                                    {
                                      label: 'Managing Entities',
                                      value: convertAgencyCode(
                                        attributes.MANAGING_ENTITIES,
                                      ),
                                    },
                                    {
                                      label: 'Public Law Name',
                                      value: attributes.PUBLIC_LAW_NAME,
                                    },
                                    {
                                      label: 'State',
                                      value: attributes.STATE,
                                    },
                                    {
                                      label: 'River Category',
                                      value: attributes.RIVERCATEGORY,
                                    },
                                    {
                                      label: 'Website',
                                      value: attributes.WEBLINK ? (
                                        <>
                                          <a
                                            href={attributes.WEBLINK}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            More information
                                          </a>
                                          <small css={disclaimerStyles}>
                                            (opens new browser tab)
                                          </small>
                                        </>
                                      ) : (
                                        'Not available.'
                                      ),
                                    },
                                  ]}
                                />

                                <div css={buttonContainerStyles}>
                                  <ViewOnMapButton
                                    layers={[wildScenicRiversLayer]}
                                    feature={item}
                                    idField={'OBJECTID'}
                                    onClick={() => {
                                      if (wildScenicRiversDisplayed) return;

                                      setWildScenicRiversDisplayed(true);
                                      updateVisibleLayers({
                                        wildScenicRiversLayer: true,
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
                    updateVisibleLayers({ protectedAreasLayer: true });
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
                            <em>{watershed.name}</em> watershed.
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
                              in the <em>{watershed.name}</em> watershed.
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
                                <ListContent
                                  rows={[
                                    {
                                      label: 'Manager Type',
                                      value: convertDomainCode(
                                        fields,
                                        'Mang_Type',
                                        attributes.Mang_Type,
                                      ),
                                    },
                                    {
                                      label: 'Manager Name',
                                      value: convertDomainCode(
                                        fields,
                                        'Mang_Name',
                                        attributes.Mang_Name,
                                      ),
                                    },
                                    {
                                      label: 'Protection Category',
                                      value: convertDomainCode(
                                        fields,
                                        'Category',
                                        attributes.Category,
                                      ),
                                    },
                                    {
                                      label: 'Public Access',
                                      value: convertDomainCode(
                                        fields,
                                        'Pub_Access',
                                        attributes.Pub_Access,
                                      ),
                                    },
                                  ]}
                                />

                                <div css={buttonContainerStyles}>
                                  <ViewOnMapButton
                                    layers={[protectedAreasLayer]}
                                    feature={item}
                                    fieldName={protectedAreasIdKey}
                                    customQuery={(viewClick) => {
                                      // query for the item
                                      const url = `${configFiles.data.services.protectedAreasDatabase}0`;
                                      const queryParams = {
                                        where: `${protectedAreasIdKey} = ${attributes[protectedAreasIdKey]}`,
                                        returnGeometry: true,
                                        outFields: ['*'],
                                      };

                                      query
                                        .executeQueryJSON(url, queryParams)
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
                                        protectedAreasLayer: true,
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
                    updateVisibleLayers({ waterbodyLayer: true });
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
                                the <em>{watershed.name}</em> watershed.
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
                                  in the <em>{watershed.name}</em> watershed.
                                </p>
                              </div>

                              {allProtectionProjects.map((item, index) => {
                                const url = getUrlFromMarkup(item.projectLink);
                                const protectionPlans =
                                  // break string into pieces separated by commas and map over them
                                  item.watershedPlans
                                    ?.split(',')
                                    .map((plan) => {
                                      const markup =
                                        plan.split('</a>')[0] + '</a>';
                                      const title = getTitleFromMarkup(markup);
                                      const planUrl = getUrlFromMarkup(markup);
                                      if (!title || !planUrl) return null;
                                      return { url: planUrl, title: title };
                                    });
                                // remove any plans with missing titles or urls
                                const filteredProtectionPlans =
                                  protectionPlans?.filter(
                                    (plan) => plan?.url && plan.title,
                                  );

                                const protectionPlanLinks =
                                  filteredProtectionPlans?.length > 0
                                    ? filteredProtectionPlans.map((plan) => {
                                        if (plan?.url && plan.title) {
                                          return (
                                            <div
                                              key={`${plan.title}-${plan.url}`}
                                            >
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
                                      })
                                    : 'Document not available';

                                return (
                                  <FeatureItem
                                    key={item.id}
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
                                      <ListContent
                                        rows={[
                                          item.pollutants
                                            ? {
                                                label: 'Impairments',
                                                value: item.pollutants,
                                              }
                                            : null,
                                          {
                                            label: 'Total Funds',
                                            value: item.total319Funds,
                                          },
                                          {
                                            label: 'Project Start Date',
                                            value: item.projectStartDate,
                                          },
                                          {
                                            label: 'Project Status',
                                            value: item.status,
                                          },
                                          {
                                            label: 'Project Details',
                                            value: url ? (
                                              <>
                                                <a
                                                  href={url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                >
                                                  Open Project Summary
                                                </a>
                                                <small css={disclaimerStyles}>
                                                  (opens new browser tab)
                                                </small>
                                              </>
                                            ) : null,
                                          },
                                          {
                                            label: 'Protection Plans',
                                            value: protectionPlanLinks,
                                          },
                                        ]}
                                      />
                                    )}

                                    {item.source === 'attains' && (
                                      <ListContent
                                        rows={[
                                          {
                                            label: 'Plan Type',
                                            value: (
                                              <GlossaryTerm term="Protection Approach">
                                                Protection Approach
                                              </GlossaryTerm>
                                            ),
                                          },
                                          {
                                            label: 'Status',
                                            value:
                                              item.status === 'EPA Final Action'
                                                ? 'Final'
                                                : item.status,
                                          },
                                          {
                                            label: 'Completion Date',
                                            value: item.completionDate,
                                          },
                                          item.id
                                            ? {
                                                label: 'Plan Details',
                                                value: (
                                                  <>
                                                    <a
                                                      href={`/plan-summary/${item.organizationId}/${item.id}`}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                    >
                                                      Open Plan Summary
                                                    </a>
                                                    <small
                                                      css={disclaimerStyles}
                                                    >
                                                      (opens new browser tab)
                                                    </small>
                                                  </>
                                                ),
                                              }
                                            : null,
                                        ]}
                                      />
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

              <h3>
                Home and Yard
                <i css={subTitleStyles}>
                  Sustainable landscaping to conserve water and protect the
                  natural functioning ecosystem
                </i>
              </h3>

              <ul css={listStyles}>
                <li>
                  <a
                    href="https://www.epa.gov/system/files/documents/2021-12/ws-outdoor-water-smart-landscapes.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Use water-smart landscaping (PDF)
                  </a>
                  .
                </li>
                <ul>
                  <li>
                    Make sure your sprinklers water the lawn and garden – not
                    the street or sidewalk.
                  </li>
                  <li>
                    Water plants in the evening when it’s cooler to reduce
                    evaporation.
                  </li>
                  <li>
                    Adding{' '}
                    <GlossaryTerm term="organic matter">
                      organic matter
                    </GlossaryTerm>{' '}
                    or eco-friendly mulch helps soil retain moisture. This
                    reduces the need for extra irrigation.
                  </li>
                </ul>
                <li>
                  <a
                    href="https://www.epa.gov/watersense/what-plant"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Plant water-efficient species within the hardiness zone for
                    your area
                  </a>
                  . These plants require less management and resources.
                </li>
                <li>
                  <a
                    href="https://www.epa.gov/soakuptherain"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Reduce runoff and stormwater pollution
                  </a>
                  .
                </li>
                <ul>
                  <li>
                    Learn about the danger of over-fertilization and use
                    fertilizer responsibly. Consider using organic or
                    slow-release fertilizer.
                  </li>
                  <li>
                    Consider using{' '}
                    <a
                      href="https://www.epa.gov/green-infrastructure"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      green infrastructure
                    </a>
                    . For example, installing a{' '}
                    <a
                      href="https://www.epa.gov/soakuptherain/soak-rain-rain-gardens"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      rain garden
                    </a>{' '}
                    can collect and absorb runoff from rooftops, sidewalks, and
                    streets.
                  </li>
                </ul>
                <li>
                  Create a{' '}
                  <a
                    href="https://www.epa.gov/recycle/composting-home"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    compost bin
                  </a>{' '}
                  to recycle yard and food waste. Compost can be used as a
                  natural fertilizer and reduces land fill waste.
                </li>
                <li>
                  Find other ways to{' '}
                  <a
                    href="https://www.epa.gov/nutrientpollution/what-you-can-do-your-yard"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    make a difference in your yard
                  </a>
                  .
                </li>
              </ul>

              <h3>
                <i css={subTitleStyles}>
                  Conserve water and prevent pollutants from entering waterways
                </i>
              </h3>

              <ul css={listStyles}>
                <li>
                  <a
                    href="https://www.epa.gov/hw/household-hazardous-waste-hhw"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Dispose of potentially harmful materials properly
                  </a>
                  .
                </li>
                <ul>
                  <li>
                    Do not pour oil, antifreeze, or other harmful chemicals into
                    the storm drain or the street.
                  </li>
                  <li>
                    Do not pour cleaners or other toxic household chemicals down
                    the drain.
                  </li>
                </ul>
                <li>Turn off the faucet when scrubbing dishes.</li>
                <li>
                  Turn off the faucet when you are washing your face or brushing
                  your teeth.
                </li>
                <li>Fix any leaky faucets or toilets.</li>
                <li>Only do laundry when you have a full load.</li>
                <li>
                  Use{' '}
                  <a
                    href="https://www.epa.gov/watersense/watersense-products"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    energy and water-efficient appliances
                  </a>
                  , such as dishwashers, laundry machines, and toilets.
                </li>
                <li>
                  Consider reducing{' '}
                  <GlossaryTerm term="impervious surfaces">
                    impervious surfaces
                  </GlossaryTerm>{' '}
                  by{' '}
                  <a
                    href="https://www.epa.gov/soakuptherain/soak-rain-permeable-pavement"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    installing permeable pavement
                  </a>
                  , which can help to filter out pollutants and promote water
                  infiltration.
                </li>
                <li>
                  <a
                    href="https://cfpub.epa.gov/npstbx/files/pet%20care%20fact%20sheet.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Pick up after your pet to prevent bacterial contamination in
                    our waterways (PDF)
                  </a>
                  .
                </li>
                <li>Wash your car on your lawn or in commercial car washes.</li>
                <li>
                  Find other ways to{' '}
                  <a
                    href="https://www.epa.gov/nutrientpollution/what-you-can-do-your-home"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    make a difference in your home
                  </a>
                  .
                </li>
              </ul>

              <h3>
                Community
                <i css={subTitleStyles}>Get involved in your local watershed</i>
              </h3>

              <ul css={listStyles}>
                <li>
                  Volunteer at a{' '}
                  <a
                    href="https://www.rivernetwork.org/membership/map-who-is-protecting-your-water/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    watershed protection organization
                  </a>{' '}
                  near you or{' '}
                  <a
                    href="https://www.sourcewatercollaborative.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    consider starting one
                  </a>
                  !
                  <a
                    className="exit-disclaimer"
                    href="https://www.epa.gov/home/exit-epa"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    EXIT
                  </a>
                </li>
                <li>
                  Look online for community events near you. Attend a beach,
                  stream, wetland, or neighborhood clean-up or a tree-planting.
                </li>
                <li>
                  Join the{' '}
                  <a
                    href="https://www.epa.gov/awma/volunteer-monitoring"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Volunteer Monitoring Community
                  </a>{' '}
                  to get involved in events and efforts near you.
                </li>
                <li>
                  Get involved in{' '}
                  <a
                    href="https://www.epa.gov/participatory-science/resources-participatory-science-projects"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Participatory Science Projects and citizen science
                  </a>{' '}
                  events.
                </li>
                <li>
                  Find a{' '}
                  <a
                    href="https://www.rivernetwork.org/membership/map-who-is-protecting-your-water"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    watershed protection organization
                  </a>{' '}
                  <a
                    className="exit-disclaimer"
                    href="https://www.epa.gov/home/exit-epa"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    EXIT
                  </a>
                  to support and get involved with.
                </li>
                <li>
                  Find other ways to{' '}
                  <a
                    href="https://www.epa.gov/nutrientpollution/what-you-can-do-your-community"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    make a difference in your community
                  </a>
                  .
                </li>
              </ul>

              <h3>
                <i css={subTitleStyles}>School and Work</i>
              </h3>

              <ul css={listStyles}>
                <li>
                  Host a campus clean-up to remove litter and trash around your
                  school.
                </li>
                <li>
                  Join or start an environmental club at your school and
                  incorporate water protection activities around campus.
                </li>
                <li>
                  Consider walking, biking, or taking the bus to school and work
                  – many pollutants in our water come from vehicle exhaust and
                  leakage.
                </li>
                <li>
                  Start a school garden to learn more about water conservation
                  (and enjoy some fresh fruits and vegetables, too).
                </li>
                <li>
                  Visit the USGS{' '}
                  <a
                    href="https://www.usgs.gov/special-topics/water-science-school"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Water Science School
                  </a>{' '}
                  <a
                    className="exit-disclaimer"
                    href="https://www.epa.gov/home/exit-epa"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    EXIT
                  </a>
                  for learning resources, tools, and more.
                </li>
                <li>
                  Visit EPA’s{' '}
                  <a
                    href="https://www.epa.gov/watershedacademy/kids-corner"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Watershed Academy
                  </a>{' '}
                  for classroom resources and activities!
                </li>
                <li>
                  Find more ways to{' '}
                  <a
                    href="https://www.epa.gov/schools"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    improve the health of your school
                  </a>{' '}
                  environment.
                </li>
                <li>
                  Incorporate more{' '}
                  <a
                    href="https://www3.epa.gov/region1/eco/drinkwater/water_conservation_biz.html"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    sustainable practices in your business
                  </a>
                  .
                </li>
                <li>
                  Find other ways to{' '}
                  <a
                    href="https://www.epa.gov/nutrientpollution/what-you-can-do-your-classroom"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    make a difference in your classroom
                  </a>
                  .
                </li>
              </ul>

              <h3>For more information and tips, visit the following sites:</h3>

              <ul css={listStyles}>
                <li>
                  Visit EPA’s{' '}
                  <a
                    href="https://www.epa.gov/watershedacademy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Watershed Academy
                  </a>{' '}
                  to view webcasts and complete learning modules.
                </li>
                <li>
                  Learn what{' '}
                  <a
                    href="https://www.epa.gov/aboutepa/epa-your-state"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    EPA is doing in your state
                  </a>{' '}
                  to protect your waters.
                </li>
                <li>
                  Learn more about{' '}
                  <a
                    href="https://www.epa.gov/nps/basic-information-about-nonpoint-source-nps-pollution"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    nonpoint source pollution
                  </a>
                  .
                </li>
                <li>
                  <a
                    href="https://www.epa.gov/watersense/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WaterSense
                  </a>
                  : a label for water-efficient products and a resource for
                  helping you save water
                </li>
                <li>
                  <a
                    href="https://www.epa.gov/sites/default/files/2017-03/documents/ws-ideas-for-communities.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Using Water Efficiently: Ideas for Communities (PDF)
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.epa.gov/sites/default/files/2017-03/documents/ws-ideas-for-residences.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Using Water Efficiently: Ideas for Residences (PDF)
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.epa.gov/p2/pollution-prevention-tips-water-conservation"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Pollution Prevention Tips for Water Conservation
                  </a>
                </li>
                <li>
                  Incorporate more{' '}
                  <a
                    href="https://www.epa.gov/environmental-topics/greener-living"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    sustainable practices in your daily life
                  </a>
                  .
                </li>
              </ul>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}

type FeatureItemProps = {
  feature?: Object;
  title: Node;
  children: Node;
};

function FeatureItem({ feature, title, children }: FeatureItemProps) {
  const { mapView } = useContext(LocationSearchContext);
  const { setHighlightedGraphic } = useMapHighlightState();

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

export default function ProtectContainer() {
  return (
    <TabErrorBoundary tabName="Protect">
      <Protect />
    </TabErrorBoundary>
  );
}
