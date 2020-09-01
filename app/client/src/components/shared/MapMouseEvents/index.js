import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { navigate } from '@reach/router';
// contexts
import { MapHighlightContext } from 'contexts/MapHighlight';
import { EsriModulesContext } from 'contexts/EsriModules';
import { LocationSearchContext } from 'contexts/locationSearch';
// config
import { wbd } from 'config/mapServiceConfig';
import {
  getPopupContent,
  getPopupTitle,
  graphicComparison,
} from 'components/pages/LocationMap/MapFunctions';
// styles
import { colors } from 'styles/index.js';

// --- components ---
type Props = {
  // map and view props auto passed from parent Map component by react-arcgis
  map: any,
  view: any,
};

function MapMouseEvents({ map, view }: Props) {
  const {
    setHighlightedGraphic,
    setSelectedGraphic, //
  } = React.useContext(MapHighlightContext);

  const { getHucBoundaries, resetData } = React.useContext(
    LocationSearchContext,
  );

  const {
    SpatialReference,
    Point,
    webMercatorUtils,
    Query,
    QueryTask,
  } = React.useContext(EsriModulesContext);

  const processBoundariesData = React.useCallback(
    (boundaries) => {
      // exit early if the user clicked where there are no huc boundaries
      if (
        !boundaries ||
        !boundaries.features ||
        boundaries.features.length < 1 ||
        !boundaries.features[0].attributes ||
        !boundaries.features[0].attributes.huc12
      ) {
        return;
      }

      const { attributes } = boundaries.features[0];
      const clickedHuc12 = attributes.huc12;
      // display the "Change location" popup if the user clicked in a
      // different huc 12 or if no huc 12 has been selected
      const popupContent = document.createElement('div');
      popupContent.style.margin = '0 13px';
      popupContent.innerHTML = renderToStaticMarkup(
        <>
          <br />
          <div>
            <p>
              <strong style={{ fontSize: '0.875em' }}>WATERSHED:</strong>
              <br />
              {attributes.name} ({clickedHuc12})
            </p>
          </div>
        </>,
      );
      const buttonContainer = document.createElement('div');
      buttonContainer.style.textAlign = 'center';

      const noButton = document.createElement('button');
      noButton.innerHTML = 'No';
      noButton.title = 'Stay at the current location';
      noButton.className = 'btn';
      noButton.style.marginRight = '15px';
      noButton.style.fontSize = '0.9375em';
      noButton.style.backgroundColor = 'lightgray';
      noButton.onclick = function (ev) {
        view.popup.close();
      };

      const yesButton = document.createElement('button');
      yesButton.innerHTML = 'Yes';
      yesButton.title = 'Change to this location';
      yesButton.className = 'btn';
      yesButton.style.fontSize = '0.9375em';
      yesButton.style.color = colors.white();
      yesButton.style.backgroundColor = colors.blue();
      yesButton.onclick = function (ev) {
        // Clear all data before navigating.
        // The main reason for this is better performance
        // when doing a huc search by clicking on the state map. The app
        // will attempt to use all of the loaded state data, then clear it
        // then load the huc. This could take a long time if the state
        // has a lot of waterbodies.
        resetData();

        let baseRoute = `/community/${clickedHuc12}`;

        // community will attempt to stay on the same tab
        // if available, stay on the same tab otherwise go to overview
        let urlParts = window.location.pathname.split('/');
        if (urlParts.includes('community') && urlParts.length > 3) {
          navigate(`${baseRoute}/${urlParts[3]}`);
          return;
        }

        navigate(`${baseRoute}/overview`);
      };

      buttonContainer.appendChild(noButton);
      buttonContainer.appendChild(yesButton);
      popupContent.appendChild(buttonContainer);

      // close any already opened popups, and create a new one
      view.popup.close();
      view.popup.open({
        title: 'Change to this location?',
        content: popupContent,
      });
    },
    [resetData, view.popup],
  );

  const handleMapClick = React.useCallback(
    (event, view) => {
      // get the point location of the user's click
      const point = new Point({
        x: event.mapPoint.longitude,
        y: event.mapPoint.latitude,
        spatialReference: SpatialReference.WQGS84,
      });
      const location = webMercatorUtils.geographicToWebMercator(point);

      // perform a hittest on the click location
      view
        .hitTest(event)
        .then((res) => {
          // get and update the selected graphic
          const graphic = getGraphicFromResponse(res);
          if (graphic && graphic.attributes) {
            setSelectedGraphic(graphic);
          } else {
            setSelectedGraphic('');
          }

          // get the currently selected huc boundaries, if applicable
          const hucBoundaries = getHucBoundaries();
          // only look for huc boundaries if no graphics were clicked and the
          // user clicked outside of the selected huc boundaries
          if (
            !graphic &&
            (!hucBoundaries ||
              hucBoundaries.features.length === 0 ||
              !hucBoundaries.features[0].geometry.contains(location))
          ) {
            //get the huc boundaries of where the user clicked
            const query = new Query({
              returnGeometry: true,
              geometry: location,
              outFields: ['*'],
            });

            new QueryTask({ url: wbd })
              .execute(query)
              .then((boundaries) => {
                if (boundaries.features.length === 0) return;

                processBoundariesData(boundaries);
              })
              .catch((err) => console.error(err));
          }
        })
        .catch((err) => console.error(err));
    },
    [
      Point,
      Query,
      QueryTask,
      SpatialReference.WQGS84,
      getHucBoundaries,
      processBoundariesData,
      setSelectedGraphic,
      webMercatorUtils,
    ],
  );

  // Sets up the map mouse events when the component initializes
  const [initialized, setInitialized] = React.useState(false);
  React.useEffect(() => {
    if (initialized) return;

    // These global scoped variables are used to prevent flickering that is caused
    // by the hitTest async events occurring out of order. The global scoped variables
    // are needed because the esri hit test event won't be able to read react state
    // variables.
    var lastFeature = null;
    var lastEventId = -1;

    const handleMapMouseOver = (event, view) => {
      view
        .hitTest(event)
        .then((res) => {
          // only use the latest event id to perform the highligh
          if (event.eventId < lastEventId) return;
          lastEventId = event.eventId;

          // get the graphic from the hittest
          let feature = getGraphicFromResponse(res);

          // ensure the graphic actually changed prior to setting the context variable
          const equal = graphicComparison(feature, lastFeature);
          if (!equal) {
            setHighlightedGraphic(feature);
            lastFeature = feature;
          }
        })
        .catch((err) => console.error(err));
    };

    // setup the mouse click and mouse over events
    view.on('click', (event) => {
      handleMapClick(event, view);
    });

    view.on('pointer-move', (event) => {
      handleMapMouseOver(event, view);
    });

    view.popup.watch('selectedFeature', (graphic) => {
      // check if monitoring station is clicked, load the popup and call the waterqualitydata service
      if (
        graphic &&
        graphic.layer &&
        graphic.layer.id === 'monitoringStationsLayer' &&
        graphic.attributes &&
        graphic.attributes.fullPopup === false
      ) {
        loadMonitoringLocation(graphic);
      }
    });

    // auto expands the popup when it is first opened
    view.popup.watch('visible', (graphic) => {
      if (view.popup.visible) view.popup.collapsed = false;
    });

    setInitialized(true);
  }, [view, handleMapClick, setHighlightedGraphic, initialized]);

  function getGraphicFromResponse(res: Object) {
    if (!res.results || res.results.length === 0) return null;

    const match = res.results.filter((result) => {
      const { attributes: attr } = result.graphic;
      // ignore huc 12 boundaries, map-marker, highlight and provider graphics
      const excludedLayers = [
        'mappedWaterLayer',
        'countyLayer',
        'watershedsLayer',
        'wsioHealthIndexLayer',
        'boundaries',
        'map-marker',
        'highlight',
        'providers',
      ];
      if (attr.name && excludedLayers.indexOf(attr.name) !== -1) return null;
      if (excludedLayers.indexOf(result.graphic.layer.id) !== -1) return null;

      // filter out graphics on basemap layers
      if (result.graphic.layer.type === 'vector-tile') return null;

      return result;
    });

    return match[0] ? match[0].graphic : null;
  }

  const loadMonitoringLocation = (graphic) => {
    // tell the getPopupContent function to use the full popup version that includes the service call
    graphic.attributes.fullPopup = true;
    graphic.popupTemplate = {
      title: getPopupTitle(graphic.attributes),
      content: getPopupContent({ feature: graphic }),
    };
  };

  return null;
}

export default MapMouseEvents;
