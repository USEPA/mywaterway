// @flow

import React from 'react';
import styled from 'styled-components';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { LinkButton } from 'components/shared/LinkButton';
import { StyledErrorBox } from 'components/shared/MessageBoxes';
import Switch from 'components/shared/Switch';
// contexts
import { EsriModulesContext } from 'contexts/EsriModules';
import { LocationSearchContext } from 'contexts/locationSearch';
import { AddDataWidgetContext } from 'contexts/AddDataWidget';
// config
import { webServiceErrorMessage } from 'config/errorMessages';

// --- styles (SearchPanel) ---
const SearchContainer = styled.form`
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const SearchInput = styled.input`
  margin: 0;
  padding-left: 8px;
  border: none;
  border-radius: 4px;
  height: 36px;

  /* width = 100% - width of search button  */
  width: calc(100% - 37px);
`;

const SearchSeparator = styled.span`
  align-self: stretch;
  background-color: #ccc;
  margin-bottom: 8px;
  margin-top: 8px;
  padding-right: 1px;
  box-sizing: border-box;
`;

const SearchButton = styled.button`
  margin: 0;
  height: 36px;
  width: 36px;
  padding: 10px;
  background-color: white;
  color: #ccc;
  border: none;
  border-radius: 4px;
`;

const Checkbox = styled.input`
  margin-right: 5px;
`;

const ButtonHiddenText = styled.span`
  font: 0/0 a, sans-serif;
  text-indent: -999em;
`;

const FilterContainer = styled.div`
  display: flex;
  flex-flow: wrap;
  justify-content: space-between;
  align-items: center;
  margin: 10px 1em;
`;

const TextSelect = styled.span`
  cursor: pointer;
`;

const TypeSelect = styled.div`
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

const LocationSelect = styled.button`
  width: 100%;
  height: 35px;
  margin: 0;
  border-radius: 0;
  font-weight: normal;
  font-size: 12px;
`;

const ButtonSelect = styled.button`
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

const SortOrder = styled.button`
  color: black;
  width: 10px;
  background-color: white;
  padding: 0;
  margin: 0 5px;

  &:disabled {
    cursor: default;
  }
`;

const ExitDisclaimer = styled.span`
  margin: 0;
  padding: 0.75em 0.5em;
  text-align: center;

  a {
    margin: 0 0 0 0.3333333333em;
  }
`;

// --- components (SearchPanel) ---
function SearchPanel() {
  const { mapView } = React.useContext(LocationSearchContext);
  const { Portal, watchUtils } = React.useContext(EsriModulesContext);
  const {
    pageNumber,
    setPageNumber,
    searchResults,
    setSearchResults,
  } = React.useContext(AddDataWidgetContext);

  // filters
  const [
    location,
    setLocation, //
  ] = React.useState({
    value: 'ArcGIS Online',
    label: 'ArcGIS Online',
  });
  const [search, setSearch] = React.useState('');
  const [searchText, setSearchText] = React.useState('');
  const [withinMap, setWithinMap] = React.useState(true);
  const [mapService, setMapService] = React.useState(false);
  const [featureService, setFeatureService] = React.useState(false);
  const [imageService, setImageService] = React.useState(false);
  const [vectorTileService, setVectorTileService] = React.useState(false);
  const [kml, setKml] = React.useState(false);
  const [wms, setWms] = React.useState(false);

  const [currentExtent, setCurrentExtent] = React.useState(null);
  const [sortBy, setSortBy] = React.useState({
    value: 'none',
    label: 'Relevance',
    defaultSort: 'desc',
  });
  const [sortOrder, setSortOrder] = React.useState('desc');

  // Builds and executes the search query on search button click
  React.useEffect(() => {
    setSearchResults({ status: 'fetching', data: null });

    const tmpPortal = new Portal();

    function appendToQuery(
      query: string,
      part: string,
      separator: string = 'AND',
    ) {
      // nothing to append
      if (part.length === 0) return query;

      // append the query part
      if (query.length > 0) return `${query} ${separator} (${part})`;
      else return `(${part})`;
    }

    let query = '';
    // search box
    if (search) {
      query = appendToQuery(query, search);
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
    let queryParams = {
      query,
      sortOrder,
    };

    if (withinMap && currentExtent) queryParams.extent = currentExtent;

    // if a sort by (other than relevance) is selected, add it to the query params
    if (sortBy.value !== 'none') {
      queryParams.sortField = sortBy.value;
    } else {
      if (!withinMap) {
        queryParams.sortField = 'num-views';
      }
    }

    // perform the query
    tmpPortal
      .queryItems(queryParams)
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
    currentExtent,
    Portal,
    location,
    search,
    setSearchResults,
    withinMap,
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
  const [lastPageNumber, setLastPageNumber] = React.useState(1);
  React.useEffect(() => {
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
  }, [Portal, pageNumber, lastPageNumber, searchResults, setSearchResults]);

  // Defines a watch event for filtering results based on the map extent
  const [watchViewInitialized, setWatchViewInitialized] = React.useState(false);
  React.useEffect(() => {
    if (!mapView || watchViewInitialized) return;

    const watchEvent = watchUtils.whenTrue(mapView, 'stationary', () => {
      setCurrentExtent(mapView.extent);
    });

    setWatchViewInitialized(true);
  }, [mapView, watchUtils, watchViewInitialized]);

  const [showLocationOptions, setShowLocationOptions] = React.useState(false);

  const [showFilterOptions, setShowFilterOptions] = React.useState(false);

  const [showSortOptions, setShowSortOptions] = React.useState(false);

  return (
    <React.Fragment>
      <div>
        <div
          style={{
            display: 'flex',
            flexFlow: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            margin: '10px 1em',
          }}
        >
          <div>
            <TextSelect
              onClick={() => setShowLocationOptions(!showLocationOptions)}
            >
              {location.label} <i className="fas fa-caret-down"></i>
            </TextSelect>
            {showLocationOptions && (
              <TypeSelect style={{ minWidth: '50%' }}>
                <LocationSelect
                  onClick={() =>
                    setLocation({
                      value: 'ArcGIS Online',
                      label: 'ArcGIS Online',
                    })
                  }
                >
                  ArcGIS Online
                </LocationSelect>
              </TypeSelect>
            )}
          </div>
          <SearchContainer
            onSubmit={(ev) => {
              ev.preventDefault();
            }}
          >
            <SearchInput
              aria-label="Search"
              value={searchText}
              placeholder={'Search...'}
              onChange={(ev) => setSearchText(ev.target.value)}
            />
            <SearchSeparator />
            <SearchButton type="submit" onClick={(ev) => setSearch(searchText)}>
              <i className="fas fa-search"></i>
              <ButtonHiddenText>Search</ButtonHiddenText>
            </SearchButton>
          </SearchContainer>
        </div>

        <FilterContainer>
          <div>
            <label
              style={{ display: 'flex', alignItems: 'center', margin: '0' }}
            >
              <Switch
                checked={withinMap}
                onChange={(ev) => setWithinMap(!withinMap)}
                ariaLabel="Within map..."
              />{' '}
              <span style={{ marginLeft: '5px' }}>Within map...</span>
            </label>
          </div>
          <div>
            <TextSelect
              onClick={() => {
                setShowFilterOptions(!showFilterOptions);
                setShowSortOptions(false);
              }}
            >
              Type <i className="fas fa-caret-down"></i>
            </TextSelect>
            {showFilterOptions && (
              <TypeSelect>
                <ul>
                  <li>
                    <Checkbox
                      id="map_service_filter"
                      type="checkbox"
                      checked={mapService}
                      onChange={(ev) => setMapService(!mapService)}
                    />
                    <label htmlFor="map_service_filter">Map Service</label>
                  </li>

                  <li>
                    <Checkbox
                      id="feature_service_filter"
                      type="checkbox"
                      checked={featureService}
                      onChange={(ev) => setFeatureService(!featureService)}
                    />
                    <label htmlFor="feature_service_filter">
                      Feature Service
                    </label>
                  </li>

                  <li>
                    <Checkbox
                      id="image_service_filter"
                      type="checkbox"
                      checked={imageService}
                      onChange={(ev) => setImageService(!imageService)}
                    />
                    <label htmlFor="image_service_filter">Image Service</label>
                  </li>

                  <li>
                    <Checkbox
                      id="vector_tile_service_filter"
                      type="checkbox"
                      checked={vectorTileService}
                      onChange={(ev) =>
                        setVectorTileService(!vectorTileService)
                      }
                    />
                    <label htmlFor="vector_tile_service_filter">
                      Vector Tile Service
                    </label>
                  </li>

                  <li>
                    <Checkbox
                      id="kml_filter"
                      type="checkbox"
                      checked={kml}
                      onChange={(ev) => setKml(!kml)}
                    />
                    <label htmlFor="kml_filter">KML</label>
                  </li>

                  <li>
                    <Checkbox
                      id="wms_filter"
                      type="checkbox"
                      checked={wms}
                      onChange={(ev) => setWms(!wms)}
                    />
                    <label htmlFor="wms_filter">WMS</label>
                  </li>
                </ul>
              </TypeSelect>
            )}
          </div>
          <div style={{ width: '100px', textAlign: 'right' }}>
            <TextSelect
              onClick={() => {
                setShowSortOptions(!showSortOptions);
                setShowFilterOptions(false);
              }}
            >
              {sortBy.label} <i className="fas fa-caret-down"></i>
            </TextSelect>
            {showSortOptions && (
              <TypeSelect>
                <ButtonSelect
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
                </ButtonSelect>

                <ButtonSelect
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
                </ButtonSelect>

                <ButtonSelect
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
                </ButtonSelect>

                <ButtonSelect
                  onClick={() => {
                    setShowSortOptions(false);
                    setSortOrder('desc');
                    setSortBy({
                      value: 'avgrating',
                      label: 'Rating',
                      defaultSort: 'desc',
                    });
                  }}
                >
                  Rating
                </ButtonSelect>

                <ButtonSelect
                  onClick={() => {
                    setShowSortOptions(false);
                    setSortOrder('desc');
                    setSortBy({
                      value: 'numviews',
                      label: 'Views',
                      defaultSort: 'desc',
                    });
                  }}
                >
                  Views
                </ButtonSelect>

                <ButtonSelect
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
                </ButtonSelect>
              </TypeSelect>
            )}

            {sortBy.value !== 'none' && (
              <SortOrder
                onClick={() =>
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                }
              >
                <i
                  className={`fas fa-long-arrow-alt-${
                    sortOrder === 'desc' ? 'up' : 'down'
                  }`}
                ></i>
                <ButtonHiddenText>
                  {sortOrder === 'desc' ? 'Sort Ascending' : 'Sort Descending'}
                </ButtonHiddenText>
              </SortOrder>
            )}
          </div>
        </FilterContainer>
      </div>

      <div
        style={{
          overflow: 'auto',
          height: 'calc(100% - 74px)',
          backgroundColor: '#efefef',
        }}
      >
        {searchResults?.data?.results && searchResults.data.results.length > 0 && (
          <ExitDisclaimer className="disclaimer">
            The following links exit the site{' '}
            <a
              className="exit-disclaimer"
              href="https://www.epa.gov/home/exit-epa"
              target="_blank"
              rel="noopener noreferrer"
            >
              Exit
            </a>
          </ExitDisclaimer>
        )}
        <div>
          {searchResults.status === 'fetching' && <LoadingSpinner />}
          {searchResults.status === 'failure' && (
            <StyledErrorBox>{webServiceErrorMessage}</StyledErrorBox>
          )}
          {searchResults.status === 'success' && (
            <React.Fragment>
              <div>
                {searchResults.data?.results.map((result, index) => {
                  return <ResultCard result={result} key={index} />;
                })}
              </div>
              {!searchResults.data && (
                <div style={{ margin: '10px 1em' }}>
                  No items for this search criteria.
                </div>
              )}
            </React.Fragment>
          )}
        </div>
      </div>
    </React.Fragment>
  );
}

// --- styles (ResultCard) ---
const CardContainer = styled.div`
  min-height: 70px;
  padding: 5px;
  border: 1px solid #e0e0e0;
  background-color: white;
  display: ${({ width }) => (width > 200 || width === 0 ? 'block' : 'flex')};
  flex-flow: column;
`;

const CardThumbnail = styled.img`
  float: left;
  margin-right: 10px;
  height: 60px;
  width: 90px;
`;

const CardTitle = styled.div`
  margin: 0;
  padding: 0;
  font-family: 'Merriweather', 'Georgia', 'Cambria', 'Times New Roman', 'Times',
    serif;
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
`;

const CardInfo = styled.div`
  font-size: 11px;
  color: #545454;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  padding-top: 3px;
`;

const CardButtonContainer = styled.div`
  text-align: right;
  margin-top: 5px;
`;

const CardMessage = styled.span`
  font-size: 11px;
  font-style: italic;
  margin-left: 4px;
  margin-right: 4px;
`;

const cardButtonStyles = `
  display: inline-block;
  font-size: 11px;
  text-decoration: none;
  text-transform: uppercase;
  padding: 5px;
  margin: 0 5px 0 0;
  font-weight: normal;

  &:disabled {
    cursor: default;
  }

  &:hover {
    text-decoration: underline;
  }
`;

const CardButton = styled(LinkButton)`
  ${cardButtonStyles}
`;

const CardLinkButton = styled.a`
  ${cardButtonStyles}
`;

// --- components (ResultCard) ---
type ResultCardProps = {
  result: any,
};

function ResultCard({ result }: ResultCardProps) {
  const { Layer, PortalItem, watchUtils } = React.useContext(
    EsriModulesContext,
  );
  const { widgetLayers, setWidgetLayers } = React.useContext(
    AddDataWidgetContext,
  );
  const { mapView } = React.useContext(LocationSearchContext);

  // Used to determine if the layer for this card has been added or not
  const [added, setAdded] = React.useState(false);
  React.useEffect(() => {
    const added =
      widgetLayers.findIndex(
        (widgetLayer) => widgetLayer.portalItem?.id === result.id,
      ) !== -1;
    setAdded(added);
  }, [widgetLayers, result]);

  // removes the esri watch handle when the card is removed from the DOM.
  const [status, setStatus] = React.useState('');
  const [watcher, setWatcher] = React.useState(null);
  React.useEffect(() => {
    return function cleanup() {
      if (watcher) watcher.remove();
    };
  }, [watcher]);

  /**
   * Adds non-tots layers as reference portal layers.
   */
  function addRefLayer() {
    if (!mapView?.map) return;

    setStatus('loading');

    Layer.fromPortalItem({
      portalItem: new PortalItem({
        id: result.id,
      }),
    }).then((layer) => {
      // setup the watch event to see when the layer finishes loading
      const watcher = watchUtils.watch(
        layer,
        'loadStatus',
        (loadStatus: string) => {
          // set the status based on the load status
          if (loadStatus === 'loaded') {
            setStatus('');

            // set the min/max scale for tile layers
            if (layer.type === 'tile') {
              const tileLayer = layer;
              tileLayer.minScale = 0;
              tileLayer.maxScale = 0;
            }

            if (mapView) {
              layer.visible = true;
            }
          } else if (loadStatus === 'failed') {
            setStatus('error');
          }
        },
      );

      setWatcher(watcher);

      // add the layer to the map
      mapView.map.add(layer);
      setWidgetLayers((widgetLayers) => [...widgetLayers, layer]);
    });
  }

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
      mapView.map.removeMany(layersToRemove.toArray());
      setWidgetLayers((widgetLayers) =>
        widgetLayers.filter(
          (widgetLayer) => widgetLayer?.portalItem?.id !== result.id,
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
  const cardRef = React.useRef();
  const [cardWidth, setCardWidth] = React.useState(0);
  React.useEffect(() => {
    if (!cardRef?.current) return;

    function handleResize() {
      if (!cardRef?.current) return;
      setCardWidth(cardRef.current.clientWidth);
    }
    window.addEventListener('resize', handleResize);
  }, [cardRef]);

  return (
    <CardContainer ref={cardRef} width={cardWidth}>
      <CardThumbnail
        src={result.thumbnailUrl}
        alt={`${result.title} Thumbnail`}
      />
      <CardTitle title={result.title}>{result.title}</CardTitle>
      <CardInfo title={infoStr}>{infoStr}</CardInfo>
      <CardButtonContainer>
        <CardMessage title={statusStr}>
          {status === 'loading' && 'Adding...'}
          {status === 'error' && 'Add Failed'}
        </CardMessage>
        {mapView?.map && (
          <React.Fragment>
            {!added && (
              <CardButton
                disabled={status === 'loading'}
                onClick={() => {
                  addRefLayer();
                }}
              >
                Add
              </CardButton>
            )}
            {added && !status && (
              <CardButton
                onClick={() => {
                  removeRefLayer();
                }}
              >
                Remove
              </CardButton>
            )}
          </React.Fragment>
        )}
        <CardLinkButton
          href={`https://arcgis.com/home/item.html?id=${result.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Details
        </CardLinkButton>
      </CardButtonContainer>
    </CardContainer>
  );
}

export default SearchPanel;
