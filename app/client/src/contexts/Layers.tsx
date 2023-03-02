import {
  createContext,
  MouseEventHandler,
  useCallback,
  useContext,
  useReducer,
} from 'react';
// types
import type { Dispatch, ReactNode } from 'react';

const StateContext = createContext<LayersState | undefined>(undefined);
const DispatchContext = createContext<Dispatch<Action> | undefined>(undefined);

function reducer(state: LayersState, action: Action): LayersState {
  switch (action.type) {
    case 'resetAll': {
      return {
        ...state,
        layers: action.payload,
      };
    }
    case 'layer': {
      return {
        ...state,
        layers: {
          ...state.layers,
          [action.id]: action.payload,
        },
      };
    }
    case 'reset': {
      return {
        ...state,
        resets: {
          ...state.resets,
          [action.id]: action.payload,
        },
      };
    }
    case 'boundariesToggle': {
      return {
        ...state,
        boundariesToggles: {
          ...state.boundariesToggles,
          [action.id]: action.payload,
        },
      };
    }
    case 'boundariesToggleDisabled': {
      return {
        ...state,
        boundariesTogglesDisabled: {
          ...state.boundariesTogglesDisabled,
          [action.id]: action.payload,
        },
      };
    }
    case 'surroundingsUpdating': {
      return {
        ...state,
        surroundingsUpdating: {
          ...state.surroundingsUpdating,
          [action.id]: action.payload,
        },
      };
    }
    case 'surroundingsVisible': {
      return {
        ...state,
        surroundingsVisible: {
          ...state.surroundingsVisible,
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

  return state.layers;
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

export function useLayersReset() {
  const state = useLayersState();
  const dispatch = useLayersDispatch();

  const resetLayers = useCallback(async () => {
    await Promise.all([
      ...Object.values(state.resets).map(async (reset) => {
        await reset();
      }),
    ]);
    dispatch({ type: 'resetAll', payload: state.layers });
  }, [dispatch, state]);

  return resetLayers;
}

/*
## Utils
*/

function initialBoundariesToggle(_showSurroundings: boolean) {
  return () => {};
}

export function isBoundariesToggleLayerId(
  layerId: string,
): layerId is BoundariesToggleLayerId {
  return (boundariesToggleLayerIds as readonly string[]).includes(layerId);
}

/*
## Constants
*/

const boundariesToggleLayerIds = [
  'monitoringLocationsLayer',
  'dischargersLayer',
  'usgsStreamgagesLayer',
] as const;

const layerIds = [...boundariesToggleLayerIds];

const initialState = layerIds.reduce(
  (state, layerId) => {
    return {
      resets: {
        ...state.resets,
        [layerId]: () => Promise.resolve(),
      },
      layers: {
        ...state.layers,
        [layerId]: null,
      },
      boundariesToggles: {
        ...state.boundariesToggles,
        [layerId]: initialBoundariesToggle,
      },
      boundariesTogglesDisabled: {
        ...state.boundariesTogglesDisabled,
        [layerId]: false,
      },
      surroundingsUpdating: {
        ...state.surroundingsUpdating,
        [layerId]: false,
      },
      surroundingsVisible: {
        ...state.surroundingsVisible,
        [layerId]: false,
      },
    };
  },
  {
    resets: {},
    layers: {},
    boundariesToggles: {},
    boundariesTogglesDisabled: {},
    surroundingsUpdating: {},
    surroundingsVisible: {},
  },
) as LayersState;

/*
## Types
*/

type Action =
  | { type: 'resetAll'; payload: LayersState['layers'] }
  | {
      type: 'layer';
      id: LayerId;
      payload: Exclude<LayersState['layers'][LayerId], 'null'>;
    }
  | { type: 'reset'; id: LayerId; payload: () => Promise<void> }
  | {
      type: 'boundariesToggle';
      id: BoundariesToggleLayerId;
      payload: (showSurroundings: boolean) => MouseEventHandler<HTMLDivElement>;
    }
  | {
      type: 'boundariesToggleDisabled';
      id: BoundariesToggleLayerId;
      payload: boolean;
    }
  | {
      type: 'surroundingsUpdating';
      id: BoundariesToggleLayerId;
      payload: boolean;
    }
  | {
      type: 'surroundingsVisible';
      id: BoundariesToggleLayerId;
      payload: boolean;
    };

export type BoundariesToggleLayerId = (typeof boundariesToggleLayerIds)[number];

export type LayerId = keyof (typeof initialState)['layers'];

export type LayersState = {
  layers: {
    [F in BoundariesToggleLayerId]: __esri.GroupLayer | null;
  };
  resets: {
    [L in LayerId]: () => Promise<void>;
  };
  boundariesToggles: {
    [B in BoundariesToggleLayerId]: (
      showSurroundings: boolean,
    ) => MouseEventHandler<HTMLDivElement>;
  };
  boundariesTogglesDisabled: {
    [B in BoundariesToggleLayerId]: boolean;
  };
  surroundingsUpdating: {
    [B in BoundariesToggleLayerId]: boolean;
  };
  surroundingsVisible: {
    [B in BoundariesToggleLayerId]: boolean;
  };
};

type ProviderProps = {
  children: ReactNode;
};
