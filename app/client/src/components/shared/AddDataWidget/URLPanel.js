// @flow

import React from 'react';
import styled from 'styled-components';
import Select from 'react-select';
import CSVLayer from '@arcgis/core/layers/CSVLayer';
import GeoRSSLayer from '@arcgis/core/layers/GeoRSSLayer';
import KMLLayer from '@arcgis/core/layers/KMLLayer';
import Layer from '@arcgis/core/layers/Layer';
import WMSLayer from '@arcgis/core/layers/WMSLayer';
// import WMTSLayer from '@arcgis/core/layers/WMTSLayer'; // not yet supported in the 4.X API
// components
import { LinkButton } from 'components/shared/LinkButton';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { StyledErrorBox, StyledNoteBox } from 'components/shared/MessageBoxes';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
import { AddDataWidgetContext } from 'contexts/AddDataWidget';
// config
import {
  unsupportedLayerMessage,
  urlAlreadyAddedMessage,
  urlLayerFailureMessage,
  urlLayerSuccessMessage,
} from 'config/errorMessages';

// --- styles (URLPanel) ---
const MessageBoxStyles = `
  margin-bottom: 10px;
  word-break: break-word;
`;

const ErrorBox = styled(StyledErrorBox)`
  ${MessageBoxStyles}
`;

const NoteBox = styled(StyledNoteBox)`
  ${MessageBoxStyles}
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const AddButton = styled.button`
  margin: 0;
  min-width: 50%;
  font-weight: normal;
  font-size: 12px;
`;

const UrlInput = styled.input`
  width: 100%;
  height: 36px;
  padding: 2px 8px;
  border-width: 1px;
  border-style: solid;
  border-radius: 4px;
  border-color: hsl(0, 0%, 80%);
`;

const StyledLinkButton = styled(LinkButton)`
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
  const { widgetLayers, setWidgetLayers } = React.useContext(
    AddDataWidgetContext,
  );
  const { mapView } = React.useContext(LocationSearchContext);

  // filters
  const [
    urlType,
    setUrlType, //
  ] = React.useState({
    value: 'ArcGIS',
    label: 'An ArcGIS Server Web Service',
  });
  const [url, setUrl] = React.useState('');
  const [showSampleUrls, setShowSampleUrls] = React.useState(false);
  const [status, setStatus] = React.useState('none');

  const [layer, setLayer] = React.useState(null);
  React.useEffect(() => {
    if (!mapView || !layer) return;

    // add the layer to the map
    setWidgetLayers((currentWidgetLayers) => [...currentWidgetLayers, layer]);
    setStatus('success');
    setLayer(null);
  }, [mapView, layer, setWidgetLayers, widgetLayers, url, urlType]);

  if (!mapView) return null;

  const handleAdd = (ev: React.MouseEvent<HTMLButtonElement>) => {
    // make sure the url hasn't already been added
    const index = widgetLayers.findIndex(
      (tempLayer) => tempLayer.url?.toLowerCase() === url.toLowerCase(),
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
          setLayer(tempLayer);
        })
        .catch((err) => {
          console.error(err);
          setStatus('failure');
        });
      return;
    }
    if (type === 'WMS') {
      newLayer = new WMSLayer({ url });
    }
    /* // not supported in 4.x js api
        if(type === 'WFS') {
          layer = new WFSLayer({ url });
        } */
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
      setLayer(newLayer);
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
          { value: 'WMS', label: 'A WMS OGC Web Service' },
          // {value: 'WFS', label: 'A WFS OGC Web Service'}, // not supported in 4.x yet
          { value: 'KML', label: 'A KML File' },
          { value: 'GeoRSS', label: 'A GeoRSS File' },
          { value: 'CSV', label: 'A CSV File' },
        ]}
      />
      <br />
      <label htmlFor="url-upload-input">URL</label>
      <UrlInput
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
      {status === 'success' && <NoteBox>{urlLayerSuccessMessage}</NoteBox>}
      {status === 'failure' && (
        <ErrorBox>{urlLayerFailureMessage(url)}</ErrorBox>
      )}
      {status === 'unsupported' && (
        <ErrorBox>{unsupportedLayerMessage(urlType.label)}</ErrorBox>
      )}
      {status === 'already-added' && (
        <NoteBox>{urlAlreadyAddedMessage(url)}</NoteBox>
      )}
      <ButtonContainer>
        <StyledLinkButton
          type="button"
          onClick={() => setShowSampleUrls(!showSampleUrls)}
        >
          SAMPLE URL(S)
        </StyledLinkButton>
        <AddButton type="submit" onClick={handleAdd}>
          ADD
        </AddButton>
      </ButtonContainer>

      {showSampleUrls && (
        <React.Fragment>
          {urlType.value === 'ArcGIS' && (
            <div>
              <p>
                http://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Cities/FeatureServer/0
              </p>
              <p>
                http://services.arcgisonline.com/ArcGIS/rest/services/Demographics/USA_Tapestry/MapServer
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
          {/* Not supported in 4.x JS API
          {urlType.value === 'WFS' && (
            <div>
              <p>https://dservices.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/services/JapanPrefectures2018/WFSServer</p>
            </div>
          )} 
          */}
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
                http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.csv
              </p>
            </div>
          )}
        </React.Fragment>
      )}
    </form>
  );
}

export default URLPanel;
