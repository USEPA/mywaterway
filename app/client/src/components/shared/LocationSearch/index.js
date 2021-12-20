// @flow

import React from 'react';
import { navigate } from '@reach/router';
import styled from 'styled-components';
import { isIE } from 'components/pages/LocationMap/MapFunctions';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Locator from '@arcgis/core/tasks/Locator';
import Point from '@arcgis/core/geometry/Point';
import Search from '@arcgis/core/widgets/Search';
import * as watchUtils from '@arcgis/core/core/watchUtils';
// components
import { StyledErrorBox } from 'components/shared/MessageBoxes';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// helpers
import { useKeyPress } from 'utils/hooks';
import {
  containsScriptTag,
  escapeRegex,
  isHuc12,
  splitSuggestedSearch,
} from 'utils/utils';
// styles
import { colors } from 'styles/index.js';
// errors
import {
  invalidSearchError,
  webServiceErrorMessage,
} from 'config/errorMessages';

// Finds the source of the suggestion
function findSource(name, suggestions) {
  let source = null;
  suggestions.forEach((item) => {
    if (item.source.name === name) source = item;
  });

  return source;
}

// --- styled components ---
const ErrorBox = styled(StyledErrorBox)`
  margin-bottom: 1em;

  p {
    padding: 0 !important;
  }
`;

const Label = styled.label`
  margin-top: 0.25em;
  margin-bottom: 0;
  padding-bottom: 0;
`;

const Form = styled.form`
  display: flex;
  flex-flow: row wrap;
  align-items: center;
`;

const Button = styled.button`
  margin-top: 1em;
  margin-bottom: 0;
  font-size: 0.9375em;
  font-weight: bold;
  color: ${colors.white()};
  background-color: ${colors.blue()};

  &:not(.btn-danger):hover,
  &:not(.btn-danger):focus {
    color: ${colors.white()};
    background-color: ${colors.navyBlue()};
  }

  &:disabled {
    cursor: default;
  }
`;

const Text = styled.p`
  margin: 1em 0.5em 0;
  padding: 0 !important;
  font-size: 0.875em;
  font-weight: bold;
`;

const SearchBox = styled.div`
  margin-top: 1em;
  width: 100%;
  height: 36.75px;
  font-size: 0.9375em;

  @media (min-width: 480px) {
    flex: 1;
    margin-right: 0.5em;
  }

  .esri-search__container {
    border: 1px solid rgb(211, 211, 211);
    border-radius: 4px;
  }

  .esri-search__input {
    height: 36px;
    border-radius: 4px;
    padding: 1px 2px 1px 8px;
    color: #495057;
    font-family: 'Source Sans Pro', 'Helvetica Neue', 'Helvetica', 'Roboto',
      'Arial', sans-serif;
    font-size: 16px;
  }

  .esri-search__input::placeholder {
    color: #6c757d;
  }

  .esri-search__clear-button {
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
    z-index: 1000;
  }

  .esri-menu__list-item::hover {
    background-color: #f3f3f3;
  }

  .esri-menu__list-item-active {
    background-color: #e2f1fb;
  }

  .esri-search__sources-button {
    height: 38px;
  }
`;

// --- components ---
type Props = {
  route: string,
  label: Node,
};

function LocationSearch({ route, label }: Props) {
  const services = useServicesContext();
  const searchBox = React.createRef();
  const downPress = useKeyPress('ArrowDown', searchBox);
  const upPress = useKeyPress('ArrowUp', searchBox);
  const enterPress = useKeyPress('Enter', searchBox);
  const sourceList = React.createRef();
  const sourceDownPress = useKeyPress('ArrowDown', sourceList);
  const sourceUpPress = useKeyPress('ArrowUp', sourceList);
  const sourceEnterPress = useKeyPress('Enter', sourceList);
  const clearButton = React.createRef();
  const clearEnterPress = useKeyPress('Enter', clearButton);
  const { searchText, watershed, huc12 } = React.useContext(
    LocationSearchContext,
  );

  const placeholder = 'Search by address, zip code, or place...';
  const [allSources] = React.useState([
    {
      type: 'default',
      name: 'All',
      placeholder,
    },
    {
      type: 'ArcGIS',
      name: 'Address, zip code, and place search',
      placeholder,
      sources: [
        {
          locator: new Locator({ url: services.data.locatorUrl }),
          countryCode: 'USA',
          searchFields: ['Loc_name'],
          suggestionTemplate: '{Loc_name}',
          exactMatch: false,
          outFields: [
            'Loc_name',
            'City',
            'Place_addr',
            'Region',
            'RegionAbbr',
            'Country',
            'Addr_type',
          ],
          placeholder,
          name: 'ArcGIS',
        },
      ],
    },
    {
      type: 'group',
      name: 'EPA Tribal Areas',
      placeholder: 'Search EPA tribal areas...',
      sources: [
        {
          layer: new FeatureLayer({
            url: `${services.data.tribal}/4`,
            listMode: 'hide',
          }),
          searchFields: ['TRIBE_NAME'],
          suggestionTemplate: '{TRIBE_NAME}',
          exactMatch: false,
          outFields: ['TRIBE_NAME'],
          placeholder: placeholder,
          name: 'EPA Tribal Areas - Lower 48 States',
        },
        {
          layer: new FeatureLayer({
            url: `${services.data.tribal}/1`,
            listMode: 'hide',
          }),
          searchFields: ['NAME'],
          suggestionTemplate: '{NAME}',
          exactMatch: false,
          outFields: ['NAME'],
          placeholder: placeholder,
          name: 'EPA Tribal Areas - Alaska Native Villages',
        },
        {
          layer: new FeatureLayer({
            url: `${services.data.tribal}/2`,
            listMode: 'hide',
          }),
          searchFields: ['TRIBE_NAME'],
          suggestionTemplate: '{TRIBE_NAME}',
          exactMatch: false,
          outFields: ['TRIBE_NAME'],
          placeholder: placeholder,
          name: 'EPA Tribal Areas - Alaska Reservations',
        },
      ],
    },
    {
      type: 'layer',
      name: 'Watershed',
      placeholder: 'Search watersheds...',
      sources: [
        {
          layer: new FeatureLayer({
            url:
              'https://gispub.epa.gov/arcgis/rest/services/OW/HydrologicUnits/MapServer/19',
            listMode: 'hide',
          }),
          searchFields: ['name', 'huc12'],
          suggestionTemplate: '{name} ({huc12})',
          exactMatch: false,
          outFields: ['name', 'huc12'],
          placeholder: placeholder,
          name: 'Watersheds',
        },
      ],
    },
  ]);

  // geolocating state for updating the 'Use My Location' button
  const [geolocating, setGeolocating] = React.useState(false);

  // geolocationError state for disabling the 'Use My Location' button
  const [geolocationError, setGeolocationError] = React.useState(false);

  // initialize inputText from searchText context
  const [inputText, setInputText] = React.useState(searchText);

  // update inputText whenever searchText changes (i.e. Form onSubmit)
  React.useEffect(() => setInputText(searchText), [searchText]);

  const [errorMessage, setErrorMessage] = React.useState('');

  // Initialize the esri search widget
  const [searchWidget, setSearchWidget] = React.useState(null);
  const [suggestions, setSuggestions] = React.useState([]);
  React.useEffect(() => {
    if (searchWidget) return;

    const sources = [];
    allSources.forEach((source) => {
      if (source.type === 'default') return;
      sources.push(...source.sources);
    });

    const search = new Search({
      allPlaceholder: placeholder,
      includeDefaultSources: false,
      locationEnabled: false,
      label: 'Search',
      sources,
    });

    // create a watcher for the input text
    watchUtils.watch(
      search,
      'searchTerm',
      (newVal, oldVal, propName, event) => {
        setInputText(newVal);
      },
    );

    // create a watcher for the suggestions based on search input
    watchUtils.watch(
      search,
      'suggestions',
      (newVal, oldVal, propName, event) => {
        setSuggestions(newVal ? newVal : []);
      },
    );

    setSearchWidget(search);
  }, [searchWidget, services, searchText, allSources]);

  // Initialize the esri search widget value with the search text.
  React.useEffect(() => {
    if (!searchWidget) return;

    // Remove coordinates if search text was from non-esri suggestions
    searchWidget.searchTerm = splitSuggestedSearch(searchText).searchPart;
  }, [searchWidget, searchText]);

  // Updates the search widget sources whenever the user selects a source.
  const [sourcesVisible, setSourcesVisible] = React.useState(false);
  const [selectedSource, setSelectedSource] = React.useState(allSources[0]);
  const [suggestionsVisible, setSuggestionsVisible] = React.useState(false);
  React.useEffect(() => {
    if (!searchWidget) return;

    const sources = [];

    if (selectedSource.name === 'All') {
      allSources.forEach((source) => {
        if (source.type === 'default') return;
        sources.push(...source.sources);
      });
      searchWidget.sources = sources;
    } else {
      allSources.forEach((source) => {
        if (source.name !== selectedSource.name) return;
        sources.push(...source.sources);
      });
      searchWidget.sources = sources;
    }

    if (searchWidget.searchTerm) {
      searchWidget.suggest();
    }
  }, [allSources, searchWidget, selectedSource]);

  // filter the suggestions down to just sources that have results
  // and combine grouped sources
  const [filteredSuggestions, setFilteredSuggestions] = React.useState([]);
  const [resultsCombined, setResultsCombined] = React.useState([]);
  React.useEffect(() => {
    const newFilteredSuggestions = [];
    const newResultsCombined = [];

    allSources.forEach((item) => {
      if (item.type === 'default') {
        // check if this has already been added
        let sug = findSource(
          'ArcGIS World Geocoding Service',
          newFilteredSuggestions,
        );
        if (sug) return;

        sug = findSource('ArcGIS World Geocoding Service', suggestions);
        if (sug && sug.results.length > 0) {
          newFilteredSuggestions.push(sug);
          newResultsCombined.push(...sug.results);
        }
        return;
      }

      // combine group sources into a single source, i.e. combine the 3 tribes
      // sources into one source
      const results = [];
      let source = null;
      let sourceIndex = -1;
      item.sources.forEach((item2) => {
        const sug = findSource(item2.name, suggestions);
        if (!sug) return;

        if (!source) {
          source = sug.source;
          sourceIndex = sug.sourceIndex;
        }
        sug.results.forEach((result) => {
          results.push({
            ...result,
            source: sug.source,
            sourceIndex: sug.sourceIndex,
          });
        });
      });

      if (results.length > 0) {
        newFilteredSuggestions.push({
          results,
          source,
          sourceIndex,
        });
        newResultsCombined.push(...results);
      }
    });
    setFilteredSuggestions(newFilteredSuggestions);
    setResultsCombined(newResultsCombined);
  }, [allSources, suggestions]);

  const [cursor, setCursor] = React.useState(-1);

  // Handle arrow down key press (search input)
  React.useEffect(() => {
    if (resultsCombined.length > 0 && downPress) {
      setCursor((prevState) => {
        const newIndex =
          prevState < resultsCombined.length - 1 ? prevState + 1 : 0;

        // scroll to the suggestion
        const elm = document.getElementById(`search-suggestion-${newIndex}`);
        const panel = document.getElementById('search-container-suggest-menu');
        if (elm && panel) panel.scrollTop = elm.offsetTop;

        return newIndex;
      });
    }
  }, [resultsCombined, downPress]);

  // Handle arrow up key press (search input)
  React.useEffect(() => {
    if (resultsCombined.length > 0 && upPress) {
      setCursor((prevState) => {
        const newIndex =
          prevState > 0 ? prevState - 1 : resultsCombined.length - 1;

        // scroll to the suggestion
        const elm = document.getElementById(`search-suggestion-${newIndex}`);
        const panel = document.getElementById('search-container-suggest-menu');
        if (elm && panel) panel.scrollTop = elm.offsetTop;

        return newIndex;
      });
    }
  }, [resultsCombined, upPress]);

  // Handle enter key press (search input)
  React.useEffect(() => {
    if (resultsCombined.length === 0 || !enterPress) return;
    if (cursor < 0 || cursor > resultsCombined.length) return;
    if (resultsCombined[cursor].text)
      setInputText(resultsCombined[cursor].text);
  }, [cursor, enterPress, resultsCombined]);

  // Performs the search operation
  function formSubmit(newSearchTerm, geometry = null) {
    setSuggestionsVisible(false);
    setCursor(-1);

    newSearchTerm = newSearchTerm.replace(/[\n\r\t]/g, ' ');

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

  let index = -1;
  function LayerSuggestions({ title, source }) {
    return (
      <>
        <div className="esri-menu__header">{title}</div>
        <ul
          role="presentation"
          className="esri-menu__list esri-search__suggestions-list"
        >
          {source.results.map((result) => {
            index = index + 1;
            return (
              <li
                id={`search-suggestion-${index}`}
                role="menuitem"
                className={`esri-menu__list-item ${
                  index === cursor ? 'esri-menu__list-item-active' : ''
                }`}
                key={`suggestion-key-${index}`}
                onClick={() => {
                  setInputText(result.text);
                  setSuggestionsVisible(false);
                  setCursor(-1);

                  if (!searchWidget) return;
                  searchWidget.searchTerm = result.text;

                  if (source.source.name === 'ArcGIS') {
                    // use esri geocoder
                    searchWidget.search(result.text);
                    formSubmit(result.text);
                  } else if (source.source.name === 'Watersheds') {
                    // extract the huc from "Watershed (huc)" and search on the huc
                    const huc = result.text.split('(')[1].replace(')', '');
                    formSubmit(huc);
                  } else {
                    // query to get the feature and search based on the centroid
                    const params = result.source.layer.createQuery();
                    params.returnGeometry = true;
                    params.where = `${result.source.layer.objectIdField} = ${result.key}`;
                    result.source.layer
                      .queryFeatures(params)
                      .then((res) => {
                        if (res.features.length > 0) {
                          const center = res.features[0].geometry.centroid;
                          formSubmit(result.text, center);
                          searchWidget.search(result.text);
                        }
                      })
                      .catch((err) => {
                        setErrorMessage(webServiceErrorMessage);
                      });
                  }
                }}
              >
                {result.text
                  .split(new RegExp(`(${escapeRegex(inputText)})`, 'gi'))
                  .map((part, textIndex) => {
                    if (part.toLowerCase() === inputText.toLowerCase()) {
                      return (
                        <strong key={`text-key-${textIndex}`}>{part}</strong>
                      );
                    } else {
                      return (
                        <React.Fragment key={`text-key-${textIndex}`}>
                          {part}
                        </React.Fragment>
                      );
                    }
                  })}
              </li>
            );
          })}
        </ul>
      </>
    );
  }

  const [sourceCursor, setSourceCursor] = React.useState(-1);

  // Handle arrow down key press (sources list)
  React.useEffect(() => {
    if (allSources.length > 0 && sourceDownPress) {
      setSourceCursor((prevState) => {
        const newIndex = prevState < allSources.length - 1 ? prevState + 1 : 0;

        // scroll to the suggestion
        const elm = document.getElementById(`source-${newIndex}`);
        const panel = document.getElementById('search-container-source-menu');
        if (elm && panel) panel.scrollTop = elm.offsetTop;

        return newIndex;
      });
    }
  }, [allSources, sourceDownPress]);

  // Handle arrow up key press (sources list)
  React.useEffect(() => {
    if (allSources.length > 0 && sourceUpPress) {
      setSourceCursor((prevState) => {
        const newIndex = prevState > 0 ? prevState - 1 : allSources.length - 1;

        // scroll to the suggestion
        const elm = document.getElementById(`source-${newIndex}`);
        const panel = document.getElementById('search-container-source-menu');
        if (elm && panel) panel.scrollTop = elm.offsetTop;

        return newIndex;
      });
    }
  }, [allSources, sourceUpPress]);

  // Handle enter key press (sources list)
  React.useEffect(() => {
    if (!sourceEnterPress) return;

    // determine if the sources menu is visible
    const sourcesShown =
      document
        .getElementById('search-container-source-menu-div')
        .getBoundingClientRect().height !== 0;

    // determine whether or not the enter button is being used to open/close
    // the sources menu or select a source
    if (!sourcesShown) {
      setSourcesVisible(true);
      setSuggestionsVisible(false);
      return;
    }
    if (sourcesShown && sourceCursor === -1) {
      setSourcesVisible(false);
      return;
    }

    // handle selecting a source
    if (sourceCursor < 0 || sourceCursor > allSources.length) return;
    if (allSources[sourceCursor].name) {
      setSelectedSource(allSources[sourceCursor]);
      setSourceCursor(-1);

      setTimeout(() => {
        const searchInput = document.getElementById('hmw-search-input');
        if (searchInput) searchInput.focus();
      }, 250);
    }
  }, [allSources, sourceCursor, sourceEnterPress]);

  // Handle enter key press (clear button)
  React.useEffect(() => {
    if (!clearEnterPress) return;

    const nodeClearButton = document.getElementById('search-input-clear');
    nodeClearButton.click();
  }, [clearEnterPress]);

  const searchTerm = splitSuggestedSearch(searchText).searchPart;

  // Detect clicks outside of the search input and search suggestions list.
  // This is used for closing the suggestions list when the user clicks outside.
  const suggestionsRef = React.useRef();
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
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

  return (
    <>
      {errorMessage && (
        <ErrorBox>
          <p>{errorMessage}</p>
        </ErrorBox>
      )}
      <Label htmlFor="hmw-search-input">{label}</Label>
      <Form
        onSubmit={(ev) => {
          ev.preventDefault();

          formSubmit(inputText);
        }}
      >
        <SearchBox>
          <div
            role="presentation"
            className={`esri-search-multiple-sources esri-search__container ${
              sourcesVisible ? 'esri-search--sources' : ''
            } ${
              filteredSuggestions.length > 0
                ? 'esri-search--show-suggestions'
                : ''
            }`}
          >
            <div
              role="button"
              title="Search in"
              aria-haspopup="true"
              aria-controls="search-container-source-menu"
              className="esri-search__sources-button esri-widget--button"
              tabIndex="0"
              data-node-ref="_sourceMenuButtonNode"
              ref={sourceList}
              onClick={() => {
                setSourcesVisible(!sourcesVisible);
                setSuggestionsVisible(false);
                setCursor(-1);
              }}
            >
              <span
                aria-hidden="true"
                role="presentation"
                className="esri-icon-down-arrow esri-search__sources-button--down"
              ></span>
              <span
                aria-hidden="true"
                role="presentation"
                className="esri-icon-up-arrow esri-search__sources-button--up"
              ></span>
              <span
                aria-hidden="true"
                role="presentation"
                className="esri-search__source-name"
              >
                {selectedSource.name}
              </span>
            </div>
            <div
              id="search-container-source-menu-div"
              tabIndex="-1"
              className="esri-menu esri-search__sources-menu"
            >
              <ul
                id="search-container-source-menu"
                role="menu"
                data-node-ref="_sourceListNode"
                className="esri-menu__list"
              >
                {allSources.map((source, sourceIndex) => {
                  let secondClass = '';
                  if (selectedSource.name === source.name) {
                    secondClass = 'esri-menu__list-item--active';
                  } else if (sourceIndex === sourceCursor) {
                    secondClass = 'esri-menu__list-item-active';
                  }

                  return (
                    <li
                      id={`source-${sourceIndex}`}
                      role="menuitem"
                      className={`esri-search__source esri-menu__list-item ${secondClass}`}
                      tabIndex="-1"
                      key={`source-key-${sourceIndex}`}
                      onClick={() => {
                        setSelectedSource(source);
                        setSourcesVisible(false);

                        const searchInput = document.getElementById(
                          'hmw-search-input',
                        );
                        if (searchInput) searchInput.focus();
                      }}
                    >
                      {source.name}
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
                  placeholder={selectedSource.placeholder}
                  aria-label="Search"
                  autoComplete="off"
                  tabIndex="0"
                  className="esri-input esri-search__input"
                  aria-autocomplete="list"
                  aria-haspopup="true"
                  data-node-ref="_inputNode"
                  title={placeholder}
                  value={
                    inputText === searchTerm &&
                    isHuc12(inputText) &&
                    watershed &&
                    huc12
                      ? `WATERSHED: ${watershed} (${huc12})`
                      : inputText.indexOf('|') > -1
                      ? inputText.split('|')[0]
                      : inputText
                  }
                  onChange={(ev) => {
                    setInputText(ev.target.value);
                    setSuggestionsVisible(true);
                    setCursor(-1);

                    if (!searchWidget) return;
                    searchWidget.searchTerm = ev.target.value;
                    searchWidget.suggest();
                  }}
                  onFocus={(ev) => {
                    setSourcesVisible(false);
                    setSuggestionsVisible(true);
                    setCursor(-1);
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
                  {filteredSuggestions.map((source, suggestIndex) => {
                    function findGroupName() {
                      if (
                        source.source.name === 'ArcGIS World Geocoding Service'
                      ) {
                        return 'Address, zip code, and place search';
                      }

                      let newTitle = '';
                      allSources.forEach((item) => {
                        if (item.type === 'default') return;

                        item.sources.forEach((nestedItem) => {
                          if (nestedItem.name === source.source.name) {
                            newTitle = item.name;
                          }
                        });
                      });
                      return newTitle;
                    }
                    if (source.results.length === 0) return null;

                    const title = findGroupName();
                    return (
                      <LayerSuggestions
                        key={`layer-suggestions-key-${suggestIndex}`}
                        title={title}
                        source={source}
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
                  tabIndex="0"
                  title="Clear search"
                  ref={clearButton}
                  onClick={() => {
                    if (searchWidget) searchWidget.searchTerm = '';
                    setInputText('');
                    setSourcesVisible(false);
                    setSuggestionsVisible(false);
                    setCursor(-1);
                  }}
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
        </SearchBox>

        <Button
          className="btn"
          type="submit"
          disabled={inputText === searchText}
        >
          <i className="fas fa-angle-double-right" aria-hidden="true" /> Go
        </Button>

        {navigator.geolocation && (
          <>
            <Text>OR</Text>

            {geolocationError ? (
              <Button className="btn btn-danger" type="button" disabled>
                <i className="fas fa-exclamation-triangle" aria-hidden="true" />
                &nbsp;&nbsp;Error Getting Location
              </Button>
            ) : (
              <Button
                className="btn"
                type="button"
                onClick={(ev) => {
                  setGeolocating(true);

                  navigator.geolocation.getCurrentPosition(
                    // success function called when geolocation succeeds
                    (position) => {
                      const locatorTask = new Locator({
                        url: services.data.locatorUrl,
                      });
                      const params = {
                        location: new Point({
                          x: position.coords.longitude,
                          y: position.coords.latitude,
                        }),
                      };

                      locatorTask
                        .locationToAddress(params)
                        .then((candidate) => {
                          setGeolocating(false);
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
                {/* don't display the loading indicator in IE11 */}
                {!geolocating || isIE() ? (
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
              </Button>
            )}
          </>
        )}
      </Form>
    </>
  );
}

export default LocationSearch;
