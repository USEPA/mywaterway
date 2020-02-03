// @flow

import React from 'react';
import type { Node } from 'react';
import { loadModules } from 'esri-loader';
// config
import { esriApiUrl } from 'config/esriConfig';
import {
  waterbodyService,
  wbd,
  mappedWater,
  locatorUrl,
} from 'config/mapServiceConfig';
// utilities
import {
  getEnvironmentString,
  logCallToGoogleAnalytics,
} from 'utils/fetchUtils';

// --- components ---
export const EsriModulesContext: Object = React.createContext({
  modulesLoaded: false,
});

type Props = { children: Node };
type State = { modulesLoaded: boolean };

export class EsriModulesProvider extends React.Component<Props, State> {
  state: State = {
    modulesLoaded: false,
  };

  componentDidMount() {
    loadModules(
      [
        'esri/config',
        'esri/Graphic',
        'esri/Viewpoint',
        'esri/core/Collection',
        'esri/core/watchUtils',
        'esri/geometry/Point',
        'esri/geometry/Polygon',
        'esri/geometry/SpatialReference',
        'esri/geometry/support/webMercatorUtils',
        'esri/layers/FeatureLayer',
        'esri/layers/GraphicsLayer',
        'esri/layers/MapImageLayer',
        'esri/layers/GroupLayer',
        'esri/symbols/PictureMarkerSymbol',
        'esri/symbols/SimpleFillSymbol',
        'esri/symbols/SimpleLineSymbol',
        'esri/symbols/SimpleMarkerSymbol',
        'esri/tasks/Locator',
        'esri/tasks/QueryTask',
        'esri/tasks/support/Query',
        'esri/widgets/BasemapGallery',
        'esri/widgets/BasemapGallery/support/PortalBasemapsSource',
        'esri/widgets/Expand',
        'esri/widgets/Home',
        'esri/widgets/LayerList',
        'esri/widgets/LayerList/ListItem',
        'esri/widgets/ScaleBar',
      ],
      { url: esriApiUrl },
    )
      .then(
        ([
          esriConfig,
          Graphic,
          Viewpoint,
          Collection,
          watchUtils,
          Point,
          Polygon,
          SpatialReference,
          webMercatorUtils,
          FeatureLayer,
          GraphicsLayer,
          MapImageLayer,
          GroupLayer,
          PictureMarkerSymbol,
          SimpleFillSymbol,
          SimpleLineSymbol,
          SimpleMarkerSymbol,
          Locator,
          QueryTask,
          Query,
          BasemapGallery,
          PortalBasemapsSource,
          Expand,
          Home,
          LayerList,
          ListItem,
          ScaleBar,
        ]) => {
          // $FlowFixMe
          this.setState({
            modulesLoaded: true,
            Graphic,
            Viewpoint,
            Collection,
            watchUtils,
            Point,
            Polygon,
            SpatialReference,
            webMercatorUtils,
            FeatureLayer,
            GraphicsLayer,
            MapImageLayer,
            GroupLayer,
            PictureMarkerSymbol,
            SimpleFillSymbol,
            SimpleLineSymbol,
            SimpleMarkerSymbol,
            Locator,
            QueryTask,
            Query,
            BasemapGallery,
            PortalBasemapsSource,
            Expand,
            Home,
            LayerList,
            ListItem,
            ScaleBar,
          });

          // intercept esri calls to gispub
          const urls = [
            waterbodyService.points,
            waterbodyService.lines,
            waterbodyService.areas,
            waterbodyService.summary,
            wbd,
            mappedWater,
            locatorUrl,
          ];
          esriConfig.request.interceptors.push({
            urls,

            // Workaround for ESRI CORS cacheing issue, when switching between
            // environments.
            before: function(params) {
              // if this environment has a phony variable use it
              const envString = getEnvironmentString();
              if (envString) {
                params.requestOptions.query[envString] = 1;
              }
            },

            // Log esri api calls to Google Analytics
            after: function(response) {
              logCallToGoogleAnalytics(response.url);
            },
          });
        },
      )
      .catch((err) => {
        console.error(err);
      });
  }

  render() {
    return (
      <EsriModulesContext.Provider value={this.state}>
        {this.props.children}
      </EsriModulesContext.Provider>
    );
  }
}
