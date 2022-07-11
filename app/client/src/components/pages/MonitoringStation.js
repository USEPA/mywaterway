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
  useState,
} from 'react';
import { useParams } from 'react-router-dom';
import { css } from 'styled-components/macro';
// components
import { AccordionList, AccordionItem } from 'components/shared/Accordion';
import DateSlider from 'components/shared/DateSlider';
import MapErrorBoundary from 'components/shared/ErrorBoundary.MapErrorBoundary';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import Map from 'components/shared/Map';
import MapLoadingSpinner from 'components/shared/MapLoadingSpinner';
import MapVisibilityButton from 'components/shared/MapVisibilityButton';
import { errorBoxStyles } from 'components/shared/MessageBoxes';
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
import { FullscreenContext, FullscreenProvider } from 'contexts/Fullscreen';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
import { MapHighlightProvider } from 'contexts/MapHighlight';
// helpers
import { fetchCheck } from 'utils/fetchUtils';
import { useSharedLayers } from 'utils/hooks';
import { getPopupContent, getPopupTitle } from 'utils/mapFunctions';
// styles
import { boxStyles, boxHeadingStyles } from 'components/shared/Box';
import { colors, disclaimerStyles } from 'styles';

/*
 * Styles
 */

const boxSectionStyles = css`
  padding: 0.4375rem 0.875rem;
`;

const charcsTableStyles = css`
  ${boxSectionStyles}
  height: 60vh;
  overflow-y: scroll;
  .rt-table .rt-td {
    margin: auto;
  }
`;

const checkboxCellStyles = css`
  padding-right: 0 !important;
  text-align: center;
`;

const checkboxStyles = css`
  appearance: checkbox;
  transform: scale(1.2);
`;

const containerStyles = css`
  ${splitLayoutContainerStyles};

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

  h3,
  p {
    display: inline-block;
    margin-top: 0;
    margin-bottom: 0;
    line-height: 1.25;
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
`;

const sliderContainerStyles = css`
  align-items: flex-end;
  display: flex;
  gap: 1rem;
  justify-content: center;
  padding-bottom: 10px;
  width: 100%;
`;

const tableStyles = css`
  display: inline-block;
  table-layout: fixed;
  width: 100%;

  thead {
    th {
      padding-top: 0;
    }
    tr {
      border-bottom: 2px solid #dee2e6;
    }
  }

  th,
  td {
    border: none;
    overflow-wrap: normal;
    width: 50%;

    &:first-of-type {
      padding-left: 0;
      width: 2rem;
    }

    &:last-of-type {
      padding-right: 0;
    }
  }
`;

const totalRowStyles = css`
  border-top: 2px solid #dee2e6;
  font-weight: bold;
`;

const pageErrorBoxStyles = css`
  ${errorBoxStyles};
  margin: 1rem;
  text-align: center;
`;

const radioStyles = css`
  display: flex;
  height: 100%;
  width: 100%;
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
    font-size: 0.875em;
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
      margin-right: 1em;
      position: relative;
      text-indent: 0;
      top: -1px;
      vertical-align: middle;
      white-space: pre;
      width: 1em;
    }
  }
`;

/*
 * Helpers
 */

function buildDateFilter(range) {
  if (range === 'all') return '';
  const date = new Date();
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear() - parseInt(range);
  const dateFormatted = `${month}-${day}-${year}`;
  return '&startDateLo=' + dateFormatted;
}

function buildTypeFilter(station, selected) {
  if (selected.length === Object.keys(station.charcGroups).length) {
    return '';
  }
  let selectedTypes = [];
  Object.keys(station.charcGroups).forEach((group) => {
    if (selected.includes(group)) {
      selectedTypes = selectedTypes.concat(station.charcGroups[group]);
    }
  });
  const filter =
    '&characteristicType=' + selectedTypes.join('&characteristicType=');
  return filter;
}

function checkboxReducer(state, action) {
  switch (action.type) {
    case 'all': {
      const newCharcs = {};
      Object.values(state.charcs).forEach((charc) => {
        newCharcs[charc.name] = {
          ...charc,
          selected: 1,
        };
      });
      const newGroups = {};
      Object.values(state.groups).forEach((group) => {
        newGroups[group.name] = {
          ...group,
          selected: 1,
        };
      });
      const newTypes = {};
      Object.values(state.types).forEach((type) => {
        newTypes[type.name] = {
          ...type,
          selected: 1,
        };
      });
      return {
        charcs: newCharcs,
        groups: newGroups,
        types: newTypes,
      };
    }
    case 'none': {
      const newCharcs = {};
      Object.values(state.charcs).forEach((charc) => {
        newCharcs[charc.name] = {
          ...charc,
          selected: 0,
        };
      });
      const newGroups = {};
      Object.values(state.groups).forEach((group) => {
        newGroups[group.name] = {
          ...group,
          selected: 0,
        };
      });
      const newTypes = {};
      Object.values(state.types).forEach((type) => {
        newTypes[type.name] = {
          ...type,
          selected: 0,
        };
      });
      return {
        charcs: newCharcs,
        groups: newGroups,
        types: newTypes,
      };
    }
    case 'load': {
      const newCharcs = {};
      const newGroups = {};
      const newTypes = {};
      const { data } = action.payload;
      Object.values(data).forEach((group) => {
        newGroups[group.name] = {
          count: group.count,
          id: group.name,
          selected: 1,
          types: Object.keys(group.types),
        };
        Object.values(group.types).forEach((type) => {
          newTypes[type.name] = {
            charcs: Object.keys(type.charcs),
            count: type.count,
            group,
            id: type.name,
            selected: 1,
          };
          Object.values(type.charcs).forEach((charc) => {
            newCharcs[charc.name] = {
              count: charc.count,
              group,
              id: charc.name,
              selected: 1,
              type,
            };
          });
        });
      });
      return {
        charcs: newCharcs,
        groups: newGroups,
        types: newTypes,
      };
    }
    case 'group': {
      const { id: groupId } = action.payload;
      const group = state.groups[groupId];
      const newSelected = group.selected === 0 ? 1 : 0;
      const newTypes = { ...state.types };
      Object.values(newTypes).forEach((type) => {
        if (type.group === groupId) {
          newTypes[type.id] = {
            ...type,
            selected: newSelected,
          };
        }
      });
      const newCharcs = { ...state.charcs };
      Object.values(newCharcs).forEach((charc) => {
        if (charc.group === groupId) {
          newCharcs[charc.id] = {
            ...charc,
            selected: newSelected,
          };
        }
      });
      return {
        charcs: newCharcs,
        groups: {
          ...state.groups,
          [groupId]: {
            ...group,
            selected: newSelected,
          },
        },
        types: newTypes,
      };
    }
    case 'type': {
      const { id: typeId } = action.payload;
      const type = state.types[typeId];
      const newSelected = type.selected === 0 ? 1 : 0;
      const newCharcs = { ...state.charcs };
      Object.values(newCharcs).forEach((charc) => {
        if (charc.type === typeId) {
          newCharcs[charc.id] = {
            ...charc,
            selected: newSelected,
          };
        }
      });
      const newTypes = {
        ...state.types,
        [typeId]: {
          ...type,
          selected: newSelected,
        },
      };
      const newGroups = { ...state.groups };
      let groupTypesSelected = 0;
      const typeIds = newGroups[type.group].types;
      typeIds.forEach((id) => {
        if (newTypes[id].selected) groupTypesSelected++;
      });
      const groupSelected =
        groupTypesSelected === 0
          ? 0
          : groupTypesSelected === typeIds.length
          ? 1
          : 2;
      newGroups[type.group] = {
        ...newGroups[type.group],
        selected: groupSelected,
      };
      return {
        charcs: newCharcs,
        groups: newGroups,
        types: newTypes,
      };
    }
    case 'characteristic': {
      const { id: charcId } = action.payload;
      const charc = state.charcs[charcId];
      const newSelected = charc.selected === 0 ? 1 : 0;
      const newCharcs = {
        ...state.charcs,
        [charcId]: {
          ...charc,
          selected: newSelected,
        },
      };
      const newTypes = { ...state.types };
      let typeCharcsSelected = 0;
      const charcIds = newTypes[charc.type].charcs;
      charcIds.forEach((id) => {
        if (newCharcs[id].selected) typeCharcsSelected++;
      });
      const typeSelected =
        typeCharcsSelected === 0
          ? 0
          : typeCharcsSelected === charcIds.length
          ? 1
          : 2;
      newTypes[charc.type] = {
        ...newTypes[charc.type],
        selected: typeSelected,
      };
      const newGroups = { ...state.groups };
      let groupTypesSelected = 0;
      const typeIds = newGroups[charc.group].types;
      typeIds.forEach((id) => {
        if (newTypes[id].selected) groupTypesSelected++;
      });
      const groupSelected =
        groupTypesSelected === 0
          ? 0
          : groupTypesSelected === typeIds.length
          ? 1
          : 2;
      newGroups[charc.group] = {
        ...newGroups[charc.group],
        selected: groupSelected,
      };
      return {
        charcs: newCharcs,
        groups: newGroups,
        types: newTypes,
      };
    }
    default:
      throw new Error('Invalid action type');
  }
}

async function fetchStationDetails(url, setData, setStatus) {
  const res = await fetchCheck(url);
  if (res.features.length < 1) {
    setStatus('success');
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
      stationTotalsByCategory: JSON.stringify(station.charcTypeCounts),
    },
  });
  const featureSet = await layer.queryFeatures();
  const editResults = await layer.applyEdits({
    deleteFeatures: featureSet.features,
    addFeatures: [newFeature],
  });
  return editResults?.addFeatureResults?.length ? true : false;
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
  return 'Other';
}

const initialCheckboxes = {
  groups: {},
  types: {},
  charcs: {},
};

function isEmpty(obj) {
  for (var _x in obj) {
    return false;
  }
  return true;
}

async function getZoomParams(layer) {
  const featureSet = await layer.queryFeatures();
  const graphics = featureSet.features;
  if (graphics.length === 1 && graphics[0].geometry.type === 'point') {
    // handle zooming to a single point graphic
    const zoomParams = {
      target: graphics[0],
      zoom: 16, // set zoom 1 higher since it gets decremented later
    };
    return zoomParams;
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
  const result = {};
  // structure characteristcs by group, then type
  Object.entries(charcs).forEach(([charc, data]) => {
    const { group, type, totalCount } = data;
    if (!result[group]) {
      result[group] = {
        name: group,
        types: {},
      };
    }
    if (!result[group].types[type]) {
      result[group].types[type] = {
        charcs: {},
        name: type,
      };
    }
    result[group].types[type].charcs[charc] = {
      count: totalCount,
      name: charc,
    };
  });
  updateCounts(result, range);
  return result;
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
    {dataStatus === 'success' && <p>&nbsp; {value}</p>}
  </div>
);

const sectionRowInline = (label, value, dataStatus = 'success') => {
  return sectionRow(label, value, inlineBoxSectionStyles, dataStatus);
};

function updateCounts(groups, range) {
  Object.values(groups).forEach((group) => {
    let countByGroup = 0;
    Object.values(group.types).forEach((type) => {
      let countByType = 0;
      Object.values(type.charcs).forEach((charc) => {
        if (range) {
          let countByCharc = 0;
          charc.records.forEach((record) => {
            if (record.year >= range[0] && record.year <= range[1]) {
              countByCharc += 1;
            }
          });
          charc.count = countByCharc;
        }
        countByType += charc.count;
      });
      type.count = countByType;
      countByGroup += type.count;
    });
    group.count = countByGroup;
  });
}

function useCharacteristics(provider, orgId, siteId) {
  const services = useServicesContext();

  // charcs => characteristics
  const [charcs, setCharcs] = useState({});
  const [status, setStatus] = useState('idle');

  const structureRecords = useCallback(
    (records) => {
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
          unit: record['ResultMeasure/MeasureUnitCode'] || null,
        });
      });
      setCharcs(recordsByCharc);
      setStatus('success');
    },
    [setCharcs, setStatus],
  );

  useEffect(() => {
    if (status !== 'idle' || services.status !== 'success') return;
    setStatus('fetching');
    const url =
      `${services.data.waterQualityPortal.resultSearch}` +
      `&mimeType=csv&zip=no&dataProfile=narrowResult` +
      `&providers=${provider}&organization=${orgId}&siteid=${siteId}`;
    try {
      fetchParseCsv(url).then((results) => structureRecords(results.data));
    } catch (err) {
      setStatus('failure');
      console.error('Papa Parse error');
    }
  }, [orgId, provider, services, siteId, status, structureRecords]);

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
 * Components
 */

function CharacteristicsTable({ charcs, charcsStatus }) {
  const [selected, setSelected] = useState(null);
  const tableData = useMemo(() => {
    return Object.values(charcs)
      .map((charc) => {
        const selector = (
          <div css={radioStyles}>
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
        return {
          count: charc.count,
          group: charc.group,
          select: selector,
          name: charc.name,
          type: charc.type,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [charcs, selected]);

  return (
    <div css={boxStyles}>
      <h2 css={infoBoxHeadingStyles}>Characteristics</h2>
      <div css={charcsTableStyles}>
        {charcsStatus === 'fetching' && <LoadingSpinner />}
        {charcsStatus === 'success' &&
          (isEmpty(charcs) ? (
            <p>No records found for this location.</p>
          ) : (
            <ReactTable
              data={tableData}
              placeholder="Filter..."
              striped={false}
              getColumns={(tableWidth) => {
                const columnWidth = tableWidth / 3 - 7;
                const halfColumnWidth = tableWidth / 6 - 7;

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
                    Header: 'Count',
                    accessor: 'count',
                    width: halfColumnWidth,
                    filterable: true,
                  },
                ];
              }}
            />
          ))}
      </div>
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

  const services = useServicesContext();

  const downloadUrl =
    stationStatus === 'success' &&
    `${services.data.waterQualityPortal.resultSearch}zip=no&siteid=` +
      `${station.siteId}&providers=${station.providerName}` +
      `${buildTypeFilter(station, selected)}` +
      `${buildDateFilter(range)}`;

  const portalUrl =
    stationStatus === 'success' &&
    `${services.data.waterQualityPortal.userInterface}#` +
      `&mimeType=xlsx&dataProfile=resultPhysChem` +
      `&siteid=${station.siteId}` +
      `&providers=${station.providerName}` +
      `${buildTypeFilter(station, selected)}` +
      `${buildDateFilter(range)}`;

  /* const toggleGroup = (group) => {
    const newSelected = selected.includes(group)
      ? selected.filter((s) => s !== group)
      : [...selected, group];
    setSelected(newSelected);

    if (newSelected.length === Object.keys(station.charcGroups).length) {
      setAllChecked(1);
    } else if (newSelected.length === 0) {
      setAllChecked(0);
    } else {
      setAllChecked(2);
    }
  }; */

  /* const toggleAllChecked = () => {
    let selected = allChecked === 0 ? Object.keys(station.charcGroups) : [];
    setSelected(selected);
    setAllChecked(allChecked === 0 ? 1 : 0);
  }; */

  useEffect(() => {
    if (charcsStatus !== 'success') return;
    const data = parseCharcs(charcs);
    checkboxDispatch({ type: 'load', data: data });
  }, [charcs, charcsStatus]);

  useEffect(() => {
    if (charcsStatus !== 'success') return;
    if (minYear || maxYear) return;
    let min = 0;
    let max = Infinity;
    Object.values(charcs).forEach((charc) => {
      const { records } = charc;
      records.forEach((record) => {
        if (record.year < min) min = record.year;
        if (record.year > max) max = record.year;
      });
    });
    setMinYear(min);
    setMaxYear(max);
    setRange([min, max]);
  }, [charcs, charcsStatus, maxYear, minYear]);

  /* useEffect(() => {
    if (stationStatus !== 'success') return;
    const newTotalMeasurements = selected.reduce(
      (a, b) => a + station.charcGroupCounts[b],
      0,
    );
    setTotalMeasurements(newTotalMeasurements);
  }, [selected, station.charcGroupCounts, stationStatus]); */

  return (
    <div css={boxStyles}>
      <h2 css={boxHeadingStyles}>Download Station Data</h2>
      {stationStatus === 'fetching' ? (
        <LoadingSpinner />
      ) : Object.keys(station.charcGroupCounts).length === 0 ? (
        <p>No data available for this monitoring location.</p>
      ) : (
        <>
          <div css={sliderContainerStyles}>
            {!range ? (
              <LoadingSpinner />
            ) : (
              <DateSlider
                bounds={[minYear, maxYear]}
                disabled={!Boolean(Object.keys(charcs).length)}
                onChange={(newRange) => setRange(newRange)}
              />
            )}
          </div>
          <div css={flexboxSectionStyles}>
            <h3>Characteristics Groups:</h3>
            {charcsStatus === 'idle' || charcsStatus === 'fetching' ? (
              <LoadingSpinner />
            ) : charcsStatus === 'failure' ? (
              <div css={modifiedErrorBoxStyles}>
                <p>{monitoringError}</p>
              </div>
            ) : charcsStatus === 'success' ? (
              <AccordionList>
                {Object.keys(station.charcGroups)
                  .sort((a, b) => a.localeCompare(b))
                  .map((group) => (
                    <AccordionItem
                      key={group}
                      title={
                        <span>
                          <input type="checkbox" />
                        </span>
                      }
                    ></AccordionItem>
                  ))}
              </AccordionList>
            ) : null}
            <table css={tableStyles} className="table">
              <thead>
                <tr>
                  <th css={checkboxCellStyles}>
                    <input
                      css={checkboxStyles}
                      type="checkbox"
                      className="checkbox"
                      checked={allChecked === 1}
                      ref={(input) => {
                        if (input) input.indeterminate = allChecked === 2;
                      }}
                      // onChange={toggleAllChecked}
                    />
                  </th>
                  <th>
                    <GlossaryTerm term="Characteristic Group">
                      Character&shy;istic Group
                    </GlossaryTerm>
                  </th>
                  <th>
                    <GlossaryTerm term="Monitoring Measurements">
                      Number of Measurements
                    </GlossaryTerm>
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(station.charcGroups).map((group, index) => {
                  return station.charcGroups[group].length === 0 ? null : (
                    <tr key={index}>
                      <td css={checkboxCellStyles}>
                        <input
                          css={checkboxStyles}
                          type="checkbox"
                          className="checkbox"
                          // checked={selected.includes(group) || allChecked === 1}
                          // onChange={() => toggleGroup(group)}
                        />
                      </td>
                      <td>{group}</td>
                      <td>{station.charcGroupCounts[group]}</td>
                    </tr>
                  );
                })}
                <tr css={totalRowStyles}>
                  <td></td>
                  <td>Total</td>
                  <td>{Number(totalMeasurements).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
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
                <a href={`${downloadUrl}&mimeType=xlsx`}>
                  <i className="fas fa-file-excel" aria-hidden="true" />
                </a>
                &nbsp;&nbsp;
                <a href={`${downloadUrl}&mimeType=csv`}>
                  <i className="fas fa-file-csv" aria-hidden="true" />
                </a>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
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
    </div>
  );
}

function MonitoringStation({ fullscreen }) {
  const { orgId, provider, siteId } = useParams();
  const [station, stationStatus] = useStationDetails(provider, orgId, siteId);
  const [characteristics, characteristicsStatus] = useCharacteristics(
    provider,
    orgId,
    siteId,
  );
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
      id="waterbody-report-map"
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
      <NavBar title="Plan Summary" />

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
              <div css={splitLayoutColumnsStyles}>
                <div css={splitLayoutColumnStyles}>
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
                <div css={splitLayoutColumnStyles}>
                  <CharacteristicsTable
                    charcs={characteristics}
                    charcsStatus={characteristicsStatus}
                  />
                </div>
              </div>
            );
          }}
        </WindowSize>
      </div>
    </Page>
  );

  switch (stationStatus) {
    case 'success':
      return isEmpty(station)
        ? noStationView
        : fullscreen.fullscreenActive
        ? fullScreenView
        : twoColumnView;
    case 'failure':
      // TODO: add error box
      return null;
    default:
      return fullscreen.fullscreenActive ? fullScreenView : twoColumnView;
  }
}

function MonitoringStationContainer(props) {
  return (
    <MapHighlightProvider>
      <FullscreenProvider>
        <FullscreenContext.Consumer>
          {(fullscreen) => (
            <MonitoringStation fullscreen={fullscreen} {...props} />
          )}
        </FullscreenContext.Consumer>
      </FullscreenProvider>
    </MapHighlightProvider>
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
          { name: 'stationTotalsByCategory', type: 'string' },
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
            style: 'square',
            color: colors.lightPurple(),
            outline: {
              width: 0.75,
            },
          },
        },
        popupTemplate: {
          outFields: ['*'],
          title: (feature) => getPopupTitle(feature.graphic.attributes),
          content: (feature) =>
            getPopupContent({ feature: feature.graphic, services }),
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
    drawStation(station, monitoringLocationsLayer, services).then((result) => {
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
      <StationMap {...props} />
    </MapErrorBoundary>
  );
}

export default MonitoringStationContainer;
