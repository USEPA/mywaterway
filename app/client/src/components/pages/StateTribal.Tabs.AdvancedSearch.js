// @flow

import React, { useContext, useEffect, useState } from 'react';
import { css } from 'styled-components/macro';
import { useWindowSize } from '@reach/window-size';
import Select, { createFilter } from 'react-select';
import * as query from '@arcgis/core/rest/query';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import MenuList from 'components/shared/MenuList';
import Modal from 'components/shared/Modal';
import StateMap from 'components/shared/StateMap';
import WaterbodyListVirtualized from 'components/shared/WaterbodyListVirtualized';
// styled components
import { errorBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import { StateTribalTabsContext } from 'contexts/StateTribalTabs';
import { LayersProvider } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
import {
  useMapHighlightState,
  MapHighlightProvider,
} from 'contexts/MapHighlight';
import { useFullscreenState } from 'contexts/Fullscreen';
import {
  useReportStatusMappingContext,
  useServicesContext,
} from 'contexts/LookupFiles';
// utilities
import { getEnvironmentString, fetchCheck } from 'utils/fetchUtils';
import { chunkArray, isAbort } from 'utils/utils';
import {
  useAbort,
  useWaterbodyFeaturesState,
  useWaterbodyOnMap,
} from 'utils/hooks';
// data
import { impairmentFields, useFields } from 'config/attainsToHmwMapping';
// styles
import { reactSelectStyles } from 'styles/index.js';
// errors
import {
  stateGeneralError,
  status303dError,
  status303dShortError,
} from 'config/errorMessages';

const defaultDisplayOption = {
  label: 'Overall Waterbody Condition',
  value: '',
};

// Gets the maxRecordCount of the layer at the provided url
function retrieveMaxRecordCount(url, signal) {
  return new Promise((resolve, reject) => {
    // add an environment specific parameter to workaround an ESRI CORS bug
    const envParam = getEnvironmentString()
      ? `&${getEnvironmentString()}=1`
      : '';

    // get the max record count and then get the data
    fetchCheck(`${url}?f=json${envParam}`, signal)
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
    query
      .executeForIds(url, queryParams)
      .then((objectIds) => {
        // this block sometimes still executes when the request is aborted
        if (queryParams.signal?.aborted) reject({ name: 'AbortError' });
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
          const queryChunk = {
            ...queryParams,
            where: `OBJECTID in (${chunk.join(',')})`,
          };
          const request = query.executeQueryJSON(url, queryChunk);
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
  const { getSignal } = useAbort();
  const services = useServicesContext();

  const {
    organizationData,
    currentSummary,
    currentReportingCycle,
    setCurrentReportingCycle,
    activeState,
    stateAndOrganization,
    setStateAndOrganization,
  } = useContext(StateTribalTabsContext);

  const { fullscreenActive } = useFullscreenState();

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
    currentSummary.data?.waterTypes?.forEach((waterType) => {
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

    retrieveMaxRecordCount(services.data.wbd, getSignal())
      .then((maxRecordCount) => {
        setWatershedsLayerMaxRecordCount(maxRecordCount);
      })
      .catch((err) => {
        if (isAbort(err)) return;
        console.error(err);
        setSearchLoading(false);
        setServiceError(true);
        setWatershedMrcError(true);
      });
  }, [
    getSignal,
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
      signal: getSignal(),
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
        if (isAbort(err)) return;
        console.error(err);
        setSearchLoading(false);
        setServiceError(true);
        setWatersheds([]);
      });
  }, [activeState, getSignal, watershedsLayerMaxRecordCount, services]);

  // Get the maxRecordCount of the summary (waterbody) layer
  const [summaryMrcError, setSummaryMrcError] = useState(false);
  useEffect(() => {
    if (summaryLayerMaxRecordCount || summaryMrcError) return;

    retrieveMaxRecordCount(services.data.waterbodyService.summary, getSignal())
      .then((maxRecordCount) => {
        setSummaryLayerMaxRecordCount(maxRecordCount);
      })
      .catch((err) => {
        if (isAbort(err)) return;
        console.error(err);
        setSearchLoading(false);
        setServiceError(true);
        setSummaryMrcError(true);
      });
  }, [
    getSignal,
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
        signal: getSignal(),
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
          data.features.forEach((waterbody, _index) => {
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
          if (isAbort(err)) return;
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
        signal: getSignal(),
      };

      retrieveFeatures({
        url: services.data.waterbodyService.summary,
        queryParams,
        maxRecordCount: summaryLayerMaxRecordCount,
      })
        .then((data) => setWaterbodyData(data))
        .catch((err) => {
          if (isAbort(err)) return;
          console.error(err);
          setSearchLoading(false);
          setServiceError(true);
          setWaterbodyData({ features: [] });
        });
    }
  }, [
    getSignal,
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
  const [nextFilter, setNextFilter] = useState('');
  useEffect(() => {
    if (!nextFilter || serviceError) return;

    // query to get just the ids since there is a maxRecordCount
    const url = services.data.waterbodyService.summary;
    const queryParams = {
      returnGeometry: false,
      where: nextFilter,
      outFields: ['*'],
    };
    query
      .executeForCount(url, queryParams)
      .then((res) => {
        setNumberOfRecords(res);
        setSearchLoading(false);
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
  }, [activeState, setStateAndOrganization, setWaterbodyData]);

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
  const { selectedGraphic } = useMapHighlightState();
  const [prevSelectedGraphic, setPrevSelectedGraphic] =
    useState(selectedGraphic);
  if (prevSelectedGraphic !== selectedGraphic) {
    setPrevSelectedGraphic(selectedGraphic);
    setShowMap(true);
    scrollToMap();
  }

  // Waits until the data is loaded and the map is visible before scrolling
  // to the map
  const [prevWaterbodyData, setPrevWaterbodyData] = useState(waterbodyData);
  if (waterbodyData && prevWaterbodyData !== waterbodyData) {
    setPrevWaterbodyData(waterbodyData);
    scrollToMap();
  }

  // Combines the parameter groups and use groups filters to make the
  // display options.
  const updateDisplayOptions = (newParameterFilter, newUseFilter) => {
    let newDisplayOptions = [defaultDisplayOption];

    // if the filter array exists add it to newDisplayOptions
    if (newUseFilter) {
      newDisplayOptions.push({
        label: 'Use Groups',
        options: newUseFilter.sort((a, b) => a.label.localeCompare(b.label)),
      });
    }
    if (newParameterFilter) {
      newDisplayOptions.push({
        label: 'Parameter Groups',
        options: newParameterFilter.sort((a, b) =>
          a.label.localeCompare(b.label),
        ),
      });
    }

    setNewDisplayOptions(newDisplayOptions);
  };

  const updateParameterFilter = (newParameterFilter) => {
    setParameterFilter(newParameterFilter);
    updateDisplayOptions(newParameterFilter, useFilter);
  };

  const updateUseFilter = (newUseFilter) => {
    setUseFilter(newUseFilter);
    updateDisplayOptions(parameterFilter, newUseFilter);
  };

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
            options={parameterGroupOptions ?? []}
            value={parameterFilter}
            onChange={updateParameterFilter}
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
            onChange={updateUseFilter}
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
              onChange={(_ev) => setHasTmdlChecked(!hasTmdlChecked)}
            />
            <span css={screenLabelWithPaddingStyles}>
              <GlossaryTerm term="TMDL">Has TMDL</GlossaryTerm>
            </span>
          </div>
        </div>
      </div>

      <div css={searchStyles}>
        <Modal
          closeTitle="Cancel search"
          confirmEnabled={numberOfRecords > 0}
          isConfirm={true}
          label="Warning about potentially slow search"
          onConfirm={() => {
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
          triggerElm={
            <button
              css={buttonStyles}
              disabled={searchLoading}
              onClick={(_ev) => {
                mapView?.popup?.close();
                executeFilter();
              }}
            >
              <i className="fas fa-search" aria-hidden="true" />
              &nbsp;&nbsp;Search
            </button>
          }
        >
          {searchLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              Your search will return{' '}
              <strong>{numberOfRecords?.toLocaleString() ?? 0}</strong> results.
              <br />
              {numberOfRecords > 0 ? (
                <>Would you like to continue?</>
              ) : (
                <>Please change your filter criteria and try again.</>
              )}
            </>
          )}
        </Modal>
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
              onClick={(_ev) => setShowMap(true)}
            >
              <i className="fas fa-map-marked-alt" aria-hidden="true" />
              &nbsp;&nbsp;Map
            </button>
            <button
              css={buttonStyles}
              type="button"
              className={`btn btn-secondary${!showMap ? ' active' : ''}`}
              onClick={(_ev) => setShowMap(false)}
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
          <div css={mapFooterMessageStyles}>{status303dError}</div>
        )}
        <div css={mapFooterStatusStyles}>
          <strong>
            <GlossaryTerm term="303(d) listed impaired waters (Category 5)">
              303(d) List Status
            </GlossaryTerm>{' '}
            / Year Last Reported:
          </strong>
          &nbsp;&nbsp;
          {organizationData.status === 'fetching' && <LoadingSpinner />}
          {organizationData.status === 'failure' && <>{status303dShortError}</>}
          {organizationData.status === 'success' && (
            <>
              {reportStatusMapping.status === 'fetching' && <LoadingSpinner />}
              {reportStatusMapping.status === 'failure' && (
                <>{organizationData.data.reportStatusCode}</>
              )}
              {reportStatusMapping.status === 'success' && (
                <>
                  {reportStatusMapping.data.hasOwnProperty(
                    organizationData.data.reportStatusCode,
                  )
                    ? reportStatusMapping.data[
                        organizationData.data.reportStatusCode
                      ]
                    : organizationData.data.reportStatusCode}
                </>
              )}
            </>
          )}
          <> / </>
          {currentReportingCycle.status === 'fetching' && <LoadingSpinner />}
          {currentReportingCycle.status === 'success' && (
            <>{currentReportingCycle.reportingCycle}</>
          )}
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
        <p>{stateGeneralError()}</p>
      </div>
    );
  }

  return (
    <div data-content="stateoverview">
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

export default function AdvancedSearchContainer() {
  return (
    <LayersProvider>
      <MapHighlightProvider>
        <AdvancedSearch />
      </MapHighlightProvider>
    </LayersProvider>
  );
}
