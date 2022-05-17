// @flow

import React, { useContext, useEffect, useRef, useState } from 'react';
import { css } from 'styled-components/macro';
import { useWindowSize } from '@reach/window-size';
import Select, { createFilter } from 'react-select';
import { CellMeasurer, CellMeasurerCache, List } from 'react-virtualized';
import Query from '@arcgis/core/rest/support/Query';
import QueryTask from '@arcgis/core/tasks/QueryTask';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import StateMap from 'components/shared/StateMap';
import WaterbodyListVirtualized from 'components/shared/WaterbodyListVirtualized';
import ConfirmModal from 'components/shared/ConfirmModal';
// styled components
import { errorBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import { StateTribalTabsContext } from 'contexts/StateTribalTabs';
import { LocationSearchContext } from 'contexts/locationSearch';
import {
  MapHighlightContext,
  MapHighlightProvider,
} from 'contexts/MapHighlight';
import { FullscreenContext, FullscreenProvider } from 'contexts/Fullscreen';
import {
  useReportStatusMappingContext,
  useServicesContext,
} from 'contexts/LookupFiles';
// utilities
import { getEnvironmentString, fetchCheck } from 'utils/fetchUtils';
import { chunkArray } from 'utils/utils';
import { useWaterbodyFeaturesState, useWaterbodyOnMap } from 'utils/hooks';
// data
import { impairmentFields, useFields } from 'config/attainsToHmwMapping';
// styles
import { reactSelectStyles } from 'styles/index.js';
// errors
import { stateGeneralError, state303dStatusError } from 'config/errorMessages';

const defaultDisplayOption = {
  label: 'Overall Waterbody Condition',
  value: '',
};

// Gets the maxRecordCount of the layer at the provided url
function retrieveMaxRecordCount(url) {
  return new Promise((resolve, reject) => {
    // add an environment specific parameter to workaround an ESRI CORS bug
    const envParam = getEnvironmentString()
      ? `&${getEnvironmentString()}=1`
      : '';

    // get the max record count and then get the data
    fetchCheck(`${url}?f=json${envParam}`)
      .then((res) => {
        resolve(res.maxRecordCount);
      })
      .catch((err) => reject(err));
  });
}

// Gets the features without geometry for quickly displaying in the
// waterbody list component.
function retrieveFeatures({
  url,
  queryParams,
  maxRecordCount,
}: {
  url: string,
  queryParams: Object,
  maxRecordCount: number,
}) {
  return new Promise((resolve, reject) => {
    // query to get just the ids since there is a maxRecordCount
    const queryTask = new QueryTask({ url: url });
    const idsQuery = new Query(queryParams);
    queryTask
      .executeForIds(idsQuery)
      .then((objectIds) => {
        // set the features value of the data to an empty array if no objectIds
        // were returned.
        if (!objectIds) {
          resolve({ features: [] });
          return;
        }

        // Break the data up into chunks of 5000 or the max record count
        const chunkedObjectIds = chunkArray(objectIds, maxRecordCount);

        // request data with each chunk of objectIds
        const requests = [];

        chunkedObjectIds.forEach((chunk: Array<string>) => {
          const queryChunk = new Query({
            ...queryParams,
            where: `OBJECTID in (${chunk.join(',')})`,
          });
          const request = queryTask.execute(queryChunk);
          requests.push(request);
        });

        // parse the requests
        Promise.all(requests)
          .then((responses) => {
            // save the first response to get the metadata
            let combinedObject = responses[0];

            const features = responses.reduce((acc, cur) => {
              return {
                ...acc,
                features: acc.features.concat(cur.features),
              };
            });
            combinedObject.features = features.features;

            // resolve the promise
            resolve(combinedObject);
          })
          .catch((err) => reject(err));
      })
      .catch((err) => reject(err));
  });
}

const inputsStyles = css`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  label {
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
    font-weight: bold;
  }
`;

const inputStyles = css`
  margin-bottom: 0.75em;
  width: 100%;
  @media (min-width: 768px) {
    width: calc(50% - 0.75em);
  }
`;

const buttonGroupStyles = css`
  z-index: 0;
`;

const resultsInputsStyles = css`
  ${inputsStyles}
  align-items: center;
`;

const resultsInputStyles = css`
  ${inputStyles}
  @media (min-width: 768px) {
    width: calc((100% / 3) - 1em);
  }
`;

const resultsItemsStyles = css`
  font-weight: normal;
`;

const inputGroupStyles = css`
  margin-top: 0.125rem;
  label {
    padding-left: 0.375rem;
    font-weight: normal;
  }
`;

const searchStyles = css`
  text-align: center;
`;

const buttonStyles = css`
  margin-bottom: 0;
  font-size: 0.9375em;
  &.active {
    background-color: #0071bc !important;
  }
`;

const mapFooterStyles = css`
  width: 100%;
  /* match ESRI map footer text */
  padding: 3px 5px;
  border: 1px solid #aebac3;
  border-top: none;
  font-size: 0.75em;
  background-color: whitesmoke;
`;

const mapFooterMessageStyles = css`
  margin-bottom: 5px;
`;

const mapFooterStatusStyles = css`
  display: flex;
  align-items: center;

  svg {
    margin: 0 -0.875rem;
    height: 0.6875rem;
  }
`;

const screenLabelStyles = css`
  display: inline-block;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
  font-weight: bold;
`;

const screenLabelWithPaddingStyles = css`
  ${screenLabelStyles}
  padding-left: 0.375rem;
`;

function AdvancedSearch() {
  const services = useServicesContext();

  const {
    currentReportStatus,
    currentSummary,
    currentReportingCycle,
    setCurrentReportingCycle,
    activeState,
    stateAndOrganization,
    setStateAndOrganization,
  } = useContext(StateTribalTabsContext);

  const { fullscreenActive } = useContext(FullscreenContext);

  const {
    mapView,

    waterbodyData,
    setWaterbodyData,

    summaryLayerMaxRecordCount,
    watershedsLayerMaxRecordCount,
    setSummaryLayerMaxRecordCount,
    setWatershedsLayerMaxRecordCount,
  } = useContext(LocationSearchContext);

  const [searchLoading, setSearchLoading] = useState(false);
  const [serviceError, setServiceError] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const [
    parameterGroupOptions,
    setParameterGroupOptions, //
  ] = useState(null);

  // Get the list of parameters available for this state.
  // This data comes from the usesStateSummary service response
  // which is called from WaterQualityOverview.
  useEffect(() => {
    if (currentSummary.status === 'fetching') return;
    if (currentSummary.status === 'failure') {
      setParameterGroupOptions([]);
      setServiceError(true);
      return;
    }

    // get a unique list of parameterGroups as they are in attains
    const uniqueParameterGroups = [];
    currentSummary.data.waterTypes.forEach((waterType) => {
      waterType.useAttainments.forEach((useAttainment) => {
        useAttainment.parameters.forEach((parameter) => {
          const parameterGroup = parameter.parameterGroup;
          if (!uniqueParameterGroups.includes(parameterGroup)) {
            uniqueParameterGroups.push(parameterGroup.toUpperCase());
          }
        });
      });
    });

    // get the public friendly versions of the parameterGroups
    let parameterGroupOptions = impairmentFields.filter((field) =>
      uniqueParameterGroups.includes(field.parameterGroup.toUpperCase()),
    );

    // sort the options
    parameterGroupOptions = parameterGroupOptions.sort((a, b) => {
      return a.label.toUpperCase() > b.label.toUpperCase() ? 1 : -1;
    });

    setParameterGroupOptions(parameterGroupOptions);
  }, [currentSummary]);

  // Get the maxRecordCount of the watersheds layer
  const [watershedMrcError, setWatershedMrcError] = useState(false);
  useEffect(() => {
    if (watershedsLayerMaxRecordCount || watershedMrcError) return;

    retrieveMaxRecordCount(services.data.wbd)
      .then((maxRecordCount) => {
        setWatershedsLayerMaxRecordCount(maxRecordCount);
      })
      .catch((err) => {
        console.error(err);
        setSearchLoading(false);
        setServiceError(true);
        setWatershedMrcError(true);
      });
  }, [
    watershedsLayerMaxRecordCount,
    setWatershedsLayerMaxRecordCount,
    watershedMrcError,
    services,
  ]);

  // get a list of watersheds and build the esri where clause
  const [watersheds, setWatersheds] = useState(null);
  useEffect(() => {
    if (activeState.value === '' || !watershedsLayerMaxRecordCount) return;

    const queryParams = {
      where: `UPPER(STATES) LIKE '%${activeState.value}%' AND STATES <> 'CAN' AND STATES <> 'MEX'`,
      outFields: ['huc12', 'name'],
    };

    retrieveFeatures({
      url: services.data.wbd,
      queryParams,
      maxRecordCount: watershedsLayerMaxRecordCount,
    })
      .then((data) => {
        // convert the watersheds response into an array for the dropdown
        let hucs = [];
        data.features.forEach((feature) => {
          const { huc12, name } = feature.attributes;
          hucs.push({
            value: huc12,
            label: `${name} (${huc12})`,
          });
        });
        setWatersheds(hucs);
      })
      .catch((err) => {
        console.error(err);
        setSearchLoading(false);
        setServiceError(true);
        setWatersheds([]);
      });
  }, [activeState, watershedsLayerMaxRecordCount, services]);

  // Get the maxRecordCount of the summary (waterbody) layer
  const [summaryMrcError, setSummaryMrcError] = useState(false);
  useEffect(() => {
    if (summaryLayerMaxRecordCount || summaryMrcError) return;

    retrieveMaxRecordCount(services.data.waterbodyService.summary)
      .then((maxRecordCount) => {
        setSummaryLayerMaxRecordCount(maxRecordCount);
      })
      .catch((err) => {
        console.error(err);
        setSearchLoading(false);
        setServiceError(true);
        setSummaryMrcError(true);
      });
  }, [
    summaryLayerMaxRecordCount,
    setSummaryLayerMaxRecordCount,
    summaryMrcError,
    services,
  ]);

  const [currentFilter, setCurrentFilter] = useState(null);

  // these lists just have the name and id for faster load time
  const [waterbodiesList, setWaterbodiesList] = useState(null);
  // Get the features on the waterbodies point layer
  useEffect(() => {
    if (!stateAndOrganization || !summaryLayerMaxRecordCount) {
      return;
    }

    // query for initial load
    if (!currentFilter) {
      const queryParams = {
        returnGeometry: false,
        where: `state = '${stateAndOrganization.state}' AND organizationid = '${stateAndOrganization.organizationId}'`,
        outFields: [
          'assessmentunitidentifier',
          'assessmentunitname',
          'orgtype',
          'reportingcycle',
        ],
      };

      retrieveFeatures({
        url: services.data.waterbodyService.summary,
        queryParams,
        maxRecordCount: summaryLayerMaxRecordCount,
      })
        .then((data) => {
          // build a full list of waterbodies for the state. Will have the full
          // list prior to filters being visible on the screen.
          let waterbodiesList = [];
          let reportingCycle = '';
          data.features.forEach((waterbody, index) => {
            if (waterbody.attributes.reportingcycle > reportingCycle) {
              reportingCycle = waterbody.attributes.reportingcycle;
            }

            const id = waterbody.attributes.assessmentunitidentifier;
            const name = waterbody.attributes.assessmentunitname;
            waterbodiesList.push({
              value: id,
              label: `${name} (${id})`,
            });
          });

          setWaterbodiesList(waterbodiesList);
          setCurrentReportingCycle({
            status: 'success',
            reportingCycle,
          });
        })
        .catch((err) => {
          console.error(err);
          setSearchLoading(false);
          setServiceError(true);
          setWaterbodiesList([]);
          setCurrentReportingCycle({
            status: 'failure',
            reportingCycle: '',
          });
        });
    } else {
      const queryParams = {
        returnGeometry: false,
        where: currentFilter,
        outFields: ['*'],
      };

      retrieveFeatures({
        url: services.data.waterbodyService.summary,
        queryParams,
        maxRecordCount: summaryLayerMaxRecordCount,
      })
        .then((data) => setWaterbodyData(data))
        .catch((err) => {
          console.error(err);
          setSearchLoading(false);
          setServiceError(true);
          setWaterbodyData({ features: [] });
        });
    }
  }, [
    setWaterbodyData,
    currentFilter,
    summaryLayerMaxRecordCount,
    setCurrentReportingCycle,
    services,
    stateAndOrganization,
  ]);

  const [waterbodyFilter, setWaterbodyFilter] = useState([]);
  const [watershedFilter, setWatershedFilter] = useState([]);
  const [watershedResults, setWatershedResults] = useState({});
  const [useFilter, setUseFilter] = useState([]);
  const [waterTypeFilter, setWaterTypeFilter] = useState('all');
  const [hasTmdlChecked, setHasTmdlChecked] = useState(false);
  const [parameterFilter, setParameterFilter] = useState([]);

  // Build a list of assessment unit ids by combining the waterbody filter
  // and the watershed filter. Each watershed in the watershed filter contains
  // a list of waterbodies that each have an assessment unit id.
  const buildAssessmentUnitIdList = (watershedResults: Object) => {
    let unitIdList = [];

    // add assessment unit ids from the waterbody filter
    if (waterbodyFilter && waterbodyFilter.length > 0) {
      waterbodyFilter.forEach((waterbody) => {
        if (!unitIdList.includes(waterbody.value))
          unitIdList.push(waterbody.value);
      });
    }

    // add assessment unit ids from the watershed filter
    if (watershedFilter && watershedFilter.length > 0) {
      watershedFilter.forEach((watershed) => {
        // get the watebodies using the huc12 of the watershed
        const watershedData = watershedResults[watershed.value];
        if (watershedData && watershedData.length > 0) {
          // add the waterbodies to the filter
          watershedData.forEach((waterbody) => {
            if (!unitIdList.includes(waterbody.assessmentUnitId)) {
              unitIdList.push(waterbody.assessmentUnitId);
            }
          });
        }
      });

      // make the search return nothing if a watershed filter is selected, but
      // no waterbodies were found in the watersheds
      if (unitIdList.length === 0) unitIdList.push('No Hucs');
    }

    return unitIdList;
  };

  const [numberOfRecords, setNumberOfRecords] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [nextFilter, setNextFilter] = useState('');
  useEffect(() => {
    if (!nextFilter || serviceError) return;

    let query = new Query({
      returnGeometry: false,
      where: nextFilter,
      outFields: ['*'],
    });

    // query to get just the ids since there is a maxRecordCount
    let queryTask = new QueryTask({
      url: services.data.waterbodyService.summary,
    });
    queryTask
      .executeForCount(query)
      .then((res) => {
        setNumberOfRecords(res ? res : 0);
        setSearchLoading(false);
        setConfirmOpen(true);
      })
      .catch((err) => {
        console.error(err);
        setSearchLoading(false);
        setNextFilter('');
        setServiceError(true);
      });
  }, [serviceError, nextFilter, services]);

  const [
    newDisplayOptions,
    setNewDisplayOptions, //
  ] = useState([defaultDisplayOption]);
  const [
    displayOptions,
    setDisplayOptions, //
  ] = useState([defaultDisplayOption]);
  const [
    selectedDisplayOption,
    setSelectedDisplayOption, //
  ] = useState(defaultDisplayOption);
  // Resets the filters when the user selects a different state
  useEffect(() => {
    // Reset ui
    setConfirmOpen(false);
    setServiceError(false);
    setSearchLoading(false);
    setWatershedMrcError(false);
    setSummaryMrcError(false);

    // Reset data
    setWaterbodyData(null);
    setWaterbodiesList(null);
    setNumberOfRecords(null);
    setStateAndOrganization(null);

    // Reset the filters
    setCurrentFilter(null);
    setWaterbodyFilter([]);
    setWatershedFilter([]);
    setWatershedResults({});
    setUseFilter([]);
    setWaterTypeFilter('all');
    setHasTmdlChecked(false);
    setParameterFilter([]);
    setNextFilter('');

    // Reset display options
    setNewDisplayOptions([defaultDisplayOption]);
    setDisplayOptions([defaultDisplayOption]);
    setSelectedDisplayOption(defaultDisplayOption);
  }, [
    activeState,
    setWaterbodyData,
    setCurrentReportingCycle,
    setStateAndOrganization,
  ]);

  const executeFilter = () => {
    setSearchLoading(true);

    // waterbody and watershed filter
    const requests = [];
    if (watershedFilter) {
      watershedFilter.forEach((watershed) => {
        // Fire off requests for any watersheds that we don't already have data for
        if (!watershedResults.hasOwnProperty(watershed.value)) {
          // run a fetch to get the assessments in the huc
          requests.push(
            fetchCheck(
              `${services.data.attains.serviceUrl}huc12summary?huc=${watershed.value}`,
            ),
          );
        }
      });
    }

    // If we have data for everything then execute the filter, otherwise parse the requests
    if (requests.length === 0) {
      executeFilterWrapped(watershedResults);
    } else {
      Promise.all(requests)
        .then((responses) => {
          // get and store new results
          let newWatershedResults = { ...watershedResults };
          responses.forEach((results) => {
            let waterbodies = [];
            let watershed = results.items[0];
            watershed.assessmentUnits.forEach((id) => {
              waterbodies.push(id);
            });

            // store the data so we don't need call the webservice again
            newWatershedResults[watershed.huc12] = waterbodies;
          });

          setWatershedResults(newWatershedResults);
          executeFilterWrapped(newWatershedResults);
        })
        .catch((err) => {
          console.error(err);
          setSearchLoading(false);
          setServiceError(true);
        });
    }
  };

  // build esri where clause
  const executeFilterWrapped = (watershedResults: Object) => {
    if (activeState.value === '' || !stateAndOrganization) return;

    let newFilter = `state = '${activeState.value}' AND organizationid = '${stateAndOrganization.organizationId}'`;

    // radio button filters
    if (waterTypeFilter === '303d') {
      newFilter = `${newFilter} And on303dlist = 'Y'`;
    } else if (waterTypeFilter === 'impaired') {
      newFilter = `${newFilter} And isimpaired = 'Y'`;
    }

    // has TMDL radio button filters
    if (hasTmdlChecked) {
      newFilter = `${newFilter} And hastmdl = 'Y'`;
    }

    // parameter group filter
    if (parameterFilter && parameterFilter.length > 0) {
      parameterFilter.forEach((param) => {
        newFilter = `${newFilter} And ${param.value} IS NOT NULL `;
        newFilter = `${newFilter} And ${param.value} <> 'Observed effect' `;
      });
    }

    // use group filter
    if (useFilter && useFilter.length > 0) {
      useFilter.forEach((use) => {
        newFilter = `${newFilter} And ${use.value} IS NOT NULL `;
      });
    }

    let waterbodyList = buildAssessmentUnitIdList(watershedResults) //
      .join("', '");
    if (waterbodyList && waterbodyList.length > 0) {
      newFilter = `${newFilter} And assessmentunitidentifier in ('${waterbodyList}')`;
    }

    // update the map if the filter criteria is different
    if (newFilter !== currentFilter || serviceError) {
      if (newFilter !== nextFilter || serviceError) {
        setNumberOfRecords(null);
        setNextFilter(newFilter);
      } else {
        // filter didn't change, re-show the dialog if the numberOfRecords has been
        // set (i.e. there is not already a query to get the number of records)
        if (numberOfRecords >= 0) setConfirmOpen(true);

        setSearchLoading(false);
      }
    } else {
      setSearchLoading(false);
      scrollToMap();
    }
  };

  // set the waterbody features
  const waterbodies = useWaterbodyFeaturesState();

  // Scrolls the page so the map, map footer and map/list buttons are visible
  const scrollToMap = () => {
    // scroll state content into view
    // get state content DOM node to scroll page when form is submitted
    const mapInputs = document.querySelector(`[data-content="stateinputs"]`);

    if (mapInputs) {
      mapInputs.scrollIntoView();
    }
  };

  // Makes the view on map button work for the state page
  // (i.e. switches and scrolls to the map when the selected graphic changes)
  const { selectedGraphic } = useContext(MapHighlightContext);
  useEffect(() => {
    if (!selectedGraphic) return;

    setShowMap(true);
    scrollToMap();
  }, [selectedGraphic]);

  // Waits until the data is loaded and the map is visible before scrolling
  // to the map
  useEffect(() => {
    if (!waterbodyData) return;

    scrollToMap();
  }, [waterbodyData]);

  // Combines the parameter groups and use groups filters to make the
  // display options.
  useEffect(() => {
    let newDisplayOptions = [defaultDisplayOption];

    // if the filter array exists add it to newDisplayOptions
    if (useFilter) {
      newDisplayOptions.push({
        label: 'Use Groups',
        options: useFilter.sort((a, b) => a.label.localeCompare(b.label)),
      });
    }
    if (parameterFilter) {
      newDisplayOptions.push({
        label: 'Parameter Groups',
        options: parameterFilter.sort((a, b) => a.label.localeCompare(b.label)),
      });
    }

    setNewDisplayOptions(newDisplayOptions);
  }, [parameterFilter, useFilter]);

  useWaterbodyOnMap(selectedDisplayOption.value, '', 'unassessed');

  // jsx
  const filterControls = (
    <>
      <p>
        Use this page to find the condition of waterbodies in your state and
        whether there are plans in place to restore them. The filters below are
        to help narrow down your search. There are no required fields.
      </p>

      <div css={inputsStyles}>
        <div css={inputStyles}>
          <span css={screenLabelStyles}>
            <GlossaryTerm term="Parameter Group">Parameter Groups</GlossaryTerm>
            :
          </span>
          <Select
            aria-label="Parameter Groups"
            isMulti
            isLoading={!parameterGroupOptions}
            isSearchable={false}
            options={parameterGroupOptions ? parameterGroupOptions : []}
            value={parameterFilter}
            onChange={(ev) => setParameterFilter(ev)}
            styles={reactSelectStyles}
          />
        </div>

        <div css={inputStyles}>
          <span css={screenLabelStyles}>
            <GlossaryTerm term="Use Group">Use Groups</GlossaryTerm>:
          </span>
          <Select
            aria-label="Use Groups"
            isMulti
            isSearchable={false}
            options={useFields}
            value={useFilter}
            onChange={(ev) => setUseFilter(ev)}
            styles={reactSelectStyles}
          />
        </div>
      </div>

      <div css={inputsStyles}>
        <div css={inputStyles}>
          <span css={screenLabelStyles}>
            <GlossaryTerm term="Watershed Names (HUC 12)">
              Watershed Names (HUC12)
            </GlossaryTerm>
            :
          </span>
          <Select
            aria-label="Watershed Names (HUC12)"
            isMulti
            isLoading={!watersheds}
            disabled={!watersheds}
            components={{ MenuList }} // virtualized list
            filterOption={createFilter({ ignoreAccents: false })} // performance boost
            options={
              watersheds
                ? watersheds
                    .filter((watershed) => watershed.label) // filter out nulls
                    .sort((a, b) => a.label.localeCompare(b.label))
                : []
            }
            value={watershedFilter}
            onChange={(ev) => setWatershedFilter(ev)}
            styles={reactSelectStyles}
          />
        </div>

        <div css={inputStyles}>
          <label htmlFor="waterbodies">Waterbody Names (IDs):</label>
          <Select
            inputId="waterbodies"
            isMulti
            isLoading={!waterbodiesList}
            disabled={!waterbodiesList}
            components={{ MenuList }} // virtualized list
            filterOption={createFilter({ ignoreAccents: false })} // performance boost
            options={
              waterbodiesList
                ? waterbodiesList.sort((a, b) => a.label.localeCompare(b.label))
                : []
            }
            value={waterbodyFilter}
            onChange={(ev) => setWaterbodyFilter(ev)}
            styles={reactSelectStyles}
          />
        </div>
      </div>

      <div css={inputsStyles}>
        <div css={inputStyles}>
          <span css={screenLabelStyles}>
            <GlossaryTerm term="Integrated Reporting (IR) Category">
              Integrated Reporting (IR) Category
            </GlossaryTerm>
            :
          </span>
          <div css={inputGroupStyles}>
            <div>
              <input
                id="ir-category-all"
                type="radio"
                name="ir-category"
                value="all"
                checked={waterTypeFilter === 'all'}
                onChange={(ev) => setWaterTypeFilter(ev.target.value)}
              />
              <label htmlFor="ir-category-all">All Waters</label>
            </div>

            <div>
              <input
                aria-label="303(d) Listed Impaired Waters (Category 5)"
                type="radio"
                name="ir-category"
                value="303d"
                checked={waterTypeFilter === '303d'}
                onChange={(ev) => setWaterTypeFilter(ev.target.value)}
              />
              <span css={screenLabelWithPaddingStyles}>
                <GlossaryTerm term="303(d) listed impaired waters (Category 5)">
                  303(d) Listed Impaired Waters (Category 5)
                </GlossaryTerm>
              </span>
            </div>

            <div>
              <input
                aria-label="Impaired (Category 4 and 5)"
                type="radio"
                name="ir-category"
                value="impaired"
                checked={waterTypeFilter === 'impaired'}
                onChange={(ev) => setWaterTypeFilter(ev.target.value)}
              />
              <span css={screenLabelWithPaddingStyles}>
                <GlossaryTerm term="Impaired (Category 4 and 5)">
                  Impaired (Category 4 and 5)
                </GlossaryTerm>
              </span>
            </div>
          </div>
        </div>

        <div css={inputStyles}>
          <span css={screenLabelStyles}>Additional Filters:</span>
          <div css={inputGroupStyles}>
            <input
              aria-label="Has TMDL"
              type="checkbox"
              checked={hasTmdlChecked}
              onChange={(ev) => setHasTmdlChecked(!hasTmdlChecked)}
            />
            <span css={screenLabelWithPaddingStyles}>
              <GlossaryTerm term="TMDL">Has TMDL</GlossaryTerm>
            </span>
          </div>
        </div>
      </div>

      <div css={searchStyles}>
        <button
          css={buttonStyles}
          disabled={searchLoading}
          onClick={(ev) => {
            if (mapView && mapView.popup) mapView.popup.close();
            executeFilter();
          }}
        >
          {searchLoading ? (
            <>
              <i className="fas fa-spinner fa-pulse" aria-hidden="true" />
              &nbsp;&nbsp;Loading...
            </>
          ) : (
            <>
              <i className="fas fa-search" aria-hidden="true" />
              &nbsp;&nbsp;Search
            </>
          )}
        </button>
      </div>
    </>
  );

  // jsx
  const resultsContainer = (
    <>
      <hr />

      <div css={resultsInputsStyles} data-content="stateinputs">
        <div css={resultsInputStyles}>
          <span css={screenLabelStyles}>
            Results:{' '}
            <span css={resultsItemsStyles}>
              {waterbodies ? waterbodies.length.toLocaleString() : 0} items
            </span>
          </span>
        </div>

        <div css={resultsInputStyles}>
          <label htmlFor="display-by">Display Waterbodies by:</label>
          <Select
            inputId="display-by"
            isSearchable={false}
            options={displayOptions}
            value={selectedDisplayOption}
            onChange={(ev) => setSelectedDisplayOption(ev)}
            styles={reactSelectStyles}
          />
        </div>

        <div css={resultsInputStyles}>
          <div
            css={buttonGroupStyles}
            className="btn-group float-right"
            role="group"
          >
            <button
              css={buttonStyles}
              type="button"
              className={`btn btn-secondary${showMap ? ' active' : ''}`}
              onClick={(ev) => setShowMap(true)}
            >
              <i className="fas fa-map-marked-alt" aria-hidden="true" />
              &nbsp;&nbsp;Map
            </button>
            <button
              css={buttonStyles}
              type="button"
              className={`btn btn-secondary${!showMap ? ' active' : ''}`}
              onClick={(ev) => setShowMap(false)}
            >
              <i className="fas fa-list" aria-hidden="true" />
              &nbsp;&nbsp;List
            </button>
          </div>
        </div>
      </div>
    </>
  );

  const { width, height } = useWindowSize();
  const [mapShownInitialized, setMapShownInitialized] = useState(false);
  useEffect(() => {
    if (mapShownInitialized || !width) return;

    if (width > 960) {
      setShowMap(true);
    } else {
      setShowMap(false);
    }

    setMapShownInitialized(true);
  }, [mapShownInitialized, width]);

  const reportStatusMapping = useReportStatusMappingContext();
  const mapContent = (
    <StateMap
      windowHeight={height}
      windowWidth={width}
      layout={fullscreenActive ? 'fullscreen' : 'narrow'}
      filter={currentFilter}
      activeState={activeState}
      numberOfRecords={numberOfRecords}
    >
      <div
        css={mapFooterStyles}
        style={{ width: fullscreenActive ? width : '100%' }}
      >
        {reportStatusMapping.status === 'failure' && (
          <div css={mapFooterMessageStyles}>{state303dStatusError}</div>
        )}
        <div css={mapFooterStatusStyles}>
          <strong>
            <GlossaryTerm term="303(d) listed impaired waters (Category 5)">
              303(d) List Status
            </GlossaryTerm>{' '}
            / Year Last Reported:
          </strong>
          &nbsp;&nbsp;
          {!currentReportStatus ? (
            <LoadingSpinner />
          ) : (
            <>
              {reportStatusMapping.status === 'fetching' && <LoadingSpinner />}
              {reportStatusMapping.status === 'failure' && (
                <>{currentReportStatus}</>
              )}
              {reportStatusMapping.status === 'success' && (
                <>
                  {reportStatusMapping.data.hasOwnProperty(currentReportStatus)
                    ? reportStatusMapping.data[currentReportStatus]
                    : currentReportStatus}
                </>
              )}
            </>
          )}
          <> / </>
          {currentReportingCycle.status === 'success' && (
            <>{currentReportingCycle.reportingCycle}</>
          )}
          {currentReportingCycle.status === 'fetching' && <LoadingSpinner />}
        </div>
      </div>
    </StateMap>
  );

  if (fullscreenActive) {
    return mapContent;
  }

  const contentVisible = currentFilter && waterbodyData;

  if (serviceError) {
    return (
      <div css={errorBoxStyles}>
        <p>{stateGeneralError}</p>
      </div>
    );
  }

  return (
    <div data-content="stateoverview">
      <ConfirmModal
        label="Warning about potentially slow search"
        isOpen={confirmOpen}
        confirmEnabled={numberOfRecords > 0}
        onConfirm={(ev) => {
          setConfirmOpen(false);
          setCurrentFilter(nextFilter);
          setWaterbodyData(null);
          setServiceError(false);
          // update the possible display options
          setDisplayOptions(newDisplayOptions);
          // figure out if the selected display option is available
          const indexOfDisplay = newDisplayOptions.findIndex((item) => {
            return item.value === selectedDisplayOption.value;
          });
          // set the display back to the default option
          if (newDisplayOptions.length === 1 || indexOfDisplay === -1) {
            setSelectedDisplayOption(defaultDisplayOption);
          }
        }}
        onCancel={(ev) => {
          setConfirmOpen(false);
        }}
      >
        Your search will return{' '}
        <strong>{numberOfRecords && numberOfRecords.toLocaleString()}</strong>{' '}
        results.
        <br />
        {numberOfRecords > 0 ? (
          <>Would you like to continue?</>
        ) : (
          <>Please change your filter criteria and try again.</>
        )}
      </ConfirmModal>

      {filterControls}

      {currentFilter && resultsContainer}

      {!contentVisible && currentFilter && <LoadingSpinner />}

      {contentVisible && (
        <div
          // the map needs to stay loaded in the background so the zoom to
          // feature and feature highlighting works correctly.
          style={{ display: showMap ? 'block' : 'none' }}
        >
          {mapContent}
        </div>
      )}

      {/* conditionally render the waterbody list to work around a render
          bug with react-virtualized where only a few list items are renered. */}
      {!showMap && contentVisible && (
        <>
          <hr />
          <WaterbodyListVirtualized
            waterbodies={waterbodies}
            type={'Waterbody State Overview'}
            fieldName={selectedDisplayOption.value}
          />
        </>
      )}
    </div>
  );
}

function MenuList({ ...props }) {
  const [cache] = useState(
    new CellMeasurerCache({
      defaultHeight: 50,
      fixedWidth: true,
    }),
  );

  // Resize the options when the search changes
  const listRef = useRef(null);
  useEffect(() => {
    if (!listRef || !listRef.current) return;

    cache.clearAll();
    listRef.current.recomputeRowHeights();
  }, [props.children.length, cache]);

  // use the default style dropdown if there is no data
  if (!props.children.length || props.children.length === 0) {
    return props.children;
  }

  // get the width from the parent of the virtualized list
  const elem = document.getElementById('virtualized-select-list');
  let width = 0;
  if (elem && elem.parentElement) {
    width = elem.parentElement.getBoundingClientRect().width;
  }

  return (
    <List
      id="virtualized-select-list"
      ref={listRef}
      deferredMeasurementCache={cache}
      height={props.maxHeight}
      width={width}
      rowHeight={cache.rowHeight}
      rowCount={props.children.length}
      overscanRowCount={25}
      style={{ paddingTop: '4px', paddingBottom: '4px' }}
      rowRenderer={({ index, isScrolling, key, parent, style }) => {
        return (
          <CellMeasurer
            cache={cache}
            columnIndex={0}
            rowCount={props.children.length}
            parent={parent}
            key={key}
            rowIndex={index}
          >
            <div style={style}>{props.children[index]}</div>
          </CellMeasurer>
        );
      }}
    />
  );
}
export default function AdvancedSearchContainer() {
  return (
    <MapHighlightProvider>
      <FullscreenProvider>
        <AdvancedSearch />
      </FullscreenProvider>
    </MapHighlightProvider>
  );
}
