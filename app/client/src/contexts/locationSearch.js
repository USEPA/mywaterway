import React from 'react';
import EsriHelper from 'utils/EsriHelper';
import { navigate } from '@reach/router';

export const LocationSearchContext = React.createContext();

type Props = {
  children: Node,
};

type State = {
  initialExtent: Object,
  highlighOptions: Object,
  searchText: string,
  lastSearchText: String,
  huc12: string,
  lastHuc12: string,
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
  waterbodyLayer: Object,
  issuesLayer: Object,
  monitoringStationsLayer: Object,
  dischargersLayer: Object,
  nonprofitsLayer: Object,
  providersLayer: Object,
  boundariesLayer: Object,
  searchIconLayer: Object,
  actionsLayer: Object,
  selWaterBodyLayer: Object,
  homeWidget: Object,
  hucBoundaries: Object,
  atHucBoundaries: boolean,
  countyBoundaries: Object,
  waterbodyData: Array<Object>,
  linesData: Array<Object>,
  areasData: Array<Object>,
  pointsData: Array<Object>,
  esriHelper: Object,
  pointsLayer: Object,
  linesLayer: Object,
  areasLayer: Object,
  summaryLayerMaxRecordCount: ?number,
  watershedsLayerMaxRecordCount: ?number,

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
    highlightOptions: {
      color: '#32C5FD',
      fillOpacity: 1,
    },
    searchText: '',
    lastSearchText: '',
    huc12: '',
    lastHuc12: '',
    watershed: '',
    address: '',
    fishingInfo: { status: 'fetching', data: [] },
    statesData: { status: 'fetching', data: [] },
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
    providersLayer: '',
    boundariesLayer: '',
    searchIconLayer: '',
    actionsLayer: '',
    selWaterBodyLayer: '',
    homeWidget: null,
    visibleLayers: {},
    hucBoundaries: '',
    atHucBoundaries: false,
    countyBoundaries: '',
    waterbodyData: null,
    linesData: null,
    areasData: null,
    pointsData: null,
    esriHelper: new EsriHelper(),

    pointsLayer: '',
    linesLayer: '',
    areasLayer: '',
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
    setAtHucBoundaries: (atHucBoundaries) => {
      this.setState({ atHucBoundaries });
    },
    setCountyBoundaries: (countyBoundaries) => {
      this.setState({ countyBoundaries });
    },
    setHuc12: (huc12) => {
      this.setState({ huc12 });
    },
    setLastHuc12: (lastHuc12) => {
      this.setState({ lastHuc12 });
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

    setAddress: (address) => {
      this.setState({ address });
    },
    setAssessmentUnitId: (assessmentUnitId) => {
      this.setState({ assessmentUnitId });
    },
    setMapView: (mapView) => {
      this.setState({ mapView });
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
    setPointsLayer: (pointsLayer) => {
      this.setState({ pointsLayer });
    },
    setLinesLayer: (linesLayer) => {
      this.setState({ linesLayer });
    },
    setAreasLayer: (areasLayer) => {
      this.setState({ areasLayer });
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
    setVisibleLayers: (visibleLayers) => {
      this.setState({ visibleLayers });
    },
    setWaterbodyData: (waterbodyData) => {
      this.setState({ waterbodyData });
    },
    setLinesData: (linesData) => {
      this.setState({ linesData });
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

    resetMap: (useDefaultZoom = false) => {
      const {
        initialExtent,
        pointsLayer,
        linesLayer,
        areasLayer,
        providersLayer,
        boundariesLayer,
        searchIconLayer,
        monitoringStationsLayer,
        dischargersLayer,
        nonprofitsLayer,
        mapView,
        homeWidget,
        waterbodyLayer,
      } = this.state;

      // Clear waterbody layers from state
      let clear = {};
      if (pointsLayer) clear['pointsLayer'] = null;
      if (linesLayer) clear['linesLayer'] = null;
      if (areasLayer) clear['areasLayer'] = null;
      if (waterbodyLayer) {
        clear['waterbodyLayer'] = null;

        // Remove the waterbody layer from the map
        if (mapView) {
          for (let i = mapView.map.layers.items.length - 1; i >= 0; i--) {
            const item = mapView.map.layers.items[i];
            if (item.id === 'waterbodyLayer') {
              mapView.map.layers.items.splice(i, 1);
            }
          }
        }
      }
      this.setState(clear);

      // remove all map content defined in this file
      if (providersLayer) providersLayer.graphics.removeAll();
      if (boundariesLayer) boundariesLayer.graphics.removeAll();
      if (searchIconLayer) searchIconLayer.graphics.removeAll();
      if (monitoringStationsLayer) monitoringStationsLayer.graphics.removeAll();
      if (dischargersLayer) dischargersLayer.graphics.removeAll();
      if (nonprofitsLayer) nonprofitsLayer.graphics.removeAll();

      // reset the zoom and home widget to the initial extent
      if (useDefaultZoom && mapView) {
        mapView.extent = initialExtent;
        homeWidget.viewpoint = mapView.viewpoint;
      }
    },

    resetData: () => {
      this.setState({
        huc12: '',
        watershed: '',
        pointsData: null,
        linesData: null,
        areasData: null,
        countyBoundaries: '',
        atHucBoundaries: false,
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
      this.state.resetMap();
    },

    setNoDataAvailable: () => {
      this.setState(
        {
          huc12: '',
          watershed: '',
          pointsData: [],
          linesData: [],
          areasData: [],
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
