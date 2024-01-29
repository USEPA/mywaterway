import Color from '@arcgis/core/Color';
import Extent from '@arcgis/core/geometry/Extent';
import Viewpoint from '@arcgis/core/Viewpoint';
import React, { Component, createContext } from 'react';
// config
import { characteristicGroupMappings } from 'config/characteristicGroupMappings';
// types
import type { ReactNode } from 'react';
import type {
  DischargerPermitComponents,
  EffluentToggleObject,
  FetchStatus,
  Huc12SummaryData,
  MonitoringLocationGroups,
  MonitoringYearsRange,
  ParameterToggleObject,
  WatershedAttributes,
} from 'types';

export const initialMonitoringGroups = () => {
  return characteristicGroupMappings.reduce((groups, next) => {
    groups[next.label] = {
      label: next.label,
      characteristicGroups: [...next.groupNames],
      stations: [],
      toggled: true,
    };
    return groups;
  }, {});
};

export const initialExtent = () => new Extent({
  xmin: -15634679.853814237,
  ymin: -3023256.7294788733,
  xmax: -5713765.078627277,
  ymax: 12180985.440778064,
  spatialReference: { wkid: 102100 },
});

const initialViewpoint = () => new Viewpoint({
  scale: 73957190.9489445,
  targetGeometry: initialExtent(),
});

const initialWatershed: WatershedAttributes = () => ({
  areaacres: 0,
  areasqkm: 0,
  huc12: '',
  name: '',
});

export const LocationSearchContext = createContext();

type Props = {
  children: ReactNode,
};

export type Status = 'idle' | 'fetching' | 'success' | 'failure' | 'pending';

type State = {
  currentExtent: Object,
  upstreamExtent: Object,
  highlightOptions: Object,
  searchText: string,
  lastSearchText: string,
  huc12: string,
  assessmentUnitIDs: Array<string>,
  watershed: WatershedAttributes,
  address: string,
  assessmentUnitId: string,
  grts: Object,
  attainsPlans: Object,
  drinkingWater: Object,
  cipSummary: { status: Status, data: Huc12SummaryData },
  nonprofits: Object,
  mapView: __esri.MapView | null,
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
  pointsData: Array<Object>,
  orphanFeatures: Array<Object>,
  waterbodyCountMismatch: boolean,
  upstreamWatershedResponse: { status: Status, data: __esri.FeatureSet | null },
  errorMessage: string,
  summaryLayerMaxRecordCount: ?number,
  watershedsLayerMaxRecordCount: ?number,
  FIPS: Object,

  // dischargers
  dischargerPermitComponents: DischargerPermitComponents | null,

  // monitoring panel
  monitoringPeriodOfRecordStatus: FetchStatus,
  monitoringGroups: MonitoringLocationGroups,
  monitoringFeatureUpdates: ?Object,
  monitoringYearsRange: MonitoringYearsRange,
  selectedMonitoringYearsRange: MonitoringYearsRange,

  // identified issues panel
  showAllPolluted: boolean,
  parameterToggleObject: ParameterToggleObject,
  pollutionParameters: Object | null,
  effluentToggleObject: EffluentToggleObject | null,
};

export class LocationSearchProvider extends Component<Props, State> {
  state: State = {
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
    watershed: initialWatershed(),
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
    orphanFeatures: { status: 'fetching', features: [] },
    waterbodyCountMismatch: null,
    FIPS: { status: 'fetching', stateCode: '', countyCode: '' },

    upstreamWatershedResponse: { status: 'idle', data: null },
    errorMessage: '',
    summaryLayerMaxRecordCount: null,
    watershedsLayerMaxRecordCount: null,

    // dischargers
    dischargerPermitComponents: null,

    // monitoring panel
    monitoringPeriodOfRecordStatus: 'idle',
    monitoringGroups: initialMonitoringGroups(),
    monitoringFeatureUpdates: null,
    monitoringYearsRange: [0, 0],
    selectedMonitoringYearsRange: [0, 0],

    // identified issues panel
    showAllPolluted: true,
    parameterToggleObject: {},
    pollutionParameters: null,
    effluentToggleObject: null,

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
    setDischargerPermitComponents: (dischargerPermitComponents) => {
      this.setState({ dischargerPermitComponents });
    },
    setMonitoringPeriodOfRecordStatus: (monitoringPeriodOfRecordStatus) => {
      this.setState({ monitoringPeriodOfRecordStatus });
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
    setSelectedMonitoringYearsRange: (selectedMonitoringYearsRange) => {
      this.setState({ selectedMonitoringYearsRange });
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
    setEffluentToggleObject: (effluentToggleObject) => {
      this.setState({ effluentToggleObject });
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
      const { mapView, homeWidget } = this.state;

      // reset the zoom and home widget to the initial extent
      if (useDefaultZoom && mapView) {
        mapView.extent = initialExtent();

        if (homeWidget) {
          homeWidget.viewpoint = initialViewpoint();
        }
      }
    },

    resetData: (useDefaultZoom = false) => {
      this.setState({
        huc12: '',
        assessmentUnitIDs: null,
        errorMessage: '',
        watershed: initialWatershed(),
        pointsData: null,
        linesData: null,
        areasData: null,
        orphanFeatures: { status: 'fetching', features: [] },
        waterbodyCountMismatch: null,
        countyBoundaries: '',
        atHucBoundaries: false,
        hucBoundaries: '',
        dischargerPermitComponents: null,
        monitoringPeriodOfRecordStatus: 'idle',
        monitoringGroups: initialMonitoringGroups(),
        monitoringFeatureUpdates: null,
        monitoringYearsRange: [0, 0],
        selectedMonitoringYearsRange: [0, 0],
        nonprofits: { status: 'fetching', data: [] },
        grts: { status: 'fetching', data: [] },
        attainsPlans: { status: 'fetching', data: {} },
        cipSummary: { status: 'fetching', data: {} },
        drinkingWater: { status: 'fetching', data: [] },
      });

      // remove map content
      // only zoom out the map if we are on the community intro page at /community
      if (useDefaultZoom || window.location.pathname === '/community') {
        this.state.resetMap(true);
      } else {
        this.state.resetMap(false);
      }
    },

    setNoDataAvailable: () => {
      this.setState({
        huc12: '',
        assessmentUnitIDs: null,
        watershed: initialWatershed(),
        pointsData: [],
        linesData: [],
        areasData: [],
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
