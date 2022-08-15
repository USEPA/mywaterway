import Basemap from '@arcgis/core/Basemap';
import Graphic from '@arcgis/core/Graphic';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Viewpoint from '@arcgis/core/Viewpoint';
import Papa from 'papaparse';
import WindowSize from '@reach/window-size';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { useParams } from 'react-router-dom';
import Select from 'react-select';
import { css } from 'styled-components/macro';
// components
import { AccordionList, AccordionItem } from 'components/shared/Accordion';
import DateSlider from 'components/shared/DateSlider';
import MapErrorBoundary from 'components/shared/ErrorBoundary.MapErrorBoundary';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import HelpTooltip from 'components/shared/HelpTooltip';
import ScatterPlot from 'components/shared/ScatterPlot';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import Map from 'components/shared/Map';
import MapLoadingSpinner from 'components/shared/MapLoadingSpinner';
import MapVisibilityButton from 'components/shared/MapVisibilityButton';
import { errorBoxStyles, infoBoxStyles } from 'components/shared/MessageBoxes';
import NavBar from 'components/shared/NavBar';
import Page from 'components/shared/Page';
import ReactTable from 'components/shared/ReactTable';
import {
  splitLayoutContainerStyles,
  splitLayoutColumnsStyles,
  splitLayoutColumnStyles,
} from 'components/shared/SplitLayout';
// config
import { characteristicGroupMappings } from 'config/characteristicGroupMappings';
import { characteristicsByGroup } from 'config/characteristicsByGroup';
import { monitoringDownloadError, monitoringError } from 'config/errorMessages';
// contexts
import { useFullscreenState, FullscreenProvider } from 'contexts/Fullscreen';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
import { MapHighlightProvider } from 'contexts/MapHighlight';
// helpers
import { fetchCheck, fetchPost } from 'utils/fetchUtils';
import { useSharedLayers } from 'utils/hooks';
import { getPopupContent, getPopupTitle } from 'utils/mapFunctions';
import { parseAttributes, titleCaseWithExceptions } from 'utils/utils';
// styles
import {
  boxStyles,
  boxHeadingStyles,
  boxSectionStyles,
} from 'components/shared/Box';
import { colors, disclaimerStyles, reactSelectStyles } from 'styles';

/*
## Styles
*/

const accordionFlexStyles = css`
  display: flex;
  justify-content: space-between;
`;

const accordionHeadingStyles = css`
  ${accordionFlexStyles}
  font-size: 0.875rem;
  margin-top: 0 !important;
  padding: 0.75em 1em !important;
`;

const accordionRowStyles = css`
  ${accordionFlexStyles}
  ${accordionHeadingStyles}
  border-top: 1px solid #d8dfe2;
  span {
    display: flex;
  }
`;

const accordionStyles = css`
  margin-bottom: 1.25rem;
  width: 100%;

  .accordion-list > p {
    margin-top: 0;
    padding-bottom: 0.625em;
    text-align: left;
  }

  .total-row {
    margin-right: 1.75em;
  }

  input[type='checkbox'] {
    margin-right: 1em;
    position: relative;
    transform: scale(1.2);
  }
`;

const charcsTableStyles = css`
  ${boxSectionStyles}
  height: 50vh;
  overflow-y: scroll;
  .rt-table .rt-td {
    margin: auto;
  }
  .row-container {
    margin-bottom: 0.5rem;
  }
`;

const chartContainerStyles = css`
  margin: 1rem 0.625rem;
  height: 500px;
`;

const chartTooltipStyles = css`
  p {
    line-height: 1.2em;
    margin-bottom: 0;
    padding: 0;
    &:first-of-type {
      margin-bottom: 0.5em;
    }
  }
`;

const containerStyles = css`
  ${splitLayoutContainerStyles};
  max-width: 1800px;

  th,
  td {
    font-size: 0.875rem;
    line-height: 1.25;

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

const downloadLinksStyles = css`
  span {
    display: inline-block;
    margin-bottom: 0.25em;
  }

  div {
    display: inline-block;
    vertical-align: top;
    width: 50%;

    &:first-child {
      font-weight: normal;
      padding-left: 1rem;
      text-align: start;
    }
    &:last-child {
      font-weight: bold;
      padding-right: 1rem;
      text-align: end;
    }
  }

  p {
    margin-top: 0;
    line-height: 1em;
    font-size: 1em;
    &:nth-child(n + 2) {
      margin-top: 0.5em;
    }
  }
`;

const fileLinkStyles = css`
  background: none;
  border: none;
  color: #0071bc;
  margin: 0;
  outline: inherit;
  padding: 0;
  svg {
    display: inline-block;
    height: auto;
    margin: 0;
    width: 12px;
  }
`;

const iconStyles = css`
  margin-right: 5px;
`;

const infoBoxHeadingStyles = css`
  ${boxHeadingStyles};
  display: flex;
  align-items: flex-start;
  margin-bottom: 0;

  small {
    display: block;
    margin-top: 0.125rem;
  }

  /* loading icon */
  svg {
    margin: 0 -0.375rem 0 -0.875rem;
    height: 1.5rem;
  }
`;

const leftColumnStyles = css`
  ${splitLayoutColumnStyles}

  @media (min-width: 960px) {
    width: 50%;
    max-width: 582px;
  }
`;

const mapContainerStyles = css`
  display: flex;
  height: 100%;
  position: relative;
`;

const messageBoxStyles = (baseStyles) => {
  return css`
    ${baseStyles};
    text-align: center;
    margin: 1rem auto;
    padding: 0.7rem 1rem !important;
    max-width: max-content;
    width: 90%;
  `;
};

const modifiedBoxStyles = css`
  ${boxStyles}
  padding-bottom: 0;
`;

const modifiedDisclaimerStyles = css`
  ${disclaimerStyles};

  padding-bottom: 0;
`;

const modifiedSplitLayoutColumnsStyles = css`
  ${splitLayoutColumnsStyles};

  @media (min-width: 960px) {
    flex-flow: row nowrap;
  }
`;

const pageErrorBoxStyles = css`
  ${errorBoxStyles};
  margin: 1rem;
  text-align: center;
`;

const radioStyles = css`
  input {
    appearance: none;
    margin: 0;
  }
  input:checked + label:before {
    background-color: #38a6ee;
    box-shadow: 0 0 0 1px ${colors.steel()}, inset 0 0 0 1px ${colors.white()};
  }
  label {
    cursor: pointer;
    font-size: inherit;
    margin: auto;
    padding-left: 1em;
    text-indent: -1.1em;
    &:before {
      background: ${colors.white()};
      border-radius: 100%;
      box-shadow: 0 0 0 1px ${colors.steel()};
      content: ' ';
      display: inline-block;
      height: 1em;
      line-height: 1.25em;
      margin-right: 0.5em;
      position: relative;
      text-indent: 0;
      top: -1px;
      vertical-align: middle;
      white-space: pre;
      width: 1em;
    }
  }
`;

const radioTableStyles = css`
  ${radioStyles}
  display: flex;
  height: 100%;
  width: 100%;
`;

const rightColumnStyles = css`
  ${splitLayoutColumnStyles}

  @media (min-width: 960px) {
    flex-grow: 3;
    width: 50%;
  }
`;

const screenLabelStyles = css`
  display: inline-block;
  font-size: 0.875rem;
  font-weight: bold;
  margin-bottom: 0.125rem;
`;

const sectionInlineStyles = css`
  ${boxSectionStyles}
  border-bottom: 1px solid #d8dfe2;
  width: 100%;

  &:last-of-type {
    border-bottom: none;
  }

  &:first-of-type {
    border-bottom: 1px solid #d8dfe2;
  }

  /* loading icon */
  svg {
    display: inline-block;
    margin: -0.5rem;
    height: 1.25rem;
  }

  h3 {
    margin-right: 0.5em;
  }

  .label,
  .value {
    display: inline-block;
    line-height: 1.25;
    margin-top: 0;
    margin-bottom: 0;
  }
`;

const sectionInlineFlexStyles = css`
  ${sectionInlineStyles}
  align-items: flex-end;
  display: flex;
  justify-content: flex-start;
`;

const sectionInlineGridStyles = css`
  ${sectionInlineStyles}
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 0.5em;

  h3 {
    grid-column: 1;
  }

  p {
    grid-column: 2;
  }

  .label,
  .value {
    margin-bottom: auto;
    margin-top: auto;
  }
`;

const sectionInlineGridWideStyles = css`
  ${sectionInlineGridStyles}
  grid-template-columns: minmax(100px, 300px) minmax(100px, 1fr);
`;

const selectContainerStyles = css`
  display: flex;
  flex-wrap: wrap;
  gap: 1em;
  justify-content: center;
  margin-top: 1rem;
  padding: 0 0.5rem;
  width: 100%;

  label {
    margin-right: 0.625rem;
    margin-bottom: 0.125rem;
    font-size: 0.875rem;
    font-weight: bold;
    white-space: nowrap;
  }

  .radio-container {
    display: inline-flex;
    flex-direction: column;
    gap: 0.2em;
  }

  .radios {
    ${radioStyles}
    display: inline-flex;
    flex-direction: row;
    gap: 1em;
    margin: auto;

    label {
      font-weight: normal;
    }
  }

  .select {
    width: 100%;
  }
`;

const shadedBoxSectionStyles = css`
  ${boxSectionStyles}
  background-color: #f0f6f9;
`;

const sliderContainerStyles = css`
  ${boxSectionStyles}
  align-items: flex-end;
  display: flex;
  justify-content: center;
  height: 3.5em;
  margin-top: 0.4375rem;
  width: 100%;
  span {
    margin-bottom: 0.1em;
    &:first-of-type {
      margin-left: 1em;
    }
    &:last-of-type {
      margin-right: 1em;
    }
  }
  .container {
    border-bottom: 1px solid #d8dfe2;
  }
`;

const treeStyles = (level, styles) => {
  return css`
    ${styles}
    margin-left: calc(${level} * 1em);
    margin-right: calc(${level} * 1.25em);
  `;
};

/*
## Helpers
*/

function buildOptions(values) {
  return Array.from(values).map((value) => {
    return { value: value, label: value };
  });
}

function buildTooltip(unit) {
  return (tooltipData) => {
    if (!tooltipData?.nearestDatum) return null;
    const datum = tooltipData.nearestDatum.datum;
    const msmt = datum.y[tooltipData.nearestDatum.key];
    if (!msmt) return null;
    const depth =
      msmt.depth !== null && msmt.depthUnit !== null
        ? `${msmt.depth} ${msmt.depthUnit}`
        : null;
    return (
      <div css={chartTooltipStyles}>
        <p>{datum.x}:</p>
        <p>
          <em>Measurement</em>: {`${msmt.value} ${unit === 'None' ? '' : unit}`}
          <br />
          {depth && (
            <>
              <em>Depth</em>: {depth}
            </>
          )}
        </p>
      </div>
    );
  };
}

function checkboxReducer(state, action) {
  switch (action.type) {
    case 'all': {
      return toggleAll(state);
    }
    case 'load': {
      const { data } = action.payload;
      return loadNewData(data, state);
    }
    case 'groups': {
      const { id } = action.payload;
      const entity = state.groups[id];
      return toggle(state, id, entity, action.type);
    }
    case 'charcs': {
      const { id } = action.payload;
      const entity = state.charcs[id];
      return toggle(state, id, entity, action.type);
    }
    default:
      throw new Error('Invalid action type');
  }
}

const Checkbox = {
  checked: 1,
  indeterminate: 0.5,
  unchecked: 0,
};

const dateOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

async function drawSite(site, layer) {
  if (isEmpty(site)) return false;
  const newFeature = new Graphic({
    geometry: {
      type: 'point',
      latitude: site.locationLatitude,
      longitude: site.locationLongitude,
    },
    attributes: {
      ...site,
      locationUrl: window.location.href,
      stationProviderName: site.providerName,
      stationTotalSamples: site.totalSamples,
      stationTotalMeasurements: site.totalMeasurements,
      stationTotalsByGroup: JSON.stringify(site.charcGroupCounts),
    },
  });
  const featureSet = await layer.queryFeatures();
  const editResults = await layer.applyEdits({
    deleteFeatures: featureSet.features,
    addFeatures: [newFeature],
  });
  return editResults?.addFeatureResults?.length ? true : false;
}

async function fetchSiteDetails(url, setData, setStatus) {
  const res = await fetchCheck(url);
  if (res.features.length < 1) {
    setStatus('empty');
    setData({});
    return;
  }
  const feature = res.features[0];
  const siteDetails = {
    county: feature.properties.CountyName,
    charcGroupCounts: feature.properties.characteristicGroupResultCount,
    charcLabels: labelGroups(
      feature.properties.characteristicGroupResultCount,
      characteristicGroupMappings,
    ),
    huc8: feature.properties.HUCEightDigitCode,
    locationLongitude: feature.geometry.coordinates[0],
    locationLatitude: feature.geometry.coordinates[1],
    locationName: feature.properties.MonitoringLocationName,
    locationType: feature.properties.MonitoringLocationTypeName,
    monitoringType: 'Past Water Conditions',
    orgId: feature.properties.OrganizationIdentifier,
    orgName: feature.properties.OrganizationFormalName,
    siteId: feature.properties.MonitoringLocationIdentifier,
    providerName: feature.properties.ProviderName,
    state: feature.properties.StateName,
    totalSamples: parseInt(feature.properties.activityCount),
    totalMeasurements: parseInt(feature.properties.resultCount),
    uniqueId:
      `${feature.properties.MonitoringLocationIdentifier}/` +
      `${feature.properties.ProviderName}/` +
      `${feature.properties.OrganizationIdentifier}`,
  };
  siteDetails.charcLabelCounts = parseLabelCounts(
    siteDetails.charcGroupCounts,
    siteDetails.charcLabels,
    characteristicGroupMappings,
  );
  setData(siteDetails);
  setStatus('success');
}

function fetchParseCsv(url) {
  return new Promise((complete, error) => {
    Papa.parse(url, {
      complete,
      download: true,
      dynamicTyping: true,
      error,
      header: true,
      worker: true,
    });
  });
}

function getCharcLabel(charcGroup, labelMappings) {
  for (let mapping of labelMappings) {
    if (mapping.groupNames.includes(charcGroup)) return mapping.label;
  }
  return 'Other';
}

function getCharcGroup(charcName, groupMappings) {
  for (let mapping of Object.keys(groupMappings)) {
    if (groupMappings[mapping].includes(charcName)) return mapping;
  }
  return 'Not Assigned';
}

function getDate(record) {
  let month = record.month.toString();
  if (record.month < 10) month = '0' + month;
  let day = record.day.toString();
  if (record.day < 10) day = '0' + day;
  return `${record.year}-${month}-${day}`;
}

function getFilteredCount(range, records, count) {
  if (range) {
    let filteredCount = 0;
    records.forEach((record) => {
      if (record.year >= range[0] && record.year <= range[1]) {
        filteredCount += 1;
      }
    });
    return filteredCount;
  }
  return count;
}

function getCheckedStatus(numberSelected, children) {
  let status = Checkbox.indeterminate;
  if (numberSelected === 0) status = Checkbox.unchecked;
  else if (numberSelected === children.length) status = Checkbox.checked;
  return status;
}

function getMean(values) {
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  return parseFloat(mean.toFixed(3));
}

function getMedian(values) {
  const sorted = [...values].sort();
  const numValues = values.length;
  let median = 0;
  if (numValues % 2 === 0) {
    median = (sorted[numValues / 2 - 1] + sorted[numValues / 2]) / 2;
  } else {
    median = sorted[(numValues - 1) / 2];
  }
  return parseFloat(median.toFixed(3));
}

function getStdDev(values, mean = null) {
  if (values.length <= 1) return null;
  const sampleMean = mean ?? getMean(values);
  const tss = values.reduce((a, b) => a + (b - sampleMean) ** 2, 0);
  const variance = tss / (values.length - 1);
  const stdDev = Math.sqrt(variance);
  return parseFloat(stdDev.toFixed(3));
}

function getTotalCount(charcs) {
  let totalCount = 0;
  Object.values(charcs).forEach((charc) => {
    if (charc.selected) totalCount += charc.count;
  });
  return totalCount;
}

async function getZoomParams(layer) {
  const featureSet = await layer.queryFeatures();
  const graphics = featureSet.features;
  if (graphics.length === 1 && graphics[0].geometry.type === 'point') {
    // handle zooming to a single point graphic
    return {
      target: graphics[0],
      zoom: 16,
    };
  }
}

function labelGroups(charcGroups, mappings) {
  const labels = {};
  mappings
    .filter((mapping) => mapping.label !== 'All')
    .forEach((mapping) => {
      for (const charcGroup in charcGroups) {
        if (mapping.groupNames.includes(charcGroup)) {
          if (!labels[mapping.label]) labels[mapping.label] = [];
          labels[mapping.label].push(charcGroup);
        }
      }
    });

  // add any leftover lower-tier group counts to the 'Other' category
  const groupsLabelled = Object.values(labels).reduce((a, b) => {
    a.push(...b);
    return a;
  }, []);
  for (const charcGroup in charcGroups) {
    if (!groupsLabelled.includes(charcGroup)) {
      if (!labels['Other']) labels['Other'] = [];
      labels['Other'].push(charcGroup);
    }
  }
  return labels;
}

const initialCheckboxes = {
  all: 0,
  groups: {},
  charcs: {},
};

function handleCheckbox(id, accessor, dispatch) {
  return () => {
    dispatch({
      type: accessor,
      payload: { id },
    });
  };
}

function isEmpty(obj) {
  for (let prop in obj) {
    if (obj.hasOwnProperty(prop)) return false;
  }
  return true;
}

const lineColors = {
  Bacterial: '#03a66a',
  Metals: '#526571',
  Nutrients: '#00de04',
  Other: '#38a6ee',
  Pesticides: '#400587',
  PFAS: '#eb4034',
  Physical: '#ad9e71',
  Sediments: '#9c7803',
};

function loadNewData(data, state) {
  const newCharcs = {};
  const newGroups = {};

  const { charcs, groups } = data;

  // loop once to build the new data structure
  Object.values(charcs).forEach((charc) => {
    newCharcs[charc.id] = {
      ...charc,
      selected: state.charcs[charc.id]?.selected ?? Checkbox.checked,
    };
  });
  Object.values(groups).forEach((group) => {
    newGroups[group.id] = {
      ...group,
      charcs: Array.from(group.charcs),
      selected: Checkbox.unchecked,
    };
  });

  const allSelected = updateSelected(newCharcs, newGroups);

  return {
    all: allSelected,
    charcs: newCharcs,
    groups: newGroups,
  };
}

function parseCharcs(charcs, range) {
  const result = {
    groups: {},
    charcs: {},
  };
  // structure characteristics by group
  Object.entries(charcs).forEach(([charc, data]) => {
    const { group, count, records } = data;

    let newCount = getFilteredCount(range, records, count);

    if (newCount > 0) {
      if (!result.groups[group]) {
        result.groups[group] = {
          charcs: new Set(),
          count: 0,
          id: group,
        };
      }
      result.charcs[charc] = {
        count: newCount,
        id: charc,
        group,
      };

      result.groups[group].count += newCount;
      result.groups[group].charcs.add(charc);
    }
  });
  return result;
}

function parseLabelCounts(groupCounts, charcLabels, mappings) {
  const labelCounts = {};
  mappings
    .filter((mapping) => mapping.label !== 'All')
    .forEach((mapping) => (labelCounts[mapping.label] = 0));
  Object.entries(charcLabels).forEach(([charcLabel, charcGroups]) => {
    charcGroups.forEach(
      (charcGroup) => (labelCounts[charcLabel] += groupCounts[charcGroup]),
    );
  });

  return labelCounts;
}

const row = (label, value, style, dataStatus = 'success') => (
  <div className="row-container" css={style}>
    <h3 className="label">{label}:</h3>
    {dataStatus === 'fetching' && <LoadingSpinner />}
    {dataStatus === 'failure' && <p className="value">N/A</p>}
    {dataStatus === 'success' && <p className="value">{value}</p>}
  </div>
);

const rowFlex = (label, value, dataStatus = 'success') => {
  return row(label, value, sectionInlineFlexStyles, dataStatus);
};

const rowGrid = (label, value, dataStatus = 'success') => {
  return row(label, value, sectionInlineGridStyles, dataStatus);
};

const rowWideGrid = (label, value, dataStatus = 'success') => {
  return row(label, value, sectionInlineGridWideStyles, dataStatus);
};

function toggle(state, id, entity, level) {
  const newSelected = entity.selected === 0 ? 1 : 0;

  const newCharcs = { ...state.charcs };
  const newGroups = { ...state.groups };

  switch (level) {
    case 'charcs': {
      updateEntity(newCharcs, id, entity, newSelected);
      const charcIds = newGroups[entity.group].charcs;
      updateParent(newGroups, newCharcs, entity.group, charcIds);
      break;
    }
    case 'groups': {
      const ref = 'group';
      updateEntity(newGroups, id, entity, newSelected);
      updateDescendants(newCharcs, ref, id, newSelected);
      break;
    }
    default:
      throw new Error('Invalid action type');
  }

  const groupIds = Object.keys(newGroups);
  let groupsSelected = 0;
  groupIds.forEach((groupId) => {
    groupsSelected += newGroups[groupId].selected;
  });
  let allSelected = getCheckedStatus(groupsSelected, groupIds);

  return {
    all: allSelected,
    charcs: newCharcs,
    groups: newGroups,
  };
}

function toggleAll(state) {
  const newSelected = state.all === 0 ? 1 : 0;
  const newCharcs = {};
  Object.values(state.charcs).forEach((charc) => {
    newCharcs[charc.id] = {
      ...charc,
      selected: newSelected,
    };
  });
  const newGroups = {};
  Object.values(state.groups).forEach((group) => {
    newGroups[group.id] = {
      ...group,
      selected: newSelected,
    };
  });
  return {
    all: newSelected,
    charcs: newCharcs,
    groups: newGroups,
  };
}

function updateEntity(obj, id, entity, selected) {
  obj[id] = {
    ...entity,
    selected,
  };
}

function updateDescendants(obj, ref, id, selected) {
  Object.values(obj).forEach((entity) => {
    if (entity[ref] === id) {
      obj[entity.id] = {
        ...entity,
        selected,
      };
    }
  });
}

function updateParent(parentObj, childObj, parentId, childIds) {
  let childrenSelected = 0;
  childIds.forEach((childId) => {
    childrenSelected += childObj[childId].selected;
  });
  let parentSelected = getCheckedStatus(childrenSelected, childIds);
  parentObj[parentId] = {
    ...parentObj[parentId],
    selected: parentSelected,
  };
}

function updateSelected(charcs, groups) {
  let groupsSelected = 0;

  // loop over again to get checkbox values
  Object.values(charcs).forEach((charc) => {
    groups[charc.group].selected += charc.selected;
  });
  Object.values(groups).forEach((group) => {
    group.selected = getCheckedStatus(group.selected, group.charcs);
    groupsSelected += group.selected;
  });

  return getCheckedStatus(groupsSelected, Object.keys(groups));
}

function useCharacteristics(provider, orgId, siteId) {
  const services = useServicesContext();

  // charcs => characteristics
  const [charcs, setCharcs] = useState({});
  const [status, setStatus] = useState('idle');

  const structureRecords = useCallback(
    (records) => {
      if (!records) {
        setCharcs({});
        setStatus('failure');
        return;
      } else if (!records.length) {
        setCharcs({});
        setStatus('empty');
        return;
      }
      const recordsByCharc = {};
      records.forEach((record) => {
        if (record.ActivityTypeCode.toLowerCase().includes('control')) return;
        if (!recordsByCharc[record.CharacteristicName]) {
          const charcGroup = getCharcGroup(
            record.CharacteristicName,
            characteristicsByGroup,
          );
          recordsByCharc[record.CharacteristicName] = {
            name: record.CharacteristicName,
            label: getCharcLabel(charcGroup, characteristicGroupMappings),
            records: [],
            group: charcGroup,
            count: 0,
          };
        }
        const curCharc = recordsByCharc[record.CharacteristicName];
        curCharc.count += 1;
        const recordDate = record.ActivityStartDate.split('-');
        curCharc.records.push({
          day: parseInt(recordDate[2]),
          depth: record['ResultDepthHeightMeasure/MeasureValue'] ?? null,
          depthUnit: record['ResultDepthHeightMeasure/MeasureUnitCode'] || null,
          fraction: record.ResultSampleFractionText || 'None',
          measurement: record.ResultMeasureValue ?? null,
          medium: record.ActivityMediaName || 'None',
          month: parseInt(recordDate[1]),
          /* speciation: record.MethodSpecificationName || 'None', */
          unit: record['ResultMeasure/MeasureUnitCode'] || 'None',
          year: parseInt(recordDate[0]),
        });
      });
      setCharcs(recordsByCharc);
      setStatus('success');
    },
    [setCharcs, setStatus],
  );

  useEffect(() => {
    if (services.status !== 'success') return;
    setStatus('fetching');
    const url =
      `${services.data.waterQualityPortal.resultSearch}` +
      `&mimeType=csv&zip=no&dataProfile=resultPhysChem` +
      `&providers=${encodeURIComponent(
        provider,
      )}&organization=${encodeURIComponent(orgId)}&siteid=${encodeURIComponent(
        siteId,
      )}`;
    fetchParseCsv(url)
      .then((results) => structureRecords(results.data))
      .catch((_err) => {
        setStatus('failure');
        console.error('Papa Parse error');
      });
  }, [orgId, provider, services, siteId, structureRecords]);

  return [charcs, status];
}

function useSiteDetails(provider, orgId, siteId) {
  const services = useServicesContext();

  const [site, setSite] = useState({});
  const [siteStatus, setSiteStatus] = useState('fetching');

  useEffect(() => {
    const url =
      `${services.data.waterQualityPortal.monitoringLocation}` +
      `search?mimeType=geojson&zip=no&provider=${encodeURIComponent(
        provider,
      )}&organization=${encodeURIComponent(orgId)}&siteid=${encodeURIComponent(
        siteId,
      )}`;

    fetchSiteDetails(url, setSite, setSiteStatus).catch((err) => {
      console.error(err);
      setSiteStatus('failure');
      setSite({});
    });
  }, [provider, services, setSite, setSiteStatus, orgId, siteId]);

  return [site, siteStatus];
}

/*
## Components
*/

function CharacteristicChartSection({ charcName, charcsStatus, records }) {
  const [measurements, setMeasurements] = useState(null);

  // Selected and available units
  const [unit, setUnit] = useState(null);
  const [units, setUnits] = useState(null);
  useEffect(() => {
    if (units?.length) setUnit(units[0].value);
  }, [units]);

  // Selected and available sample fractions
  const [fraction, setFraction] = useState(null);
  const [fractions, setFractions] = useState(null);
  useEffect(() => {
    if (fractions?.length) setFraction(fractions[0].value);
  }, [fractions]);

  // Selected and available activity media names
  const [medium, setMedium] = useState(null);
  const [media, setMedia] = useState(null);
  useEffect(() => {
    if (media?.length) setMedium(media[0].value);
  }, [media]);

  /* This will be added back with the new service
  // Selected and available speciations
  const [spec, setSpec] = useState(null);
  const [specs, setSpecs] = useState(null); */

  // Logarithmic or linear
  const [scaleType, setScaleType] = useState('linear');

  useEffect(() => {
    if (!records) return;
    const newMeasurements = [];
    const fractionValues = new Set();
    /* const specValues = new Set(); */
    const unitValues = new Set();
    const mediumValues = new Set();

    records.forEach((record) => {
      if (!Number.isFinite(record.measurement)) return;

      // Add record measurement to newMeasurements
      unitValues.add(record.unit);
      fractionValues.add(record.fraction);
      mediumValues.add(record.medium);
      /* specValues.add(record.speciation); */

      record.date = getDate(record);
      record.measurement = parseFloat(record.measurement.toFixed(3));
      newMeasurements.push(record);
    });

    newMeasurements
      .sort((a, b) => a.day - b.day)
      .sort((a, b) => a.month - b.month)
      .sort((a, b) => a.year - b.year);

    if (newMeasurements.length) {
      setFractions(buildOptions(fractionValues));
      /* setSpecs(buildOptions(specValues)); */
      setUnits(buildOptions(unitValues));
      setMedia(buildOptions(mediumValues));
      setMeasurements(newMeasurements);
    } else {
      setFractions(null);
      setUnits(null);
      setMedia(null);
      setMeasurements(null);
    }

    setScaleType('linear');
  }, [records]);

  const [chartData, setChartData] = useState(null);
  const [dataKeys, setDataKeys] = useState(null);
  const [domain, setDomain] = useState(null);
  const [range, setRange] = useState(null);
  const [mean, setMean] = useState(null);
  const [median, setMedian] = useState(null);
  const [stdDev, setStdDev] = useState(null);

  const parseMeasurements = useCallback((newDomain, newMsmts) => {
    const newChartData = [];

    let maxCount = 0;
    let curDatum = null;
    let curCount = 0;
    newMsmts.forEach((msmt) => {
      if (msmt.year >= newDomain[0] && msmt.year <= newDomain[1]) {
        curCount++;
        const dataPoint = {
          value: msmt.measurement,
          depth: msmt.depth,
          depthUnit: msmt.depthUnit,
        };
        if (!curDatum || curDatum.x !== msmt.date) {
          curDatum && newChartData.push(curDatum);
          curCount = 1;
          curDatum = {
            x: msmt.date,
            y: { 0: dataPoint },
          };
        } else {
          curDatum.y[curCount.toString()] = dataPoint;
        }
        if (curCount > maxCount) maxCount = curCount;
      }
    });
    curDatum && newChartData.push(curDatum);
    setChartData(newChartData.length ? newChartData : null);
    setDataKeys([...Array(maxCount).keys()]);
    return newChartData;
  }, []);

  const getChartData = useCallback(
    (newDomain, newMsmts) => {
      // newMsmts must already be sorted by date
      const filteredMsmts =
        newMsmts?.filter((msmt) => {
          return (
            msmt.fraction === fraction &&
            msmt.unit === unit &&
            msmt.medium === medium
          );
        }) || [];

      const newChartData = parseMeasurements(newDomain, filteredMsmts);

      if (!newChartData.length) return;

      setDomain([newChartData[0].x, newChartData[newChartData.length - 1].x]);

      const yValues = [];
      newChartData.forEach((datum) => {
        Object.values(datum.y).forEach((msmt) => yValues.push(msmt.value));
      });

      const newRange = [Math.min(...yValues), Math.max(...yValues)];
      setRange(newRange);

      const newMean = getMean(yValues);

      setMean(newMean);
      setMedian(getMedian(yValues));
      setStdDev(getStdDev(yValues, newMean));
    },
    [fraction, medium, parseMeasurements, unit],
  );

  const [minYear, setMinYear] = useState(null);
  const [maxYear, setMaxYear] = useState(null);
  // Initialize the chart
  useEffect(() => {
    if (measurements?.length) {
      const yearLow = measurements[0].year;
      const yearHigh = measurements[measurements.length - 1].year;
      setMinYear(yearLow);
      setMaxYear(yearHigh);
      getChartData([yearLow, yearHigh], measurements);
    } else {
      setChartData(null);
      setMinYear(null);
      setMaxYear(null);
    }
  }, [getChartData, measurements]);

  // Title for the y-axis
  let yTitle = charcName;
  if (fraction !== 'None') yTitle += ', ' + fraction?.replace(',', ' -');
  /* if (spec !== 'None') yTitle += ', ' + spec; */
  if (unit !== 'None') yTitle += ', ' + unit;

  let infoText = null;
  if (!charcName)
    infoText =
      'Select a characteristic from the table above to graph its results.';
  else if (!measurements)
    infoText =
      'No measurements available to be charted for this characteristic.';

  let average = mean?.toLocaleString('en-US');
  if (stdDev)
    average += ` ${String.fromCharCode(177)} ${stdDev.toLocaleString()}`;
  if (unit !== 'None') average += ` ${unit}`;

  return (
    <div css={modifiedBoxStyles}>
      <h2 css={infoBoxHeadingStyles}>
        Chart of Results for{' '}
        {!charcName
          ? 'Selected Characteristic'
          : titleCaseWithExceptions(charcName)}
      </h2>
      <StatusContent
        empty={
          <p css={messageBoxStyles(infoBoxStyles)}>
            No data available for this monitoring location.
          </p>
        }
        failure={
          <p css={messageBoxStyles(errorBoxStyles)}>{monitoringError}</p>
        }
        fetching={<LoadingSpinner />}
        status={charcsStatus}
      >
        {infoText ? (
          <p css={messageBoxStyles(infoBoxStyles)}>{infoText}</p>
        ) : (
          <>
            <SliderContainer
              min={minYear}
              max={maxYear}
              disabled={!Boolean(records.length)}
              onChange={(newDomain) => getChartData(newDomain, measurements)}
            />
            <div css={selectContainerStyles}>
              <span>
                <span css={screenLabelStyles}>
                  <GlossaryTerm term="Unit">Unit</GlossaryTerm>:
                </span>
                <Select
                  aria-label="Unit"
                  className="select"
                  inputId={'unit'}
                  isSearchable={false}
                  options={units}
                  value={units.find((u) => u.value === unit)}
                  onChange={(ev) => {
                    setUnit(ev.value);
                  }}
                  styles={reactSelectStyles}
                />
              </span>
              <span>
                <span css={screenLabelStyles}>
                  <GlossaryTerm term="Sample Fraction">
                    Sample Fraction
                  </GlossaryTerm>
                  :
                </span>
                <Select
                  aria-label="Sample Fraction"
                  className="select"
                  inputId={'sample-fraction'}
                  isSearchable={false}
                  options={fractions}
                  value={fractions.find((f) => f.value === fraction)}
                  onChange={(ev) => {
                    setFraction(ev.value);
                  }}
                  styles={reactSelectStyles}
                />
              </span>
              <span>
                <span css={screenLabelStyles}>
                  <GlossaryTerm term="Media Name">Media Name</GlossaryTerm>:
                </span>
                <Select
                  aria-label="Media Name"
                  className="select"
                  inputId={'media-name'}
                  isSearchable={false}
                  options={media}
                  value={media.find((f) => f.value === medium)}
                  onChange={(ev) => {
                    setMedium(ev.value);
                  }}
                  styles={reactSelectStyles}
                />
              </span>
              {/*
              <span>
                <label htmlFor="speciation">Method Speciation:</label>
                <Select
                  className="select"
                  inputId={'speciation'}
                  isSearchable={false}
                  options={specs}
                  value={specs.find((s) => s.value === spec)}
                  onChange={(ev) => {
                    setSpec(ev.value);
                  }}
                  styles={reactSelectStyles}
                />
              </span>
              */}
              <span className="radio-container">
                <span css={screenLabelStyles}>
                  <GlossaryTerm term="Scale Type">Scale Type</GlossaryTerm>:
                </span>
                <span className="radios">
                  <span>
                    <input
                      checked={scaleType === 'linear'}
                      id={'linear'}
                      onChange={(e) => setScaleType(e.target.value)}
                      type="radio"
                      value={'linear'}
                    />
                    <label htmlFor={'linear'}>Linear</label>
                  </span>
                  <span>
                    <input
                      checked={scaleType === 'log'}
                      id={'log'}
                      onChange={(e) => setScaleType(e.target.value)}
                      type="radio"
                      value={'log'}
                    />
                    <label htmlFor={'log'}>Log</label>
                  </span>
                </span>
              </span>
            </div>
            <ChartContainer
              range={range}
              charcName={charcName}
              data={chartData}
              scaleType={scaleType}
              dataKeys={dataKeys}
              yTitle={yTitle}
              unit={unit}
            />
            {chartData?.length > 0 && (
              <div css={shadedBoxSectionStyles}>
                {rowWideGrid(
                  'Selected Date Range',
                  `${new Date(domain[0]).toLocaleDateString(
                    'en-us',
                    dateOptions,
                  )}` +
                    ` - ${new Date(domain[1]).toLocaleDateString(
                      'en-us',
                      dateOptions,
                    )}`,
                )}
                {rowWideGrid(
                  'Number of Measurements Shown',
                  chartData.length.toLocaleString(),
                )}
                {rowWideGrid('Average of Values', average)}
                {rowWideGrid(
                  'Median Value',
                  `${median.toLocaleString()} ${unit !== 'None' ? unit : ''}`,
                )}
                {range &&
                  rowWideGrid(
                    'Minimum Value',
                    `${range[0].toLocaleString()} ${
                      unit !== 'None' ? unit : ''
                    }`,
                  )}
                {range &&
                  rowWideGrid(
                    'Maximum Value',
                    `${range[1].toLocaleString()} ${
                      unit !== 'None' ? unit : ''
                    }`,
                  )}
              </div>
            )}
          </>
        )}
      </StatusContent>
    </div>
  );
}

function CheckboxRow({ accessor, id, level, state, dispatch }) {
  const item = state[accessor][id];
  return (
    <div css={treeStyles(level, accordionRowStyles)}>
      <span>
        <input
          type="checkbox"
          checked={item.selected === Checkbox.checked}
          ref={(input) => {
            if (input)
              input.indeterminate = item.selected === Checkbox.indeterminate;
          }}
          onChange={handleCheckbox(id, accessor, dispatch)}
          style={{ top: '1px' }}
        />
        <strong>{id}</strong>
      </span>
      <strong>{item.count.toLocaleString()}</strong>
    </div>
  );
}

function CharacteristicsTableSection({
  charcs,
  charcsStatus,
  selected,
  setSelected,
}) {
  const tableData = useMemo(() => {
    return Object.values(charcs)
      .map((charc) => {
        const selector = (
          <div css={radioTableStyles}>
            <input
              checked={selected === charc.name}
              id={charc.name}
              onChange={(e) => setSelected(e.target.value)}
              type="radio"
              value={charc.name}
            />
            <label htmlFor={charc.name}>
              <span className="sr-only">{charc.name}</span>
            </label>
          </div>
        );
        const measurementCount = charc.records.reduce((a, b) => {
          if (Number.isFinite(b.measurement)) return a + 1;
          return a;
        }, 0);
        return {
          label: charc.label,
          measurementCount: measurementCount.toLocaleString(),
          name: charc.name,
          resultCount: charc.count.toLocaleString(),
          select: selector,
          group: charc.group,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [charcs, selected, setSelected]);

  return (
    <div css={boxStyles}>
      <h2 css={infoBoxHeadingStyles}>Characteristics</h2>
      <div css={charcsTableStyles}>
        <StatusContent
          empty={
            <p css={messageBoxStyles(infoBoxStyles)}>
              No records found for this location.
            </p>
          }
          failure={
            <div css={messageBoxStyles(errorBoxStyles)}>
              <p>{monitoringError}</p>
            </div>
          }
          fetching={<LoadingSpinner />}
          status={charcsStatus}
        >
          {rowFlex('Selected Characteristic', selected ?? 'None', charcsStatus)}
          <ReactTable
            autoResetFilters={false}
            autoResetSortBy={false}
            data={tableData}
            defaultSort="name"
            placeholder="Filter..."
            striped={true}
            getColumns={(tableWidth) => {
              const columnWidth = 2 * (tableWidth / 7) - 6;
              const halfColumnWidth = tableWidth / 7 - 6;

              return [
                {
                  Header: '',
                  accessor: 'select',
                  minWidth: 24,
                  width: 24,
                  filterable: false,
                },
                {
                  Header: 'Name',
                  accessor: 'name',
                  width: columnWidth,
                  filterable: true,
                },
                {
                  Header: 'Group',
                  accessor: 'group',
                  width: columnWidth,
                  filterable: true,
                },
                {
                  Header: 'Category',
                  accessor: 'label',
                  width: halfColumnWidth,
                  filterable: true,
                },
                {
                  Header: 'Total Result Count',
                  accessor: 'resultCount',
                  width: halfColumnWidth,
                  filterable: false,
                },
                {
                  Header: 'Detectable Result Count',
                  accessor: 'measurementCount',
                  width: halfColumnWidth,
                  filterable: false,
                },
              ];
            }}
          />
        </StatusContent>
      </div>
    </div>
  );
}

function ChartContainer({
  range,
  data,
  charcName,
  dataKeys,
  scaleType,
  yTitle,
  unit,
}) {
  const charcLabel = getCharcLabel(
    getCharcGroup(charcName, characteristicsByGroup),
    characteristicGroupMappings,
  );
  const chartRef = useRef(null);

  if (!data?.length)
    return (
      <div css={chartContainerStyles}>
        <p css={messageBoxStyles(infoBoxStyles)}>
          No measurements available for the selected options.
        </p>
      </div>
    );

  if (!range)
    return (
      <div css={chartContainerStyles}>
        <LoadingSpinner />
      </div>
    );

  return (
    <div ref={chartRef} css={chartContainerStyles}>
      <ScatterPlot
        buildTooltip={buildTooltip(unit)}
        color={lineColors[charcLabel]}
        containerRef={chartRef.current}
        data={data}
        dataKeys={dataKeys}
        range={range}
        xTitle="Date"
        yScale={scaleType}
        yTitle={yTitle}
      />
    </div>
  );
}

function CheckboxAccordion({
  accessor,
  children,
  id,
  level,
  dispatch,
  state,
  expanded,
  subHeading,
}) {
  const item = state[accessor][id];
  return (
    <div css={treeStyles(level)}>
      <AccordionItem
        allExpanded={expanded}
        highlightContent={false}
        title={
          <span css={accordionFlexStyles}>
            <span>
              <input
                type="checkbox"
                checked={item.selected === Checkbox.checked}
                ref={(input) => {
                  if (input)
                    input.indeterminate =
                      item.selected === Checkbox.indeterminate;
                }}
                onChange={handleCheckbox(id, accessor, dispatch)}
                onClick={(ev) => ev.stopPropagation()}
                style={{ top: '2px' }}
              />
              <strong>{id}</strong>
            </span>
            <strong>{item.count.toLocaleString()}</strong>
          </span>
        }
      >
        {subHeading && (
          <p css={treeStyles(level + 1, accordionHeadingStyles)}>
            <strong>
              <em>{subHeading}</em>
            </strong>
          </p>
        )}
        {children}
      </AccordionItem>
    </div>
  );
}

function DownloadSection({ charcs, charcsStatus, site, siteStatus }) {
  const [range, setRange] = useState(null);
  const [minYear, setMinYear] = useState(null);
  const [maxYear, setMaxYear] = useState(null);
  const [checkboxes, checkboxDispatch] = useReducer(
    checkboxReducer,
    initialCheckboxes,
  );
  const [expanded, setExpanded] = useState(false);

  const services = useServicesContext();

  const [downloadError, setDownloadError] = useState(null);

  // fields common to the download and portal queries
  const queryData =
    siteStatus === 'success'
      ? {
          dataProfile: 'resultPhysChem',
          siteid: [site.siteId],
          organization: [site.orgId],
          providers: [site.providerName],
        }
      : {};
  if (range && range[0] !== minYear)
    queryData.startDateLo = `01-01-${range[0]}`;
  if (range && range[1] !== maxYear)
    queryData.startDateHi = `12-31-${range[1]}`;

  let portalUrl =
    services.status === 'success' &&
    Object.entries(queryData).reduce((query, [key, value]) => {
      let queryPartial = '';
      if (Array.isArray(value))
        value.forEach(
          (item) => (queryPartial += `&${key}=${encodeURIComponent(item)}`),
        );
      else queryPartial += `&${key}=${encodeURIComponent(value)}`;
      return query + queryPartial;
    }, `${services.data.waterQualityPortal.userInterface}#dataProfile=resultPhysChem`);

  if (checkboxes.all === Checkbox.indeterminate) {
    const selectedGroups = Object.values(checkboxes.groups)
      .filter((group) => group.selected !== Checkbox.unchecked)
      .map((group) => group.id);
    selectedGroups.forEach(
      (group) =>
        (portalUrl += `&characteristicType=${encodeURIComponent(group)}`),
    );

    const selectedCharcs = Object.values(checkboxes.charcs)
      .filter((charc) => charc.selected === Checkbox.checked)
      .map((charc) => charc.id);
    queryData.characteristicName = selectedCharcs;
  }

  useEffect(() => {
    if (charcsStatus !== 'success') return;
    const data = parseCharcs(charcs, range);
    checkboxDispatch({ type: 'load', payload: { data } });
  }, [charcs, charcsStatus, range]);

  useEffect(() => {
    if (charcsStatus !== 'success') return;
    if (minYear || maxYear) return;
    let newMinYear = Infinity;
    let newMaxYear = 0;
    Object.values(charcs).forEach((charc) => {
      const { records } = charc;
      records.forEach((record) => {
        if (record.year < newMinYear) newMinYear = record.year;
        if (record.year > newMaxYear) newMaxYear = record.year;
      });
    });
    setMinYear(newMinYear);
    setMaxYear(newMaxYear);
    setRange([newMinYear, newMaxYear]);
  }, [charcs, charcsStatus, maxYear, minYear]);

  return (
    <div css={boxStyles}>
      <h2 css={infoBoxHeadingStyles}>Download Location Data</h2>
      <StatusContent
        empty={
          <p css={messageBoxStyles(infoBoxStyles)}>
            No data available for this monitoring location.
          </p>
        }
        failure={
          <p css={messageBoxStyles(errorBoxStyles)}>{monitoringError}</p>
        }
        fetching={<LoadingSpinner />}
        status={charcsStatus}
      >
        <SliderContainer
          disabled={!Boolean(Object.keys(charcs).length)}
          max={maxYear}
          min={minYear}
          onChange={(newRange) => setRange(newRange)}
        />
        <div css={boxSectionStyles}>
          <div css={accordionStyles}>
            <AccordionList
              className="accordion-list"
              onExpandCollapse={(newExpanded) => setExpanded(newExpanded)}
              title={
                <span>
                  <input
                    style={{ top: '2px' }}
                    type="checkbox"
                    checked={checkboxes.all === Checkbox.checked}
                    ref={(input) => {
                      if (input)
                        input.indeterminate =
                          checkboxes.all === Checkbox.indeterminate;
                    }}
                    onChange={(_ev) => checkboxDispatch({ type: 'all' })}
                  />
                  <strong>Toggle All</strong>
                </span>
              }
            >
              <p css={accordionHeadingStyles}>
                <strong>
                  <em>
                    <GlossaryTerm term="Characteristic Group">
                      Character&shy;istic Groups
                    </GlossaryTerm>
                  </em>
                </strong>
                <strong>
                  <em>
                    <GlossaryTerm
                      className="count"
                      term="Monitoring Measurements"
                    >
                      Number of Measurements
                    </GlossaryTerm>
                  </em>
                </strong>
              </p>
              {Object.keys(checkboxes.groups)
                .sort((a, b) => a.localeCompare(b))
                .map((groupId) => (
                  <CheckboxAccordion
                    accessor="groups"
                    level={0}
                    id={groupId}
                    key={groupId}
                    dispatch={checkboxDispatch}
                    state={checkboxes}
                    expanded={expanded}
                    subHeading="Character&shy;istic Names"
                  >
                    {checkboxes.groups[groupId].charcs
                      .sort((a, b) => a.localeCompare(b))
                      .map((charcId) => (
                        <CheckboxRow
                          accessor="charcs"
                          level={1}
                          id={charcId}
                          key={charcId}
                          dispatch={checkboxDispatch}
                          state={checkboxes}
                        />
                      ))}
                  </CheckboxAccordion>
                ))}
              <p className="total-row" css={accordionHeadingStyles}>
                <strong>
                  <em>Total Measurements Selected:</em>
                </strong>
                <strong className="count">
                  {getTotalCount(checkboxes.charcs).toLocaleString()}
                </strong>
              </p>
            </AccordionList>
          </div>
        </div>
        {services.status === 'success' && (
          <div id="download-links" css={downloadLinksStyles}>
            <div>
              <p>
                <a rel="noopener noreferrer" target="_blank" href={portalUrl}>
                  <i
                    css={iconStyles}
                    className="fas fa-filter"
                    aria-hidden="true"
                  />
                  Advanced Filtering
                </a>
                &nbsp;&nbsp;
                <small css={modifiedDisclaimerStyles}>
                  (opens new browser tab)
                </small>
              </p>
              <p>
                <a
                  rel="noopener noreferrer"
                  target="_blank"
                  href="https://www.waterqualitydata.us/portal_userguide/"
                >
                  <i
                    css={iconStyles}
                    className="fas fa-book-open"
                    aria-hidden="true"
                  />
                  Water Quality Portal User Guide
                </a>
                &nbsp;&nbsp;
                <small css={modifiedDisclaimerStyles}>
                  (opens new browser tab)
                </small>
              </p>
            </div>
            <div>
              <span>Download Selected Data</span>
              <span>
                &nbsp;&nbsp;
                <FileLink
                  data={queryData}
                  disabled={checkboxes.all === Checkbox.unchecked}
                  fileType="excel"
                  setError={setDownloadError}
                  url={services.data.waterQualityPortal.resultSearch}
                />
                &nbsp;&nbsp;
                <FileLink
                  data={queryData}
                  disabled={checkboxes.all === Checkbox.unchecked}
                  fileType="csv"
                  setError={setDownloadError}
                  url={services.data.waterQualityPortal.resultSearch}
                />
              </span>
            </div>
          </div>
        )}
        {downloadError && (
          <p css={messageBoxStyles(errorBoxStyles)}>
            {monitoringDownloadError}
          </p>
        )}
      </StatusContent>
    </div>
  );
}

function FileLink({ disabled, fileType, data, setError, url }) {
  const [fetching, setFetching] = useState(false);
  const mimeTypes = { excel: 'xlsx', csv: 'csv' };
  const fileTypeUrl = `${url}zip=no&mimeType=${mimeTypes[fileType]}`;
  const fetchFile = async () => {
    setFetching(true);
    try {
      setError(null);
      const blob = await fetchPost(
        fileTypeUrl,
        data,
        { 'Content-Type': 'application/json' },
        60000,
        'blob',
      );
      const file = window.URL.createObjectURL(blob);
      window.location.assign(file);
    } catch (err) {
      setError(err);
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  if (disabled)
    return (
      <i
        className={`fas fa-file-${fileType}`}
        aria-hidden="true"
        style={{ color: '#ccc' }}
      />
    );
  else if (fetching)
    return (
      <span css={fileLinkStyles}>
        <LoadingSpinner />
      </span>
    );

  return (
    <button css={fileLinkStyles} onClick={fetchFile}>
      <i className={`fas fa-file-${fileType}`} aria-hidden="true" />
      <span className="sr-only">
        Download location data as a {fileType} file.
      </span>
    </button>
  );
}

function InformationSection({ siteId, site, siteStatus }) {
  return (
    <div css={modifiedBoxStyles}>
      <h2 css={infoBoxHeadingStyles}>
        {siteStatus === 'fetching' && <LoadingSpinner />}
        <span>
          {siteStatus === 'success' && site.locationName}
          <small>
            <strong>
              Site ID{' '}
              <HelpTooltip label="Identifies a monitoring location by a unique name, number, or code" />
              :{' '}
            </strong>
            {siteId}
          </small>
        </span>
      </h2>
      <div css={boxSectionStyles}>
        {rowGrid('Organization Name', site.orgName, siteStatus)}
        {rowGrid('Organization ID', site.orgId, siteStatus)}
        {rowGrid('Location', `${site.county}, ${site.state}`, siteStatus)}
        {rowGrid('Water Type', site.locationType, siteStatus)}
        {rowGrid(
          'Total Sample Count',
          site.totalSamples?.toLocaleString(),
          siteStatus,
        )}
        {rowGrid(
          'Total Measurement Count',
          site.totalMeasurements?.toLocaleString(),
          siteStatus,
        )}
      </div>
    </div>
  );
}

function MonitoringLocationContent() {
  const { orgId, provider, siteId } = useParams();
  const { fullscreenActive } = useFullscreenState();
  const [site, siteStatus] = useSiteDetails(provider, orgId, siteId);
  const [characteristics, characteristicsStatus] = useCharacteristics(
    provider,
    orgId,
    siteId,
  );
  const [selectedCharc, setSelectedCharc] = useState(null);

  const [mapWidth, setMapWidth] = useState(0);
  const widthRef = useCallback((node) => {
    if (!node) return;
    setMapWidth(node.getBoundingClientRect().width);
  }, []);

  const mapNarrow = (height) => (
    <>
      <MapVisibilityButton>
        {(mapShown) => (
          <div
            style={{
              display: mapShown ? 'block' : 'none',
              height: height - 40,
            }}
            css={`
              ${boxStyles};
            `}
          >
            <SiteMapContainer
              layout="narrow"
              site={site}
              siteStatus={siteStatus}
              widthRef={widthRef}
            />
          </div>
        )}
      </MapVisibilityButton>
    </>
  );

  const mapWide = (
    <div
      style={{
        height: mapWidth,
        minHeight: '400px',
      }}
      css={`
        ${boxStyles};
      `}
    >
      <SiteMapContainer
        layout="wide"
        site={site}
        siteStatus={siteStatus}
        widthRef={widthRef}
      />
    </div>
  );

  const noSiteView = (
    <Page>
      <NavBar title="Monitoring Location Details" />

      <div css={containerStyles}>
        <div css={pageErrorBoxStyles}>
          <p>
            The monitoring location <strong>{siteId}</strong> could not be
            found.
          </p>
        </div>
      </div>
    </Page>
  );

  const fullScreenView = (
    <WindowSize>
      {({ width, height }) => (
        <div data-content="location-map" style={{ width, height }}>
          <SiteMapContainer
            layout="fullscreen"
            site={site}
            widthRef={widthRef}
          />
        </div>
      )}
    </WindowSize>
  );

  const twoColumnView = (
    <Page>
      <NavBar title="Monitoring Location Details" />
      <div css={containerStyles} data-content="container">
        <WindowSize>
          {({ width, height }) => {
            return (
              <div css={modifiedSplitLayoutColumnsStyles}>
                <div className="static" css={leftColumnStyles}>
                  <InformationSection
                    orgId={orgId}
                    site={site}
                    siteStatus={siteStatus}
                    siteId={siteId}
                  />
                  {width < 960 ? mapNarrow(height) : mapWide}
                  <DownloadSection
                    charcs={characteristics}
                    charcsStatus={characteristicsStatus}
                    site={site}
                    siteStatus={siteStatus}
                  />
                </div>
                <div css={rightColumnStyles}>
                  <CharacteristicsTableSection
                    charcs={characteristics}
                    charcsStatus={characteristicsStatus}
                    selected={selectedCharc}
                    setSelected={setSelectedCharc}
                  />
                  <CharacteristicChartSection
                    charcName={selectedCharc}
                    charcsStatus={characteristicsStatus}
                    records={
                      selectedCharc
                        ? characteristics[selectedCharc].records
                        : null
                    }
                  />
                </div>
              </div>
            );
          }}
        </WindowSize>
      </div>
    </Page>
  );

  const content = fullscreenActive ? fullScreenView : twoColumnView;

  return (
    <StatusContent
      empty={noSiteView}
      failure={<p css={messageBoxStyles(errorBoxStyles)}>{monitoringError}</p>}
      fetching={content}
      success={content}
      status={siteStatus}
    />
  );
}

function MonitoringLocation() {
  return (
    <FullscreenProvider>
      <MapHighlightProvider>
        <MonitoringLocationContent />
      </MapHighlightProvider>
    </FullscreenProvider>
  );
}

function SliderContainer({ min, max, disabled = false, onChange }) {
  if (!min || !max) return <LoadingSpinner />;
  else if (min === max)
    return <div css={sliderContainerStyles}>{rowFlex('Year', min)}</div>;

  return (
    <div css={sliderContainerStyles}>
      <DateSlider disabled={disabled} min={min} max={max} onChange={onChange} />
    </div>
  );
}

function SiteMap({ layout, site, siteStatus, widthRef }) {
  const [layersInitialized, setLayersInitialized] = useState(false);
  const [doneDrawing, setDoneDrawing] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);

  const services = useServicesContext();
  const getSharedLayers = useSharedLayers();
  const {
    homeWidget,
    layers,
    mapView,
    monitoringLocationsLayer,
    resetData,
    setLayers,
    setMonitoringLocationsLayer,
    setVisibleLayers,
  } = useContext(LocationSearchContext);

  useEffect(() => {
    if (!mapView) return;
    mapView.map.basemap = new Basemap({
      portalItem: {
        id: '588f0e0acc514c11bc7c898fed9fc651',
      },
    });

    return function cleanup() {
      mapView.map.basemap = 'gray-vector';
    };
  }, [mapView]);

  // Initialize the layers
  useEffect(() => {
    if (!getSharedLayers || layersInitialized) return;

    if (!monitoringLocationsLayer) {
      const newMonitoringLocationsLayer = new FeatureLayer({
        id: 'monitoringLocationsLayer',
        title: 'Past Water Conditions',
        listMode: 'hide',
        legendEnabled: true,
        fields: [
          { name: 'OBJECTID', type: 'oid' },
          { name: 'monitoringType', type: 'string' },
          { name: 'siteId', type: 'string' },
          { name: 'orgId', type: 'string' },
          { name: 'orgName', type: 'string' },
          { name: 'locationLongitude', type: 'double' },
          { name: 'locationLatitude', type: 'double' },
          { name: 'locationName', type: 'string' },
          { name: 'locationType', type: 'string' },
          { name: 'locationUrl', type: 'string' },
          { name: 'stationProviderName', type: 'string' },
          { name: 'stationTotalSamples', type: 'integer' },
          { name: 'stationTotalMeasurements', type: 'integer' },
          { name: 'stationTotalsByGroup', type: 'string' },
          { name: 'uniqueId', type: 'string' },
        ],
        outFields: ['*'],
        source: [
          new Graphic({
            geometry: { type: 'point', longitude: -98.5795, latitude: 39.8283 },
            attributes: { OBJECTID: 1 },
          }),
        ],
        renderer: {
          type: 'simple',
          symbol: {
            type: 'simple-marker',
            style: 'circle',
            color: colors.lightPurple(0.75),
            outline: {
              width: 0.75,
            },
          },
        },
        popupTemplate: {
          outFields: ['*'],
          title: (feature) => getPopupTitle(feature.graphic.attributes),
          content: (feature) => {
            feature.graphic.attributes = parseAttributes(
              ['stationTotalsByGroup'],
              feature.graphic.attributes,
            );
            return getPopupContent({ feature: feature.graphic, services });
          },
        },
      });
      setMonitoringLocationsLayer(newMonitoringLocationsLayer);
      setLayers([...getSharedLayers(), newMonitoringLocationsLayer]);
      setVisibleLayers({ monitoringLocationsLayer: true });
    } else {
      setLayersInitialized(true);
    }
  }, [
    getSharedLayers,
    layers,
    layersInitialized,
    monitoringLocationsLayer,
    services,
    setLayers,
    setMonitoringLocationsLayer,
    setVisibleLayers,
    site,
    siteStatus,
  ]);

  // Draw the site on the map
  useEffect(() => {
    if (!layersInitialized || doneDrawing) return;
    drawSite(site, monitoringLocationsLayer).then((result) => {
      setDoneDrawing(result);
    });
  }, [
    doneDrawing,
    layersInitialized,
    site,
    monitoringLocationsLayer,
    services,
  ]);

  // Zoom to the location of the site
  useEffect(() => {
    if (!doneDrawing || !mapView || !monitoringLocationsLayer || !homeWidget)
      return;

    getZoomParams(monitoringLocationsLayer).then((zoomParams) => {
      mapView.goTo(zoomParams).then(() => {
        // set map zoom and home widget's viewpoint
        mapView.zoom = mapView.zoom - 1;
        homeWidget.viewpoint = new Viewpoint({
          targetGeometry: mapView.extent,
        });
        setMapLoading(false);
      });
    });
  }, [doneDrawing, mapView, monitoringLocationsLayer, homeWidget]);

  // Function for resetting the LocationSearch context when the map is removed
  useEffect(() => {
    return function cleanup() {
      resetData();
    };
  }, [resetData]);

  // Scrolls to the map when switching layouts
  useEffect(() => {
    const itemName = layout === 'fullscreen' ? 'location-map' : 'container';
    const content = document.querySelector(`[data-content="${itemName}"]`);
    if (content) {
      let pos = content.getBoundingClientRect();

      window.scrollTo(pos.left + window.scrollX, pos.top + window.scrollY);
    }
  }, [layout]);

  return (
    <div css={mapContainerStyles} data-testid="hmw-site-map" ref={widthRef}>
      {siteStatus === 'fetching' ? <LoadingSpinner /> : <Map layers={layers} />}
      {mapView && mapLoading && <MapLoadingSpinner />}
    </div>
  );
}

function SiteMapContainer({ ...props }) {
  return (
    <MapErrorBoundary>
      <SiteMap {...props} />
    </MapErrorBoundary>
  );
}

function StatusContent({
  children,
  empty,
  idle = null,
  failure,
  fetching,
  status,
  success = null,
}) {
  switch (status) {
    case 'fetching':
      return fetching;
    case 'empty':
      return empty;
    case 'failure':
      return failure;
    case 'success':
      return success ?? children;
    default:
      return idle;
  }
}

export default MonitoringLocation;
