declare namespace __esri {
  interface FeatureLayer {
    featureReduction:
      | __esri.FeatureReductionBinning
      | __esri.FeatureReductionCluster
      | __esri.FeatureReductionSelection
      | null;
  }

  interface GroupLayer {
    addHandles(
      handleOrHandles: __esri.WatchHandle | __esri.WatchHandle[],
      groupKey: any,
    ): void;
    hasHandles(groupKey?: any): boolean;
    removeHandles(groupKey?: any): void;
  }
}
