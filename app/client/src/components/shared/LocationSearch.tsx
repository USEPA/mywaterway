/** @jsxImportSource @emotion/react */

import {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { css } from '@emotion/react';
import { useNavigate } from 'react-router-dom';
import Collection from '@arcgis/core/core/Collection.js';
import Error from '@arcgis/core/core/Error.js';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import * as locator from '@arcgis/core/rest/locator';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import Point from '@arcgis/core/geometry/Point';
import Search from '@arcgis/core/widgets/Search';
import LocatorSearchSource from '@arcgis/core/widgets/Search/LocatorSearchSource';
import LayerSearchSource from '@arcgis/core/widgets/Search/LayerSearchSource';
import SpatialReference from '@arcgis/core/geometry/SpatialReference';
// components
import { errorBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import { useConfigFilesState } from 'contexts/ConfigFiles';
import { LocationSearchContext } from 'contexts/locationSearch';
// helpers
import { fetchCheck, fetchPost } from 'utils/fetchUtils';
import { useKeyPress } from 'utils/hooks';
import { containsScriptTag, indicesOf, isClick, isHuc12 } from 'utils/utils';
import { splitSuggestedSearch } from 'utils/mapFunctions';
// styles
import { colors, fonts } from 'styles/index';
// errors
import {
  invalidSearchError,
  webServiceErrorMessage,
} from 'config/errorMessages';
// types
import type { ReactElement, ReactNode } from 'react';
import { MonitoringLocationsData } from 'types';

// --- utils ---

// Finds the source of the suggestion
function findSource(
  name: string,
  suggestions: __esri.SearchResultsSuggestions[],
) {
  return suggestions.find((item) => item.source.name === name) ?? null;
}

function getGroupTitle(
  suggestions: __esri.SearchResultsSuggestions,
  groups: SourceGroup[],
) {
  const group = groups
    .filter((g) => g.name !== 'All')
    .find((g) => {
      return g.sources.some((s) => s.name === suggestions.source.name);
    });
  return group ? (
    <>
      <div>{group.name}</div>
      {group.menuHeaderExtra && (
        <div>
          <small>{group.menuHeaderExtra}</small>
        </div>
      )}
    </>
  ) : (
    <></>
  );
}

// Splits the provided text by the searchString in a case insensitive way.
function getHighlightParts(text: string, searchString: string) {
  const indices = indicesOf(text, searchString);

  // build an array of the string split up by the searchString that includes
  // the searchString.
  const parts = [];
  let endIndex = 0;
  let remainder = text;
  indices.forEach((startIndex) => {
    // skip if the indices are the same (i.e. results in empty string)
    if (endIndex !== startIndex) {
      // add in text up to the start index
      parts.push(text.substring(endIndex, startIndex));
    }

    // add in the search part of the text
    endIndex = startIndex + searchString.length;
    parts.push(text.substring(startIndex, endIndex));

    // keep track of leftover text
    remainder = text.substring(endIndex);
  });

  // add in remainder text if applicable
  if (remainder) parts.push(remainder);

  return parts;
}

function pickSourcesHof(sources: LocationSearchSource[]) {
  return (names: string[]) => {
    return sources.filter((source) => names.includes(source.name));
  };
}

// --- styles ---

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles};
  margin-bottom: 1em;
  text-align: center;
`;

const labelStyles = css`
  margin-bottom: 0;
`;

const formStyles = css`
  display: flex;
  flex-flow: row wrap;
  align-items: center;
`;

const buttonStyles = css`
  margin-top: 1em;
  margin-bottom: 0;
  font-size: 0.875em;

  @media (min-width: 480px) {
    font-size: 0.9375em;
  }
`;

const textStyles = css`
  margin: 1em 0.5em 0;
  padding: 0 !important;
  font-size: 0.875em;
  font-weight: bold;
`;

const searchBoxStyles = css`
  margin-top: 1em;
  width: 100%;
  font-size: 0.9375em;

  @media (min-width: 480px) {
    flex: 1;
    margin-right: 0.5em;
  }

  .esri-search__container {
    border: 1px solid ${colors.grayc};
    border-radius: 4px;
  }

  .esri-search__form {
    display: flex;
    flex: 1 0;
    align-items: center;
  }

  .esri-search__input {
    box-shadow: none;
    border: none;
    width: 100%;
    margin: 0;
    display: block;
  }

  .esri-search__input {
    border-radius: 4px;
    padding: 0.625rem;
    color: ${colors.gray4};
    font-family: ${fonts.primary};
    font-size: 0.9375em;
    width: 100%;
  }

  .esri-search__input-container {
    display: flex;
    flex: 2 0;
    align-items: stretch;
  }

  .esri-search__input::placeholder {
    color: ${colors.gray6};
  }

  .esri-search__clear-button {
    border-radius: 4px;
    height: 36px;
    width: 36px;
  }

  .esri-search__submit-button {
    display: none;
  }

  .esri-icon-search::before {
    content: '\f002';
    font-family: 'Font Awesome 5 Free', sans-serif;
    color: rgb(204, 204, 204);
    font-weight: 900;
  }

  .esri-menu {
    z-index: 800;
  }

  .esri-menu__list-item::hover {
    background-color: #f3f3f3;
  }

  .esri-menu__list-item-active {
    background-color: #e2f1fb;
  }

  .esri-search__sources-button {
    border-top-left-radius: 4px;
    border-bottom-left-radius: 4px;
    border-right: 1px solid #6e6e6e4d;
    height: 36px;
  }

  .esri-search--show-suggestions .esri-search__suggestions-menu,
  .esri-search--sources .esri-search__sources-menu {
    visibility: visible;
    max-height: 300px;
    animation: 0.25s ease-out esri-fade-in;
    overflow: auto;
  }
`;

// --- types ---
type FlattenedResult = __esri.SuggestResult & {
  source: LocationSearchSource;
  sourceIndex: number;
};

type LocationSearchSource =
  | __esri.LayerSearchSource
  | __esri.LocatorSearchSource;

type MonitoringLocationCodesResult = {
  codes: Array<{
    desc: string;
    value: string;
  }>;
};

type WaterbodyCodesResult = Array<{
  assessmentUnitId: string;
  assessmentUnitName: string;
  organizationId: string;
}>;

type SourceGroup = {
  name: string;
  placeholder: string;
  sources: LocationSearchSource[];
  menuHeaderExtra?: string;
};

type SourceGroups = {
  [key in
    | 'all'
    | 'arcGis'
    | 'monitoring'
    | 'tribal'
    | 'waterbody'
    | 'watershed']: SourceGroup;
};

// --- constants ---

// Source Names
const ARC_GIS = 'ArcGIS';
const ALASKA_NATIVE_VILLAGES = 'EPA Tribal Areas - Alaska Native Villages';
const AMERICAN_INDIAN_RESERVATIONS =
  'EPA Tribal Areas - American Indian Reservations';
const AMERICAN_INDIAN_OFF_RESERVATION_TRUST_LANDS =
  'EPA Tribal Areas - American Indian Off-Reservation Trust Lands';
const AMERICAN_INDIAN_OKLAHOMA_STATISTICAL_AREAS =
  'EPA Tribal Areas - American Indian Oklahoma Statistical Areas';
const VIRGINIA_FEDERALLY_RECOGNIZED_TRIBES =
  'Virginia Federally Recognized Tribes';
const WATERSHEDS = 'Watersheds';
const MONITORING_LOCATIONS = 'Monitoring Locations';
const WATERBODIES = 'Waterbodies';

// --- defaults ---
const initialWebserviceErrorMessages: Record<string, string> = {
  [MONITORING_LOCATIONS]: '',
  [WATERBODIES]: '',
};

// --- components ---

type Props = {
  route: string;
  label: ReactNode;
};

function LocationSearch({ route, label }: Readonly<Props>) {
  const navigate = useNavigate();

  const services = useConfigFilesState().data.services;
  const searchBox = useRef(null);
  const downPress = useKeyPress('ArrowDown', searchBox);
  const upPress = useKeyPress('ArrowUp', searchBox);
  const enterPress = useKeyPress('Enter', searchBox);
  const sourceList = useRef(null);
  const sourceDownPress = useKeyPress('ArrowDown', sourceList);
  const sourceUpPress = useKeyPress('ArrowUp', sourceList);
  const sourceEnterPress = useKeyPress('Enter', sourceList);
  const clearButton = useRef(null);
  const clearEnterPress = useKeyPress('Enter', clearButton);
  const { searchText, watershed, huc12 } = useContext(LocationSearchContext);
  const [searchWidget, setSearchWidget] = useState<Search | null>(null);

  // Store the waterbody suggestions to avoid a second fetch.
  const waterbodySuggestions = useRef<WaterbodyCodesResult | null>(null);

  const allPlaceholder = 'Search by address, zip code, or place...';

  const allSources = useMemo<LocationSearchSource[]>(
    () => [
      new LocatorSearchSource({
        name: ARC_GIS,
        url: services.locatorUrl,
        countryCode: 'USA',
        outFields: [
          'Loc_name',
          'City',
          'Place_addr',
          'Region',
          'RegionAbbr',
          'Country',
          'Addr_type',
        ],
      }),
      new LayerSearchSource({
        name: ALASKA_NATIVE_VILLAGES,
        layer: new FeatureLayer({
          url: `${services.tribal}/1`,
          listMode: 'hide',
        }) as __esri.Layer,
        searchFields: ['TRIBE_NAME'],
        suggestionTemplate: '{TRIBE_NAME}',
        exactMatch: false,
        outFields: ['TRIBE_NAME'],
      }),
      new LayerSearchSource({
        name: AMERICAN_INDIAN_RESERVATIONS,
        layer: new FeatureLayer({
          url: `${services.tribal}/2`,
          listMode: 'hide',
        }) as __esri.Layer,
        searchFields: ['TRIBE_NAME'],
        suggestionTemplate: '{TRIBE_NAME}',
        exactMatch: false,
        outFields: ['TRIBE_NAME'],
      }),
      new LayerSearchSource({
        name: AMERICAN_INDIAN_OFF_RESERVATION_TRUST_LANDS,
        layer: new FeatureLayer({
          url: `${services.tribal}/3`,
          listMode: 'hide',
        }) as __esri.Layer,
        searchFields: ['TRIBE_NAME'],
        suggestionTemplate: '{TRIBE_NAME}',
        exactMatch: false,
        outFields: ['TRIBE_NAME'],
      }),
      new LayerSearchSource({
        name: AMERICAN_INDIAN_OKLAHOMA_STATISTICAL_AREAS,
        layer: new FeatureLayer({
          url: `${services.tribal}/4`,
          listMode: 'hide',
        }) as __esri.Layer,
        searchFields: ['TRIBE_NAME'],
        suggestionTemplate: '{TRIBE_NAME}',
        exactMatch: false,
        outFields: ['TRIBE_NAME'],
      }),
      new LayerSearchSource({
        name: VIRGINIA_FEDERALLY_RECOGNIZED_TRIBES,
        layer: new FeatureLayer({
          url: `${services.tribal}/5`,
          listMode: 'hide',
        }) as __esri.Layer,
        searchFields: ['TRIBE_NAME'],
        suggestionTemplate: '{TRIBE_NAME}',
        exactMatch: false,
        outFields: ['TRIBE_NAME'],
      }),
      new LayerSearchSource({
        name: WATERSHEDS,
        layer: new FeatureLayer({
          url: services.wbdUnconstrained,
          listMode: 'hide',
        }) as __esri.Layer,
        searchFields: ['name', 'huc12'],
        suggestionTemplate: '{name} ({huc12})',
        exactMatch: false,
        outFields: ['name', 'huc12'],
      }),
      new LocatorSearchSource({
        name: MONITORING_LOCATIONS,
        getSuggestions: async ({ maxSuggestions, suggestTerm }) => {
          setWebserviceErrorMessages((prev) => ({
            ...prev,
            [MONITORING_LOCATIONS]: '',
          }));
          try {
            const res = await fetchCheck(
              `${services.waterQualityPortal.domainValues}/monitoringlocation?text=${suggestTerm}&mimeType=json&pagesize=${maxSuggestions}`,
            );
            const sourceIndex = (
              searchWidget?.sources as Collection<LocationSearchSource>
            ).findIndex((source) => source.name === MONITORING_LOCATIONS);
            if (!Number.isFinite(sourceIndex)) {
              console.error('Source "Monitoring Locations" not found');
              return [];
            }

            return (res as MonitoringLocationCodesResult).codes.map(
              ({ desc, value }) => ({
                key: value,
                text: `${desc ?? value} (${value})`,
                sourceIndex,
              }),
            );
          } catch (_err) {
            setWebserviceErrorMessages((prev) => ({
              ...prev,
              [MONITORING_LOCATIONS]: webServiceErrorMessage,
            }));
          }
        },
      }),
      new LocatorSearchSource({
        name: WATERBODIES,
        getSuggestions: async ({ maxSuggestions, suggestTerm }) => {
          setWebserviceErrorMessages((prev) => ({
            ...prev,
            [WATERBODIES]: '',
          }));
          try {
            const res = (await fetchPost(
              `${services.expertQuery.attains}/assessmentUnits/values/assessmentUnitId`,
              {
                additionalColumns: ['assessmentUnitName', 'organizationId'],
                direction: 'asc',
                limit: maxSuggestions,
                text: suggestTerm,
              },
              {
                'Content-Type': 'application/json',
                'X-Api-Key': services.expertQuery.apiKey,
              },
            )) as WaterbodyCodesResult;
            const sourceIndex = (
              searchWidget?.sources as Collection<LocationSearchSource>
            ).findIndex((source) => source.name === WATERBODIES);
            if (!Number.isFinite(sourceIndex)) {
              console.error('Source "Waterbodies" not found');
              return [];
            }

            waterbodySuggestions.current = res;

            return res.map(({ assessmentUnitId, assessmentUnitName }) => ({
              key: assessmentUnitId,
              text: `${assessmentUnitName} (${assessmentUnitId})`,
              sourceIndex,
            }));
          } catch (_err) {
            setWebserviceErrorMessages((prev) => ({
              ...prev,
              [WATERBODIES]: webServiceErrorMessage,
            }));
          }
        },
      }),
    ],
    [searchWidget, services],
  );

  const sourceGroups: SourceGroups = useMemo(() => {
    const pickSources = pickSourcesHof(allSources);
    return {
      all: {
        name: 'All',
        placeholder: allPlaceholder,
        sources: allSources,
      },
      arcGis: {
        name: 'Address, zip code, and place search',
        placeholder: allPlaceholder,
        sources: pickSources([ARC_GIS]),
      },
      tribal: {
        name: 'EPA Tribal Areas',
        placeholder: 'Search EPA tribal areas...',
        sources: pickSources([
          ALASKA_NATIVE_VILLAGES,
          AMERICAN_INDIAN_RESERVATIONS,
          AMERICAN_INDIAN_OFF_RESERVATION_TRUST_LANDS,
          AMERICAN_INDIAN_OKLAHOMA_STATISTICAL_AREAS,
          VIRGINIA_FEDERALLY_RECOGNIZED_TRIBES,
        ]),
      },
      watershed: {
        name: 'Watershed',
        placeholder: 'Search watersheds...',
        sources: pickSources([WATERSHEDS]),
      },
      monitoring: {
        name: 'Monitoring Location',
        menuHeaderExtra:
          '(Below items open into the Monitoring Report page in a new browser tab)',
        placeholder: 'Search monitoring locations...',
        sources: pickSources([MONITORING_LOCATIONS]),
      },
      waterbody: {
        name: 'Waterbody',
        menuHeaderExtra:
          '(Below items open into the Waterbody Report page in a new browser tab)',
        placeholder: 'Search waterbodies...',
        sources: pickSources([WATERBODIES]),
      },
    };
  }, [allSources]);

  // geolocating state for updating the 'Use My Location' button
  const [geolocating, setGeolocating] = useState(false);

  // geolocationError state for disabling the 'Use My Location' button
  const [geolocationError, setGeolocationError] = useState(false);

  // initialize inputText from searchText context
  const [inputText, setInputText] = useState(searchText);

  // update inputText whenever searchText changes (i.e. form onSubmit)
  useEffect(() => setInputText(searchText), [searchText]);

  const [errorMessage, setErrorMessage] = useState('');
  const [webserviceErrorMessages, setWebserviceErrorMessages] = useState(
    initialWebserviceErrorMessages,
  );

  // Initialize the esri search widget
  const [suggestions, setSuggestions] = useState<
    __esri.SearchResultsSuggestions[]
  >([]);
  useEffect(() => {
    if (searchWidget) return;

    const search = new Search({
      allPlaceholder,
      includeDefaultSources: false,
      locationEnabled: false,
      label: 'Search',
      sources: allSources,
    });

    // create a watcher for the input text
    reactiveUtils.watch(
      () => search.searchTerm,
      () => {
        setInputText(search.searchTerm);
      },
    );

    // create a watcher for the suggestions based on search input
    reactiveUtils.watch(
      () => search.suggestions,
      () => {
        const suggestions = search.suggestions;
        setSuggestions(suggestions ?? []);
      },
    );

    setSearchWidget(search);
  }, [searchWidget, services, searchText, allSources]);

  // Initialize the esri search widget value with the search text.
  useEffect(() => {
    if (!searchWidget) return;

    // Remove coordinates if search text was from non-esri suggestions
    searchWidget.searchTerm = splitSuggestedSearch(searchText).searchPart;
  }, [searchWidget, searchText]);

  // Updates the search widget sources whenever the user selects a source.
  const [sourcesVisible, setSourcesVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SourceGroup>(
    sourceGroups.all,
  );

  // Reset the web service error messages when the selected group changes.
  const [prevSelectedGroup, setPrevSelectedGroup] =
    useState<SourceGroup>(selectedGroup);
  if (prevSelectedGroup !== selectedGroup) {
    setPrevSelectedGroup(selectedGroup);
    setWebserviceErrorMessages(initialWebserviceErrorMessages);
  }

  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  useEffect(() => {
    if (!searchWidget) return;

    const sources =
      selectedGroup.name === 'All' ? allSources : selectedGroup.sources;
    searchWidget.sources = sources;

    if (searchWidget.searchTerm) {
      searchWidget.suggest();
    }
  }, [allSources, searchWidget, selectedGroup]);

  // Filter the suggestions down to just sources that have results and combine grouped sources.
  const [filteredSuggestions, setFilteredSuggestions] = useState<
    __esri.SearchResultsSuggestions[]
  >([]);
  const [prevSuggestions, setPrevSuggestions] = useState<
    __esri.SearchResultsSuggestions[]
  >([]);
  if (prevSuggestions !== suggestions) {
    setPrevSuggestions(suggestions);
    const newFilteredSuggestions = Object.entries(sourceGroups)
      .filter(([key]) => key !== 'all')
      .reduce<__esri.SearchResultsSuggestions[]>((acc1, [_key, group]) => {
        // Combine group sources into a single source, i.e. combine the 3 tribes sources into one source.
        const { results, source, sourceIndex, error } = group.sources.reduce<{
          results: __esri.SuggestResult[];
          source: LocationSearchSource;
          sourceIndex: number;
          error?: Error;
        }>(
          (acc2, source) => {
            // If the source has an error message, return an empty results array with the error message.
            if (
              ['All', group.name].includes(selectedGroup.name) &&
              [MONITORING_LOCATIONS, WATERBODIES].includes(source.name) &&
              webserviceErrorMessages[source.name]
            ) {
              return {
                results: [],
                source,
                sourceIndex: -1,
                error: new Error(
                  'WebServiceError',
                  webserviceErrorMessages[source.name],
                ),
              };
            }

            const sug = findSource(source.name, suggestions);
            if (!sug) return acc2;

            if (sug.results) {
              return {
                results: [...acc2.results, ...sug.results],
                source,
                sourceIndex: Math.min(acc2.sourceIndex, sug.sourceIndex),
              };
            }

            return acc2;
          },
          {
            results: [],
            source: new LocatorSearchSource(),
            sourceIndex: Infinity,
            error: undefined,
          },
        );

        if (error || (source && results.length > 0)) {
          return [...acc1, { sourceIndex, source, results, error }];
        }

        return acc1;
      }, []);
    setFilteredSuggestions(newFilteredSuggestions);
  }

  const resultsFlat = useMemo(() => {
    return filteredSuggestions.reduce<Array<FlattenedResult>>((acc, sug) => {
      sug.results?.forEach((result) => {
        acc.push({
          ...result,
          source: sug.source,
          sourceIndex: sug.sourceIndex,
        });
      });
      return acc;
    }, []);
  }, [filteredSuggestions]);

  const [cursor, setCursor] = useState(-1);

  // Handle arrow down key press (search input)
  const [prevDownPress, setPrevDownPress] = useState(false);
  if (prevDownPress !== downPress) {
    setPrevDownPress(downPress);
    if (resultsFlat.length > 0 && downPress) {
      setCursor((prevState) => {
        const newIndex = prevState < resultsFlat.length - 1 ? prevState + 1 : 0;

        // scroll to the suggestion
        const elm = document.getElementById(`search-suggestion-${newIndex}`);
        const panel = document.getElementById('search-container-suggest-menu');
        if (elm && panel) panel.scrollTop = elm.offsetTop;

        return newIndex;
      });
    }
  }

  // Handle arrow up key press (search input)
  const [prevUpPress, setPrevUpPress] = useState(false);
  if (prevUpPress !== upPress) {
    setPrevUpPress(upPress);
    if (resultsFlat.length > 0 && upPress) {
      setCursor((prevState) => {
        const newIndex = prevState > 0 ? prevState - 1 : resultsFlat.length - 1;

        // scroll to the suggestion
        const elm = document.getElementById(`search-suggestion-${newIndex}`);
        const panel = document.getElementById('search-container-suggest-menu');
        if (elm && panel) panel.scrollTop = elm.offsetTop;

        return newIndex;
      });
    }
  }

  // Performs the search operation
  const formSubmit = useCallback(
    ({
      searchTerm = '',
      geometry,
      target = '',
    }: {
      searchTerm?: string | null;
      geometry?: Point | null;
      target?: string;
    }) => {
      setSuggestionsVisible(false);
      setCursor(-1);

      if (target) {
        window.open(target, '_blank', 'noopener,noreferrer');
      } else if (searchTerm) {
        const newSearchTerm = searchTerm.replace(/[\n\r\t/]/g, ' ');

        if (containsScriptTag(newSearchTerm)) {
          setErrorMessage(invalidSearchError);
          return;
        }

        // get urlSearch parameter value
        let urlSearch = null;
        if (geometry) {
          urlSearch = `${newSearchTerm.trim()}|${geometry.longitude}, ${
            geometry.latitude
          }`;
        } else if (newSearchTerm) {
          urlSearch = newSearchTerm.trim();
        }

        // navigate if the urlSearch value is available
        if (urlSearch) {
          setErrorMessage('');
          setGeolocationError(false);

          // only navigate if search box contains text
          navigate(encodeURI(route.replace('{urlSearch}', urlSearch)));
        }
      }
    },
    [navigate, route],
  );

  const openMonitoringReport = useCallback(
    async (result: __esri.SuggestResult, callback?: (text: string) => void) => {
      // query WQP's station service to get the lat/long
      const url = `${services.waterQualityPortal.stationSearch}mimeType=geojson&zip=no&siteid=${result.key}`;
      try {
        const res = (await fetchCheck(url)) as MonitoringLocationsData;
        const feature = res.features[0];
        if (!feature) {
          setErrorMessage(webServiceErrorMessage);
          return;
        }
        const {
          properties: {
            MonitoringLocationIdentifier,
            OrganizationIdentifier,
            ProviderName,
          },
        } = feature;

        formSubmit({
          target: `/monitoring-report/${ProviderName}/${OrganizationIdentifier}/${MonitoringLocationIdentifier}`,
        });
        if (callback && result.text) callback(result.text);
      } catch (_err) {
        setErrorMessage(webServiceErrorMessage);
      }
    },
    [formSubmit, services],
  );

  const openWaterbodyReport = useCallback(
    (result: __esri.SuggestResult, callback?: (text: string) => void) => {
      const item = waterbodySuggestions.current?.find(
        (wb) => wb.assessmentUnitId === result.key,
      );
      if (!item) {
        setErrorMessage(webServiceErrorMessage);
        return;
      }
      const { assessmentUnitId, organizationId } = item;
      formSubmit({
        target: `/waterbody-report/${organizationId}/${assessmentUnitId}`,
      });

      if (callback && result.text) callback(result.text);
    },
    [formSubmit],
  );

  // prevent next useEffect from running more than once per enter key press
  const [lock, setLock] = useState(false);
  const [prevEnterPress, setPrevEnterPress] = useState(false);
  if (prevEnterPress !== enterPress) {
    setPrevEnterPress(enterPress);
    if (!enterPress) setLock(false);
  }

  // Handle enter key press (search input)
  useEffect(() => {
    if (!enterPress || cursor < -1 || lock || cursor > resultsFlat.length)
      return;

    setLock(true);

    if (cursor === -1 || resultsFlat.length === 0) {
      formSubmit({ searchTerm: inputText });
    } else if (resultsFlat[cursor].source.name === WATERBODIES) {
      openWaterbodyReport(resultsFlat[cursor], (text) => {
        setInputText(text);
        setSuggestionsVisible(false);
        setCursor(-1);
      });
    } else if (resultsFlat[cursor].source.name === MONITORING_LOCATIONS) {
      openMonitoringReport(resultsFlat[cursor], (text) => {
        setInputText(text);
        setSuggestionsVisible(false);
        setCursor(-1);
      });
    } else if (resultsFlat[cursor].text) {
      setInputText(resultsFlat[cursor].text);
      formSubmit({ searchTerm: resultsFlat[cursor].text });
    }
  }, [
    cursor,
    enterPress,
    formSubmit,
    inputText,
    lock,
    openMonitoringReport,
    openWaterbodyReport,
    resultsFlat,
  ]);

  const groups = useMemo(() => Object.values(sourceGroups), [sourceGroups]);

  const [sourceCursor, setSourceCursor] = useState(-1);

  // Handle arrow down key press (sources list)
  const [prevSourceDownPress, setPrevSourceDownPress] = useState(false);
  if (prevSourceDownPress !== sourceDownPress) {
    setPrevSourceDownPress(sourceDownPress);
    if (groups.length > 0 && sourceDownPress) {
      setSourceCursor((prevState) => {
        const newIndex = prevState < groups.length - 1 ? prevState + 1 : 0;

        // scroll to the suggestion
        const elm = document.getElementById(`source-${newIndex}`);
        const panel = document.getElementById('search-container-source-menu');
        if (elm && panel) panel.scrollTop = elm.offsetTop;

        return newIndex;
      });
    }
  }

  // Handle arrow up key press (sources list)
  const [prevSourceUpPress, setPrevSourceUpPress] = useState(false);
  if (prevSourceUpPress !== sourceUpPress) {
    setPrevSourceUpPress(sourceUpPress);
    if (groups.length > 0 && sourceUpPress) {
      setSourceCursor((prevState) => {
        const newIndex = prevState > 0 ? prevState - 1 : groups.length - 1;

        // scroll to the suggestion
        const elm = document.getElementById(`source-${newIndex}`);
        const panel = document.getElementById('search-container-source-menu');
        if (elm && panel) panel.scrollTop = elm.offsetTop;

        return newIndex;
      });
    }
  }

  // Handle enter key press (sources list)
  const [prevSourceEnterPress, setPrevSourceEnterPress] = useState(false);
  if (prevSourceEnterPress !== sourceEnterPress) {
    (() => {
      setPrevSourceEnterPress(sourceEnterPress);
      if (!sourceEnterPress) return;

      // handle selecting a source
      if (sourceCursor < 0 || sourceCursor > groups.length) return;
      const group = groups[sourceCursor];
      if (group.name) {
        setSelectedGroup(group);
        setSourceCursor(-1);

        setTimeout(() => {
          const searchInput = document.getElementById('hmw-search-input');
          if (searchInput) searchInput.focus();
        }, 250);
      }
    })();
  }

  // Handle enter key press (clear button)
  const [prevClearEnterPress, setPrevClearEnterPress] = useState(false);
  if (prevClearEnterPress !== clearEnterPress) {
    setPrevClearEnterPress(clearEnterPress);
    if (clearEnterPress) {
      const nodeClearButton = document.getElementById('search-input-clear');
      nodeClearButton?.click();
    }
  }

  const searchTerm = splitSuggestedSearch(searchText).searchPart;

  // Detect clicks outside of the search input and search suggestions list.
  // This is used for closing the suggestions list when the user clicks outside.
  const suggestionsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(ev: Event) {
      if (
        suggestionsRef.current &&
        ev.target instanceof Node &&
        !suggestionsRef.current.contains(ev.target)
      ) {
        setSuggestionsVisible(false);
      }
    }

    // Bind the event listener
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [suggestionsRef]);

  let layerEndIndex = -1;

  function handleSourcesClick(ev: React.KeyboardEvent | React.MouseEvent) {
    if (!isClick(ev)) return;

    setSourcesVisible(!sourcesVisible);
    setSuggestionsVisible(false);
    setCursor(-1);
  }

  function handleCloseClick(ev: React.KeyboardEvent | React.MouseEvent) {
    if (!isClick(ev)) return;

    if (searchWidget) searchWidget.searchTerm = '';
    setInputText('');
    setSourcesVisible(false);
    setSuggestionsVisible(false);
    setCursor(-1);
  }

  function handleSuggestionClick(result: FlattenedResult) {
    return async (ev: React.KeyboardEvent | React.MouseEvent) => {
      if (!isClick(ev)) return;

      if (result.text) setInputText(result.text);
      setSuggestionsVisible(false);
      setCursor(-1);

      if (!searchWidget) return;
      if (result.text) searchWidget.searchTerm = result.text;

      if (result.source.name === ARC_GIS) {
        // use esri geocoder
        searchWidget.search(result.text);
        formSubmit({ searchTerm: result.text });
      } else if (result.source.name === WATERSHEDS) {
        // extract the huc from "Watershed (huc)" and search on the huc
        const huc = result.text?.split('(')[1].replace(')', '') ?? '';
        formSubmit({ searchTerm: huc });
      } else if (result.source.name === MONITORING_LOCATIONS) {
        openMonitoringReport(result);
      } else if (result.source.name === WATERBODIES) {
        openWaterbodyReport(result);
      } else if (result.source instanceof LayerSearchSource) {
        // query to get the feature and search based on the centroid
        const layer = result.source.layer as FeatureLayer;
        const params = layer.createQuery();
        params.returnGeometry = true;
        params.outSpatialReference = SpatialReference.WGS84;
        params.where = `${layer.objectIdField} = ${result.key}`;
        try {
          function hasCentroid(
            geometry: __esri.Geometry | nullish,
          ): geometry is __esri.Polygon {
            if (!geometry) return false;
            return (geometry as __esri.Polygon).centroid !== undefined;
          }
          const res = await layer.queryFeatures(params);
          if (res.features.length > 0) {
            const geometry = res.features[0].geometry;
            const center = hasCentroid(geometry)
              ? geometry?.centroid
              : geometry;
            formSubmit({
              searchTerm: result.text,
              geometry: center as Point | nullish,
            });
            searchWidget.search(result.text);
          }
        } catch (_err) {
          setErrorMessage(webServiceErrorMessage);
        }
      }
    };
  }

  return (
    <>
      {errorMessage && (
        <div css={modifiedErrorBoxStyles}>
          <p>{errorMessage}</p>
        </div>
      )}

      <label css={labelStyles} htmlFor="hmw-search-input">
        {label}
      </label>

      <form
        css={formStyles}
        onSubmit={(ev) => {
          ev.preventDefault();
          formSubmit({ searchTerm: inputText });
        }}
      >
        <div css={searchBoxStyles}>
          <div
            role="presentation"
            className={
              `esri-search-multiple-sources esri-search__container ` +
              `${sourcesVisible ? 'esri-search--sources' : ''} ` +
              `${
                filteredSuggestions.length > 0
                  ? 'esri-search--show-suggestions'
                  : ''
              }`
            }
            onBlur={(ev) => {
              if (
                !ev.currentTarget.contains(ev.relatedTarget) ||
                ev.relatedTarget?.tagName !== 'LI'
              ) {
                setSourcesVisible(false);
                setSourceCursor(-1);
              }
            }}
          >
            <div
              role="button"
              title="Search in"
              aria-haspopup="true"
              aria-controls="search-container-source-menu"
              className="esri-search__sources-button esri-widget--button"
              tabIndex={0}
              data-node-ref="_sourceMenuButtonNode"
              ref={sourceList}
              onClick={handleSourcesClick}
              onKeyDown={handleSourcesClick}
            >
              <span
                aria-hidden="true"
                role="presentation"
                className="esri-icon-down-arrow esri-search__sources-button--down"
              ></span>
            </div>
            <div
              id="search-container-source-menu-div"
              tabIndex={-1}
              className="esri-menu esri-search__sources-menu"
            >
              <ul
                id="search-container-source-menu"
                role="menu"
                data-node-ref="_sourceListNode"
                className="esri-menu__list"
              >
                {groups.map((group, groupIndex) => {
                  let secondClass = '';
                  if (selectedGroup.name === group.name) {
                    secondClass = 'esri-menu__list-item--active';
                  } else if (groupIndex === sourceCursor) {
                    secondClass = 'esri-menu__list-item-active';
                  }

                  function handleSourceSelect(
                    ev: React.KeyboardEvent | React.MouseEvent,
                  ) {
                    if (!isClick(ev)) return;

                    setSelectedGroup(group);
                    setSourcesVisible(false);

                    const searchInput =
                      document.getElementById('hmw-search-input');
                    if (searchInput) searchInput.focus();
                  }

                  return (
                    <li
                      id={`source-${groupIndex}`}
                      role="menuitem"
                      className={`esri-search__source esri-menu__list-item ${secondClass}`}
                      tabIndex={-1}
                      key={`source-key-${group.name}`}
                      onClick={handleSourceSelect}
                      onKeyDown={handleSourceSelect}
                    >
                      {group.name}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="esri-search__input-container" ref={suggestionsRef}>
              <div className="esri-search__form" role="search">
                <input
                  id="hmw-search-input"
                  type="text"
                  ref={searchBox}
                  placeholder={selectedGroup.placeholder}
                  aria-label="Search"
                  autoComplete="off"
                  tabIndex={0}
                  className="esri-input esri-search__input"
                  aria-autocomplete="list"
                  aria-haspopup="true"
                  data-node-ref="_inputNode"
                  title={selectedGroup.placeholder}
                  value={
                    inputText === searchTerm &&
                    isHuc12(inputText) &&
                    watershed.name &&
                    huc12
                      ? `WATERSHED: ${watershed.name} (${huc12})`
                      : inputText.split('|')[0]
                  }
                  onChange={(ev) => {
                    setInputText(ev.target.value);
                    setSuggestionsVisible(true);
                    setCursor(-1);

                    if (!searchWidget) return;
                    searchWidget.searchTerm = ev.target.value;
                    searchWidget.suggest();
                  }}
                  onFocus={(_ev) => {
                    setSourcesVisible(false);
                    setSuggestionsVisible(true);
                    setCursor(-1);
                  }}
                  onBlur={(ev) => {
                    if (
                      !suggestionsRef.current?.contains(ev.relatedTarget) ||
                      ev.relatedTarget?.tagName !== 'LI'
                    ) {
                      setSuggestionsVisible(false);
                      setSourceCursor(-1);
                    }
                  }}
                  aria-owns={
                    filteredSuggestions.length > 0 && suggestionsVisible
                      ? 'search-container-suggest-menu'
                      : ''
                  }
                />
              </div>

              {filteredSuggestions.length > 0 && suggestionsVisible && (
                <div
                  id="search-container-suggest-menu"
                  className="esri-menu esri-search__suggestions-menu"
                  role="menu"
                  data-node-ref="_suggestionListNode"
                >
                  {filteredSuggestions.map((suggestions) => {
                    const title = getGroupTitle(suggestions, groups);

                    const results = suggestions.results ?? [];
                    if (!suggestions.error && results.length === 0) return null;

                    layerEndIndex += results.length;

                    return (
                      <LayerSuggestions
                        cursor={cursor}
                        inputText={inputText}
                        key={`layer-suggestions-key-${suggestions.source.name}`}
                        onSuggestionClick={handleSuggestionClick}
                        title={title}
                        suggestions={suggestions}
                        startIndex={layerEndIndex - (results.length - 1)}
                      />
                    );
                  })}
                </div>
              )}

              {inputText && (
                <div
                  id="search-input-clear"
                  role="button"
                  className="esri-search__clear-button esri-widget--button"
                  tabIndex={0}
                  title="Clear search"
                  ref={clearButton}
                  onClick={handleCloseClick}
                  onKeyDown={handleCloseClick}
                >
                  <span aria-hidden="true" className="esri-icon-close"></span>
                </div>
              )}
            </div>

            <div className="esri-menu esri-search__warning-menu">
              <div className="esri-search__warning-body">
                <div>
                  <div className="esri-search__warning-header">No results</div>
                  <div className="esri-search__warning-text">
                    There were no results found for {inputText}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          css={buttonStyles}
          type="submit"
          disabled={inputText === searchText}
        >
          <i className="fas fa-angle-double-right" aria-hidden="true" /> Go
        </button>

        {navigator.geolocation && (
          <>
            <p css={textStyles}>OR</p>

            {geolocationError ? (
              <button css={buttonStyles} type="button" disabled>
                <i className="fas fa-exclamation-triangle" aria-hidden="true" />
                &nbsp;&nbsp;Error Getting Location
              </button>
            ) : (
              <button
                css={buttonStyles}
                type="button"
                onClick={(_ev) => {
                  setGeolocating(true);

                  navigator.geolocation.getCurrentPosition(
                    // success function called when geolocation succeeds
                    (position) => {
                      const url = services.locatorUrl;
                      const params = {
                        location: new Point({
                          x: position.coords.longitude,
                          y: position.coords.latitude,
                        }),
                      };

                      locator
                        .locationToAddress(url, params)
                        .then((candidate) => {
                          setGeolocating(false);
                          if (!candidate.address) {
                            setGeolocationError(true);
                            return;
                          }
                          navigate(
                            encodeURI(
                              route.replace('{urlSearch}', candidate.address),
                            ),
                          );
                        });
                    },
                    // failure function called when geolocation fails
                    (err) => {
                      console.error(err);
                      setGeolocating(false);
                      setGeolocationError(true);
                    },
                  );
                }}
              >
                {!geolocating ? (
                  <>
                    <i className="fas fa-crosshairs" aria-hidden="true" />
                    &nbsp;&nbsp;Use My Location
                  </>
                ) : (
                  <>
                    <i className="fas fa-spinner fa-pulse" aria-hidden="true" />
                    &nbsp;&nbsp;Getting Location...
                  </>
                )}
              </button>
            )}
          </>
        )}
      </form>
    </>
  );
}

type LayerSuggestionsProps = {
  cursor: number;
  inputText: string;
  onSuggestionClick: (
    result: FlattenedResult,
  ) => (ev: React.KeyboardEvent | React.MouseEvent) => void;
  suggestions: __esri.SearchResultsSuggestions;
  startIndex: number;
  title: ReactElement;
};

function LayerSuggestions({
  cursor,
  inputText,
  onSuggestionClick,
  suggestions,
  startIndex,
  title,
}: Readonly<LayerSuggestionsProps>) {
  let index = 0;
  return (
    <>
      <div className="esri-menu__header">{title}</div>
      {suggestions.error ? (
        <div css={errorBoxStyles}>{suggestions.error.message}</div>
      ) : (
        <ul
          role="presentation"
          className="esri-menu__list esri-search__suggestions-list"
        >
          {suggestions.results?.map((result, idx) => {
            const flattenedResult: FlattenedResult = {
              ...result,
              source: suggestions.source,
              sourceIndex: suggestions.sourceIndex,
            };
            index = startIndex + idx;

            return (
              <li
                id={`search-suggestion-${index}`}
                role="menuitem"
                className={`esri-menu__list-item ${
                  index === cursor ? 'esri-menu__list-item-active' : ''
                }`}
                tabIndex={-1}
                key={`suggestion-key-${index}`}
                onClick={onSuggestionClick(flattenedResult)}
                onKeyDown={onSuggestionClick(flattenedResult)}
              >
                {getHighlightParts(result.text ?? '', inputText).map(
                  (part, index) => {
                    if (part.toLowerCase() === inputText.toLowerCase()) {
                      return <strong key={index}>{part}</strong>;
                    } else {
                      return <Fragment key={index}>{part}</Fragment>;
                    }
                  },
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default LocationSearch;
