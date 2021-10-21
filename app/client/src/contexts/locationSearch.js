import React from 'react';
import EsriHelper from 'utils/EsriHelper';
import { navigate } from '@reach/router';
import { resetCanonicalLink, removeJsonLD } from 'utils/utils';

export const LocationSearchContext = React.createContext();

type Props = {
  children: Node,
};

type State = {
  initialExtent: Object,
  currentExtent: Object,
  upstreamExtent: Object,
  highlighOptions: Object,
  searchText: string,
  lastSearchText: string,
  huc12: string,
  assessmentUnitCount: ?number,
  assessmentUnitIDs: Array<string>,
  watershed: string,
  address: string,
  assessmentUnitId: string,
  monitoringLocations: Object,
  permittedDischargers: Object,
  grts: Object,
  attainsPlans: Object,
  drinkingWater: Object,
  cipSummary: Object,
  nonprofits: Object,
  mapView: Object,
  layers: Object[],
  basemap: Object,
  waterbodyLayer: Object,
  issuesLayer: Object,
  monitoringStationsLayer: Object,
  dischargersLayer: Object,
  nonprofitsLayer: Object,
  wildScenicRiversLayer: Object,
  protectedAreasLayer: Object,
  providersLayer: Object,
  boundariesLayer: Object,
  searchIconLayer: Object,
  actionsLayer: Object,
  selWaterBodyLayer: Object,
  wsioHealthIndexLayer: Object,
  allWaterbodiesLayer: Object,
  allWaterbodiesLayerVisible: boolean,
  homeWidget: Object,
  upstreamWidget: Object,
  upstreamWidgetDisabled: boolean,
  allWaterbodiesWidget: Object,
  allWaterbodiesWidgetDisabled: boolean,
  hucBoundaries: Object,
  atHucBoundaries: boolean,
  countyBoundaries: Object,
  waterbodyData: Array<Object>,
  linesData: Array<Object>,
  areasData: Array<Object>,
  pointsData: Array<Object>,
  orphanFeatures: Array<Object>,
  waterbodyCountMismatch: boolean,
  esriHelper: Object,
  pointsLayer: Object,
  linesLayer: Object,
  areasLayer: Object,
  upstreamLayer: Object,
  upstreamLayerVisible: boolean,
  errorMessage: string,
  summaryLayerMaxRecordCount: ?number,
  watershedsLayerMaxRecordCount: ?number,
  FIPS: Object,

  // monitoring panel
  showAllMonitoring: boolean,
  monitoringGroups: Object,

  // identified issues panel
  showDischargers: boolean,
  showPolluted: boolean,
  pollutionParameters: Object,
};

export class LocationSearchProvider extends React.Component<Props, State> {
  state: State = {
    initialExtent: {
      xmin: -15634679.853814237,
      ymin: -3023256.7294788733,
      xmax: -5713765.078627277,
      ymax: 12180985.440778064,
      spatialReference: { wkid: 102100 },
    },
    currentExtent: '',
    upstreamExtent: '',
    highlightOptions: {
      color: '#32C5FD',
      fillOpacity: 1,
    },
    searchText: '',
    lastSearchText: '',
    huc12: '',
    assessmentUnitCount: null,
    assessmentUnitIDs: [],
    watershed: '',
    address: '',
    fishingInfo: { status: 'fetching', data: [] },
    statesData: { status: 'fetching', data: [] },
    wsioHealthIndexData: { status: 'fetching', data: [] },
    wildScenicRiversData: { status: 'fetching', data: [] },
    protectedAreasData: { status: 'fetching', data: [], fields: [] },
    assessmentUnitId: '',
    monitoringLocations: {
      status: 'fetching',
      data: [],
    },
    permittedDischargers: {
      status: 'fetching',
      data: [],
    },
    grts: {
      status: 'fetching',
      data: [],
    },
    attainsPlans: {
      status: 'fetching',
      data: [],
    },
    drinkingWater: {
      status: 'fetching',
      data: [],
    },
    cipSummary: {
      status: 'fetching',
      data: [],
    },
    nonprofits: {
      status: 'fetching',
      data: [],
    },
    mapView: '',
    layers: [],
    waterbodyLayer: '',
    issuesLayer: '',
    monitoringStationsLayer: '',
    dischargersLayer: '',
    nonprofitsLayer: '',
    wildScenicRiversLayer: '',
    protectedAreasLayer: '',
    protectedAreasHighlightLayer: '',
    providersLayer: '',
    boundariesLayer: '',
    searchIconLayer: '',
    actionsLayer: '',
    selWaterBodyLayer: '',
    wsioHealthIndexLayer: '',
    allWaterbodiesLayer: '',
    allWaterbodiesLayerVisible: true,
    homeWidget: null,
    upstreamWidget: null,
    upstreamWidgetDisabled: false,
    allWaterbodiesWidget: null,
    allWaterbodiesWidgetDisabled: false,
    visibleLayers: {},
    basemap: {},
    hucBoundaries: '',
    atHucBoundaries: false,
    countyBoundaries: '',
    waterbodyData: null,
    linesData: null,
    areasData: null,
    pointsData: null,
    orphanFeatures: { features: [], status: 'fetching' },
    waterbodyCountMismatch: null,
    esriHelper: new EsriHelper(),
    FIPS: {
      stateCode: '',
      countyCode: '',
      status: 'fetching',
    },

    pointsLayer: '',
    linesLayer: '',
    areasLayer: '',
    upstreamLayer: '',
    upstreamLayerVisible: false,
    errorMessage: '',
    summaryLayerMaxRecordCount: null,
    watershedsLayerMaxRecordCount: null,

    // monitoring panel
    showAllMonitoring: true,
    monitoringGroups: null,

    // identified issues panel
    showAllPolluted: true,
    pollutionParameters: null,

    // current drinking water subtab (0, 1, or 2)
    drinkingWaterTabIndex: 0,

    setSearchText: (searchText) => {
      this.setState({ searchText });
    },
    setLastSearchText: (lastSearchText) => {
      this.setState({ lastSearchText });
    },
    setMonitoringLocations: (monitoringLocations) => {
      this.setState({ monitoringLocations });
    },
    setPermittedDischargers: (permittedDischargers) => {
      this.setState({ permittedDischargers });
    },
    setNonprofits: (nonprofits) => {
      this.setState({ nonprofits });
    },
    setHucBoundaries: (hucBoundaries) => {
      this.setState({ hucBoundaries });
    },
    setCurrentExtent: (currentExtent) => {
      this.setState({ currentExtent });
    },
    setErrorMessage: (errorMessage) => {
      this.setState({ errorMessage });
    },
    setUpstreamExtent: (upstreamExtent) => {
      this.setState({ upstreamExtent });
    },
    setUpstreamWidgetDisabled: (upstreamWidgetDisabled) => {
      this.setState({ upstreamWidgetDisabled });
    },
    setAtHucBoundaries: (atHucBoundaries) => {
      this.setState({ atHucBoundaries });
    },
    setCountyBoundaries: (countyBoundaries) => {
      this.setState({ countyBoundaries });
    },
    setHuc12: (huc12) => {
      this.setState({ huc12 });
    },
    setAssessmentUnitCount: (assessmentUnitCount) => {
      this.setState({ assessmentUnitCount });
    },
    setAssessmentUnitIDs: (assessmentUnitIDs) => {
      this.setState({ assessmentUnitIDs });
    },
    setWatershed: (watershed) => {
      this.setState({ watershed });
    },
    setFishingInfo: (fishingInfo) => {
      this.setState({ fishingInfo });
    },
    setStatesData: (statesData) => {
      this.setState({ statesData });
    },
    setWsioHealthIndexData: (wsioHealthIndexData) => {
      this.setState({ wsioHealthIndexData });
    },
    setWildScenicRiversData: (wildScenicRiversData) => {
      this.setState({ wildScenicRiversData });
    },
    setProtectedAreasData: (protectedAreasData) => {
      this.setState({ protectedAreasData });
    },
    setAddress: (address) => {
      this.setState({ address });
    },
    setAssessmentUnitId: (assessmentUnitId) => {
      this.setState({ assessmentUnitId });
    },
    setMapView: (mapView) => {
      this.setState({ mapView });
    },
    getMapView: () => {
      return this.state.mapView;
    },
    getHuc12: () => {
      return this.state.huc12;
    },
    getWatershed: () => {
      return this.state.watershed;
    },
    getUpstreamLayer: () => {
      return this.state.upstreamLayer;
    },
    getUpstreamWidgetDisabled: () => {
      return this.state.upstreamWidgetDisabled;
    },
    getAllWaterbodiesLayer: () => {
      return this.state.allWaterbodiesLayer;
    },
    getCurrentExtent: () => {
      return this.state.currentExtent;
    },
    getUpstreamExtent: () => {
      return this.state.upstreamExtent;
    },
    getAllWaterbodiesWidgetDisabled: () => {
      return this.state.allWaterbodiesWidgetDisabled;
    },
    setLayers: (layers) => {
      this.setState({ layers });
    },
    setWaterbodyLayer: (waterbodyLayer) => {
      this.setState({ waterbodyLayer });
    },
    setIssuesLayer: (issuesLayer) => {
      this.setState({ issuesLayer });
    },
    setMonitoringStationsLayer: (monitoringStationsLayer) => {
      this.setState({ monitoringStationsLayer });
    },
    setDischargersLayer: (dischargersLayer) => {
      this.setState({ dischargersLayer });
    },
    setNonprofitsLayer: (nonprofitsLayer) => {
      this.setState({ nonprofitsLayer });
    },
    setWildScenicRiversLayer: (wildScenicRiversLayer) => {
      this.setState({ wildScenicRiversLayer });
    },
    setProtectedAreasLayer: (protectedAreasLayer) => {
      this.setState({ protectedAreasLayer });
    },
    setProtectedAreasHighlightLayer: (protectedAreasHighlightLayer) => {
      this.setState({ protectedAreasHighlightLayer });
    },
    setProvidersLayer: (providersLayer) => {
      this.setState({ providersLayer });
    },
    setBoundariesLayer: (boundariesLayer) => {
      this.setState({ boundariesLayer });
    },
    setSearchIconLayer: (searchIconLayer) => {
      this.setState({ searchIconLayer });
    },
    setActionsLayer: (actionsLayer) => {
      this.setState({ actionsLayer });
    },
    setSelWaterbodyLayer: (selWaterbodyLayer) => {
      this.setState({ selWaterbodyLayer });
    },
    setWsioHealthIndexLayer: (wsioHealthIndexLayer) => {
      this.setState({ wsioHealthIndexLayer });
    },
    setAllWaterbodiesLayer: (allWaterbodiesLayer) => {
      this.setState({ allWaterbodiesLayer });
    },
    setAllWaterbodiesLayerVisible: (allWaterbodiesLayerVisible) => {
      this.setState({ allWaterbodiesLayerVisible });
    },
    setPointsLayer: (pointsLayer) => {
      this.setState({ pointsLayer });
    },
    setLinesLayer: (linesLayer) => {
      this.setState({ linesLayer });
    },
    setAreasLayer: (areasLayer) => {
      this.setState({ areasLayer });
    },
    setUpstreamLayer: (upstreamLayer) => {
      this.setState({ upstreamLayer });
    },
    setUpstreamLayerVisible: (upstreamLayerVisible) => {
      this.setState({ upstreamLayerVisible });
    },
    setSummaryLayerMaxRecordCount: (summaryLayerMaxRecordCount) => {
      this.setState({ summaryLayerMaxRecordCount });
    },
    setWatershedsLayerMaxRecordCount: (watershedsLayerMaxRecordCount) => {
      this.setState({ watershedsLayerMaxRecordCount });
    },
    setHomeWidget: (homeWidget) => {
      this.setState({ homeWidget });
    },
    setUpstreamWidget: (upstreamWidget) => {
      this.setState({ upstreamWidget });
    },
    setAllWaterbodiesWidget: (allWaterbodiesWidget) => {
      this.setState({ allWaterbodiesWidget });
    },
    setAllWaterbodiesWidgetDisabled: (allWaterbodiesWidgetDisabled) => {
      this.setState({ allWaterbodiesWidgetDisabled });
    },
    setVisibleLayers: (visibleLayers) => {
      this.setState({ visibleLayers });
    },
    setBasemap: (basemap) => {
      this.setState({ basemap });
    },
    setWaterbodyData: (waterbodyData) => {
      this.setState({ waterbodyData });
    },
    setLinesData: (linesData) => {
      this.setState({ linesData });
    },
    setOrphanFeatures: (orphanFeatures) => {
      this.setState({ orphanFeatures });
    },
    setWaterbodyCountMismatch: (waterbodyCountMismatch) => {
      this.setState({ waterbodyCountMismatch });
    },
    setAreasData: (areasData) => {
      this.setState({ areasData });
    },
    setPointsData: (pointsData) => {
      this.setState({ pointsData });
    },
    setGrts: (grts) => {
      this.setState({ grts });
    },
    setAttainsPlans: (attainsPlans) => {
      this.setState({ attainsPlans });
    },
    setDrinkingWater: (drinkingWater) => {
      this.setState({ drinkingWater });
    },
    setCipSummary: (cipSummary) => {
      this.setState({ cipSummary });
    },
    setCipSummaryStatus: (cipSummaryStatus) => {
      this.setState({ cipSummaryStatus });
    },
    setShowAllMonitoring: (showAllMonitoring) => {
      this.setState({ showAllMonitoring });
    },
    setMonitoringGroups: (monitoringGroups) => {
      this.setState({ monitoringGroups });
    },
    setShowAllPolluted: (showAllPolluted) => {
      this.setState({ showAllPolluted });
    },
    setPollutionParameters: (pollutionParameters) => {
      this.setState({ pollutionParameters });
    },
    setDrinkingWaterTabIndex: (drinkingWaterTabIndex) => {
      this.setState({ drinkingWaterTabIndex });
    },
    setFIPS: (FIPS) => {
      this.setState({ FIPS });
    },

    /////// Functions that do more than just set a single state ////////

    getHucBoundaries: () => {
      return this.state.hucBoundaries;
    },

    getAllFeatures: () => {
      //Get the features from the context
      const { linesData, areasData, pointsData } = this.state;

      // return null if no data is available
      if (!linesData && !areasData && !pointsData) return null;

      // combine available data
      let features = [];
      if (linesData) features = features.concat(linesData.features);
      if (areasData) features = features.concat(areasData.features);
      if (pointsData) features = features.concat(pointsData.features);

      return features;
    },

    // default basemap is gray but use basemap in context if it exists
    getBasemap: () => {
      return Object.keys(this.state.basemap).length === 0
        ? 'gray'
        : this.state.basemap;
    },

    resetMap: (useDefaultZoom = false) => {
      const {
        initialExtent,
        layers,
        pointsLayer,
        linesLayer,
        areasLayer,
        providersLayer,
        boundariesLayer,
        searchIconLayer,
        monitoringStationsLayer,
        upstreamLayer,
        dischargersLayer,
        nonprofitsLayer,
        protectedAreasHighlightLayer,
        mapView,
        homeWidget,
        waterbodyLayer,
        wsioHealthIndexLayer,
        wildScenicRiversLayer,
        protectedAreasLayer,
        allWaterbodiesLayer,
      } = this.state;

      // Clear waterbody layers from state
      let newState = {};
      if (pointsLayer) newState['pointsLayer'] = null;
      if (linesLayer) newState['linesLayer'] = null;
      if (areasLayer) newState['areasLayer'] = null;
      if (waterbodyLayer) newState['waterbodyLayer'] = null;

      const layersToRemove = [
        'pointsLayer',
        'linesLayer',
        'areasLayer',
        'waterbodyLayer',
      ];

      // remove the layers from state layers list
      let removedLayers = false;
      for (let i = layers.length - 1; i >= 0; i--) {
        const item = layers[i];
        const itemId = item.id;
        if (layersToRemove.includes(itemId)) {
          layers.splice(i, 1);
          removedLayers = true;
        }
      }
      if (removedLayers) newState['layers'] = layers;

      this.setState(newState);

      // hide and remove upstream layer graphics when switching locations
      if (upstreamLayer) {
        newState['upstreamLayerVisible'] = false;
        upstreamLayer.visible = false;
        upstreamLayer.listMode = 'hide';
        upstreamLayer.graphics.removeAll();
        upstreamLayer.error = false;
      }

      // remove all map content defined in this file
      if (providersLayer) providersLayer.graphics.removeAll();
      if (boundariesLayer) boundariesLayer.graphics.removeAll();
      if (searchIconLayer) {
        searchIconLayer.visible = false;
        searchIconLayer.graphics.removeAll();
      }
      if (monitoringStationsLayer) monitoringStationsLayer.graphics.removeAll();
      if (dischargersLayer) dischargersLayer.graphics.removeAll();
      if (nonprofitsLayer) nonprofitsLayer.graphics.removeAll();
      if (wsioHealthIndexLayer) {
        wsioHealthIndexLayer.visible = false;
        wsioHealthIndexLayer.listMode = 'hide';
      }
      if (protectedAreasLayer) {
        protectedAreasLayer.visible = false;
        protectedAreasLayer.listMode = 'hide';
      }
      if (protectedAreasHighlightLayer) {
        protectedAreasHighlightLayer.graphics.removeAll();
      }
      if (wildScenicRiversLayer) {
        // This timeout is to workaround an issue with the wild and scenic rivers
        // layer. When turning visibility off for multiple layers with this one
        // included, the app would crash. This timeout prevents the app from
        // crashing. Similarly setting visibleLayers to {} would crash the app.
        setTimeout(() => {
          wildScenicRiversLayer.visible = false;
          wildScenicRiversLayer.listMode = 'hide';
        }, 100);
      }

      // reset the zoom and home widget to the initial extent
      if (useDefaultZoom && mapView) {
        mapView.extent = initialExtent;

        if (allWaterbodiesLayer) {
          allWaterbodiesLayer.visible = false;
          allWaterbodiesLayer.listMode = 'hide';
        }

        if (homeWidget) {
          homeWidget.viewpoint = mapView.viewpoint;
        }
      }

      // reset lines, points, and areas layers
      if (
        waterbodyLayer &&
        waterbodyLayer.layers &&
        waterbodyLayer.layers.items
      ) {
        waterbodyLayer.layers.items = [];
      }
    },

    resetData: () => {
      this.setState({
        huc12: '',
        assessmentUnitCount: null,
        assessmentUnitIDs: null,
        watershed: '',
        pointsData: null,
        linesData: null,
        areasData: null,
        orphanFeatures: { features: [], status: 'fetching' },
        waterbodyCountMismatch: null,
        countyBoundaries: '',
        atHucBoundaries: false,
        hucBoundaries: '',
        monitoringLocations: {
          status: 'fetching',
          data: [],
        },
        permittedDischargers: {
          status: 'fetching',
          data: [],
        },
        nonprofits: {
          status: 'fetching',
          data: [],
        },
        grts: {
          status: 'fetching',
          data: [],
        },
        attainsPlans: {
          status: 'fetching',
          data: [],
        },
        cipSummary: {
          status: 'fetching',
          data: [],
        },
        drinkingWater: {
          status: 'fetching',
          data: [],
        },
      });

      // remove map content
      // only zoom out the map if we are on the community intro page at /community
      if (window.location.pathname === '/community') {
        this.state.resetMap(true);
      } else {
        this.state.resetMap(false);
      }
    },

    setNoDataAvailable: () => {
      // reset canonical geoconnex PID link
      resetCanonicalLink();

      // remove JSON LD context script
      removeJsonLD();

      this.setState(
        {
          huc12: '',
          assessmentUnitCount: null,
          assessmentUnitIDs: null,
          watershed: '',
          pointsData: [],
          linesData: [],
          areasData: [],
          orphanFeatures: { features: [], status: 'fetching' },
          waterbodyCountMismatch: null,
          countyBoundaries: '',
          monitoringLocations: {
            status: 'success',
            data: [],
          },
          permittedDischargers: {
            status: 'success',
            data: [],
          },
          nonprofits: {
            status: 'success',
            data: [],
          },
          grts: {
            status: 'success',
            data: [],
          },
          attainsPlans: {
            status: 'success',
            data: [],
          },
          cipSummary: {
            status: 'success',
            data: [],
          },
          drinkingWater: {
            status: 'success',
            data: [],
          },
          visibleLayers: {},
        },
        () => navigate('/community'),
      );

      // remove map content
      this.state.resetMap(true);
    },
  };
  render() {
    return (
      <LocationSearchContext.Provider value={this.state}>
        {this.props.children}
      </LocationSearchContext.Provider>
    );
  }
}
