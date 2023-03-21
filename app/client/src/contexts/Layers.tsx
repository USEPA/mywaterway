import { createContext, useCallback, useContext, useReducer } from 'react';
// types
import type { Dispatch, ReactNode } from 'react';

const StateContext = createContext<LayersState | undefined>(undefined);
const DispatchContext = createContext<Dispatch<Action> | undefined>(undefined);

function reducer(state: LayersState, action: Action): LayersState {
  switch (action.type) {
    case 'erroredMulti': {
      return {
        ...state,
        errored: {
          ...state.errored,
          ...action.payload,
        },
      };
    }
    case 'layersMulti': {
      return {
        ...state,
        layers: {
          ...state.layers,
          ...action.payload,
        },
      };
    }
    case 'visibleMulti': {
      return {
        ...state,
        visible: {
          ...state.visible,
          ...action.payload,
        },
      };
    }
    case 'errored': {
      return {
        ...state,
        errored: {
          ...state.errored,
          [action.id]: action.payload,
        },
      };
    }
    case 'layers': {
      return {
        ...state,
        layers: {
          ...state.layers,
          [action.id]: action.payload,
        },
      };
    }
    case 'resetters': {
      return {
        ...state,
        resetters: {
          ...state.resetters,
          [action.id]: action.payload,
        },
      };
    }
    case 'visible': {
      return {
        ...state,
        visible: {
          ...state.visible,
          [action.id]: action.payload,
        },
      };
    }
    default: {
      throw new Error(`Unhandled action type: ${action}`);
    }
  }
}

export function LayersProvider({ children }: ProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

/*
## Hooks
*/

export function useLayers() {
  const state = useLayersState();
  const dispatch = useLayersDispatch();

  const { resetters } = state;
  const resetLayers = useCallback(
    (resetVisibility = false) => {
      Object.values(resetters).forEach((reset) => {
        reset();
      });
      dispatch({ type: 'erroredMulti', payload: initialState.errored });
      if (resetVisibility) {
        dispatch({ type: 'visibleMulti', payload: initialState.visible });
      }
    },
    [dispatch, resetters],
  );

  const setLayer = useCallback(
    <L extends LayerId>(layerId: L, layer: LayersState['layers'][L]) => {
      dispatch({ type: 'layers', id: layerId, payload: layer });
    },
    [dispatch],
  );

  const setResetHandler = useCallback(
    <L extends LayerId>(layerId: L, handler: LayersState['resetters'][L]) => {
      dispatch({ type: 'resetters', id: layerId, payload: handler });
    },
    [dispatch],
  );

  const updateErroredLayers = useCallback(
    (updates = {}, merge = true) => {
      const newErroredLayers: LayersState['errored'] = {
        ...(!merge && initialState.errored),
        ...updates,
      };
      dispatch({ type: 'erroredMulti', payload: newErroredLayers });
    },
    [dispatch],
  );

  const updateVisibleLayers = useCallback(
    (updates: Partial<LayersState['visible']> = {}, merge: boolean = true) => {
      const newVisibleLayers = {
        ...(!merge && initialState.visible),
        ...updates,
      } as LayersState['visible'];
      dispatch({ type: 'visibleMulti', payload: newVisibleLayers });
    },
    [dispatch],
  );

  return {
    ...state.layers,
    erroredLayers: state.errored,
    resetLayers,
    setLayer,
    setResetHandler,
    updateErroredLayers,
    updateVisibleLayers,
    visibleLayers: state.visible,
  };
}

// Returns state stored in `LayersProvider` context component.
export function useLayersState() {
  const state = useContext(StateContext);

  if (state === undefined) {
    throw new Error('useLayersState must be called within a LayersProvider');
  }

  return state;
}

export function useLayersDispatch() {
  const dispatch = useContext(DispatchContext);
  if (dispatch === undefined) {
    throw new Error('useLayersDispatch must be used within a LayersProvider');
  }

  return dispatch;
}

/*
## Constants
*/

const featureLayerIds = [
  'waterbodyAreas',
  'countyLayer',
  'congressionalLayer',
  'dischargersLayer',
  'ejscreenLayer',
  'monitoringLocationsLayer',
  'surroundingDischargersLayer',
  'surroundingMonitoringLocationsLayer',
  'surroundingUsgsStreamgagesLayer',
  'usgsStreamgagesLayer',
  'waterbodyLines',
  'waterbodyPoints',
  'watershedsLayer',
  'wildScenicRiversLayer',
  'wsioHealthIndexLayer',
] as const;

const graphicsLayerIds = [
  'actionsWaterbodies',
  'boundariesLayer',
  'issuesLayer',
  'nonprofitsLayer',
  'protectedAreasHighlightLayer',
  'providersLayer',
  'searchIconLayer',
  'selectedTribeLayer',
  'upstreamLayer',
] as const;

const groupLayerIds = [
  'allWaterbodiesLayer',
  'cyanLayer',
  'tribalLayer',
  'waterbodyLayer',
] as const;

const mapImageLayerIds = [
  'mappedWaterLayer',
  'protectedAreasLayer',
  'stateBoundariesLayer',
] as const;

const wmsLayerIds = ['landCoverLayer'] as const;

const layerIds = [
  ...featureLayerIds,
  ...graphicsLayerIds,
  ...groupLayerIds,
  ...mapImageLayerIds,
  ...wmsLayerIds,
] as const;

const initialState = layerIds.reduce(
  (state, layerId) => {
    return {
      errored: {
        ...state.errored,
        [layerId]: false,
      },
      layers: {
        ...state.layers,
        [layerId]: null,
      },
      resetters: {
        ...state.resetters,
        [layerId]: () => {},
      },
      visible: {
        ...state.visible,
        [layerId]: false,
      },
    };
  },
  {
    errored: {},
    layers: {},
    resetters: {},
    visible: {},
  },
) as LayersState;

/*
## Types
*/

type Action =
  | {
      type: 'erroredMulti';
      payload: LayersState['errored'];
    }
  | {
      type: 'layersMulti';
      payload: LayersState['layers'];
    }
  | {
      type: 'visibleMulti';
      payload: LayersState['visible'];
    }
  | {
      type: 'errored';
      id: LayerId;
      payload: LayersState['errored'][LayerId];
    }
  | {
      type: 'layers';
      id: LayerId;
      payload: LayersState['layers'][LayerId];
    }
  | {
      type: 'resetters';
      id: LayerId;
      payload: LayersState['resetters'][LayerId];
    }
  | {
      type: 'visible';
      id: LayerId;
      payload: LayersState['visible'][LayerId];
    };

export type LayerId = (typeof layerIds)[number];

export type LayersState = {
  errored: {
    [L in LayerId]: boolean;
  };
  layers: {
    [F in (typeof featureLayerIds)[number]]: __esri.FeatureLayer | null;
  } & {
    [G in (typeof graphicsLayerIds)[number]]: __esri.GraphicsLayer | null;
  } & {
    [G in (typeof groupLayerIds)[number]]: __esri.GroupLayer | null;
  } & {
    [M in (typeof mapImageLayerIds)[number]]: __esri.MapImageLayer | null;
  } & {
    [W in (typeof wmsLayerIds)[number]]: __esri.WMSLayer | null;
  };
  resetters: {
    [L in LayerId]: () => void;
  };
  visible: {
    [L in LayerId]: boolean;
  };
};

type ProviderProps = {
  children: ReactNode;
};
