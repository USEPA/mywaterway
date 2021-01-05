// @flow

import React from 'react';
import type { Node } from 'react';
import { loadModules } from 'esri-loader';
// context
import { LookupFilesContext } from 'contexts/LookupFiles';
// config
import { esriApiUrl } from 'config/esriConfig';
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
  static contextType = LookupFilesContext;
  state: State = {
    initialized: false,
    modulesLoaded: false,
  };

  componentDidUpdate() {
    const services = this.context.services;
    if (services.status !== 'success' || this.state.initialized) return;
    this.setState({ initialized: true });

    loadModules(
      [
        'esri/config',
        'esri/Graphic',
        'esri/Viewpoint',
        'esri/core/Collection',
        'esri/core/Handles',
        'esri/core/watchUtils',
        'esri/geometry/Point',
        'esri/geometry/Polygon',
        'esri/geometry/SpatialReference',
        'esri/geometry/support/webMercatorUtils',
        'esri/layers/CSVLayer',
        'esri/layers/FeatureLayer',
        'esri/layers/GeoRSSLayer',
        'esri/layers/GraphicsLayer',
        'esri/layers/KMLLayer',
        'esri/layers/Layer',
        'esri/layers/MapImageLayer',
        'esri/layers/GroupLayer',
        'esri/layers/WMSLayer',
        'esri/layers/support/Field',
        'esri/portal/Portal',
        'esri/portal/PortalItem',
        'esri/renderers/support/jsonUtils',
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
        'esri/widgets/Search',
      ],
      { url: esriApiUrl },
    )
      .then(
        ([
          esriConfig,
          Graphic,
          Viewpoint,
          Collection,
          Handles,
          watchUtils,
          Point,
          Polygon,
          SpatialReference,
          webMercatorUtils,
          CSVLayer,
          FeatureLayer,
          GeoRSSLayer,
          GraphicsLayer,
          KMLLayer,
          Layer,
          MapImageLayer,
          GroupLayer,
          WMSLayer,
          Field,
          Portal,
          PortalItem,
          rendererJsonUtils,
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
          Search,
        ]) => {
          // $FlowFixMe
          this.setState({
            modulesLoaded: true,
            Graphic,
            Viewpoint,
            Collection,
            Handles,
            watchUtils,
            Point,
            Polygon,
            SpatialReference,
            webMercatorUtils,
            CSVLayer,
            FeatureLayer,
            GeoRSSLayer,
            GraphicsLayer,
            KMLLayer,
            Layer,
            MapImageLayer,
            GroupLayer,
            WMSLayer,
            Field,
            Portal,
            PortalItem,
            rendererJsonUtils,
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
            Search,
          });

          var callId = 0;
          var callDurations = {};

          // intercept esri calls to gispub
          const urls = [
            services.data.waterbodyService.points,
            services.data.waterbodyService.lines,
            services.data.waterbodyService.areas,
            services.data.waterbodyService.summary,
            services.data.wbd,
            services.data.mappedWater,
            services.data.locatorUrl,
          ];
          esriConfig.request.interceptors.push({
            urls,

            // Workaround for ESRI CORS cacheing issue, when switching between
            // environments.
            before: function (params) {
              // if this environment has a phony variable use it
              const envString = getEnvironmentString();
              if (envString) {
                params.requestOptions.query[envString] = 1;
              }

              // add the callId to the query so we can tie the response back
              params.requestOptions.query['callId'] = callId;

              // add the call's start time to the dictionary
              callDurations[callId] = performance.now();

              // increment the callId
              callId = callId + 1;
            },

            // Log esri api calls to Google Analytics
            after: function (response) {
              // get the execution time for the call
              const callId = response.requestOptions.query.callId;
              const startTime = callDurations[callId];

              logCallToGoogleAnalytics(response.url, 200, startTime);

              // delete the execution time from the dictionary
              delete callDurations[callId];
            },

            error: function (error) {
              // get the execution time for the call
              const details = error.details;
              const callId = details.requestOptions.query.callId;
              const startTime = callDurations[callId];

              logCallToGoogleAnalytics(
                details.url,
                details.httpStatus ? details.httpStatus : error.message,
                startTime,
              );

              // delete the execution time from the dictionary
              delete callDurations[callId];
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
