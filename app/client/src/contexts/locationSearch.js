import Color from '@arcgis/core/Color';
import React, { Component, createContext } from 'react';
import type { ReactNode } from 'react';
import type { MonitoringLocationsData } from 'types';

export const LocationSearchContext = createContext();

type Props = {
  children: ReactNode,
};

type Status = 'fetching' | 'success' | 'failure';

type MonitoringLocationGroups = {
  [label: string]: {
    label: string,
    characteristicGroups?: Array<string>,
    stations: StationData[],
    toggled: boolean,
  },
};

type PermittedDischargersData = {
  Results: {
    BadSystemIDs: null,
    BioCVRows: string,
    BioV3Rows: string,
    CVRows: string,
    FEARows: string,
    Facilities: {
      CWPFormalEaCnt: string,
      CWPInspectionCount: string,
      CWPName: string,
      CWPPermitStatusDesc: string,
      CWPQtrsWithNC: string,
      CWPSNCStatus: null,
      CWPStatus: string,
      CWPViolStatus: string,
      E90Exceeds1yr: string,
      FacLat: string,
      FacLong: string,
      RegistryID: string,
      SourceID: string,
    }[],
    INSPRows: string,
    IndianCountryRows: string,
    InfFEARows: string,
    Message: string,
    PageNo: string,
    QueryID: string,
    QueryRows: string,
    SVRows: string,
    TotalPenalties: string,
    V3Rows: string,
    Version: string,
  },
};

type Huc12SummaryData = {
  count: number,
  items: {
    assessedCatchmentAreaPercent: number,
    assessedCatchmentAreaSqMi: number,
    assessedGoodCatchmentAreaPercent: number,
    assessedGoodCatchmentAreaSqMi: number,
    assessedUnknownCatchmentAreaPercent: number,
    assessedUnknownCatchmentAreaSqMi: number,
    assessmentUnitCount: number,
    assessmentUnits: {
      assessmentUnitId: string,
    }[],
    containImpairedWatersCatchmentAreaPercent: number,
    containImpairedWatersCatchmentAreaSqMi: number,
    containRestorationCatchmentAreaPercent: number,
    containRestorationCatchmentAreaSqMi: number,
    huc12: string,
    summaryByIRCategory: {
      assessmentUnitCount: number,
      catchmentSizePercent: number,
      catchmentSizeSqMi: number,
      epaIRCategoryName: string,
    }[],
    summaryByParameterImpairments: {
      assessmentUnitCount: number,
      catchmentSizePercent: number,
      catchmentSizeSqMi: number,
      parameterGroupName: string,
    }[],
    summaryByUse: {
      useAttainmentSummary: {
        assessmentUnitCount: number,
        catchmentSizePercent: number,
        catchmentSizeSqMi: number,
        useAttainment: string,
      }[],
      useGroupName: string,
      useName: string,
    }[],
    summaryByUseGroup: {
      useAttainmentSummary: {
        assessmentUnitCount: number,
        catchmentSizePercent: number,
        catchmentSizeSqMi: number,
        useAttainment: string,
      }[],
      useGroupName: string,
    }[],
    summaryRestorationPlans: {
      assessmentUnitCount: number,
      catchmentSizePercent: number,
      catchmentSizeSqMi: number,
      summaryTypeName: string,
    }[],
    summaryVisionRestorationPlans: {
      assessmentUnitCount: number,
      catchmentSizePercent: number,
      catchmentSizeSqMi: number,
      summaryTypeName: string,
    }[],
    totalCatchmentAreaSqMi: number,
    totalHucAreaSqMi: number,
  }[],
};

type State = {
  initialExtent: Object,
  currentExtent: Object,
  upstreamExtent: Object,
  highlighOptions: Object,
  searchText: string,
  lastSearchText: string,
  huc12: string,
  assessmentUnitIDs: Array<string>,
  watershed: string,
  address: string,
  assessmentUnitId: string,
  monitoringLocations: { status: Status, data: MonitoringLocationsData },
  permittedDischargers: { status: Status, data: PermittedDischargersData },
  grts: Object,
  attainsPlans: Object,
  drinkingWater: Object,
  cipSummary: { status: Status, data: Huc12SummaryData },
  nonprofits: Object,
  mapView: Object,
  layers: Object[],
  basemap: Object,
  waterbodyLayer: Object,
  issuesLayer: Object,
  monitoringLocationsLayer: Object,
  surroundingMonitoringLocationsLayer: Object,
  usgsStreamgagesLayer: Object,
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
  homeWidget: Object,
  upstreamWidget: Object,
  upstreamWidgetDisabled: boolean,
  allWaterbodiesWidgetDisabled: boolean,
  surroundingMonitoringLocationsWidgetDisabled: boolean,
  hucBoundaries: Object,
  atHucBoundaries: boolean,
  countyBoundaries: Object,
  waterbodyData: Array<Object>,
  linesData: Array<Object>,
  areasData: Array<Object>,
  cyanWaterbodies: Array<Object>,
  pointsData: Array<Object>,
  orphanFeatures: Array<Object>,
  waterbodyCountMismatch: boolean,
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
  monitoringGroups: MonitoringLocationGroups,
  monitoringFeatureUpdates: ?Object,

  // identified issues panel
  showDischargers: boolean,
  showPolluted: boolean,
  pollutionParameters: Object,
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
      color: new Color([50, 197, 253, 0.5]),
      fillOpacity: 1,
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
    monitoringLocations: { status: 'fetching', data: {} },
    permittedDischargers: { status: 'fetching', data: {} },
    grts: { status: 'fetching', data: [] },
    attainsPlans: { status: 'fetching', data: {} },
    drinkingWater: { status: 'fetching', data: [] },
    cipSummary: { status: 'fetching', data: {} },
    nonprofits: { status: 'fetching', data: [] },
    mapView: '',
    layers: [],
    waterbodyLayer: '',
    issuesLayer: '',
    monitoringLocationsLayer: '',
    surroundingMonitoringLocationsLayer: '',
    usgsStreamgagesLayer: '',
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
    homeWidget: null,
    upstreamWidget: null,
    upstreamWidgetDisabled: false,
    allWaterbodiesWidgetDisabled: false,
    surroundingMonitoringLocationsWidgetDisabled: false,
    visibleLayers: {},
    basemap: 'gray-vector',
    hucBoundaries: '',
    atHucBoundaries: false,
    countyBoundaries: '',
    waterbodyData: null,
    linesData: null,
    areasData: null,
    pointsData: null,
    cyanWaterbodies: [],
    orphanFeatures: { status: 'fetching', features: [] },
    waterbodyCountMismatch: null,
    FIPS: { status: 'fetching', stateCode: '', countyCode: '' },

    pointsLayer: '',
    linesLayer: '',
    areasLayer: '',
    upstreamLayer: '',
    upstreamLayerVisible: false,
    errorMessage: '',
    summaryLayerMaxRecordCount: null,
    watershedsLayerMaxRecordCount: null,

    // monitoring panel
    monitoringGroups: null,
    monitoringFeatureUpdates: null,

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
    setMonitoringLocations: (monitoringLocations: {
      status: Status,
      data: MonitoringLocationsData,
    }) => {
      this.setState({ monitoringLocations });
    },
    setPermittedDischargers: (permittedDischargers: {
      status: Status,
      data: PermittedDischargersData,
    }) => {
      this.setState({ permittedDischargers });
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
    getUpstreamLayer: () => {
      return this.state.upstreamLayer;
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
    getAllWaterbodiesWidgetDisabled: () => {
      return this.state.allWaterbodiesWidgetDisabled;
    },
    getSurroundingMonitoringLocationsWidgetDisabled: () => {
      return this.state.surroundingMonitoringLocationsWidgetDisabled;
    },
    getMonitoringLocations: () => {
      return this.state.monitoringLocations;
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
    setMonitoringLocationsLayer: (monitoringLocationsLayer) => {
      this.setState({ monitoringLocationsLayer });
    },
    setSurroundingMonitoringLocationsLayer: (
      surroundingMonitoringLocationsLayer,
    ) => {
      this.setState({ surroundingMonitoringLocationsLayer });
    },
    setUsgsStreamgagesLayer: (usgsStreamgagesLayer) => {
      this.setState({ usgsStreamgagesLayer });
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
    setAllWaterbodiesWidgetDisabled: (allWaterbodiesWidgetDisabled) => {
      this.setState({ allWaterbodiesWidgetDisabled });
    },
    setSurroundingMonitoringLocationsWidgetDisabled: (
      surroundingMonitoringLocationsWidgetDisabled,
    ) => {
      this.setState({ surroundingMonitoringLocationsWidgetDisabled });
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
        monitoringLocationsLayer,
        usgsStreamgagesLayer,
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
        surroundingMonitoringLocationsLayer,
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
      if (monitoringLocationsLayer) {
        monitoringLocationsLayer.queryFeatures().then((featureSet) => {
          monitoringLocationsLayer.applyEdits({
            deleteFeatures: featureSet.features,
          });
        });
      }
      if (usgsStreamgagesLayer) {
        usgsStreamgagesLayer.queryFeatures().then((featureSet) => {
          usgsStreamgagesLayer.applyEdits({
            deleteFeatures: featureSet.features,
          });
        });
      }
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

        if (surroundingMonitoringLocationsLayer) {
          surroundingMonitoringLocationsLayer.visible = false;
          surroundingMonitoringLocationsLayer.listMode = 'hide';
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
        assessmentUnitIDs: null,
        errorMessage: '',
        watershed: '',
        pointsData: null,
        linesData: null,
        areasData: null,
        cyanWaterbodies: [],
        orphanFeatures: { status: 'fetching', features: [] },
        waterbodyCountMismatch: null,
        countyBoundaries: '',
        atHucBoundaries: false,
        hucBoundaries: '',
        monitoringGroups: null,
        monitoringFeatureUpdates: null,
        monitoringLocations: { status: 'fetching', data: {} },
        permittedDischargers: { status: 'fetching', data: {} },
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
        cyanWaterbodies: [],
        orphanFeatures: { status: 'fetching', features: [] },
        waterbodyCountMismatch: null,
        countyBoundaries: '',
        monitoringLocations: { status: 'success', data: {} },
        permittedDischargers: { status: 'success', data: {} },
        nonprofits: { status: 'success', data: [] },
        grts: { status: 'success', data: [] },
        attainsPlans: { status: 'success', data: {} },
        cipSummary: { status: 'success', data: {} },
        drinkingWater: { status: 'success', data: [] },
        visibleLayers: {},
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
