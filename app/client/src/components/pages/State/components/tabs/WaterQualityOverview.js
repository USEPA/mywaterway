// @flow

import React from 'react';
import styled from 'styled-components';
import Select from 'react-select';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
// components
import { ContentTabs } from 'components/shared/ContentTabs';
import { AccordionList, AccordionItem } from 'components/shared/Accordion';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import DrinkingWaterIcon from 'components/shared/Icons/DrinkingWaterIcon';
import SwimmingIcon from 'components/shared/Icons/SwimmingIcon';
import FishingIcon from 'components/shared/Icons/FishingIcon';
import OtherIcon from 'components/shared/Icons/OtherIcon';
import WaterSystemSummary from 'components/shared/WaterSystemSummary';
import SurveyResults from 'components/pages/State/components/SurveyResults';
import SiteSpecific from 'components/pages/State/components/SiteSpecific';
import Documents from 'components/pages/State/components/Documents';
import Stories from 'components/pages/State/components/Stories';
// styled components
import { StyledErrorBox } from 'components/shared/MessageBoxes';
// styles
import { colors } from 'styles/index.js';
// contexts
import { StateTabsContext } from 'contexts/StateTabs';
// utilities
import { fetchCheck } from 'utils/fetchUtils';
import { titleCase } from 'utils/utils';
// data
import { stateNationalUses } from 'components/pages/State/lookups/stateNationalUses';
import { waterTypeOptions } from 'components/pages/State/lookups/waterTypeOptions';
import { reportStatusOptions } from 'components/pages/State/lookups/reportStatusMapping';
// config
import { attains, grts } from 'config/webServiceConfig';
// images
import drinkingWaterIcon from 'components/pages/Community/images/drinking-water.png';
// errors
import {
  stateSurveySectionError,
  stateGeneralError,
  stateNoDataError,
} from 'config/errorMessages';

function relabelWaterType(oldLabel) {
  let newLabel = 'Other Types';
  Object.entries(waterTypeOptions).forEach((waterTypeOption) => {
    const [waterType, aliases] = waterTypeOption;
    if (aliases.includes(oldLabel)) newLabel = waterType;
  });

  return newLabel;
}

function formatTopic(topic) {
  // map HMWv2 categories to the stateNationalUse categories
  if (topic === 'drinking') return 'Drinking Water';
  if (topic === 'swimming') return 'Recreation';
  if (topic === 'fishing') return 'Fish and Shellfish Consumption';
  if (topic === 'other') return 'Other';
}

function hasUseValues(use) {
  return (
    use['Fully Supporting'] > 0 ||
    use['Not Supporting'] > 0 ||
    use['Insufficient Information'] > 0
  );
}

// --- styled components ---
const Container = styled.div`
  .hmw-accordions {
    margin: 1.5em 0;
  }

  .hmw-accordion-header {
    padding-right: 1.5em;
    padding-left: 1.5em;
  }

  .hmw-accordion-header h2,
  .hmw-accordion-header h3 {
    padding-bottom: 0;
  }
`;

const TopicTabs = styled(ContentTabs)`
  [data-reach-tab] {
    padding: 0.625em 0.625em 0.875em;
    font-size: 0.875em;
    background-color: #0674ba;

    &[data-selected],
    &:hover,
    &:focus {
      background-color: #165277;
    }
  }

  [data-reach-tab-panel] {
    padding-bottom: 0 !important;
  }
`;

const TopicIcon = styled.div`
  display: flex;
  margin: 0 auto;
  width: 2.5em;
  height: 2.5em;
`;

const Heading = styled.h2`
  margin-top: 0 !important;

  i {
    margin-right: 0.3125em;
    color: #2c72b5;
  }
`;

const Section = styled.div`
  margin-bottom: 1.5em;
`;

const FiltersSection = styled(Section)`
  margin-top: -1.5em;
  margin-left: -1.5em;
  padding: 1.5em;
  border-bottom: 1px solid #d8dfe2;
  width: calc(100% + 3em);
  background-color: whitesmoke;
`;

const DrinkingWaterSection = styled(Section)`
  display: ${({ displayed }) => (displayed ? 'block' : 'none')};
  /* add top border to replicate bottom accordion border that was
  removed from 'Top Polltants' accordion in SiteSpecific component */
  margin-left: -1.5em;
  padding: 1.5em 1.5em 0;
  border-top: 1px solid ${colors.slate()};
  width: calc(100% + 3em);
`;

const DrinkingWaterText = styled.p`
  padding-bottom: 0;
`;

const Inputs = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
`;

const Input = styled.div`
  margin-bottom: 0.75em;
  width: 100%;

  @media (min-width: 768px) {
    margin-bottom: 0;
    width: calc(50% - 0.75em);
  }

  label {
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
    font-weight: bold;
  }
`;

const Accordions = styled(AccordionList)`
  border-bottom: none;

  margin: 1.5em 0 -1.5em -1.5em !important;
  width: calc(100% + 3em) !important;
`;

const AccordionContent = styled.div`
  padding: 0.25em 1.5em 1.5em;
`;

const AccordionIcon = styled.i`
  width: 1.125em;
  font-size: 1.625em;
  color: #2c72b5;
  text-align: center;
`;

const SelectStyled = styled(Select)`
  .Select__control--is-disabled {
    background-color: #e9ecef;
    border-color: #ced4da;
  }

  .Select__placeholder {
    color: #495057;
  }
`;

const ImageIcon = styled.img`
  position: relative;
  bottom: 0.125em;
  left: -0.3125em;
  margin-right: -0.3125em;
  max-width: 1.75em;
  max-height: 1.75em;
`;

// --- components ---
type Props = {};

function WaterQualityOverview({ ...props }: Props) {
  const {
    activeState,
    setCurrentReportStatus,
    setCurrentSummary,
  } = React.useContext(StateTabsContext);

  const [loading, setLoading] = React.useState(true);
  const [surveyLoading, setSurveyLoading] = React.useState(true);
  const [assessmentsLoading, setAssessmentsLoading] = React.useState(true);
  const [serviceError, setServiceError] = React.useState(false);
  const [documentServiceError, setDocumentServiceError] = React.useState(false);
  const [surveyServiceError, setSurveyServiceError] = React.useState(false);
  const [noDataError, setNoDataError] = React.useState(false);
  const [currentState, setCurrentState] = React.useState('');
  const [currentStateData, setCurrentStateData] = React.useState({});
  const [yearSelected, setYearSelected] = React.useState('');
  const [waterType, setWaterType] = React.useState('');
  const [useSelected, setUseSelected] = React.useState('');
  const [currentTopic, setCurrentTopic] = React.useState('swimming');
  const [waterTypes, setWaterTypes] = React.useState(null);
  const [waterTypeData, setWaterTypeData] = React.useState(null);

  const [surveyData, setSurveyData] = React.useState(null);
  const [assessmentDocuments, setAssessmentDocuments] = React.useState(null);

  const [topicUses, setTopicUses] = React.useState({});
  const [useList, setUseList] = React.useState([]);
  const [completeUseList, setCompleteUseList] = React.useState([]);

  // user selections
  const [userSelectedWaterType, setUserSelectedWaterType] = React.useState('');
  const [userSelectedUse, setUserSelectedUse] = React.useState('');

  // dropdown lists
  const [displayWaterTypes, setDisplayWaterTypes] = React.useState([]);
  const [displayUses, setDisplayUses] = React.useState([]);
  const [subPopulationCodes, setSubPopulationCodes] = React.useState([]);

  // documents
  const [surveyDocuments, setSurveyDocuments] = React.useState([]);

  // stories
  const [stories, setStories] = React.useState({
    status: 'fetching',
    data: [],
    nextUrl: '',
  });
  // Get the assessments
  const fetchAssessments = React.useCallback(
    (orgID, year) => {
      // use the excludeAsssessments flag to improve performance, since we only
      // need the documents and reportStatusCode
      const url = `${
        attains.serviceUrl
      }assessments?organizationId=${orgID}&reportingCycle=${year}&excludeAssessments=Y`;
      fetchCheck(url)
        .then((res) => {
          setAssessmentsLoading(false);

          if (!res || !res.items || res.items.length === 0) {
            setAssessmentDocuments([]);
          }

          const orgData = res.items[0];
          setAssessmentDocuments(orgData.documents);

          const reportStatus = reportStatusOptions.hasOwnProperty(
            orgData.reportStatusCode,
          )
            ? reportStatusOptions[orgData.reportStatusCode]
            : orgData.reportStatusCode;
          setCurrentReportStatus(reportStatus);
        })
        .catch((err) => {
          console.error(err);
          setDocumentServiceError(true);
          setAssessmentsLoading(false);
        });
    },
    [setCurrentReportStatus],
  );

  // summary service has the different years of data for recreation/eco/fish/water/other
  const fetchStateSummary = React.useCallback(
    (orgID) => {
      let url = `${attains.serviceUrl}usesStateSummary?organizationId=${orgID}`;

      fetchCheck(url)
        .then((res) => {
          setCurrentStateData(res.data);

          // get the latest reporting cycle
          let currentReportingCycle = '';
          let currentSummary;
          if (res.data.reportingCycles && res.data.reportingCycles.length > 0) {
            currentSummary = res.data.reportingCycles.sort(
              (a, b) =>
                parseFloat(b.reportingCycle) - parseFloat(a.reportingCycle),
            )[0];
            currentReportingCycle = currentSummary.reportingCycle;
          }

          setYearSelected(currentReportingCycle);
          setCurrentSummary({
            status: 'success',
            data: currentSummary,
          });
          setLoading(false);

          fetchAssessments(orgID, currentReportingCycle);
        })
        .catch((err) => {
          console.error('Error with attains summary web service: ', err);
          setServiceError(true);
          setLoading(false);
          setCurrentSummary({
            status: 'failure',
            data: {},
          });
        });
    },
    [fetchAssessments, setCurrentSummary],
  );

  // get state organization ID for summary service
  const [organizationId, setOrganizationId] = React.useState('');
  const fetchStateOrgId = React.useCallback(
    (stateID: string) => {
      const url = `${attains.serviceUrl}states/${stateID}/organizations`;
      fetchCheck(url)
        .then((res) => {
          let orgID;

          // look for an org id that is of type state
          if (res && res.data) {
            res.data.forEach((org) => {
              if (org.type === 'State') orgID = org.id;
            });
          }

          // go to the next step if an org id was found, otherwise flag an error
          if (orgID) {
            fetchStateSummary(orgID);
            setOrganizationId(orgID);
            fetchSurveyData(orgID);
          } else {
            console.log(
              'Attains did not return any organization info for ',
              stateID,
            );
            setNoDataError(true);
            setLoading(false);
            setSurveyLoading(false);
            return;
          }
        })
        .catch((err) => {
          console.error('Error with attains org ID web service: ', err);
          setServiceError(true);
          setLoading(false);
        });
    },
    [fetchStateSummary],
  );

  // If the user changes the search
  React.useEffect(
    () => {
      if (activeState.code === '') return;

      if (currentState !== activeState.code) {
        setCurrentStateData({});
        setLoading(true);
        setSurveyLoading(true);
        setSurveyDocuments([]);
        setYearSelected('');
        setWaterType('');
        setUseSelected('');
        setServiceError(false);
        setDocumentServiceError(false);
        setSurveyServiceError(false);
        setNoDataError(false);
        setSurveyData(null);
        setAssessmentsLoading(true);
        setAssessmentDocuments([]);
        setSubPopulationCodes([]);
        setCurrentReportStatus('');

        setCurrentState(activeState.code);
        fetchStateOrgId(activeState.code);

        setCurrentSummary({
          status: 'fetching',
          data: {},
        });
        setStories({
          status: 'fetching',
          data: [],
          nextUrl: `${grts.getSSByState}${activeState.code}`,
        });
      }
    },
    [
      currentState,
      activeState,
      setCurrentReportStatus,
      setCurrentSummary,
      fetchStateOrgId,
    ],
  );

  // Get the survey data and survey documents
  const fetchSurveyData = (orgID) => {
    const url = `${attains.serviceUrl}surveys?organizationId=${orgID}`;
    fetchCheck(url)
      .then((res) => {
        setSurveyLoading(false);

        if (
          !res ||
          !res.items ||
          res.items.length === 0 ||
          !res.items[0].surveys ||
          res.items[0].surveys.length === 0
        ) {
          setSurveyData(null);
          setSurveyDocuments([]);
          return;
        }

        // get the surveys sorted by year
        let surveys = res.items[0].surveys.sort(
          (a, b) => parseFloat(b.year) - parseFloat(a.year),
        );

        setSurveyData(surveys[0]);
        setSurveyDocuments(surveys[0].documents);
      })
      .catch((err) => {
        console.error('Error with surveys org ID web service: ', err);
        setSurveyServiceError(true);
        setSurveyLoading(false);
      });
  };

  // fetch the stories from the provided url. This also saves the next stories
  // url to nextStoriesUrl, if the web service provided it, and the useEffect
  // will execute the fetch again.
  React.useEffect(
    () => {
      if (!stories.nextUrl) return;

      fetchCheck(stories.nextUrl)
        .then((res) => {
          // filter stories that have no description text or url
          const filteredItems = res.items.filter(
            (story) => story.ss_overview && story.web_link,
          );
          setStories({
            data: [...stories.data, ...filteredItems],
            status: res.next ? 'fetching' : 'success',
            nextUrl: res.next ? res.next.$ref : '',
          });
        })
        .catch((err) => {
          console.error(err);
          setStories({
            status: 'failure',
            data: [],
            nextUrl: '',
          });
        });
    },
    [stories],
  );

  // Gets a list of uses that pertain to the current topic
  React.useEffect(
    () => {
      if (activeState.code === '') return;

      let category = formatTopic(currentTopic);

      //get the list of possible uses. Lump ecological in with fishing.
      let possibleUses = {};
      stateNationalUses.forEach((item) => {
        if (
          item.state === activeState.code &&
          (item.category === category ||
            (item.category === 'Ecological Life' && currentTopic === 'fishing'))
        ) {
          // make sure to use upper case to prevent duplicate uses
          possibleUses[item.name.toUpperCase()] = item;
        }
      });

      setTopicUses(possibleUses);
    },
    [currentTopic, activeState, waterTypeData],
  );

  // Gets a unique list of water types that have data that is relevant to
  // the current topic
  React.useEffect(
    () => {
      if (!waterTypes) {
        setDisplayWaterTypes([]);
        return;
      }

      const displayWaterTypes = [
        // get a list of unique water type codes
        ...new Set(
          waterTypes
            .filter((item) => {
              // add the item if it has a use relevant to
              // the selected tab
              let hasUse = false;
              item.useAttainments.forEach((use) => {
                if (
                  topicUses.hasOwnProperty(use.useName.toUpperCase()) &&
                  hasUseValues(use)
                ) {
                  hasUse = true;
                }
              });

              if (hasUse) {
                return relabelWaterType(item.waterTypeCode);
              } else return null;
            })
            .map((item) => relabelWaterType(item.waterTypeCode)),
        ),
      ].sort();

      setDisplayWaterTypes(displayWaterTypes);
    },
    [waterTypes, topicUses],
  );

  // Builds use lists that will be used for displaying in dropdowns and
  // building graphs with aggregrate data.
  React.useEffect(
    () => {
      // fill in the use list dropdown
      let addedUses = [];
      let useList = []; //used for dropdown (excludes duplicate names)
      let completeUseList = []; //used for aggregrate data (includes duplicate names)
      if (waterTypeData) {
        waterTypeData.forEach((waterTypeItem) => {
          waterTypeItem['useAttainments'].forEach((use) => {
            let useName = use.useName.toUpperCase();
            if (topicUses.hasOwnProperty(useName) && hasUseValues(use)) {
              if (!addedUses.includes(useName)) {
                addedUses.push(useName);
                useList.push(use);
              }

              if (titleCase(useName) === useSelected) {
                completeUseList.push(use);
              }
            }
          });
        });
      }

      setUseList(useList);
      setCompleteUseList(completeUseList);
      const displayUses = useList
        .filter((use) => topicUses.hasOwnProperty(use.useName.toUpperCase()))
        .map((use) => titleCase(use.useName))
        .sort();
      setDisplayUses(displayUses);
    },
    [topicUses, waterTypeData, useSelected],
  );

  // Handles user year changes and gets data associated with the selected year.
  React.useEffect(
    () => {
      let yearData =
        yearSelected &&
        currentStateData.reportingCycles &&
        currentStateData.reportingCycles.find(
          (x) => x['reportingCycle'] === yearSelected,
        );

      if (yearData) {
        // Build a list of water types that includes the simple water type attribute.
        const waterTypes = [];
        yearData['waterTypes'].forEach((waterType) => {
          // Get the simple water type name (i.e. one of the types in the dropdown)
          // from the detailed water type
          let simpleWaterType = 'Other Types'; // if it's not found use "Other Types"
          Object.entries(waterTypeOptions).forEach((option) => {
            const [key, value] = option;
            if (value.includes(waterType.waterTypeCode)) simpleWaterType = key;
          });

          waterTypes.push({
            ...waterType,
            simpleWaterType: simpleWaterType,
          });
        });

        setWaterTypes(waterTypes);
      } else setWaterTypes(null);
    },
    [currentTopic, yearSelected, currentStateData],
  );

  // Handles user and auto water type selection
  React.useEffect(
    () => {
      if (displayWaterTypes && displayWaterTypes.length > 0) {
        // set to the user's selection if it is availble
        if (displayWaterTypes.includes(userSelectedWaterType)) {
          setWaterType(userSelectedWaterType);
        }

        // set to first item if the user's select cannot be found
        else {
          setWaterType(displayWaterTypes[0]);
        }
      } else {
        setWaterType(''); // no data available
      }
    },
    [displayWaterTypes, userSelectedWaterType],
  );

  // Gets data that is associated with the selected water type
  React.useEffect(
    () => {
      if (!waterType || !waterTypes) return;

      const waterTypeData =
        waterType &&
        waterTypes &&
        waterTypes.filter((x) => waterType === x['simpleWaterType']);
      setWaterTypeData(waterTypeData);
    },
    [waterTypes, waterType],
  );

  // Handles user and auto use selection
  React.useEffect(
    () => {
      if (useList && useList.length > 0) {
        // set to the user's selection if it is availble
        if (useList.some((e) => e.useName.toUpperCase() === userSelectedUse)) {
          setUseSelected(titleCase(userSelectedUse));
        }

        // set to first item if the user's select cannot be found
        else {
          setUseSelected(titleCase(useList[0].useName));
        }
      } else {
        setUseSelected(''); // no data available
      }
    },
    [useList, userSelectedUse],
  );

  // Handles changes in the selected use
  React.useEffect(
    () => {
      if (
        !useSelected ||
        !surveyData ||
        !waterType ||
        !topicUses.hasOwnProperty(useSelected.toUpperCase())
      ) {
        if (surveyData) setSubPopulationCodes([]);
        return;
      }

      // build a list of subpopulation codes
      let subPopulationCodes = [];
      surveyData.surveyWaterGroups
        .filter((x) =>
          waterTypeOptions[waterType].includes(x['waterTypeGroupCode']),
        )
        .forEach((waterGroup) => {
          // ensure the waterGroup has a use that matches the selected use
          let hasUse = false;
          let surveyUseCodeUpper = '';
          let useSelectedUpper = '';
          let topicSurveyUseCode = '';
          waterGroup.surveyWaterGroupUseParameters.forEach((param) => {
            surveyUseCodeUpper = param.surveyUseCode.toUpperCase();
            useSelectedUpper = useSelected.toUpperCase();
            topicSurveyUseCode = topicUses[
              useSelectedUpper
            ].surveyuseCode.toUpperCase();
            if (
              surveyUseCodeUpper === useSelectedUpper ||
              surveyUseCodeUpper === topicSurveyUseCode
            ) {
              hasUse = true;
            }
          });

          // add the watergroup if it matches the filter criteria
          if (hasUse) subPopulationCodes.push(waterGroup);
        });

      // sort the subpopulation codes
      subPopulationCodes.sort((a, b) => {
        return a.subPopulationCode.localeCompare(b.subPopulationCode);
      });

      setSubPopulationCodes(subPopulationCodes);
    },
    [useSelected, surveyData, waterType, topicUses],
  );

  // setup order of the tabs
  const tabs = [
    {
      id: 'swimming',
      title: 'Swimming',
      icon: <SwimmingIcon height="2.5em" />,
    },
    {
      id: 'fishing',
      title: 'Fishing',
      icon: <FishingIcon height="2.5em" />,
    },
    {
      id: 'drinking',
      title: 'Drinking Water',
      icon: <DrinkingWaterIcon height="2.5em" />,
    },
    {
      id: 'other',
      title: 'Other',
      icon: <OtherIcon height="2.5em" />,
    },
  ];

  // get index of initial current topic (initialized to 'drinking' above)
  const initialTabIndex = tabs.map((tab) => tab.id).indexOf(currentTopic);

  // we need change the currentTopic whenever a tab changes, which means we
  // unfortunately  need to manage the activeTabIndex (an implementation detail)
  const [activeTabIndex, setActiveTabIndex] = React.useState(initialTabIndex);

  if (serviceError) {
    return (
      <StyledErrorBox>
        <p>{stateGeneralError}</p>
      </StyledErrorBox>
    );
  }

  if (noDataError) {
    return (
      <StyledErrorBox>
        <p>{stateNoDataError(activeState.name)}</p>
      </StyledErrorBox>
    );
  }

  if (loading || currentState !== activeState.code) return <LoadingSpinner />;

  return (
    <Container>
      <Heading>
        <i className="fas fa-tint" />
        <strong>{activeState.name}</strong> Water Quality
      </Heading>

      <h4>Choose a Topic:</h4>

      <TopicTabs>
        <Tabs
          index={activeTabIndex}
          onChange={(index) => {
            setActiveTabIndex(index);
            setCurrentTopic(tabs[index].id);
          }}
        >
          <TabList>
            {tabs.map((tab) => (
              <Tab key={tab.id}>
                <TopicIcon>{tab.icon}</TopicIcon>
                {tab.title}
              </Tab>
            ))}
          </TabList>

          <TabPanels>
            {tabs.map((tab) => (
              <TabPanel key={tab.id}>
                <FiltersSection>
                  <h4>Pick your Water Type and Use:</h4>

                  <Inputs>
                    <Input>
                      <label htmlFor={`water-type-${tab.id}`}>
                        Water Type:
                      </label>
                      <SelectStyled
                        inputId={`water-type-${tab.id}`}
                        classNamePrefix="Select"
                        options={displayWaterTypes.map((waterType) => {
                          return { value: waterType, label: waterType };
                        })}
                        value={
                          waterType
                            ? { value: waterType, label: waterType }
                            : null
                        }
                        onChange={(ev) => setUserSelectedWaterType(ev.value)}
                        isDisabled={displayWaterTypes.length <= 0}
                        placeholder={
                          displayWaterTypes.length <= 0
                            ? 'No Available Water Types'
                            : 'Select...'
                        }
                      />
                    </Input>

                    <Input>
                      <label htmlFor={`water-use-${tab.id}`}>Use:</label>
                      <SelectStyled
                        inputId={`water-use-${tab.id}`}
                        classNamePrefix="Select"
                        options={displayUses.map((use) => {
                          return { value: use, label: use };
                        })}
                        value={
                          useSelected
                            ? { value: useSelected, label: useSelected }
                            : null
                        }
                        onChange={(ev) =>
                          setUserSelectedUse(ev.value.toUpperCase())
                        }
                        isDisabled={displayUses.length <= 0}
                        placeholder={
                          displayUses.length <= 0
                            ? 'No Available Uses'
                            : 'Select...'
                        }
                      />
                    </Input>
                  </Inputs>
                </FiltersSection>

                <Section>
                  {surveyServiceError ? (
                    <StyledErrorBox>
                      <p>{stateSurveySectionError}</p>
                    </StyledErrorBox>
                  ) : (
                    <SurveyResults
                      loading={surveyLoading}
                      organizationId={organizationId}
                      activeState={activeState}
                      subPopulationCodes={subPopulationCodes}
                      surveyData={surveyData}
                      topicUses={topicUses}
                      useSelected={useSelected}
                      waterType={waterType}
                    />
                  )}
                </Section>

                <SiteSpecific
                  completeUseList={completeUseList}
                  activeState={activeState}
                  topic={currentTopic}
                  useSelected={useSelected}
                  waterType={waterType}
                  waterTypeData={waterTypeData}
                />

                <DrinkingWaterSection displayed={currentTopic === 'drinking'}>
                  <h3>
                    <ImageIcon src={drinkingWaterIcon} alt="Drinking Water" />
                    Drinking Water Information for{' '}
                    <strong>{activeState.name}</strong>
                  </h3>

                  <h4>EPA has defined three types of public water systems:</h4>

                  {tab.id === 'drinking' && (
                    <WaterSystemSummary state={activeState} />
                  )}

                  <DrinkingWaterText>
                    <a
                      href={
                        `https://ofmpub.epa.gov/apex/sfdw/f?p=108:103:::` +
                        `NO:APP,RP:P0_PRIMACY_AGENCY:${activeState.code}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View detailed drinking water data for {activeState.name}.
                    </a>
                  </DrinkingWaterText>
                </DrinkingWaterSection>
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </TopicTabs>

      <Accordions>
        <AccordionItem
          icon={<AccordionIcon className="fas fa-file-alt" />}
          title={
            <Heading>
              <strong>{activeState.name}</strong> Documents
            </Heading>
          }
        >
          <AccordionContent>
            <Documents
              activeState={activeState}
              surveyLoading={surveyLoading}
              surveyDocuments={surveyDocuments}
              assessmentsLoading={assessmentsLoading}
              assessmentDocuments={assessmentDocuments}
              documentServiceError={documentServiceError}
              surveyServiceError={surveyServiceError}
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem
          icon={<AccordionIcon className="fas fa-newspaper" />}
          title={
            <Heading>
              <strong>{activeState.name}</strong> Water Stories
            </Heading>
          }
        >
          <AccordionContent>
            <Stories stories={stories} />
          </AccordionContent>
        </AccordionItem>
      </Accordions>
    </Container>
  );
}

export default WaterQualityOverview;
