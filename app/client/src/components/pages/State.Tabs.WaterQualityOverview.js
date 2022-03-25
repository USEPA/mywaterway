// @flow

import React, { useCallback, useContext, useEffect, useState } from 'react';
import { css } from 'styled-components/macro';
import Select from 'react-select';
import { Tabs, TabList, Tab, TabPanel, TabPanels } from '@reach/tabs';
// components
import { tabsStyles, tabPanelStyles } from 'components/shared/ContentTabs';
import { AccordionList, AccordionItem } from 'components/shared/Accordion';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import {
  AquaticLifeIcon,
  DrinkingWaterIcon,
  EatingFishIcon,
  OtherIcon,
  SwimmingIcon,
} from 'components/shared/Icons';
import WaterSystemSummary from 'components/shared/WaterSystemSummary';
import SurveyResults from 'components/pages/State.Tabs.WaterQualityOverview.SurveyResults';
import SiteSpecific from 'components/pages/State.Tabs.WaterQualityOverview.SiteSpecific';
import Documents from 'components/pages/State.Tabs.WaterQualityOverview.Documents';
import Stories from 'components/pages/State.Tabs.WaterQualityOverview.Stories';
// styled components
import { errorBoxStyles } from 'components/shared/MessageBoxes';
// styles
import { colors, reactSelectStyles } from 'styles/index.js';
// contexts
import { StateTabsContext } from 'contexts/StateTabs';
import {
  useServicesContext,
  useStateNationalUsesContext,
  useWaterTypeOptionsContext,
} from 'contexts/LookupFiles';
// utilities
import { fetchCheck } from 'utils/fetchUtils';
import { normalizeString, titleCase } from 'utils/utils';
// images
import drinkingWaterIcon from 'images/drinking-water.png';
// errors
import {
  stateSurveySectionError,
  stateGeneralError,
  stateMetricsError,
  stateNoDataError,
} from 'config/errorMessages';

function relabelWaterType(oldLabel, waterTypeOptions) {
  let newLabel = 'Other Types';
  Object.entries(waterTypeOptions.data).forEach((waterTypeOption) => {
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
  if (topic === 'ecological') return 'Ecological Life';
  if (topic === 'other') return 'Other';
}

function hasUseValues(use) {
  return (
    use['Fully Supporting'] > 0 ||
    use['Fully Supporting-count'] > 0 ||
    use['Not Supporting'] > 0 ||
    use['Not Supporting-count'] > 0 ||
    use['Insufficient Information'] > 0 ||
    use['Insufficient Information-count'] > 0
  );
}

const containerStyles = css`
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

const newTabDisclaimerStyles = css`
  display: block;
  margin-bottom: 1.25rem;
`;

const topicTabsStyles = css`
  ${tabsStyles}

  [data-reach-tab] {
    padding: 0.625em 0.625em 0.875em !important;
    font-size: 0.875em !important;
    background-color: #0674ba !important;

    &[data-selected],
    &:hover,
    &:focus {
      background-color: #165277 !important;
    }
  }

  [data-reach-tab-panel] {
    padding-bottom: 0 !important;
  }
`;

const tabContainerStyles = css`
  background-color: #0774ba;
  @media (max-width: 450px) {
    flex-wrap: wrap;
  }
`;

const topicTabStyles = css`
  @media (max-width: 450px) {
    border-top: 1px solid black;
    &:first-child {
      border-top: 0;
    }
  }
`;

const topicIconStyles = css`
  display: flex;
  margin: 0 auto;
  width: 2.5em;
  height: 2.5em;
`;

const headingStyles = css`
  margin-top: 0 !important;

  i {
    margin-right: 0.3125em;
    color: #2c72b5;
  }
`;

const sectionStyles = css`
  margin-bottom: 1.5em;
`;

const filtersSectionStyles = css`
  ${sectionStyles}
  margin-top: -1.5em;
  margin-left: -1.5em;
  padding: 1.5em;
  border-bottom: 1px solid #d8dfe2;
  width: calc(100% + 3em);
  background-color: whitesmoke;
`;

const drinkingWaterSectionStyles = css`
  ${sectionStyles}
  display: ${({ displayed }) => (displayed ? 'block' : 'none')};
  /* add top border to replicate bottom accordion border that was
  removed from 'Top Polltants' accordion in SiteSpecific component */
  margin-left: -1.5em;
  padding: 1.5em 1.5em 0;
  border-top: 1px solid ${colors.slate()};
  width: calc(100% + 3em);
`;

const drinkingWaterTextStyles = css`
  padding-bottom: 0;
`;

const inputsStyles = css`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
`;

const inputStyles = css`
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

const accordionsStyles = css`
  border-bottom: none;

  margin: 1.5em 0 -1.5em -1.5em !important;
  width: calc(100% + 3em) !important;
`;

const accordionContentStyles = css`
  padding: 0.25em 1.5em 1.5em;
`;

const accordionIconStyles = css`
  width: 1.125em;
  font-size: 1.625em;
  color: #2c72b5;
  text-align: center;
`;

const selectStyles = css`
  .Select__control--is-disabled {
    background-color: #e9ecef;
    border-color: #ced4da;
  }

  .Select__placeholder {
    color: #495057;
  }
`;

const imageIconStyles = css`
  position: relative;
  bottom: 0.125em;
  left: -0.3125em;
  margin-right: -0.3125em;
  max-width: 1.75em;
  max-height: 1.75em;
`;

const linkListStyles = css`
  padding-bottom: 0;
`;

const noDataMessageStyles = css`
  padding-bottom: 0;
`;

// --- components ---
type Props = {};

function WaterQualityOverview({ ...props }: Props) {
  const services = useServicesContext();
  const stateNationalUses = useStateNationalUsesContext();
  const waterTypeOptions = useWaterTypeOptionsContext();
  const {
    activeState,
    currentReportingCycle,
    setCurrentReportingCycle,
    introText,
    setIntroText,
    setCurrentReportStatus,
    setCurrentSummary,
    setUsesStateSummaryServiceError,
    stateAndOrganization,
    setStateAndOrganization,
  } = useContext(StateTabsContext);

  const [loading, setLoading] = useState(true);
  const [surveyLoading, setSurveyLoading] = useState(true);
  const [assessmentsLoading, setAssessmentsLoading] = useState(true);
  const [serviceError, setServiceError] = useState(false);
  const [documentServiceError, setDocumentServiceError] = useState(false);
  const [surveyServiceError, setSurveyServiceError] = useState(false);
  const [noDataError, setNoDataError] = useState(false);
  const [currentState, setCurrentState] = useState('');
  const [currentStateData, setCurrentStateData] = useState({});
  const [yearSelected, setYearSelected] = useState('');
  const [waterType, setWaterType] = useState('');
  const [useSelected, setUseSelected] = useState('');
  const [currentTopic, setCurrentTopic] = useState('swimming');
  const [waterTypes, setWaterTypes] = useState(null);
  const [waterTypeData, setWaterTypeData] = useState(null);

  const [surveyData, setSurveyData] = useState(null);
  const [assessmentDocuments, setAssessmentDocuments] = useState(null);

  const [fishingAdvisoryData, setFishingAdvisoryData] = useState({
    status: 'fetching',
    data: [],
  });

  const [topicUses, setTopicUses] = useState({});
  const [useList, setUseList] = useState([]);
  const [completeUseList, setCompleteUseList] = useState([]);

  // user selections
  const [userSelectedWaterType, setUserSelectedWaterType] = useState('');
  const [userSelectedUse, setUserSelectedUse] = useState('');

  // dropdown lists
  const [displayWaterTypes, setDisplayWaterTypes] = useState([]);
  const [displayUses, setDisplayUses] = useState([]);
  const [subPopulationCodes, setSubPopulationCodes] = useState([]);

  // documents
  const [surveyDocuments, setSurveyDocuments] = useState([]);

  // stories
  const [stories, setStories] = useState({
    status: 'fetching',
    data: [],
    nextUrl: '',
  });
  // Get the assessments
  const fetchAssessments = useCallback(
    (orgID, year) => {
      // use the excludeAsssessments flag to improve performance, since we only
      // need the documents and reportStatusCode
      const url = `${services.data.attains.serviceUrl}assessments?organizationId=${orgID}&reportingCycle=${year}&excludeAssessments=Y`;
      fetchCheck(url)
        .then((res) => {
          setAssessmentsLoading(false);

          if (!res || !res.items || res.items.length === 0) {
            setAssessmentDocuments([]);
          }

          const orgData = res.items[0];
          setAssessmentDocuments(orgData.documents);

          setCurrentReportStatus(orgData.reportStatusCode);
        })
        .catch((err) => {
          console.error(err);
          setDocumentServiceError(true);
          setAssessmentsLoading(false);
          setCurrentReportStatus('Error getting 303(d) List Status');
        });
    },
    [setCurrentReportStatus, services],
  );

  // Get the state intro text
  const fetchIntroText = useCallback(
    (orgID) => {
      const url = `${services.data.attains.serviceUrl}metrics?organizationId=${orgID}`;
      fetchCheck(url)
        .then((res) => {
          // check for missing data
          if (res.length === 0) {
            setIntroText({ status: 'failure', data: {} });
            return;
          }

          setIntroText({ status: 'success', data: res[0] });
        })
        .catch((err) => {
          console.error('Error with metrics org ID web service: ', err);
          setSurveyServiceError(true);
          setIntroText({ status: 'failure', data: {} });
        });
    },
    [setIntroText, services],
  );

  // summary service has the different years of data for recreation/eco/fish/water/other
  const [usesStateSummaryCalled, setUsesStateSummaryCalled] = useState(false);
  useEffect(() => {
    if (
      !stateAndOrganization ||
      currentReportingCycle.status === 'fetching' ||
      usesStateSummaryCalled
    ) {
      return;
    }

    if (currentReportingCycle.status === 'failure') {
      setUsesStateSummaryCalled(true);
      setServiceError(true);
      setLoading(false);
      setCurrentSummary({
        status: 'failure',
        data: {},
      });
      return;
    }

    const reportingCycleParam = currentReportingCycle.reportingCycle
      ? `&reportingCycle=${currentReportingCycle.reportingCycle}`
      : '';

    const url =
      `${services.data.attains.serviceUrl}usesStateSummary` +
      `?organizationId=${stateAndOrganization.organizationId}` +
      reportingCycleParam;

    fetchCheck(url)
      .then((res) => {
        // for states like Alaska that have no reporting cycles
        if (
          !res.data ||
          !res.data.reportingCycles ||
          res.data.reportingCycles.length === 0
        ) {
          setUsesStateSummaryServiceError(true);
          setLoading(false);
          return;
        }

        setCurrentStateData(res.data);

        // get the latest reporting cycle
        let latestReportingCycle = '';
        let currentSummary;
        if (res.data.reportingCycles && res.data.reportingCycles.length > 0) {
          currentSummary = res.data.reportingCycles.sort(
            (a, b) =>
              parseFloat(b.reportingCycle) - parseFloat(a.reportingCycle),
          )[0];
          latestReportingCycle = currentSummary.reportingCycle;
        }

        setYearSelected(latestReportingCycle);
        setCurrentSummary({
          status: 'success',
          data: currentSummary,
        });
        if (!reportingCycleParam) {
          setCurrentReportingCycle({
            status: 'success',
            reportingCycle: latestReportingCycle,
          });
        }
        setLoading(false);

        fetchAssessments(
          stateAndOrganization.organizationId,
          latestReportingCycle,
        );
      })
      .catch((err) => {
        console.error('Error with attains summary web service: ', err);

        // for states like Arkansas that cause internal server errors in ATTAINS when queried
        if (err.status === 500) {
          setUsesStateSummaryServiceError(true);
          return;
        }

        setServiceError(true);
        setLoading(false);
        setCurrentSummary({
          status: 'failure',
          data: {},
        });
      });

    setUsesStateSummaryCalled(true);
  }, [
    fetchAssessments,
    setCurrentSummary,
    setUsesStateSummaryServiceError,
    stateAndOrganization,
    currentReportingCycle,
    setCurrentReportingCycle,
    usesStateSummaryCalled,
    services,
  ]);

  // Get fishing advisory information
  const fetchFishingAdvisoryData = useCallback(
    (stateCode) => {
      setFishingAdvisoryData({ status: 'fetching', data: [] });

      const url =
        services.data.fishingInformationService.serviceUrl +
        services.data.fishingInformationService.queryStringFirstPart +
        `'${stateCode}'` +
        services.data.fishingInformationService.queryStringSecondPart;

      fetchCheck(url)
        .then((res) => {
          if (!res || !res.features || res.features.length === 0) {
            setFishingAdvisoryData({ status: 'success', data: [] });
            return;
          }

          const fishingInfo = [
            {
              url: res.features[0].attributes.STATEURL,
            },
          ];

          setFishingAdvisoryData({ status: 'success', data: fishingInfo });
        })
        .catch((err) => {
          console.error(err);
          setFishingAdvisoryData({ status: 'failure', data: [] });
        });
    },
    [setFishingAdvisoryData, services],
  );

  // Get the survey data and survey documents
  const fetchSurveyData = useCallback(
    (orgID) => {
      const url = `${services.data.attains.serviceUrl}surveys?organizationId=${orgID}`;
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
    },
    [services],
  );

  // get state organization ID for summary service
  const fetchStateOrgId = useCallback(
    (stateID: string) => {
      const url = `${services.data.attains.serviceUrl}states/${stateID}/organizations`;
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
            setStateAndOrganization({
              state: activeState.code,
              organizationId: orgID,
            });
            fetchIntroText(orgID);
            fetchSurveyData(orgID);
          } else {
            console.log(
              'Attains did not return any organization info for ',
              stateID,
            );
            setNoDataError(true);
            setLoading(false);
            setSurveyLoading(false);
          }
        })
        .catch((err) => {
          console.error('Error with attains org ID web service: ', err);
          setServiceError(true);
          setLoading(false);
        });
    },
    [
      fetchIntroText,
      fetchSurveyData,
      services,
      setStateAndOrganization,
      activeState,
    ],
  );

  // If the user changes the search
  useEffect(() => {
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
      setUsesStateSummaryCalled(false);

      setCurrentState(activeState.code);
      fetchStateOrgId(activeState.code);
      fetchFishingAdvisoryData(activeState.code);

      setCurrentSummary({
        status: 'fetching',
        data: {},
      });
      setIntroText({
        status: 'fetching',
        data: {},
      });
      setStories({
        status: 'fetching',
        data: [],
        nextUrl: `${services.data.grts.getSSByState}${activeState.code}`,
      });
    }
  }, [
    currentState,
    activeState,
    setCurrentReportStatus,
    setCurrentSummary,
    setIntroText,
    fetchStateOrgId,
    fetchFishingAdvisoryData,
    services,
  ]);

  // fetch the stories from the provided url. This also saves the next stories
  // url to nextStoriesUrl, if the web service provided it, and the useEffect
  // will execute the fetch again.
  useEffect(() => {
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
  }, [stories]);

  // Gets a list of uses that pertain to the current topic
  useEffect(() => {
    if (activeState.code === '' || stateNationalUses.status !== 'success') {
      return;
    }

    let category = formatTopic(currentTopic);

    //get the list of possible uses
    let possibleUses = {};
    stateNationalUses.data.forEach((item) => {
      if (item.state === activeState.code && item.category === category) {
        // make sure to use upper case to prevent duplicate uses
        possibleUses[normalizeString(item.name)] = item;
      }
    });

    setTopicUses(possibleUses);
  }, [currentTopic, activeState, waterTypeData, stateNationalUses]);

  // Gets a unique list of water types that have data that is relevant to
  // the current topic
  useEffect(() => {
    if (waterTypeOptions.status !== 'success');
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
                topicUses.hasOwnProperty(normalizeString(use.useName)) &&
                hasUseValues(use)
              ) {
                hasUse = true;
              }
            });

            if (hasUse) {
              return relabelWaterType(item.waterTypeCode, waterTypeOptions);
            } else return null;
          })
          .map((item) =>
            relabelWaterType(item.waterTypeCode, waterTypeOptions),
          ),
      ),
    ].sort();

    setDisplayWaterTypes(displayWaterTypes);
  }, [waterTypes, topicUses, waterTypeOptions]);

  // Builds use lists that will be used for displaying in dropdowns and
  // building graphs with aggregrate data.
  useEffect(() => {
    // fill in the use list dropdown
    let addedUses = [];
    let useList = []; //used for dropdown (excludes duplicate names)
    let completeUseList = []; //used for aggregrate data (includes duplicate names)
    if (waterTypeData) {
      waterTypeData.forEach((waterTypeItem) => {
        waterTypeItem['useAttainments'].forEach((use) => {
          let useName = normalizeString(use.useName);
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
      .filter((use) => topicUses.hasOwnProperty(normalizeString(use.useName)))
      .map((use) => titleCase(use.useName))
      .sort();
    setDisplayUses(displayUses);
  }, [topicUses, waterTypeData, useSelected]);

  // Handles user year changes and gets data associated with the selected year.
  useEffect(() => {
    if (waterTypeOptions.status !== 'success') return;
    let yearData =
      yearSelected &&
      currentStateData.reportingCycles &&
      currentStateData.reportingCycles.length > 0 &&
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
        Object.entries(waterTypeOptions.data).forEach((option) => {
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
  }, [currentTopic, yearSelected, currentStateData, waterTypeOptions]);

  // Handles user and auto water type selection
  useEffect(() => {
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
  }, [displayWaterTypes, userSelectedWaterType]);

  // Gets data that is associated with the selected water type
  useEffect(() => {
    if (!waterType || !waterTypes) return;

    const waterTypeData =
      waterType &&
      waterTypes &&
      waterTypes.filter((x) => waterType === x['simpleWaterType']);
    setWaterTypeData(waterTypeData);
  }, [waterTypes, waterType]);

  // Handles user and auto use selection
  useEffect(() => {
    if (useList && useList.length > 0) {
      // set to the user's selection if it is availble
      if (useList.some((e) => normalizeString(e.useName) === userSelectedUse)) {
        setUseSelected(titleCase(userSelectedUse));
      }

      // set to first item if the user's select cannot be found
      else {
        setUseSelected(titleCase(useList[0].useName));
      }
    } else {
      setUseSelected(''); // no data available
    }
  }, [useList, userSelectedUse]);

  // Handles changes in the selected use
  useEffect(() => {
    if (
      !useSelected ||
      !surveyData ||
      !waterType ||
      !topicUses.hasOwnProperty(normalizeString(useSelected)) ||
      waterTypeOptions.status !== 'success'
    ) {
      if (surveyData) setSubPopulationCodes([]);
      return;
    }

    // build a list of subpopulation codes
    let subPopulationCodes = [];
    surveyData.surveyWaterGroups
      .filter((x) =>
        waterTypeOptions.data[waterType].includes(x['waterTypeGroupCode']),
      )
      .forEach((waterGroup) => {
        // ensure the waterGroup has a use that matches the selected use
        let hasUse = false;
        let surveyUseCodeUpper = '';
        let useSelectedUpper = '';
        let topicSurveyUseCode = '';
        waterGroup.surveyWaterGroupUseParameters.forEach((param) => {
          surveyUseCodeUpper = normalizeString(param.surveyUseCode);
          useSelectedUpper = normalizeString(useSelected);
          topicSurveyUseCode = normalizeString(
            topicUses[useSelectedUpper].surveyuseCode,
          );

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
  }, [useSelected, surveyData, waterType, topicUses, waterTypeOptions]);

  // setup order of the tabs
  const tabs = [
    {
      id: 'swimming',
      title: 'Swimming',
      icon: <SwimmingIcon height="2.5em" />,
    },
    {
      id: 'fishing',
      title: 'Eating Fish',
      icon: <EatingFishIcon height="2.5em" />,
    },
    {
      id: 'ecological',
      title: 'Aquatic Life',
      icon: <AquaticLifeIcon height="2.5em" />,
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
  const [activeTabIndex, setActiveTabIndex] = useState(initialTabIndex);

  if (
    serviceError ||
    waterTypeOptions.status === 'failure' ||
    stateNationalUses.status === 'failure'
  ) {
    return (
      <div css={errorBoxStyles}>
        <p>{stateGeneralError}</p>
      </div>
    );
  }

  if (noDataError) {
    return (
      <div css={errorBoxStyles}>
        <p>{stateNoDataError(activeState.name)}</p>
      </div>
    );
  }

  if (
    loading ||
    currentState !== activeState.code ||
    waterTypeOptions.status === 'fetching'
  ) {
    return <LoadingSpinner />;
  }

  return (
    <div css={containerStyles}>
      <h2 css={headingStyles}>
        <i className="fas fa-tint" aria-hidden="true" />
        <strong>{activeState.name}</strong> Water Quality
      </h2>

      <h3>Choose a Topic:</h3>

      <div css={topicTabsStyles}>
        <Tabs
          index={activeTabIndex}
          onChange={(index) => {
            setActiveTabIndex(index);
            setCurrentTopic(tabs[index].id);
          }}
        >
          <TabList css={tabContainerStyles}>
            {tabs.map((tab) => (
              <Tab
                css={topicTabStyles}
                key={tab.id}
                data-testid={`hmw-${tab.id}-tab-button`}
              >
                <div css={topicIconStyles}>{tab.icon}</div>
                {tab.title}
              </Tab>
            ))}
          </TabList>

          <TabPanels>
            {tabs.map((tab) => (
              <TabPanel
                css={tabPanelStyles}
                key={tab.id}
                data-testid={`hmw-${tab.id}-tab-panel`}
              >
                <div css={filtersSectionStyles}>
                  <h4>Pick your Water Type and Use:</h4>

                  <div css={inputsStyles}>
                    <div css={inputStyles}>
                      <label htmlFor={`water-type-input-${tab.id}`}>
                        Water Type:
                      </label>
                      <Select
                        css={selectStyles}
                        id={`water-type-${tab.id}`}
                        inputId={`water-type-input-${tab.id}`}
                        classNamePrefix="Select"
                        isSearchable={false}
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
                        styles={reactSelectStyles}
                      />
                    </div>

                    <div css={inputStyles}>
                      <label htmlFor={`water-use-input-${tab.id}`}>Use:</label>
                      <Select
                        css={selectStyles}
                        id={`water-use-${tab.id}`}
                        inputId={`water-use-input-${tab.id}`}
                        classNamePrefix="Select"
                        isSearchable={false}
                        options={displayUses.map((use) => {
                          return { value: use, label: use };
                        })}
                        value={
                          useSelected
                            ? { value: useSelected, label: useSelected }
                            : null
                        }
                        onChange={(ev) =>
                          setUserSelectedUse(normalizeString(ev.value))
                        }
                        isDisabled={displayUses.length <= 0}
                        placeholder={
                          displayUses.length <= 0
                            ? 'No Available Uses'
                            : 'Select...'
                        }
                        styles={reactSelectStyles}
                      />
                    </div>
                  </div>
                </div>

                <div css={sectionStyles}>
                  {surveyServiceError || !stateAndOrganization ? (
                    <div css={errorBoxStyles}>
                      <p>{stateSurveySectionError}</p>
                    </div>
                  ) : (
                    <SurveyResults
                      loading={surveyLoading}
                      organizationId={stateAndOrganization.organizationId}
                      activeState={activeState}
                      subPopulationCodes={subPopulationCodes}
                      surveyData={surveyData}
                      topicUses={topicUses}
                      useSelected={useSelected}
                      waterType={waterType}
                    />
                  )}
                </div>

                <SiteSpecific
                  completeUseList={completeUseList}
                  activeState={activeState}
                  topic={currentTopic}
                  useSelected={useSelected}
                  waterType={waterType}
                  waterTypeData={waterTypeData}
                  fishingAdvisoryData={fishingAdvisoryData}
                />

                <div
                  css={drinkingWaterSectionStyles}
                  displayed={currentTopic === 'drinking'}
                >
                  <h3>
                    <img
                      css={imageIconStyles}
                      src={drinkingWaterIcon}
                      alt="Drinking Water"
                    />
                    Drinking Water Information for{' '}
                    <strong>{activeState.name}</strong>
                  </h3>

                  <h4>EPA has defined three types of public water systems:</h4>

                  {tab.id === 'drinking' && activeState.code && (
                    <WaterSystemSummary state={activeState} />
                  )}

                  <p css={drinkingWaterTextStyles}>
                    <a
                      href={
                        `https://ofmpub.epa.gov/apex/sfdw/f?p=108:103:::` +
                        `NO:APP,RP:P0_PRIMACY_AGENCY:${activeState.code}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View detailed drinking water data for {activeState.name}.
                    </a>{' '}
                    <small>(opens new browser tab)</small>
                  </p>
                </div>
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </div>

      <AccordionList css={accordionsStyles}>
        <AccordionItem
          highlightContent={false}
          icon={
            <i
              css={accordionIconStyles}
              className="fas fa-file-alt"
              aria-hidden="true"
            />
          }
          title={
            <h2 css={headingStyles}>
              <strong>{activeState.name}</strong> Documents
            </h2>
          }
        >
          <div css={accordionContentStyles}>
            <em css={newTabDisclaimerStyles}>
              Documents below open in a new browser tab.
            </em>
            <Documents
              activeState={activeState}
              surveyLoading={surveyLoading}
              surveyDocuments={surveyDocuments}
              assessmentsLoading={assessmentsLoading}
              assessmentDocuments={assessmentDocuments}
              documentServiceError={documentServiceError}
              surveyServiceError={surveyServiceError}
            />
          </div>
        </AccordionItem>
        <AccordionItem
          highlightContent={false}
          icon={
            <i
              css={accordionIconStyles}
              className="fas fa-newspaper"
              aria-hidden="true"
            />
          }
          title={
            <h2 css={headingStyles}>
              <strong>{activeState.name}</strong> Water Stories
            </h2>
          }
        >
          <div css={accordionContentStyles}>
            <em css={newTabDisclaimerStyles}>
              Stories below open in a new browser tab.
            </em>
            <Stories stories={stories} />
          </div>
        </AccordionItem>
        <AccordionItem
          highlightContent={false}
          icon={
            <i
              css={accordionIconStyles}
              className="fas fa-info-circle"
              aria-hidden="true"
            />
          }
          title={
            <h2 css={headingStyles}>
              More Information for <strong>{activeState.name}</strong>
            </h2>
          }
        >
          <div css={accordionContentStyles}>
            {introText.status === 'fetching' && <LoadingSpinner />}
            {introText.status === 'failure' && (
              <div css={errorBoxStyles}>
                <p>{stateMetricsError}</p>
              </div>
            )}
            {introText.status === 'success' && (
              <>
                {introText.data.organizationURLs.length === 0 ? (
                  <p css={noDataMessageStyles}>
                    No additional information available for this state.
                  </p>
                ) : (
                  <>
                    <em css={newTabDisclaimerStyles}>
                      Links below open in a new browser tab.
                    </em>
                    <ul css={linkListStyles}>
                      {introText.data.organizationURLs.map((item, index) => {
                        return (
                          <li key={index}>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {item.label ? item.label : item.url}
                            </a>
                            <a
                              className="exit-disclaimer"
                              href="https://www.epa.gov/home/exit-epa"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              EXIT
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        </AccordionItem>
      </AccordionList>
    </div>
  );
}

export default WaterQualityOverview;
