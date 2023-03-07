declare namespace __esri {
  interface GroupLayer {
    addHandles(
      handleOrHandles: __esri.WatchHandle | __esri.WatchHandle[],
      groupKey: any,
    ): void;
    hasHandles(groupKey?: any): boolean;
    removeHandles(groupKey?: any): void;
  }
}
