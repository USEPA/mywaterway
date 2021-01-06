// @flow

import React from 'react';
import styled from 'styled-components';
import Select from 'react-select';
// components
import { LinkButton } from 'components/shared/LinkButton';
import LoadingSpinner from 'components/shared/LoadingSpinner';
// contexts
import { EsriModulesContext } from 'contexts/EsriModules';
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
  const { widgetLayers, addWidgetLayer } = React.useContext(
    AddDataWidgetContext,
  );
  const { mapView } = React.useContext(LocationSearchContext);
  const {
    CSVLayer,
    GeoRSSLayer,
    KMLLayer,
    Layer,
    WMSLayer,
    //WMTSLayer, // not yet supported in the 4.X API
  } = React.useContext(EsriModulesContext);

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
    mapView.map.add(layer);

    layer.on('layerview-create', (event) => {
      addWidgetLayer(layer);
      setStatus('success');
    });

    layer.on('layerview-create-error', (event) => {
      console.error('create error event: ', event);

      mapView.map.remove(layer);

      setStatus('failure');
    });

    setLayer(null);
  }, [mapView, layer, addWidgetLayer, widgetLayers, url, urlType]);

  if (!mapView) return null;

  const handleAdd = (ev: React.MouseEvent<HTMLButtonElement>) => {
    // make sure the url hasn't already been added
    const index = widgetLayers.findIndex(
      (layer) => layer.url?.toLowerCase() === url.toLowerCase(),
    );
    if (index > -1) {
      setStatus('already-added');
      return;
    }

    setStatus('fetching');

    const type = urlType.value;

    let layer = null;
    if (type === 'ArcGIS') {
      // add this layer to the url layers
      Layer.fromArcGISServerUrl({ url })
        .then((layer) => {
          setLayer(layer);
        })
        .catch((err) => {
          console.error(err);
          setStatus('failure');
        });
      return;
    }
    if (type === 'WMS') {
      layer = new WMSLayer({ url });
    }
    /* // not supported in 4.x js api
        if(type === 'WFS') {
          layer = new WFSLayer({ url });
        } */
    if (type === 'KML') {
      layer = new KMLLayer({ url });
    }
    if (type === 'GeoRSS') {
      layer = new GeoRSSLayer({ url });
    }
    if (type === 'CSV') {
      layer = new CSVLayer({ url });
    }

    // unsupported layer type
    if (layer) {
      // add this layer to the url layers
      setLayer(layer);
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
      {status === 'success' && urlLayerSuccessMessage}
      {status === 'failure' && urlLayerFailureMessage(url)}
      {status === 'unsupported' && unsupportedLayerMessage(urlType.label)}
      {status === 'already-added' && urlAlreadyAddedMessage(url)}
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
              <p>
                http://imagery.arcgisonline.com/ArcGIS/rest/services/LandsatGLS/VegetationAnalysis/ImageServer
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
