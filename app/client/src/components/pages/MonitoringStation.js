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
import LineChart from 'components/shared/LineChart';
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
import { characteristicsByType } from 'config/characteristicsByType';
import { monitoringError } from 'config/errorMessages';
// contexts
import { useFullscreenContext, FullscreenProvider } from 'contexts/Fullscreen';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
import { MapHighlightProvider } from 'contexts/MapHighlight';
// helpers
import { fetchCheck } from 'utils/fetchUtils';
import { useSharedLayers } from 'utils/hooks';
import { getPopupContent, getPopupTitle } from 'utils/mapFunctions';
import { parseAttributes, titleCaseWithExceptions } from 'utils/utils';
// styles
import { boxStyles, boxHeadingStyles } from 'components/shared/Box';
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

const boxSectionStyles = css`
  padding: 0.4375rem 0.875rem;
`;

const charcsTableStyles = css`
  ${boxSectionStyles}
  height: 50vh;
  overflow-y: scroll;
  .rt-table .rt-td {
    margin: auto;
  }
`;

const chartContainerStyles = css`
  margin-top: 1rem;
  margin-right: 0.625rem;
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
      padding-left: 1rem;
      text-align: start;
    }
    &:last-child {
      font-weight: bold;
      padding-right: 1rem;
      text-align: end;
    }
  }
`;

const flexboxSectionStyles = css`
  ${boxSectionStyles}
  display: flex;
`;

const iconStyles = css`
  margin-right: 5px;
`;

const infoBoxHeadingStyles = css`
  ${boxHeadingStyles};
  display: flex;
  align-items: flex-start;

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

const inlineBoxSectionStyles = css`
  padding: 0.4375rem 0.875rem;

  /* loading icon */
  svg {
    display: inline-block;
    margin: -0.5rem;
    height: 1.25rem;
  }

  h3 {
    margin-right: 0.5em;
  }

  h3,
  p {
    display: inline-block;
    margin-top: 0;
    margin-bottom: 0;
    line-height: 1.25;
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

const modifiedDisclaimerStyles = css`
  ${disclaimerStyles};

  padding-bottom: 0;
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles};
  text-align: center;
  margin: 1rem auto;
  padding: 0.7rem 1rem !important;
  width: max-content;
`;

const modifiedInfoBoxStyles = css`
  ${infoBoxStyles};
  text-align: center;
  margin: 1rem auto;
  padding: 0.7rem 1rem !important;
  width: max-content;
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
    text-indent: -1em;
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

    @media (min-width: 560px) {
      margin-bottom: 0;
    }
  }

  @media (min-width: 560px) {
    flex-wrap: nowrap;
  }

  .radio-container {
    display: inline-flex;
    flex-direction: column;
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

const sliderContainerStyles = css`
  align-items: flex-end;
  display: flex;
  justify-content: center;
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

function buildDateFilter(range, minYear, maxYear) {
  if (!range) return;
  let filter = '';
  if (range[0] !== minYear) {
    filter += `&startDateLo=01-01-${range[0]}`;
  }
  if (range[1] !== maxYear) {
    filter += `&startDateHi=12-31-${range[1]}`;
  }
  return filter;
}

function buildCharcsFilter(checkboxes) {
  let filter = '';
  if (checkboxes.all === 1 || checkboxes.all === 0) return filter;
  Object.values(checkboxes.types).forEach((type) => {
    if (type.selected === 1) {
      filter += `&characteristicType=${type.id}`;
    } else if (type.selected === 0.5) {
      type.charcs.forEach((charcId) => {
        const charc = checkboxes.charcs[charcId];
        if (charc.selected === 1) {
          filter += `&characteristicName=${charc.id}`;
        }
      });
    }
  });
  return filter;
}

function buildOptions(values) {
  return Array.from(values).map((value) => {
    return { value: value, label: value };
  });
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
    case 'types': {
      const { id } = action.payload;
      const entity = state.types[id];
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

const dateOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

async function drawStation(station, layer) {
  if (isEmpty(station)) return false;
  const newFeature = new Graphic({
    geometry: {
      type: 'point',
      latitude: station.locationLatitude,
      longitude: station.locationLongitude,
    },
    attributes: {
      ...station,
      locationUrl: window.location.href,
      stationProviderName: station.providerName,
      stationTotalSamples: station.totalSamples,
      stationTotalMeasurements: station.totalMeasurements,
      stationTotalsByGroup: JSON.stringify(station.charcTypeCounts),
    },
  });
  const featureSet = await layer.queryFeatures();
  const editResults = await layer.applyEdits({
    deleteFeatures: featureSet.features,
    addFeatures: [newFeature],
  });
  return editResults?.addFeatureResults?.length ? true : false;
}

async function fetchStationDetails(url, setData, setStatus) {
  const res = await fetchCheck(url);
  if (res.features.length < 1) {
    setStatus('empty');
    setData({});
    return;
  }
  const feature = res.features[0];
  const stationDetails = {
    county: feature.properties.CountyName,
    charcTypeCounts: feature.properties.characteristicGroupResultCount,
    charcGroups: groupTypes(
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
  stationDetails.charcGroupCounts = parseGroupCounts(
    stationDetails.charcTypeCounts,
    stationDetails.charcGroups,
    characteristicGroupMappings,
  );
  setData(stationDetails);
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

function getCharcGroup(charcType, groupMappings) {
  for (let mapping of groupMappings) {
    if (mapping.groupNames.includes(charcType)) return mapping.label;
  }
  return 'Other';
}

function getCharcType(charcName, typeMappings) {
  for (let mapping of Object.keys(typeMappings)) {
    if (typeMappings[mapping].includes(charcName)) return mapping;
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
  // Using 0.5 for indeterminate to prevent a false positive
  let status = 0.5;
  if (numberSelected === 0) status = 0;
  else if (numberSelected === children.length) status = 1;
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

function groupTypes(charcTypes, mappings) {
  const groups = {};
  mappings
    .filter((mapping) => mapping.label !== 'All')
    .forEach((mapping) => {
      for (const charcType in charcTypes) {
        if (mapping.groupNames.includes(charcType)) {
          if (!groups[mapping.label]) groups[mapping.label] = [];
          groups[mapping.label].push(charcType);
        }
      }
    });

  // add any leftover lower-tier group counts to the 'Other' category
  const typesGrouped = Object.values(groups).reduce((a, b) => {
    a.push(...b);
    return a;
  }, []);
  for (const charcType in charcTypes) {
    if (!typesGrouped.includes(charcType)) {
      if (!groups['Other']) groups['Other'] = [];
      groups['Other'].push(charcType);
    }
  }
  return groups;
}

const initialCheckboxes = {
  all: 0,
  groups: {},
  types: {},
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
  const newTypes = {};

  const { charcs, groups, types } = data;

  // loop once to build the new data structure
  Object.values(charcs).forEach((charc) => {
    newCharcs[charc.id] = {
      ...charc,
      selected: state.charcs[charc.id]?.selected ?? 1,
    };
  });
  Object.values(types).forEach((type) => {
    newTypes[type.id] = {
      ...type,
      charcs: Array.from(type.charcs),
      selected: 0,
    };
  });
  Object.values(groups).forEach((group) => {
    newGroups[group.id] = {
      ...group,
      selected: 0,
      types: Array.from(group.types),
    };
  });

  const allSelected = updateSelected(newCharcs, newTypes, newGroups);

  return {
    all: allSelected,
    charcs: newCharcs,
    groups: newGroups,
    types: newTypes,
  };
}

function parseGroupCounts(typeCounts, charcGroups, mappings) {
  const groupCounts = {};
  mappings
    .filter((mapping) => mapping.label !== 'All')
    .forEach((mapping) => (groupCounts[mapping.label] = 0));
  Object.entries(charcGroups).forEach(([charcGroup, charcTypes]) => {
    charcTypes.forEach(
      (charcType) => (groupCounts[charcGroup] += typeCounts[charcType]),
    );
  });

  return groupCounts;
}

function parseCharcs(charcs, range) {
  const result = {
    groups: {},
    types: {},
    charcs: {},
  };
  // structure characteristcs by group, then type
  Object.entries(charcs).forEach(([charc, data]) => {
    const { group, type, count, records } = data;

    let newCount = getFilteredCount(range, records, count);

    if (newCount > 0) {
      if (!result.groups[group]) {
        result.groups[group] = {
          count: 0,
          id: group,
          types: new Set(),
        };
      }
      if (!result.types[type]) {
        result.types[type] = {
          charcs: new Set(),
          count: 0,
          group,
          id: type,
        };
      }
      result.charcs[charc] = {
        count: newCount,
        group,
        id: charc,
        type,
      };

      result.groups[group].count += newCount;
      result.types[type].count += newCount;
      result.groups[group].types.add(type);
      result.types[type].charcs.add(charc);
    }
  });
  return result;
}

function parseRecord(record, measurements) {
  const unit = record.unit;
  const fraction = record.sampleFraction || 'Not Specified';
  if (!measurements[unit]) measurements[unit] = {};
  const unitMeasurements = measurements[unit];

  if (!unitMeasurements[fraction]) unitMeasurements[fraction] = {};
  const fractionMeasurements = unitMeasurements[fraction];
  const speciation = record.speciation || 'Not Specified';
  if (!fractionMeasurements[speciation]) fractionMeasurements[speciation] = {};
  const specMeasurements = fractionMeasurements[speciation];

  // group by unit and date
  const date = getDate(record);
  if (!specMeasurements[date]) {
    specMeasurements[date] = {
      ...record,
      measurement: [record.measurement],
      date,
    };
  } else {
    specMeasurements[date].measurement.push(record.measurement);
  }
  return { unit, speciation, fraction };
}

const sectionRow = (label, value, style, dataStatus) => (
  <div css={style}>
    <h3>{label}:</h3>
    {dataStatus === 'fetching' && <LoadingSpinner />}
    {dataStatus === 'failure' && (
      <div css={modifiedErrorBoxStyles}>
        <p>{monitoringError}</p>
      </div>
    )}
    {dataStatus === 'success' && <p>{value}</p>}
  </div>
);

const sectionRowInline = (label, value, dataStatus = 'success') => {
  return sectionRow(label, value, inlineBoxSectionStyles, dataStatus);
};

function sortMeasurements(measurements) {
  // store in arrays by unit,fraction,speciation and sort by date
  Object.entries(measurements).forEach(([unitKey, unitMeasurements]) => {
    Object.entries(unitMeasurements).forEach(
      ([fractionKey, fractionMeasurements]) => {
        Object.entries(fractionMeasurements).forEach(
          ([specKey, specMeasurements]) => {
            Object.values(specMeasurements).forEach((date) => {
              date.measurement = parseFloat(
                (
                  date.measurement.reduce((a, b) => a + b) /
                  date.measurement.length
                ).toFixed(3),
              );
            });
            measurements[unitKey][fractionKey][specKey] = Object.values(
              specMeasurements,
            )
              .sort((a, b) => a.day - b.day)
              .sort((a, b) => a.month - b.month)
              .sort((a, b) => a.year - b.year);
          },
        );
      },
    );
  });
}

function toggle(state, id, entity, level) {
  const newSelected = entity.selected === 0 ? 1 : 0;

  const newCharcs = { ...state.charcs };
  const newTypes = { ...state.types };
  const newGroups = { ...state.groups };

  switch (level) {
    case 'charcs': {
      updateEntity(newCharcs, id, entity, newSelected);
      const charcIds = newTypes[entity.type].charcs;
      updateParent(newTypes, newCharcs, entity.type, charcIds);
      const typeIds = newGroups[entity.group].types;
      updateParent(newGroups, newTypes, entity.group, typeIds);
      break;
    }
    case 'groups': {
      const ref = 'group';
      updateEntity(newGroups, id, entity, newSelected);
      updateDescendants(newTypes, ref, id, newSelected);
      updateDescendants(newCharcs, ref, id, newSelected);
      break;
    }
    case 'types': {
      const ref = 'type';
      updateEntity(newTypes, id, entity, newSelected);
      updateDescendants(newCharcs, ref, id, newSelected);
      const typeIds = newGroups[entity.group].types;
      updateParent(newGroups, newTypes, entity.group, typeIds);
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
    types: newTypes,
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
  const newTypes = {};
  Object.values(state.types).forEach((type) => {
    newTypes[type.id] = {
      ...type,
      selected: newSelected,
    };
  });
  return {
    all: newSelected,
    charcs: newCharcs,
    groups: newGroups,
    types: newTypes,
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

function updateSelected(charcs, types, groups) {
  let groupsSelected = 0;

  // loop over again to get checkbox values
  Object.values(charcs).forEach((charc) => {
    types[charc.type].selected += charc.selected;
  });
  Object.values(types).forEach((type) => {
    type.selected = getCheckedStatus(type.selected, type.charcs);
    groups[type.group].selected += type.selected;
  });
  Object.values(groups).forEach((group) => {
    group.selected = getCheckedStatus(group.selected, group.types);
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
        if (!recordsByCharc[record.CharacteristicName]) {
          const charcType = getCharcType(
            record.CharacteristicName,
            characteristicsByType,
          );
          recordsByCharc[record.CharacteristicName] = {
            name: record.CharacteristicName,
            group: getCharcGroup(charcType, characteristicGroupMappings),
            records: [],
            type: charcType,
            count: 0,
          };
        }
        const curCharc = recordsByCharc[record.CharacteristicName];
        curCharc.count += 1;
        const recordDate = record.ActivityStartDate.split('-');
        curCharc.records.push({
          year: parseInt(recordDate[0]),
          month: parseInt(recordDate[1]),
          day: parseInt(recordDate[2]),
          measurement: record.ResultMeasureValue ?? null,
          sampleFraction: record.ResultSampleFractionText || null,
          speciation: record.MethodSpecificationName || null,
          unit: record['ResultMeasure/MeasureUnitCode'] || null,
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
      `&mimeType=csv&zip=no&dataProfile=narrowResult` +
      `&providers=${provider}&organization=${orgId}&siteid=${siteId}`;
    fetchParseCsv(url)
      .then((results) => structureRecords(results.data))
      .catch((_err) => {
        setStatus('failure');
        console.error('Papa Parse error');
      });
  }, [orgId, provider, services, siteId, structureRecords]);

  return [charcs, status];
}

function useStationDetails(provider, orgId, siteId) {
  const services = useServicesContext();

  const [station, setStation] = useState({});
  const [stationStatus, setStationStatus] = useState('fetching');

  useEffect(() => {
    const url =
      `${services.data.waterQualityPortal.monitoringLocation}` +
      `search?mimeType=geojson&zip=no&provider=${provider}&organization=${orgId}&siteid=${siteId}`;

    fetchStationDetails(url, setStation, setStationStatus).catch((err) => {
      console.error(err);
      setStationStatus('failure');
      setStation({});
    });
  }, [provider, services, setStation, setStationStatus, orgId, siteId]);

  return [station, stationStatus];
}

/*
## Components
*/

function CharacteristicChartSection({ charcName, charcsStatus, records }) {
  const [measurements, setMeasurements] = useState(null);
  // Selected and available units
  const [unit, setUnit] = useState(null);
  const [units, setUnits] = useState(null);
  // Selected and available sample fractions
  const [fraction, setFraction] = useState(null);
  const [fractions, setFractions] = useState(null);
  // Selected and available speciations
  const [spec, setSpec] = useState(null);
  const [specs, setSpecs] = useState(null);
  // Logarithmic or linear
  const [scaleType, setScaleType] = useState('linear');

  const parseMeasurements = useCallback((newRecords) => {
    const newMeasurements = {};
    const fractionValues = new Set();
    const specValues = new Set();
    const unitValues = new Set();

    newRecords.forEach((record) => {
      if (!record.unit || !Number.isFinite(record.measurement)) return;

      // Adds record measurement to newMeasurements and gets select options
      const recordOptions = parseRecord(record, newMeasurements);
      unitValues.add(recordOptions.unit);
      fractionValues.add(recordOptions.fraction);
      specValues.add(recordOptions.speciation);
    });

    setFractions(buildOptions(fractionValues));
    setSpecs(buildOptions(specValues));
    setUnits(buildOptions(unitValues));

    return newMeasurements;
  }, []);

  useEffect(() => {
    if (!records) return;
    const newMeasurements = parseMeasurements(records);

    sortMeasurements(newMeasurements);

    // initialize the selected unit
    const newUnits = Object.keys(newMeasurements);
    if (newUnits.length) {
      const newFractions = Object.keys(newMeasurements[newUnits[0]]);
      const newSpecs = Object.keys(
        newMeasurements[newUnits[0]][newFractions[0]],
      );
      setMeasurements(newMeasurements);
      setUnit(newUnits[0]);
      setFraction(newFractions[0]);
      setSpec(newSpecs[0]);
    } else {
      setMeasurements(null);
      setUnit(null);
      setFraction(null);
      setSpec(null);
    }
    setScaleType('linear');
  }, [parseMeasurements, records]);

  const [chartData, setChartData] = useState(null);
  const [domain, setDomain] = useState(null);
  const [range, setRange] = useState(null);
  const [mean, setMean] = useState(null);
  const [median, setMedian] = useState(null);
  const [stdDev, setStdDev] = useState(null);

  const getChartData = useCallback((newDomain, newMsmts) => {
    let newChartData = [];
    newMsmts.forEach((msmt) => {
      if (msmt.year >= newDomain[0] && msmt.year <= newDomain[1]) {
        newChartData.push({ x: msmt.date, y: msmt.measurement });
      }
    });
    setChartData(newChartData);
    // data is already sorted by date
    setDomain([newChartData[0].x, newChartData[newChartData.length - 1].x]);

    const yValues = newChartData.map((datum) => datum.y);
    const newRange = [Math.min(...yValues), Math.max(...yValues)];
    setRange(newRange);

    const newMean = getMean(yValues);
    setMean(newMean);
    setMedian(getMedian(yValues));
    setStdDev(getStdDev(yValues, newMean));
  }, []);

  const [minYear, setMinYear] = useState(null);
  const [maxYear, setMaxYear] = useState(null);
  // Initialize the chart
  useEffect(() => {
    const specMeasurements = measurements?.[unit]?.[fraction]?.[spec];
    if (specMeasurements && specMeasurements.length) {
      const yearLow = specMeasurements[0].year;
      const yearHigh = specMeasurements[specMeasurements.length - 1].year;
      setMinYear(yearLow);
      setMaxYear(yearHigh);
      getChartData([yearLow, yearHigh], specMeasurements);
    } else {
      setChartData(null);
    }
  }, [charcsStatus, fraction, getChartData, measurements, spec, unit]);

  // Title for the y-axis
  let yTitle = charcName;
  if (fraction !== 'Not Specified')
    yTitle += ', ' + fraction?.replace(',', ' -');
  if (spec !== 'Not Specified') yTitle += ', ' + spec;
  yTitle += ', ' + unit;

  let infoText = null;
  if (!charcName)
    infoText =
      'Select a characteristic from the table above to graph its results.';
  else if (!measurements)
    infoText =
      'No measurements available to be charted for this characteristic.';

  return (
    <div css={boxStyles}>
      <h2 css={infoBoxHeadingStyles}>
        Chart of Results for{' '}
        {!charcName
          ? 'Selected Characteristic'
          : titleCaseWithExceptions(charcName)}
      </h2>
      <StatusContent
        empty={
          <p css={modifiedInfoBoxStyles}>
            No data available for this monitoring location.
          </p>
        }
        failure={<p css={modifiedErrorBoxStyles}>{monitoringError}</p>}
        fetching={<LoadingSpinner />}
        status={charcsStatus}
      >
        {infoText ? (
          <p css={modifiedInfoBoxStyles}>{infoText}</p>
        ) : (
          <>
            <SliderContainer
              min={minYear}
              max={maxYear}
              disabled={!Boolean(records.length)}
              onChange={(newDomain) => {
                const specMeasurements =
                  measurements?.[unit]?.[fraction]?.[spec];
                if (specMeasurements) {
                  getChartData(newDomain, specMeasurements);
                }
              }}
            />
            <div css={selectContainerStyles}>
              <span>
                <label htmlFor="unit">Unit:</label>
                <Select
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
                <label htmlFor="sample-fraction">Sample Fraction:</label>
                <Select
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
              <span className="radio-container">
                <label>Scale Type:</label>
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
              yTitle={yTitle}
              unit={unit}
            />
            {chartData?.length && (
              <div css={boxSectionStyles}>
                {sectionRowInline(
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
                {sectionRowInline(
                  'Number of Measurements Shown',
                  chartData.length.toLocaleString(),
                )}
                {sectionRowInline(
                  'Average of Values',
                  `${mean.toLocaleString('en-US')} ${String.fromCharCode(
                    177,
                  )} ${stdDev.toLocaleString()} ${unit}`,
                )}
                {sectionRowInline(
                  'Median Value',
                  `${median.toLocaleString()} ${unit}`,
                )}
                {range &&
                  sectionRowInline(
                    'Minimum Value',
                    `${range[0].toLocaleString()} ${unit}`,
                  )}
                {range &&
                  sectionRowInline(
                    'Maximum Value',
                    `${range[1].toLocaleString()} ${unit}`,
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
          checked={item.selected === 1}
          ref={(input) => {
            if (input) input.indeterminate = item.selected === 0.5;
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
            <label htmlFor={charc.name}></label>
          </div>
        );
        const measurementCount = charc.records.reduce((a, b) => {
          if (b.measurement) return a + 1;
          return a;
        }, 0);
        return {
          group: charc.group,
          measurementCount: measurementCount.toLocaleString(),
          name: charc.name,
          resultCount: charc.count.toLocaleString(),
          select: selector,
          type: charc.type,
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
            <p css={modifiedInfoBoxStyles}>
              No records found for this location.
            </p>
          }
          failure={
            <div css={modifiedErrorBoxStyles}>
              <p>{monitoringError}</p>
            </div>
          }
          fetching={<LoadingSpinner />}
          status={charcsStatus}
        >
          {sectionRowInline('Selected Characteristic', selected, charcsStatus)}
          <ReactTable
            autoResetFilters={false}
            autoResetSortBy={false}
            data={tableData}
            placeholder="Filter..."
            striped={false}
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
                  Header: 'Type',
                  accessor: 'type',
                  width: columnWidth,
                  filterable: true,
                },
                {
                  Header: 'Group',
                  accessor: 'group',
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

function ChartContainer({ range, data, charcName, scaleType, yTitle, unit }) {
  const charcGroup = getCharcGroup(
    getCharcType(charcName, characteristicsByType),
    characteristicGroupMappings,
  );
  const chartRef = useRef(null);

  if (!range) return <LoadingSpinner />;

  if (!data?.length)
    return (
      <p css={modifiedInfoBoxStyles}>
        No measurements available for the selected options.
      </p>
    );

  return (
    <div ref={chartRef} css={chartContainerStyles}>
      <LineChart
        color={lineColors[charcGroup]}
        containerRef={chartRef.current}
        data={data}
        dataKey={charcName}
        range={range}
        xTitle="Date"
        yScale={scaleType}
        yTitle={yTitle}
        yUnit={unit}
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
                checked={item.selected === 1}
                ref={(input) => {
                  if (input) input.indeterminate = item.selected === 0.5;
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

function DownloadSection({ charcs, charcsStatus, station, stationStatus }) {
  const [range, setRange] = useState(null);
  const [minYear, setMinYear] = useState(null);
  const [maxYear, setMaxYear] = useState(null);
  const [checkboxes, checkboxDispatch] = useReducer(
    checkboxReducer,
    initialCheckboxes,
  );
  const [expanded, setExpanded] = useState(false);

  const services = useServicesContext();

  const downloadUrl =
    stationStatus === 'success' &&
    `${services.data.waterQualityPortal.resultSearch}` +
      `zip=no&dataProfile=narrowResult` +
      `&organization=${station.orgId}` +
      `&siteid=${station.siteId}` +
      `&providers=${station.providerName}` +
      `${buildCharcsFilter(checkboxes)}` +
      `${buildDateFilter(range, minYear, maxYear)}`;

  const portalUrl =
    stationStatus === 'success' &&
    `${services.data.waterQualityPortal.userInterface}#` +
      `mimeType=xlsx&dataProfile=narrowResult` +
      `&organization=${station.orgId}` +
      `&siteid=${station.siteId}` +
      `&providers=${station.providerName}` +
      `${buildCharcsFilter(checkboxes)}` +
      `${buildDateFilter(range, minYear, maxYear)}`;

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
      <h2 css={boxHeadingStyles}>Download Station Data</h2>
      <StatusContent
        empty={
          <p css={modifiedInfoBoxStyles}>
            No data available for this monitoring location.
          </p>
        }
        failure={<p css={modifiedErrorBoxStyles}>{monitoringError}</p>}
        fetching={<LoadingSpinner />}
        status={charcsStatus}
      >
        <SliderContainer
          disabled={!Boolean(Object.keys(charcs).length)}
          max={maxYear}
          min={minYear}
          onChange={(newRange) => setRange(newRange)}
        />
        <div css={flexboxSectionStyles}>
          <div css={accordionStyles}>
            <AccordionList
              className="accordion-list"
              onExpandCollapse={(newExpanded) => setExpanded(newExpanded)}
              title={
                <span>
                  <input
                    type="checkbox"
                    checked={checkboxes.all === 1}
                    ref={(input) => {
                      if (input) input.indeterminate = checkboxes.all === 0.5;
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
                    subHeading="Character&shy;istic Types"
                  >
                    {checkboxes.groups[groupId].types
                      .sort((a, b) => a.localeCompare(b))
                      .map((typeId) => (
                        <CheckboxAccordion
                          accessor="types"
                          level={1}
                          id={typeId}
                          dispatch={checkboxDispatch}
                          key={typeId}
                          state={checkboxes}
                          expanded={expanded}
                          subHeading="Character&shy;istic Names"
                        >
                          {checkboxes.types[typeId].charcs
                            .sort((a, b) => a.localeCompare(b))
                            .map((charcId) => (
                              <CheckboxRow
                                accessor="charcs"
                                level={2}
                                id={charcId}
                                key={charcId}
                                dispatch={checkboxDispatch}
                                state={checkboxes}
                              />
                            ))}
                        </CheckboxAccordion>
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
        <div id="download-links" css={downloadLinksStyles}>
          <div>
            <a
              rel="noopener noreferrer"
              target="_blank"
              data-cy="portal"
              href={portalUrl}
              style={{ fontWeight: 'normal' }}
            >
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
          </div>
          <div>
            <span>Download Selected Data</span>
            <span>
              &nbsp;&nbsp;
              <FileLink
                disabled={checkboxes.all === 0}
                fileType="excel"
                url={downloadUrl}
              />
              &nbsp;&nbsp;
              <FileLink
                disabled={checkboxes.all === 0}
                fileType="csv"
                url={downloadUrl}
              />
            </span>
          </div>
        </div>
      </StatusContent>
    </div>
  );
}

function FileLink({ disabled, fileType, url }) {
  const mimeTypes = { excel: 'xlsx', csv: 'csv' };
  if (disabled)
    return (
      <i
        className={`fas fa-file-${fileType}`}
        aria-hidden="true"
        style={{ color: '#ccc' }}
      />
    );
  return (
    <a href={`${url}&mimeType=${mimeTypes[fileType]}`}>
      <i className={`fas fa-file-${fileType}`} aria-hidden="true" />
    </a>
  );
}

function InformationSection({ orgId, siteId, station, stationStatus }) {
  const trimmedSiteId = siteId.replace(orgId + '-', '');

  return (
    <div css={boxStyles}>
      <h2 css={infoBoxHeadingStyles}>
        {stationStatus === 'fetching' && <LoadingSpinner />}
        <span>
          {stationStatus === 'success' && station.locationName}
          <small>
            <strong>Monitoring Station ID:</strong>&nbsp; {trimmedSiteId}
          </small>
        </span>
      </h2>
      {sectionRowInline('Organization Name', station.orgName, stationStatus)}
      {sectionRowInline('Organization ID', station.orgId, stationStatus)}
      {sectionRowInline(
        'Location',
        `${station.county}, ${station.state}`,
        stationStatus,
      )}
      {sectionRowInline('Water Type', station.locationType, stationStatus)}
      {sectionRowInline(
        'Total Sample Count',
        station.totalSamples?.toLocaleString(),
        stationStatus,
      )}
      {sectionRowInline(
        'Total Measurement Count',
        station.totalMeasurements?.toLocaleString(),
        stationStatus,
      )}
    </div>
  );
}

function MonitoringStationContent() {
  const { orgId, provider, siteId } = useParams();
  const { fullscreenActive } = useFullscreenContext();
  const [station, stationStatus] = useStationDetails(provider, orgId, siteId);
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
            <StationMapContainer
              layout="narrow"
              station={station}
              stationStatus={stationStatus}
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
      <StationMapContainer
        layout="wide"
        station={station}
        stationStatus={stationStatus}
        widthRef={widthRef}
      />
    </div>
  );

  const noStationView = (
    <Page>
      <NavBar title="Monitoring Station Details" />

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
        <div data-content="stationmap" style={{ width, height }}>
          <StationMapContainer
            layout="fullscreen"
            station={station}
            widthRef={widthRef}
          />
        </div>
      )}
    </WindowSize>
  );

  const twoColumnView = (
    <Page>
      <NavBar title="Monitoring Station Details" />
      <div css={containerStyles} data-content="container">
        <WindowSize>
          {({ width, height }) => {
            return (
              <div css={modifiedSplitLayoutColumnsStyles}>
                <div className="static" css={leftColumnStyles}>
                  <InformationSection
                    orgId={orgId}
                    station={station}
                    stationStatus={stationStatus}
                    siteId={siteId}
                  />
                  {width < 960 ? mapNarrow(height) : mapWide}
                  <DownloadSection
                    charcs={characteristics}
                    charcsStatus={characteristicsStatus}
                    station={station}
                    stationStatus={stationStatus}
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
      empty={noStationView}
      failure={<p css={modifiedErrorBoxStyles}>{monitoringError}</p>}
      fetching={content}
      success={content}
      status={stationStatus}
    />
  );
}

function MonitoringStation() {
  return (
    <FullscreenProvider>
      <MonitoringStationContent />
    </FullscreenProvider>
  );
}

function SliderContainer({ min, max, disabled = false, onChange }) {
  return (
    <div css={sliderContainerStyles}>
      {!min || !max ? (
        <LoadingSpinner />
      ) : (
        <DateSlider
          disabled={disabled}
          min={min}
          max={max}
          onChange={onChange}
        />
      )}
    </div>
  );
}

function StationMap({ layout, station, stationStatus, widthRef }) {
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
    station,
    stationStatus,
  ]);

  // Draw the station on the map
  useEffect(() => {
    if (!layersInitialized || doneDrawing) return;
    drawStation(station, monitoringLocationsLayer).then((result) => {
      setDoneDrawing(result);
    });
  }, [
    doneDrawing,
    layersInitialized,
    station,
    monitoringLocationsLayer,
    services,
  ]);

  // Zoom to the location of the station
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
    const itemName = layout === 'fullscreen' ? 'stationmap' : 'container';
    const content = document.querySelector(`[data-content="${itemName}"]`);
    if (content) {
      let pos = content.getBoundingClientRect();

      window.scrollTo(pos.left + window.scrollX, pos.top + window.scrollY);
    }
  }, [layout]);

  return (
    <div css={mapContainerStyles} data-testid="hmw-station-map" ref={widthRef}>
      {stationStatus === 'fetching' ? (
        <LoadingSpinner />
      ) : (
        <Map layers={layers} />
      )}
      {mapView && mapLoading && <MapLoadingSpinner />}
    </div>
  );
}

function StationMapContainer({ ...props }) {
  return (
    <MapErrorBoundary>
      <MapHighlightProvider>
        <StationMap {...props} />
      </MapHighlightProvider>
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

export default MonitoringStation;
