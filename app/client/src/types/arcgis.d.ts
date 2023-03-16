declare namespace __esri {
  interface FeatureLayer {
    featureReduction:
      | __esri.FeatureReductionBinning
      | __esri.FeatureReductionCluster
      | __esri.FeatureReductionSelection
      | null;
    globalIdField: string | null;
  }

  interface GroupLayer {
    addHandles(
      handleOrHandles: __esri.WatchHandle | __esri.WatchHandle[],
      groupKey: any,
    ): void;
    hasHandles(groupKey?: any): boolean;
    removeHandles(groupKey?: any): void;
  }

  interface Layer {
    portalItem?: __esri.PortalItem;
    url?: string;
  }

  interface Portal {
    credential: {
      creationTime: number;
      expires: Date;
      isAdmin?: boolean;
      oAuthState: string;
      resources: string[];
      scope: string;
      server: string;
      ssl: boolean;
      token: string;
      tokenRefreshBuffer: number;
      userId: string;
      validity: any;
    };
  }
}
