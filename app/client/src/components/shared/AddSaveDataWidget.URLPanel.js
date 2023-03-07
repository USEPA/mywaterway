// @flow

import React, {
  Fragment,
  MouseEvent,
  useContext,
  useEffect,
  useState,
} from 'react';
import { css } from 'styled-components/macro';
import Select from 'react-select';
import CSVLayer from '@arcgis/core/layers/CSVLayer';
import GeoRSSLayer from '@arcgis/core/layers/GeoRSSLayer';
import KMLLayer from '@arcgis/core/layers/KMLLayer';
import Layer from '@arcgis/core/layers/Layer';
import WCSLayer from '@arcgis/core/layers/WCSLayer';
import WFSLayer from '@arcgis/core/layers/WFSLayer';
import WMSLayer from '@arcgis/core/layers/WMSLayer';
// components
import { linkButtonStyles } from 'components/shared/LinkButton';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { errorBoxStyles, noteBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
import { useAddSaveDataWidgetState } from 'contexts/AddSaveDataWidget';
// config
import {
  unsupportedLayerMessage,
  urlAlreadyAddedMessage,
  urlLayerFailureMessage,
  urlLayerSuccessMessage,
} from 'config/errorMessages';
// styles
import { colors } from 'styles/index.js';

const MessageBoxStyles = `
  margin-bottom: 10px;
  overflow-wrap: anywhere;
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles}
  ${MessageBoxStyles}
`;

const modifiedNoteBoxStyles = css`
  ${noteBoxStyles}
  ${MessageBoxStyles}
`;

const buttonContainerStyles = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const addButtonStyles = css`
  margin: 0;
  min-width: 50%;
  font-weight: normal;
  font-size: 12px;
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

const urlInputStyles = css`
  width: 100%;
  height: 36px;
  padding: 2px 8px;
  border-width: 1px;
  border-style: solid;
  border-radius: 4px;
  border-color: hsl(0, 0%, 80%);
`;

const modifiedLinkButtonStyles = css`
  ${linkButtonStyles}
  text-transform: uppercase;
  text-decoration: none;
  font-weight: normal;
  padding: 5px;

  &:hover {
    text-decoration: underline;
  }
`;

// --- components (URLPanel) ---
function URLPanel() {
  const { widgetLayers, setWidgetLayers } = useAddSaveDataWidgetState();
  const { mapView } = useContext(LocationSearchContext);

  // filters
  const [
    urlType,
    setUrlType, //
  ] = useState({
    value: 'ArcGIS',
    label: 'An ArcGIS Server Web Service',
  });
  const [url, setUrl] = useState('');
  const [showSampleUrls, setShowSampleUrls] = useState(false);
  const [status, setStatus] = useState('none');

  const [layer, setLayer] = useState(null);
  useEffect(() => {
    if (!mapView || !layer) return;

    // add the layer to the map
    setWidgetLayers((currentWidgetLayers) => [...currentWidgetLayers, layer]);
    setStatus('success');
    setLayer(null);
  }, [mapView, layer, setWidgetLayers, widgetLayers, url, urlType]);

  if (!mapView) return null;

  const handleAdd = (ev: MouseEvent<HTMLButtonElement>) => {
    // make sure the url hasn't already been added
    const index = widgetLayers.findIndex(
      (tempLayer) => tempLayer.layer.url?.toLowerCase() === url.toLowerCase(),
    );
    if (index > -1) {
      setStatus('already-added');
      return;
    }

    setStatus('fetching');

    const type = urlType.value;

    let newLayer = null;
    if (type === 'ArcGIS') {
      // add this layer to the url layers
      Layer.fromArcGISServerUrl({ url })
        .then((tempLayer) => {
          setLayer({
            type: 'url',
            urlType: type,
            url,
            layer: tempLayer,
            layerType: tempLayer.type,
          });
        })
        .catch((err) => {
          console.error(err);
          setStatus('failure');
        });
      return;
    }
    if (type === 'WCS') {
      newLayer = new WCSLayer({ url });
    }
    if (type === 'WFS') {
      newLayer = new WFSLayer({ url });
    }
    if (type === 'WMS') {
      newLayer = new WMSLayer({ url });
    }
    if (type === 'KML') {
      newLayer = new KMLLayer({ url });
    }
    if (type === 'GeoRSS') {
      newLayer = new GeoRSSLayer({ url });
    }
    if (type === 'CSV') {
      newLayer = new CSVLayer({ url });
    }

    // unsupported layer type
    if (newLayer) {
      // add this layer to the url layers
      setLayer({
        type: 'url',
        urlType: type,
        url,
        layer: newLayer,
        layerType: newLayer.type,
      });
    } else {
      setStatus('unsupported');
    }
  };

  return (
    <form
      style={{
        height: '100%',
        overflow: 'auto',
        padding: '1em',
      }}
      onSubmit={(ev) => {
        ev.preventDefault();
      }}
    >
      <label htmlFor="url-type-select">Type</label>
      <Select
        inputId="url-type-select"
        isSearchable={false}
        value={urlType}
        onChange={(ev) => {
          setUrlType(ev);
          setStatus('none');
        }}
        options={[
          { value: 'ArcGIS', label: 'An ArcGIS Server Web Service' },
          { value: 'WCS', label: 'A WCS OGC Web Service' },
          { value: 'WMS', label: 'A WMS OGC Web Service' },
          { value: 'WFS', label: 'A WFS OGC Web Service' },
          { value: 'KML', label: 'A KML File' },
          { value: 'GeoRSS', label: 'A GeoRSS File' },
          { value: 'CSV', label: 'A CSV File' },
        ]}
      />
      <br />
      <label htmlFor="url-upload-input">URL</label>
      <input
        css={urlInputStyles}
        id="url-upload-input"
        value={url}
        onChange={(ev) => {
          setUrl(ev.target.value);
          setStatus('none');
        }}
      />
      <br />
      <br />
      {status === 'fetching' && <LoadingSpinner />}
      {status === 'success' && (
        <div css={modifiedNoteBoxStyles}>{urlLayerSuccessMessage}</div>
      )}
      {status === 'failure' && (
        <div css={modifiedErrorBoxStyles}>{urlLayerFailureMessage(url)}</div>
      )}
      {status === 'unsupported' && (
        <div css={modifiedErrorBoxStyles}>
          {unsupportedLayerMessage(urlType.label)}
        </div>
      )}
      {status === 'already-added' && (
        <div css={modifiedNoteBoxStyles}>{urlAlreadyAddedMessage(url)}</div>
      )}
      <div css={buttonContainerStyles}>
        <button
          css={modifiedLinkButtonStyles}
          type="button"
          onClick={() => setShowSampleUrls(!showSampleUrls)}
        >
          SAMPLE URL(S)
        </button>
        <button
          css={addButtonStyles}
          className="btn"
          disabled={!url.trim()}
          type="submit"
          onClick={handleAdd}
        >
          ADD
        </button>
      </div>

      {showSampleUrls && (
        <Fragment>
          {urlType.value === 'ArcGIS' && (
            <div>
              <p>
                http://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Cities/FeatureServer/0
              </p>
              <p>https://giswebservices.massgis.state.ma.us/geoserver/wfs</p>
            </div>
          )}
          {urlType.value === 'WCS' && (
            <div>
              <p>
                https://sampleserver6.arcgisonline.com/arcgis/services/ScientificData/SeaTemperature/ImageServer/WCSServer
              </p>
            </div>
          )}
          {urlType.value === 'WMS' && (
            <div>
              <p>
                http://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi?service=WMS&request=GetCapabilities
              </p>
            </div>
          )}
          {urlType.value === 'WFS' && (
            <div>
              <p>https://giswebservices.massgis.state.ma.us/geoserver/wfs</p>
              <p>
                https://dservices.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/services/JapanPrefectures2018/WFSServer
              </p>
            </div>
          )}
          {urlType.value === 'KML' && (
            <div>
              <p>
                http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month_age_animated.kml
              </p>
            </div>
          )}
          {urlType.value === 'GeoRSS' && (
            <div>
              <p>http://www.gdacs.org/xml/rss.xml</p>
            </div>
          )}
          {urlType.value === 'CSV' && (
            <div>
              <p>
                https://developers.arcgis.com/javascript/latest/sample-code/layers-csv/live/earthquakes.csv
              </p>
            </div>
          )}
        </Fragment>
      )}
    </form>
  );
}

export default URLPanel;
