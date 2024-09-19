/** @jsxImportSource @emotion/react */

import { css } from '@emotion/react';
import { Fragment, useContext, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { WindowSize } from '@reach/window-size';
import StickyBox from 'react-sticky-box';
// components
import Page from 'components/shared/Page';
import NavBar from 'components/shared/NavBar';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import ReactTable from 'components/shared/ReactTable';
import WaterbodyIcon from 'components/shared/WaterbodyIcon';
import ActionsMap from 'components/shared/ActionsMap';
import { AccordionList, AccordionItem } from 'components/shared/Accordion';
import MapVisibilityButton from 'components/shared/MapVisibilityButton';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import DynamicExitDisclaimer from 'components/shared/DynamicExitDisclaimer';
// styled components
import { errorBoxStyles, infoBoxStyles } from 'components/shared/MessageBoxes';
import {
  splitLayoutContainerStyles,
  splitLayoutColumnsStyles,
  splitLayoutColumnStyles,
} from 'components/shared/SplitLayout';
import {
  boxStyles,
  boxHeadingStyles,
  boxSectionStyles,
} from 'components/shared/Box';
// contexts
import { useConfigFilesState } from 'contexts/ConfigFiles';
import { LayersProvider } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
import { MapHighlightProvider } from 'contexts/MapHighlight';
// utilities
import { fetchCheck, fetchPost } from 'utils/fetchUtils';
import {
  getPollutantsFromAction,
  mapRestorationPlanToGlossary,
} from 'utils/mapFunctions';
import { titleCaseWithExceptions } from 'utils/utils';
// styles
import { colors } from 'styles/index';
// errors
import { waterbodyReportError } from 'config/errorMessages';

const containerStyles = css`
  ${splitLayoutContainerStyles};

  table {
    margin-top: 0.75rem;
    margin-bottom: 0;
    table-layout: fixed;
  }

  th,
  td {
    font-size: 0.875rem;
    line-height: 1.25;
    overflow-wrap: break-word;

    &:last-child {
      text-align: right;
    }
  }

  hr {
    margin-top: 0.125rem;
    margin-bottom: 0.875rem;
    border-top-color: #aebac3;
  }
`;

const containerContentExpandStyles = css`
  display: flex;
  align-items: center;
  height: 40px;
  width: 100%;
  margin-left: 0.5rem;
`;

const infoBoxContainerStyles = css`
  padding: 1.5em;
  padding-bottom: 0;
  line-height: 1.375;
`;

const pageErrorBoxStyles = css`
  ${errorBoxStyles};
  margin: 1rem;
  text-align: center;
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles};
  text-align: center;
`;

const modifiedInfoBoxStyles = css`
  ${infoBoxStyles}
  text-align: center;
`;

const mapInfoBoxStyles = css`
  ${modifiedInfoBoxStyles}
  margin-bottom: 10px;
`;

const infoBoxHeadingStyles = css`
  ${boxHeadingStyles};
  display: flex;
  align-items: center;

  small {
    display: block;
    margin-top: 0.125rem;
  }

  /* loading icon */
  svg {
    margin: 0 -0.375rem 0 -0.875rem;
    height: 1.5rem;
  }

  /* status icon */
  span svg {
    margin-left: -0.25rem;
    margin-right: 0.375rem;
  }
`;

const inlineBoxSectionStyles = css`
  ${boxSectionStyles};

  /* loading icon */
  svg {
    display: inline-block;
    margin: -0.5rem;
    height: 1.25rem;
  }

  h4,
  p {
    display: inline-block;
    margin-top: 0;
    margin-bottom: 0;
    line-height: 1.25;
  }
`;

const modifiedBoxSectionStyles = css`
  ${boxSectionStyles}

  p {
    margin-top: 0;
  }
`;

const rationaleStyles = css`
  margin-top: 0 !important;
`;

const accordionContentStyles = css`
  padding: 0.4375em 0.875em 0.875em;
`;

const useNameStyles = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  line-height: 1.125;
`;

const waterbodyUseStatusStyles = (textColor, bgColor) => css`
  flex-shrink: 0; /* prevent wrapping on whitespace */
  display: inline-block;
  margin-top: 0 !important;
  margin-left: 0.5rem;
  padding: 0.1875rem 0.5625rem !important;
  border-radius: 3px;
  font-size: 0.75rem !important;
  line-height: 1.375;
  color: ${textColor};
  background-color: ${bgColor};
  user-select: none;
`;

const textStyles = css`
  padding-bottom: 1.5em !important; /* match ul padding-bottom */
`;

const parameterCategoryStyles = css`
  margin-top: 0 !important;
  padding-bottom: 0.375em !important;
  font-style: italic;
  font-size: 1em !important;
  color: #526571;
  font-weight: bold;
`;

const parameterStyles = css`
  border-bottom: 1px dotted #eee;
  &:last-of-type {
    border-bottom: none;
  }
`;

const tableStyles = css`
  th {
    vertical-align: middle !important;
  }
`;

const dateCellStyles = css`
  @media (min-width: 25em) {
    white-space: nowrap;
  }
`;

const locationsStyles = css`
  padding-bottom: 0;
`;

const iconStyles = css`
  margin-right: 5px;
`;

const disclaimerStyles = css`
  display: inline-block;
`;

const conditions = {
  impaired: 'Impaired (Issues Identified)',
  good: 'Good',
  unknown: 'Condition Unknown',
};

function WaterbodyReport() {
  const { orgId, auId, reportingCycle } = useParams();

  const configFiles = useConfigFilesState();

  const [noWaterbodies, setNoWaterbodies] = useState(false);

  const [waterbodyName, setWaterbodyName] = useState('');
  const [waterbodyLocation, setWaterbodyLocation] = useState({
    status: 'fetching',
    text: '',
  });
  const [waterbodyTypes, setWaterbodyTypes] = useState({
    status: 'fetching',
    data: [],
  });
  const [monitoringLocations, setMonitoringLocations] = useState({
    status: 'fetching',
    data: [],
  });
  const [mapLayer, setMapLayer] = useState({
    status: 'fetching',
    layer: null,
  });

  function handleError() {
    setAllParameterActionIds({
      status: 'failure',
      data: [],
    });
    setReportingCycleFetch({ status: 'failure', year: '' });
    setWaterbodyStatus({ status: 'failure', data: [] });
    setWaterbodyUses({ status: 'failure', data: [] });
    setWaterbodySources({ status: 'failure', data: [] });
    setDocuments({ status: 'failure', data: [] });
    setOrganizationName({
      status: 'failure',
      name: '',
    });
  }

  function handleNoAssessments() {
    setWaterbodyStatus({
      status: 'no-data',
      data: { condition: '', planForRestoration: '', listed303d: '' },
    });
    setReportingCycleFetch({
      status: 'success',
      year: '',
    });
    setWaterbodyUses({
      status: 'success',
      data: [],
    });
    setOrganizationName({
      status: 'success',
      name: '',
    });
    setAllParameterActionIds({
      status: 'success',
      data: [],
    });
    setWaterbodySources({ status: 'success', data: [] });
    setDocuments({ status: 'success', data: [] });
  }

  // fetch waterbody name, location, types from attains 'assessmentUnits' web service
  useEffect(() => {
    const url =
      configFiles.data.services.attains.serviceUrl +
      `assessmentUnits?organizationId=${orgId}` +
      `&assessmentUnitIdentifier=${auId}`;

    fetchCheck(url).then(
      (res) => {
        if (res.items.length < 1) {
          setNoWaterbodies(true);
          return;
        }

        const {
          assessmentUnitName,
          locationDescriptionText,
          waterTypes,
          monitoringStations,
        } = res.items[0].assessmentUnits[0];

        setWaterbodyName(assessmentUnitName);
        setWaterbodyLocation({
          status: 'success',
          text: locationDescriptionText,
        });

        const types = waterTypes.map((type) => ({
          code: type.waterTypeCode,
          size: type.waterSizeNumber,
          units: type.unitsCode,
        }));

        setWaterbodyTypes({ status: 'success', data: types });

        // return early if no monitoring stations were returned
        if (monitoringStations.length === 0) {
          setMonitoringLocations({ status: 'success', data: [] });
          return;
        }

        // create easier to handle 'stations' array from 'monitoringStations'
        const stations = monitoringStations.map((station) => ({
          orgId: station.monitoringOrganizationIdentifier,
          locId: station.monitoringLocationIdentifier,
        }));

        // build the post reqest
        const wqpUrl = `${configFiles.data.services.waterQualityPortal.stationSearch}mimeType=geojson`;
        const headers = { 'content-type': 'application/json' };
        const data = {
          siteid: stations.map((s) => {
            return `${s.orgId.trim()}-${s.locId.trim()}`;
          }),
        };

        // fetch monitoring locations from water quality portal 'station search' web service
        fetchPost(wqpUrl, data, headers).then(
          (geojson) => {
            // match monitoring stations returned from the attains 'assessmentUnits' web service
            // with features returned in the water quality portal 'station search' web service
            // (NOTE: there won't always be a match for every monitoring station)
            const locations = stations.map((station) => {
              const { orgId, locId } = station;

              // match via monitoring location identifier
              const match = geojson.features.filter((feature) => {
                const { MonitoringLocationIdentifier } = feature.properties;
                return MonitoringLocationIdentifier === `${orgId}-${locId}`;
              })[0];

              const name = match
                ? match.properties['MonitoringLocationName']
                : '';

              const url = match
                ? `${configFiles.data.services.waterQualityPortal.monitoringLocationDetails}` +
                  `${match.properties['ProviderName']}/` +
                  `${match.properties['OrganizationIdentifier']}/` +
                  `${match.properties['MonitoringLocationIdentifier']}/`
                : '';

              return { orgId, locId, name, url };
            });

            setMonitoringLocations({ status: 'success', data: locations });
          },
          (err) => {
            setMonitoringLocations({ status: 'failure', data: [] });
            console.error(err);
          },
        );
      },
      (err) => {
        console.error(err);
        setWaterbodyTypes({ status: 'failure', data: [] });
        setWaterbodyLocation({ status: 'failure', text: '' });
      },
    );
  }, [auId, configFiles, orgId]);

  // get all reporting cycles for the waterbody
  const [allReportingCycles, setAllReportingCycles] = useState({
    status: 'fetching',
    data: [],
  });
  useEffect(() => {
    // recursive function to page through all reporting cycles
    async function fetchCycles(acc = []) {
      try {
        const res = await fetchPost(
          `${configFiles.data.services.expertQuery.attains}/assessmentUnits/values/reportingCycle`,
          {
            direction: 'asc',
            filters: { assessmentUnitId: auId },
            limit: configFiles.data.services.expertQuery.valuesLimit,
            ...(acc.length > 0 && { comparand: acc[acc.length - 1] }),
          },
          {
            'Content-Type': 'application/json',
            'X-Api-Key': configFiles.data.services.expertQuery.apiKey,
          },
        );
        const newValues = res.map((item) => item.reportingCycle);
        if (
          newValues.length === configFiles.data.services.expertQuery.valuesLimit
        ) {
          fetchCycles(acc.concat(newValues));
        } else {
          setAllReportingCycles({
            status: 'success',
            data: acc.concat(newValues),
          });
        }
      } catch (err) {
        console.error(err);
        setAllReportingCycles({ status: 'failure', data: [] });
        handleError();
      }
    }

    fetchCycles();
  }, [auId, configFiles]);

  const [reportingCycleFetch, setReportingCycleFetch] = useState({
    status: 'fetching',
    year: '',
  });
  const [organizationName, setOrganizationName] = useState({
    status: 'fetching',
    name: '',
  });
  const [decisionRationale, setDecisionRationale] = useState('');
  const [waterbodyStatus, setWaterbodyStatus] = useState({
    status: 'fetching',
    data: { condition: '', planForRestoration: '', listed303d: '' },
  });
  const [waterbodyUses, setWaterbodyUses] = useState({
    status: 'fetching',
    data: [],
  });
  const [waterbodySources, setWaterbodySources] = useState({
    status: 'fetching',
    data: [],
  });
  const [allParameterActionIds, setAllParameterActionIds] = useState({
    status: 'fetching',
    data: [],
  });
  const [documents, setDocuments] = useState({
    status: 'fetching',
    data: [],
  });
  const [reportingCycleGis, setReportingCycleGis] = useState('');

  // fetch reporting cycle, waterbody status, decision rational, uses,
  // and sources from attains 'assessments' web service
  const [assessmentsCalled, setAssessmentsCalled] = useState(false);
  useEffect(() => {
    if (assessmentsCalled || mapLayer.status === 'fetching') return;
    if (!reportingCycle && mapLayer.status === 'fetching') return;
    if (allReportingCycles.status !== 'success') return;

    let hasGisData =
      mapLayer.status === 'success' && mapLayer.layer.graphics.length > 0;
    const gisCycle = hasGisData
      ? mapLayer.layer.graphics.items[0].attributes.reportingcycle.toString()
      : '';
    setReportingCycleGis(gisCycle);

    let reportingCycleParam = '';
    if (reportingCycle) {
      reportingCycleParam = reportingCycle;
    } else if (hasGisData) {
      reportingCycleParam = gisCycle;
    } else if (allReportingCycles.data.length > 0) {
      reportingCycleParam =
        allReportingCycles.data[allReportingCycles.data.length - 1];
    } else {
      handleNoAssessments();
      return;
    }

    setAssessmentsCalled(true);

    const url =
      configFiles.data.services.attains.serviceUrl +
      `assessments?organizationId=${orgId}` +
      `&assessmentUnitIdentifier=${auId}` +
      (reportingCycleParam ? `&reportingCycle=${reportingCycleParam}` : '');

    fetchCheck(url).then(
      (res) => {
        if (res.items.length === 0) {
          handleNoAssessments();
          return;
        }

        const firstItem = res.items[0];
        if (firstItem.assessments.length === 0) {
          handleNoAssessments();
          return;
        }

        setReportingCycleFetch({
          status: 'success',
          year: firstItem.reportingCycleText,
        });
        setOrganizationName({
          status: 'success',
          name: firstItem.organizationName,
        });

        let epaIRCategory = null;
        let overallStatus = null;
        let rationaleText = null;
        let useAttainments = [];
        let parameters = [];
        let probableSources = [];
        let assessmentDocuments = [];
        if (firstItem.assessments.length > 0) {
          const assessment = firstItem.assessments[0];

          epaIRCategory = assessment.epaIRCategory;
          overallStatus = assessment.overallStatus;
          rationaleText = assessment.rationaleText;
          useAttainments = assessment.useAttainments;
          parameters = assessment.parameters;
          probableSources = assessment.probableSources;
          assessmentDocuments = assessment.documents;
        }

        setDecisionRationale(rationaleText);

        const status = {
          planForRestoration: ['4A', '4B', '5A'].indexOf(epaIRCategory) !== -1,
          listed303d: ['5', '5A', '5M'].indexOf(epaIRCategory) !== -1,
        };

        const condition =
          overallStatus === 'Not Supporting' || overallStatus === 'Cause'
            ? conditions.impaired
            : overallStatus === 'Fully Supporting' ||
                overallStatus === 'Meeting Criteria'
              ? conditions.good
              : conditions.unknown; // catch all

        // Use the status above initially. When looping through the use attainments
        // this will be set to yes if any of the uses have a plan in place
        let planForRestoration = status.planForRestoration ? 'Yes' : 'No';

        const listed303d = status.listed303d ? 'Yes' : 'No';

        if (useAttainments.length === 0) {
          setAllParameterActionIds({
            status: 'success',
            data: [],
          });
        }

        const uses = useAttainments.map((use) => {
          const status =
            use.useAttainmentCode === 'X'
              ? {
                  textColor: colors.white(),
                  bgColor: colors.steel(),
                  text: 'Not Assessed',
                }
              : use.useAttainmentCode === 'I'
                ? {
                    textColor: colors.white(),
                    bgColor: colors.purple(),
                    text: 'Insufficient Info',
                  }
                : use.useAttainmentCode === 'F'
                  ? {
                      textColor: colors.white(),
                      bgColor: colors.green(),
                      text: 'Good',
                    }
                  : use.useAttainmentCode === 'N'
                    ? {
                        textColor: colors.white(),
                        bgColor: colors.red(),
                        text: 'Impaired',
                      }
                    : {
                        textColor: colors.white(),
                        bgColor: colors.purple(),
                        text: 'Unknown',
                      };

          // build up categories by matching each parameter's associated use name
          // and examining its parameter attainment code
          const categories = {
            pollutants: [],
            assessedGood: [],
            insufficentInfo: [],
            otherObserved: [],
            ofConcern: [],
          };

          // object for mapping attainment code with categories
          const attainmentCodeMapping = {
            'Not meeting criteria': categories.pollutants,
            'Meeting criteria': categories.assessedGood,
            'Not enough information': categories.insufficentInfo,
            'Not Applicable': categories.otherObserved,
            Threatened: categories.ofConcern,
            'Meeting threshold': categories.assessedGood,
            'Not meeting threshold': categories.pollutants,
          };

          // allAssociatedActionIds will contain all parameters' associated action ids
          const allAssociatedActionIds = [];

          parameters.forEach((parameter) => {
            // add all associated action ids to the allAssociatedActionIds array
            const associatedActionIds = parameter.associatedActions.map(
              (associatedAction) => associatedAction.associatedActionIdentifier,
            );
            allAssociatedActionIds.push(...associatedActionIds);

            // match on use names, and add parameter to its respective category
            parameter.associatedUses
              .filter((assocUse) => assocUse.associatedUseName === use.useName)
              .forEach((assocUse) => {
                const { parameterAttainmentCode } = assocUse;
                const parameterStatusName = parameter.parameterStatusName;
                // determine the category from parameter's attainment code
                let category;
                if (parameterStatusName === 'Observed effect') {
                  // always put observed effect in with other observed
                  category = attainmentCodeMapping['Not Applicable'];
                } else if (
                  parameterStatusName === 'Meeting Criteria' &&
                  parameterAttainmentCode === 'Not meeting criteria'
                ) {
                  // Meeting criteria should never be a pollutant
                  category = attainmentCodeMapping['Meeting criteria'];
                } else if (
                  parameterStatusName === 'Insufficient Information' &&
                  parameterAttainmentCode === 'Not meeting criteria'
                ) {
                  // Insufficient information should never be a pollutant
                  category = attainmentCodeMapping['Not enough information'];
                } else {
                  // catch all - directly use the parameterAttainmentCode
                  category = attainmentCodeMapping[parameterAttainmentCode];
                }

                if (category) {
                  // add parameter to category only if it hasn't already been added
                  const notYetAdded =
                    category
                      .map((item) => item.name)
                      .indexOf(parameter.parameterName) === -1;

                  if (notYetAdded) {
                    // a plan is 'in place' if a parameter has at least one associated action
                    const planInPlace = parameter.associatedActions.length > 0;

                    if (planInPlace) planForRestoration = 'Yes';

                    category.push({
                      name: parameter.parameterName,
                      planInPlace,
                    });
                  }
                }
              });
          });

          setAllParameterActionIds({
            status: 'success',
            data: allAssociatedActionIds,
          });

          return { name: use.useName, status, categories };
        });

        setWaterbodyStatus({
          status: 'success',
          data: { condition, planForRestoration, listed303d },
        });

        setWaterbodyUses({ status: 'success', data: uses });

        const data = [];
        probableSources.forEach((source) => {
          const name = source.sourceName;
          const status = source.sourceConfirmedIndicator === 'N' ? 'No' : 'Yes';
          source.associatedCauseNames.forEach((cause) => {
            for (let parameter of parameters) {
              if (parameter.parameterName === cause.causeName) {
                const use =
                  parameter.associatedUses.length &&
                  parameter.associatedUses[0].associatedUseName;
                data.push({
                  source: titleCaseWithExceptions(name),
                  parameter: titleCaseWithExceptions(cause.causeName),
                  confirmed: status,
                  use: use,
                });
                break;
              }
            }
          });
        });

        data
          .sort((a, b) => b.source.localeCompare(a.source))
          .sort((a, b) => {
            if (a.source === b.source) {
              return a.parameter.localeCompare(b.parameter);
            }
            return -1;
          });

        setWaterbodySources({ status: 'success', data: data });

        setDocuments({ status: 'success', data: assessmentDocuments });
      },
      (err) => {
        console.error(err);
        handleError();
      },
    );
  }, [
    allReportingCycles,
    auId,
    configFiles,
    orgId,
    reportingCycle,
    mapLayer,
    assessmentsCalled,
  ]);

  const [waterbodyActions, setWaterbodyActions] = useState({
    status: 'fetching',
    data: [],
  });

  // fetch waterbody actions from attains 'actions' web service, using the
  // 'organizationId' and 'assessmentUnitIdentifier' query string parameters
  useEffect(() => {
    const parameters = `organizationIdentifier=${orgId}&assessmentUnitIdentifier=${auId}`;

    getPollutantsFromAction(configFiles.data.services, parameters)
      .then((res) => {
        if (res.length === 0) {
          setWaterbodyActions({ status: 'pending', data: [] });
          return;
        }

        setWaterbodyActions({ status: 'pending', data: res });
      })
      .catch((ex) => {
        console.error(ex);
        setWaterbodyActions({ status: 'failure', data: [] });
      });
  }, [auId, configFiles, orgId]);

  // call attains 'actions' web service again, this time using the
  // 'actionIdentifier' query string parameter – once for each action
  // id that wasn't returned in the previous web service call (when
  // the 'assessmentUnitIdentifier' query string parameter was used)
  const [actionsFetchedAgain, setActionsFetchedAgain] = useState(false);

  useEffect(() => {
    if (actionsFetchedAgain) return;
    if (allParameterActionIds.status === 'fetching') return;
    if (waterbodyActions.status !== 'pending') return;

    // action ids from the initial attains 'actions' web service call
    const initialIds = waterbodyActions.data.map((a) => a.id);

    // additional action ids from the parameters returned in the attains
    // 'assessments' web service, that weren't returned in the initial
    // attains 'actions' web service call
    const additionalIds = allParameterActionIds.data.filter((id) => {
      return initialIds.indexOf(id) === -1;
    });

    // if there are no additional ids, use the data from initial attains
    // 'actions' web service call
    if (additionalIds.length === 0) {
      setWaterbodyActions((actions) => ({
        status: 'success',
        data: actions.data,
      }));
      return;
    }

    const parameters = `organizationIdentifier=${orgId}&actionIdentifier=${additionalIds.join(',')}`;

    setActionsFetchedAgain(true);

    getPollutantsFromAction(configFiles.data.services, parameters)
      .then((additionalActions) => {
        if (additionalActions.length === 0) {
          // if there are no new items (there should be), at least use the
          // data from the initial attains 'actions' web service call
          setWaterbodyActions((actions) => ({
            status: 'success',
            data: actions.data,
          }));
          return;
        }

        // append additional actions to the data from the initial attains
        // 'actions' web service call
        setWaterbodyActions((actions) => ({
          status: 'success',
          data: actions.data.concat(...additionalActions),
        }));
      })
      .catch((ex) => {
        console.error(ex);

        // if the request failed, at least use the data from the initial
        // attains 'actions' web service call
        setWaterbodyActions((actions) => ({
          status: 'success',
          data: actions.data,
        }));
      });
  }, [
    actionsFetchedAgain,
    allParameterActionIds,
    configFiles,
    orgId,
    waterbodyActions,
  ]);

  // Builds the unitIds dictionary that is used for determining what
  // waters to display on the screen and what the content will be.
  // Note: The usage of null means the same content will be shown
  // as what is displayed for the waterbody on the community page.
  const unitIds = {};
  unitIds[auId] = null;

  // calculate height of div holding waterbody info
  const [infoHeight, setInfoHeight] = useState(0);
  const measuredRef = useRef();
  useEffect(() => {
    if (!measuredRef?.current) return;
    setInfoHeight(measuredRef.current.getBoundingClientRect().height);
  }, [
    measuredRef,
    reportingCycleFetch,
    waterbodyLocation,
    waterbodyStatus,
    waterbodyTypes,
  ]);

  const otherReportingCycles = allReportingCycles.data.filter(
    (year) => year !== parseInt(reportingCycleFetch.year),
  );

  const infoBox = (
    <div css={boxStyles} ref={measuredRef}>
      <h3 css={infoBoxHeadingStyles}>
        {waterbodyStatus.status === 'fetching' && <LoadingSpinner />}

        {waterbodyStatus.status === 'success' && (
          <span>
            <WaterbodyIcon
              condition={
                waterbodyStatus.data.condition === conditions.good
                  ? 'good'
                  : waterbodyStatus.data.condition === conditions.impaired
                    ? 'polluted'
                    : 'unassessed'
              }
              selected={false}
            />
          </span>
        )}
        <span>
          {waterbodyName}
          <small>
            <strong>Assessment Unit ID:</strong> {auId}
          </small>
        </span>
      </h3>

      <div css={inlineBoxSectionStyles}>
        <h4>Waterbody Condition:</h4>
        {waterbodyStatus.status === 'fetching' && <LoadingSpinner />}
        {waterbodyStatus.status === 'failure' && (
          <div css={modifiedErrorBoxStyles}>
            <p>{waterbodyReportError('Assessment')}</p>
          </div>
        )}
        {waterbodyStatus.status === 'success' && (
          <p>
            &nbsp;{' '}
            <GlossaryTerm
              term={
                waterbodyStatus.data.condition === conditions.good
                  ? 'Good Waters'
                  : waterbodyStatus.data.condition === conditions.impaired
                    ? 'Impaired Waters'
                    : 'Condition Unknown'
              }
            >
              {waterbodyStatus.data.condition}
            </GlossaryTerm>
          </p>
        )}
      </div>

      <div css={inlineBoxSectionStyles}>
        <h4>Existing Plans for Restoration:</h4>
        {waterbodyStatus.status === 'fetching' && <LoadingSpinner />}

        {waterbodyStatus.status === 'failure' && (
          <div css={modifiedErrorBoxStyles}>
            <p>{waterbodyReportError('Assessment')}</p>
          </div>
        )}
        {waterbodyStatus.status === 'success' && (
          <p>&nbsp; {waterbodyStatus.data.planForRestoration}</p>
        )}
      </div>

      <div css={inlineBoxSectionStyles}>
        <h4>
          <GlossaryTerm term="303(d) listed impaired waters (Category 5)">
            303(d) Listed
          </GlossaryTerm>
          :
        </h4>
        {waterbodyStatus.status === 'fetching' && <LoadingSpinner />}
        {waterbodyStatus.status === 'failure' && (
          <div css={modifiedErrorBoxStyles}>
            <p>{waterbodyReportError('Assessment')}</p>
          </div>
        )}
        {waterbodyStatus.status === 'success' && (
          <p>&nbsp; {waterbodyStatus.data.listed303d}</p>
        )}
      </div>

      <div css={inlineBoxSectionStyles}>
        <h4>Year Reported:</h4>
        {reportingCycleFetch.status === 'fetching' && <LoadingSpinner />}
        {reportingCycleFetch.status === 'failure' && (
          <div css={modifiedErrorBoxStyles}>
            <p>{waterbodyReportError('Assessment')}</p>
          </div>
        )}
        {reportingCycleFetch.status === 'success' && (
          <p>&nbsp; {reportingCycleFetch.year}</p>
        )}
      </div>

      <div css={inlineBoxSectionStyles}>
        <h4>Other Years Reported:</h4>
        {(allReportingCycles.status === 'fetching' ||
          reportingCycleFetch.status === 'fetching') && <LoadingSpinner />}
        {(allReportingCycles.status === 'failure' ||
          reportingCycleFetch.status === 'failure') && (
          <div css={modifiedErrorBoxStyles}>
            <p>{waterbodyReportError('Assessment')}</p>
          </div>
        )}
        {allReportingCycles.status === 'success' &&
          reportingCycleFetch.status === 'success' && (
            <p>
              &nbsp;{' '}
              {otherReportingCycles.length > 0 ? (
                <>
                  {otherReportingCycles
                    .map((year) => (
                      <a
                        href={`/waterbody-report/${orgId}/${auId}/${year}`}
                        key={year}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {year}
                      </a>
                    ))
                    .reduce((prev, curr) => [prev, ', ', curr])}{' '}
                  <small>(opens new browser tab)</small>
                </>
              ) : (
                'None'
              )}
            </p>
          )}
      </div>

      <div css={inlineBoxSectionStyles}>
        <h4>Organization Name (ID):&nbsp;</h4>
        {reportingCycleFetch.status === 'fetching' && <LoadingSpinner />}
        {reportingCycleFetch.status === 'failure' && (
          <div css={modifiedErrorBoxStyles}>
            <p>{waterbodyReportError('Assessment')}</p>
          </div>
        )}
        {reportingCycleFetch.status === 'success' && (
          <p>
            {organizationName.name} ({orgId})
          </p>
        )}
      </div>

      <div css={boxSectionStyles}>
        <h4>What type of water is this?</h4>
        {waterbodyTypes.status === 'fetching' && <LoadingSpinner />}
        {waterbodyTypes.status === 'failure' && (
          <div css={modifiedErrorBoxStyles}>
            <p>{waterbodyReportError('Assessment unit')}</p>
          </div>
        )}

        {waterbodyTypes.status === 'success' && (
          <>
            {waterbodyTypes.data.length === 0 && <p>Waterbody type unknown.</p>}

            {waterbodyTypes.data.length > 0 &&
              waterbodyTypes.data
                .sort((a, b) => a.code.localeCompare(b.code))
                .map((type) => (
                  <p key={type.code}>
                    {titleCaseWithExceptions(type.code)} ({type.size}{' '}
                    {type.units})
                  </p>
                ))}
          </>
        )}
      </div>

      <div css={boxSectionStyles}>
        <h4>Where is this water located?</h4>
        {waterbodyLocation.status === 'fetching' && <LoadingSpinner />}

        {waterbodyLocation.status === 'failure' && (
          <div css={modifiedErrorBoxStyles}>
            <p>{waterbodyReportError('Assessment unit')}</p>
          </div>
        )}

        {waterbodyLocation.status === 'success' && (
          <p>{waterbodyLocation.text}</p>
        )}
      </div>
    </div>
  );

  const mapCycleDisclaimer = (
    <Fragment>
      {reportingCycleGis &&
        reportingCycleFetch.status === 'success' &&
        reportingCycleGis !== reportingCycleFetch.year && (
          <div css={mapInfoBoxStyles}>
            <p>
              The map shows the location and extent of the Assessment Unit for
              the {reportingCycleGis} reporting cycle. The Assessment Unit may
              have changed over time.
            </p>
          </div>
        )}
    </Fragment>
  );

  if (noWaterbodies) {
    return (
      <Page>
        <NavBar title="Plan Summary" />

        <div css={containerStyles}>
          <div css={pageErrorBoxStyles}>
            <p>
              No waterbodies available for the provided Organization ID:{' '}
              <strong>{orgId}</strong> and Assessment Unit ID:{' '}
              <strong>{auId}</strong>.
            </p>
          </div>
        </div>
      </Page>
    );
  }

  if (waterbodyStatus.status === 'no-data') {
    return (
      <Page>
        <NavBar title="Plan Summary" />

        <div css={containerStyles}>
          <div css={pageErrorBoxStyles}>
            <p>
              Assessment{' '}
              <strong>
                {waterbodyName} ({auId})
              </strong>{' '}
              has no data available
              {reportingCycle ? ` for ${reportingCycle}` : ''}.
            </p>
          </div>
        </div>
      </Page>
    );
  }

  const latestReportingCycle =
    allReportingCycles.data[allReportingCycles.data.length - 1];

  return (
    <Page>
      <NavBar title="Waterbody Report" />

      <div css={containerStyles} data-content="container">
        {reportingCycleFetch.status === 'success' &&
          allReportingCycles.status === 'success' &&
          latestReportingCycle > reportingCycleFetch.year && (
            <div css={infoBoxContainerStyles}>
              <div css={infoBoxStyles}>
                There is more recent data available for this waterbody. Please
                use the following link to view the latest information:
                <br />
                <a
                  href={`/waterbody-report/${orgId}/${auId}/${latestReportingCycle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i
                    css={iconStyles}
                    className="fas fa-file-alt"
                    aria-hidden="true"
                  />
                  View Waterbody Report for {latestReportingCycle}
                </a>
                &nbsp;&nbsp;
                <small css={disclaimerStyles}>(opens new browser tab)</small>
              </div>
            </div>
          )}
        <WindowSize>
          {({ width, height }) => {
            return (
              <div css={splitLayoutColumnsStyles}>
                <div css={splitLayoutColumnStyles}>
                  {width < 960 ? (
                    <>
                      {infoBox}
                      <MapVisibilityButton>
                        {(mapShown) => (
                          <Fragment>
                            {mapShown && mapCycleDisclaimer}
                            <div
                              style={{
                                display: mapShown ? 'block' : 'none',
                                height: height - 40,
                              }}
                            >
                              <ActionsMap
                                layout="narrow"
                                unitIds={unitIds}
                                onLoad={setMapLayer}
                                includePhoto
                              />
                            </div>
                          </Fragment>
                        )}
                      </MapVisibilityButton>
                    </>
                  ) : (
                    <StickyBox offsetTop={20} offsetBottom={20}>
                      {infoBox}
                      {mapCycleDisclaimer}
                      <div
                        id="waterbody-report-map"
                        style={{
                          height: height - infoHeight - 70,
                          minHeight: '400px',
                        }}
                      >
                        <ActionsMap
                          layout="wide"
                          unitIds={unitIds}
                          onLoad={setMapLayer}
                          includePhoto
                        />
                      </div>
                    </StickyBox>
                  )}
                </div>

                <div css={splitLayoutColumnStyles}>
                  {decisionRationale && (
                    <div css={boxStyles}>
                      <h3 css={boxHeadingStyles}>Decision Rationale</h3>
                      <div css={boxSectionStyles}>
                        <p css={rationaleStyles}>{decisionRationale}</p>
                      </div>
                    </div>
                  )}

                  <div css={boxStyles}>
                    <h3 css={boxHeadingStyles}>
                      Assessment Information{' '}
                      {reportingCycleFetch.status === 'success' && (
                        <>from {reportingCycleFetch.year}</>
                      )}
                    </h3>

                    <div css={modifiedBoxSectionStyles}>
                      <h4>State or Tribal Nation specific designated uses:</h4>
                      {waterbodyUses.status === 'fetching' && (
                        <LoadingSpinner />
                      )}
                      {waterbodyUses.status === 'failure' && (
                        <div css={modifiedErrorBoxStyles}>
                          <p>{waterbodyReportError('Assessment')}</p>
                        </div>
                      )}
                      {waterbodyUses.status === 'success' && (
                        <>
                          {waterbodyUses.data.length === 0 ? (
                            <p>
                              No evaluated uses provided for this waterbody.
                            </p>
                          ) : (
                            <AccordionList
                              contentExpandCollapse={
                                <div css={containerContentExpandStyles}>
                                  <a
                                    href="https://www.epa.gov/wqs-tech/state-specific-water-quality-standards-effective-under-clean-water-act-cwa"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    Information on Water Quality Standards
                                  </a>
                                </div>
                              }
                            >
                              {waterbodyUses.data
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((use) => (
                                  <AccordionItem
                                    key={use.name}
                                    title={
                                      <span css={useNameStyles}>
                                        <strong>
                                          {titleCaseWithExceptions(use.name)}
                                        </strong>
                                        <span
                                          css={waterbodyUseStatusStyles(
                                            use.status.textColor,
                                            use.status.bgColor,
                                          )}
                                        >
                                          {use.status.text}
                                        </span>
                                      </span>
                                    }
                                  >
                                    <WaterbodyUse categories={use.categories} />
                                  </AccordionItem>
                                ))}
                            </AccordionList>
                          )}
                        </>
                      )}
                    </div>

                    <hr />

                    <div css={boxSectionStyles}>
                      <h4>
                        Probable sources contributing to impairment
                        {reportingCycleFetch.status === 'success' &&
                          ` from ${reportingCycleFetch.year}`}
                        :
                      </h4>
                      {waterbodySources.status === 'fetching' && (
                        <LoadingSpinner />
                      )}
                      {waterbodySources.status === 'failure' && (
                        <div css={modifiedErrorBoxStyles}>
                          <p>{waterbodyReportError('Assessment')}</p>
                        </div>
                      )}
                      {waterbodySources.status === 'success' && (
                        <>
                          {waterbodySources.data.length === 0 ? (
                            <div css={modifiedInfoBoxStyles}>
                              <p>
                                No probable sources of impairment identified for
                                this waterbody.
                              </p>
                            </div>
                          ) : (
                            <ReactTable
                              data={waterbodySources.data}
                              placeholder="Filter..."
                              striped={false}
                              getColumns={(tableWidth) => {
                                const columnWidth = 2 * (tableWidth / 5) - 1;
                                const halfColumnWidth = tableWidth / 5 - 1;

                                return [
                                  {
                                    Header: 'Source',
                                    accessor: 'source',
                                    width: columnWidth,
                                    filterable: true,
                                  },
                                  {
                                    id: 'parameters',
                                    Header: 'Parameter',
                                    accessor: 'parameter',
                                    width: columnWidth,
                                    filterable: true,
                                  },
                                  {
                                    Header: 'Confirmed',
                                    accessor: 'confirmed',
                                    width: halfColumnWidth,
                                    filterable: true,
                                  },
                                ];
                              }}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div css={boxStyles}>
                    <h3 css={boxHeadingStyles}>Assessment Documents</h3>

                    <div css={boxSectionStyles}>
                      {documents.status === 'fetching' && <LoadingSpinner />}
                      {documents.status === 'failure' && (
                        <div css={modifiedErrorBoxStyles}>
                          <p>{waterbodyReportError('Assessment')}</p>
                        </div>
                      )}
                      {documents.status === 'success' && (
                        <>
                          {documents.data.length === 0 ? (
                            <div css={modifiedInfoBoxStyles}>
                              <p>No documents are available</p>
                            </div>
                          ) : (
                            <>
                              <em>Links below open in a new browser tab.</em>
                              <table className="table">
                                <thead>
                                  <tr>
                                    <th>Assessment</th>
                                    <th>Type</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {documents.data.map((document) => (
                                    <tr key={document.documentName}>
                                      <td>
                                        <a
                                          href={document.documentURL}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          {document.documentName}
                                        </a>
                                        <DynamicExitDisclaimer
                                          url={document.documentURL}
                                        />
                                      </td>
                                      <td>
                                        {document.documentTypes.length &&
                                          document.documentTypes[0]
                                            .documentTypeCode}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div css={boxStyles}>
                    <h3 css={boxHeadingStyles}>
                      Plans to Restore Water Quality
                    </h3>

                    <div css={boxSectionStyles}>
                      <h4>
                        What plans are in place to protect or restore water
                        quality?
                      </h4>
                      {(waterbodyActions.status === 'fetching' ||
                        waterbodyActions.status === 'pending') && (
                        <LoadingSpinner />
                      )}
                      {waterbodyActions.status === 'failure' && (
                        <div css={modifiedErrorBoxStyles}>
                          <p>{waterbodyReportError('Plans')}</p>
                        </div>
                      )}
                      {waterbodyActions.status === 'success' && (
                        <>
                          {waterbodyActions.data.length === 0 ? (
                            <div css={modifiedInfoBoxStyles}>
                              <p>No plans specified for this waterbody.</p>
                            </div>
                          ) : (
                            <>
                              <em>Links below open in a new browser tab.</em>
                              <table className="table" css={tableStyles}>
                                <thead>
                                  <tr>
                                    <th>Plan</th>
                                    <th>Impairments</th>
                                    <th>Type</th>
                                    <th>Completion Date</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {waterbodyActions.data
                                    .sort((a, b) =>
                                      a.name.localeCompare(b.name),
                                    )
                                    .map((action) => (
                                      <tr key={action.id}>
                                        <td>
                                          <a
                                            href={`/plan-summary/${orgId}/${action.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            {titleCaseWithExceptions(
                                              action.name,
                                            )}
                                          </a>
                                        </td>
                                        <td>
                                          {action.pollutants.length === 0 && (
                                            <>No impairments found.</>
                                          )}
                                          {action.pollutants.length > 0 && (
                                            <>
                                              {action.pollutants
                                                .sort((a, b) =>
                                                  a.localeCompare(b),
                                                )
                                                .join(', ')}
                                            </>
                                          )}
                                        </td>
                                        <td>
                                          {mapRestorationPlanToGlossary(
                                            action.type,
                                          )}
                                        </td>
                                        <td css={dateCellStyles}>
                                          {action.date}
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {
                    // NOTE: Water Monitoring section not ready as of 11/21/19
                    // TODO: replace `false & (` with commented out conditions above
                    // whenever Water Monitoring section is ready to be displayed
                    false && (
                      <div css={boxStyles}>
                        <h3 css={boxHeadingStyles}>Water Monitoring</h3>

                        <div css={boxSectionStyles}>
                          <h4>Does this water have monitoring locations?</h4>
                          {monitoringLocations.status === 'fetching' && (
                            <LoadingSpinner />
                          )}
                          {monitoringLocations.status === 'failure' && (
                            <div css={modifiedErrorBoxStyles}>
                              <p>
                                {waterbodyReportError('Monitoring location')}
                              </p>
                            </div>
                          )}
                          {monitoringLocations.status === 'success' && (
                            <ul css={locationsStyles}>
                              {monitoringLocations.data.map((location) => {
                                const { orgId, locId, name, url } = location;
                                return (
                                  <li key={locId}>
                                    {name ? (
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        {name} (ID: {orgId}-{locId})
                                      </a>
                                    ) : (
                                      <>
                                        Unknown name (ID: {orgId}-{locId})
                                      </>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    )
                  }
                </div>
              </div>
            );
          }}
        </WindowSize>
      </div>
    </Page>
  );
}

type WaterbodyUseProps = {
  categories: {
    pollutants: Array<Object>;
    assessedGood: Array<Object>;
    insufficentInfo: Array<Object>;
    otherObserved: Array<Object>;
    ofConcern: Array<Object>;
  };
};

function WaterbodyUse({ categories }: WaterbodyUseProps) {
  const { pollutants } = categories;

  // create parameters object from all categories, excluding pollutants
  const parameters = {
    'Assessed Good': categories.assessedGood,
    'Insufficient Information': categories.insufficentInfo,
    'Other Characteristics Observed': categories.otherObserved,
    'Of Concern': categories.ofConcern,
  };

  const noParameterData =
    categories.assessedGood.length === 0 &&
    categories.insufficentInfo.length === 0 &&
    categories.otherObserved.length === 0 &&
    categories.ofConcern.length === 0;

  return (
    <div css={accordionContentStyles}>
      <h5>Identified Issues for Use</h5>

      {pollutants.length === 0 && (
        <p css={textStyles}>No impairments evaluated for this use.</p>
      )}

      {pollutants.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>
                <GlossaryTerm term="Impaired Parameters">
                  Impaired Parameters
                </GlossaryTerm>
              </th>
              <th>Plan in Place</th>
            </tr>
          </thead>
          <tbody>
            {pollutants
              .toSorted((a, b) => a.name.localeCompare(b.name))
              .map((pollutant) => (
                <tr key={pollutant.name}>
                  <td>{titleCaseWithExceptions(pollutant.name)}</td>
                  <td>{pollutant.planInPlace ? 'Yes' : 'No'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      <h5>
        <GlossaryTerm term="Other Water Quality Parameters Evaluated">
          Other Water Quality Parameters Evaluated
        </GlossaryTerm>
      </h5>

      {noParameterData ? (
        <p>No other parameters evaluated for this use.</p>
      ) : (
        Object.keys(parameters).map((category) => (
          <Fragment key={category}>
            {parameters[category].length > 0 && (
              <>
                <p css={parameterCategoryStyles}>{category}</p>
                <ul>
                  {parameters[category]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((parameter) => (
                      <li css={parameterStyles} key={parameter.name}>
                        {titleCaseWithExceptions(parameter.name)}
                      </li>
                    ))}
                </ul>
              </>
            )}
          </Fragment>
        ))
      )}
    </div>
  );
}

export default function WaterbodyReportContainer() {
  const { resetData } = useContext(LocationSearchContext);
  useEffect(() => {
    return function cleanup() {
      resetData(true);
    };
  }, [resetData]);

  return (
    <LayersProvider>
      <MapHighlightProvider>
        <WaterbodyReport />
      </MapHighlightProvider>
    </LayersProvider>
  );
}
