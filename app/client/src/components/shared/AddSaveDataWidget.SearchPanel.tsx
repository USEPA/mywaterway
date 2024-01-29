/** @jsxImportSource @emotion/react */

import {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { css } from '@emotion/react';
import Select from 'react-select';
import Layer from '@arcgis/core/layers/Layer';
import Portal from '@arcgis/core/portal/Portal';
import PortalItem from '@arcgis/core/portal/PortalItem';
import PortalQueryParams from '@arcgis/core/portal/PortalQueryParams';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { errorBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
import { useAddSaveDataWidgetState } from 'contexts/AddSaveDataWidget';
// config
import { webServiceErrorMessage } from 'config/errorMessages';
// styles
import { reactSelectStyles } from 'styles/index';
// types
import type { WidgetLayer } from 'types';
// utilities
import { isGroupLayer, isTileLayer } from 'utils/mapFunctions';

const searchFlexBoxStyles = css`
  display: flex;
  flex-flow: wrap;
  justify-content: space-between;
  align-items: center;
  margin: 2.5px;
`;

const searchFlexItemStyles = css`
  flex: 1 1 175px;
  margin: 2.5px;
`;

const searchContainerStyles = css`
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const selectStyles = css`
  width: 100%;
`;

const searchInputStyles = css`
  margin: 0;
  padding-left: 8px;
  border: none;
  border-radius: 4px;
  height: 36px;

  /* width = 100% - width of search button  */
  width: calc(100% - 37px);
`;

const searchSeparatorStyles = css`
  align-self: stretch;
  background-color: #ccc;
  margin-bottom: 8px;
  margin-top: 8px;
  padding-right: 1px;
  box-sizing: border-box;
`;

const searchButtonStyles = css`
  margin: 0;
  height: 36px;
  width: 36px;
  padding: 10px;
  background-color: white;
  color: #ccc;
  border: none;
  border-radius: 4px;
`;

const checkboxStyles = css`
  margin-right: 5px;
`;

const hiddenText = `
  font: 0/0 a, sans-serif;
  text-indent: -999em;
`;

const labelHiddenTextStyles = css`
  ${hiddenText}
  margin: 0;
  display: block;
`;

const buttonHiddenTextStyles = css`
  ${hiddenText}
`;

const filterContainerStyles = css`
  display: flex;
  flex-wrap: wrap;
  margin: 2.5px;
`;

const filterOptionStyles = css`
  margin: 5px;
`;

const textSelectStyles = css`
  cursor: pointer;
`;

const typeSelectStyles = css`
  position: absolute;
  background: white;
  border: 1px solid #ccc;
  border-radius: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  z-index: 2;

  ul {
    padding: 0.5em;
    list-style-type: none;
  }

  li,
  input,
  label {
    cursor: pointer;
  }
`;

const buttonSelectStyles = css`
  width: 100%;
  height: 35px;
  margin: 0;
  border-radius: 0;
  font-weight: normal;
  font-size: 12px;
  text-align: left;
  background-color: white;
  color: black;

  &:hover {
    background-color: #f1f1f1;
  }
`;

const sortOrderStyles = css`
  color: black;
  width: 10px;
  background-color: white;
  padding: 0;
  margin: 0 5px;

  &:disabled {
    cursor: default;
  }
`;

const newTabDisclaimerStyles = css`
  display: block;
  margin: 0;
  padding: 0.75em 0.5em;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
`;

// --- types ---
interface QueryParams {
  query: string;
  sortOrder: 'asc' | 'desc';
  sortField?:
    | 'title'
    | 'uploaded'
    | 'modified'
    | 'username'
    | 'created'
    | 'type'
    | 'owner'
    | 'avg-rating'
    | 'num-ratings'
    | 'num-comments'
    | 'num-views';
}

type SortBy =
  | { value: 'none'; label: 'Relevance'; defaultSort: 'desc' }
  | { value: 'title'; label: 'Title'; defaultSort: 'asc' }
  | { value: 'owner'; label: 'Owner'; defaultSort: 'asc' }
  | { value: 'avg-rating'; label: 'Rating'; defaultSort: 'desc' }
  | { value: 'num-views'; label: 'Views'; defaultSort: 'desc' }
  | { value: 'modified'; label: 'Date'; defaultSort: 'desc' };

// --- components (SearchPanel) ---
function SearchPanel() {
  const { pageNumber, setPageNumber, searchResults, setSearchResults } =
    useAddSaveDataWidgetState();

  const locationList = [
    { value: '161a24e10b8d405d97492264589afd0b', label: 'Suggested Content' },
    { value: 'ArcGIS Online', label: 'ArcGIS Online' },
  ];

  // filters
  const [
    location,
    setLocation, //
  ] = useState(locationList[0]);
  const [search, setSearch] = useState('');
  const [searchText, setSearchText] = useState('');
  const [mapService, setMapService] = useState(false);
  const [featureService, setFeatureService] = useState(false);
  const [imageService, setImageService] = useState(false);
  const [vectorTileService, setVectorTileService] = useState(false);
  const [kml, setKml] = useState(false);
  const [wms, setWms] = useState(false);

  const [sortBy, setSortBy] = useState<SortBy>({
    value: 'none',
    label: 'Relevance',
    defaultSort: 'desc',
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Builds and executes the search query on search button click
  useEffect(() => {
    setSearchResults({ status: 'fetching', data: null });

    const tmpPortal = new Portal();

    function appendToQuery(
      fullQuery: string,
      part: string,
      separator: string = 'AND',
    ) {
      // nothing to append
      if (part.length === 0) return fullQuery;

      // append the query part
      if (fullQuery.length > 0) return `${fullQuery} ${separator} (${part})`;
      else return `(${part})`;
    }

    let query = '';
    // search box
    if (search) {
      query = appendToQuery(query, search);
    }

    if (location.label === 'Suggested Content') {
      query = appendToQuery(query, `group: "${location.value}"`);
    }

    // type selection
    let typePart = '';
    const defaultTypePart =
      'type:"Map Service" OR type:"Feature Service" OR type:"Image Service" ' +
      'OR type:"Vector Tile Service" OR type:"KML" OR type:"WMS"';
    if (mapService) {
      typePart = appendToQuery(typePart, 'type:"Map Service"', 'OR');
    }
    if (featureService) {
      typePart = appendToQuery(typePart, 'type:"Feature Service"', 'OR');
    }
    if (imageService) {
      typePart = appendToQuery(typePart, 'type:"Image Service"', 'OR');
    }
    if (vectorTileService) {
      typePart = appendToQuery(typePart, 'type:"Vector Tile Service"', 'OR');
    }
    if (kml) {
      typePart = appendToQuery(typePart, 'type:"KML"', 'OR');
    }
    if (wms) {
      typePart = appendToQuery(typePart, 'type:"WMS"', 'OR');
    }

    // add the type selection to the query, use all types if all types are set to false
    if (typePart.length > 0) query = appendToQuery(query, typePart);
    else query = appendToQuery(query, defaultTypePart);

    // build the query parameters
    let queryParams: QueryParams = {
      query,
      sortOrder,
    };

    // if a sort by (other than relevance) is selected, add it to the query params

    if (sortBy.value !== 'none') {
      queryParams.sortField = sortBy.value;
    } else {
      queryParams.sortField = 'num-views';
    }

    // perform the query
    tmpPortal
      .queryItems(new PortalQueryParams(queryParams))
      .then((res) => {
        if (res.total > 0) {
          setSearchResults({ status: 'success', data: res });
          setPageNumber(1);
        } else {
          setSearchResults({ status: 'success', data: null });
          setPageNumber(1);
        }
      })
      .catch((err) => {
        console.error(err);
        setSearchResults({ status: 'failure', data: null });
      });
  }, [
    location,
    search,
    setSearchResults,
    mapService,
    featureService,
    imageService,
    vectorTileService,
    kml,
    wms,
    sortBy,
    sortOrder,
    setPageNumber,
  ]);

  // Runs the query for changing pages of the result set
  const [lastPageNumber, setLastPageNumber] = useState(1);
  useEffect(() => {
    if (!searchResults.data || pageNumber === lastPageNumber) return;

    // prevent running the same query multiple times
    setLastPageNumber(pageNumber);

    // get the query
    let queryParams = searchResults.data.queryParams;
    if (pageNumber === 1) {
      // going to first page
      queryParams.start = 1;
    }
    if (pageNumber > lastPageNumber) {
      // going to next page
      queryParams = searchResults.data.nextQueryParams;
    }
    if (pageNumber < lastPageNumber) {
      // going to previous page
      queryParams.start = queryParams.start - queryParams.num;
    }

    // perform the query
    const tmpPortal = new Portal();
    tmpPortal
      .queryItems(queryParams)
      .then((res) => {
        setSearchResults({ status: 'success', data: res });
      })
      .catch((err) => {
        console.error(err);
        setSearchResults({ status: 'failure', data: null });
      });
  }, [pageNumber, lastPageNumber, searchResults, setSearchResults]);

  const [showFilterOptions, setShowFilterOptions] = useState(false);

  const [showSortOptions, setShowSortOptions] = useState(false);

  return (
    <Fragment>
      <div>
        <div css={searchFlexBoxStyles}>
          <div css={searchFlexItemStyles}>
            <label css={labelHiddenTextStyles} htmlFor="location-select">
              Search In
            </label>
            <Select
              css={selectStyles}
              inputId="location-select"
              isSearchable={false}
              options={locationList}
              value={location}
              onChange={(ev) => {
                if (!ev) return;
                setLocation(ev);

                // trigger a re-query
                setSearch(searchText);
              }}
              styles={reactSelectStyles}
            />
          </div>
          <div css={searchFlexItemStyles}>
            <form
              css={searchContainerStyles}
              onSubmit={(ev) => {
                ev.preventDefault();
              }}
            >
              <input
                css={searchInputStyles}
                aria-label="Search"
                value={searchText}
                placeholder={'Search...'}
                onChange={(ev) => setSearchText(ev.target.value)}
              />
              <span css={searchSeparatorStyles} />
              <button
                css={searchButtonStyles}
                type="submit"
                onClick={(_ev) => setSearch(searchText)}
              >
                <i className="fas fa-search"></i>
                <span css={buttonHiddenTextStyles}>Search</span>
              </button>
            </form>
          </div>
        </div>

        <div css={filterContainerStyles}>
          <div css={filterOptionStyles}>
            <span
              css={textSelectStyles}
              onClick={() => {
                setShowFilterOptions(!showFilterOptions);
                setShowSortOptions(false);
              }}
            >
              Type <i className="fas fa-caret-down"></i>
            </span>
            {showFilterOptions && (
              <div css={typeSelectStyles}>
                <ul>
                  <li>
                    <input
                      css={checkboxStyles}
                      id="map_service_filter"
                      type="checkbox"
                      checked={mapService}
                      onChange={(_ev) => setMapService(!mapService)}
                    />
                    <label htmlFor="map_service_filter">Map Service</label>
                  </li>

                  <li>
                    <input
                      css={checkboxStyles}
                      id="feature_service_filter"
                      type="checkbox"
                      checked={featureService}
                      onChange={(_ev) => setFeatureService(!featureService)}
                    />
                    <label htmlFor="feature_service_filter">
                      Feature Service
                    </label>
                  </li>

                  <li>
                    <input
                      css={checkboxStyles}
                      id="image_service_filter"
                      type="checkbox"
                      checked={imageService}
                      onChange={(_ev) => setImageService(!imageService)}
                    />
                    <label htmlFor="image_service_filter">Image Service</label>
                  </li>

                  <li>
                    <input
                      css={checkboxStyles}
                      id="vector_tile_service_filter"
                      type="checkbox"
                      checked={vectorTileService}
                      onChange={(_ev) =>
                        setVectorTileService(!vectorTileService)
                      }
                    />
                    <label htmlFor="vector_tile_service_filter">
                      Vector Tile Service
                    </label>
                  </li>

                  <li>
                    <input
                      css={checkboxStyles}
                      id="kml_filter"
                      type="checkbox"
                      checked={kml}
                      onChange={(_ev) => setKml(!kml)}
                    />
                    <label htmlFor="kml_filter">KML</label>
                  </li>

                  <li>
                    <input
                      css={checkboxStyles}
                      id="wms_filter"
                      type="checkbox"
                      checked={wms}
                      onChange={(_ev) => setWms(!wms)}
                    />
                    <label htmlFor="wms_filter">WMS</label>
                  </li>
                </ul>
              </div>
            )}
          </div>
          <div css={filterOptionStyles}>
            <span
              css={textSelectStyles}
              onClick={() => {
                setShowSortOptions(!showSortOptions);
                setShowFilterOptions(false);
              }}
            >
              {sortBy.label} <i className="fas fa-caret-down"></i>
            </span>
            {showSortOptions && (
              <div css={typeSelectStyles}>
                <button
                  css={buttonSelectStyles}
                  onClick={() => {
                    setShowSortOptions(false);
                    setSortOrder('desc');
                    setSortBy({
                      value: 'none',
                      label: 'Relevance',
                      defaultSort: 'desc',
                    });
                  }}
                >
                  Relevance
                </button>

                <button
                  css={buttonSelectStyles}
                  onClick={() => {
                    setShowSortOptions(false);
                    setSortOrder('asc');
                    setSortBy({
                      value: 'title',
                      label: 'Title',
                      defaultSort: 'asc',
                    });
                  }}
                >
                  Title
                </button>

                <button
                  css={buttonSelectStyles}
                  onClick={() => {
                    setShowSortOptions(false);
                    setSortOrder('asc');
                    setSortBy({
                      value: 'owner',
                      label: 'Owner',
                      defaultSort: 'asc',
                    });
                  }}
                >
                  Owner
                </button>

                <button
                  css={buttonSelectStyles}
                  onClick={() => {
                    setShowSortOptions(false);
                    setSortOrder('desc');
                    setSortBy({
                      value: 'avg-rating',
                      label: 'Rating',
                      defaultSort: 'desc',
                    });
                  }}
                >
                  Rating
                </button>

                <button
                  css={buttonSelectStyles}
                  onClick={() => {
                    setShowSortOptions(false);
                    setSortOrder('desc');
                    setSortBy({
                      value: 'num-views',
                      label: 'Views',
                      defaultSort: 'desc',
                    });
                  }}
                >
                  Views
                </button>

                <button
                  css={buttonSelectStyles}
                  onClick={() => {
                    setShowSortOptions(false);
                    setSortOrder('desc');
                    setSortBy({
                      value: 'modified',
                      label: 'Date',
                      defaultSort: 'desc',
                    });
                  }}
                >
                  Data
                </button>
              </div>
            )}

            {sortBy.value !== 'none' && (
              <button
                css={sortOrderStyles}
                onClick={() =>
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                }
              >
                <i
                  className={`fas fa-long-arrow-alt-${
                    sortOrder === 'desc' ? 'up' : 'down'
                  }`}
                ></i>
                <span css={buttonHiddenTextStyles}>
                  {sortOrder === 'desc' ? 'Sort Ascending' : 'Sort Descending'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          overflow: 'auto',
          height: 'calc(100% - 74px)',
          backgroundColor: '#efefef',
        }}
      >
        {searchResults?.data?.results &&
          searchResults.data.results.length > 0 && (
            <em css={newTabDisclaimerStyles}>
              Links below open in a new browser tab.
            </em>
          )}
        <div>
          {searchResults.status === 'fetching' && <LoadingSpinner />}
          {searchResults.status === 'failure' && (
            <div css={errorBoxStyles}>{webServiceErrorMessage}</div>
          )}
          {searchResults.status === 'success' && (
            <Fragment>
              <div role="list">
                {searchResults.data?.results.map((result) => {
                  return <ResultCard result={result} key={result.id} />;
                })}
              </div>
              {!searchResults.data && (
                <div style={{ margin: '10px 1em' }}>
                  No items for this search criteria.
                </div>
              )}
            </Fragment>
          )}
        </div>
      </div>
    </Fragment>
  );
}

const cardContainerStyles = (width: number) => {
  return css`
    min-height: 70px;
    padding: 5px;
    border: 1px solid #e0e0e0;
    background-color: white;
    display: ${width > 200 || width === 0 ? 'block' : 'flex'};
    flex-flow: column;
  `;
};

const cardThumbnailStyles = css`
  float: left;
  margin-right: 10px;
  height: 60px;
  width: 90px;
`;

const cardTitleStyles = css`
  margin: 0;
  padding: 0;
  font-family: 'Merriweather Web', 'Georgia', 'Cambria', 'Times New Roman',
    'Times', serif;
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
`;

const cardInfoStyles = css`
  font-size: 11px;
  color: #545454;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  padding-top: 3px;
`;

const cardButtonContainerStyles = css`
  text-align: right;
  margin-top: 5px;
`;

const cardMessageStyles = css`
  font-size: 11px;
  font-style: italic;
  margin-left: 4px;
  margin-right: 4px;
`;

const cardButtonStyles = css`
  font-size: 13px;
  margin: 0 5px 0 0;
  padding: 0.3em 0.7em;

  :hover {
    background-color: rgba(64, 97, 142, 1);
  }
`;

const cardLinkStyles = css`
  font-size: 14px;
  display: inline-block;
  margin: 0 0 0 5px;
  padding: 5px 0 5px 5px;
  text-transform: uppercase;
`;

// --- components (ResultCard) ---
type ResultCardProps = {
  result: any;
};

function ResultCard({ result }: ResultCardProps) {
  const { widgetLayers, setWidgetLayers } = useAddSaveDataWidgetState();
  const { mapView } = useContext(LocationSearchContext);

  // Used to determine if the layer for this card has been added or not
  const [added, setAdded] = useState(false);
  useEffect(() => {
    setAdded(
      widgetLayers.findIndex(
        (widgetLayer) =>
          widgetLayer.type === 'portal' &&
          widgetLayer.layer.portalItem?.id === result.id,
      ) !== -1,
    );
  }, [widgetLayers, result]);

  // removes the esri watch handle when the card is removed from the DOM.
  const [status, setStatus] = useState('');
  const [watcher, setWatcher] = useState<__esri.WatchHandle | null>(null);
  useEffect(() => {
    return function cleanup() {
      if (watcher) watcher.remove();
    };
  }, [watcher]);

  /**
   * Adds non-hmw layers as reference portal layers.
   */
  const addRefLayer = useCallback(() => {
    if (!mapView?.map) return;

    setStatus('loading');

    Layer.fromPortalItem({
      portalItem: new PortalItem({
        id: result.id,
      }),
    }).then((layer) => {
      // setup the watch event to see when the layer finishes loading
      const newWatcher = reactiveUtils.watch(
        () => layer.loadStatus,
        () => {
          const loadStatus = layer.loadStatus;
          // set the status based on the load status
          if (loadStatus === 'loaded') {
            setStatus('');

            // set the min/max scale for tile layers
            if (isTileLayer(layer)) {
              const tileLayer = layer;
              tileLayer.minScale = 0;
              tileLayer.maxScale = 0;
            }

            layer.visible = true;

            // make all child layers visible, if applicable
            if (isGroupLayer(layer)) {
              layer.layers.forEach((tempLayer: Layer) => {
                tempLayer.visible = true;
              });
            }
            if ('sublayers' in layer) {
              (layer as __esri.TileLayer).sublayers.forEach(
                (tempLayer: __esri.Sublayer) => {
                  tempLayer.visible = true;
                },
              );
            }
          } else if (loadStatus === 'failed') {
            setStatus('error');
          }
        },
      );

      setWatcher(newWatcher);

      // add the layer to the map
      setWidgetLayers((currentWidgetLayers: WidgetLayer[]) => [
        ...currentWidgetLayers,
        {
          type: 'portal',
          layerType: result.type,
          id: result.id,
          layer,
          url: result.url,
        },
      ]);
    });
  }, [mapView, result, setWidgetLayers]);

  /**
   * Removes the reference portal layers.
   */
  function removeRefLayer() {
    if (!mapView?.map) return;

    // get the layers to be removed
    const layersToRemove = mapView.map.allLayers.filter((layer: any) => {
      // had to use any, since some layer types don't have portalItem
      return layer?.portalItem?.id === result.id;
    });

    // remove the layers from the map and session storage.
    if (layersToRemove.length > 0) {
      setWidgetLayers((currentWidgetLayers) =>
        currentWidgetLayers.filter(
          (widgetLayer) =>
            widgetLayer.type === 'portal' &&
            widgetLayer.layer.portalItem?.id !== result.id,
        ),
      );
    }
  }

  let statusStr = '';
  if (status === 'loading') statusStr = 'Adding...';
  if (status === 'error') statusStr = 'Add Failed';

  const infoStr = `${result.type} by ${result.owner}`;

  // Updates the styles when the add data widget shrinks below
  // 200 pixels wide
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardWidth, setCardWidth] = useState(0);
  useEffect(() => {
    if (!cardRef?.current) return;

    function handleResize() {
      if (!cardRef?.current) return;
      setCardWidth(cardRef.current.clientWidth);
    }
    window.addEventListener('resize', handleResize);
  }, [cardRef]);

  return (
    <div
      aria-label={result.title}
      ref={cardRef}
      css={cardContainerStyles(cardWidth)}
      role="listitem"
    >
      <img
        css={cardThumbnailStyles}
        src={result.thumbnailUrl}
        alt={`${result.title} Thumbnail`}
      />
      <div css={cardTitleStyles} title={result.title}>
        {result.title}
      </div>
      <div css={cardInfoStyles} title={infoStr}>
        {infoStr}
      </div>
      <div css={cardButtonContainerStyles}>
        <span css={cardMessageStyles} title={statusStr}>
          {status === 'loading' && 'Adding...'}
          {status === 'error' && 'Add Failed'}
        </span>
        {mapView?.map && (
          <Fragment>
            {!added && (
              <button
                css={cardButtonStyles}
                disabled={status === 'loading'}
                onClick={() => {
                  addRefLayer();
                }}
              >
                Add
              </button>
            )}
            {added && !status && (
              <button
                css={cardButtonStyles}
                onClick={() => {
                  removeRefLayer();
                }}
              >
                Remove
              </button>
            )}
          </Fragment>
        )}
        <a
          css={cardLinkStyles}
          href={`https://arcgis.com/home/item.html?id=${result.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Details
        </a>
        <a
          className="exit-disclaimer"
          href="https://www.epa.gov/home/exit-epa"
          target="_blank"
          rel="noopener noreferrer"
        >
          Exit
        </a>
      </div>
    </div>
  );
}

export default SearchPanel;
