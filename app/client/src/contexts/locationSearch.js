import Color from '@arcgis/core/Color';
import React, { Component, createContext } from 'react';
// types
import type { ReactNode } from 'react';
import type {
  Huc12SummaryData,
  MonitoringLocationGroups,
  MonitoringYearsRange,
  MonitoringWorkerData,
  ParameterToggleObject,
} from 'types';

export const LocationSearchContext = createContext();

export const initialWorkerData = {
  minYear: null,
  maxYear: null,
  annualData: {},
};

type Props = {
  children: ReactNode,
};

export type Status = 'idle' | 'fetching' | 'success' | 'failure' | 'pending';

type State = {
  initialExtent: Object,
  currentExtent: Object,
  upstreamExtent: Object,
  highlightOptions: Object,
  searchText: string,
  lastSearchText: string,
  huc12: string,
  assessmentUnitIDs: Array<string>,
  watershed: string,
  address: string,
  assessmentUnitId: string,
  grts: Object,
  attainsPlans: Object,
  drinkingWater: Object,
  cipSummary: { status: Status, data: Huc12SummaryData },
  nonprofits: Object,
  mapView: __esri.MapView | null,
  layers: Object[],
  basemap: Object,
  homeWidget: Object,
  upstreamWidget: Object,
  upstreamWidgetDisabled: boolean,
  hucBoundaries: Object,
  atHucBoundaries: boolean,
  countyBoundaries: Object,
  waterbodyData: Array<Object>,
  linesData: Array<Object>,
  areasData: Array<Object>,
  cyanWaterbodies: { status: Status, data: Array<Object> | null },
  pointsData: Array<Object>,
  orphanFeatures: Array<Object>,
  waterbodyCountMismatch: boolean,
  upstreamWatershedResponse: { status: Status, data: __esri.FeatureSet | null },
  errorMessage: string,
  summaryLayerMaxRecordCount: ?number,
  watershedsLayerMaxRecordCount: ?number,
  FIPS: Object,

  // monitoring panel
  monitoringGroups: MonitoringLocationGroups,
  monitoringFeatureUpdates: ?Object,
  monitoringYearsRange: MonitoringYearsRange,
  monitoringWorkerData: MonitoringWorkerData,

  // identified issues panel
  showAllPolluted: boolean,
  parameterToggleObject: ParameterToggleObject,
  pollutionParameters: Object,
  violatingDischargersOnly: boolean,
};

export class LocationSearchProvider extends Component<Props, State> {
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
      color: new Color([50, 197, 253]),
      fillOpacity: 0.1,
      haloColor: new Color([50, 197, 253]),
      haloOpacity: 1,
    },
    searchText: '',
    lastSearchText: '',
    huc12: '',
    assessmentUnitIDs: [],
    watershed: '',
    address: '',
    fishingInfo: { status: 'fetching', data: [] },
    statesData: { status: 'fetching', data: [] },
    wsioHealthIndexData: { status: 'fetching', data: [] },
    wildScenicRiversData: { status: 'fetching', data: [] },
    protectedAreasData: { status: 'fetching', data: [], fields: [] },
    assessmentUnitId: '',
    grts: { status: 'fetching', data: [] },
    attainsPlans: { status: 'fetching', data: {} },
    drinkingWater: { status: 'fetching', data: [] },
    cipSummary: { status: 'fetching', data: {} },
    nonprofits: { status: 'fetching', data: [] },
    mapView: null,
    layers: [],
    homeWidget: null,
    upstreamWidget: null,
    upstreamWidgetDisabled: false,
    basemap: 'gray-vector',
    hucBoundaries: '',
    atHucBoundaries: false,
    countyBoundaries: '',
    waterbodyData: null,
    linesData: null,
    areasData: null,
    pointsData: null,
    cyanWaterbodies: { status: 'idle', data: null },
    orphanFeatures: { status: 'fetching', features: [] },
    waterbodyCountMismatch: null,
    FIPS: { status: 'fetching', stateCode: '', countyCode: '' },

    upstreamWatershedResponse: { status: 'idle', data: null },
    errorMessage: '',
    summaryLayerMaxRecordCount: null,
    watershedsLayerMaxRecordCount: null,

    // monitoring panel
    monitoringGroups: null,
    monitoringFeatureUpdates: null,
    monitoringYearsRange: null,
    monitoringWorkerData: initialWorkerData,

    // identified issues panel
    showAllPolluted: true,
    parameterToggleObject: {},
    pollutionParameters: null,
    violatingDischargersOnly: false,

    // current drinking water subtab (0, 1, or 2)
    drinkingWaterTabIndex: 0,

    setSearchText: (searchText) => {
      this.setState({ searchText });
    },
    setLastSearchText: (lastSearchText) => {
      this.setState({ lastSearchText });
    },
    setNonprofits: (nonprofits: Object) => {
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
    getUpstreamWatershedResponse: () => {
      return this.state.upstreamWatershedResponse;
    },
    getUpstreamWidgetDisabled: () => {
      return this.state.upstreamWidgetDisabled;
    },
    getCurrentExtent: () => {
      return this.state.currentExtent;
    },
    getUpstreamExtent: () => {
      return this.state.upstreamExtent;
    },
    setLayers: (layers) => {
      this.setState({ layers });
    },
    setUpstreamWatershedResponse: (upstreamWatershedResponse) => {
      this.setState({ upstreamWatershedResponse });
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
    setCyanWaterbodies: (cyanWaterbodies) => {
      this.setState({ cyanWaterbodies });
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
    setCipSummary: (cipSummary: { status: Status, data: Huc12SummaryData }) => {
      this.setState({ cipSummary });
    },
    setMonitoringGroups: (monitoringGroups) => {
      this.setState({ monitoringGroups });
    },
    setMonitoringFeatureUpdates: (monitoringFeatureUpdates) => {
      this.setState({ monitoringFeatureUpdates });
    },
    setMonitoringYearsRange: (monitoringYearsRange) => {
      this.setState({ monitoringYearsRange });
    },
    setMonitoringWorkerData: (monitoringWorkerData) => {
      this.setState({ monitoringWorkerData });
    },
    setShowAllPolluted: (showAllPolluted) => {
      this.setState({ showAllPolluted });
    },
    setParameterToggleObject: (parameterToggleObject) => {
      this.setState({ parameterToggleObject });
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
    setViolatingDischargersOnly: (violatingDischargersOnly) => {
      this.setState({ violatingDischargersOnly });
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
      const { initialExtent, layers, mapView, homeWidget } = this.state;

      // Clear waterbody layers from state
      let newState = {};

      const layersToRemove = [
        'waterbodyPoints',
        'waterbodyLines',
        'waterbodyAreas',
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

      // reset the zoom and home widget to the initial extent
      if (useDefaultZoom && mapView) {
        mapView.extent = initialExtent;

        if (homeWidget) {
          homeWidget.viewpoint = mapView.viewpoint;
        }
      }
    },

    resetData: () => {
      this.setState({
        huc12: '',
        assessmentUnitIDs: null,
        errorMessage: '',
        watershed: '',
        pointsData: null,
        linesData: null,
        areasData: null,
        cyanWaterbodies: { status: 'idle', data: null },
        orphanFeatures: { status: 'fetching', features: [] },
        waterbodyCountMismatch: null,
        countyBoundaries: '',
        atHucBoundaries: false,
        hucBoundaries: '',
        monitoringGroups: null,
        monitoringFeatureUpdates: null,
        monitoringYearsRange: null,
        monitoringWorkerData: initialWorkerData,
        nonprofits: { status: 'fetching', data: [] },
        grts: { status: 'fetching', data: [] },
        attainsPlans: { status: 'fetching', data: {} },
        cipSummary: { status: 'fetching', data: {} },
        drinkingWater: { status: 'fetching', data: [] },
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
      this.setState({
        huc12: '',
        assessmentUnitIDs: null,
        watershed: '',
        pointsData: [],
        linesData: [],
        areasData: [],
        cyanWaterbodies: { status: 'success', data: [] },
        orphanFeatures: { status: 'fetching', features: [] },
        waterbodyCountMismatch: null,
        countyBoundaries: '',
        nonprofits: { status: 'success', data: [] },
        grts: { status: 'success', data: [] },
        attainsPlans: { status: 'success', data: {} },
        cipSummary: { status: 'success', data: {} },
        drinkingWater: { status: 'success', data: [] },
      });

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
