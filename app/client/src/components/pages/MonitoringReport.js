/** @jsxImportSource @emotion/react */

import Basemap from '@arcgis/core/Basemap';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import Viewpoint from '@arcgis/core/Viewpoint';
import { css } from '@emotion/react';
import { WindowSize } from '@reach/window-size';
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
// components
import { AccordionList, AccordionItem } from 'components/shared/Accordion';
import { BoxContent, FlexRow } from 'components/shared/BoxContent';
import DateSlider from 'components/shared/DateSlider';
import MapErrorBoundary from 'components/shared/ErrorBoundary.MapErrorBoundary';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import { HelpTooltip, Tooltip } from 'components/shared/HelpTooltip';
import { DisclaimerModal } from 'components/shared/Modal';
import { GradientLegend, VisxGraph } from 'components/shared/VisxGraph';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import Map from 'components/shared/Map';
import MapLoadingSpinner from 'components/shared/MapLoadingSpinner';
import MapVisibilityButton from 'components/shared/MapVisibilityButton';
import { errorBoxStyles, infoBoxStyles } from 'components/shared/MessageBoxes';
import NavBar from 'components/shared/NavBar';
import Page from 'components/shared/Page';
import ReactTable, { generateFilterInput } from 'components/shared/ReactTable';
import {
  splitLayoutContainerStyles,
  splitLayoutColumnsStyles,
  splitLayoutColumnStyles,
} from 'components/shared/SplitLayout';
// config
import { monitoringDownloadError, monitoringError } from 'config/errorMessages';
// contexts
import { LayersProvider, useLayers } from 'contexts/Layers';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
import { MapHighlightProvider } from 'contexts/MapHighlight';
// helpers
import { fetchParseCsv, fetchPost } from 'utils/fetchUtils';
import {
  useAbort,
  useMonitoringLocations,
  useMonitoringLocationsLayers,
  useSharedLayers,
} from 'utils/hooks';
import { getMedian, isAbort, toFixedFloat } from 'utils/utils';
// styles
import {
  boxStyles,
  boxHeadingStyles,
  boxSectionStyles,
} from 'components/shared/Box';
import {
  colors,
  disclaimerStyles,
  iconButtonStyles,
  reactSelectStyles,
} from 'styles';

/*
## Styles
*/

const accordionFlexStyles = css`
  display: flex;
  justify-content: space-between;

  .count {
    white-space: nowrap;
  }
`;

const accordionHeadingStyles = css`
  ${accordionFlexStyles}
  font-size: 0.875rem;
  margin-top: 0 !important;
  padding: 0.75em 1em !important;
`;

const accordionRowStyles = css`
  ${accordionHeadingStyles}
  border-top: 1px solid #d8dfe2;
`;

const accordionStyles = css`
  margin-bottom: 1.25rem;
  width: 100%;

  .accordion-list p {
    margin-top: 0 !important;
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

const boxContentStyles = css`
  .row-cell {
    &:nth-of-type(even) {
      padding-right: 0.5em;
    }
    &:nth-of-type(odd) {
      padding-left: 0.5em;
    }
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
`;

const chartControlStyles = css`
  flex-shrink: 0;
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

const checkboxInputStyles = css`
  transform: scale(1.2);
`;

const checkboxStyles = css`
  display: flex;
  gap: 0.5em;
  margin-bottom: 0;

  label {
    cursor: pointer;
    font-size: inherit;
  }

  & > * {
    margin-bottom: auto;
    margin-top: auto;
  }

  input {
    ${checkboxInputStyles};
  }
`;

const checkboxTitleStyles = css`
  ${checkboxStyles}
  font-weight: bold;
  gap: 1em;
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

const disclaimerModalStyles = css`
  li {
    padding-bottom: 0.5em;
  }

  ul {
    list-style-type: lower-alpha;
    margin: 0;
    padding-bottom: 0;
    padding-top: 0.5em;
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

    &:first-of-type {
      font-weight: normal;
      padding-left: 1rem;
      text-align: start;
    }
    &:last-of-type {
      font-weight: bold;
      padding-right: 1rem;
      text-align: end;
    }
  }

  p {
    margin-top: 0;
    line-height: 1em;
    font-size: 1em;
    &:nth-of-type(n + 2) {
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

const flexRowStyles = css`
  ${boxContentStyles}
  &.flex-row {
    font-size: 1em;
  }
  margin-bottom: 0.5rem;

  span {
    margin: 0 !important;
  }
`;

const iconStyles = css`
  margin-right: 5px;
`;

const locationRowStyles = css`
  & > * {
    display: inline-block;
  }

  strong {
    margin-right: 0.2em;
  }
`;

const infoBoxHeadingStyles = css`
  ${boxHeadingStyles};
  display: flex;
  justify-content: space-between;
  margin-bottom: 0;

  & > * {
    margin-bottom: auto;
    margin-top: auto;
  }

  button {
    font-size: 1rem;
  }
`;

const leftColumnStyles = css`
  ${splitLayoutColumnStyles}

  @media (min-width: 960px) {
    width: 50%;
    max-width: 582px;
  }
`;

const legendContainerStyles = css`
  display: flex;
  justify-content: space-between;
  margin-top: 1em;
`;

const locationHeadingStyles = css`
  ${boxHeadingStyles}

  & > small {
    display: block;
  }

  /* loading icon */
  svg {
    margin: 0 -0.375rem 0 -0.875rem;
    height: 1rem;
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

const mapBoxStyles = css`
  ${modifiedBoxStyles}

  p {
    margin-top: 0;
  }
`;

const modifiedInfoBoxStyles = css`
  ${infoBoxStyles}
  margin-bottom: 0.5em;
`;

const modifiedDisclaimerStyles = css`
  ${disclaimerStyles};

  padding-bottom: 0;
`;

const modifiedIconButtonStyles = css`
  ${iconButtonStyles};
  margin-right: 0.5em;

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
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
    box-shadow:
      0 0 0 2px ${colors.steel()},
      inset 0 0 0 2px ${colors.white()};
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
      box-shadow: 0 0 0 2px ${colors.steel()};
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

const sectionStyles = css`
  padding: 0.4375rem 0.875rem;
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

  .column-container {
    display: inline-flex;
    flex-direction: column;
    gap: 0.5em;

    label {
      font-weight: normal;
    }
  }

  .select {
    width: 100%;
  }
`;

const selectedCharacteristicStyles = css`
  button {
    margin-bottom: 0;
  }

  ul {
    padding-bottom: 1em;
  }
`;

const sliderContainerStyles = css`
  margin: 1em;
`;

const statisticsHeadingStyles = css`
  margin-bottom: 0 !important;
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

const MAX_NUM_CHARTS = 4;
const MEASUREMENT_PRECISION = 5;

function buildOptions(values) {
  return Array.from(values).map((value) => {
    return { value: value, label: value };
  });
}

function buildTooltip(unit) {
  return (tooltipData) => {
    if (!tooltipData?.nearestDatum) return null;
    const datum = tooltipData.nearestDatum.datum;
    if (!datum) return null;
    const depth =
      Number.isFinite(datum.depth) && datum.depthUnit
        ? `${datum.depth} ${datum.depthUnit}`
        : null;
    return (
      <div css={chartTooltipStyles}>
        <p>{datum.x}:</p>
        <p>
          <em>{datum.type === 'line' && 'Average '}Measurement</em>:{' '}
          {`${formatNumber(datum.y)} ${unit}`}
          {depth && (
            <>
              <br />
              <em>{datum.type === 'line' && 'Average '}Depth</em>: {depth}
            </>
          )}
          {datum.activityTypeCode && (
            <>
              <br />
              <em>Activity Type Code</em>: {datum.activityTypeCode}
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

// Format number as a string with a specified precision.
function formatNumber(num, precision = MEASUREMENT_PRECISION) {
  if (!Number.isFinite(num)) return '';
  if (num >= -Number.EPSILON && num <= Number.EPSILON) return '0';

  const rounded = parseFloat(num.toPrecision(precision));
  // Compare the number of significant digits to the precision.
  return rounded.toString().replace('.', '').length > precision
    ? rounded.toExponential()
    : rounded.toLocaleString();
}

// Create a heatmap proportional to the range of the provided numerical data
function generateHeatmap(data) {
  const svMin = 30;
  const svMax = 100;
  const hue = 204;

  if (!data.length) return [rgb2hex(...hsv2rgb(hue, svMin / 100, svMax / 100))];

  const sortedData = data.toSorted((a, b) => a - b);
  const dataMin = sortedData[0];
  const dataMax = sortedData[sortedData.length - 1];
  return sortedData.map((datum) => {
    const fractionalPos =
      datum === 0 || dataMax === dataMin
        ? 0
        : (datum - dataMin) / (dataMax - dataMin);
    const offset = (svMax - svMin) * fractionalPos;
    const sat = (svMin + offset) / 100;
    const val = (svMax - offset) / 100;
    return rgb2hex(...hsv2rgb(hue, sat, val));
  });
}

// Extract the outermost values from an array into a new array.
// Returns an array of length 0, 1, or 2.
function getArrayOuter(arr) {
  const result = [];
  if (arr.length) result.push(arr[0]);
  if (arr.length > 1) result.push(arr[arr.length - 1]);
  return result;
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
  return sum / values.length;
}

function getStdDev(values, mean = null) {
  if (values.length <= 1) return null;
  const sampleMean = mean ?? getMean(values);
  const tss = values.reduce((a, b) => a + (b - sampleMean) ** 2, 0);
  const variance = tss / (values.length - 1);
  return Math.sqrt(variance);
}

function getTotalCount(charcs) {
  let totalCount = 0;
  Object.values(charcs).forEach((charc) => {
    if (charc.selected) totalCount += charc.count;
  });
  return totalCount;
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

// Adapted from https://stackoverflow.com/a/54024653
function hsv2rgb(h, s, v) {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  };
  return [f(5), f(3), f(1)];
}

// Constructs a data point for the line graph by averaging daily measurements
function lineDatum(dayData) {
  return {
    type: 'line',
    x: dayData[0].x,
    y: getMean(dayData.map((d) => d.y)),
    depth: getMean(dayData.map((d) => d.depth).filter((d) => d !== null)),
    depthUnit: dayData.find((d) => d.depthUnit !== null)?.depthUnit,
  };
}

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

// Constructs a data point for the scatter plot
function pointDatum(msmt, colors, depths) {
  return {
    type: 'point',
    x: msmt.date,
    y:
      msmt.measurement >= -Number.EPSILON && msmt.measurement <= Number.EPSILON
        ? Number.EPSILON
        : msmt.measurement,
    activityTypeCode: msmt.activityTypeCode,
    color: msmt.depth !== null ? colors[depths.indexOf(msmt.depth)] : '#4d4d4d',
    depth: msmt.depth,
    depthUnit: msmt.depthUnit,
  };
}

// Adapted from https://stackoverflow.com/a/54014428
function rgb2hex(r, g, b) {
  let hex = '#';
  [r, g, b].forEach((x) => {
    hex += Math.round(x * 255)
      .toString(16)
      .padStart(2, '0');
  });
  return hex;
}

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

function useCharacteristics(provider, orgId, siteId, characteristicsByGroup) {
  const services = useServicesContext();

  // charcs => characteristics
  const [charcs, setCharcs] = useState({});
  const [status, setStatus] = useState('idle');

  const structureRecords = useCallback(
    (records, charcsByGroup) => {
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
          const charcGroup = getCharcGroup(
            record.CharacteristicName,
            charcsByGroup,
          );
          recordsByCharc[record.CharacteristicName] = {
            name: record.CharacteristicName,
            records: [],
            group: charcGroup,
            count: 0,
          };
        }
        const curCharc = recordsByCharc[record.CharacteristicName];
        curCharc.count += 1;
        const recordDate = record.ActivityStartDate.split('-');
        curCharc.records.push({
          activityTypeCode: record.ActivityTypeCode,
          day: parseInt(recordDate[2]),
          depth: record['ResultDepthHeightMeasure/MeasureValue'],
          depthUnit: record['ResultDepthHeightMeasure/MeasureUnitCode'] || null,
          fraction: record.ResultSampleFractionText || 'None',
          measurement: record.ResultMeasureValue,
          medium: record.ActivityMediaName || 'None',
          month: parseInt(recordDate[1]),
          unit: record['ResultMeasure/MeasureUnitCode'] || 'None',
          year: parseInt(recordDate[0]),
        });
      });
      setCharcs(recordsByCharc);
      setStatus('success');
    },
    [setCharcs, setStatus],
  );

  const { monitoringPeriodOfRecordStatus } = useContext(LocationSearchContext);
  useEffect(() => {
    if (services.status !== 'success') return;
    if (monitoringPeriodOfRecordStatus !== 'success') {
      setStatus(monitoringPeriodOfRecordStatus);
      return;
    }
    setStatus('pending');
    const url =
      `${services.data.waterQualityPortal.resultSearch}` +
      `&mimeType=csv&zip=no&dataProfile=resultPhysChem` +
      `&providers=${encodeURIComponent(
        provider,
      )}&organization=${encodeURIComponent(orgId)}&siteid=${encodeURIComponent(
        siteId,
      )}`;
    fetchParseCsv(url)
      .then((results) => structureRecords(results, characteristicsByGroup))
      .catch((_err) => {
        setStatus('failure');
        console.error('Papa Parse error');
      });
  }, [
    characteristicsByGroup,
    monitoringPeriodOfRecordStatus,
    orgId,
    provider,
    services,
    siteId,
    structureRecords,
  ]);

  return [charcs, status];
}

async function zoomToStation(layer, mapView, signal) {
  await reactiveUtils.whenOnce(() => !mapView.updating);
  const featureSet = await layer.queryFeatures();
  const graphics = featureSet.features;
  if (graphics.length) {
    const targetGraphic = graphics.pop();
    // handle zooming to a single point graphic
    const zoomParams = { target: targetGraphic, zoom: 16 };
    await reactiveUtils.whenOnce(() => mapView.ready);
    await mapView.when();
    await mapView.goTo(zoomParams, { signal });
  }
}

/*
## Components
*/

function CharacteristicChartSection({
  charcName,
  charcsStatus,
  records,
  shiftDown,
  shiftUp,
}) {
  const [measurements, setMeasurements] = useState([]);

  // Selected and available units
  const [unit, setUnit] = useState(null);
  const [units, setUnits] = useState([]);
  useEffect(() => {
    if (units.length) setUnit(units[0].value);
  }, [units]);

  // Selected and available sample fractions
  const [fraction, setFraction] = useState(null);
  const [fractions, setFractions] = useState([]);
  useEffect(() => {
    if (fractions.length) setFraction(fractions[0].value);
  }, [fractions]);

  // Selected and available activity media names
  const [medium, setMedium] = useState(null);
  const [media, setMedia] = useState([]);
  useEffect(() => {
    if (media.length) setMedium(media[0].value);
  }, [media]);

  // Logarithmic or linear
  const [scaleType, setScaleType] = useState('linear');

  // Chart series visibilities
  const [scatterPlotVisible, setScatterPlotVisible] = useState(true);
  const [lineGraphVisible, setLineGraphVisible] = useState(false);

  // Get the records with measurements and their filter options
  useEffect(() => {
    const newMeasurements = [];
    const fractionValues = new Set();
    const unitValues = new Set();
    const mediumValues = new Set();

    records.forEach((record) => {
      // Remove records with no measurement
      if (!Number.isFinite(record.measurement)) return;

      // Remove QC-related records
      const badTypeCodes = [
        'sample-depletion replicate',
        'sample-negative control',
        'sample-positive control',
        'sample-routine resample',
      ];
      if (record.activityTypeCode?.toLowerCase().includes('quality')) return;
      if (badTypeCodes.includes(record.activityTypeCode?.toLowerCase())) return;

      // Add record measurement to newMeasurements
      unitValues.add(record.unit);
      fractionValues.add(record.fraction);
      mediumValues.add(record.medium);

      newMeasurements.push({
        ...record,
        date: getDate(record),
        measurement: parseFloat(record.measurement),
      });
    });

    newMeasurements.sort((a, b) => a.day - b.day);
    newMeasurements.sort((a, b) => a.month - b.month);
    newMeasurements.sort((a, b) => a.year - b.year);

    setFractions(buildOptions(fractionValues));
    setUnits(buildOptions(unitValues));
    setMedia(buildOptions(mediumValues));
    setMeasurements(newMeasurements);
    setScaleType('linear');
  }, [records]);

  const [depthColorRange, setDepthColorRange] = useState([]);
  const [depthValueRange, setDepthValueRange] = useState([]);

  // Parse the measurements into chartable data points
  const parseMeasurements = useCallback((newDomain, newMsmts) => {
    const newPointData = [];
    const newLineData = [];

    // Create a color range from all depths present
    const allDepths = new Set();
    let depthUnit = null;
    newMsmts.forEach((msmt) => {
      allDepths.add(msmt.depth);
      // Warn if depth units for a characteristic do not align
      if (depthUnit && msmt.depthUnit !== depthUnit)
        console.warn('Depth units differ');
      depthUnit = msmt.depthUnit;
    });
    const sortedDepths = Array.from(allDepths)
      .filter((d) => d !== null)
      .sort((a, b) => a - b);
    const chartColors = generateHeatmap(sortedDepths);

    let curDay = null;
    let curDayData = [];
    newMsmts.forEach((msmt) => {
      if (msmt.year >= newDomain[0] && msmt.year <= newDomain[1]) {
        const datum = pointDatum(msmt, chartColors, sortedDepths);
        newPointData.push(datum);
        if (datum.x !== curDay) {
          // Construct the previous day's data point
          curDayData.length && newLineData.push(lineDatum(curDayData));
          curDay = datum.x;
          curDayData = [datum];
        } else {
          // Same day, store for processing
          curDayData.push(datum);
        }
      }
    });
    curDayData.length && newLineData.push(lineDatum(curDayData));

    setDepthColorRange(getArrayOuter(chartColors));
    setDepthValueRange(getArrayOuter(sortedDepths));

    return { pointData: newPointData, lineData: newLineData };
  }, []);

  const [minYear, setMinYear] = useState(null);
  const [maxYear, setMaxYear] = useState(null);
  const [selectedYears, setSelectedYears] = useState([]);

  // Initialize the date slider parameters
  useEffect(() => {
    if (measurements.length) {
      const yearLow = measurements[0].year;
      const yearHigh = measurements[measurements.length - 1].year;
      setMinYear(yearLow);
      setMaxYear(yearHigh);
      setSelectedYears([yearLow, yearHigh]);
    } else {
      setMinYear(null);
      setMaxYear(null);
      setSelectedYears([]);
    }
  }, [measurements]);

  // Get the selected chart data and statistics
  const chartData = useMemo(() => {
    if (selectedYears.length !== 2) return { pointData: [], lineData: [] };

    // `measurements` must be already sorted by date
    const filteredMsmts = measurements.filter((msmt) => {
      return (
        msmt.fraction === fraction &&
        msmt.unit === unit &&
        msmt.medium === medium
      );
    });

    return parseMeasurements(selectedYears, filteredMsmts);
  }, [fraction, measurements, medium, parseMeasurements, selectedYears, unit]);

  const displayUnit = unit === 'None' ? '' : unit;

  // Title for the y-axis
  let yTitle = charcName;
  if (fraction !== 'None') yTitle += ', ' + fraction?.replace(',', ' -');
  if (displayUnit) yTitle += ', ' + unit;

  let infoText = null;
  if (!measurements.length) {
    infoText =
      'No measurements available to be charted for this characteristic.';
    if (records.length)
      infoText +=
        ' Note that measurements below detection & measurements from QC (quality control) samples are not included in the chart.';
  }

  return (
    <div className="charc-chart" css={modifiedBoxStyles}>
      <h2 css={infoBoxHeadingStyles}>
        Chart of Results for{' '}
        {!charcName ? 'Selected Characteristic' : charcName}
        <span css={chartControlStyles}>
          <button
            aria-label="Shift chart down"
            css={modifiedIconButtonStyles}
            disabled={!shiftDown}
            type="button"
            onClick={() => shiftDown(charcName)}
          >
            <i aria-hidden className="fas fa-arrow-down" />
          </button>
          <button
            aria-label="Shift chart up"
            css={modifiedIconButtonStyles}
            disabled={!shiftUp}
            type="button"
            onClick={() => shiftUp(charcName)}
          >
            <i aria-hidden className="fas fa-arrow-up" />
          </button>
          <HelpTooltip label="Adjust the slider handles to filter the data displayed on the chart by the selected year range, and use the drop-down inputs to filter the data by the corresponding fields" />
        </span>
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
        pending={<LoadingSpinner />}
        status={charcsStatus}
      >
        {infoText && <p css={messageBoxStyles(infoBoxStyles)}>{infoText}</p>}
        {measurements.length > 0 && (
          <>
            <SliderContainer
              min={minYear}
              max={maxYear}
              disabled={!records.length}
              onChange={(newDomain) => setSelectedYears(newDomain)}
              range={selectedYears}
            />
            <div css={selectContainerStyles}>
              <span>
                <span css={screenLabelStyles}>
                  <GlossaryTerm term="Unit">Unit</GlossaryTerm>:
                </span>
                <Select
                  aria-label="Unit"
                  className="select"
                  inputId={`${charcName}-unit`}
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
                  inputId={`${charcName}-sample-fraction`}
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
                  inputId={`${charcName}-media-name`}
                  isSearchable={false}
                  options={media}
                  value={media.find((f) => f.value === medium)}
                  onChange={(ev) => {
                    setMedium(ev.value);
                  }}
                  styles={reactSelectStyles}
                />
              </span>
              <span className="column-container">
                <span css={screenLabelStyles}>
                  <GlossaryTerm term="Scale Type">Scale Type</GlossaryTerm>:
                </span>
                <span css={radioStyles}>
                  <input
                    checked={scaleType === 'linear'}
                    id={`${charcName}-linear`}
                    onChange={(e) => setScaleType(e.target.value)}
                    type="radio"
                    value="linear"
                  />
                  <label htmlFor={`${charcName}-linear`}>Linear</label>
                </span>
                <span css={radioStyles}>
                  <input
                    checked={scaleType === 'log'}
                    id={`${charcName}-log`}
                    onChange={(e) => setScaleType(e.target.value)}
                    type="radio"
                    value="log"
                  />
                  <label htmlFor={`${charcName}-log`}>Log</label>
                </span>
              </span>
              <span className="column-container">
                <span css={screenLabelStyles}>
                  <GlossaryTerm term="Chart Type">Chart Type</GlossaryTerm>:
                </span>
                <span css={checkboxStyles}>
                  <input
                    checked={scatterPlotVisible}
                    id={`${charcName}-scatter`}
                    onChange={(e) => setScatterPlotVisible(e.target.checked)}
                    type="checkbox"
                  />
                  <label htmlFor={`${charcName}-scatter`}>Scatter Plot</label>
                </span>
                <span css={checkboxStyles}>
                  <input
                    checked={lineGraphVisible}
                    css={checkboxInputStyles}
                    id={`${charcName}-line`}
                    onChange={(e) => setLineGraphVisible(e.target.checked)}
                    type="checkbox"
                  />
                  <label htmlFor={`${charcName}-line`}>Line Graph</label>
                </span>
              </span>
            </div>
            <ChartContainer
              lineData={chartData.lineData}
              lineVisible={lineGraphVisible}
              pointData={chartData.pointData}
              pointLegendColors={depthColorRange}
              pointLegendValues={depthValueRange}
              pointsVisible={scatterPlotVisible}
              scaleType={scaleType}
              yTitle={yTitle}
              unit={displayUnit}
            />
            <ChartStatistics data={chartData.pointData} unit={displayUnit} />
          </>
        )}
      </StatusContent>
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
        const measurementCount = charc.records.reduce((a, b) => {
          if (Number.isFinite(b.measurement)) return a + 1;
          return a;
        }, 0);
        return {
          measurementCount: measurementCount.toLocaleString(),
          name: charc.name,
          resultCount: charc.count.toLocaleString(),
          selected: selected.includes(charc.name),
          group: charc.group,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [charcs, selected]);

  // Select the characteristic with the most measurements by default;
  useEffect(() => {
    const maxCharc = Object.values(charcs).reduce(
      (curMax, next) => {
        const nextCount = next.records.reduce((a, b) => {
          return Number.isFinite(b.measurement) ? a + 1 : a;
        }, 0);
        if (nextCount > curMax.count) {
          return { name: next.name, count: nextCount };
        }
        return curMax;
      },
      { name: null, count: 0 },
    );
    if (maxCharc.name) setSelected([maxCharc.name]);
  }, [charcs, setSelected]);

  const onChange = (ev) => {
    if (ev.target.checked) {
      setSelected((prev) => [ev.target.value, ...prev]);
    } else {
      setSelected((prev) => {
        const i = prev.indexOf(ev.target.value);
        return [...prev.slice(0, i), ...prev.slice(i + 1)];
      });
    }
  };

  const selectColumnHeader = () => <p className="sr-only">Selected</p>;

  const rowCheckbox = ({ row, value }) => {
    const charcName = row.values['name'];
    return (
      <div>
        <input
          checked={value}
          css={checkboxInputStyles}
          disabled={!value && selected.length >= MAX_NUM_CHARTS}
          id={charcName}
          onChange={onChange}
          type="checkbox"
          value={charcName}
        />
        <label htmlFor={charcName}>
          <span className="sr-only">Select {charcName}</span>
        </label>
      </div>
    );
  };

  const selectSortBy = useCallback((rowA, _rowB, colId) => {
    return rowA.values[colId] ? -1 : 1;
  }, []);

  const initialTableSort = useMemo(() => {
    return [{ id: 'measurementCount', desc: true }, { id: 'selected' }];
  }, []);

  return (
    <div css={boxStyles}>
      <h2 css={infoBoxHeadingStyles}>
        <div>
          Select up to {MAX_NUM_CHARTS}{' '}
          <GlossaryTerm term="Characteristics">Characteristics</GlossaryTerm>{' '}
          Below to Plot
        </div>
      </h2>
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
          pending={<LoadingSpinner />}
          status={charcsStatus}
        >
          <div css={modifiedInfoBoxStyles}>
            <h3>
              Selected{' '}
              <GlossaryTerm term="Characteristics">
                Characteristic(s)
              </GlossaryTerm>
            </h3>
            {selected.length ? (
              <div css={selectedCharacteristicStyles}>
                <ul>
                  {selected.map((charcName) => (
                    <li key={charcName}>{charcName}</li>
                  ))}
                </ul>
                <button type="button" onClick={() => setSelected([])}>
                  Clear Selected
                </button>
              </div>
            ) : (
              <p>
                Select the checkboxes in the table below to plot the
                measurements of the corresponding characteristics. Up to{' '}
                {MAX_NUM_CHARTS} plots can be displayed at one time.
              </p>
            )}
          </div>
          <ReactTable
            autoResetFilters={false}
            autoResetSortBy={false}
            data={tableData}
            initialSortBy={initialTableSort}
            striped={true}
            getColumns={(tableWidth) => {
              const columnWidth = tableWidth / 3 - 6;
              const halfColumnWidth = tableWidth / 6 - 6;
              return [
                {
                  Header: selectColumnHeader,
                  Cell: rowCheckbox,
                  accessor: 'selected',
                  minWidth: 25,
                  sortType: selectSortBy,
                  width: 25,
                  filterable: false,
                },
                {
                  Header: 'Characteristic Name',
                  Filter: generateFilterInput('Filter Characteristic Names...'),
                  accessor: 'name',
                  width: columnWidth,
                  filterable: true,
                },
                {
                  Header: 'Characteristic Group',
                  Filter: generateFilterInput(
                    'Filter Characteristic Groups...',
                  ),
                  accessor: 'group',
                  width: columnWidth,
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
  lineData,
  lineVisible,
  pointData,
  pointLegendValues,
  pointLegendColors,
  pointsVisible,
  scaleType,
  yTitle,
  unit,
}) {
  const chartRef = useRef(null);

  const pointSeries = useMemo(() => {
    let x = null;
    let i = 0;
    return pointData.reduce((obj, point) => {
      // Reset series index if new day (points are ordered by date)
      if (point.x === x) i++;
      else {
        x = point.x;
        i = 0;
      }
      const key = i.toString();
      if (key in obj) obj[key].push(point);
      else obj[key] = [point];
      return obj;
    }, {});
  }, [pointData]);

  if (!pointData.length) {
    return (
      <div css={chartContainerStyles}>
        <p css={messageBoxStyles(infoBoxStyles)}>
          No measurements available for the selected options.
        </p>
      </div>
    );
  }

  const yValues = pointData.map((d) => d.y);
  const range = [Math.min(...yValues), Math.max(...yValues)];
  const depthUnit = pointData.find((d) => d.depthUnit !== null)?.depthUnit;
  const legendTitle = depthUnit ? `Depth (${depthUnit})` : 'Depth';

  if (!lineVisible && !pointsVisible) {
    return <p css={messageBoxStyles(infoBoxStyles)}>No chart type selected.</p>;
  }

  // Addresses the issue that arises when all "zero" values are passed to the chart.
  const resolvedScaleType =
    range[0] === range[range.length - 1] ? 'log' : scaleType;

  const yTickFormat = (val, _index, values) => {
    // Avoid overcrowding on the y-axis when the log scale is used.
    // Shows only powers of 10 when a tick threshold is exceeded.
    if (
      resolvedScaleType === 'log' &&
      values.length > 20 &&
      Math.log10(val) % 1 !== 0
    ) {
      return '';
    }
    return formatNumber(val, 3);
  };

  const crossesZero =
    yValues.some((val) => val > 0) && yValues.some((val) => val < 0);
  if (crossesZero && scaleType === 'log')
    return (
      <div css={chartContainerStyles}>
        <p css={messageBoxStyles(infoBoxStyles)}>
          Cannot show positive and negative values on the same chart when the{' '}
          <em>log</em> scale type is selected.
        </p>
      </div>
    );

  return (
    <div ref={chartRef} css={chartContainerStyles}>
      <VisxGraph
        buildTooltip={buildTooltip(unit)}
        containerRef={chartRef.current}
        lineColorAccessor={() => colors.teal()}
        lineData={lineData}
        lineVisible={lineVisible}
        pointColorAccessor={(datum) => datum.color}
        pointData={pointSeries}
        pointsVisible={pointsVisible}
        range={range}
        xTitle="Date"
        yScale={resolvedScaleType}
        yTickFormat={yTickFormat}
        yTitle={yTitle}
      />
      <div css={legendContainerStyles}>
        {pointsVisible && pointLegendValues.length > 0 ? (
          <GradientLegend
            colors={pointLegendColors}
            keys={pointLegendValues}
            title={legendTitle}
          />
        ) : (
          <div />
        )}
        {lineVisible ? (
          <DisclaimerModal>
            <div css={disclaimerModalStyles}>
              <p>
                When multiple samples or measurements are available for the same
                day for a single characteristic, the line shown is drawn through
                the average of the results. Multiple samples or measurements for
                a single characteristic may be available for the same day if:
                <ul>
                  <li>
                    Multiple were taken over time that day (e.g. in the morning,
                    afternoon, and at night).
                  </li>
                  <li>
                    Multiple were taken at the same relative time but at varying
                    depths (e.g. the surface, middle or bottom of a lake).
                  </li>
                  <li>
                    Quality control samples or measurements were also taken.
                  </li>
                </ul>
                Quality control data, such as blanks or replicates identified
                via the <i>Activity Type Code</i>, are not included in this
                chart but will still be available in the data download.
                Therefore, the averaging is only performed across depth or time
                within a single day, and for visualization purposes only.
              </p>
            </div>
          </DisclaimerModal>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}

function ChartStatistics({ data, unit }) {
  const domain = getArrayOuter(data).map((d) => d.x);

  const yValues = data.map((d) => d.y);

  const mean = getMean(yValues);
  const range = [Math.min(...yValues), Math.max(...yValues)];
  const median = getMedian(yValues);
  const stdDev = getStdDev(yValues, mean);

  let average = formatNumber(mean);
  if (stdDev) average += ` ${String.fromCharCode(177)} ${formatNumber(stdDev)}`;
  average += ` ${unit}`;

  const [statisticsExpanded, setStatisticsExpanded] = useState(true);

  if (!data.length) return null;

  return (
    <AccordionItem
      allExpanded={true}
      onChange={setStatisticsExpanded}
      status={statisticsExpanded ? 'highlighted' : null}
      title={<h3 css={statisticsHeadingStyles}>Measurement Statistics</h3>}
    >
      <div css={boxSectionStyles}>
        <BoxContent
          rows={[
            {
              label: 'Selected Date Range',
              value:
                `${new Date(domain[0]).toLocaleDateString(
                  'en-us',
                  dateOptions,
                )}` +
                (domain.length > 1
                  ? ` - ${new Date(domain[1]).toLocaleDateString(
                      'en-us',
                      dateOptions,
                    )}`
                  : ''),
            },
            {
              label: 'Number of Measurements Shown',
              value: data.length.toLocaleString(),
            },
            {
              label: 'Average of Values',
              value: average,
            },
            {
              label: 'Median Value',
              value: `${formatNumber(median)} ${unit}`,
            },
            {
              label: 'Minimum Value',
              value: `${range[0].toLocaleString()} ${unit}`,
            },
            {
              label: 'Maximum Value',
              value: `${range[1].toLocaleString()} ${unit}`,
            },
          ]}
          styles={boxContentStyles}
        />
      </div>
    </AccordionItem>
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
            <label
              onClick={(ev) => ev.stopPropagation()}
              css={checkboxTitleStyles}
            >
              <input
                type="checkbox"
                checked={item.selected === Checkbox.checked}
                ref={(input) => {
                  if (input)
                    input.indeterminate =
                      item.selected === Checkbox.indeterminate;
                }}
                onChange={handleCheckbox(id, accessor, dispatch)}
              />
              {id}
            </label>
            <strong className="count">{item.count.toLocaleString()}</strong>
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

function CheckboxRow({ accessor, id, level, state, dispatch }) {
  const item = state[accessor][id];
  return (
    <div css={treeStyles(level, accordionRowStyles)}>
      <label css={checkboxTitleStyles}>
        <input
          type="checkbox"
          checked={item.selected === Checkbox.checked}
          ref={(input) => {
            if (input)
              input.indeterminate = item.selected === Checkbox.indeterminate;
          }}
          onChange={handleCheckbox(id, accessor, dispatch)}
        />
        {id}
      </label>
      <strong className="count">{item.count.toLocaleString()}</strong>
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
  }, [charcs, charcsStatus]);

  return (
    <div css={boxStyles}>
      <h2 css={infoBoxHeadingStyles}>
        Download Data
        <HelpTooltip label="Adjust the slider handles to filter download results by the selected year range, and use the checkboxes to filter the results by individual characteristics and characteristic groups" />
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
        pending={<LoadingSpinner />}
        status={charcsStatus}
      >
        {Object.keys(charcs).length > 0 && (
          <SliderContainer
            max={maxYear}
            min={minYear}
            onChange={(newRange) => setRange(newRange)}
            range={range}
          />
        )}
        <div css={boxSectionStyles}>
          <div css={accordionStyles}>
            <AccordionList
              className="accordion-list"
              displayTitleInFlex={true}
              onExpandCollapse={(newExpanded) => setExpanded(newExpanded)}
              title={
                <label css={checkboxTitleStyles}>
                  <input
                    type="checkbox"
                    checked={checkboxes.all === Checkbox.checked}
                    ref={(input) => {
                      if (input)
                        input.indeterminate =
                          checkboxes.all === Checkbox.indeterminate;
                    }}
                    onChange={(_ev) => checkboxDispatch({ type: 'all' })}
                  />
                  Toggle All
                </label>
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
                    <GlossaryTerm term="Monitoring Measurements">
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
                    id={groupId}
                    level={0}
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
                          id={charcId}
                          level={1}
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
  const triggerRef = useRef(null);

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
    <Tooltip label={`Download ${mimeTypes[fileType].toUpperCase()}`}>
      <button css={fileLinkStyles} onClick={fetchFile} ref={triggerRef}>
        <i className={`fas fa-file-${fileType}`} aria-hidden="true" />
        <span className="sr-only">
          {`Download selected data as ${
            fileType === 'excel' ? 'an' : 'a'
          } ${mimeTypes[fileType].toUpperCase()} file.`}
        </span>
      </button>
    </Tooltip>
  );
}

function InformationSection({ siteId, site, siteStatus }) {
  const rows = [
    {
      label: 'Organization Name',
      value: site.orgName,
    },
    {
      label: 'Organization ID',
      value: site.orgId,
    },
    {
      label: 'County, State',
      value: `${site.county}, ${site.state}`,
    },
    {
      label: 'Water Type',
      value: site.locationType,
    },
    {
      label: 'Latitude/Longitude',
      value: `${toFixedFloat(site.locationLatitude, 5)}, ${toFixedFloat(
        site.locationLongitude,
        5,
      )}`,
    },
    {
      label: 'Total Sample Count',
      value: site.totalSamples?.toLocaleString(),
    },
    {
      label: 'Total Measurement Count',
      value: site.totalMeasurements?.toLocaleString(),
    },
  ];
  rows.forEach((row) => (row.status = siteStatus));

  return (
    <div css={modifiedBoxStyles}>
      <h2 css={locationHeadingStyles}>
        <small>
          <div css={locationRowStyles}>
            <strong>Location Name:</strong>
            <span>
              {siteStatus === 'pending' && <LoadingSpinner />}
              {siteStatus === 'success' && site.locationName}
            </span>
          </div>
          <div css={locationRowStyles}>
            <strong>
              <GlossaryTerm term="Monitoring Site ID">Site ID</GlossaryTerm>:{' '}
            </strong>
            <span>{siteId}</span>
          </div>
        </small>
      </h2>
      <div css={sectionStyles}>
        <BoxContent rows={rows} styles={boxContentStyles} />
      </div>
    </div>
  );
}

function MonitoringReportContent() {
  const { orgId, provider, siteId } = useParams();

  const siteFilter =
    `provider=${encodeURIComponent(provider)}` +
    `&organization=${encodeURIComponent(orgId)}` +
    `&siteid=${encodeURIComponent(siteId)}`;

  useMonitoringLocationsLayers({
    filter: siteFilter,
  });

  const { monitoringLocations, monitoringLocationsStatus } =
    useMonitoringLocations();

  const site = monitoringLocations[0] ?? {};
  const siteStatus =
    monitoringLocationsStatus === 'success' && monitoringLocations.length === 0
      ? 'empty'
      : monitoringLocationsStatus;

  const [characteristics, characteristicsStatus] = useCharacteristics(
    provider,
    orgId,
    siteId,
    site.characteristicsByGroup ?? {},
  );
  const [selectedCharcs, setSelectedCharcs] = useState([]);
  const [nextChartIndexTarget, setNextChartIndexTarget] = useState(null);

  useEffect(() => {
    if (nextChartIndexTarget === null) return;

    const charts = Array.from(document.querySelectorAll('.charc-chart'));
    charts[nextChartIndexTarget].scrollIntoView({ behavior: 'smooth' });
  }, [nextChartIndexTarget]);

  const shiftChartDown = (charcName) => {
    const position = selectedCharcs.indexOf(charcName);
    if (position === -1 || position === selectedCharcs.length - 1) return;
    setSelectedCharcs((prev) => [
      ...prev.slice(0, position),
      prev[position + 1],
      charcName,
      ...prev.slice(position + 2),
    ]);
    setNextChartIndexTarget(position + 1);
  };

  const shiftChartUp = (charcName) => {
    const position = selectedCharcs.indexOf(charcName);
    if (position <= 0) return;
    setSelectedCharcs((prev) => [
      ...prev.slice(0, position - 1),
      charcName,
      prev[position - 1],
      ...prev.slice(position + 1),
    ]);
    setNextChartIndexTarget(position - 1);
  };

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
            css={css`
              ${mapBoxStyles};
              height: ${height - 40}px;
              display: ${mapShown ? 'block' : 'none'};
            `}
          >
            <SiteMapContainer
              layout="narrow"
              site={site}
              siteStatus={siteStatus}
              siteFilter={siteFilter}
              widthRef={widthRef}
            />
          </div>
        )}
      </MapVisibilityButton>
    </>
  );

  const mapWide = (
    <div
      css={css`
        ${mapBoxStyles};
        height: ${mapWidth}px;
        min-height: 400px;
      `}
    >
      <SiteMapContainer
        layout="wide"
        site={site}
        siteFilter={siteFilter}
        siteStatus={siteStatus}
        widthRef={widthRef}
      />
    </div>
  );

  const noSiteView = (
    <Page>
      <NavBar title="Water Monitoring Report" />

      <div css={containerStyles}>
        <div css={pageErrorBoxStyles}>
          <p>
            The monitoring location <em>{siteId}</em> could not be found.
          </p>
        </div>
      </div>
    </Page>
  );

  const content = (
    <Page>
      <NavBar title="Water Monitoring Report" />
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
                    selected={selectedCharcs}
                    setSelected={setSelectedCharcs}
                  />
                  {selectedCharcs.map((charc, i) => (
                    <CharacteristicChartSection
                      charcName={charc}
                      charcsStatus={characteristicsStatus}
                      key={charc}
                      records={characteristics[charc].records}
                      shiftDown={
                        i === selectedCharcs.length - 1
                          ? undefined
                          : shiftChartDown
                      }
                      shiftUp={i === 0 ? undefined : shiftChartUp}
                    />
                  ))}
                </div>
              </div>
            );
          }}
        </WindowSize>
      </div>
    </Page>
  );

  return (
    <StatusContent
      empty={noSiteView}
      failure={<p css={messageBoxStyles(errorBoxStyles)}>{monitoringError}</p>}
      pending={<LoadingSpinner />}
      success={content}
      status={siteStatus}
    />
  );
}

export default function MonitoringReport() {
  const { resetData } = useContext(LocationSearchContext);
  useEffect(() => {
    return function cleanup() {
      resetData(true);
    };
  }, [resetData]);

  return (
    <LayersProvider>
      <MapHighlightProvider>
        <MonitoringReportContent />
      </MapHighlightProvider>
    </LayersProvider>
  );
}

function SliderContainer({ min, max, onChange, range }) {
  if (!min || !max) return <LoadingSpinner />;
  else if (min === max)
    return (
      <div css={sliderContainerStyles}>
        <FlexRow label="Year" value={min} styles={flexRowStyles} />
      </div>
    );

  return (
    <div css={sliderContainerStyles}>
      <DateSlider min={min} max={max} onChange={onChange} range={range} />
    </div>
  );
}

function SiteMap({ layout, siteStatus, widthRef }) {
  const [layersInitialized, setLayersInitialized] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);

  const getSharedLayers = useSharedLayers();
  const { homeWidget, mapView, setBasemap } = useContext(LocationSearchContext);

  const {
    monitoringLocationsLayer,
    orderedLayers: layers,
    updateVisibleLayers,
  } = useLayers();

  useEffect(() => {
    if (!mapView) return;
    mapView.map.basemap = new Basemap({
      portalItem: {
        id: '588f0e0acc514c11bc7c898fed9fc651',
      },
    });

    return function cleanup() {
      mapView.map.basemap = 'gray-vector';
      setBasemap('gray-vector');
    };
  }, [mapView, setBasemap]);

  // Initialize the layers
  useEffect(() => {
    if (!getSharedLayers || layersInitialized) return;

    getSharedLayers();
    updateVisibleLayers({ monitoringLocationsLayer: true });
    setLayersInitialized(true);
  }, [getSharedLayers, layersInitialized, updateVisibleLayers]);

  const { getSignal, abort } = useAbort();

  // Zoom to the location of the site
  useEffect(() => {
    if (!mapLoading || !mapView || !layersInitialized || !homeWidget) return;
    if (siteStatus !== 'success') return;

    if (!monitoringLocationsLayer) return;

    zoomToStation(monitoringLocationsLayer, mapView, getSignal())
      .then(() => {
        // set map zoom and home widget's viewpoint
        mapView.zoom = mapView.zoom - 1;
        homeWidget.viewpoint = new Viewpoint({
          targetGeometry: mapView.extent,
        });
        setMapLoading(false);
      })
      .catch((err) => {
        if (isAbort(err)) return;
        console.error(err);
      });

    return function cleanup() {
      abort();
    };
  }, [
    abort,
    getSignal,
    homeWidget,
    layersInitialized,
    mapLoading,
    mapView,
    monitoringLocationsLayer,
    siteStatus,
  ]);

  // Scrolls to the map when switching layouts
  useEffect(() => {
    const content = document.querySelector(`[data-content="container"]`);
    if (content) {
      let pos = content.getBoundingClientRect();

      window.scrollTo(pos.left + window.scrollX, pos.top + window.scrollY);
    }
  }, [layout]);

  return (
    <div css={mapContainerStyles} data-testid="hmw-site-map" ref={widthRef}>
      <Map layers={layers} />
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
  pending,
  status,
  success = null,
}) {
  switch (status) {
    case 'pending':
      return pending;
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
