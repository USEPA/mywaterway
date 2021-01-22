// @flow

import React from 'react';
import { navigate } from '@reach/router';
import styled from 'styled-components';
import { isIE } from 'components/pages/LocationMap/MapFunctions';
// components
import { StyledErrorBox } from 'components/shared/MessageBoxes';
// contexts
import { EsriModulesContext } from 'contexts/EsriModules';
import { LocationSearchContext } from 'contexts/locationSearch';
import { useServicesContext } from 'contexts/LookupFiles';
// helpers
import { containsScriptTag, isHuc12, splitSuggestedSearch } from 'utils/utils';
// styles
import { colors } from 'styles/index.js';
// errors
import { invalidSearchError } from 'config/errorMessages';

// Polls the dom, based on provided classname and timeout, until the esri search
// input is added. Once the input is added this calls the provided callback.
function poll({
  className,
  checkText = false,
  timeout = 250,
  callback,
}: {
  className: string,
  checkText: boolean,
  timeout: number,
  callback: Function,
}) {
  const items = document.getElementsByClassName(className);
  if (items.length === 0 || (checkText && items[0].innerText === '')) {
    setTimeout(
      () => poll({ className, checkText, timeout, callback }),
      timeout,
    );
  } else {
    callback(items);
  }
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
`;

// --- components ---
type Props = {
  route: string,
  label: Node,
};

function LocationSearch({ route, label }: Props) {
  const services = useServicesContext();
  const { FeatureLayer, Locator, Point, Search, watchUtils } = React.useContext(
    EsriModulesContext,
  );
  const { searchText, watershed, huc12 } = React.useContext(
    LocationSearchContext,
  );

  // geolocating state for updating the 'Use My Location' button
  const [geolocating, setGeolocating] = React.useState(false);

  // geolocationError state for disabling the 'Use My Location' button
  const [geolocationError, setGeolocationError] = React.useState(false);

  // initialize inputText from searchText context
  const [inputText, setInputText] = React.useState(searchText);
  const [selectedResult, setSelectedResult] = React.useState(null);

  // update inputText whenever searchText changes (i.e. Form onSubmit)
  React.useEffect(() => setInputText(searchText), [searchText]);

  const [errorMessage, setErrorMessage] = React.useState('');

  // Initialize the esri search widget
  const [searchWidget, setSearchWidget] = React.useState(null);
  React.useEffect(() => {
    if (searchWidget) return;

    const placeholder = 'Search by address, zip code, or place...';
    const search = new Search({
      allPlaceholder: placeholder,
      container: 'search-container',
      locationEnabled: false,
      label: 'Search',
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
    });

    // poll until the sources menu is visible
    poll({
      className: 'esri-search__source',
      checkText: true,
      callback: (sources) => {
        sources.forEach((source) => {
          if (source.innerText === 'ArcGIS World Geocoding Service') {
            source.innerText = 'Address, zip code, and place search';
          }
        });
      },
    });

    // create a watcher for the input text
    watchUtils.watch(
      search,
      'searchTerm',
      (newVal, oldVal, propName, event) => {
        setSelectedResult(null);
        setInputText(newVal);

        // poll until the suggestion div is visible
        poll({
          className: 'esri-menu__header',
          callback: (headers) => {
            headers.forEach((header) => {
              if (header.innerText === 'ArcGIS World Geocoding Service') {
                header.innerText = 'Address, zip code, and place search';
              }
            });
          },
        });
      },
    );

    watchUtils.watch(
      search,
      'suggestions',
      (newVal, oldVal, propName, event) => {
        // poll until the suggestion div is visible
        poll({
          className: 'esri-menu__header',
          callback: (headers) => {
            setTimeout(() => {
              let first = true;

              headers.forEach((header) => {
                if (header.innerText === 'ArcGIS World Geocoding Service') {
                  header.innerText = 'Address, zip code, and place search';
                }

                if (header.innerText.indexOf('EPA Tribal Areas') > -1) {
                  if (first) {
                    header.style.display = 'block';
                    header.innerText = 'EPA Tribal Areas';
                    first = false;
                    return;
                  }

                  header.style.display = 'none';
                }
              });
            }, 100);
          },
        });
      },
    );

    // create a watcher for the selected suggestion. This is used for getting
    // the lat/long of the selected suggestion, to ensure the locator zooms to the
    // suggestion rather than the highest scored text.
    // (ex. user searches for "Beaver" and selects the Alaska Reservations option,
    // this code ensures the map zooms to Beaver Alaska instead of Beaver Ohio)
    watchUtils.watch(
      search,
      'selectedResult',
      (newVal, oldVal, propName, event) => {
        if (newVal) {
          setSelectedResult(newVal);
        } else {
          setSelectedResult(null);
        }
      },
    );

    setSearchWidget(search);
  }, [
    FeatureLayer,
    Locator,
    Search,
    watchUtils,
    searchWidget,
    services,
    searchText,
  ]);

  // Initialize the esri search widget value with the search text.
  React.useEffect(() => {
    if (!searchWidget) return;

    // Remove coordinates if search text was from non-esri suggestions
    searchWidget.searchTerm = splitSuggestedSearch(
      Point,
      searchText,
    ).searchPart;
  }, [Point, searchWidget, searchText]);

  // Adds additional info to search box if the search was a huc12
  React.useEffect(() => {
    if (!searchWidget) return;

    // Remove coordinates if search text was from non-esri suggestions
    const searchTerm = splitSuggestedSearch(Point, searchText).searchPart;

    // Set the input text to be more detailed if the search is a huc
    if (inputText === searchTerm && isHuc12(inputText) && watershed && huc12) {
      searchWidget.searchTerm = `WATERSHED: ${watershed} (${huc12})`;
    }
  }, [Point, searchWidget, searchText, huc12, inputText, watershed]);

  // Starts a poll which eventually sets the id of the esri search input.
  // This code is needed to work aroudn a 508 compliance issue. Adding the
  // id to the Search constructor (above) does not add an id to the DOM element.
  const [pollInitialized, setPollInitialized] = React.useState(false);
  React.useEffect(() => {
    if (pollInitialized) return;

    setPollInitialized(true);

    poll({
      className: 'esri-search__input',
      callback: (searchInputs) => {
        searchInputs[0].setAttribute('id', 'hmw-search-input');
      },
    });
  }, [pollInitialized]);

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

          if (containsScriptTag(inputText)) {
            setErrorMessage(invalidSearchError);
            return;
          }

          // get urlSearch parameter value
          let urlSearch = null;
          if (selectedResult) {
            const center = selectedResult.extent.center;
            urlSearch = `${inputText.trim()}|${center.longitude}, ${
              center.latitude
            }`;
          } else if (inputText) {
            urlSearch = inputText.trim();
          }

          // navigate if the urlSearch value is available
          if (urlSearch) {
            setErrorMessage('');
            setGeolocationError(false);

            // only navigate if search box contains text
            navigate(encodeURI(route.replace('{urlSearch}', urlSearch)));
          }
        }}
      >
        <SearchBox id="search-container" />

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
